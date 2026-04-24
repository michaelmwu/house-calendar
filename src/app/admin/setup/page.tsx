import { redirect } from "next/navigation";
import { getAdminAuthState } from "@/lib/server/auth";

type SearchParams = Promise<{
  error?: string;
}>;

export const dynamic = "force-dynamic";

function ErrorBanner({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p className="rounded-2xl border border-[color:var(--danger)]/25 bg-[color:var(--danger)]/8 px-4 py-3 text-sm text-[color:var(--danger)]">
      {message}
    </p>
  );
}

export default async function AdminSetupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [{ error }, authState] = await Promise.all([
    searchParams,
    getAdminAuthState(),
  ]);

  if (authState.initialized) {
    redirect(authState.session ? "/admin" : "/admin/login");
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] border border-[color:var(--card-border)] bg-[color:var(--card)] p-6 shadow-[var(--shadow)] sm:p-8">
          <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
            Admin setup
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
            Bootstrap the owner account
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
            This deployment stays single-tenant. First-run setup creates one
            admin user with a required email address and password. A one-time
            bootstrap code must be generated from the CLI before setup can run.
          </p>

          <div className="mt-6 space-y-4">
            <ErrorBanner message={error} />

            {!authState.databaseConfigured ? (
              <ErrorBanner message="DATABASE_URL is required before admin setup can run." />
            ) : null}

            {!authState.bootstrapCodeReady ? (
              <ErrorBanner message="No valid bootstrap code exists yet. Run `bun run admin:bootstrap-code` and use the printed code here." />
            ) : null}
          </div>

          {authState.databaseConfigured && authState.bootstrapCodeReady ? (
            <form
              action="/admin/setup/submit"
              method="post"
              className="mt-8 space-y-5"
            >
              <label className="block">
                <span className="mb-2 block text-sm font-medium">
                  Bootstrap code
                </span>
                <input
                  required
                  name="bootstrapCode"
                  type="password"
                  className="w-full rounded-2xl border border-[color:var(--card-border)] bg-white/90 px-4 py-3 text-base outline-none transition focus:border-[color:var(--accent)]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium">
                  Admin email
                </span>
                <input
                  autoComplete="email"
                  required
                  name="email"
                  type="email"
                  className="w-full rounded-2xl border border-[color:var(--card-border)] bg-white/90 px-4 py-3 text-base outline-none transition focus:border-[color:var(--accent)]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium">
                  Admin password
                </span>
                <input
                  autoComplete="new-password"
                  minLength={10}
                  required
                  name="password"
                  type="password"
                  className="w-full rounded-2xl border border-[color:var(--card-border)] bg-white/90 px-4 py-3 text-base outline-none transition focus:border-[color:var(--accent)]"
                />
              </label>

              <button
                type="submit"
                className="inline-flex rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
              >
                Create admin account
              </button>
            </form>
          ) : null}
        </section>

        <aside className="rounded-[2rem] border border-[color:var(--card-border)] bg-[color:var(--card)] p-6 shadow-[var(--shadow)] sm:p-8">
          <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
            What this does
          </p>
          <ul className="mt-5 space-y-4 text-sm leading-6 text-[var(--muted)]">
            <li>Consumes a one-time setup code stored only by hash.</li>
            <li>Creates the single admin user for this deployment.</li>
            <li>Stores the admin email in Postgres, not in env.</li>
            <li>Starts normal password-based admin login after setup.</li>
            <li>Keeps email delivery optional for now.</li>
          </ul>
        </aside>
      </div>
    </main>
  );
}
