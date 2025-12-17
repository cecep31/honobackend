import { AuthService } from "./services/authService";
import { PostService } from "./services/postService";
import { TagService } from "./services/tagService";
import { UserService } from "./services/userServices";
import { WriterService } from "./services/writerService";
import { ChatService } from "./services/chatService";
import { HoldingService } from "./services/holdingService";
import {
  userRepository,
  sessionRepository,
  postrepository,
  tagrepository,
  chatRepository,
} from "./repository";

export const postService = new PostService(postrepository, tagrepository);
export const authService = new AuthService(userRepository, sessionRepository);
export const userService = new UserService(userRepository);
export const tagService = new TagService(tagrepository);
export const writerService = new WriterService(userRepository);
export const chatService = new ChatService(chatRepository);
export const holdingService = new HoldingService();
