import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getAdminAuthState } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authState = await getAdminAuthState();

  if (!authState.initialized) {
    redirect("/admin/setup");
  }

  if (!authState.session) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="rounded-[2rem] border border-[color:var(--app-card-border)] bg-[color:var(--app-card)] p-6 shadow-[var(--app-shadow)] sm:p-8">
          <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.28em] text-[var(--app-muted)]">
            Admin
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em]">
            House calendar control room
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--app-muted)]">
            The first auth slice is live. This page is intentionally narrow: it
            proves bootstrap, password login, and session protection before the
            ICS sync and share-link management surfaces exist.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-[color:var(--app-card-border)] bg-white/60 p-5">
              <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">
                Signed in as
              </p>
              <p className="mt-3 text-lg font-semibold">
                {authState.session.email}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-[color:var(--app-card-border)] bg-white/60 p-5">
              <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.24em] text-[var(--app-muted)]">
                Session
              </p>
              <p className="mt-3 text-lg font-semibold">Active</p>
              <p className="mt-1 text-sm text-[var(--app-muted)]">
                Password auth is the default admin path for this deployment.
              </p>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-[2rem] border border-[color:var(--app-card-border)] bg-[color:var(--app-card)] p-6 shadow-[var(--app-shadow)]">
            <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.28em] text-[var(--app-muted)]">
              Next up
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--app-muted)]">
              <li>ICS import and sync diagnostics</li>
              <li>Share-link management</li>
              <li>Request triage and approval</li>
            </ul>

            <form action="/admin/logout" method="post" className="mt-6">
              <Button
                type="submit"
                variant="outline"
                className="h-auto rounded-full border-[color:var(--app-card-border)] bg-white/75 px-4 py-2 text-sm font-semibold"
              >
                Sign out
              </Button>
            </form>
          </section>
        </aside>
      </div>
    </main>
  );
}
