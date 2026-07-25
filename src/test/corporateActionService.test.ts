import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { createDrizzleMocks } from './helpers/drizzleMock';

const mocks = createDrizzleMocks();
const mockWhereSelect = mock();
const mockOrderBy = mock();
const mockFrom = mock(() => ({ where: mockWhereSelect, orderBy: mockOrderBy }));
const mockOnConflictDoUpdate = mock();

mock.module('../database/drizzle', () => ({
  db: {
    select: mocks.mockSelect,
    insert: mocks.mockInsert,
  },
}));

const { CorporateActionService } = await import(
  '../modules/holdings/services/corporateActionService'
);

const createIdxClientMock = () => ({
  getCorporateActions: mock(),
});

describe('CorporateActionService', () => {
  let idxClient: ReturnType<typeof createIdxClientMock>;
  let service: InstanceType<typeof CorporateActionService>;

  beforeEach(() => {
    idxClient = createIdxClientMock();
    service = new CorporateActionService(idxClient as any);
    mocks.reset();
    mockWhereSelect.mockReset();
    mockOrderBy.mockReset();
    mockOnConflictDoUpdate.mockReset();
    mockFrom.mockClear();
    mocks.mockSelect.mockReturnValue({ from: mockFrom });
    mocks.mockValues.mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
    mockOnConflictDoUpdate.mockResolvedValue([]);
    // Second select chain ends with .orderBy(); count selects resolve once per test.
    mockWhereSelect.mockReturnValue({ orderBy: mockOrderBy });
  });

  it('serves stored rows without calling IDX when the month is cached', async () => {
    const storedRow = {
      id: 1n,
      symbol: 'BBCA',
      name: 'Bank Central Asia',
      type: 'dividend',
      event_date: '2026-07-15',
      pay_date: '2026-08-01',
      amount: '205.5',
      currency: 'IDR',
      note: '',
      market: 'IDX',
      created_at: '',
      updated_at: '',
    };

    // First select: ExistsInRange count -> cached. Second select: stored rows.
    mockWhereSelect.mockResolvedValueOnce([{ count: 3 }]);
    mockOrderBy.mockResolvedValueOnce([storedRow]);

    const result = await service.getCalendar(2026, 7);

    expect(result.cached).toBe(true);
    expect(result.from).toBe('2026-07-01');
    expect(result.to).toBe('2026-07-31');
    expect(result.total).toBe(1);
    expect(result.actions[0]).toMatchObject({
      symbol: 'BBCA',
      type: 'dividend',
      date: '2026-07-15',
      pay_date: '2026-08-01',
      amount: 205.5,
      currency: 'IDR',
      market: 'IDX',
    });
    expect(idxClient.getCorporateActions).not.toHaveBeenCalled();
    expect(mocks.mockInsert).not.toHaveBeenCalled();
  });

  it('fetches IDX and upserts when the month is not cached', async () => {
    mockWhereSelect.mockResolvedValueOnce([{ count: 0 }]); // not cached
    idxClient.getCorporateActions.mockResolvedValue([
      {
        symbol: 'TLKM',
        name: 'Telkom Indonesia',
        type: 'rups',
        date: '2026-07-20',
        currency: '',
        note: 'Tempat: Jakarta',
        market: 'IDX',
      },
    ]);
    mockOrderBy.mockResolvedValueOnce([
      {
        id: 2n,
        symbol: 'TLKM',
        name: 'Telkom Indonesia',
        type: 'rups',
        event_date: '2026-07-20',
        pay_date: null,
        amount: null,
        currency: '',
        note: 'Tempat: Jakarta',
        market: 'IDX',
        created_at: '',
        updated_at: '',
      },
    ]);

    const result = await service.getCalendar(2026, 7);

    expect(result.cached).toBe(false);
    expect(idxClient.getCorporateActions).toHaveBeenCalledWith('2026-07-01', '2026-07-31');
    expect(mocks.mockInsert).toHaveBeenCalled();
    expect(mockOnConflictDoUpdate).toHaveBeenCalled();
    expect(result.total).toBe(1);
    expect(result.actions[0].type).toBe('rups');
  });

  it('falls back to the current month for invalid month values', async () => {
    mockWhereSelect.mockResolvedValueOnce([{ count: 1 }]);
    mockOrderBy.mockResolvedValueOnce([]);

    const result = await service.getCalendar(2026, 99 as number);

    const now = new Date();
    const expectedMonth = now.getUTCMonth() + 1;
    expect(result.from).toBe(
      `${now.getUTCFullYear()}-${String(expectedMonth).padStart(2, '0')}-01`
    );
    expect(result.total).toBe(0);
  });

  it('returns an empty result when IDX has no data and nothing is stored', async () => {
    mockWhereSelect.mockResolvedValueOnce([{ count: 0 }]);
    idxClient.getCorporateActions.mockResolvedValue([]);
    mockOrderBy.mockResolvedValueOnce([]);

    const result = await service.getCalendar(2026, 2);

    expect(result.to).toBe('2026-02-28');
    expect(result.total).toBe(0);
    expect(result.actions).toEqual([]);
    expect(mocks.mockInsert).not.toHaveBeenCalled();
  });
});
