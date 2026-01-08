import { pgTable, uniqueIndex, foreignKey, serial, timestamp, uuid, text, bigint, varchar, integer, index, unique, boolean, check, primaryKey, smallserial, bigserial, smallint, char, numeric } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm/relations";
import { sql } from "drizzle-orm"


export const likes = pgTable("likes", {
	id: serial().primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	post_id: uuid("post_id"),
	user_id: uuid("user_id"),
}, (table) => [
	uniqueIndex("idx_like_post_id_created_by").using("btree", table.post_id.asc().nullsLast().op("uuid_ops"), table.user_id.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.user_id],
			foreignColumns: [users.id],
			name: "likes_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const post_comments = pgTable("post_comments", {
	id: uuid().primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	text: text(),
	post_id: uuid("post_id"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	parrent_comment_id: bigint("parrent_comment_id", { mode: "number" }),
	created_by: uuid("created_by"),
}, (table) => [
	foreignKey({
			columns: [table.created_by],
			foreignColumns: [users.id],
			name: "fk_post_comments_creator"
		}),
	foreignKey({
			columns: [table.post_id],
			foreignColumns: [posts.id],
			name: "fk_posts_post_comments"
		}).onDelete("cascade"),
]);

export const chat_conversations = pgTable("chat_conversations", {
	id: uuid().primaryKey().notNull(),
	created_at: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updated_at: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).notNull(),
	deleted_at: timestamp("deleted_at", { precision: 6, withTimezone: true, mode: 'string' }),
	title: varchar({ length: 255 }).notNull(),
	user_id: uuid("user_id").notNull(),
});

export const chat_messages = pgTable("chat_messages", {
	id: uuid().primaryKey().notNull(),
	created_at: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updated_at: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).notNull(),
	conversation_id: uuid("conversation_id").notNull(),
	user_id: uuid("user_id").notNull(),
	role: varchar({ length: 20 }).notNull(),
	content: text().notNull(),
	model: varchar({ length: 100 }),
	prompt_tokens: integer("prompt_tokens"),
	completion_tokens: integer("completion_tokens"),
	total_tokens: integer("total_tokens"),
}, (table) => [
	foreignKey({
			columns: [table.conversation_id],
			foreignColumns: [chat_conversations.id],
			name: "chat_messages_conversation_id_chat_conversations_id_fk"
		}).onDelete("cascade"),
]);

export const posts = pgTable("posts", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	title: varchar({ length: 255 }),
	created_by: uuid("created_by"),
	body: text(),
	slug: varchar({ length: 255 }),
	photo_url: text("photo_url"),
	published: boolean().default(true),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	view_count: bigint("view_count", { mode: "number" }).default(0),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	like_count: bigint("like_count", { mode: "number" }).default(0),
}, (table) => [
	index("posts_created_by_idx").using("btree", table.created_by.asc().nullsLast().op("bool_ops"), table.slug.asc().nullsLast().op("bool_ops"), table.published.asc().nullsLast().op("uuid_ops"), table.deleted_at.asc().nullsLast().op("uuid_ops")),
	index("posts_deleted_at_idx").using("btree", table.deleted_at.asc().nullsLast().op("timestamptz_ops")),
	foreignKey({
			columns: [table.created_by],
			foreignColumns: [users.id],
			name: "fk_posts_creator"
		}).onUpdate("cascade").onDelete("set null"),
	unique("creator and slug inique").on(table.created_by, table.slug),
]);

export const sessions = pgTable("sessions", {
	refresh_token: varchar("refresh_token", { length: 200 }).primaryKey().notNull(),
	user_id: uuid("user_id").notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	user_agent: text("user_agent"),
	expires_at: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.user_id],
			foreignColumns: [users.id],
			name: "sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const password_reset_tokens = pgTable("password_reset_tokens", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	user_id: uuid("user_id").notNull(),
	token: varchar({ length: 255 }).notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	expires_at: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	used_at: timestamp("used_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	uniqueIndex("idx_password_reset_tokens_token").using("btree", table.token.asc().nullsLast().op("text_ops")),
	index("idx_password_reset_tokens_user_id").using("btree", table.user_id.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.user_id],
			foreignColumns: [users.id],
			name: "password_reset_tokens_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const tags = pgTable("tags", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 30 }),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("idx_tags_name").using("btree", table.name.asc().nullsLast().op("text_ops")),
]);

