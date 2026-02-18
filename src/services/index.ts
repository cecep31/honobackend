import { AuthService } from "../modules/auth/services/authService";
import { AuthActivityService } from "../modules/auth/services/authActivityService";
import { PostService } from "../modules/posts/services/postService";
import { TagService } from "../modules/tags/services/tagService";
import { UserService } from "../modules/users/services/userService";
import { WriterService } from "../modules/writers/services/writerService";
import { ChatService } from "../modules/chat/services/chatService";
import { HoldingService } from "../modules/holdings/services/holdingService";
import { LikeService } from "../modules/likes/services/likeService";
import { BookmarkService } from "../modules/bookmarks/services/bookmarkService";
import { CommentService } from "../modules/comments/services/commentService";
import { OpenRouterService } from "../modules/chat/services/openrouterService";

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

export const activityService = createLazyService(() => new AuthActivityService());
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
