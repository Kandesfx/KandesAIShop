# D74-fix — Install scripts (/install/) serving

**Date:** 2026-08-15
**Issue:** `https://kandes.shop/install/codex/*.sh` returned **404** on production.
**Root cause:** `nginx.conf` declared `location /install/ { alias /usr/share/nginx/html/install/; }`
but the directory was **empty inside the nginx container** — no volume mount, no `docker cp`.

---

## TL;DR

1. **Container `kandes-app`** already had the scripts baked in at `/app/public/install/codex/`
   (copied by `Dockerfile` from repo `public/`).
2. **Container `kandes-nginx`** served from `/usr/share/nginx/html/install/` which was empty.
3. **Fix:** mount host directory `/opt/kandes/install/` (synced from app container) into nginx.

---

## Changes

### 1. `docker-compose.yml` — add install mount

```yaml
nginx:
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf:ro
    - ./certs:/etc/nginx/certs:ro
    - ./install:/usr/share/nginx/html/install:ro   # ← ADD THIS LINE
    - nginx-cache:/var/cache/nginx
    - nginx-logs:/var/log/nginx
```

### 2. `scripts/aws/sync-install-scripts.sh` — sync helper

Idempotent bash script that:
- `docker cp` from `kandes-app:/app/public/install/` → `/opt/kandes/install/`
- `nginx -s reload`
- Smoke-tests `https://kandes.shop/install/codex/codex-config-kandes.sh`

Run after every EC2 setup or `git pull` of repo:

```bash
sudo bash /opt/kandes/sync-install-scripts.sh
```

---

## Verification

| URL | Before fix | After fix |
|---|---|---|
| `/install/codex/codex-config-kandes.sh` | 404 (146 B nginx error) | **200 (19389 B)** |
| `/install/codex/codex-config-kandes.ps1` | 404 | **200 (12973 B)** |
| `/install/codex/codex-config-kandes.bat` | 404 | **200 (5249 B)** |
| `/install/codex/README.md` | 404 | **200 (3349 B)** |

End-user command now works:
```bash
curl -fsSL https://kandes.shop/install/codex/codex-config-kandes.sh | bash
irm https://kandes.shop/install/codex/codex-config-kandes.ps1 | iex
```

---

## Why not the alternatives?

- **Option A — `docker cp` per restart** (old `fix-install-scripts.sh` approach):
  Works but loses state on `docker compose restart nginx`. Not durable.
- **Option C — Drop nginx `alias`, let Next.js serve**: Next.js DOES serve
  `public/install/codex/*.sh` already (verified via SSM: file lives at
  `/app/public/install/codex/codex-config-kandes.sh`). But this option would
  (a) make `/install/` route through Node.js instead of static nginx,
  adding latency + memory pressure per request, and
  (b) require app container to be healthy for static scripts — bad isolation.
  Mount is the right answer.

---

## Future work

- [ ] Consider adding `claude/` directory under `public/install/` (currently
  only `codex/` exists; docs mention Claude Code but no installer yet).
- [ ] Wire `sync-install-scripts.sh` into the GitHub Actions deploy workflow
  so install scripts auto-sync on every new image push.
- [ ] Investigate why `public/gsi/client.js` (Google Sign-In helper, 266KB)
  was not in the running image — it exists in repo but missing from
  `kandes-app:/app/public/`. May be a stale build or .dockerignore issue.
