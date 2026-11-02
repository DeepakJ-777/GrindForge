CREATE TABLE `resumes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`filename` text NOT NULL,
	`file_size` integer NOT NULL,
	`page_count` integer NOT NULL,
	`parsed_text` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resumes_user_id_unique` ON `resumes` (`user_id`);