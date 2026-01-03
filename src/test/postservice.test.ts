import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { PostService } from '../modules/posts/postService';
import { TagService } from '../pkg/services/tagService';

// Mock TagService
const mockTagService = {
    addTag: mock(),
    getTagsByNameArray: mock(),
    addTagToPost: mock(),
    getTag: mock(),
    getTags: mock(),
    getTagById: mock()
} as unknown as TagService;

// Mock DB
const mockFindMany = mock();
const mockFindFirst = mock();
const mockUsersFindFirst = mock();
const mockReturning = mock();
const mockValues = mock(() => ({ returning: mockReturning }));
const mockInsert = mock(() => ({ values: mockValues }));
const mockSet = mock(() => ({ where: mock(() => ({ returning: mockReturning })) }));
const mockUpdate = mock(() => ({ set: mockSet }));
const mockLeftJoin = mock(() => ({ 
    leftJoin: mock(() => ({
        where: mock(() => ({
            orderBy: mock(() => ({
                limit: mock(() => ({
                    offset: mock(() => [])
                }))
            })),
             limit: mock(() => [])
        })),
        limit: mock(() => [])
    })),
    where: mock(() => ({
        orderBy: mock(() => ({
           limit: mock(() => [])
        }))
    }))
}));

// Mock for count queries - needs to be async/promise-like
const mockCountWhere = mock(() => Promise.resolve([{ count: 1 }]));
const mockFrom = mock();
const mockSelect = mock();

// Setup function to re-establish mock implementations
const setupSelectMock = () => {
    const mockFromInstance = { 
        where: mockCountWhere, 
        leftJoin: mockLeftJoin,
        rightJoin: mock(() => ({ where: mock(() => ({ orderBy: mock(() => []) })) }))
    };
    mockFrom.mockImplementation(() => mockFromInstance);
    mockSelect.mockImplementation(() => ({ from: mockFrom }));
};

// Initial setup
setupSelectMock();


const mockOnConflictDoNothing = mock(() => ({ returning: mockReturning }));
const mockValuesWithConflict = mock(() => ({ onConflictDoNothing: mockOnConflictDoNothing, returning: mockReturning }));
const mockInsertWithConflict = mock(() => ({ values: mockValuesWithConflict }));

const mockTxTagsFindMany = mock(() => []);
const mockTransaction = mock(async (callback: any) => {
  return await callback({
    insert: mockInsertWithConflict,
    delete: mock(() => ({ where: mock(() => ({ returning: mockReturning })) })),
    update: mockUpdate,
    query: {
      tags: {
        findMany: mockTxTagsFindMany,
      },
      posts: {
        findFirst: mockFindFirst,
      },
    },
    select: mockSelect,
  });
});

mock.module('../database/drizzle', () => {
    return {
        db: {
            query: {
                posts: {
                    findMany: mockFindMany,
                    findFirst: mockFindFirst,
                },
                users: {
                    findFirst: mockUsersFindFirst,
                }
            },
            insert: mockInsert,
            update: mockUpdate,
            select: mockSelect,
            transaction: mockTransaction
        }
    }
});

