import { z } from "zod";

function optionalPositiveInt() {
  return z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().int().positive().optional(),
  );
}

function optionalNonEmptyString() {
  return z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional(),
  );
}

const serverEnvSchema = z.object({
  BOOTSTRAP_PASSWORD: optionalNonEmptyString(),
  DATABASE_URL: optionalNonEmptyString(),
  PORT: optionalPositiveInt(),
  POSTGRES_PORT: optionalPositiveInt(),
});

export const serverEnv = serverEnvSchema.parse({
  BOOTSTRAP_PASSWORD: process.env.BOOTSTRAP_PASSWORD,
  DATABASE_URL: process.env.DATABASE_URL,
  PORT: process.env.PORT,
  POSTGRES_PORT: process.env.POSTGRES_PORT,
});
