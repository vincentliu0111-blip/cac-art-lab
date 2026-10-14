"""Recompute aggregate agreement from saved judge votes and an owner CSV export.

Only aggregate numbers are written. The input CSV contains private event records and
must stay outside the published repository.
"""

import argparse
import csv
import json
import random
from collections import Counter
from datetime import datetime
from itertools import combinations
from pathlib import Path
from zoneinfo import ZoneInfo


ROOT = Path(__file__).resolve().parents[1]
DATASET = "follow-your-eye-met-paintings-v3"


def cohen_kappa(labels_a, labels_b):
    if len(labels_a) != len(labels_b):
        raise ValueError("Raters must have the same number of choices")
    if not labels_a:
        return {"n": 0, "agreement": None, "expected": None, "kappa": None}
    if any(label not in ("A", "B") for label in (*labels_a, *labels_b)):
        raise ValueError("Only canonical A/B choices are supported")
    n = len(labels_a)
    observed = sum(a == b for a, b in zip(labels_a, labels_b)) / n
    a_share = labels_a.count("A") / n
    b_share = labels_b.count("A") / n
    expected = a_share * b_share + (1 - a_share) * (1 - b_share)
    return {"n": n, "agreement": observed, "expected": expected,
            "kappa": (observed - expected) / (1 - expected) if expected < 1 else None}


def fleiss_kappa(rows, judges):
    if not rows:
        raise ValueError("No complete AI vote rows")
    n_raters = len(judges)
    if n_raters < 2:
        raise ValueError("At least two AI judges are required")
    counts = []
    for votes in rows:
        if set(votes) != set(judges) or any(v not in ("A", "B") for v in votes.values()):
            raise ValueError("Every pair needs one canonical A/B vote from each judge")
        a = sum(v == "A" for v in votes.values())
        counts.append((a, n_raters - a))
    observed = sum((a * (a - 1) + b * (b - 1)) /
                   (n_raters * (n_raters - 1)) for a, b in counts) / len(counts)
    a_share = sum(a for a, _ in counts) / (len(counts) * n_raters)
    expected = a_share ** 2 + (1 - a_share) ** 2
    return {"nPairs": len(counts), "nJudges": n_raters, "agreement": observed,
            "expected": expected,
            "kappa": (observed - expected) / (1 - expected) if expected < 1 else None}


def session_bootstrap(rows, iterations=10000, seed=20261013):
    """Percentile interval, resampling anonymous browser sessions as clusters."""
    groups = {}
    for session, human, reference in rows:
        groups.setdefault(session, []).append((human, reference))
    sessions = sorted(groups)
    if len(sessions) < 2:
        return {"lower": None, "upper": None, "sessions": len(sessions),
                "iterations": iterations, "method": "session-cluster-percentile"}
    rng = random.Random(seed)
    estimates = []
    for _ in range(iterations):
        sample = [item for session in rng.choices(sessions, k=len(sessions))
                  for item in groups[session]]
        estimate = cohen_kappa([item[0] for item in sample],
                               [item[1] for item in sample])["kappa"]
        if estimate is not None:
            estimates.append(estimate)
    estimates.sort()
    def quantile(probability):
        if not estimates:
            return None
        index = (len(estimates) - 1) * probability
        low = int(index)
        return estimates[low] + (estimates[min(low + 1, len(estimates) - 1)] - estimates[low]) * (index - low)
    return {"lower": quantile(.025), "upper": quantile(.975),
            "sessions": len(sessions), "iterations": iterations,
            "method": "session-cluster-percentile"}


def judge_statistics(source):
    judges = sorted(source["judges"])
    pairs = source["pairs"]
    vote_rows = [pair["normalVotes"] for pair in pairs.values()]
    pairwise = []
    for left, right in combinations(judges, 2):
        result = cohen_kappa([votes[left] for votes in vote_rows],
                             [votes[right] for votes in vote_rows])
        pairwise.append({"left": left, "right": right, **result})
    calibration = {}
    for judge in judges:
        repeated = swapped = 0
        for pair_id, votes in source["calibrationVotes"].items():
            original = pairs[pair_id]["normalVotes"][judge]
            repeated += votes[judge]["normal_repeat"] == original
            # A/B in the swapped presentation refer to the opposite artwork.
            swapped += votes[judge]["swap"] != original
        n = len(source["calibrationVotes"])
        calibration[judge] = {"nPairs": n, "repeatSame": repeated,
                              "repeatRate": repeated / n, "swappedSame": swapped,
                              "swappedRate": swapped / n}
    return {"fleiss": fleiss_kappa(vote_rows, judges), "pairwise": pairwise,
            "calibration": calibration}