export const profiles = pgTable("profiles", {
	id: serial().primaryKey().notNull(),
	user_id: uuid("user_id").notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	bio: text(),
	website: text(),
	phone: varchar({ length: 50 }),
	location: varchar({ length: 255 }),
}, (table) => [
	uniqueIndex("idx_profiles_user_id").using("btree", table.user_id.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.user_id],
			foreignColumns: [users.id],
			name: "profiles_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const files = pgTable("files", {
	id: uuid().primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	name: varchar({ length: 255 }),
	path: text(),
	size: integer(),
	type: varchar({ length: 255 }),
	created_by: uuid("created_by"),
}, (table) => [
	foreignKey({
			columns: [table.created_by],
			foreignColumns: [users.id],
			name: "files_created_by_users_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: uuid().primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	first_name: varchar("first_name", { length: 255 }).default('pilput'),
	last_name: varchar("last_name", { length: 255 }).default('admin'),
	email: varchar({ length: 255 }).notNull(),
	password: varchar({ length: 255 }),
	image: text(),
	is_super_admin: boolean("is_super_admin").default(false),
	username: varchar({ length: 255 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	github_id: bigint("github_id", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	followers_count: bigint("followers_count", { mode: "number" }).default(0),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	following_count: bigint("following_count", { mode: "number" }).default(0),
}, (table) => [
	uniqueIndex("idx_users_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	uniqueIndex("idx_users_username").using("btree", table.username.asc().nullsLast().op("text_ops")),
	index("users_deleted_at_idx").using("btree", table.deleted_at.asc().nullsLast().op("timestamptz_ops")),
	unique("users_github_id_unique").on(table.github_id),
]);

export const post_views = pgTable("post_views", {
	id: uuid().default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	post_id: uuid("post_id").notNull(),
	user_id: uuid("user_id"),
	ip_address: varchar("ip_address", { length: 45 }),
	user_agent: text("user_agent"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_post_views_created_at").using("btree", table.created_at.asc().nullsLast().op("timestamptz_ops")),
	index("idx_post_views_deleted_at").using("btree", table.deleted_at.asc().nullsLast().op("timestamptz_ops")),
	index("idx_post_views_post_id").using("btree", table.post_id.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("idx_post_views_unique_user_post").using("btree", table.post_id.asc().nullsLast().op("uuid_ops"), table.user_id.asc().nullsLast().op("uuid_ops")).where(sql`((user_id IS NOT NULL) AND (deleted_at IS NULL))`),
	index("idx_post_views_user_id").using("btree", table.user_id.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.user_id],
			foreignColumns: [users.id],
			name: "fk_post_views_user_id"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.post_id],
			foreignColumns: [posts.id],
			name: "post_views_posts_fk"
		}).onDelete("cascade"),
]);

export const user_follows = pgTable("user_follows", {
	id: uuid().primaryKey().notNull(),
	follower_id: uuid("follower_id").notNull(),
	following_id: uuid("following_id").notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_user_follows_created_at").using("btree", table.created_at.asc().nullsLast().op("timestamptz_ops")),
	index("idx_user_follows_deleted_at").using("btree", table.deleted_at.asc().nullsLast().op("timestamptz_ops")),
	index("idx_user_follows_follower_id").using("btree", table.follower_id.asc().nullsLast().op("uuid_ops")),
	index("idx_user_follows_following_id").using("btree", table.following_id.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("idx_user_follows_unique").using("btree", table.follower_id.asc().nullsLast().op("uuid_ops"), table.following_id.asc().nullsLast().op("uuid_ops")).where(sql`(deleted_at IS NULL)`),
	foreignKey({
			columns: [table.follower_id],
			foreignColumns: [users.id],
			name: "fk_user_follows_follower_id"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.following_id],
			foreignColumns: [users.id],
			name: "fk_user_follows_following_id"
		}).onDelete("cascade"),
	check("chk_user_follows_no_self_follow", sql`follower_id <> following_id`),
]);

export const post_likes = pgTable("post_likes", {
	id: uuid().primaryKey().notNull(),
	post_id: uuid("post_id").notNull(),
	user_id: uuid("user_id").notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_post_likes_created_at").using("btree", table.created_at.asc().nullsLast().op("timestamptz_ops")),
	index("idx_post_likes_deleted_at").using("btree", table.deleted_at.asc().nullsLast().op("timestamptz_ops")),
	index("idx_post_likes_post_id").using("btree", table.post_id.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("idx_post_likes_unique_user_post").using("btree", table.post_id.asc().nullsLast().op("uuid_ops"), table.user_id.asc().nullsLast().op("uuid_ops")).where(sql`(deleted_at IS NULL)`),
	index("idx_post_likes_user_id").using("btree", table.user_id.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.post_id],
			foreignColumns: [posts.id],
			name: "fk_post_likes_post_id"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.user_id],
			foreignColumns: [users.id],
			name: "fk_post_likes_user_id"
		}).onDelete("cascade"),
]);

export const post_bookmarks = pgTable("post_bookmarks", {
	id: uuid().primaryKey().notNull(),
	post_id: uuid("post_id").notNull(),
	user_id: uuid("user_id").notNull(),
	created_at: timestamp("created_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updated_at: timestamp("updated_at", { precision: 6, withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	deleted_at: timestamp("deleted_at", { precision: 6, withTimezone: true, mode: 'string' }),
}, (table) => [
	uniqueIndex("idx_bookmark_post_id_user_id").using("btree", table.post_id.asc().nullsLast().op("uuid_ops"), table.user_id.asc().nullsLast().op("uuid_ops")),
	index("idx_post_bookmarks_created_at").using("btree", table.created_at.asc().nullsLast().op("timestamptz_ops")),
	index("idx_post_bookmarks_deleted_at").using("btree", table.deleted_at.asc().nullsLast().op("timestamptz_ops")),
	index("idx_post_bookmarks_post_id").using("btree", table.post_id.asc().nullsLast().op("uuid_ops")),
	index("idx_post_bookmarks_user_id").using("btree", table.user_id.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.post_id],
			foreignColumns: [posts.id],
			name: "fk_post_bookmarks_post_id"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.user_id],
			foreignColumns: [users.id],
			name: "fk_post_bookmarks_user_id"
		}).onDelete("cascade"),
]);

export const posts_to_tags = pgTable("posts_to_tags", {
	post_id: uuid("post_id").notNull(),
	tag_id: integer("tag_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.tag_id],
			foreignColumns: [tags.id],
			name: "ptt_tag_id_tags_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.post_id],
			foreignColumns: [posts.id],
			name: "ptt_post_id_posts_id_fk"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.post_id, table.tag_id], name: "posts_to_tags_posts_id_tags_id_pk"}),
]);