describe('PostService', () => {
    let postService: PostService;

    beforeEach(() => {
        postService = new PostService(mockTagService);
        mockFindMany.mockReset();
        mockFindFirst.mockReset();
        mockUsersFindFirst.mockReset();
        mockReturning.mockReset();
        mockCountWhere.mockClear();
        mockInsert.mockClear();
        mockValues.mockClear();
        mockTransaction.mockClear();
        (mockTagService.addTag as any).mockReset();
        (mockTagService.getTagsByNameArray as any).mockReset();
        (mockTagService.addTagToPost as any).mockReset();
        (mockTagService.getTag as any).mockReset();
        // Re-establish select mock chain
        setupSelectMock();
    });

    describe('addPost', () => {
        it('creates a post and associates tags', async () => {
            const body = {
                body: 'content',
                title: 'Title',
                slug: 'title-slug',
                photo_url: 'http://image.com',
                published: true,
                tags: ['tag1', 'tag2']
            };
            const auth_id = 'user1';
            
            mockReturning.mockResolvedValue([{ id: 'post1' }]);
            mockTxTagsFindMany.mockReturnValue([{ id: 1, name: 'tag1' }, { id: 2, name: 'tag2' }]);
            
            const result = await postService.addPost(auth_id, body);
            
            expect(result).toEqual({ id: 'post1' });
            expect(mockTransaction).toHaveBeenCalled();
        });

        it('creates a post without tags', async () => {
            const body = {
                body: 'content',
                title: 'Title',
                slug: 'title-slug',
                photo_url: 'http://image.com',
                published: true,
                tags: []
            };
            const auth_id = 'user1';
            
            mockReturning.mockResolvedValue([{ id: 'post1' }]);
            
            const result = await postService.addPost(auth_id, body);
            
            expect(result).toEqual({ id: 'post1' });
        });

        it('creates a post as draft (unpublished)', async () => {
            const body = {
                body: 'draft content',
                title: 'Draft Title',
                slug: 'draft-slug',
                photo_url: null,
                published: false,
                tags: []
            };
            const auth_id = 'user1';
            
            mockReturning.mockResolvedValue([{ id: 'post-draft', published: false }]);
            
            const result = await postService.addPost(auth_id, body);
            
            expect(result).toHaveProperty('id');
        });
    });

    describe('getPosts', () => {
        it('returns paginated posts', async () => {
            const mockPosts = [{ 
                id: '1', 
                title: 'Test', 
                body_snippet: 'Body snippet', 
                posts_to_tags: [],
                user: { id: 'u1' } 
            }];
            mockFindMany.mockResolvedValue(mockPosts);
            
            const result = await postService.getPosts({ limit: 10, offset: 0 });
            
            expect(result.data).toBeDefined();
            expect(result.meta).toBeDefined();
            expect(result.meta.total_items).toBe(1);
        });

        it('filters posts by search term', async () => {
            const mockPosts = [{ 
                id: '1', 
                title: 'Matching Title', 
                body_snippet: 'Body', 
                posts_to_tags: [],
                user: { id: 'u1' } 
            }];
            mockFindMany.mockResolvedValue(mockPosts);
            
            const result = await postService.getPosts({ limit: 10, offset: 0, search: 'Matching' });
            
            expect(result.data).toBeDefined();
            expect(mockFindMany).toHaveBeenCalled();
        });

        it('sorts posts by title ascending', async () => {
            mockFindMany.mockResolvedValue([]);
            
            await postService.getPosts({ limit: 10, offset: 0, orderBy: 'title', orderDirection: 'asc' });
            
            expect(mockFindMany).toHaveBeenCalled();
        });

        it('sorts posts by view_count descending', async () => {
            mockFindMany.mockResolvedValue([]);
            
            await postService.getPosts({ limit: 10, offset: 0, orderBy: 'view_count', orderDirection: 'desc' });
            
            expect(mockFindMany).toHaveBeenCalled();
        });

        it('sorts posts by like_count', async () => {
            mockFindMany.mockResolvedValue([]);
            
            await postService.getPosts({ limit: 10, offset: 0, orderBy: 'like_count', orderDirection: 'desc' });
            
            expect(mockFindMany).toHaveBeenCalled();
        });

        it('sorts posts by updated_at', async () => {
            mockFindMany.mockResolvedValue([]);
            
            await postService.getPosts({ limit: 10, offset: 0, orderBy: 'updated_at', orderDirection: 'desc' });
            
            expect(mockFindMany).toHaveBeenCalled();
        });
    });

    describe('getPost', () => {
        it('returns a single post by id', async () => {
            const mockPost = { 
                id: 'post1', 
                title: 'Test', 
                body: 'Content',
                posts_to_tags: [{ tag: { id: 1, name: 'tag1' } }],
                user: { id: 'u1' } 
            };
            mockFindFirst.mockResolvedValue(mockPost);
            
            const result = await postService.getPost('post1');
            
            expect(result).toHaveProperty('id', 'post1');
            expect(mockFindFirst).toHaveBeenCalled();
        });

        it('returns null if post not found', async () => {
            mockFindFirst.mockResolvedValue(null);
            
            const result = await postService.getPost('non-existent');
            
            expect(result).toBeNull();
        });
    });

    describe('getPostBySlug', () => {
        it('returns a post by slug', async () => {
            const mockPost = { 
                id: 'post1', 
                slug: 'test-post',
                title: 'Test', 
                posts_to_tags: [],
                user: { id: 'u1' } 
            };
            mockFindFirst.mockResolvedValue(mockPost);
            
            const result = await postService.getPostBySlug('test-post');
            
            expect(result).toHaveProperty('slug', 'test-post');
        });

        it('returns null if post with slug not found', async () => {
            mockFindFirst.mockResolvedValue(null);
            
            const result = await postService.getPostBySlug('non-existent-slug');
            
            expect(result).toBeNull();
        });
    });

    describe('deletePost', () => {
        it('soft deletes a post', async () => {
            mockReturning.mockResolvedValue([{ id: 'post1' }]);
            
            const result = await postService.deletePost('post1', 'user1');
            
            expect(result).toEqual([{ id: 'post1' }]);
            expect(mockUpdate).toHaveBeenCalled();
        });

        it('throws NotFound if post does not exist or user unauthorized', async () => {
            mockReturning.mockResolvedValue([]);
            
            expect(postService.deletePost('non-existent', 'user1')).rejects.toThrow();
        });
    });

    describe('updatePost', () => {
        it('updates an existing post', async () => {
            const body = { title: 'Updated Title' };
            mockFindFirst.mockResolvedValue({ id: 'post1', created_by: 'user1' });
            mockReturning.mockResolvedValue([{ id: 'post1', title: 'Updated Title' }]);

            const result = await postService.updatePost('post1', 'user1', body);

            expect(result).toEqual({ id: 'post1', title: 'Updated Title' });
            expect(mockTransaction).toHaveBeenCalled();
        });

        it('throws NotFound if post does not exist', async () => {
            mockFindFirst.mockResolvedValue(null);

            expect(postService.updatePost('non-existent', 'user1', { title: 'Test' })).rejects.toThrow();
        });

        it('throws NotFound if user is not the owner', async () => {
            mockFindFirst.mockResolvedValue(null); // WHERE clause filters by created_by

            expect(postService.updatePost('post1', 'different-user', { title: 'Test' })).rejects.toThrow();
        });

        it('updates post with new tags', async () => {
            const body = { title: 'Updated', tags: ['newtag1', 'newtag2'] };
            mockFindFirst.mockResolvedValue({ id: 'post1', created_by: 'user1' });
            mockReturning.mockResolvedValue([{ id: 'post1', title: 'Updated' }]);
            mockTxTagsFindMany.mockReturnValue([{ id: 10, name: 'newtag1' }, { id: 11, name: 'newtag2' }]);

            const result = await postService.updatePost('post1', 'user1', body);

            expect(result).toHaveProperty('id', 'post1');
            expect(mockTransaction).toHaveBeenCalled();
        });
    });

    describe('incrementView', () => {
        it('increments view count', async () => {
            mockReturning.mockResolvedValue([{ id: 'post1', view_count: 1 }]);

            const result = await postService.incrementView('post1');

            expect(result[0].view_count).toBe(1);
            expect(mockUpdate).toHaveBeenCalled();
        });
    });

    describe('getTrendingPosts', () => {
        it('returns posts ordered by views', async () => {
            const mockPosts = [
                { id: '1', view_count: 100, posts_to_tags: [] },
                { id: '2', view_count: 50, posts_to_tags: [] }
            ];
            mockFindMany.mockResolvedValue(mockPosts);

            const result = await postService.getTrendingPosts(2);

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('1');
            expect(mockFindMany).toHaveBeenCalled();
        });

        it('uses default limit of 5', async () => {
            mockFindMany.mockResolvedValue([]);

            await postService.getTrendingPosts();

            expect(mockFindMany).toHaveBeenCalled();
        });
    });

    describe('getPostsByTag', () => {
        it('returns posts for a valid tag', async () => {
            (mockTagService.getTag as any).mockResolvedValue({ id: 1, name: 'javascript' });
            
            // Mock rightJoin chain
            const mockRightJoinOrderBy = mock(() => [
                { id: '1', title: 'JS Post 1' },
                { id: '2', title: 'JS Post 2' }
            ]);
            const mockRightJoinWhere = mock(() => ({ orderBy: mockRightJoinOrderBy }));
            mockFrom.mockReturnValue({
                rightJoin: mock(() => ({ where: mockRightJoinWhere }))
            });

            const result = await postService.getPostsByTag('javascript');

            expect(result).toBeInstanceOf(Array);
            expect(mockTagService.getTag).toHaveBeenCalledWith('javascript');
        });

        it('throws NotFound if tag does not exist', async () => {
            (mockTagService.getTag as any).mockResolvedValue(null);

            expect(postService.getPostsByTag('nonexistent')).rejects.toThrow();
        });
    });

    describe('getPostsRandom', () => {
        it('returns random posts with default limit', async () => {
            const mockPosts = [
                { id: '1', title: 'Post 1', body: 'Content', creator: { id: 'u1' } }
            ];
            
            const mockRandomOrderBy = mock(() => ({ limit: mock(() => mockPosts) }));
            const mockRandomWhere = mock(() => ({ orderBy: mockRandomOrderBy }));
            const mockRandomLeftJoin = mock(() => ({ where: mockRandomWhere }));
            mockFrom.mockReturnValue({ leftJoin: mockRandomLeftJoin });

            const result = await postService.getPostsRandom();

            expect(result).toBeInstanceOf(Array);
            expect(mockSelect).toHaveBeenCalled();
        });

        it('returns random posts with custom limit', async () => {
            const mockPosts = [
                { id: '1', title: 'Post 1', body: 'Content', creator: { id: 'u1' } },
                { id: '2', title: 'Post 2', body: 'Content', creator: { id: 'u2' } },
                { id: '3', title: 'Post 3', body: 'Content', creator: { id: 'u3' } }
            ];
            
            const mockRandomOrderBy = mock(() => ({ limit: mock(() => mockPosts) }));
            const mockRandomWhere = mock(() => ({ orderBy: mockRandomOrderBy }));
            const mockRandomLeftJoin = mock(() => ({ where: mockRandomWhere }));
            mockFrom.mockReturnValue({ leftJoin: mockRandomLeftJoin });

            const result = await postService.getPostsRandom(3);

            expect(result).toBeInstanceOf(Array);
        });
    });

    describe('getPostsByuser', () => {
        it('returns posts for a specific user with pagination', async () => {
            const userId = 'user1';
            const mockPosts = [
                { id: '1', title: 'User Post', body_snippet: 'Content', posts_to_tags: [], user: { id: userId } }
            ];
            mockFindMany.mockResolvedValue(mockPosts);
            mockCountWhere.mockResolvedValue([{ count: 1 }]);

            const result = await postService.getPostsByuser(userId, { limit: 10, offset: 0 });

            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('meta');
            expect(mockFindMany).toHaveBeenCalled();
        });
    });

    describe('getAllPostsByUser', () => {
        it('returns all posts by a user', async () => {
            const userId = 'user1';
            const mockPosts = [
                { id: '1', title: 'Post 1', posts_to_tags: [], user: { id: userId } },
                { id: '2', title: 'Post 2', posts_to_tags: [], user: { id: userId } }
            ];
            mockFindMany.mockResolvedValue(mockPosts);
            mockCountWhere.mockResolvedValue([{ count: 2 }]);

            const result = await postService.getAllPostsByUser(userId);

            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('total');
            expect(result.total).toBe(2);
        });
    });

    describe('getAllPosts', () => {
        it('returns all non-deleted posts', async () => {
            const mockPosts = [
                { id: '1', title: 'Post 1', posts_to_tags: [], user: { id: 'u1' } },
                { id: '2', title: 'Post 2', posts_to_tags: [], user: { id: 'u2' } }
            ];
            mockFindMany.mockResolvedValue(mockPosts);
            mockCountWhere.mockResolvedValue([{ count: 2 }]);

            const result = await postService.getAllPosts();

            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('total');
            expect(result.total).toBe(2);
        });

        it('respects limit and offset parameters', async () => {
            mockFindMany.mockResolvedValue([]);
            mockCountWhere.mockResolvedValue([{ count: 0 }]);

            await postService.getAllPosts(50, 10);

            expect(mockFindMany).toHaveBeenCalled();
        });
    });

    describe('getPostByUsernameSlug', () => {
        it('returns post by username and slug', async () => {
            const username = 'testuser';
            const slug = 'test-post';
            
            mockUsersFindFirst.mockResolvedValue({ id: 'user1' });
            mockFindFirst.mockResolvedValue({
                id: 'post1',
                slug: slug,
                title: 'Test Post',
                user: { id: 'user1', username },
                posts_to_tags: [{ tag: { id: 1, name: 'tag1' } }]
            });

            const result = await postService.getPostByUsernameSlug(username, slug);

            expect(result).toHaveProperty('slug', slug);
            expect(result).toHaveProperty('creator');
            expect(result).toHaveProperty('tags');
        });

        it('returns null if user not found', async () => {
            mockUsersFindFirst.mockResolvedValue(null);

            const result = await postService.getPostByUsernameSlug('nonexistent', 'any-slug');

            expect(result).toBeNull();
        });

        it('returns null if post not found', async () => {
            mockUsersFindFirst.mockResolvedValue({ id: 'user1' });
            mockFindFirst.mockResolvedValue(null);

            const result = await postService.getPostByUsernameSlug('testuser', 'nonexistent-slug');

            expect(result).toBeNull();
        });
    });
});
