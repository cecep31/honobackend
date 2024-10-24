import { AuthService } from "./services/authService";
import { PostService } from "./services/postService";
import { TagService } from "./services/tagService";
import { UserService } from "./services/userServices";
import { WritetService } from "./services/writerService";
import {
  userrepository,
  sessionRepository,
  postrepository,
  tagrepository,
} from "./repository";

export const postService = new PostService(postrepository, tagrepository);
export const authService = new AuthService(userrepository, sessionRepository);
export const userService = new UserService(userrepository);
export const tagService = new TagService(tagrepository);
export const writerService = new WritetService(userrepository);
