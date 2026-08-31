import type { Metadata } from "next";
import "./globals.css";
import { brandLabel } from "@/lib/config";

export const metadata: Metadata = {
  title: brandLabel(),
  description: "분양 홈페이지 제작·운영 플랫폼",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full bg-background font-sans text-text-primary">{children}</body>
    </html>
  );
}
