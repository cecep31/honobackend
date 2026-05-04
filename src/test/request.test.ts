import { describe, it, expect } from 'bun:test';
import { getClientIp, safeLimit, safeOffset, safePage } from '../utils/request';

const createMockContext = (headers: Record<string, string>) => ({
  req: {
    header: (name: string) => headers[name.toLowerCase()] || undefined,
  },
} as any);

describe('getClientIp', () => {
  it('returns CF-Connecting-IP when present', () => {
    const c = createMockContext({ 'cf-connecting-ip': '1.2.3.4', 'x-real-ip': '5.6.7.8' });
    expect(getClientIp(c)).toBe('1.2.3.4');
  });

  it('returns X-Real-IP when CF header is missing', () => {
    const c = createMockContext({ 'x-real-ip': '5.6.7.8' });
    expect(getClientIp(c)).toBe('5.6.7.8');
  });

  it('returns first X-Forwarded-For entry when others missing', () => {
    const c = createMockContext({ 'x-forwarded-for': '9.10.11.12, 13.14.15.16' });
    expect(getClientIp(c)).toBe('9.10.11.12');
  });

  it('trims whitespace from X-Forwarded-For', () => {
    const c = createMockContext({ 'x-forwarded-for': '  9.10.11.12  , 13.14.15.16' });
    expect(getClientIp(c)).toBe('9.10.11.12');
  });

  it('returns undefined when no headers present', () => {
    const c = createMockContext({});
    expect(getClientIp(c)).toBeUndefined();
  });
});

describe('safeLimit', () => {
  it('returns parsed number within bounds', () => {
    expect(safeLimit('25')).toBe(25);
  });

  it('caps at max', () => {
    expect(safeLimit('500', 10, 100)).toBe(100);
  });

  it('uses fallback for undefined', () => {
    expect(safeLimit(undefined, 20)).toBe(20);
  });

  it('uses fallback for non-numeric string', () => {
    expect(safeLimit('abc', 15)).toBe(15);
  });

  it('uses fallback for negative number', () => {
    expect(safeLimit('-5', 10)).toBe(10);
  });

  it('uses fallback for zero', () => {
    expect(safeLimit('0', 10)).toBe(10);
  });

  it('floors decimals', () => {
    expect(safeLimit('7.9')).toBe(7);
  });

  it('uses custom max', () => {
    expect(safeLimit('50', 10, 30)).toBe(30);
  });
});

describe('safeOffset', () => {
  it('returns parsed offset', () => {
    expect(safeOffset('100')).toBe(100);
  });

  it('uses fallback for undefined', () => {
    expect(safeOffset(undefined, 5)).toBe(5);
  });

  it('uses fallback for negative number', () => {
    expect(safeOffset('-1')).toBe(0);
  });

  it('uses fallback for non-numeric', () => {
    expect(safeOffset('xyz')).toBe(0);
  });

  it('floors decimals', () => {
    expect(safeOffset('3.7')).toBe(3);
  });
});

describe('safePage', () => {
  it('returns parsed page', () => {
    expect(safePage('5')).toBe(5);
  });

  it('uses fallback for undefined', () => {
    expect(safePage(undefined, 2)).toBe(2);
  });

  it('uses fallback for zero', () => {
    expect(safePage('0')).toBe(1);
  });

  it('uses fallback for negative number', () => {
    expect(safePage('-3')).toBe(1);
  });

  it('uses fallback for non-numeric', () => {
    expect(safePage('abc')).toBe(1);
  });

  it('floors decimals', () => {
    expect(safePage('2.9')).toBe(2);
  });
});
