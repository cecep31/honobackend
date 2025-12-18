import { PostRepository } from "./repository/postRepository";
import { SessionRepository } from "./repository/sessionRepository";
import { UserRepository } from "./repository/userRepository";

export const postrepository = new PostRepository();
export const userRepository = new UserRepository();
export const sessionRepository = new SessionRepository();
