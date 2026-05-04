import { describe, it, expect } from 'bun:test';
import { parseExpiresIn } from '../utils/jwt';

describe('parseExpiresIn', () => {
  it('parses days', () => {
    expect(parseExpiresIn('1d')).toBe(86400);
    expect(parseExpiresIn('3d')).toBe(259200);
  });

  it('parses hours', () => {
    expect(parseExpiresIn('1h')).toBe(3600);
    expect(parseExpiresIn('5h')).toBe(18000);
  });

  it('parses minutes', () => {
    expect(parseExpiresIn('30m')).toBe(1800);
    expect(parseExpiresIn('1m')).toBe(60);
  });

  it('parses seconds', () => {
    expect(parseExpiresIn('60s')).toBe(60);
    expect(parseExpiresIn('1s')).toBe(1);
  });

  it('defaults to 1 day for invalid format', () => {
    expect(parseExpiresIn('invalid')).toBe(86400);
  });

  it('defaults to 1 day for empty string', () => {
    expect(parseExpiresIn('')).toBe(86400);
  });

  it('defaults to 1 day for missing unit', () => {
    expect(parseExpiresIn('3600')).toBe(86400);
  });

  it('defaults to 1 day for unknown unit', () => {
    expect(parseExpiresIn('1w')).toBe(86400);
  });

  it('handles large values', () => {
    expect(parseExpiresIn('365d')).toBe(365 * 86400);
  });
});
