import { resetAdminPassword } from "../src/lib/server/auth";
import { closeDb, withDatabaseStartupRetry } from "../src/lib/server/db";

type ParsedArgs = {
  email: string;
  password: string;
};

const HELP_TEXT = `
Usage:
  bun run admin:reset-password -- --email owner@example.com --password 'new strong password'

Options:
  --email       Existing admin email to reset
  --password    New admin password to hash and store
  --help        Show this message
`.trim();

function getFlagValue(
  argv: string[],
  index: number,
  flag: string,
): string | undefined {
  const value = argv[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}.`);
  }

  return value;
}

export function parseAdminResetPasswordArgs(
  argv: string[] = process.argv.slice(2),
): ParsedArgs {
  let email: string | undefined;
  let password: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--help") {
      throw new Error(HELP_TEXT);
    }

    if (argument === "--email") {
      email = getFlagValue(argv, index, "--email");
      index += 1;
      continue;
    }

    if (argument === "--password") {
      password = getFlagValue(argv, index, "--password");
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  if (!email || !password) {
    throw new Error(
      `Both --email and --password are required.\n\n${HELP_TEXT}`,
    );
  }

  return { email, password };
}

async function main() {
  const { email, password } = parseAdminResetPasswordArgs();
  const result = await withDatabaseStartupRetry(
    () =>
      resetAdminPassword({
        email,
        password,
      }),
    { operationName: "admin password reset" },
  );

  if (!result.ok) {
    throw new Error(result.error);
  }

  console.log("Reset admin password.");
  console.log(`Email: ${result.email}`);
  console.log(`Revoked sessions: ${result.revokedSessionCount}`);
  console.log("Use /admin/login with the new password.");
}

if (import.meta.main) {
  main()
    .catch((error) => {
      console.error(
        error instanceof Error
          ? error.message
          : "Failed to reset admin password.",
      );
      process.exit(1);
    })
    .finally(async () => {
      await closeDb();
    });
}
