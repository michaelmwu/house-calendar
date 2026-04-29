import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDefaultSiteId } from "@/lib/config/config";
import { loadAppConfig } from "@/lib/server/app-config";
import { getAdminAuthState } from "@/lib/server/auth";

type SearchParams = Promise<{
  error?: string;
}>;

export const metadata: Metadata = {
  title: "Admin setup",
};

export const dynamic = "force-dynamic";

function ErrorBanner({
  children,
  message,
}: {
  children?: ReactNode;
  message?: string;
}) {
  const content = children ?? message;

  if (!content) {
    return null;
  }

  return (
    <div className="flex gap-3 rounded-2xl border border-[color:var(--app-danger)]/40 bg-[color:var(--app-danger)]/12 px-4 py-3 text-sm leading-6 text-[color:var(--app-danger)] shadow-[0_10px_24px_rgba(122,52,39,0.08)]">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:var(--app-danger)] text-xs font-bold text-white">
        !
      </span>
      <div className="min-w-0 font-medium">{content}</div>
    </div>
  );
}

export default async function AdminSetupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [{ error }, authState, appConfig] = await Promise.all([
    searchParams,
    getAdminAuthState(),
    loadAppConfig(),
  ]);

  if (authState.initialized) {
    redirect(
      authState.session
        ? `/admin/${getDefaultSiteId(appConfig)}`
        : "/admin/login",
    );
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[2rem] border border-[color:var(--app-card-border)] bg-[color:var(--app-card)] p-6 shadow-[var(--app-shadow)] ring-0 sm:p-8">
          <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.28em] text-[var(--app-muted)]">
            Admin setup
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
            Bootstrap the owner account
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--app-muted)]">
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
              <ErrorBanner>
                <p>No valid bootstrap code exists yet.</p>
                <code className="mt-2 block w-fit rounded-lg bg-white/80 px-2 py-1 font-[family-name:var(--font-mono)] text-xs text-[color:var(--app-danger)]">
                  bun run admin:bootstrap-code
                </code>
                <p className="mt-2">Run it and use the printed code here.</p>
              </ErrorBanner>
            ) : null}
          </div>

          {authState.databaseConfigured && authState.bootstrapCodeReady ? (
            <form
              action="/admin/setup/submit"
              method="post"
              className="mt-8 space-y-5"
            >
              <div>
                <Label htmlFor="bootstrapCode" className="mb-2">
                  Bootstrap code
                </Label>
                <Input
                  id="bootstrapCode"
                  required
                  name="bootstrapCode"
                  type="password"
                  className="h-auto rounded-2xl border-[color:var(--app-card-border)] bg-white/90 px-4 py-3 text-base focus-visible:border-[color:var(--app-accent)]"
                />
              </div>

              <div>
                <Label htmlFor="email" className="mb-2">
                  Admin email
                </Label>
                <Input
                  autoComplete="email"
                  id="email"
                  required
                  name="email"
                  type="email"
                  className="h-auto rounded-2xl border-[color:var(--app-card-border)] bg-white/90 px-4 py-3 text-base focus-visible:border-[color:var(--app-accent)]"
                />
              </div>

              <div>
                <Label htmlFor="password" className="mb-2">
                  Admin password
                </Label>
                <Input
                  autoComplete="new-password"
                  id="password"
                  minLength={10}
                  required
                  name="password"
                  type="password"
                  className="h-auto rounded-2xl border-[color:var(--app-card-border)] bg-white/90 px-4 py-3 text-base focus-visible:border-[color:var(--app-accent)]"
                />
              </div>

              <Button
                type="submit"
                className="h-auto rounded-full bg-[var(--app-foreground)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--app-accent-strong)]"
              >
                Create admin account
              </Button>
            </form>
          ) : null}
        </Card>

        <Card className="rounded-[2rem] border border-[color:var(--app-card-border)] bg-[color:var(--app-card)] p-6 shadow-[var(--app-shadow)] ring-0 sm:p-8">
          <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.28em] text-[var(--app-muted)]">
            What this does
          </p>
          <ul className="mt-5 grid gap-3 text-sm leading-6 text-[var(--app-muted)]">
            <li>Consumes a one-time setup code stored only by hash.</li>
            <li>Creates the single admin user for this deployment.</li>
            <li>Stores the admin email in Postgres, not in env.</li>
            <li>Starts normal password-based admin login after setup.</li>
            <li>Keeps email delivery optional for now.</li>
          </ul>
        </Card>
      </div>
    </main>
  );
}
