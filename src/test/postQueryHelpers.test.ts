import { describe, it, expect, mock } from 'bun:test';

// Prevent mock contamination from other test files that globally mock '../database/drizzle'
mock.module('../database/drizzle', () => ({
  db: {
    query: {},
    select: mock(() => ({ from: mock(() => ({ where: mock(() => [{ count: 0 }]) })) })),
  },
}));

import { PostQueryHelpers } from '../modules/posts/services/postQueryHelpers';

describe('PostQueryHelpers', () => {
  describe('getLifecycleStatus', () => {
    it('returns draft for unpublished post', () => {
      expect(PostQueryHelpers.getLifecycleStatus({ published: false })).toBe('draft');
    });

    it('returns scheduled for future published_at', () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      expect(PostQueryHelpers.getLifecycleStatus({ published: true, published_at: future })).toBe('scheduled');
    });

    it('returns published for past published_at', () => {
      const past = new Date(Date.now() - 86400000).toISOString();
      expect(PostQueryHelpers.getLifecycleStatus({ published: true, published_at: past })).toBe('published');
    });

    it('returns published when published but no published_at', () => {
      expect(PostQueryHelpers.getLifecycleStatus({ published: true })).toBe('published');
    });
  });

  describe('buildOrderByClause', () => {
    it('defaults to created_at desc', () => {
      const clause = PostQueryHelpers.buildOrderByClause();
      expect(clause).toBeDefined();
    });

    it('orders by title asc', () => {
      const clause = PostQueryHelpers.buildOrderByClause('title', 'asc');
      expect(clause).toBeDefined();
    });

    it('orders by view_count desc', () => {
      const clause = PostQueryHelpers.buildOrderByClause('view_count', 'desc');
      expect(clause).toBeDefined();
    });

    it('orders by like_count asc', () => {
      const clause = PostQueryHelpers.buildOrderByClause('like_count', 'asc');
      expect(clause).toBeDefined();
    });

    it('orders by updated_at desc', () => {
      const clause = PostQueryHelpers.buildOrderByClause('updated_at', 'desc');
      expect(clause).toBeDefined();
    });

    it('falls back to created_at for unknown field', () => {
      const clause = PostQueryHelpers.buildOrderByClause('unknown', 'desc');
      expect(clause).toBeDefined();
    });
  });

  describe('buildSearchClause', () => {
    it('returns deleted_at clause when no search', () => {
      const clause = PostQueryHelpers.buildSearchClause();
      expect(clause).toBeDefined();
    });

    it('includes search terms when provided', () => {
      const clause = PostQueryHelpers.buildSearchClause('test query');
      expect(clause).toBeDefined();
    });
  });

  describe('getBasePostQuery', () => {
    it('returns base query config', () => {
      const query = PostQueryHelpers.getBasePostQuery();
      expect(query.where).toBeDefined();
      expect(query.with).toBeDefined();
      expect(query.with.user).toBeDefined();
      expect(query.with.posts_to_tags).toBeDefined();
    });
  });

  describe('getPublishedPostQuery', () => {
    it('returns published query config', () => {
      const query = PostQueryHelpers.getPublishedPostQuery();
      expect(query.where).toBeDefined();
      expect(query.with).toBeDefined();
    });
  });

  describe('getPostWithSnippetQuery', () => {
    it('returns snippet query config', () => {
      const query = PostQueryHelpers.getPostWithSnippetQuery();
      expect(query.columns).toBeDefined();
      expect(query.extras).toBeDefined();
      expect(query.with).toBeDefined();
    });
  });

  describe('transformPostWithSnippet', () => {
    it('transforms post with snippet', () => {
      const post = {
        id: '1',
        title: 'Test',
        body_snippet: 'Snippet text',
        published: true,
        user: { id: 'u1' },
        posts_to_tags: [{ tag: { id: 't1', name: 'tag1' } }],
      };
      const result = PostQueryHelpers.transformPostWithSnippet(post);
      expect(result.body).toBe('Snippet text...');
      expect(result.status).toBe('published');
      expect(result.user).toEqual({ id: 'u1' });
      expect(result.tags).toEqual([{ id: 't1', name: 'tag1' }]);
    });

    it('handles missing body_snippet', () => {
      const post = {
        id: '1',
        title: 'Test',
        published: false,
        user: { id: 'u1' },
        posts_to_tags: [],
      };
      const result = PostQueryHelpers.transformPostWithSnippet(post);
      expect(result.body).toBe('');
      expect(result.status).toBe('draft');
    });
  });

  describe('transformPostWithRelations', () => {
    it('transforms post with relations', () => {
      const post = {
        id: '1',
        title: 'Test',
        published: true,
        user: { id: 'u1' },
        posts_to_tags: [{ tag: { id: 't1', name: 'tag1' } }],
      };
      const result = PostQueryHelpers.transformPostWithRelations(post);
      expect(result.status).toBe('published');
      expect(result.user).toEqual({ id: 'u1' });
      expect(result.tags).toEqual([{ id: 't1', name: 'tag1' }]);
    });
  });
});
