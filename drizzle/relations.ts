import { relations } from "drizzle-orm/relations";
import { users, likes, posts, postComments, chatConversations, chatMessages, sessions, profiles, files, passwordResetTokens, postViews, userFollows, postLikes, postBookmarks, holdings, holdingTypes, tags, postsToTags } from "./schema";

export const likesRelations = relations(likes, ({one}) => ({
	user: one(users, {
		fields: [likes.userId],
		references: [users.id]
	}),
	post: one(posts, {
		fields: [likes.postId],
		references: [posts.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	likes: many(likes),
	postComments: many(postComments),
	chatConversations: many(chatConversations),
	chatMessages: many(chatMessages),
	posts: many(posts),
	sessions: many(sessions),
	profiles: many(profiles),
	files: many(files),
	passwordResetTokens: many(passwordResetTokens),
	postViews: many(postViews),
	userFollows_followerId: many(userFollows, {
		relationName: "userFollows_followerId_users_id"
	}),
	userFollows_followingId: many(userFollows, {
		relationName: "userFollows_followingId_users_id"
	}),
	postLikes: many(postLikes),
	postBookmarks: many(postBookmarks),
	holdings: many(holdings),
}));

export const postsRelations = relations(posts, ({one, many}) => ({
	likes: many(likes),
	postComments: many(postComments),
	user: one(users, {
		fields: [posts.createdBy],
		references: [users.id]
	}),
	postViews: many(postViews),
	postLikes: many(postLikes),
	postBookmarks: many(postBookmarks),
	postsToTags: many(postsToTags),
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

export const chatConversationsRelations = relations(chatConversations, ({one, many}) => ({
	user: one(users, {
		fields: [chatConversations.userId],
		references: [users.id]
	}),
	chatMessages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({one}) => ({
	chatConversation: one(chatConversations, {
		fields: [chatMessages.conversationId],
		references: [chatConversations.id]
	}),
	user: one(users, {
		fields: [chatMessages.userId],
		references: [users.id]
	}),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const profilesRelations = relations(profiles, ({one}) => ({
	user: one(users, {
		fields: [profiles.userId],
		references: [users.id]
	}),
}));

export const filesRelations = relations(files, ({one}) => ({
	user: one(users, {
		fields: [files.createdBy],
		references: [users.id]
	}),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({one}) => ({
	user: one(users, {
		fields: [passwordResetTokens.userId],
		references: [users.id]
	}),
}));

export const postViewsRelations = relations(postViews, ({one}) => ({
	user: one(users, {
		fields: [postViews.userId],
		references: [users.id]
	}),
	post: one(posts, {
		fields: [postViews.postId],
		references: [posts.id]
	}),
}));

export const userFollowsRelations = relations(userFollows, ({one}) => ({
	user_followerId: one(users, {
		fields: [userFollows.followerId],
		references: [users.id],
		relationName: "userFollows_followerId_users_id"
	}),
	user_followingId: one(users, {
		fields: [userFollows.followingId],
		references: [users.id],
		relationName: "userFollows_followingId_users_id"
	}),
}));

export const postLikesRelations = relations(postLikes, ({one}) => ({
	post: one(posts, {
		fields: [postLikes.postId],
		references: [posts.id]
	}),
	user: one(users, {
		fields: [postLikes.userId],
		references: [users.id]
	}),
}));

export const postBookmarksRelations = relations(postBookmarks, ({one}) => ({
	post: one(posts, {
		fields: [postBookmarks.postId],
		references: [posts.id]
	}),
	user: one(users, {
		fields: [postBookmarks.userId],
		references: [users.id]
	}),
}));

export const holdingsRelations = relations(holdings, ({one}) => ({
	user: one(users, {
		fields: [holdings.userId],
		references: [users.id]
	}),
	holdingType: one(holdingTypes, {
		fields: [holdings.holdingTypeId],
		references: [holdingTypes.id]
	}),
}));

export const holdingTypesRelations = relations(holdingTypes, ({many}) => ({
	holdings: many(holdings),
}));

export const postsToTagsRelations = relations(postsToTags, ({one}) => ({
	tag: one(tags, {
		fields: [postsToTags.tagId],
		references: [tags.id]
	}),
	post: one(posts, {
		fields: [postsToTags.postId],
		references: [posts.id]
	}),
}));

export const tagsRelations = relations(tags, ({many}) => ({
	postsToTags: many(postsToTags),
}));