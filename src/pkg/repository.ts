import { PostRepository } from "./repository/postRepository";
import { SessionRepository } from "./repository/sessionRepository";
import { TagRepository } from "./repository/tagRepository";
import { UserRepository } from "./repository/userRepository";
import { ChatRepository } from "./repository/chatRepository";

export const postrepository = new PostRepository();
export const tagrepository = new TagRepository();
export const userrepository = new UserRepository();
export const sessionRepository = new SessionRepository();
export const chatRepository = new ChatRepository();
