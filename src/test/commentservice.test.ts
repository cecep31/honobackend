import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { CommentService } from '../modules/comments/services/commentService';
import { createDrizzleMocks } from './helpers/drizzleMock';

// Create mocks using helper
const mocks = createDrizzleMocks();

// Mock select chain for this specific service
const mockWhereSelect = mock();
const mockFrom = mock(() => ({ where: mockWhereSelect }));

const mockFindFirst = mock();
const mockFindMany = mock();
const mockCreateNotification = mock();

mock.module('../database/drizzle', () => {
  return {
    db: {
      insert: mocks.mockInsert,
      update: mocks.mockUpdate,
      select: mocks.mockSelect,
      query: {
        post_comments: {
          findFirst: mockFindFirst,
          findMany: mockFindMany,
        },
      },
    },
  };
});

describe('CommentService', () => {
  let commentService: CommentService;

  beforeEach(() => {
    commentService = new CommentService();
    mocks.reset();
    mockWhereSelect.mockReset();
    mockFrom.mockClear();
    mockFindFirst.mockReset();
    mockFindMany.mockReset();
    mockCreateNotification.mockReset();
    mocks.mockSelect.mockReturnValue({ from: mockFrom });
  });

  describe('createComment', () => {
    it('should create a comment successfully', async () => {
      const commentData = {
        text: 'Test comment',
        post_id: 'post-1',
      };
      const userId = 'user-1';

      // Mock post exists check
      mockWhereSelect
        .mockResolvedValueOnce([{ id: 'post-1' }])
        .mockResolvedValueOnce([{ id: 'post-1', title: 'Test Post', created_by: 'post-owner' }]);

      // Mock insert returning new comment
      mocks.mockReturning.mockResolvedValue([
        {
          id: 'comment-1',
          text: 'Test comment',
          post_id: 'post-1',
          created_by: userId,
        },
      ]);

      // Mock findFirst to return comment with user
      mockFindFirst.mockResolvedValue({
        id: 'comment-1',
        text: 'Test comment',
        user: {
          id: userId,
          username: 'testuser',
          first_name: 'Test',
          last_name: 'User',
        },
      });

      const result = await commentService.createComment(commentData, userId);

      expect(result.id).toBe('comment-1');
      expect(result.text).toBe('Test comment');
      expect(mocks.mockInsert).toHaveBeenCalled();
    });

    it('creates a notification for the post owner', async () => {
      commentService = new CommentService({
        createNotification: mockCreateNotification,
      } as any);

      const commentData = {
        text: 'Test comment',
        post_id: 'post-1',
      };

      mockWhereSelect
        .mockResolvedValueOnce([{ id: 'post-1' }])
        .mockResolvedValueOnce([{ id: 'post-1', title: 'Test Post', created_by: 'post-owner' }])
        .mockResolvedValueOnce([{ id: 'user-1', username: 'tester' }]);

      mocks.mockReturning.mockResolvedValue([
        {
          id: 'comment-1',
          text: 'Test comment',
          post_id: 'post-1',
          created_by: 'user-1',
        },
      ]);

      mockFindFirst.mockResolvedValue({
        id: 'comment-1',
        text: 'Test comment',
        user: {
          id: 'user-1',
          username: 'tester',
        },
      });

      await commentService.createComment(commentData, 'user-1');

      expect(mockCreateNotification).toHaveBeenCalledWith({
        user_id: 'post-owner',
        type: 'post_comment',
        title: 'New comment on your post',
        message: 'tester commented on your post "Test Post".',
        data: {
          actor_user_id: 'user-1',
          actor_username: 'tester',
          post_id: 'post-1',
          comment_id: 'comment-1',
          parent_comment_id: null,
        },
      });
    });

    it('should throw error if post not found', async () => {
      const commentData = {
        text: 'Test comment',
        post_id: 'invalid-post',
      };
      const userId = 'user-1';

      // Mock post not found
      mockWhereSelect.mockResolvedValue([]);

      try {
        await commentService.createComment(commentData, userId);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.statusCode).toBe(404);
        expect(error.message).toContain('Post not found');
      }
    });
  });

  describe('getCommentsByPost', () => {
    it('should return paginated comments for a post', async () => {
      const postId = 'post-1';
      const mockComments = [
        {
          id: 'comment-1',
          text: 'Comment 1',
          user: { id: 'user-1', username: 'user1' },
        },
        {
          id: 'comment-2',
          text: 'Comment 2',
          user: { id: 'user-2', username: 'user2' },
        },
      ];

      mockFindMany.mockResolvedValue(mockComments);
      mockWhereSelect.mockResolvedValue([{ count: 2 }]);

      const result = await commentService.getCommentsByPost(postId, 1, 20);

      expect(result.data).toEqual(mockComments);
      expect(result.meta.total_items).toBe(2);
      expect(result.meta.offset).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(mockFindMany).toHaveBeenCalled();
    });
  });

  describe('updateComment', () => {
    it('should update comment successfully', async () => {
      const commentId = 'comment-1';
      const userId = 'user-1';
      const updateData = { text: 'Updated comment' };

      // Mock comment exists and belongs to user
      mockWhereSelect.mockResolvedValue([{ id: commentId, created_by: userId }]);

      // Mock update
      mocks.mockReturning.mockResolvedValue([{ id: commentId, text: 'Updated comment' }]);

      // Mock findFirst
      mockFindFirst.mockResolvedValue({
        id: commentId,
        text: 'Updated comment',
        user: { id: userId, username: 'testuser' },
      });

      const result = await commentService.updateComment(commentId, updateData, userId);

      expect(result.text).toBe('Updated comment');
      expect(mocks.mockUpdate).toHaveBeenCalled();
    });

    it('should throw forbidden error if user does not own comment', async () => {
      const commentId = 'comment-1';
      const userId = 'user-1';
      const updateData = { text: 'Updated comment' };

      // Mock comment exists but belongs to different user
      mockWhereSelect.mockResolvedValue([{ id: commentId, created_by: 'different-user' }]);

      try {
        await commentService.updateComment(commentId, updateData, userId);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.statusCode).toBe(403);
      }
    });
  });

  describe('deleteComment', () => {
    it('should delete comment successfully', async () => {
      const commentId = 'comment-1';
      const userId = 'user-1';

      // Mock comment exists and belongs to user
      mockWhereSelect.mockResolvedValue([{ id: commentId, created_by: userId }]);

      // Mock soft delete
      mocks.mockReturning.mockResolvedValue([
        { id: commentId, deleted_at: new Date().toISOString() },
      ]);

      const result = await commentService.deleteComment(commentId, userId);

      expect(result.id).toBe(commentId);
      expect(result.deleted_at).toBeDefined();
      expect(mocks.mockUpdate).toHaveBeenCalled();
    });

    it('should throw forbidden error if user does not own comment', async () => {
      const commentId = 'comment-1';
      const userId = 'user-1';

      // Mock comment exists but belongs to different user
      mockWhereSelect.mockResolvedValue([{ id: commentId, created_by: 'different-user' }]);

      try {
        await commentService.deleteComment(commentId, userId);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.statusCode).toBe(403);
      }
    });
  });

  describe('getCommentById', () => {
    it('should return comment by id', async () => {
      const commentId = 'comment-1';
      const mockComment = {
        id: commentId,
        text: 'Test comment',
        user: { id: 'user-1', username: 'testuser' },
      };

      mockFindFirst.mockResolvedValue(mockComment);

      const result = await commentService.getCommentById(commentId);

      expect(result).toEqual(mockComment);
      expect(mockFindFirst).toHaveBeenCalled();
    });

    it('should throw not found error if comment does not exist', async () => {
      const commentId = 'invalid-comment';

      mockFindFirst.mockResolvedValue(null);

      try {
        await commentService.getCommentById(commentId);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.statusCode).toBe(404);
        expect(error.message).toContain('Comment not found');
      }
    });
  });
});
