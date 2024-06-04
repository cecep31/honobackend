import { pgTable, uniqueIndex, uuid, timestamp, text, boolean, foreignKey, bigint, unique, varchar, serial, integer, primaryKey } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm/relations";

import { sql } from "drizzle-orm"

export const users = pgTable("users", {
	id: uuid("id").default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	first_name: text("first_name").default('pilput'),
	last_name: text("last_name").default('admin'),
	email: text("email").notNull(),
	password: text("password"),
	image: text("image"),
	issuperadmin: boolean("issuperadmin").default(false),
},
	(table) => {
		return {
			idx_users_email: uniqueIndex("idx_users_email").on(table.email),
		}
	});

export const post_comments = pgTable("post_comments", {
	id: uuid("id").default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	text: text("text"),
	post_id: uuid("post_id").references(() => posts.id, { onDelete: "set null", onUpdate: "cascade" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	parrent_comment_id: bigint("parrent_comment_id", { mode: "number" }),
	created_by: uuid("created_by").references(() => users.id),
});

export const posts = pgTable("posts", {
	id: uuid("id").default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	deleted_at: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	title: text("title"),
	created_by: uuid("created_by").references(() => users.id),
	body: text("body"),
	slug: text("slug"),
	createbyid: varchar("createbyid", { length: 50 }),
	photo_url: text("photo_url"),
}, (table) => {
	return {
		idx_posts_slug: unique("idx_posts_slug").on(table.slug),
	}
});

export const tags = pgTable('tags', {
	id: serial('id').primaryKey(),
	name: text('name'),
}, (t) => {
	return {
		idx_tags_name: uniqueIndex('idx_tags_name').on(t.name),
	}
});

export const postsToTags = pgTable(
	'posts_to_tags',
	{
		posts_id: uuid('posts_id')
			.notNull()
			.references(() => posts.id),
		tags_id: integer('tags_id')
			.notNull()
			.references(() => tags.id),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.posts_id, t.tags_id] }),
	}),
);

export const post_commentsRelations = relations(post_comments, ({ one }) => ({
	user: one(users, {
		fields: [post_comments.created_by],
		references: [users.id]
	}),
	post: one(posts, {
		fields: [post_comments.post_id],
		references: [posts.id]
	}),
}));

export const usersRelations = relations(users, ({ many }) => ({
	post_comments: many(post_comments),
	posts_created_by: many(posts, {
		relationName: "posts_created_by_users_id"
	}),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
	post_comments: many(post_comments),
	creator: one(users, {
		fields: [posts.created_by],
		references: [users.id],
		relationName: "posts_created_by_users_id"
	}),
	usersToGroups: many(postsToTags),
}));
export const groupsRelations = relations(tags, ({ many }) => ({
	usersToGroups: many(postsToTags),
  }));