import type { Metadata } from "next";
import { getSiteConfig } from "@/lib/config/config";
import { loadAppConfig } from "@/lib/server/app-config";
import { buildSiteMetadata } from "@/lib/site-metadata";

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

  return buildSiteMetadata(siteConfig.site.branding);
}

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
