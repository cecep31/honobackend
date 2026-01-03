import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { WriterService } from '../modules/writers/writerService';

const mockFindFirst = mock();
const mockWhere = mock();

mock.module('../database/drizzle', () => {
    return {
        db: {
            query: {
                users: {
                    findFirst: mockFindFirst,
                }
            }
        }
    }
});

describe('WriterService', () => {
    let writerService: WriterService;

    beforeEach(() => {
        writerService = new WriterService();
        mockFindFirst.mockReset();
    });

    it('getWriterByUsername returns user for valid username', async () => {
        const mockUser = { id: '1', username: 'validUser' };
        mockFindFirst.mockResolvedValue(mockUser);

        const result = await writerService.getWriterByUsername('validUser');

        expect(result).toEqual(mockUser);
        expect(mockFindFirst).toHaveBeenCalled();
    });

    it('getWriterByUsername throws error for invalid username', async () => {
        expect(writerService.getWriterByUsername('invalid-username-with-special-chars!')).rejects.toThrow();
        expect(writerService.getWriterByUsername('ab')).rejects.toThrow(); // too short
    });
    
    it('getWriterByUsername throws error if not found (technically returns null from db, but service logic might just return null)', async () => {
        // The service doesn't throw if not found, it just returns what db returns.
        // But the input validation throws if username is invalid.
        // If username is valid but not in db:
        mockFindFirst.mockResolvedValue(null);
        const result = await writerService.getWriterByUsername('unknownUser');
        expect(result).toBeNull();
    });
});
