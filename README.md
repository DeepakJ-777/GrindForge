# Placement

Placement-activity tracker built with Nuxt 4, Hono, Cloudflare Workers (D1), Drizzle ORM and Better Auth (Google OAuth).

## Stack

| Layer      | Tech                                                              |
| ---------- | ----------------------------------------------------------------- |
| Frontend   | Nuxt 4 (Vue 3, SSR)                                               |
| API        | Hono mounted under `/api` (`server/api/[...route].ts` → `server/lib/api.ts`) |
| Database   | Cloudflare D1 (`placement_db` binding, database `placement-db`)    |
| ORM        | Drizzle ORM (`db/schema/index.ts`, migrations in `db/migrations`)  |
| Auth       | Better Auth (Google OAuth, session cookies)                        |

## Local development

```bash
npm install
npm run db:migrate:local   # apply D1 migrations to the local (miniflare) database
npm run dev                # http://localhost:3000 — cloudflare bindings emulated via nitro-cloudflare-dev
```

Local D1 state persists in `.wrangler/state/v3`. Secrets for local dev live in `.dev.vars` (git-ignored).

## Google OAuth setup (required once)

1. Go to <https://console.cloud.google.com/apis/credentials> and create an **OAuth Client ID** (Web application).
2. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://placement.deepak777.workers.dev/api/auth/callback/google`
3. Put the credentials in `.dev.vars` (local):
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```
4. And in Cloudflare for production:
   ```bash
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   ```

`BETTER_AUTH_URL` is set per environment (`.dev.vars` locally, `vars` in `wrangler.jsonc` for prod) and `BETTER_AUTH_SECRET` is already configured in both.

## Database migrations

```bash
npm run db:generate         # generate SQL from schema changes (drizzle-kit)
npm run db:migrate:local    # apply to local D1
npm run db:migrate:remote   # apply to production D1
```

## Deploy

```bash
npm run deploy              # nuxt build + wrangler deploy
```

Live at <https://placement.deepak777.workers.dev>.

## API

| Endpoint             | Auth | Description                              |
| -------------------- | ---- | ---------------------------------------- |
| `GET /api/ping`      | –    | Health check (Hono + D1)                 |
| `GET /api/db-test`   | –    | Reads `test_table` (plain Nitro route)   |
| `GET /api/me`        | ✓    | Current user + session expiry (401 out)  |
| `POST /api/logs`     | ✓    | Create a daily log `{logDate, note, tags[]}` |
| `GET /api/logs`      | ✓    | List your daily logs (newest first)      |
| `/api/auth/*`        | –    | Better Auth endpoints (sign-in, callback, sign-out…) |
