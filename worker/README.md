# CAC Art Lab online collector

The public website saves each choice before the next pair is shown. The Worker retains the original 60-pair `/choices` endpoint and adds the v7 `/experience/choices` endpoint. Both use the existing D1 binding `DB`, the site-only `ALLOWED_ORIGIN`, and a server-side test-session registry. The v7 endpoint accepts A, B or skip, validates the pair against `experience_manifest.json`, and writes to a separate `experience_choices` table. Repeating an identical event ID and payload returns a duplicate acknowledgment without another row. A conflicting event or another choice for the same round position is rejected.

## Deployment order

1. Back up the production D1 database and confirm the existing 60-pair site and collector are healthy.
2. Apply `migrate_experience_v7.sql` to D1. It creates only the v7 table and indexes; it does not change `choices`.
3. Deploy the Worker with the existing `ADMIN_TOKEN`, `ALLOWED_ORIGIN=https://vincentliu.ai`, and D1 binding. `/health` still reports the 60-pair version; `/experience/health` reports `cac-met-paintings-v7` when called with the allowed Origin.
4. Register a fresh test session through `POST /admin/test-sessions`, then send one v7 choice from the website test flow. Check `GET /admin/experience-summary` and `GET /admin/experience.csv?environment=test`, and remove only that registered session through `DELETE /admin/test-sessions/<session-id>`.
5. Publish the v7 static site from `web/`, verify a real browser selection, the D1 row and CSV, then remove the registered test session. Do not erase production records.

The Wrangler template preserves the existing production settings for disabled preview URLs and enabled observability logs. Check dashboard settings before subsequent deployments because Wrangler applies local configuration to the remote Worker.

Admin routes require `Authorization: Bearer <ADMIN_TOKEN>`. Default CSV export is production; `environment=test` selects only registered test sessions. The public `/experience/community?pairs=id1,id2` endpoint reports only production A/B counts for up to ten known v7 pairs; skips and test records are excluded. No browser credential or IP value is accepted as part of an event. The app database does not store raw IP addresses, although Cloudflare may process them in service logs.

The CSV endpoint currently reads the matching v7 rows in one request. Before large-scale recruitment, replace it with the separately prepared paginated exporter and validate Cloudflare D1 behavior and capacity. The local million-choice work is not part of this deployment.
