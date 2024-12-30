import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode as StatusCode } from "hono/utils/http-status";

export function errorHttp(data: string, code: StatusCode = 500) {
  return new HTTPException(code, { message: data });
}
