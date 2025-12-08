import { pgTable, uniqueIndex, foreignKey, serial, timestamp, uuid, text, bigint, varchar, integer, index, unique, boolean, check, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const likes = pgTable("likes", {
	id: serial().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	postId: uuid("post_id"),
	userId: uuid("user_id"),
}, (table) => [
	uniqueIndex("idx_like_post_id_created_by").using("btree", table.postId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "likes_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const postComments = pgTable("post_comments", {
	id: uuid().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	text: text(),
	postId: uuid("post_id"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	parrentCommentId: bigint("parrent_comment_id", { mode: "number" }),
	createdBy: uuid("created_by"),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "fk_post_comments_creator"
		}),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.id],
			name: "fk_posts_post_comments"
		}).onDelete("cascade"),
]);

export const chatConversations = pgTable("chat_conversations", {
	id: uuid().primaryKey().notNull(),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).notNull(),
	deletedAt: timestamp("deleted_at", { precision: 6, withTimezone: true, mode: 'string' }),
	title: varchar({ length: 255 }).notNull(),
	userId: uuid("user_id").notNull(),
});

export const chatMessages = pgTable("chat_messages", {
	id: uuid().primaryKey().notNull(),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).notNull(),
	conversationId: uuid("conversation_id").notNull(),
	userId: uuid("user_id").notNull(),
	role: varchar({ length: 20 }).notNull(),
	content: text().notNull(),
	model: varchar({ length: 100 }),
	promptTokens: integer("prompt_tokens"),
	completionTokens: integer("completion_tokens"),
	totalTokens: integer("total_tokens"),
}, (table) => [
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [chatConversations.id],
			name: "chat_messages_conversation_id_chat_conversations_id_fk"
		}).onDelete("cascade"),
]);

export const posts = pgTable("posts", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	title: varchar({ length: 255 }),
	createdBy: uuid("created_by"),
	body: text(),
	slug: varchar({ length: 255 }),
	photoUrl: text("photo_url"),
	published: boolean().default(true),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	viewCount: bigint("view_count", { mode: "number" }).default(0),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	likeCount: bigint("like_count", { mode: "number" }).default(0),
}, (table) => [
	index("posts_created_by_idx").using("btree", table.createdBy.asc().nullsLast().op("bool_ops"), table.slug.asc().nullsLast().op("bool_ops"), table.published.asc().nullsLast().op("uuid_ops"), table.deletedAt.asc().nullsLast().op("uuid_ops")),
	index("posts_deleted_at_idx").using("btree", table.deletedAt.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "fk_posts_creator"
		}).onUpdate("cascade").onDelete("set null"),
	unique("creator and slug inique").on(table.createdBy, table.slug),
]);

export const sessions = pgTable("sessions", {
	refreshToken: varchar("refresh_token", { length: 200 }).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	userAgent: text("user_agent"),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const tags = pgTable("tags", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 30 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("idx_tags_name").using("btree", table.name.asc().nullsLast().op("text_ops")),
]);

export const profiles = pgTable("profiles", {
	id: serial().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	bio: text(),
	website: text(),
	phone: varchar({ length: 50 }),
	location: varchar({ length: 255 }),
}, (table) => [
	uniqueIndex("idx_profiles_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "profiles_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const files = pgTable("files", {
	id: uuid().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	name: varchar({ length: 255 }),
	path: text(),
	size: integer(),
	type: varchar({ length: 255 }),
	createdBy: uuid("created_by"),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "files_created_by_users_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: uuid().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	firstName: varchar("first_name", { length: 255 }).default('pilput'),
	lastName: varchar("last_name", { length: 255 }).default('admin'),
	email: varchar({ length: 255 }).notNull(),
	password: varchar({ length: 255 }),
	image: text(),
	isSuperAdmin: boolean("is_super_admin").default(false),
	username: varchar({ length: 255 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	githubId: bigint("github_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	followersCount: bigint("followers_count", { mode: "number" }).default(0),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	followingCount: bigint("following_count", { mode: "number" }).default(0),
}, (table) => [
	uniqueIndex("idx_users_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	uniqueIndex("idx_users_username").using("btree", table.username.asc().nullsLast().op("text_ops")),
	index("users_deleted_at_idx").using("btree", table.deletedAt.asc().nullsLast().op("timestamptz_ops")),
	unique("users_github_id_unique").on(table.githubId),
]);

export const postViews = pgTable("post_views", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	postId: uuid("post_id").notNull(),
	userId: uuid("user_id"),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_post_views_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_post_views_deleted_at").using("btree", table.deletedAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_post_views_post_id").using("btree", table.postId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("idx_post_views_unique_user_post").using("btree", table.postId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops")).where(sql`((user_id IS NOT NULL) AND (deleted_at IS NULL))`),
	index("idx_post_views_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "fk_post_views_user_id"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.id],
			name: "post_views_posts_fk"
		}).onDelete("cascade"),
]);

export const userFollows = pgTable("user_follows", {
	id: uuid().primaryKey().notNull(),
	followerId: uuid("follower_id").notNull(),
	followingId: uuid("following_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_user_follows_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_user_follows_deleted_at").using("btree", table.deletedAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_user_follows_follower_id").using("btree", table.followerId.asc().nullsLast().op("uuid_ops")),
	index("idx_user_follows_following_id").using("btree", table.followingId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("idx_user_follows_unique").using("btree", table.followerId.asc().nullsLast().op("uuid_ops"), table.followingId.asc().nullsLast().op("uuid_ops")).where(sql`(deleted_at IS NULL)`),
	foreignKey({
			columns: [table.followerId],
			foreignColumns: [users.id],
			name: "fk_user_follows_follower_id"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.followingId],
			foreignColumns: [users.id],
			name: "fk_user_follows_following_id"
		}).onDelete("cascade"),
	check("chk_user_follows_no_self_follow", sql`follower_id <> following_id`),
]);

export const postLikes = pgTable("post_likes", {
	id: uuid().primaryKey().notNull(),
	postId: uuid("post_id").notNull(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_post_likes_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_post_likes_deleted_at").using("btree", table.deletedAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_post_likes_post_id").using("btree", table.postId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("idx_post_likes_unique_user_post").using("btree", table.postId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_post_likes_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.id],
			name: "fk_post_likes_post_id"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "fk_post_likes_user_id"
		}).onDelete("cascade"),
]);

export const postBookmarks = pgTable("post_bookmarks", {
	id: uuid().primaryKey().notNull(),
	postId: uuid("post_id").notNull(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	deletedAt: timestamp("deleted_at", { precision: 6, withTimezone: true, mode: 'string' }),
}, (table) => [
	uniqueIndex("idx_bookmark_post_id_user_id").using("btree", table.postId.asc().nullsLast().op("uuid_ops"), table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_post_bookmarks_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_post_bookmarks_deleted_at").using("btree", table.deletedAt.asc().nullsLast().op("timestamptz_ops")),
	index("idx_post_bookmarks_post_id").using("btree", table.postId.asc().nullsLast().op("uuid_ops")),
	index("idx_post_bookmarks_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.id],
			name: "fk_post_bookmarks_post_id"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "fk_post_bookmarks_user_id"
		}).onDelete("cascade"),
]);

export const postsToTags = pgTable("posts_to_tags", {
	postId: uuid("post_id").notNull(),
	tagId: integer("tag_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tagId],
			foreignColumns: [tags.id],
			name: "ptt_tag_id_tags_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.id],
			name: "ptt_post_id_posts_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.postId, table.tagId], name: "posts_to_tags_posts_id_tags_id_pk"}),
]);
