"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Lightbulb, Radar, Search } from "lucide-react";

const NAV_ITEMS = [
  { href: "/today", label: "Today", icon: Radar },
  { href: "/explore", label: "Explore", icon: Search },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/idea-lab", label: "Idea Lab", icon: Lightbulb },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/today" className="group flex min-w-0 items-center gap-3">
          <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] text-cyan-300 shadow-[0_0_32px_-14px_rgba(34,211,238,0.9)]">
            <span className="absolute inset-1 rounded-full border border-cyan-300/10" />
            <Radar className="relative h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold tracking-tight text-foreground sm:text-base">
              Frontier Radar
            </span>
            <span className="hidden font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300/60 sm:block">
              Personal intelligence feed
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 rounded-xl border border-white/[0.05] bg-white/[0.025] p-1">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/today" && pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-200 sm:px-3",
                  active
                    ? "bg-white/[0.07] text-foreground shadow-sm ring-1 ring-white/[0.06]"
                    : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                ].join(" ")}
              >
                <Icon className={active ? "h-3.5 w-3.5 text-cyan-300" : "h-3.5 w-3.5"} />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
