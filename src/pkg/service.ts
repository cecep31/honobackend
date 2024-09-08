import { AuthService } from "./services/authService";
import { PostService } from "./services/postService";
import { TagService } from "./services/tagService";
import { UserService } from "./services/userServices";
import { WritetService } from "./services/writerService";

export const postservice = new PostService();
export const authservice = new AuthService();
export const userservice = new UserService();
export const tagservice = new TagService();
export const writetservice = new WritetService();




