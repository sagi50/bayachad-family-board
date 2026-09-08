CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`topic` text DEFAULT '' NOT NULL,
	`due` text DEFAULT '' NOT NULL,
	`assignee` text DEFAULT 'together' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text NOT NULL,
	`updated_user_id` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
