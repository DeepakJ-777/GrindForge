CREATE TABLE `github_daily_activity` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`activity_date` text NOT NULL,
	`contributions` integer DEFAULT 0 NOT NULL,
	`synced_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `github_daily_activity_user_date_idx` ON `github_daily_activity` (`user_id`,`activity_date`);