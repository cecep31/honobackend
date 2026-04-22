import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { WriterService } from '../modules/writers/services/writerService';

const mockFindFirst = mock();

mock.module('../database/drizzle', () => {
  return {
    db: {
      query: {
        users: {
          findFirst: mockFindFirst,
        },
      },
    },
  };
});

describe('WriterService', () => {
  let service: WriterService;

  beforeEach(() => {
    service = new WriterService();
    mockFindFirst.mockReset();
  });

  describe('getWriterByUsername', () => {
    it('returns writer with profile for valid username', async () => {
      const mockWriter = {
        id: 'user-1',
        username: 'johndoe',
        first_name: 'John',
        last_name: 'Doe',
        profiles: { bio: 'Hello', website: 'https://example.com' },
      };
      mockFindFirst.mockResolvedValue(mockWriter);

      const result = await service.getWriterByUsername('johndoe');

      expect(result).toEqual(mockWriter);
      expect(mockFindFirst).toHaveBeenCalled();
    });

    it('returns null if writer not found', async () => {
      mockFindFirst.mockResolvedValue(null);

      const result = await service.getWriterByUsername('nonexistent');

      expect(result).toBeNull();
    });

    it('throws validation error for invalid username format', async () => {
      await expect(service.getWriterByUsername('ab')).rejects.toThrow('Username format is not valid');
    });

    it('throws validation error for special characters', async () => {
      await expect(service.getWriterByUsername('john@doe')).rejects.toThrow('Username format is not valid');
    });

    it('throws validation error for username too long', async () => {
      await expect(service.getWriterByUsername('a'.repeat(20))).rejects.toThrow('Username format is not valid');
    });
  });
});
