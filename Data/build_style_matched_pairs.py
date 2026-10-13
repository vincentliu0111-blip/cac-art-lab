"""Select existing evaluated pairs with a comparable medium and measured appearance.

This changes which validated pairs are offered; it does not generate new pairs or
reuse an AI prediction for different paintings. The rule is a practical filter,
not an art-historical claim that two works have the same style.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / "web/met_experience_data.json").read_text())
catalog = json.loads((ROOT / "web/met_catalog.json").read_text())
medium_by_id = {str(art["id"]): art.get("medium", "").lower() for art in catalog["artworks"]}
medium_terms = ("oil", "ink", "tempera", "watercolor", "gouache", "acrylic", "fresco", "pastel", "lacquer")
scales = {"brightness": .3, "saturation": .25, "detail": .17, "symmetry": .08}


def medium(art_id):
    source = medium_by_id.get(art_id, "")
    return next((term for term in medium_terms if term in source), "other" if source else "missing")


def appearance_distance(pair):
    first = data["artworks"][pair["a"]]["features"]
    second = data["artworks"][pair["b"]]["features"]
    return sum(abs(first[key] - second[key]) / scale for key, scale in scales.items()) / len(scales)


pair_ids = [pair["id"] for pair in data["pairs"]
            if medium(pair["a"]) == medium(pair["b"])
            and medium(pair["a"]) not in ("missing", "other")
            and appearance_distance(pair) <= .7]
output = {"method": "same-medium-measured-appearance-v1", "sourceVersion": data["version"],
          "distanceLimit": .7, "pairIds": pair_ids}
(ROOT / "web/met_style_matched_pairs.json").write_text(json.dumps(output, indent=2) + "\n")
print(f"Selected {len(pair_ids)} of {len(data['pairs'])} evaluated pairs")
