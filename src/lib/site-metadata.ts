import type { Metadata } from "next";
import type { SiteConfig } from "@/lib/config/config";

const fallbackDescription =
  "Private house occupancy, public availability, and lightweight stay requests.";

type BrandingConfig = SiteConfig["site"]["branding"];

export function buildSiteMetadata(
  branding: BrandingConfig,
  fallbackTitle = "House Availability",
): Metadata {
  return {
    description: branding.description ?? fallbackDescription,
    icons: branding.faviconPath
      ? {
          apple: branding.faviconPath,
          icon: branding.faviconPath,
          shortcut: branding.faviconPath,
        }
      : undefined,
    title: branding.title || fallbackTitle,
  };
}

export function buildFallbackMetadata(title = "House Availability"): Metadata {
  return {
    description: fallbackDescription,
    title,
  };
}
