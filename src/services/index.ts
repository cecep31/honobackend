import { AuthActivityService } from '../modules/auth/services/authActivityService';
import { AuthService } from '../modules/auth/services/authService';
import { BookmarkService } from '../modules/bookmarks/services/bookmarkService';
import { ChatService } from '../modules/chat/services/chatService';
import { OpenRouterService } from '../modules/chat/services/openrouterService';
import { CommentService } from '../modules/comments/services/commentService';
import { HoldingService } from '../modules/holdings/services/holdingService';
import { LikeService } from '../modules/likes/services/likeService';
import { PostService } from '../modules/posts/services/postService';
import { TagService } from '../modules/tags/services/tagService';
import { UserService } from '../modules/users/services/userService';
import { WriterService } from '../modules/writers/services/writerService';

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
      if (typeof value === 'function') {
        // Cache the bound method to prevent memory leak
        const bound = value.bind(instance);
        boundMethods.set(prop, bound);
        return bound;
      }
      return value;
    },
  });
}

export interface AppServices {
  activityService: AuthActivityService;
  tagService: TagService;
  userService: UserService;
  authService: AuthService;
  postService: PostService;
  writerService: WriterService;
  openrouterService: OpenRouterService;
  chatService: ChatService;
  holdingService: HoldingService;
  likeService: LikeService;
  bookmarkService: BookmarkService;
  commentService: CommentService;
}

export function createServices(): AppServices {
  const activityService = createLazyService(() => new AuthActivityService());
  const tagService = createLazyService(() => new TagService());
  const userService = createLazyService(() => new UserService());
  const authService = createLazyService(() => new AuthService(userService));
  const postService = createLazyService(() => new PostService());
  const writerService = createLazyService(() => new WriterService());
  const openrouterService = createLazyService(() => new OpenRouterService());
  const chatService = createLazyService(() => new ChatService(openrouterService));
  const holdingService = createLazyService(() => new HoldingService());
  const likeService = createLazyService(() => new LikeService());
  const bookmarkService = createLazyService(() => new BookmarkService());
  const commentService = createLazyService(() => new CommentService());

  return {
    activityService,
    tagService,
    userService,
    authService,
    postService,
    writerService,
    openrouterService,
    chatService,
    holdingService,
    likeService,
    bookmarkService,
    commentService,
  };
}

const defaultServices = createServices();

export const {
  activityService,
  tagService,
  userService,
  authService,
  postService,
  writerService,
  openrouterService,
  chatService,
  holdingService,
  likeService,
  bookmarkService,
  commentService,
} = defaultServices;
