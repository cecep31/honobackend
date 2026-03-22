import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createDrizzleMocks } from './helpers/drizzleMock';
import { tagService } from '../services';

// Create mocks using helper
const mocks = createDrizzleMocks();

const mockFindMany = mock();
const mockFindFirst = mock();
const mockUtfFindFirst = mock();
const mockUtfFindMany = mock();

// Setup onConflictDoNothing implementation
mocks.mockOnConflictDoNothing.mockImplementation(() => ({ returning: mocks.mockReturning }));
mocks.mockValues.mockImplementation(() => ({
  onConflictDoNothing: mocks.mockOnConflictDoNothing,
  returning: mocks.mockReturning,
}));

mock.module('../database/drizzle', () => {
  return {
    db: {
      query: {
        tags: {
          findMany: mockFindMany,
          findFirst: mockFindFirst,
        },
        user_tag_follows: {
          findFirst: mockUtfFindFirst,
          findMany: mockUtfFindMany,
        },
      },
      insert: mocks.mockInsert,
      update: mocks.mockUpdate,
    },
  };
});

describe('TagService', () => {
  beforeEach(() => {
    mockFindMany.mockReset();
    mockFindFirst.mockReset();
    mockUtfFindFirst.mockReset();
    mockUtfFindMany.mockReset();
    mocks.reset();
    // Re-establish mock implementations
    mocks.mockOnConflictDoNothing.mockImplementation(() => ({ returning: mocks.mockReturning }));
    mocks.mockValues.mockImplementation(() => ({
      onConflictDoNothing: mocks.mockOnConflictDoNothing,
      returning: mocks.mockReturning,
    }));
  });

  describe('getTags', () => {
    it('returns all tags', async () => {
      const mockTags = [
        { id: 1, name: 'tag1' },
        { id: 2, name: 'tag2' },
      ];
      mockFindMany.mockResolvedValue(mockTags);

      const result = await tagService.getTags();

      expect(result).toEqual(mockTags);
      expect(result).toHaveLength(2);
      expect(mockFindMany).toHaveBeenCalled();
    });

    it('returns empty array when no tags exist', async () => {
      mockFindMany.mockResolvedValue([]);

      const result = await tagService.getTags();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('getTag', () => {
    it('returns a specific tag by name', async () => {
      const mockTag = { id: 1, name: 'javascript' };
      mockFindFirst.mockResolvedValue(mockTag);

      const result = await tagService.getTag('javascript');

      expect(result).toEqual(mockTag);
      expect(mockFindFirst).toHaveBeenCalled();
    });

    it('returns null if tag not found', async () => {
      mockFindFirst.mockResolvedValue(null);

      const result = await tagService.getTag('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getTagById', () => {
    it('returns a tag by id', async () => {
      const mockTag = { id: 1, name: 'typescript' };
      mockFindFirst.mockResolvedValue(mockTag);

      const result = await tagService.getTagById(1);

      expect(result).toEqual(mockTag);
      expect(mockFindFirst).toHaveBeenCalled();
    });

    it('returns null if tag id not found', async () => {
      mockFindFirst.mockResolvedValue(null);

      const result = await tagService.getTagById(999);

      expect(result).toBeNull();
    });
  });

  describe('addTag', () => {
    it('inserts a new tag', async () => {
      mocks.mockOnConflictDoNothing.mockResolvedValue({ rowCount: 1 });

      await tagService.addTag('new-tag');

      expect(mocks.mockInsert).toHaveBeenCalled();
      expect(mocks.mockValues).toHaveBeenCalledWith({ name: 'new-tag' });
      expect(mocks.mockOnConflictDoNothing).toHaveBeenCalled();
    });

    it('handles duplicate tag gracefully (onConflictDoNothing)', async () => {
      mocks.mockOnConflictDoNothing.mockResolvedValue({ rowCount: 0 });

      await tagService.addTag('existing-tag');

      expect(mocks.mockInsert).toHaveBeenCalled();
      expect(mocks.mockOnConflictDoNothing).toHaveBeenCalled();
    });
  });

  describe('addTagsBatch', () => {
    it('inserts multiple tags at once', async () => {
      const tags = ['react', 'vue', 'angular'];
      mocks.mockReturning.mockResolvedValue([
        { id: 1, name: 'react' },
        { id: 2, name: 'vue' },
        { id: 3, name: 'angular' },
      ]);

      const result = await tagService.addTagsBatch(tags);

      expect(mocks.mockInsert).toHaveBeenCalled();
      expect(mocks.mockValues).toHaveBeenCalledWith([
        { name: 'react' },
        { name: 'vue' },
        { name: 'angular' },
      ]);
    });

    it('returns empty array for empty input', async () => {
      const result = await tagService.addTagsBatch([]);

      expect(result).toEqual([]);
      expect(mocks.mockInsert).not.toHaveBeenCalled();
    });

    it('handles single tag', async () => {
      mocks.mockReturning.mockResolvedValue([{ id: 1, name: 'single' }]);

      await tagService.addTagsBatch(['single']);

      expect(mocks.mockInsert).toHaveBeenCalled();
      expect(mocks.mockValues).toHaveBeenCalledWith([{ name: 'single' }]);
    });
  });

  describe('getTagsByNameArray', () => {
    it('returns tags for given names', async () => {
      const mockTags = [
        { id: 1, name: 'javascript' },
        { id: 2, name: 'typescript' },
      ];
      mockFindMany.mockResolvedValue(mockTags);

      const result = await tagService.getTagsByNameArray(['javascript', 'typescript']);

      expect(result).toEqual(mockTags);
      expect(result).toHaveLength(2);
      expect(mockFindMany).toHaveBeenCalled();
    });

    it('returns empty array for empty input', async () => {
      const result = await tagService.getTagsByNameArray([]);

      expect(result).toEqual([]);
      expect(mockFindMany).not.toHaveBeenCalled();
    });

    it('returns only found tags (partial match)', async () => {
      const mockTags = [{ id: 1, name: 'existing' }];
      mockFindMany.mockResolvedValue(mockTags);

      const result = await tagService.getTagsByNameArray(['existing', 'nonexistent']);

      expect(result).toEqual(mockTags);
      expect(result).toHaveLength(1);
    });

    it('handles single tag lookup', async () => {
      const mockTags = [{ id: 1, name: 'solo' }];
      mockFindMany.mockResolvedValue(mockTags);

      const result = await tagService.getTagsByNameArray(['solo']);

      expect(result).toEqual(mockTags);
    });
  });

  describe('addTagToPost', () => {
    it('inserts tag-post relation', async () => {
      mocks.mockOnConflictDoNothing.mockResolvedValue({ rowCount: 1 });

      await tagService.addTagToPost('post-id', 123);

      expect(mocks.mockInsert).toHaveBeenCalled();
      expect(mocks.mockValues).toHaveBeenCalledWith({ tag_id: 123, post_id: 'post-id' });
      expect(mocks.mockOnConflictDoNothing).toHaveBeenCalled();
    });

    it('handles duplicate relation gracefully', async () => {
      mocks.mockOnConflictDoNothing.mockResolvedValue({ rowCount: 0 });

      await tagService.addTagToPost('post-id', 123);

      expect(mocks.mockOnConflictDoNothing).toHaveBeenCalled();
    });
  });

  describe('addTagsToPostBatch', () => {
    it('inserts multiple tag-post relations at once', async () => {
      const postId = 'post-1';
      const tagIds = [1, 2, 3];

      await tagService.addTagsToPostBatch(postId, tagIds);

      expect(mocks.mockInsert).toHaveBeenCalled();
      expect(mocks.mockValues).toHaveBeenCalledWith([
        { post_id: postId, tag_id: 1 },
        { post_id: postId, tag_id: 2 },
        { post_id: postId, tag_id: 3 },
      ]);
      expect(mocks.mockOnConflictDoNothing).toHaveBeenCalled();
    });

    it('returns empty array for empty tag_ids', async () => {
      const result = await tagService.addTagsToPostBatch('post-1', []);

      expect(result).toEqual([]);
      expect(mocks.mockInsert).not.toHaveBeenCalled();
    });

    it('handles single tag relation', async () => {
      await tagService.addTagsToPostBatch('post-1', [42]);

      expect(mocks.mockInsert).toHaveBeenCalled();
      expect(mocks.mockValues).toHaveBeenCalledWith([{ post_id: 'post-1', tag_id: 42 }]);
    });
  });

  describe('followTag', () => {
    it('creates follow when tag exists and not already following', async () => {
      mockFindFirst.mockResolvedValue({ id: 5, name: 'go' });
      mockUtfFindFirst.mockResolvedValue(null);
      mocks.mockReturning.mockResolvedValue([
        { id: 'follow-1', user_id: 'u1', tag_id: 5, created_at: '2025-01-01T00:00:00.000Z' },
      ]);

      const row = await tagService.followTag('u1', 5);

      expect(row).toMatchObject({ user_id: 'u1', tag_id: 5 });
      expect(mocks.mockInsert).toHaveBeenCalled();
    });

    it('throws when tag does not exist', async () => {
      mockFindFirst.mockResolvedValue(null);

      await expect(tagService.followTag('u1', 999)).rejects.toThrow();
    });

    it('throws when already following', async () => {
      mockFindFirst.mockResolvedValue({ id: 5, name: 'go' });
      mockUtfFindFirst.mockResolvedValue({ id: 'existing' });

      await expect(tagService.followTag('u1', 5)).rejects.toThrow();
    });
  });

  describe('unfollowTag', () => {
    it('soft-deletes active follow row', async () => {
      mockUtfFindFirst.mockResolvedValue({ id: 'row-1', user_id: 'u1', tag_id: 3 });
      mocks.mockReturning.mockResolvedValue([
        { id: 'row-1', user_id: 'u1', tag_id: 3, deleted_at: '2025-01-02T00:00:00.000Z' },
      ]);

      const row = await tagService.unfollowTag('u1', 3);

      expect(row).toMatchObject({ tag_id: 3 });
      expect(mocks.mockUpdate).toHaveBeenCalled();
    });

    it('throws when not following', async () => {
      mockUtfFindFirst.mockResolvedValue(null);

      await expect(tagService.unfollowTag('u1', 3)).rejects.toThrow();
    });
  });

  describe('getFollowedTags', () => {
    it('returns tag rows from active follows', async () => {
      mockUtfFindMany.mockResolvedValue([
        { tag: { id: 1, name: 'a', created_at: '2025-01-01T00:00:00.000Z' } },
        { tag: { id: 2, name: 'b', created_at: '2025-01-01T00:00:00.000Z' } },
      ]);

      const tags = await tagService.getFollowedTags('u1');

      expect(tags).toHaveLength(2);
      expect(tags[0]).toMatchObject({ name: 'a' });
    });
  });

  describe('isFollowingTag', () => {
    it('returns true when follow exists', async () => {
      mockUtfFindFirst.mockResolvedValue({ id: 'f1' });
      await expect(tagService.isFollowingTag('u1', 1)).resolves.toBe(true);
    });

    it('returns false when not following', async () => {
      mockUtfFindFirst.mockResolvedValue(null);
      await expect(tagService.isFollowingTag('u1', 1)).resolves.toBe(false);
    });
  });
});
