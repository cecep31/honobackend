import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { PostService } from '../pkg/services/postService';
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
const mockFrom = mock(() => ({ 
    where: mock(() => [{ count: 1 }]), 
    leftJoin: mockLeftJoin,
    rightJoin: mock(() => ({ where: mock(() => ({ orderBy: mock(() => []) })) }))
}));
const mockSelect = mock(() => ({ from: mockFrom }));


mock.module('../database/drizzle', () => {
    return {
        db: {
            query: {
                posts: {
                    findMany: mockFindMany,
                    findFirst: mockFindFirst,
                }
            },
            insert: mockInsert,
            update: mockUpdate,
            select: mockSelect,
        }
    }
});

describe('PostService', () => {
    let postService: PostService;

    beforeEach(() => {
        postService = new PostService(mockTagService);
        mockFindMany.mockReset();
        mockFindFirst.mockReset();
        mockReturning.mockReset();
        mockInsert.mockClear();
        mockValues.mockClear();
        (mockTagService.addTag as any).mockReset();
        (mockTagService.getTagsByNameArray as any).mockReset();
        (mockTagService.addTagToPost as any).mockReset();
    });

    it('addPost creates a post and associates tags', async () => {
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
        (mockTagService.getTagsByNameArray as any).mockResolvedValue([{ id: 1, name: 'tag1' }, { id: 2, name: 'tag2' }]);
        
        const result = await postService.addPost(auth_id, body);
        
        expect(result).toEqual({ id: 'post1' });
        expect(mockInsert).toHaveBeenCalled();
        expect(mockTagService.addTag).toHaveBeenCalledTimes(2);
        expect(mockTagService.addTagToPost).toHaveBeenCalledTimes(2);
    });

    it('getPosts returns paginated posts', async () => {
        const mockPosts = [{ 
            id: '1', 
            title: 'Test', 
            body: 'Body', 
            postsToTags: [],
            user: { id: 'u1' } 
        }];
        mockFindMany.mockResolvedValue(mockPosts);
        
        // Mock the count query
        // The mock implementation of db.select().from().where() returns [{count: 1}]
        
        const result = await postService.getPosts({ limit: 10, offset: 0 });
        
        expect(result.data).toBeDefined();
        expect(result.meta).toBeDefined();
        expect(result.meta.total_items).toBe(1);
    });

    it('deletePost soft deletes a post', async () => {
        mockReturning.mockResolvedValue([{ id: 'post1' }]);
        
        const result = await postService.deletePost('post1', 'user1');
        
        expect(result).toEqual([{ id: 'post1' }]);
        expect(mockUpdate).toHaveBeenCalled();
    });
});
