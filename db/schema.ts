import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const tasks = sqliteTable('tasks', {
 id:text('id').primaryKey(), title:text('title').notNull(), details:text('details').notNull().default(''),
 topic:text('topic').notNull().default(''), due:text('due').notNull().default(''), assignee:text('assignee').notNull().default('together'),
 status:text('status').notNull().default('active'), updated_at:text('updated_at').notNull(), updated_by:text('updated_by').notNull(),
 updated_user_id:text('updated_user_id').notNull(), version:integer('version').notNull().default(1),
});
