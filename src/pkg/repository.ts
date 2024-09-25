import { PostRepository } from "./repository/postRepository";
import { SessionRepository } from "./repository/sessionRepository";
import { tagRepository } from "./repository/tagRepository";
import { UserRepository } from "./repository/userRepository";

export const postrepository = new PostRepository();
export const tagrepository = new tagRepository();
export const userrepository = new UserRepository();
export const sessionRepository = new SessionRepository();