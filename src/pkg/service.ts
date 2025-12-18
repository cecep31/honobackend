import { AuthService } from "./services/authService";
import { PostService } from "./services/postService";
import { TagService } from "./services/tagService";
import { UserService } from "./services/userServices";
import { WriterService } from "./services/writerService";
import { ChatService } from "./services/chatService";
import { HoldingService } from "./services/holdingService";

export const tagService = new TagService();
export const userService = new UserService();
export const authService = new AuthService(userService);
export const postService = new PostService(tagService);
export const writerService = new WriterService();
export const chatService = new ChatService();
export const holdingService = new HoldingService();