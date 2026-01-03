import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { TagService } from '../modules/tags/tagService';

const mockFindMany = mock();
const mockFindFirst = mock();
const mockReturning = mock();

// Create mockOnConflictDoNothing as a function that returns an object with returning method
const mockOnConflictDoNothing = mock();
const mockValues = mock();
const mockInsert = mock();

// Setup the chain implementations
const setupMocks = () => {
    mockOnConflictDoNothing.mockImplementation(() => ({ returning: mockReturning }));
    mockValues.mockImplementation(() => ({ 
        onConflictDoNothing: mockOnConflictDoNothing, 
        returning: mockReturning 
    }));
    mockInsert.mockImplementation(() => ({ values: mockValues }));
};

// Call setup initially
setupMocks();

mock.module('../database/drizzle', () => {
    return {
        db: {
            query: {
                tags: {
                    findMany: mockFindMany,
                    findFirst: mockFindFirst,
                }
            },
            insert: mockInsert
        }
    }
});

describe('TagService', () => {
    let tagService: TagService;

    beforeEach(() => {
        tagService = new TagService();
        mockFindMany.mockReset();
        mockFindFirst.mockReset();
        mockReturning.mockReset();
        mockOnConflictDoNothing.mockClear();
        mockValues.mockClear();
        mockInsert.mockClear();
        // Re-establish mock implementations
        setupMocks();
    });

    describe('getTags', () => {
        it('returns all tags', async () => {
            const mockTags = [{ id: 1, name: 'tag1' }, { id: 2, name: 'tag2' }];
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
            mockOnConflictDoNothing.mockResolvedValue({ rowCount: 1 });
            
            await tagService.addTag('new-tag');
            
            expect(mockInsert).toHaveBeenCalled();
            expect(mockValues).toHaveBeenCalledWith({ name: 'new-tag' });
            expect(mockOnConflictDoNothing).toHaveBeenCalled();
        });

        it('handles duplicate tag gracefully (onConflictDoNothing)', async () => {
            mockOnConflictDoNothing.mockResolvedValue({ rowCount: 0 });
            
            await tagService.addTag('existing-tag');
            
            expect(mockInsert).toHaveBeenCalled();
            expect(mockOnConflictDoNothing).toHaveBeenCalled();
        });
    });

    describe('addTagsBatch', () => {
        it('inserts multiple tags at once', async () => {
            const tags = ['react', 'vue', 'angular'];
            mockReturning.mockResolvedValue([
                { id: 1, name: 'react' },
                { id: 2, name: 'vue' },
                { id: 3, name: 'angular' }
            ]);

            const result = await tagService.addTagsBatch(tags);

            expect(mockInsert).toHaveBeenCalled();
            expect(mockValues).toHaveBeenCalledWith([
                { name: 'react' },
                { name: 'vue' },
                { name: 'angular' }
            ]);
        });

        it('returns empty array for empty input', async () => {
            const result = await tagService.addTagsBatch([]);

            expect(result).toEqual([]);
            expect(mockInsert).not.toHaveBeenCalled();
        });

        it('handles single tag', async () => {
            mockReturning.mockResolvedValue([{ id: 1, name: 'single' }]);

            await tagService.addTagsBatch(['single']);

            expect(mockInsert).toHaveBeenCalled();
            expect(mockValues).toHaveBeenCalledWith([{ name: 'single' }]);
        });
    });

    describe('getTagsByNameArray', () => {
        it('returns tags for given names', async () => {
            const mockTags = [
                { id: 1, name: 'javascript' },
                { id: 2, name: 'typescript' }
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
            mockOnConflictDoNothing.mockResolvedValue({ rowCount: 1 });
            
            await tagService.addTagToPost('post-id', 123);
            
            expect(mockInsert).toHaveBeenCalled();
            expect(mockValues).toHaveBeenCalledWith({ tag_id: 123, post_id: 'post-id' });
            expect(mockOnConflictDoNothing).toHaveBeenCalled();
        });

        it('handles duplicate relation gracefully', async () => {
            mockOnConflictDoNothing.mockResolvedValue({ rowCount: 0 });
            
            await tagService.addTagToPost('post-id', 123);
            
            expect(mockOnConflictDoNothing).toHaveBeenCalled();
        });
    });

    describe('addTagsToPostBatch', () => {
        it('inserts multiple tag-post relations at once', async () => {
            const postId = 'post-1';
            const tagIds = [1, 2, 3];
            
            await tagService.addTagsToPostBatch(postId, tagIds);
            
            expect(mockInsert).toHaveBeenCalled();
            expect(mockValues).toHaveBeenCalledWith([
                { post_id: postId, tag_id: 1 },
                { post_id: postId, tag_id: 2 },
                { post_id: postId, tag_id: 3 }
            ]);
            expect(mockOnConflictDoNothing).toHaveBeenCalled();
        });

        it('returns empty array for empty tag_ids', async () => {
            const result = await tagService.addTagsToPostBatch('post-1', []);

            expect(result).toEqual([]);
            expect(mockInsert).not.toHaveBeenCalled();
        });

        it('handles single tag relation', async () => {
            await tagService.addTagsToPostBatch('post-1', [42]);
            
            expect(mockInsert).toHaveBeenCalled();
            expect(mockValues).toHaveBeenCalledWith([{ post_id: 'post-1', tag_id: 42 }]);
        });
    });
});
