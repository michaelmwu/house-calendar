import { serverEnv } from "@/lib/server/env";

export function GET() {
  return Response.json({
    ok: true,
    service: "house-calendar",
    database: {
      configured: Boolean(serverEnv.DATABASE_URL),
      kind: "postgres",
      port: serverEnv.POSTGRES_PORT ?? null,
    },
  });
}
