import { AuthService } from "../modules/auth/authService";
import { PostService } from "../modules/posts/postService";
import { TagService } from "../modules/tags/tagService";
import { UserService } from "../modules/users/userService";
import { WriterService } from "../modules/writers/writerService";
import { ChatService } from "../modules/chat/chatService";
import { HoldingService } from "../modules/holdings/holdingService";
import { LikeService } from "../modules/likes/likeService";
import { BookmarkService } from "../modules/bookmarks/bookmarkService";
import { CommentService } from "../modules/comments/commentService";
import { OpenRouterService } from "../modules/chat/openrouterService";

// Helper for lazy service instantiation with cached bound methods
function createLazyService<T extends object>(factory: () => T): T {
  let instance: T | null = null;
  const boundMethods = new Map<string | symbol, Function>();
  
  return new Proxy({} as T, {
    get: (_, prop) => {
      if (!instance) instance = factory();
      
      // Return cached bound method if exists
      const cached = boundMethods.get(prop);
      if (cached) return cached;
      
      const value = Reflect.get(instance, prop);
      if (typeof value === "function") {
        // Cache the bound method to prevent memory leak
        const bound = value.bind(instance);
        boundMethods.set(prop, bound);
        return bound;
      }
      return value;
    },
  });
}

export const tagService = createLazyService(() => new TagService());
export const userService = createLazyService(() => new UserService());
export const authService = createLazyService(() => new AuthService(userService));
export const postService = createLazyService(() => new PostService());
export const writerService = createLazyService(() => new WriterService());
export const openrouterService = createLazyService(() => new OpenRouterService());
export const chatService = createLazyService(() => new ChatService(openrouterService));
export const holdingService = createLazyService(() => new HoldingService());
export const likeService = createLazyService(() => new LikeService());
export const bookmarkService = createLazyService(() => new BookmarkService());
export const commentService = createLazyService(() => new CommentService());