export const holding_types = pgTable("holding_types", {
	id: smallserial().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	notes: text(),
}, (table) => [
	unique("holding_types_code_key").on(table.code),
]);

export const holdings = pgTable("holdings", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	user_id: uuid("user_id").notNull(),
	name: text().notNull(),
	platform: text().notNull(),
	holding_type_id: smallint("holding_type_id").notNull(),
	currency: char({ length: 3 }).notNull(),
	invested_amount: numeric("invested_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	current_value: numeric("current_value", { precision: 18, scale:  2 }).default('0').notNull(),
	units: numeric({ precision: 24, scale:  10 }),
	avg_buy_price: numeric("avg_buy_price", { precision: 18, scale:  8 }),
	current_price: numeric("current_price", { precision: 18, scale:  8 }),
	last_updated: timestamp("last_updated", { withTimezone: true, mode: 'string' }),
	notes: text(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	month: integer().default(1).notNull(),
	year: integer().default(2025).notNull(),
}, (table) => [
	index("idx_holdings_user").using("btree", table.user_id.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.user_id],
			foreignColumns: [users.id],
			name: "holdings_user_id_fkey"
		}),
	foreignKey({
			columns: [table.holding_type_id],
			foreignColumns: [holding_types.id],
			name: "holdings_holding_type_id_fkey"
		}),
]);


