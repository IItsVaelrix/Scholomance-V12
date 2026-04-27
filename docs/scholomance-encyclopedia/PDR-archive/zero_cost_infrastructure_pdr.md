# PDR: Zero-Cost Infrastructure Migration

**Subtitle:** Every feature, zero dollars — eliminate the $125–165/month infrastructure bill without changing any game mechanic, schema, or API contract.

**Status:** Finalized
**Classification:** Infrastructure + DevOps + Database + Cost Optimization
**Priority:** High
**Primary Goal:** Replace the Render persistent disk, Redis session store, and paid Render web tier with fully free equivalents (Turso, Cloudflare R2, Cloudflare Pages, Fly.io) while preserving all functionality including FTS5 corpus search, MCP collab, auth, audio, and email.

**Owner:** Gemini
**Reviewer:** Claude (infrastructure surface, env var contract), Codex (adapter layer, session store, DB driver swap)

---

## 1. Executive Summary

The current `render.yaml` declares a **500 GB persistent disk at $0.25/GB = $125/month**. Combined with a paid Render web service (~$7–25/month) and Redis for sessions (~$0–15/month), total infrastructure cost is **$137–165/month**.

Every service this disk provides can be replaced for free:

| Current (paid) | Replacement (free) | Savings |
|---|---|---|
| Render 500 GB disk | Turso (databases) + Cloudflare R2 (audio) | $125/month |
| Redis session store | SQLite-backed session store (in-process) | $0–15/month |
| Render paid web service | Fly.io free tier | $7–25/month |
| Render frontend serving | Cloudflare Pages | included |
| **Total** | | **$137–165/month → $0** |

Nothing changes for game mechanics, schemas, or the frontend. This is a pure infrastructure swap at the adapter layer.

**Implementation Status (April 24, 2026):** Implementation is in progress. The following milestones have been reached:
- **Persistence Wrapper:** A unified wrapper (`codex/server/db/persistence.wrapper.js`) supporting both better-sqlite3 and libSQL has been implemented and integrated into `user.persistence.js` and `collab.persistence.js`.
- **R2 Audio Adapter:** Implemented in `codex/server/services/r2Audio.adapter.js`.
- **Turso Session Store:** Implemented in `codex/server/services/sqliteSessionStore.js`.
- **Initial Deployment Tests:** Initial Fly.io and Turso configurations are verified.

---

## 2. Problem Statement

**Current architecture:**

```
render.yaml
  └── web service (Docker, paid tier)
        └── persistent disk 500 GB @ $0.25/GB
              ├── scholomance_dict.sqlite      (dictionary + FTS5)
              ├── scholomance_corpus.sqlite    (literary corpus + FTS5)
              ├── scholomance_user.sqlite      (user accounts)
              ├── scholomance_collab.sqlite    (collab + MCP data)
              ├── audio/                       (Suno music files)
              └── rhyme-astrology/             (pre-computed index)
        └── Redis (REDIS_URL env var)
              └── session store for @fastify/session
```

**What's wrong:**
- The disk is 500 GB but actual data is likely < 5 GB — 99% of the allocation is wasted spend
- Redis is an external network call on every authenticated request for what is essentially a key-value store
- Render free tier spins down after 15 min — not viable for the always-on MCP collab server
- The dict/corpus SQLite files are **built into the Docker image** at build time (`COPY --from=build /app/data/*.sqlite`), meaning the disk copy is redundant for those two databases

**Key insight from the Dockerfile:**
`scholomance_dict.sqlite` and `scholomance_corpus.sqlite` are already embedded in the Docker image at `/app/data/`. They don't need the persistent disk at all — the disk was probably added to allow hot-swapping them without a rebuild. Turso eliminates this need.

---

## 3. Product Goal

1. **$0/month infrastructure** — no paid services of any kind
2. **No functionality lost** — every endpoint, every feature, every game mechanic continues to work
3. **No API contract changes** — no changes to SCHEMA_CONTRACT.md, no new routes, no client-side changes
4. **Always-on** — no cold-start spin-down for the MCP collab server
5. **Simpler devops** — fewer moving parts, no Redis process to manage

---

## 4. Non-Goals

