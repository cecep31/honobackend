import { verify } from 'hono/jwt';
import config from '../config';
import type { jwtPayload } from '../types/auth';

interface ParsedBearerToken {
  token?: string;
  hasAuthorizationHeader: boolean;
  isBearerFormatValid: boolean;
}

function parseBearerToken(authorization?: string): ParsedBearerToken {
  if (!authorization) {
    return {
      hasAuthorizationHeader: false,
      isBearerFormatValid: false,
    };
  }

  const parts = authorization.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    return {
      hasAuthorizationHeader: true,
      isBearerFormatValid: false,
    };
  }

  return {
    token: parts[1],
    hasAuthorizationHeader: true,
    isBearerFormatValid: true,
  };
}

export function getBearerToken(authorization?: string): ParsedBearerToken {
  return parseBearerToken(authorization);
}

export async function verifyJwtToken(token: string): Promise<jwtPayload> {
  const payload = await verify(token, config.jwt.secret, 'HS256');
  return payload as unknown as jwtPayload;
}
