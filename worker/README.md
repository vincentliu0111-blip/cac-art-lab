# Follow Your Eye online collector

The website saves each choice before showing the next pair. The current dataset has 2,751 active pairs after a second image quality review removed 109 from the preceding 2,860-pair deck. Artwork records, existing AI judgments, and model predictions are preserved. Its version string keeps incoming records separate from earlier choices in the existing D1 `experience_choices` table. The former 60-pair public write route is retired; its separate `choices` table and existing records remain available through authenticated owner exports.

New choices store an approximate two-letter country code supplied by Cloudflare's `request.cf.country`, or unknown when unavailable. The browser cannot provide or override it. The site explains this before participation. The app database stores neither raw IP addresses nor precise locations; Cloudflare may process IP addresses in network and service logs. Country may be inaccurate due to VPNs and proxies. The owner can view country with each choice, while public vote totals exclude it.

## Deployment order

1. Confirm the existing website and collector are healthy, and back up the production D1 database.
2. If the existing `experience_choices` table does not yet have `country_code`, apply `migrate_experience_country.sql` once. New installations use `schema.sql` instead. Do not delete earlier records.
3. Deploy the existing `follow-your-eye-collector` Worker with the checked-in code, existing D1 database ID, `ALLOWED_ORIGIN=https://vincentliu.ai`, and its private `ADMIN_TOKEN` secret. The Wrangler template disables preview URLs and enables observability logs.
4. Verify `/experience/health` reports `follow-your-eye-met-paintings-v3` with the allowed Origin. Register a fresh test session through `POST /admin/test-sessions`, save one choice through `/experience/choices`, inspect `/admin/experience-summary`, `/admin/experience-countries?environment=test`, and `/admin/experience.csv?environment=test`, then delete only that test session through `DELETE /admin/test-sessions/<session-id>`. Confirm the CSV country agrees with the database or is unknown.
5. Publish `web/` through GitHub Pages, verify a browser choice and its test record, then clean up that registered test session. Keep production records.
6. Visitors with a cached old page may need to refresh after the new dataset version is deployed.

The site pauses choices when online saving is unavailable. Records from different deck versions remain separated by `dataset_version` in the same database. The public `/experience/community?pairs=id1,id2` endpoint counts only production A/B choices for the current version; it excludes skips, test records, and country codes.

Administrator routes require `Authorization: Bearer <ADMIN_TOKEN>`. Keep the token outside the public repository. `node worker/owner_cli.mjs countries` shows production country totals; `countries-test` shows the test partition. The private country summary counts choices and anonymous sessions, which are not verified people. The CSV export includes `country_code`. The exporter currently reads matching rows in one request; before large-scale recruitment, replace it with a paginated exporter and validate D1 capacity.
