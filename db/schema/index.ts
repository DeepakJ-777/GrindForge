import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
/* ---------------------------- Better Auth tables --------------------------- */

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull(),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
})

/* ------------------------------- App tables -------------------------------- */

export const dailyLogs = sqliteTable('daily_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  /** ISO date string, YYYY-MM-DD */
  logDate: text('log_date').notNull(),
  note: text('note').notNull(),
  /** JSON-encoded string[] */
  tags: text('tags'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export type DailyLog = typeof dailyLogs.$inferSelect
export type NewDailyLog = typeof dailyLogs.$inferInsert

/* ------------------------------- Resumes -------------------------------- */

export const resumes = sqliteTable('resumes', {
  id: text('id').primaryKey(),

  // One saved resume per user; replacing it updates this record.
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),

  filename: text('filename').notNull(),
  fileSize: integer('file_size').notNull(),
  pageCount: integer('page_count').notNull(),
  parsedText: text('parsed_text').notNull(),
  objectKey: text('object_key'),
  // JSON-encoded structured AI analysis; null until analysed.
  profile: text('profile'),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export type Resume = typeof resumes.$inferSelect
export type NewResume = typeof resumes.$inferInsert

export const userSettings = sqliteTable('user_settings', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  timezone: text('timezone').notNull().default('Asia/Kolkata'),
  theme: text('theme').notNull().default('light'),
  notifyDaily: integer('notify_daily', { mode: 'boolean' }).notNull().default(true),
  notifyWeekly: integer('notify_weekly', { mode: 'boolean' }).notNull().default(false),
  reminderHour: integer('reminder_hour').notNull().default(19),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  dedupeKey: text('dedupe_key').notNull(),
  readAt: integer('read_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, table => [uniqueIndex('notifications_user_dedupe_idx').on(table.userId, table.dedupeKey)])

export const interviewSessions = sqliteTable('interview_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  duration: integer('duration').notNull(),
  status: text('status').notNull().default('in_progress'),
  jobDescription: text('job_description').notNull().default(''),
  questions: text('questions').notNull(),
  transcript: text('transcript').notNull().default('[]'),
  report: text('report'),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
})

export type InterviewSession = typeof interviewSessions.$inferSelect

export const apiRateLimits = sqliteTable('api_rate_limits', {
  key: text('key').primaryKey(),
  windowStartedAt: integer('window_started_at').notNull(),
  hits: integer('hits').notNull().default(0),
})


/* ---------------------------- Integrations ---------------------------- */

export const integrations = sqliteTable('integrations', {
  id: text('id').primaryKey(),

  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),

  // Public LeetCode username
  leetcodeUsername: text('leetcode_username'),

  // GitHub account details; OAuth tokens will be handled securely.
  githubUsername: text('github_username'),
  githubAccessToken: text('github_access_token'),

  // JSON-encoded latest activity snapshots
  leetcodeStats: text('leetcode_stats'),
  githubStats: text('github_stats'),

  lastLeetcodeSyncAt: integer('last_leetcode_sync_at', {
    mode: 'timestamp',
  }),
  lastGithubSyncAt: integer('last_github_sync_at', {
    mode: 'timestamp',
  }),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

export type Integration = typeof integrations.$inferSelect
export type NewIntegration = typeof integrations.$inferInsert

export const leetcodeDailyActivity = sqliteTable(
  'leetcode_daily_activity',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    activityDate: text('activity_date').notNull(),
    submissions: integer('submissions').notNull().default(0),
    syncedAt: integer('synced_at', { mode: 'timestamp' }).notNull(),
  },
  table => [
    uniqueIndex('leetcode_daily_activity_user_date_idx').on(
      table.userId,
      table.activityDate,
    ),
  ],
)
export const githubDailyActivity = sqliteTable(
  'github_daily_activity',
  {
    id: text('id').primaryKey(),

    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    activityDate: text('activity_date').notNull(),

    contributions: integer('contributions').notNull().default(0),

    syncedAt: integer('synced_at', { mode: 'timestamp' }).notNull(),
  },
  table => [
    uniqueIndex('github_daily_activity_user_date_idx').on(
      table.userId,
      table.activityDate,
    ),
  ],
)

export type GithubDailyActivity = typeof githubDailyActivity.$inferSelect
export type NewGithubDailyActivity = typeof githubDailyActivity.$inferInsert
