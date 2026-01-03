import { Hono } from "hono";
import { userController } from "../modules/users/userController";
import { authController } from "../modules/auth/authController";
import { postController } from "../modules/posts/postController";
import { tagController } from "../modules/tags/tagController";
import { likeController } from "../modules/likes/likeController";
import { writerController } from "../modules/writers/writerController";
import { chatController } from "../modules/chat/chatController";
import { holdingController } from "../modules/holdings/holdingController";
import { bookmarkController } from "../modules/bookmarks/bookmarkController";
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
    .route("/bookmarks", bookmarkController);

  app.route("/v1", v1);
};

export default setupRouter;
