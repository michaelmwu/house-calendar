import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminAuthState } from "@/lib/server/auth";

type SearchParams = Promise<{
  error?: string;
  message?: string;
}>;

export const dynamic = "force-dynamic";

function Notice({
  kind,
  message,
}: {
  kind: "error" | "info";
  message?: string;
}) {
  if (!message) {
    return null;
  }

  const classes =
    kind === "error"
      ? "border-[color:var(--danger)]/25 bg-[color:var(--danger)]/8 text-[color:var(--danger)]"
      : "border-[color:var(--accent)]/20 bg-[color:var(--accent)]/8 text-[var(--accent-strong)]";

  return (
    <p className={`rounded-2xl border px-4 py-3 text-sm ${classes}`}>
      {message}
    </p>
  );
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [{ error, message }, authState] = await Promise.all([
    searchParams,
    getAdminAuthState(),
  ]);

  if (!authState.initialized) {
    redirect("/admin/setup");
  }

  if (authState.session) {
    redirect("/admin");
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-[color:var(--card-border)] bg-[color:var(--card)] p-6 shadow-[var(--shadow)] sm:p-8">
        <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
          Admin login
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
          Sign in to manage the house
        </h1>
        <p className="mt-4 text-base leading-7 text-[var(--muted)]">
          This deployment uses a single owner account stored in Postgres. Email
          delivery is not required for normal local or production login.
        </p>

        <div className="mt-6 space-y-4">
          <Notice kind="error" message={error} />
          <Notice kind="info" message={message} />
        </div>

        <form
          action="/admin/login/submit"
          method="post"
          className="mt-8 space-y-5"
        >
          <label className="block">
            <span className="mb-2 block text-sm font-medium">Admin email</span>
            <input
              autoComplete="email"
              required
              name="email"
              type="email"
              className="w-full rounded-2xl border border-[color:var(--card-border)] bg-white/90 px-4 py-3 text-base outline-none transition focus:border-[color:var(--accent)]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium">Password</span>
            <input
              autoComplete="current-password"
              required
              name="password"
              type="password"
              className="w-full rounded-2xl border border-[color:var(--card-border)] bg-white/90 px-4 py-3 text-base outline-none transition focus:border-[color:var(--accent)]"
            />
          </label>

          <div className="flex items-center justify-between gap-4">
            <button
              type="submit"
              className="inline-flex rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
            >
              Sign in
            </button>

            <Link
              href="/admin/setup"
              className="text-sm font-medium text-[var(--muted)] underline-offset-4 hover:underline"
            >
              Setup page
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
