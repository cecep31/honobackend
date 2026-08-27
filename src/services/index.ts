import { AuthActivityService } from '../modules/auth/services/authActivityService';
import { AuthService } from '../modules/auth/services/authService';
import { BookmarkService } from '../modules/bookmarks/services/bookmarkService';
import { ChatService } from '../modules/chat/services/chatService';
import { OpenRouterService } from '../modules/chat/services/openrouterService';
import { CommentService } from '../modules/comments/services/commentService';
import { CorporateActionService } from '../modules/holdings/services/corporateActionService';
import { ExchangeRateService } from '../modules/exchange-rates/services/exchangeRateService';
import { HoldingService } from '../modules/holdings/services/holdingService';
import { StockPriceService } from '../modules/holdings/services/stockPriceService';
import { LikeService } from '../modules/likes/services/likeService';
import { NotificationService } from '../modules/notifications/services/notificationService';
import { PostService } from '../modules/posts/services/postService';
import { PostViewService } from '../modules/posts/services/postViewService';
import { ReportService } from '../modules/reports/services/reportService';
import { TagService } from '../modules/tags/services/tagService';
import { UserService } from '../modules/users/services/userService';
import { RedisCacheService } from './cacheService';

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
  postViewService: PostViewService;
  cacheService: RedisCacheService;
  openrouterService: OpenRouterService;
  chatService: ChatService;
  stockPriceService: StockPriceService;
  holdingService: HoldingService;
  corporateActionService: CorporateActionService;
  exchangeRateService: ExchangeRateService;
  likeService: LikeService;
  bookmarkService: BookmarkService;
  commentService: CommentService;
  notificationService: NotificationService;
  reportService: ReportService;
}

export function createServices(): AppServices {
  const cacheService = createLazyService(() => new RedisCacheService());
  const notificationService = createLazyService(() => new NotificationService());
  const activityService = createLazyService(() => new AuthActivityService());
  const tagService = createLazyService(() => new TagService(cacheService));
  const userService = createLazyService(() => new UserService(notificationService));
  const authService = createLazyService(() => new AuthService(userService));
  const postService = createLazyService(() => new PostService(cacheService));
  const postViewService = createLazyService(() => new PostViewService());
  const openrouterService = createLazyService(() => new OpenRouterService());
  const chatService = createLazyService(() => new ChatService(openrouterService));
  const stockPriceService = createLazyService(() => new StockPriceService(cacheService));
  const holdingService = createLazyService(() => new HoldingService(stockPriceService));
  const corporateActionService = createLazyService(() => new CorporateActionService());
  const exchangeRateService = createLazyService(
    () => new ExchangeRateService(cacheService, stockPriceService)
  );
  const likeService = createLazyService(() => new LikeService());
  const bookmarkService = createLazyService(() => new BookmarkService());
  const commentService = createLazyService(() => new CommentService(notificationService));
  const reportService = createLazyService(() => new ReportService());

  return {
    cacheService,
    notificationService,
    activityService,
    tagService,
    userService,
    authService,
    postService,
    postViewService,
    openrouterService,
    chatService,
    stockPriceService,
    holdingService,
    corporateActionService,
    exchangeRateService,
    likeService,
    bookmarkService,
    commentService,
    reportService,
  };
}

export const defaultServices = createServices();

export async function shutdownServices() {
  await defaultServices.cacheService.disconnect();
}

export const {
  cacheService,
  notificationService,
  activityService,
  tagService,
  userService,
  authService,
  postService,
  postViewService,
  openrouterService,
  chatService,
  stockPriceService,
  holdingService,
  corporateActionService,
  exchangeRateService,
  likeService,
  bookmarkService,
  commentService,
  reportService,
} = defaultServices;
