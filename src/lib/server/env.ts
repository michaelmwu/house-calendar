import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  PORT: z.coerce.number().int().positive().optional(),
  POSTGRES_PORT: z.coerce.number().int().positive().optional(),
});

export const serverEnv = serverEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  PORT: process.env.PORT,
  POSTGRES_PORT: process.env.POSTGRES_PORT,
});
