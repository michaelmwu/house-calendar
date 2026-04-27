import type { Metadata } from "next";

export const metadata: Metadata = {
  description:
    "Owner admin for House Availability: auth, sync controls, and parser diagnostics.",
  title: {
    default: "Admin",
    template: "%s | House Availability",
  },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
