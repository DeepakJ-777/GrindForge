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
   - `https://placement.waterman777.workers.dev/api/auth/callback/google`
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

Live at <https://placement.waterman777.workers.dev>.

## API

| Endpoint             | Auth | Description                              |
| -------------------- | ---- | ---------------------------------------- |
| `GET /api/ping`      | –    | Health check (Hono + D1)                 |
| `GET /api/me`        | ✓    | Current user + session expiry (401 out)  |
| `POST /api/logs`     | ✓    | Create a daily log `{logDate, note, tags[]}` |
| `GET /api/logs`      | ✓    | List your daily logs (newest first)      |
| `POST /api/interviews/live` | ✓ | Start a Gemini 3.8 Live voice session and issue a short-lived connection token |
| `POST /api/auth/*`   | –    | Better Auth endpoints (sign-in, callback, sign-out…) |

## GrindForge feature setup

The app now includes persistent preferences (timezone, theme, daily reminder and weekly summary), AI text and voice interviews, private resume PDF storage in R2, in-app notifications, and per-user API rate limits. User settings and interview data are in D1; resume PDFs live in R2 and extracted text remains in D1 for analysis.

### Local setup

1. Create a local R2 bucket binding (the Wrangler local emulator persists objects under `.wrangler/state/v3/r2`).
2. Apply schema changes with `npm run db:migrate:local`.
3. Add `GROQ_API_KEY`, `GEMINI_API_KEY`, and a random `CRON_SECRET` to `.dev.vars`. Groq creates text interview reports; Gemini issues short-lived credentials for the Gemini 3.8 Live audio WebSocket; `CRON_SECRET` protects the notification job.
4. Run `npm run dev`, then sign in and upload a PDF on `/resume`.

Voice sessions connect from the browser to Gemini over a secure WebSocket using a one-use ephemeral token issued by the authenticated Worker. The permanent Gemini key stays on the server. Gemini Live audio sessions are limited to 15 minutes; the app saves the transcript and report when a session ends.

### Cloudflare and GitHub setup

Before deploying, create the bucket and apply migrations:

```bash
npm run db:migrate:remote
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put CRON_SECRET
npm run deploy
```

The GitHub workflows need repository secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `CRON_SECRET`. The scheduled workflow calls the current Worker hostname and creates in-app reminders and summaries; it does not send email. Set Google OAuth credentials in local `.dev.vars` and Cloudflare Worker secrets using the redirect URIs above. For Google OAuth in production, use the current Worker hostname or the custom domain after it is configured.

Run `npm test`, `npm run typecheck`, and `npm run build` locally. GitHub Actions runs these on pull requests and pushes to `main`; deploy runs on pushes to `main` after the same checks.

### Still requires account-side setup

- Add Google OAuth client credentials and verify both redirect URIs.
- Create the R2 bucket and apply the new D1 migrations to the remote database before deploying.
- Add the listed GitHub secrets and connect this checkout to its GitHub repository.
- Choose and attach a custom domain in Cloudflare; the domain name and DNS zone were not provided.
- Add a Sentry project and DSN before enabling hosted error monitoring.
