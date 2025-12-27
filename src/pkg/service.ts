import { AuthService } from "./services/authService";
import { PostService } from "./services/postService";
import { TagService } from "./services/tagService";
import { UserService } from "./services/userService";
import { WriterService } from "./services/writerService";
import { ChatService } from "./services/chatService";
import { HoldingService } from "./services/holdingService";
import { LikeService } from "./services/likeService";
import { BookmarkService } from "./services/bookmarkService";
import { OpenRouterService } from "./services/openrouterService";

// Centralized service hub with lazy loading
// This ensures services are only instantiated when needed

let _tagService: TagService | null = null;
export const tagService = _tagService ??= new TagService();

let _userService: UserService | null = null;
export const userService = _userService ??= new UserService();

let _authService: AuthService | null = null;
export const authService = _authService ??= new AuthService(userService);

let _postService: PostService | null = null;
export const postService = _postService ??= new PostService(tagService);

let _writerService: WriterService | null = null;
export const writerService = _writerService ??= new WriterService();

let _openrouterService: OpenRouterService | null = null;
export const openrouterService = _openrouterService ??= new OpenRouterService();

let _chatService: ChatService | null = null;
export const chatService = _chatService ??= new ChatService(openrouterService);

let _holdingService: HoldingService | null = null;
export const holdingService = _holdingService ??= new HoldingService();

let _likeService: LikeService | null = null;
export const likeService = _likeService ??= new LikeService();

let _bookmarkService: BookmarkService | null = null;
export const bookmarkService = _bookmarkService ??= new BookmarkService();
