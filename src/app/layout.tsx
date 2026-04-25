import type { Metadata } from "next";
import { Geist, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import exampleConfig from "../../config/config.example";

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

export const metadata: Metadata = {
  title: exampleConfig.site.branding.title,
  description:
    exampleConfig.site.branding.description ??
    "Private house occupancy, public availability, and lightweight stay requests.",
};

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
