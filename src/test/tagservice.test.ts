import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { TagService } from '../pkg/services/tagService';

const mockFindMany = mock();
const mockFindFirst = mock();
const mockOnConflictDoNothing = mock();
const mockValues = mock(() => ({ onConflictDoNothing: mockOnConflictDoNothing }));
const mockInsert = mock(() => ({ values: mockValues }));

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
        mockOnConflictDoNothing.mockReset();
        mockValues.mockClear();
        mockInsert.mockClear();
    });

    it('getTags returns all tags', async () => {
        const mockTags = [{ id: 1, name: 'tag1' }];
        mockFindMany.mockResolvedValue(mockTags);

        const result = await tagService.getTags();
        expect(result).toEqual(mockTags);
        expect(mockFindMany).toHaveBeenCalled();
    });

    it('getTag returns a specific tag by name', async () => {
        const mockTag = { id: 1, name: 'tag1' };
        mockFindFirst.mockResolvedValue(mockTag);

        const result = await tagService.getTag('tag1');
        expect(result).toEqual(mockTag);
        expect(mockFindFirst).toHaveBeenCalled();
    });

    it('addTag inserts a new tag', async () => {
        mockOnConflictDoNothing.mockResolvedValue({ rowCount: 1 });
        
        await tagService.addTag('new-tag');
        
        expect(mockInsert).toHaveBeenCalled();
        expect(mockValues).toHaveBeenCalledWith({ name: 'new-tag' });
        expect(mockOnConflictDoNothing).toHaveBeenCalled();
    });

    it('addTagToPost inserts relation', async () => {
        mockOnConflictDoNothing.mockResolvedValue({ rowCount: 1 });
        
        await tagService.addTagToPost('post-id', 123);
        
        expect(mockInsert).toHaveBeenCalled();
        expect(mockValues).toHaveBeenCalledWith({ tag_id: 123, post_id: 'post-id' });
        expect(mockOnConflictDoNothing).toHaveBeenCalled();
    });
});
