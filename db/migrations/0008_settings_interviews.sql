CREATE TABLE `interview_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`duration` integer NOT NULL,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`job_description` text DEFAULT '' NOT NULL,
	`questions` text NOT NULL,
	`transcript` text DEFAULT '[]' NOT NULL,
	`report` text,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`dedupe_key` text NOT NULL,
	`read_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notifications_user_dedupe_idx` ON `notifications` (`user_id`,`dedupe_key`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`timezone` text DEFAULT 'Asia/Kolkata' NOT NULL,
	`theme` text DEFAULT 'light' NOT NULL,
	`notify_daily` integer DEFAULT true NOT NULL,
	`notify_weekly` integer DEFAULT false NOT NULL,
	`reminder_hour` integer DEFAULT 19 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `resumes` ADD `object_key` text;