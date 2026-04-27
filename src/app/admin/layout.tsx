import type { Metadata } from "next";

export const metadata: Metadata = {
  description:
    "Owner admin for house-calendar: auth, sync controls, and parser diagnostics.",
  title: {
    default: "Admin",
    template: "%s | house-calendar",
  },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
