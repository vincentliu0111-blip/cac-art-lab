"""Build the presentation groups from The Met's curatorial departments.

The source snapshot records official Met Open Access CSV departments plus
Collection API fallbacks. This is a browsing preference, not a claim that
every work has a single cultural identity.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
catalog = json.loads((ROOT / "web/met_catalog.json").read_text())
experience = json.loads((ROOT / "web/met_experience_data.json").read_text())
snapshot = json.loads((ROOT / "Data/met_department_snapshot_v1.json").read_text())
if snapshot["catalogVersion"] != catalog["version"]:
    raise ValueError("Department snapshot does not match the catalog")

# These departments hold the European/American painting collections represented
# in this catalog. Robert Lehman works were also checked against Culture and
# Artist Nationality in the official CSV before inclusion.
western_departments = {
    "European Paintings",
    "Robert Lehman Collection",
    "European Sculpture and Decorative Arts",
    "The American Wing",
}
departments = snapshot["departmentById"]
western_ids = [str(art["id"]) for art in catalog["artworks"]
               if departments.get(str(art["id"])) in western_departments]
output = {
    "method": "met-curatorial-department-western-v1",
    "catalogVersion": catalog["version"],
    "experienceVersion": experience["version"],
    "westernArtworkIds": western_ids,
}
(ROOT / "web/met_western_artworks.json").write_text(json.dumps(output, indent=2) + "\n")
print(f"Selected {len(western_ids)} of {catalog['total']} catalog artworks")
