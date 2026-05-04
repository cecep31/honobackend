import { describe, it, expect, mock } from 'bun:test';
import { HTTPException } from 'hono/http-exception';
import { errorHandler, withErrorHandling } from '../middlewares/errorHandler';
import { ApiError } from '../utils/error';

describe('errorHandler middleware', () => {
  const createMockContext = (overrides?: Partial<any>) => {
    const jsonMock = mock((data: any, status?: number) => {
      return new Response(JSON.stringify(data), { status: status || 200 });
    });
    return {
      get: mock((key: string) => {
        if (key === 'requestId') return 'test-req-id';
        return undefined;
      }),
      req: {
        method: 'GET',
        path: '/test',
        header: mock(() => 'test-agent'),
      },
      json: jsonMock,
      ...overrides,
    } as any;
  };

  it('handles ApiError and returns correct status', async () => {
    const handler = errorHandler();
    const c = createMockContext();
    const err = new ApiError('User not found', 404, 'DB_001');

    const response = await handler(err, c);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('User not found');
    expect(body.error).toBe('DB_001');
    expect(body.request_id).toBe('test-req-id');
  });

  it('handles VALID_001 with errors array', async () => {
    const handler = errorHandler();
    const c = createMockContext();
    const err = new ApiError('Validation failed', 400, 'VALID_001', [{ field: 'email', message: 'Required' }]);

    const response = await handler(err, c);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.errors).toEqual([{ field: 'email', message: 'Required' }]);
  });

  it('handles HTTPException', async () => {
    const handler = errorHandler();
    const c = createMockContext();
    const err = new HTTPException(403, { message: 'Forbidden' });

    const response = await handler(err, c);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  it('handles generic Error with 500 and generic message', async () => {
    const handler = errorHandler();
    const c = createMockContext();
    const err = new Error('Something broke');

    const response = await handler(err, c);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Internal server error');
  });

  it('handles unknown errors', async () => {
    const handler = errorHandler();
    const c = createMockContext();

    const response = await handler('string error', c);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Internal server error');
  });
});

describe('withErrorHandling', () => {
  const createMockContext = () => ({
    get: mock((key: string) => (key === 'requestId' ? 'req-123' : undefined)),
    req: { method: 'GET', path: '/', header: mock(() => '') },
    json: mock((data: any, status?: number) => new Response(JSON.stringify(data), { status: status || 200 })),
  } as any);

  it('returns handler result on success', async () => {
    const handler = async (c: any) => new Response('OK');
    const wrapped = withErrorHandling(handler);
    const response = await wrapped(createMockContext());
    expect(await response.text()).toBe('OK');
  });

  it('catches errors and invokes errorHandler', async () => {
    const handler = async () => {
      throw new ApiError('Item not found', 404, 'DB_001');
    };
    const wrapped = withErrorHandling(handler);
    const response = await wrapped(createMockContext());
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Item not found');
  });
});
