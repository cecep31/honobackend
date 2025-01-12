import { relations } from "drizzle-orm/relations";
import { users, likes, posts, files, postComments, profiles, sessions, postsToTags, tags } from "./schema";

export const likesRelations = relations(likes, ({one}) => ({
	user: one(users, {
		fields: [likes.created_by],
		references: [users.id]
	}),
	post: one(posts, {
		fields: [likes.post_id],
		references: [posts.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	likes: many(likes),
	files: many(files),
	postComments: many(postComments),
	posts: many(posts),
	profiles: many(profiles),
	sessions: many(sessions),
}));

export const postsRelations = relations(posts, ({one, many}) => ({
	likes: many(likes),
	postComments: many(postComments),
	user: one(users, {
		fields: [posts.created_by],
		references: [users.id]
	}),
	postsToTags: many(postsToTags),
}));

export const filesRelations = relations(files, ({one}) => ({
	user: one(users, {
		fields: [files.created_by],
		references: [users.id]
	}),
}));

export const postCommentsRelations = relations(postComments, ({one}) => ({
	user: one(users, {
		fields: [postComments.created_by],
		references: [users.id]
	}),
	post: one(posts, {
		fields: [postComments.post_id],
		references: [posts.id]
	}),
}));

export const profilesRelations = relations(profiles, ({one}) => ({
	user: one(users, {
		fields: [profiles.userId],
		references: [users.id]
	}),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const postsToTagsRelations = relations(postsToTags, ({one}) => ({
	post: one(posts, {
		fields: [postsToTags.post_id],
		references: [posts.id]
	}),
	tag: one(tags, {
		fields: [postsToTags.tagId],
		references: [tags.id]
	}),
}));

export const tagsRelations = relations(tags, ({many}) => ({
	postsToTags: many(postsToTags),
}));