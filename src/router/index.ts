import { Hono } from "hono";
import { userController } from "../modules/users/controllers/userController";
import { authController } from "../modules/auth/controllers/authController";
import { postController } from "../modules/posts/controllers/postController";
import { tagController } from "../modules/tags/controllers/tagController";
import { likeController } from "../modules/likes/controllers/likeController";
import { writerController } from "../modules/writers/controllers/writerController";
import { chatController } from "../modules/chat/controllers/chatController";
import { holdingController } from "../modules/holdings/controllers/holdingController";
import { bookmarkController } from "../modules/bookmarks/controllers/bookmarkController";
import { commentController } from "../modules/comments/controllers/commentController";
import type { Variables } from "../types/context";

const setupRouter = (app: Hono<{ Variables: Variables }>) => {
  const v1 = new Hono<{ Variables: Variables }>()
    .route("/auth", authController)
    .route("/users", userController)
    .route("/posts", postController)
    .route("/tags", tagController)
    .route("/likes", likeController)
    .route("/writers", writerController)
    .route("/chat", chatController)
    .route("/holdings", holdingController)
    .route("/bookmarks", bookmarkController)
    .route("/comments", commentController);

  app.route("/v1", v1);
};

export default setupRouter;
