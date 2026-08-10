"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/today", label: "Today", short: "T" },
  { href: "/explore", label: "Explore", short: "E" },
  { href: "/saved", label: "Saved", short: "S" },
  { href: "/idea-lab", label: "Idea Lab", short: "I" },
];

export function SiteNav() {
  const pathname = usePathname();
  const project = pathname.startsWith("/project/");
  const explore = pathname === "/explore" || pathname.startsWith("/explore/");
  const editorial = pathname === "/today" || explore;

  return (
    <header
      className={[
        "sticky top-0 z-50 border-b transition-colors",
        project
          ? "border-transparent bg-transparent text-white"
          : editorial
            ? "border-black/10 bg-[#f1eee5]/88 text-[#0b0b0b] backdrop-blur-xl"
            : "border-white/[0.06] bg-background/82 text-foreground backdrop-blur-xl",
      ].join(" ")}
    >
      <div className="flex w-full items-center justify-between gap-4 px-4 py-2.5 sm:px-7 lg:px-10">
        <Link href="/today" className="group flex min-w-0 items-center gap-2.5">
          <span
            className={[
              "relative grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[8px] font-black tracking-tighter transition-transform duration-300 group-hover:rotate-12",
              project ? "border-white/60" : editorial ? "border-black/50" : "border-white/35",
            ].join(" ")}
          >
            <span
              className={
                project
                  ? "h-1.5 w-1.5 rounded-full bg-white"
                  : editorial
                    ? "h-1.5 w-1.5 rounded-full bg-[#3150ff]"
                    : "h-1.5 w-1.5 rounded-full bg-cyan-300"
              }
            />
          </span>
          <span className="truncate text-[11px] font-black tracking-[0.16em] sm:text-xs">
            FRONTIER RADAR
          </span>
        </Link>

        <nav
          className={[
            "flex items-center gap-0.5 rounded-full border p-1 shadow-sm backdrop-blur-xl sm:gap-1",
            project
              ? "border-white/20 bg-black/30"
              : editorial
                ? "border-black/10 bg-white/55"
                : "border-white/10 bg-black/20",
          ].join(" ")}
          aria-label="Primary navigation"
        >
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== "/today" && pathname.startsWith(`${item.href}/`));
            const exploreEntry = item.href === "/explore";

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "relative inline-flex min-h-8 items-center justify-center rounded-full px-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] transition-all duration-200 sm:px-3.5 sm:text-[11px]",
                  active
                    ? project
                      ? "bg-white text-black shadow-sm"
                      : editorial
                        ? "bg-[#17181a] text-white shadow-sm"
                        : "bg-white text-black shadow-sm"
                    : exploreEntry
                      ? project
                        ? "border border-white/25 bg-white/10 text-white opacity-100 hover:bg-white/18"
                        : editorial
                          ? "border border-[#3150ff]/25 bg-[#3150ff]/[0.06] text-[#1738d1] opacity-100 hover:bg-[#3150ff]/[0.11]"
                          : "border border-cyan-300/25 bg-cyan-300/[0.06] text-cyan-100 opacity-100 hover:bg-cyan-300/[0.12]"
                      : project
                        ? "text-white/68 hover:bg-white/10 hover:text-white"
                        : editorial
                          ? "text-black/58 hover:bg-black/[0.05] hover:text-black"
                          : "text-foreground/58 hover:bg-white/[0.06] hover:text-foreground",
                ].join(" ")}
              >
                <span className="sm:hidden">{item.short}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
