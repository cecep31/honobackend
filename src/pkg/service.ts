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

export const postservice = new PostService(postrepository, tagrepository);
export const authservice = new AuthService(userrepository, sessionRepository);
export const userservice = new UserService(userrepository);
export const tagservice = new TagService(tagrepository);
export const writetservice = new WritetService(userrepository);
