import { pgTable, uniqueIndex, uuid, timestamp, text, boolean, foreignKey, bigint, unique, varchar } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"



export const users = pgTable("users", {
	id: uuid("id").default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	firstName: text("first_name").default('pilput'),
	lastName: text("last_name").default('admin'),
	email: text("email").notNull(),
	password: text("password"),
	image: text("image"),
	issuperadmin: boolean("issuperadmin").default(false),
},
(table) => {
	return {
		idxUsersEmail: uniqueIndex("idx_users_email").on(table.email),
	}
});

export const postComments = pgTable("post_comments", {
	id: uuid("id").default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	text: text("text"),
	postId: uuid("post_id").references(() => posts.id, { onDelete: "set null", onUpdate: "cascade" } ),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	parrentCommentId: bigint("parrent_comment_id", { mode: "number" }),
	createdBy: uuid("created_by").references(() => users.id),
});

export const posts = pgTable("posts", {
	id: uuid("id").default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	title: text("title"),
	createdBy: uuid("created_by").references(() => users.id).references(() => users.id),
	body: text("body"),
	slug: text("slug"),
	createbyid: varchar("createbyid", { length: 50 }),
	photoUrl: text("photo_url"),
},
(table) => {
	return {
		idxPostsSlug: unique("idx_posts_slug").on(table.slug),
	}
});

export const taskgorups = pgTable("taskgorups", {
	id: uuid("id").default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	name: text("name"),
	createdBy: uuid("created_by").references(() => users.id),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	order: bigint("order", { mode: "number" }),
});

export const tasks = pgTable("tasks", {
	id: uuid("id").default(sql`uuid_generate_v4()`).primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	title: text("title"),
	desc: text("desc"),
	groupId: uuid("group_id").references(() => taskgorups.id),
	createdBy: uuid("created_by").references(() => users.id).references(() => users.id),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	order: bigint("order", { mode: "number" }),
	body: text("body"),
});