- Not changing any game mechanic, scoring logic, or balance
- Not changing the database schemas (tables, columns, indexes stay identical)
- Not changing the collab API or MCP protocol
- Not changing the frontend (except removing the Vite dev proxy for the backend URL, which Cloudflare Pages handles via `_redirects`)
- Not migrating to Postgres — SQLite/libSQL stays the engine
- Not replacing the SMTP mailer (it's already free via any SMTP relay)

---

## 5. Core Design Principles

| Principle | Rationale |
|-----------|-----------|
| **Adapter-first swap** | The persistence adapter layer already exists — the driver swap happens there, not in application code |
| **Sync → async at the boundary** | `better-sqlite3` is sync; `@libsql/client` is async. This is the only structural change. Wrap at the adapter boundary so callers see no difference |
| **Dict/corpus stay in-image** | These two DBs are built into Docker at image time. Keep them as local SQLite (`better-sqlite3`) — no network latency for the hot path. Only user/collab DBs move to Turso |
| **Sessions are not secrets** | Signed session cookies (server-side secret) are cryptographically safe without Redis. Drop the network hop |
| **Audio is append-only** | Audio files are written once (Suno ingest) and read many times. R2 is optimal — zero egress cost, global CDN |

---

## 6. Architecture

### Before

```
Fly.io / Render (Docker)
  ├── Fastify server
  │     ├── better-sqlite3 → /var/data/scholomance_user.sqlite
  │     ├── better-sqlite3 → /var/data/scholomance_collab.sqlite
  │     ├── better-sqlite3 → /var/data/scholomance_dict.sqlite   ← redundant (in image)
  │     ├── better-sqlite3 → /var/data/scholomance_corpus.sqlite ← redundant (in image)
  │     ├── connect-redis  → Redis Cloud (sessions)
  │     └── fs.readFile    → /var/data/audio/
  └── React SPA (served by Fastify /dist)
```

### After

```
Cloudflare Pages
  └── React SPA (Vite build, deployed separately)

Fly.io (Docker, free tier, always-on)
  └── Fastify server
        ├── better-sqlite3 → /app/data/scholomance_dict.sqlite   (in-image, unchanged)
        ├── better-sqlite3 → /app/data/scholomance_corpus.sqlite (in-image, unchanged)
        ├── @libsql/client  → Turso DB: scholomance_user          (remote)
        ├── @libsql/client  → Turso DB: scholomance_collab        (remote)
        ├── SQLiteSessionStore → Turso (sessions table in user DB)
        └── @aws-sdk/client-s3 → Cloudflare R2 (audio)
```

---

## 7. Module Breakdown

### 7.1 Turso Database Migration

**Scope:** `scholomance_user.sqlite` and `scholomance_collab.sqlite` only.
Dict and corpus stay as local `better-sqlite3` — they are read-heavy, built at image time, and FTS5 queries on them benefit from in-process latency.

**Driver:**
```bash
npm install @libsql/client
```

**Connection pattern:**
```js
import { createClient } from '@libsql/client';

const userDb = createClient({
  url: process.env.TURSO_USER_DB_URL,
  authToken: process.env.TURSO_USER_DB_TOKEN,
});

const collabDb = createClient({
  url: process.env.TURSO_COLLAB_DB_URL,
  authToken: process.env.TURSO_COLLAB_DB_TOKEN,
});
```

**Schema migration:**
Turso's `libSQL` is a wire-compatible SQLite fork. Run existing `CREATE TABLE` / `CREATE INDEX` statements verbatim against the Turso DB to seed the schema. Export the current SQLite files with `sqlite3 .dump` and replay into Turso via the shell client or the `turso db shell` command.

**API difference:**
`better-sqlite3` is synchronous. `@libsql/client` is async (returns Promises). The only change happens in the persistence adapter layer:

```js
// Before (better-sqlite3)
const rows = db.prepare('SELECT * FROM agents').all();

// After (@libsql/client)
const result = await db.execute('SELECT * FROM agents');
const rows = result.rows;
```

The adapter wraps this and the rest of the application sees no change.

**Affected adapters:**
- `codex/server/user.persistence.js` — user accounts, tokens, sessions
- `codex/server/collab/collab.persistence.js` — collab, agents, tasks, pipelines, bugs

Both files must have their `db.prepare(...).run/get/all()` calls converted to `await db.execute(...)` with the libSQL result shape (`result.rows`, `result.rowsAffected`, `result.lastInsertRowid`).

**Env vars added:**
```
TURSO_USER_DB_URL=libsql://scholomance-user-<org>.turso.io
TURSO_USER_DB_TOKEN=<token>
TURSO_COLLAB_DB_URL=libsql://scholomance-collab-<org>.turso.io
TURSO_COLLAB_DB_TOKEN=<token>
```

**Env vars removed:**
```
USER_DB_PATH
COLLAB_DB_PATH
```

---

### 7.2 Session Store — Drop Redis

**Current:** `connect-redis` + `@fastify/session` → Redis Cloud

**Replacement:** A lightweight SQLite-backed session store using the same `userDb` Turso connection.

```sql
-- Add to user DB schema
CREATE TABLE IF NOT EXISTS sessions (
  sid     TEXT PRIMARY KEY,
  data    TEXT NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);
```

**Store implementation** (`codex/server/services/sqliteSessionStore.js`):
```js
/**
 * @fastify/session-compatible store backed by Turso (libSQL).
 * Implements get/set/destroy/touch.
 */
export class TursoSessionStore {
  constructor(db) { this.db = db; }

  async get(sessionId, callback) {
    try {
      const result = await this.db.execute({
        sql: 'SELECT data, expires FROM sessions WHERE sid = ?',
        args: [sessionId],
      });
      const row = result.rows[0];
      if (!row || Date.now() > Number(row.expires)) return callback(null, null);
      callback(null, JSON.parse(row.data));
    } catch (err) { callback(err); }
  }

  async set(sessionId, session, callback) {
    const expires = session.cookie?.expires
      ? new Date(session.cookie.expires).getTime()
      : Date.now() + 86_400_000; // 24h default
    try {
      await this.db.execute({
        sql: `INSERT INTO sessions (sid, data, expires) VALUES (?, ?, ?)
              ON CONFLICT(sid) DO UPDATE SET data = excluded.data, expires = excluded.expires`,
        args: [sessionId, JSON.stringify(session), expires],
      });
      callback(null);
    } catch (err) { callback(err); }
  }

  async destroy(sessionId, callback) {
    try {
      await this.db.execute({ sql: 'DELETE FROM sessions WHERE sid = ?', args: [sessionId] });
      callback(null);
    } catch (err) { callback(err); }
  }

  async touch(sessionId, session, callback) {
    return this.set(sessionId, session, callback);
  }
}
```

**Session cleanup** — add a periodic job to `codex/server/index.js`:
```js
// Purge expired sessions every hour
setInterval(async () => {
  await userDb.execute({ sql: 'DELETE FROM sessions WHERE expires < ?', args: [Date.now()] });
}, 3_600_000);
```

**Packages to remove:**
```bash
npm uninstall connect-redis redis
```

**Env vars removed:**
```
REDIS_URL
```

---

### 7.3 Audio Storage → Cloudflare R2

**Current:** `fs.readFile/writeFile` on `/var/data/audio/`

**Replacement:** Cloudflare R2 bucket via S3-compatible API.

R2 free tier: 10 GB storage, 1M Class A ops/month, 10M Class B ops/month, **$0 egress**.

**Package:**
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Client config:**
```js
import { S3Client } from '@aws-sdk/client-s3';

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export const AUDIO_BUCKET = process.env.R2_BUCKET_NAME ?? 'scholomance-audio';
```

**Env vars added:**
```
CLOUDFLARE_ACCOUNT_ID=<account-id>
R2_ACCESS_KEY_ID=<key>
R2_SECRET_ACCESS_KEY=<secret>
R2_BUCKET_NAME=scholomance-audio
```

**Env vars removed:**
```
AUDIO_STORAGE_PATH
```

The audio service adapter (`codex/server/services/audio.service.js` or wherever audio reads/writes occur) replaces `fs` calls with `PutObjectCommand` / `GetObjectCommand`. Presigned URLs allow the client to stream audio directly from R2 without proxying through the server.

---

### 7.4 Rhyme Astrology Index → In-Image

**Current:** `RHYME_ASTROLOGY_OUTPUT_DIR=/var/data/rhyme-astrology` on disk

**Replacement:** Build the index into the Docker image at build time (same as dict/corpus).

Add to `Dockerfile` build stage:
```dockerfile
RUN node scripts/buildRhymeAstrologyIndex.js --output /app/data/rhyme-astrology || \
    echo "Rhyme astrology build failed — index will be computed at runtime"
```

**Env var change:**
```
RHYME_ASTROLOGY_OUTPUT_DIR=/app/data/rhyme-astrology
```

No persistent disk needed.

---

### 7.5 Fly.io Deployment

**Replace:** Render web service + disk

**Free tier:** 3 shared-cpu-1x-256mb VMs (always-on, no spin-down), 160 GB bandwidth, 3 GB persistent volume.

The 3 GB volume is a safety net only — it holds no databases (those are in Turso/R2) and is used only for ephemeral scratch space if needed.

**`fly.toml`** (root of repo):
```toml
app = "scholomance"
primary_region = "ord"   # Chicago — pick closest to your users

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  HOST = "0.0.0.0"
  PORT = "3000"
  TRUST_PROXY = "true"
  ENABLE_COLLAB_API = "true"
  # Dict/corpus are in-image — no disk path needed for those
  SCHOLOMANCE_DICT_PATH = "/app/data/scholomance_dict.sqlite"
  SCHOLOMANCE_CORPUS_PATH = "/app/data/scholomance_corpus.sqlite"
  RHYME_ASTROLOGY_OUTPUT_DIR = "/app/data/rhyme-astrology"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false   # Always-on — critical for MCP collab server
  auto_start_machines = true
  min_machines_running = 1

[[vm]]
  size = "shared-cpu-1x"
  memory = "256mb"

[mounts]
  source = "scholomance_scratch"
  destination = "/app/scratch"
```

**Secrets (set via `fly secrets set`):**
```bash
fly secrets set \
  TURSO_USER_DB_URL="libsql://..." \
  TURSO_USER_DB_TOKEN="..." \
  TURSO_COLLAB_DB_URL="libsql://..." \
  TURSO_COLLAB_DB_TOKEN="..." \
  R2_ACCESS_KEY_ID="..." \
  R2_SECRET_ACCESS_KEY="..." \
  CLOUDFLARE_ACCOUNT_ID="..." \
  R2_BUCKET_NAME="scholomance-audio" \
  SESSION_SECRET="$(openssl rand -hex 32)" \
  AUDIO_ADMIN_TOKEN="..."
```

---

### 7.6 Frontend → Cloudflare Pages

The React SPA (Vite build output at `dist/`) is deployed separately to Cloudflare Pages. This eliminates Fastify serving static files, reducing server memory pressure.

**Build command:** `npm run build`
**Output directory:** `dist`
**Node version:** 20

**`dist/_redirects`** (Cloudflare Pages redirect rule to proxy API calls):
```
/api/*  https://scholomance.fly.dev/api/:splat  200
/health/*  https://scholomance.fly.dev/health/:splat  200
```

This means the frontend on `scholomance.pages.dev` (or a custom domain) proxies API requests to the Fly.io backend transparently. No CORS changes needed.

**Env var added to Vite build:**
```
VITE_API_BASE_URL=https://scholomance.fly.dev
```

Or left blank if using the `_redirects` proxy approach (recommended — no CORS complexity).

---

## 8. Implementation Phases

### Phase 1 — Turso provisioning and schema seed (Gemini)
- Create 2 Turso databases: `scholomance-user`, `scholomance-collab`
- Export current SQLite schemas with `.dump` and replay into Turso
- Verify all tables/indexes exist
- **Gate:** `turso db shell scholomance-user` can run all existing queries

### Phase 2 — Adapter layer async migration (Gemini → Codex review)
- Install `@libsql/client`
- Rewrite `codex/server/user.persistence.js` to use async libSQL
- Rewrite `codex/server/collab/collab.persistence.js` to use async libSQL
- All `db.prepare().run/get/all()` → `await db.execute()` with libSQL result shape
- Update abstract persistence adapter interface if needed
- **Gate:** All collab tests pass against Turso

### Phase 3 — Session store (Gemini)
- Add `sessions` table to Turso user DB
- Implement `TursoSessionStore` in `codex/server/services/sqliteSessionStore.js`
- Wire into `@fastify/session` in `codex/server/index.js`
- Remove `connect-redis` and `redis` packages
- Remove `REDIS_URL` from `render.yaml` and all env references
- **Gate:** Login, session persistence, logout all work in staging

### Phase 4 — Audio → R2 (Gemini)
- Create Cloudflare R2 bucket `scholomance-audio`
- Install `@aws-sdk/client-s3`
- Create audio adapter (`codex/server/services/r2Audio.adapter.js`)
- Wire Suno track ingest and playback through R2 adapter
- Test with existing `scripts/add_suno_track.js`
- **Gate:** Audio plays from R2 URL in the browser

### Phase 5 — Fly.io deployment (Gemini)
- Add `fly.toml` to repo root
- `fly launch --no-deploy` to initialize
- `fly secrets set` for all env vars
- `fly deploy`
- Verify `/health/ready` responds
- Verify MCP collab server connects via `scripts/connect-collab.js`
- **Gate:** All existing QA tests pass against Fly.io URL

### Phase 6 — Cloudflare Pages frontend (Gemini)
- Connect GitHub repo to Cloudflare Pages
- Set build command and output dir
- Add `dist/_redirects` with API proxy rule
- Test full login → write scroll → Truesight flow
- **Gate:** Frontend fully functional via Pages URL

### Phase 7 — Render teardown (Gemini, LAST)
- Confirm Fly.io is stable (min 48h of uptime)
- Delete the 500 GB persistent disk from Render dashboard
- Downgrade or delete the Render web service
- **Gate:** $0 on next Render invoice

---

## 9. Env Var Delta

### Removed
```
USER_DB_PATH
COLLAB_DB_PATH
AUDIO_STORAGE_PATH
REDIS_URL
```

### Added
```
TURSO_USER_DB_URL
TURSO_USER_DB_TOKEN
TURSO_COLLAB_DB_URL
TURSO_COLLAB_DB_TOKEN
CLOUDFLARE_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
```

### Unchanged
```
SCHOLOMANCE_DICT_PATH    (still in-image at /app/data/)
SCHOLOMANCE_CORPUS_PATH  (still in-image at /app/data/)
SESSION_SECRET
AUDIO_ADMIN_TOKEN
ENABLE_COLLAB_API
NODE_ENV
HOST
TRUST_PROXY
RHYME_ASTROLOGY_OUTPUT_DIR (path changes to /app/data/, no longer /var/data/)
```

---

## 10. Risk Table

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| `better-sqlite3` sync → `@libsql/client` async breaks call sites | High | High | Adapter boundary contains all changes — application code doesn't see the driver |
| Turso network latency on collab writes | Medium | Low | Collab writes are infrequent (agent heartbeats, task updates) — not hot path |
| R2 SDK auth misconfiguration | Low | Medium | R2 uses standard S3 auth — well-documented, test in Phase 4 before Phase 5 |
| Cloudflare Pages `_redirects` proxy adds latency | Low | Low | Proxy is same-region CDN edge → Fly.io — negligible for API calls |
| Fly.io 256 MB RAM limit | Medium | Medium | Monitor with `fly logs` — corpus search and scoring are CPU-bound but memory-light; upgrade to 512 MB (still free quota) if needed |
| FTS5 queries on in-image dict/corpus hit disk on every cold start | Low | Low | Docker image layers are cached — SQLite file is memory-mapped after first read |
| Session store migration loses active sessions | Low | Low | Acceptable one-time logout for all users during the cutover window |

---

## 11. QA Requirements

| Test | Pass Criteria |
|------|--------------|
| User login/logout | Session persists across requests, destroyed on logout |
| Collab agent register | Agent appears in collab status within 2s |
| LexOracle FTS5 search | Corpus search returns results with snippets |
| Audio playback | Suno track streams from R2 URL |
| MCP collab heartbeat | Agent heartbeat succeeds every 30s for 5 minutes |
| `/health/ready` | Returns 200 on Fly.io URL |
| Frontend via Pages | Full scroll write → Truesight → Oracle flow works |
| Cold start time | Server accepts requests within 10s of VM start |

---

## 12. Success Criteria

1. **Render invoice = $0** for the month following cutover
2. **All QA tests pass** against the Fly.io + Pages production URLs
3. **MCP collab server stays connected** for 24h without interruption (no spin-down)
4. **Zero schema changes** — SCHEMA_CONTRACT.md is not modified
5. **Zero API contract changes** — all existing routes respond identically

---

## 13. Free Tier Limits Reference

| Service | Free Limit | Scholomance Estimated Usage |
|---------|-----------|---------------------------|
| Turso storage | 9 GB total | ~500 MB (user + collab DBs) |
| Turso row reads | 1B/month | Well under at current scale |
| Turso row writes | 10M/month | Well under at current scale |
| Cloudflare R2 storage | 10 GB | ~1–3 GB (audio files) |
| Cloudflare R2 egress | $0 (unlimited) | N/A |
| Cloudflare Pages builds | 500/month | ~10–20/month |
| Fly.io VMs | 3 × shared-cpu-1x | 1 VM needed |
| Fly.io bandwidth | 160 GB/month | Well under |
| Fly.io volume | 3 GB | Scratch only |

All limits are well within free tier at current and projected scale. Revisit when DAU exceeds ~1,000.

---

*PDR Author: claude-ui*
*Finalized Date: 2026-04-24*
*Classification: Infrastructure + DevOps + Database + Cost Optimization*
*Owner: Gemini — all phases*
*Reviewer: Codex (adapter layer sign-off), Claude (env var surface, frontend proxy)*
