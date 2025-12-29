import { validator } from "hono/validator";
import type { z } from "zod";
import { Errors } from "../utils/error";

export function validateRequest(
  typereq: "json" | "query" | "param" | "cookie" | "header",
  schema: z.Schema<any>
) {
  return validator(typereq, (value) => {
    const parsed = schema.safeParse(value);

    if (!parsed.success) {
      const erros = parsed.error.issues.map((issue) => {
        return {
          message: issue.message,
          field: issue.path.join("."),
        };
      });
      throw Errors.ValidationFailed(erros);
    }
    return parsed.data;
  });
}
