# Follow Your Eye

**For judges:** Follow Your Eye is an art discovery web app by **Vincent Liu**. At [vincentliu.ai](https://vincentliu.ai/), anyone curious about art can choose between two paintings in a ten-pair round, then see how their preferences compare with precomputed AI judges. To try it, open the site, choose either painting or skip each pair, and continue to the round result; the site saves each choice online before moving on. The [AI use and authorship note](#ai-use-and-authorship) below explains the AI judges, model predictions and image sources. The [development log](devlog.md) records the work over time.

**Find the code quickly:** `web/index.html`, `web/app.js`, `web/experience-core.mjs` and `web/style.css` implement the experience; `worker/experience.mjs` implements online saving; `tests/` and `worker/*.test.mjs` contain checks. The public dataset and metadata are in `web/*.json` and `Data/`. The 5,326 optimized museum images are in `web/met-art/`; historical images are in `web/art/`. These images account for most repository files and download size, so start with the source files above if you are reviewing the implementation.

## Current public dataset

- `follow-your-eye-met-paintings-v2`: 2,757 active pairs and a searchable gallery of 5,326 verified Met Open Access Paintings. The 2,279 active newer pairs have six AI-judge votes and numerical feature-model predictions. A second image review removed 103 unsuitable pairs from the previous 2,860-pair deck. See `Data/met_quality_review_v2.json` for the exact exclusions and `web/about.html` for the distinction between measured features, predictions and preferences. The first three positions of a fresh round draw from 61 manually reviewed pairs while unused ones remain; see `Data/met_opening_pairs_v1.json`.
- The original 60-pair dataset and its records remain separate in the collector. Its historical app data and 106 web thumbnails remain in this repository; they are not mixed with current results.
- `web/met_experience_data.json`, `web/met_catalog.json` and `web/met-art/` supply the public experience. The 5,326 resized JPEGs are derived from Met Open Access images; the full originals and model checkpoints are not part of the website.

The web site is static and published from `web/` by GitHub Pages. The Cloudflare Worker in `worker/` validates and stores individual events in D1; no owner token or D1 credential belongs in the public web files. The current dataset uses the `experience_choices` table. The historical 60-pair `choices` table remains untouched. New events also store a coarse country code supplied by Cloudflare, or unknown when unavailable; earlier events remain unknown.

## AI use and authorship

Vincent Liu is the named project author. The six AI judges' painting preferences were generated before publication using OpenAI and Anthropic models; a separate numerical feature model produces its own pair predictions. Playing a round does not call an AI model. The museum images and artwork metadata come from The Met Open Access. This note describes AI judging and data sources; the competition submission should also identify Vincent's personally implemented parts precisely.

## Local checks

```sh
node worker/build_experience_manifest.mjs --check
node worker/check_manifest.mjs
node --test worker/worker.test.mjs worker/experience.test.mjs
node --test tests/experience-core.test.mjs tests/experience-storage.test.mjs tests/met-experience.test.mjs
```

Serve `web/` over HTTP for a browser preview. Choice buttons pause when online storage is unavailable; use a separate non-production collector and database to test the complete save flow. Never point a local preview at the production collector to make test selections.

## Publishing

For changes to the choice dataset or collector, follow [worker setup](worker/README.md) and verify the dataset manifest, Worker health, test choice, and export before publishing `web/`. The site discloses approximate country collection before a visitor chooses.

The public website does not call an AI model when a visitor chooses. Its AI judgments were computed in advance.

## Historical work

The project began as a fixed 60-pair classroom exercise. Its data processing, three-feature comparison, round results and deployment history are recorded in `devlog.md` and `verification.txt`. A separate private test site was used to build and check the ten-choice experience, bilingual interface, larger Met gallery, expanded AI ratings and visual screening before those features reached the public site. Its local Python/SQLite collector was a test implementation; production uses a Cloudflare Worker and D1.