def human_statistics(csv_path, pairs):
    required = {"id", "session_id", "dataset_version", "pair_id", "choice",
                "received_at", "environment"}
    with csv_path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if not required.issubset(reader.fieldnames or []):
            raise ValueError(f"CSV is missing columns: {sorted(required - set(reader.fieldnames or []))}")
        rows = list(reader)
    rows = [r for r in rows if r["environment"] == "production" and
            r["dataset_version"] == DATASET]
    if len({r["id"] for r in rows}) != len(rows):
        raise ValueError("Duplicate event IDs in CSV")
    if any(r["pair_id"] not in pairs or r["choice"] not in ("A", "B", "skip") for r in rows):
        raise ValueError("Unknown pair or choice in current production records")
    selected = [r for r in rows if r["choice"] != "skip"]
    pair_counts = Counter(r["pair_id"] for r in selected)
    pair_sessions = {}
    for row in selected:
        pair_sessions.setdefault(row["pair_id"], set()).add(row["session_id"])
    result = {"savedEvents": len(rows), "choices": len(selected),
              "anonymousSessions": len({r["session_id"] for r in rows}),
              "distinctPairs": len(pair_counts), "maxChoicesOnOnePair": max(pair_counts.values(), default=0),
              "pairsWithMultipleSessions": sum(len(s) > 1 for s in pair_sessions.values()),
              "comparisons": {}}
    for field, name in (("qA", "aiJudges"), ("modelQA", "featureModel")):
        eligible = [r for r in selected if pairs[r["pair_id"]][field] is not None and
                    pairs[r["pair_id"]][field] != 0.5]
        reference = ["A" if pairs[r["pair_id"]][field] > 0.5 else "B" for r in eligible]
        comparison = cohen_kappa([r["choice"] for r in eligible], reference)
        comparison["interval95"] = session_bootstrap(
            [(r["session_id"], r["choice"], choice) for r, choice in zip(eligible, reference)])
        result["comparisons"][name] = comparison
    if rows:
        latest = max(datetime.fromisoformat(r["received_at"].replace("Z", "+00:00")) for r in rows)
        result["asOf"] = latest.astimezone(ZoneInfo("America/New_York")).date().isoformat()
    else:
        result["asOf"] = None
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--human-csv", type=Path, help="Private owner export; never publish it")
    parser.add_argument("--output", type=Path, help="Write aggregate-only JSON")
    args = parser.parse_args()
    votes = json.loads((ROOT / "web/met_all_judge_results.json").read_text())
    pairs_data = json.loads((ROOT / "web/met_experience_data.json").read_text())
    pairs = {pair["id"]: pair for pair in pairs_data["pairs"]}
    result = {"method": "canonical-artwork-A-B", "datasetVersion": DATASET,
              "ai": judge_statistics(votes),
              "human": human_statistics(args.human_csv, pairs) if args.human_csv else None,
              "notes": ["The six-judge sample is the 2,272-pair evaluated vote file, not all active pairs.",
                        "Human comparisons use saved A/B choices against the existing weighted AI preference or feature-model prediction; skips and exact ties are excluded.",
                        "The 95% visitor intervals resample anonymous browser sessions as clusters; convenience sampling and repeated exposure remain limitations.",
                        "Saved choices and anonymous browser sessions are not verified distinct people. Kappa measures agreement, not correctness."]}
    output = json.dumps(result, indent=2, ensure_ascii=False, allow_nan=False) + "\n"
    if args.output:
        args.output.write_text(output, encoding="utf-8")
    print(output)


if __name__ == "__main__":
    main()
