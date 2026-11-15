/// <reference path="../../worker-configuration.d.ts" />

interface CloudflareBindings {
  placement_db: D1Database
  GROQ_API_KEY: string
  GEMINI_API_KEY: string
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
  CRON_SECRET: string
}
