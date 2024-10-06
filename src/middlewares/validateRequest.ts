import { validator } from "hono/validator";
import type { z } from "zod";

export function validateRequest(
  typereq: "json" | "query" | "param" | "cookie" | "header",
  schema: z.Schema<any>
) {
  return validator(typereq, (value, c) => {
    const parsed = schema.safeParse(value);

    if (!parsed.success) {
      const erros = parsed.error.issues.map((issue) => {
        return {
          message: issue.message,
          field: issue.path.join("."),
        };
      });
      return c.json(
        { succes: false, error: erros, message: "Invalid input", data: null },
        400
      );
    }
    return parsed.data;
  });
}
