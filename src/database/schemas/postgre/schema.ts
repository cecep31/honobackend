import { pgTable, uniqueIndex, foreignKey, serial, timestamp, uuid, varchar, text, integer, bigint, unique, boolean, primaryKey } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm/relations";
import { sql } from "drizzle-orm"

export const likes = pgTable("likes", {
	id: serial().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	postId: uuid("post_id"),
	createdBy: uuid("created_by"),
}, (table) => {
	return {
		idxLikePostIdCreatedBy: uniqueIndex("idx_like_post_id_created_by").using("btree", table.postId.asc().nullsLast().op("uuid_ops"), table.createdBy.asc().nullsLast().op("uuid_ops")),
		likesCreatedByUsersIdFk: foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "likes_created_by_users_id_fk"
		}),
		likesPostIdPostsIdFk: foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.id],
			name: "likes_post_id_posts_id_fk"
		}).onDelete("cascade"),
	}
});

export const files = pgTable("files", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	name: varchar({ length: 255 }),
	path: text(),
	size: integer(),
	type: varchar({ length: 255 }),
	createdBy: uuid("created_by"),
}, (table) => {
	return {
		filesCreatedByUsersIdFk: foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "files_created_by_users_id_fk"
		}),
	}
});

export const postComments = pgTable("post_comments", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	text: text(),
	postId: uuid("post_id"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	parrentCommentId: bigint("parrent_comment_id", { mode: "number" }),
	createdBy: uuid("created_by"),
}, (table) => {
	return {
		postCommentsCreatedByUsersIdFk: foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "post_comments_created_by_users_id_fk"
		}),
		postCommentsPostIdPostsIdFk: foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.id],
			name: "post_comments_post_id_posts_id_fk"
		}).onDelete("cascade"),
	}
});

export const posts = pgTable("posts", {
	id: uuid().default(sql`uuid_generate_v7()`).primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	title: varchar({ length: 255 }),
	createdBy: uuid("created_by"),
	body: text(),
	slug: varchar({ length: 255 }),
	createbyid: varchar({ length: 50 }),
	photoUrl: text("photo_url"),
	published: boolean().default(true),
}, (table) => {
	return {
		postsCreatedByUsersIdFk: foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "posts_created_by_users_id_fk"
		}).onUpdate("cascade").onDelete("set null"),
		idxPostsSlug: unique("idx_posts_slug").on(table.slug),
	}
});

export const tags = pgTable("tags", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 30 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
	return {
		idxTagsName: uniqueIndex("idx_tags_name").using("btree", table.name.asc().nullsLast().op("text_ops")),
	}
});

export const users = pgTable("users", {
	id: uuid().default(sql`uuid_generate_v7()`).primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	firstName: varchar("first_name", { length: 255 }).default('pilput'),
	lastName: varchar("last_name", { length: 255 }).default('admin'),
	email: varchar({ length: 255 }).notNull(),
	password: varchar({ length: 255 }),
	image: text(),
	issuperadmin: boolean().default(false),
	username: varchar({ length: 255 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	githubId: bigint("github_id", { mode: "number" }),
}, (table) => {
	return {
		idxUsersEmail: uniqueIndex("idx_users_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
		idxUsersUsername: uniqueIndex("idx_users_username").using("btree", table.username.asc().nullsLast().op("text_ops")),
		usersGithubIdUnique: unique("users_github_id_unique").on(table.githubId),
	}
});

export const profiles = pgTable("profiles", {
	id: serial().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	bio: text(),
	website: text(),
	phone: varchar({ length: 50 }),
	location: varchar({ length: 255 }),
}, (table) => {
	return {
		idxProfilesUserId: uniqueIndex("idx_profiles_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
		profilesUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "profiles_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const sessions = pgTable("sessions", {
	token: uuid().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	userAgent: text("user_agent"),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
}, (table) => {
	return {
		sessionsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
	}
});

export const postsToTags = pgTable("posts_to_tags", {
	postId: uuid("post_id").notNull(),
	tagId: integer("tag_id").notNull(),
}, (table) => {
	return {
		postsToTagsPostsIdPostsIdFk: foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.id],
			name: "posts_to_tags_posts_id_posts_id_fk"
		}).onDelete("cascade"),
		postsToTagsTagsIdTagsIdFk: foreignKey({
			columns: [table.tagId],
			foreignColumns: [tags.id],
			name: "posts_to_tags_tags_id_tags_id_fk"
		}).onDelete("cascade"),
		postsToTagsPostsIdTagsIdPk: primaryKey({ columns: [table.postId, table.tagId], name: "posts_to_tags_posts_id_tags_id_pk"}),
	}
});


export const likesRelations = relations(likes, ({one}) => ({
	user: one(users, {
		fields: [likes.createdBy],
		references: [users.id]
	}),
	post: one(posts, {
		fields: [likes.postId],
		references: [posts.id]
	}),
}));

export const usersRelations = relations(users, ({many,one}) => ({
	likes: many(likes),
	files: many(files),
	postComments: many(postComments),
	posts: many(posts),
	profile: one(profiles),
	sessions: many(sessions),
}));

export const postsRelations = relations(posts, ({one, many}) => ({
	likes: many(likes),
	postComments: many(postComments),
	creator: one(users, {
		fields: [posts.createdBy],
		references: [users.id]
	}),
	tags: many(postsToTags),
}));

export const filesRelations = relations(files, ({one}) => ({
	user: one(users, {
		fields: [files.createdBy],
		references: [users.id]
	}),
}));

export const postCommentsRelations = relations(postComments, ({one}) => ({
	user: one(users, {
		fields: [postComments.createdBy],
		references: [users.id]
	}),
	post: one(posts, {
		fields: [postComments.postId],
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
		fields: [postsToTags.postId],
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