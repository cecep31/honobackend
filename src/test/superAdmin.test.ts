import { describe, it, expect, mock } from 'bun:test';
import { createSuperAdminMiddleware } from '../middlewares/superAdmin';

describe('createSuperAdminMiddleware', () => {
  const createMockContext = (authUser?: any) => {
    const store = new Map<string, any>();
    if (authUser) store.set('user', authUser);

    return {
      get: (key: string) => store.get(key),
      set: (key: string, value: any) => store.set(key, value),
    } as any;
  };

  const createMockNext = () => mock(() => Promise.resolve());

  it('allows access when user is super admin', async () => {
    const userService = {
      isUserSuperAdmin: mock(() => Promise.resolve(true)),
    } as any;

    const middleware = createSuperAdminMiddleware(userService);
    const c = createMockContext({ user_id: 'admin-1' });
    const next = createMockNext();

    await middleware(c, next);

    expect(next).toHaveBeenCalled();
    expect(userService.isUserSuperAdmin).toHaveBeenCalledWith('admin-1');
  });

  it('throws Unauthorized when no auth user', async () => {
    const userService = { isUserSuperAdmin: mock() } as any;
    const middleware = createSuperAdminMiddleware(userService);
    const c = createMockContext();
    const next = createMockNext();

    await expect(middleware(c, next)).rejects.toThrow('Unauthorized');
    expect(next).not.toHaveBeenCalled();
  });

  it('throws Forbidden when user is not super admin', async () => {
    const userService = {
      isUserSuperAdmin: mock(() => Promise.resolve(false)),
    } as any;

    const middleware = createSuperAdminMiddleware(userService);
    const c = createMockContext({ user_id: 'user-1' });
    const next = createMockNext();

    await expect(middleware(c, next)).rejects.toThrow('Forbidden');
    expect(next).not.toHaveBeenCalled();
  });
});
