import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { PostService } from '../modules/posts/postService';

// Mock DB
const mockFindMany = mock();
const mockFindFirst = mock();
const mockUsersFindFirst = mock();
const mockReturning = mock();
const mockValues = mock(() => ({ returning: mockReturning }));
const mockInsert = mock(() => ({ values: mockValues }));
const mockSet = mock(() => ({ where: mock(() => ({ returning: mockReturning })) }));
const mockUpdate = mock(() => ({ set: mockSet }));

// Mock chainable query builder
const mockChain = {
    where: mock(() => mockChain),
    orderBy: mock(() => mockChain),
    limit: mock(() => mockChain),
    offset: mock(() => mockChain),
    innerJoin: mock(() => mockChain),
    leftJoin: mock(() => mockChain),
    rightJoin: mock(() => mockChain),
    from: mock(() => mockChain),
};

// Mock for count queries - needs to be async/promise-like or return array
const mockCountResult = [{ count: 1 }];
const mockQueryResult = [];

// Make the chain callable/awaitable by returning promises for terminal operations
// or simple arrays if implied.
// However, in Drizzle, await db.select() executes it.
// The mock structure in the original file was a bit different.
// Let's try to adapt to the existing style but cleaner.

const mockFrom = mock();
const mockSelect = mock();

const setupSelectMock = () => {
    // A recursive mock that can handle any chain
    const mockQueryBuilder: any = {};
    
    // Chain methods
    const chainMethods = ['where', 'orderBy', 'limit', 'offset', 'innerJoin', 'leftJoin', 'rightJoin', 'from'];
    chainMethods.forEach(method => {
        mockQueryBuilder[method] = mock(() => mockQueryBuilder);
    });
    
    // For methods that might return data (terminal or intermediate that are awaited)
    // In bun test mocks, we usually check what the method returns.
    // If the service awaits the chain, the last called method must return a Promise.
    
    // We can make the mockQueryBuilder a generic "thenable" to simulate await
    mockQueryBuilder.then = (resolve: any) => resolve(mockQueryResult);

    mockFrom.mockReturnValue(mockQueryBuilder);
    mockSelect.mockReturnValue(mockQueryBuilder);
};

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
        postService = new PostService();
        mockFindMany.mockReset();
        mockFindFirst.mockReset();
        mockUsersFindFirst.mockReset();
        mockReturning.mockReset();
        mockInsert.mockClear();
        mockValues.mockClear();
        mockTransaction.mockClear();
        mockSelect.mockClear();
        mockFrom.mockClear();
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
            // Mock count query
            mockSelect.mockReturnValue({
               from: mock(() => ({
                   where: mock(() => Promise.resolve([{ count: 1 }]))
               }))
            });
            
            const result = await postService.getPosts({ limit: 10, offset: 0 });
            
            expect(result.data).toBeDefined();
            expect(result.meta).toBeDefined();
            expect(result.meta.total_items).toBe(1);
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
            mockFindFirst.mockResolvedValue({ id: 'post1' }); // Adjusted mock return
            mockReturning.mockResolvedValue([{ id: 'post1', title: 'Updated Title' }]);

            const result = await postService.updatePost('post1', 'user1', body);

            expect(result).toEqual({ id: 'post1', title: 'Updated Title' });
            expect(mockTransaction).toHaveBeenCalled();
        });

        it('throws NotFound if post does not exist', async () => {
            mockFindFirst.mockResolvedValue(null);

            expect(postService.updatePost('non-existent', 'user1', { title: 'Test' })).rejects.toThrow();
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
    });

    describe('getPostsByTag', () => {
        it('returns posts for a valid tag', async () => {
            const mockPosts = [
                { id: '1', title: 'JS Post 1' },
                { id: '2', title: 'JS Post 2' }
            ];

            // Mock the chain: select -> from -> innerJoin -> innerJoin -> where -> orderBy -> (promise resolves)
            const mockOrderBy = mock(() => Promise.resolve(mockPosts));
            const mockWhere = mock(() => ({ orderBy: mockOrderBy }));
            const mockInnerJoin2 = mock(() => ({ where: mockWhere }));
            const mockInnerJoin1 = mock(() => ({ innerJoin: mockInnerJoin2 }));
            const mockFrom = mock(() => ({ innerJoin: mockInnerJoin1 }));
            
            mockSelect.mockReturnValue({ from: mockFrom });

            const result = await postService.getPostsByTag('javascript');

            expect(result).toEqual(mockPosts);
            expect(mockSelect).toHaveBeenCalled();
        });
    });

    describe('getPostsByUser', () => { // Renamed
        it('returns posts for a specific user with pagination', async () => {
            const userId = 'user1';
            const mockPosts = [
                { id: '1', title: 'User Post', body_snippet: 'Content', posts_to_tags: [], user: { id: userId } }
            ];
            mockFindMany.mockResolvedValue(mockPosts);
            
            // Mock count query
            mockSelect.mockReturnValue({
               from: mock(() => ({
                   where: mock(() => Promise.resolve([{ count: 1 }]))
               }))
            });

            const result = await postService.getPostsByUser(userId, { limit: 10, offset: 0 });

            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('meta');
            expect(mockFindMany).toHaveBeenCalled();
        });
    });

    describe('getAllPosts', () => {
        it('returns all non-deleted posts', async () => {
            const mockPosts = [
                { id: '1', title: 'Post 1', posts_to_tags: [], user: { id: 'u1' } },
                { id: '2', title: 'Post 2', posts_to_tags: [], user: { id: 'u2' } }
            ];
            mockFindMany.mockResolvedValue(mockPosts);
            
            // Mock count query
             mockSelect.mockReturnValue({
               from: mock(() => ({
                   where: mock(() => Promise.resolve([{ count: 2 }]))
               }))
            });

            const result = await postService.getAllPosts();

            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('total');
            expect(result.total).toBe(2);
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
        });
    });
});