export const likesRelations = relations(likes, ({one}) => ({
	user: one(users, {
		fields: [likes.user_id],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	likes: many(likes),
	post_comments: many(post_comments),
	posts: many(posts),
	sessions: many(sessions),
	profiles: many(profiles),
	files: many(files),
	post_views: many(post_views),
	user_follows_follower_id: many(user_follows, {
		relationName: "userFollows_followerId_users_id"
	}),
	user_follows_following_id: many(user_follows, {
		relationName: "userFollows_followingId_users_id"
	}),
	post_likes: many(post_likes),
	post_bookmarks: many(post_bookmarks),
	password_reset_tokens: many(password_reset_tokens),
}));

export const post_comments_relations = relations(post_comments, ({one}) => ({
	user: one(users, {
		fields: [post_comments.created_by],
		references: [users.id]
	}),
	post: one(posts, {
		fields: [post_comments.post_id],
		references: [posts.id]
	}),
}));

export const postsRelations = relations(posts, ({one, many}) => ({
	post_comments: many(post_comments),
	user: one(users, {
		fields: [posts.created_by],
		references: [users.id]
	}),
	post_views: many(post_views),
	post_likes: many(post_likes),
	post_bookmarks: many(post_bookmarks),
	posts_to_tags: many(posts_to_tags),
}));

export const chat_messages_relations = relations(chat_messages, ({one}) => ({
	chatConversation: one(chat_conversations, {
		fields: [chat_messages.conversation_id],
		references: [chat_conversations.id]
	}),
}));

export const chat_conversations_relations = relations(chat_conversations, ({many}) => ({
	chatMessages: many(chat_messages),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.user_id],
		references: [users.id]
	}),
}));

export const passwordResetTokensRelations = relations(password_reset_tokens, ({one}) => ({
	user: one(users, {
		fields: [password_reset_tokens.user_id],
		references: [users.id]
	}),
}));

export const profilesRelations = relations(profiles, ({one}) => ({
	user: one(users, {
		fields: [profiles.user_id],
		references: [users.id]
	}),
}));

export const filesRelations = relations(files, ({one}) => ({
	user: one(users, {
		fields: [files.created_by],
		references: [users.id]
	}),
}));

export const post_views_relations = relations(post_views, ({one}) => ({
	user: one(users, {
		fields: [post_views.user_id],
		references: [users.id]
	}),
	post: one(posts, {
		fields: [post_views.post_id],
		references: [posts.id]
	}),
}));

export const user_follows_relations = relations(user_follows, ({one}) => ({
	user_follower_id: one(users, {
		fields: [user_follows.follower_id],
		references: [users.id],
		relationName: "userFollows_followerId_users_id"
	}),
	user_following_id: one(users, {
		fields: [user_follows.following_id],
		references: [users.id],
		relationName: "userFollows_followingId_users_id"
	}),
}));

export const post_likes_relations = relations(post_likes, ({one}) => ({
	post: one(posts, {
		fields: [post_likes.post_id],
		references: [posts.id]
	}),
	user: one(users, {
		fields: [post_likes.user_id],
		references: [users.id]
	}),
}));

export const post_bookmarks_relations = relations(post_bookmarks, ({one}) => ({
	post: one(posts, {
		fields: [post_bookmarks.post_id],
		references: [posts.id]
	}),
	user: one(users, {
		fields: [post_bookmarks.user_id],
		references: [users.id]
	}),
}));

export const posts_to_tags_relations = relations(posts_to_tags, ({one}) => ({
	tag: one(tags, {
		fields: [posts_to_tags.tag_id],
		references: [tags.id]
	}),
	post: one(posts, {
		fields: [posts_to_tags.post_id],
		references: [posts.id]
	}),
}));

export const tagsRelations = relations(tags, ({many}) => ({
	posts_to_tags: many(posts_to_tags),
}));

export const holdingsRelations = relations(holdings, ({one}) => ({
	user: one(users, {
		fields: [holdings.user_id],
		references: [users.id]
	}),
	holding_type: one(holding_types, {
		fields: [holdings.holding_type_id],
		references: [holding_types.id]
	}),
}));

export const holding_types_relations = relations(holding_types, ({many}) => ({
	holdings: many(holdings),
}));