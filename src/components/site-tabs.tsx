import Link from "next/link";
import { cn } from "@/lib/utils";

type SiteTabsProps = {
  currentSiteId: string;
  sites: Array<{
    href: string;
    id: string;
    label: string;
  }>;
};

export function SiteTabs({ currentSiteId, sites }: SiteTabsProps) {
  if (sites.length < 2) {
    return null;
  }

  return (
    <nav aria-label="House switcher" className="flex justify-center">
      <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-[color:var(--app-card-border)] bg-[color:var(--app-card)]/90 p-2 shadow-[var(--app-shadow)]">
        {sites.map((site) => {
          const isCurrent = site.id === currentSiteId;

          return (
            <Link
              key={site.id}
              href={site.href}
              aria-current={isCurrent ? "page" : undefined}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                isCurrent
                  ? "bg-[var(--app-foreground)] text-white"
                  : "text-[var(--app-muted)] hover:bg-[color:var(--app-accent)]/10 hover:text-[var(--app-accent-strong)]",
              )}
            >
              {site.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
