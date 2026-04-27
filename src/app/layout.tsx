import type { Metadata } from "next";
import { Geist, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { getDefaultSiteId, getSiteConfig } from "@/lib/config/config";
import { loadAppConfig } from "@/lib/server/app-config";
import { buildFallbackMetadata, buildSiteMetadata } from "@/lib/site-metadata";
import { cn } from "@/lib/utils";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export async function generateMetadata(): Promise<Metadata> {
  const appConfig = await loadAppConfig();
  const defaultSiteConfig = getSiteConfig(
    appConfig,
    getDefaultSiteId(appConfig),
  );

  if (!defaultSiteConfig) {
    return buildFallbackMetadata();
  }

  return buildSiteMetadata(defaultSiteConfig.site.branding);
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className={`${displayFont.variable} ${monoFont.variable}`}>
        {children}
      </body>
    </html>
  );
}
