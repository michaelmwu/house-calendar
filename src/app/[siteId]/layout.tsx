import type { Metadata } from "next";
import { getSiteConfig } from "@/lib/config/config";
import { loadAppConfig } from "@/lib/server/app-config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ siteId: string }>;
}): Promise<Metadata> {
  const { siteId } = await params;
  const appConfig = await loadAppConfig();
  const siteConfig = getSiteConfig(appConfig, siteId);

  if (!siteConfig) {
    return {};
  }

  return {
    description:
      siteConfig.site.branding.description ??
      "Private house occupancy, public availability, and lightweight stay requests.",
    title: siteConfig.site.branding.title,
  };
}

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
