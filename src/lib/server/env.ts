import { z } from "zod";

function optionalPositiveInt() {
  return z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().int().positive().optional(),
  );
}

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  PORT: optionalPositiveInt(),
  POSTGRES_PORT: optionalPositiveInt(),
});

export const serverEnv = serverEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  PORT: process.env.PORT,
  POSTGRES_PORT: process.env.POSTGRES_PORT,
});
