CREATE TABLE `integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`leetcode_username` text,
	`github_username` text,
	`github_access_token` text,
	`leetcode_stats` text,
	`github_stats` text,
	`last_leetcode_sync_at` integer,
	`last_github_sync_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `integrations_user_id_unique` ON `integrations` (`user_id`);