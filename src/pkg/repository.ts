import { PostRepository } from "./repository/postRepository";
import { SessionRepository } from "./repository/sessionRepository";
import { TagRepository } from "./repository/tagRepository";
import { UserRepository } from "./repository/userRepository";

export const postrepository = new PostRepository();
export const tagrepository = new TagRepository();
export const userrepository = new UserRepository();
export const sessionRepository = new SessionRepository();
