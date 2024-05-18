import { relations } from "drizzle-orm/relations";
import { users, post_comments, posts, taskgorups, tasks } from "./schema";

export const post_commentsRelations = relations(post_comments, ({one}) => ({
	user: one(users, {
		fields: [post_comments.created_by],
		references: [users.id]
	}),
	post: one(posts, {
		fields: [post_comments.post_id],
		references: [posts.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	post_comments: many(post_comments),
	posts_created_by: many(posts, {
		relationName: "posts_created_by_users_id"
	}),
	posts_created_by: many(posts, {
		relationName: "posts_created_by_users_id"
	}),
	taskgorups: many(taskgorups),
	tasks_created_by: many(tasks, {
		relationName: "tasks_created_by_users_id"
	}),
	tasks_created_by: many(tasks, {
		relationName: "tasks_created_by_users_id"
	}),
}));

export const postsRelations = relations(posts, ({one, many}) => ({
	post_comments: many(post_comments),
	user_created_by: one(users, {
		fields: [posts.created_by],
		references: [users.id],
		relationName: "posts_created_by_users_id"
	}),
	user_created_by: one(users, {
		fields: [posts.created_by],
		references: [users.id],
		relationName: "posts_created_by_users_id"
	}),
}));

export const taskgorupsRelations = relations(taskgorups, ({one, many}) => ({
	user: one(users, {
		fields: [taskgorups.created_by],
		references: [users.id]
	}),
	tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({one}) => ({
	taskgorup: one(taskgorups, {
		fields: [tasks.group_id],
		references: [taskgorups.id]
	}),
	user_created_by: one(users, {
		fields: [tasks.created_by],
		references: [users.id],
		relationName: "tasks_created_by_users_id"
	}),
	user_created_by: one(users, {
		fields: [tasks.created_by],
		references: [users.id],
		relationName: "tasks_created_by_users_id"
	}),
}));