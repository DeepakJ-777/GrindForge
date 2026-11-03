/// <reference path="../../worker-configuration.d.ts" />

interface CloudflareBindings {
  placement_db: D1Database
  GROQ_API_KEY: string
  GEMINI_API_KEY: string
  CRON_SECRET: string
}
