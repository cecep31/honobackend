import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createDrizzleMocks } from './helpers/drizzleMock';

const mocks = createDrizzleMocks();
const mockFindMany = mock();
const mockFindFirst = mock();
const mockExecute = mock();

mock.module('../database/drizzle', () => {
  return {
    db: {
      query: {
        auth_activity_logs: {
          findMany: mockFindMany,
          findFirst: mockFindFirst,
        },
      },
      insert: mocks.mockInsert,
      select: mocks.mockSelect,
      update: mocks.mockUpdate,
      delete: mocks.mockDelete,
      execute: mockExecute,
    },
  };
});

import { AuthActivityService } from '../modules/auth/services/authActivityService';

describe('AuthActivityService', () => {
  let service: AuthActivityService;

  beforeEach(() => {
    service = new AuthActivityService();
    mocks.reset();
    mockFindMany.mockReset();
    mockFindFirst.mockReset();
    mockExecute.mockReset();
  });

  describe('logActivity', () => {
    it('logs an activity successfully', async () => {
      const mockLog = { id: 'log-1', activity_type: 'login' };
      mocks.mockReturning.mockResolvedValue([mockLog]);

      const result = await service.logActivity({
        userId: 'user-1',
        activityType: 'login',
        status: 'success',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });

      expect(result).toEqual(mockLog);
      expect(mocks.mockInsert).toHaveBeenCalled();
      expect(mocks.mockValues).toHaveBeenCalled();
    });

    it('logs activity with metadata', async () => {
      const mockLog = { id: 'log-2' };
      mocks.mockReturning.mockResolvedValue([mockLog]);

      const result = await service.logActivity({
        userId: 'user-1',
        activityType: 'login_failed',
        status: 'failure',
        errorMessage: 'Invalid password',
        metadata: { provider: 'github' },
      });

      expect(result).toEqual(mockLog);
    });

    it('returns null on error without throwing', async () => {
      mocks.mockValues.mockImplementation(() => {
        throw new Error('DB Error');
      });

      const result = await service.logActivity({
        userId: 'user-1',
        activityType: 'login',
        status: 'success',
      });

      expect(result).toBeNull();
    });

    it('uses transaction client when provided', async () => {
      const mockLog = { id: 'log-3' };
      const txMockInsert = mock(() => ({
        values: mock(() => ({
          returning: mock(() => Promise.resolve([mockLog])),
        })),
      }));

      const result = await service.logActivity(
        {
          userId: 'user-1',
          activityType: 'login',
          status: 'success',
        },
        { insert: txMockInsert }
      );

      expect(result).toEqual(mockLog);
      expect(txMockInsert).toHaveBeenCalled();
    });
  });

  describe('getActivityLogs', () => {
    it('returns logs with default pagination', async () => {
      const mockLogs = [
        { id: 'log-1', activity_type: 'login', metadata: '{"key":"val"}', user: { id: 'u1' } },
      ];
      mockFindMany.mockResolvedValue(mockLogs);

      const result = await service.getActivityLogs({});

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('metadata');
      expect(mockFindMany).toHaveBeenCalled();
    });

    it('filters by userId', async () => {
      mockFindMany.mockResolvedValue([]);

      await service.getActivityLogs({ userId: 'user-1' });

      expect(mockFindMany).toHaveBeenCalled();
    });

    it('filters by activityType and status', async () => {
      mockFindMany.mockResolvedValue([]);

      await service.getActivityLogs({
        userId: 'user-1',
        activityType: 'login_failed',
        status: 'failure',
      });

      expect(mockFindMany).toHaveBeenCalled();
    });

    it('filters by date range', async () => {
      mockFindMany.mockResolvedValue([]);

      await service.getActivityLogs({
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      });

      expect(mockFindMany).toHaveBeenCalled();
    });

    it('parses metadata JSON', async () => {
      const mockLogs = [{ id: 'log-1', metadata: '{"test":true}', user: null }];
      mockFindMany.mockResolvedValue(mockLogs);

      const result = await service.getActivityLogs({});

      expect(result[0].metadata).toEqual({ test: true });
    });

    it('handles null metadata', async () => {
      const mockLogs = [{ id: 'log-1', metadata: null, user: null }];
      mockFindMany.mockResolvedValue(mockLogs);

      const result = await service.getActivityLogs({});

      expect(result[0].metadata).toBeNull();
    });
  });

  describe('getActivityLogsCount', () => {
    it('returns total count without filters', async () => {
      mocks.mockSelect.mockReturnValue({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ count: 42 }])),
        })),
      });

      const result = await service.getActivityLogsCount({});

      expect(result).toBe(42);
    });

    it('returns count with filters', async () => {
      mocks.mockSelect.mockReturnValue({
        from: mock(() => ({
          where: mock(() => Promise.resolve([{ count: 5 }])),
        })),
      });

      const result = await service.getActivityLogsCount({
        userId: 'user-1',
        activityType: 'login',
      });

      expect(result).toBe(5);
    });
  });

  describe('getUserRecentActivity', () => {
    it('delegates to getActivityLogs with limit', async () => {
      mockFindMany.mockResolvedValue([]);

      await service.getUserRecentActivity('user-1', 5);

      expect(mockFindMany).toHaveBeenCalled();
    });
  });

  describe('getFailedLoginAttempts', () => {
    it('returns failed logins in last 24 hours by default', async () => {
      mockFindMany.mockResolvedValue([]);

      await service.getFailedLoginAttempts('user-1');

      expect(mockFindMany).toHaveBeenCalled();
    });

    it('returns failed logins since provided date', async () => {
      mockFindMany.mockResolvedValue([]);

      await service.getFailedLoginAttempts('user-1', new Date('2025-01-01'));

      expect(mockFindMany).toHaveBeenCalled();
    });
  });

  describe('cleanupOldLogs', () => {
    it('deletes logs older than default 90 days', async () => {
      mocks.mockReturning.mockResolvedValue([{ id: 'log-1' }, { id: 'log-2' }]);

      const result = await service.cleanupOldLogs();

      expect(result).toBe(2);
      expect(mocks.mockDelete).toHaveBeenCalled();
    });

    it('deletes logs older than specified days', async () => {
      mocks.mockReturning.mockResolvedValue([]);

      const result = await service.cleanupOldLogs(30);

      expect(result).toBe(0);
      expect(mocks.mockDelete).toHaveBeenCalled();
    });
  });
});
