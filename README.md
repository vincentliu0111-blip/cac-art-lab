# CAC Art Lab

CAC Art Lab is a public painting-preference experience at https://vincentliu.ai/. Visitors choose between two artworks, or skip a pair, in rounds of up to ten. Each choice is saved online before the next pair appears. After a round, visitors can compare their choices with precomputed AI-judge preferences and a feature-model prediction, and explore the artworks they selected.

## Current public dataset

- `cac-met-paintings-v7`: 2,860 active pairs and a searchable gallery of 5,326 verified Met Open Access Paintings. The 2,328 active new pairs have six AI-judge votes and numerical feature-model predictions. See `web/about.html` for the distinctions between measured features, predictions and preferences.
- The original `cac-60-2026-09-11-v1` dataset and its records remain separate in the collector. Its historic 60-pair app data and 106 web thumbnails remain in this repository; they are not silently mixed with v7 results.
- `web/met_experience_data.json`, `web/met_catalog.json` and `web/met-art/` supply the public experience. The 5,326 resized JPEGs are derived from Met Open Access images; the full originals and model checkpoints are not part of the website.

The web site is static and published from `web/` by GitHub Pages. The Cloudflare Worker in `worker/` validates and stores individual events in D1; no owner token or D1 credential belongs in the public web files. The new v7 data uses a separate `experience_choices` table. The 60-pair `choices` table remains untouched.

## Local checks

```sh
node worker/build_experience_manifest.mjs --check
node worker/check_manifest.mjs
node --test worker/worker.test.mjs worker/experience.test.mjs
node --test tests/experience-core.test.mjs tests/experience-storage.test.mjs tests/met-experience.test.mjs
```

Serve `web/` over HTTP for a browser preview. Choice buttons pause when online storage is unavailable; use a separate non-production collector and database to test the complete save flow. Never point a local preview at the production collector to make test selections.

## Publishing

Apply `worker/migrate_experience_v7.sql` to the existing D1 database before deploying the updated Worker. Verify the Worker reports `cac-met-paintings-v7`, that a registered test session saves and exports one v7 event, and that old 60-pair events still work. Then publish `web/` through the existing Pages workflow. See [worker setup](worker/README.md) for routes and test cleanup. A deployment of the static files alone leaves saving unavailable, so the website must not be switched to v7 first.

The public website does not call an AI model when a visitor chooses. Its AI judgments were computed in advance.

## Historical work

The project began as a fixed 60-pair classroom exercise. Its data processing, three-feature comparison, round results and deployment history are recorded in `devlog.md` and `verification.txt`. The later private research prototype contributed the 10-choice experience, bilingual interface, local collection, larger Met gallery, expanded AI ratings and visual screening. The production collector is a Cloudflare service rather than the prototype's local Python/SQLite server.
