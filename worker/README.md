# Production choice collector

The public site posts one explicitly consented selection at a time. Cloudflare Workers validates each event against the frozen 60-pair manifest and writes it to D1. No D1 credentials or owner token go into `web/`.

Setup for a new Cloudflare account:

1. Create a D1 database named `cac-art-choices` with Wrangler, copy `wrangler.toml.example` to `wrangler.toml`, and fill in its database ID. Do not commit `wrangler.toml` until it contains only the public database ID and no credentials.
2. Apply `schema.sql` to D1 remotely, then set `ADMIN_TOKEN` as a Wrangler secret using a fresh long random value. Keep that value in the owner's password manager; never add it to source or a shell command argument.
3. Deploy the Worker. Set the returned HTTPS Worker URL as `endpoint` in `web/collection_config.json`, and verify `/health` before publishing the site. The current deployment uses `https://cac-art-choice-collector.vincentliu0111.workers.dev` and D1 binding `DB`.
4. View counts by environment and dataset version with `GET /admin/summary`. Export individual rows with `GET /admin/choices.csv?environment=production` using `Authorization: Bearer <ADMIN_TOKEN>` from an owner-only API client. The default export is production only; use `environment=test` for verification rows. Add `&version=cac-60-2026-09-11-v1` to filter one version. CSV includes dataset version and server receipt time. Keep exported files private.
5. For an online test, read the anonymous session ID shown in the site, register it with `POST /admin/test-sessions` body `{"sessionId":"..."}` and owner bearer token **before** choosing. The server then labels that session's records `test`. Compare the browser event and test CSV row. After saving the evidence, remove just this session's test records with `DELETE /admin/test-sessions/<sessionId>`. Never run an unscoped production delete.

On the owner's computer, store the secret in `/private/tmp/cac-art-admin-token` with file permissions `600`. Then `node worker/owner_cli.mjs summary` shows counts, `node worker/owner_cli.mjs export-production /private/tmp/cac-production.csv` and `export-test` write private CSV files, and `register-test UUID` / `delete-test UUID` manage precisely one test session. The command refuses to overwrite an existing CSV. Set `CAC_ADMIN_TOKEN_FILE` if the owner keeps the token at another private path. Never send the token in chat or add it to Git.

The Worker rejects unknown versions, pair IDs, wrong order, invalid artwork IDs, malformed times, and conflicting repeats. It accepts the same event ID and payload on retry without inserting another row. The database enforces uniqueness by event ID and by round/pair and round/position. Starting another round generates a new round ID and cannot replace old rows. Public requests cannot read rows. Test rows are isolated by server-side registration, not by a client-supplied flag.

Each CSV row records the frozen `dataset_version`, `pair_id`, question `position`, A and B artwork IDs, the chosen A/B side, and `layout` (`side-by-side` means A left/B right; `stacked` means A top/B bottom). It also records anonymous `session_id`, distinct `round_id`, stable event `id`, client `shown_at` and `chosen_at` UTC times, elapsed wall-clock milliseconds, server `received_at` UTC time, and `environment`. The website does not request names, email, or precise location. The version remains part of every row so exports can separate this 60-pair set from later versions.

Cloudflare can process client IP addresses in its network and service logs; this app does not write them into D1. Do not claim that the hosting provider collects no IP addresses.

For a dashboard-only deployment, run `node worker/build_dashboard_bundle.mjs` and paste the generated `worker/dashboard_bundle.js` as the single Worker entrypoint. The generated file embeds the same reviewed manifest and is ignored by Git. This avoids the dashboard editor's unresolved JSON import diagnostic. Keep `worker.mjs` and `manifest.json` as the source of truth.
