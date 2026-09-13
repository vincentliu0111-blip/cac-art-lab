import hashlib
import json
import math
import platform
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def require(ok, message):
    if not ok:
        raise ValueError(message)

def read(path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)

def main():
    try:
        from PIL import Image
    except ImportError:
        raise ValueError("Pillow required")
    data = ROOT / "Data"
    result_file = ROOT / "web" / "app_data.json"
    rows = read(result_file)
    require(isinstance(rows, list), "app_data.json must be a list")
    n = len(rows)
    require(n in (40, 60), "Expected 40 or 60 rows")
    pairs = read(data / "pairs.json")
    silver = {r["pair_id"]: r["q_A"] for r in read(data / "silver.json")}
    pred = {r["pair_id"]: r["model_q_A"] for r in read(data / "predictions.json")}
    art = {r["object_id"]: r for r in read(data / "paintings.json")}
    features = read(data / "features.json")
    expected = random.Random(7).sample(sorted(pairs, key=lambda r:r["pair_id"]), n)
    require([r["pair_id"] for r in rows] == [r["pair_id"] for r in expected],
            "Pair order mismatch")
    names = sorted(next(iter(features.values())))
    spans = {}
    for name in names:
        vals = [f[name] for f in features.values()]
        spans[name] = max(vals) - min(vals)
    referenced = set()
    for row, pair in zip(rows, expected):
        pid = pair["pair_id"]
        require(row["q_A"] == silver[pid], f"{pid}: q_A mismatch")
        require(row["model_q_A"] == pred[pid], f"{pid}: model_q_A mismatch")
        for side in ("A", "B"):
            filename = art[pair[side]]["file"]
            require(row[f"img_{side}"] == filename, f"{pid}: img_{side} mismatch")
            referenced.add(filename)
        a, b = features[str(pair["A"])], features[str(pair["B"])]
        delta = {k:a[k]-b[k] for k in names}
        scaled = {k:delta[k]/spans[k] if spans[k] else 0.0 for k in names}
        ranked = sorted(names, key=lambda k:(-abs(scaled[k]), k))[:3]
        top = row["top_features"]
        require(len(top) == 3, f"{pid}: Expected 3 top_features")
        require([t["name"] for t in top] == ranked, f"{pid}: top_features mismatch")
        for t in top:
            k = t["name"]
            require(t["group"] == k.split("_", 1)[0], f"{pid}: Feature group mismatch")
            require(math.isclose(t["delta"], delta[k], abs_tol=1e-6), f"{pid}: delta mismatch")
            require(math.isclose(t["scaled_delta"], scaled[k], abs_tol=1e-6), f"{pid}: scaled_delta mismatch")
    fingerprint = hashlib.sha256(result_file.read_bytes())
    for name in sorted(referenced):
        path = ROOT / "web" / "img" / name
        with Image.open(path) as im, Image.open(data / "images" / name) as original:
            require(im.format == "JPEG", f"{name}: Expected JPEG")
            w, h = im.size
            sw, sh = original.size
            require(max(w, h) <= 400, f"{name}: Image exceeds 400 px")
            target_scale = min(400 / sw, 400 / sh, 1)
            require(abs(w - sw * target_scale) <= 1.5 and abs(h - sh * target_scale) <= 1.5,
                    f"{name}: Thumbnail dimensions mismatch")
        fingerprint.update(name.encode())
        fingerprint.update(path.read_bytes())
    close = sum(.4 <= row["q_A"] <= .6 for row in rows)
    known = {60:(5,106), 40:(3,75)}
    require((close,len(referenced)) == known[n], "Count mismatch")
    cache = ROOT / ".homework_check.json"
    history = read(cache) if cache.exists() else {}
    key = f"N={n},seed=7,Python={platform.python_version()}"
    digest = fingerprint.hexdigest()
    previous = history.get(key)
    require(previous is None or previous == digest,
            "Output fingerprint mismatch")
    history[key] = digest
    cache.write_text(json.dumps(history, indent=2), encoding="utf-8")
    message = (f"PASS N={n}: close={close}; images={len(referenced)}; "
               "checks=passed; " +
               ("reproducible=yes" if previous else "reproducible=pending"))
    print(message)
    if previous:
        report = ROOT / "verification.txt"
        text = report.read_text(encoding="utf-8") if report.exists() else "M1 verification\n"
        text += f"{message}\nPython={platform.python_version()}\nSHA256={digest}\n"
        report.write_text(text, encoding="utf-8")

if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError, IndexError, StopIteration) as exc:
        print(f"FAIL: {exc}")
        sys.exit(1)
