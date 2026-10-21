import type { Metadata, Viewport } from "next";
import "./globals.css";
import { appConfig, brandLabel } from "@/lib/config";
import { orgText } from "@/modules/admin/org-copy";

export const metadata: Metadata = {
  title: {
    default: brandLabel(),
    template: `%s · ${brandLabel()}`,
  },
  description: orgText("siteDescription"),
  metadataBase: new URL(appConfig.publicUrl || "http://localhost:3000"),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3182f6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full bg-background font-sans text-text-primary">{children}</body>
    </html>
  );
}
