/**
 * Parse a JWT expires-in string (e.g. '1d', '5h', '30m', '60s') into seconds.
 * Defaults to 1 day (86400s) if the format is unrecognised.
 */
export function parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([dhms])$/);
  if (!match) return 24 * 60 * 60;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd':
      return value * 24 * 60 * 60;
    case 'h':
      return value * 60 * 60;
    case 'm':
      return value * 60;
    case 's':
      return value;
    default:
      return 24 * 60 * 60;
  }
}
