CREATE TABLE `api_rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`window_started_at` integer NOT NULL,
	`hits` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
DROP TABLE `test_table`;