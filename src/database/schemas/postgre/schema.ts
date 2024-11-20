import {
  pgTable,
  uniqueIndex,
  uuid,
  timestamp,
  text,
  boolean,
  bigint,
  varchar,
  serial,
  integer,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id")
    .default(sql`uuid_generate_v7()`)
    .primaryKey()
    .notNull(),
  github_id: bigint("github_id", { mode: "number" }).unique(),
  created_at: timestamp("created_at", {
    withTimezone: true,
    mode: "string",
  }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" }),
  deleted_at: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  first_name: varchar("first_name", { length: 255 }).default("pilput"),
  last_name: varchar("last_name", { length: 255 }).default("admin"),
  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 255 }),
  password: varchar("password", { length: 255 }),
  image: text("image"),
  issuperadmin: boolean("issuperadmin").default(false),
});

export const sessions = pgTable("sessions", {
  id: uuid("token").primaryKey().notNull(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  created_at: timestamp("created_at", {
    withTimezone: true,
    mode: "string",
  }).defaultNow(),
  user_agent: text("user_agent"),
  expires_at: timestamp("expires_at", {
    withTimezone: true,
    mode: "string",
  }),
});

export const profiles = pgTable(
  "profiles",
  {
    id: serial("id").primaryKey().notNull(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" }),
    bio: text("bio"),
    location: varchar("location", { length: 255 }),
    website: text("website"),
    phone: varchar("phone", { length: 50 }),
  },
  (table) => {
    return {
      idx_profiles_user_id: uniqueIndex("idx_profiles_user_id").on(
        table.user_id
      ),
    };
  }
);

export const likes = pgTable(
  "likes",
  {
    id: serial("id").primaryKey().notNull(),
    created_at: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
    post_id: uuid("post_id").references(() => posts.id, {
      onDelete: "cascade",
    }),
    created_by: uuid("created_by").references(() => users.id),
  },
  (table) => {
    return {
      idx_like_post_id_created_by: uniqueIndex(
        "idx_like_post_id_created_by"
      ).on(table.post_id, table.created_by),
    };
  }
);

export const post_comments = pgTable("post_comments", {
  id: uuid("id")
    .default(sql`uuid_generate_v4()`)
    .primaryKey()
    .notNull(),
  created_at: timestamp("created_at", {
    withTimezone: true,
    mode: "string",
  }).defaultNow(),
  updated_at: timestamp("updated_at", {
    withTimezone: true,
    mode: "string",
  }).defaultNow(),
  deleted_at: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  text: text("text"),
  post_id: uuid("post_id").references(() => posts.id, {
    onDelete: "cascade",
  }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  parrent_comment_id: bigint("parrent_comment_id", { mode: "number" }),
  created_by: uuid("created_by").references(() => users.id),
});

export const posts = pgTable("posts", {
  id: uuid("id")
    .default(sql`uuid_generate_v7()`)
    .primaryKey()
    .notNull(),
  title: varchar("title", { length: 255 }),
  slug: varchar("slug", { length: 255 }).unique(),
  body: text("body"),
  created_at: timestamp("created_at", {
    withTimezone: true,
    mode: "string",
  }).defaultNow(),
  updated_at: timestamp("updated_at", {
    withTimezone: true,
    mode: "string",
  }).defaultNow(),
  deleted_at: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  created_by: uuid("created_by").references(() => users.id, {
    onDelete: "set null",
    onUpdate: "cascade",
  }),
  published: boolean("published").default(true),
  photo_url: text("photo_url"),
});

export const tags = pgTable(
  "tags",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 30 }),
    created_at: timestamp("created_at", {
      withTimezone: true,
      mode: "string",
    }).defaultNow(),
  },
  (t) => {
    return {
      idx_tags_name: uniqueIndex("idx_tags_name").on(t.name),
    };
  }
);

export const postsToTags = pgTable(
  "posts_to_tags",
  {
    post_id: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tag_id: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.post_id, t.tag_id] }),
  })
);

export const files = pgTable("files", {
  id: uuid("id")
    .default(sql`uuid_generate_v4()`)
    .primaryKey()
    .notNull(),
  created_at: timestamp("created_at", { withTimezone: true, mode: "string" }),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" }),
  deleted_at: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  name: varchar("name", { length: 255 }),
  path: text("path"),
  size: integer("size"),
  type: varchar("type", { length: 255 }),
  created_by: uuid("created_by").references(() => users.id),
});

export const post_commentsRelations = relations(post_comments, ({ one }) => ({
  user: one(users, {
    fields: [post_comments.created_by],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [post_comments.post_id],
    references: [posts.id],
  }),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  post_comments: many(post_comments),
  posts_created_by: many(posts, {
    relationName: "posts_created_by_users_id",
  }),
  files: many(files),
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.user_id],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  post_comments: many(post_comments),
  creator: one(users, {
    fields: [posts.created_by],
    references: [users.id],
    relationName: "posts_created_by_users_id",
  }),
  tags: many(postsToTags),
}));

export const postToTagsRelations = relations(postsToTags, ({ one }) => ({
  post: one(posts, {
    fields: [postsToTags.post_id],
    references: [posts.id],
  }),
  tag: one(tags, {
    fields: [postsToTags.tag_id],
    references: [tags.id],
  }),
}));

export const groupsRelations = relations(tags, ({ many }) => ({
  usersToGroups: many(postsToTags),
}));
