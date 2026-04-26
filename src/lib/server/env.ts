import { z } from "zod";

function optionalPositiveInt() {
  return z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().int().positive().optional(),
  );
}

const serverEnvSchema = z.object({
  DATABASE_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional(),
  ),
  ICS_SYNC_TTL_MINUTES: optionalPositiveInt(),
  PORT: optionalPositiveInt(),
  POSTGRES_PORT: optionalPositiveInt(),
  VIEWER_PASSWORD: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).optional(),
  ),
});

export const serverEnv = serverEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  ICS_SYNC_TTL_MINUTES: process.env.ICS_SYNC_TTL_MINUTES,
  PORT: process.env.PORT,
  POSTGRES_PORT: process.env.POSTGRES_PORT,
  VIEWER_PASSWORD: process.env.VIEWER_PASSWORD,
});
