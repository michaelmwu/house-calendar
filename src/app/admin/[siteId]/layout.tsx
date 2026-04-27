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
    return {
      title: "Admin",
    };
  }

  return {
    title: `${siteConfig.site.branding.title} admin`,
  };
}

export default function AdminSiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
