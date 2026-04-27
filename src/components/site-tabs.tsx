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
                "inline-flex min-w-[9.5rem] items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold whitespace-nowrap transition-[background-color,color,box-shadow]",
                isCurrent
                  ? "border border-[color:var(--app-accent)]/30 bg-white text-[var(--app-foreground)] shadow-[0_10px_24px_rgba(29,22,12,0.08)]"
                  : "bg-white/72 text-[var(--app-muted)] hover:bg-white hover:text-[var(--app-accent-strong)]",
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
