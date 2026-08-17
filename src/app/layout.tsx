import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";
import "./frontier-system.css";
import "./product-grammar.css";
import "./product-grammar-layer2.css";
import "./site-nav-transparent-light.css";
import "./editorial-line-field.css";
import "./surface-pass-5.css";
import "./micro-polish-pass.css";

export const metadata: Metadata = {
  title: "Frontier Radar",
  description: "个人前沿信息雷达：AI / ML / 开源 / Vibe Coding / 产品设计 / 量化金融",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div className="min-h-screen">
          <SiteNav />
          <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:py-9 lg:px-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
