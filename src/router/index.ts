import { Hono } from "hono";
import { userController } from "../controllers/userController";
import authController from "../controllers/authController";
import postController from "../controllers/postController";
import { tagController } from "../controllers/tagController";
import likeController from "../controllers/likeCotroller";
import { writerController } from "../controllers/writerController";
import { app } from "../server/app";

const setupRouter = () => {
  const v1 = new Hono()
    .route("/auth", authController)
    .route("/users", userController)
    .route("/posts", postController)
    .route("/tags", tagController)
    .route("/likes", likeController)
    .route("/writers", writerController);

  app.route("/v1", v1);
};

export default setupRouter;
