/// <reference path="../../worker-configuration.d.ts" />

interface CloudflareBindings {
  placement_db: D1Database
  GROQ_API_KEY: string
  GEMINI_API_KEY: string
  RESUME_BUCKET: R2Bucket
  CRON_SECRET: string
}
