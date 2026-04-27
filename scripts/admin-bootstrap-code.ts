import { createBootstrapCode } from "../src/lib/server/auth";
import { closeDb, withDatabaseStartupRetry } from "../src/lib/server/db";

async function main() {
  const result = await withDatabaseStartupRetry(createBootstrapCode, {
    operationName: "bootstrap code generation",
  });

  console.log("Generated one-time admin bootstrap code.");
  console.log(`Code: ${result.code}`);
  console.log(`Expires at: ${result.expiresAt.toISOString()}`);
  console.log("Visit /admin/setup and enter the code once.");
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error
        ? error.message
        : "Failed to create bootstrap code.",
    );
    process.exit(1);
  })
  .finally(async () => {
    await closeDb();
  });
