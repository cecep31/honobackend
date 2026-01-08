import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { CommentService } from '../modules/comments/commentService';

// Mock DB chain
const mockReturning = mock();
const mockValues = mock(() => ({ returning: mockReturning }));
const mockInsert = mock(() => ({ values: mockValues }));

const mockWhereUpdate = mock(() => ({ returning: mockReturning }));
const mockSet = mock(() => ({ where: mockWhereUpdate }));
const mockUpdate = mock(() => ({ set: mockSet }));

const mockWhereSelect = mock();
const mockFrom = mock(() => ({ where: mockWhereSelect }));
const mockSelect = mock(() => ({ from: mockFrom }));

const mockFindFirst = mock();
const mockFindMany = mock();

mock.module('../database/drizzle', () => {
  return {
    db: {
      insert: mockInsert,
      update: mockUpdate,
      select: mockSelect,
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
    mockReturning.mockReset();
    mockValues.mockClear();
    mockInsert.mockClear();
    mockUpdate.mockClear();
    mockSet.mockClear();
    mockWhereUpdate.mockClear();
    mockSelect.mockClear();
    mockFrom.mockClear();
    mockWhereSelect.mockReset();
    mockFindFirst.mockReset();
    mockFindMany.mockReset();
  });

  describe('createComment', () => {
    it('should create a comment successfully', async () => {
      const commentData = {
        text: 'Test comment',
        post_id: 'post-1',
      };
      const userId = 'user-1';

      // Mock post exists check
      mockWhereSelect.mockResolvedValueOnce([{ id: 'post-1' }]);

      // Mock insert returning new comment
      mockReturning.mockResolvedValue([
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
      expect(mockInsert).toHaveBeenCalled();
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
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(mockFindMany).toHaveBeenCalled();
    });
  });

  describe('updateComment', () => {
    it('should update comment successfully', async () => {
      const commentId = 'comment-1';
      const userId = 'user-1';
      const updateData = { text: 'Updated comment' };

      // Mock comment exists and belongs to user
      mockWhereSelect.mockResolvedValue([
        { id: commentId, created_by: userId },
      ]);

      // Mock update
      mockReturning.mockResolvedValue([
        { id: commentId, text: 'Updated comment' },
      ]);

      // Mock findFirst
      mockFindFirst.mockResolvedValue({
        id: commentId,
        text: 'Updated comment',
        user: { id: userId, username: 'testuser' },
      });

      const result = await commentService.updateComment(
        commentId,
        updateData,
        userId
      );

      expect(result.text).toBe('Updated comment');
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should throw forbidden error if user does not own comment', async () => {
      const commentId = 'comment-1';
      const userId = 'user-1';
      const updateData = { text: 'Updated comment' };

      // Mock comment exists but belongs to different user
      mockWhereSelect.mockResolvedValue([
        { id: commentId, created_by: 'different-user' },
      ]);

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
      mockWhereSelect.mockResolvedValue([
        { id: commentId, created_by: userId },
      ]);

      // Mock soft delete
      mockReturning.mockResolvedValue([
        { id: commentId, deleted_at: new Date().toISOString() },
      ]);

      const result = await commentService.deleteComment(commentId, userId);

      expect(result.id).toBe(commentId);
      expect(result.deleted_at).toBeDefined();
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should throw forbidden error if user does not own comment', async () => {
      const commentId = 'comment-1';
      const userId = 'user-1';

      // Mock comment exists but belongs to different user
      mockWhereSelect.mockResolvedValue([
        { id: commentId, created_by: 'different-user' },
      ]);

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
