"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/today", label: "Today", short: "T" },
  { href: "/explore", label: "Explore", short: "E" },
  { href: "/radar", label: "Radar", short: "R" },
  { href: "/saved", label: "Saved", short: "S" },
];

function shouldEagerPrefetch(href: string) {
  return href === "/today" || href === "/explore" || href === "/radar";
}

export function SiteNav() {
  const pathname = usePathname();
  const today = pathname === "/today";
  const project = pathname.startsWith("/project/");
  const saved = pathname === "/saved" || pathname.startsWith("/qa/saved");
  const fixedToViewport = today || project;

  return (
    <header
      className={[
        fixedToViewport ? "fixed" : "sticky",
        "inset-x-0 top-0 z-[120] h-12 border-b transition-colors",
        saved
          ? "border-white/[0.09] bg-[#0b121c] text-[#f3efe7] shadow-[0_1px_0_rgba(255,255,255,.025)]"
          : "border-black/10 bg-[#f3f0e7] text-[#111214] shadow-[0_1px_0_rgba(255,255,255,.6)]",
      ].join(" ")}
    >
      <div className="relative flex h-full w-full items-center justify-between gap-5 px-4 sm:px-7 lg:px-10">
        <Link
          href="/today"
          prefetch
          className="group flex min-w-0 items-center gap-2.5"
          aria-label="Frontier Radar Today"
        >
          <span
            className={[
              "relative grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-transform duration-300 group-hover:rotate-12",
              saved ? "border-white/35" : "border-black/35",
            ].join(" ")}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#3150ff]" />
          </span>
          <span className="truncate font-mono text-[10px] font-black uppercase tracking-[0.16em] sm:text-[11px]">
            Frontier Radar
          </span>
        </Link>

        <nav
          className={[
            "flex items-center gap-1 border-y px-1 py-1 font-mono uppercase",
            saved ? "border-white/15 bg-white/[0.035]" : "border-black/20 bg-white/30",
          ].join(" ")}
          aria-label="Primary navigation"
        >
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/today" && pathname.startsWith(`${item.href}/`)) ||
              (item.href === "/saved" && pathname.startsWith("/qa/saved"));
            const exploreEntry = item.href === "/explore";

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={shouldEagerPrefetch(item.href) ? true : undefined}
                aria-current={active ? "page" : undefined}
                className={[
                  "group/nav relative inline-flex min-h-7 items-center justify-center gap-1.5 border border-transparent px-2.5 text-[9px] font-extrabold tracking-[0.12em] transition-all duration-180 sm:px-3 sm:text-[10px]",
                  active
                    ? saved
                      ? "border-white/70 bg-[#f3efe7] text-[#0b121c]"
                      : "border-black/60 bg-[#111317] text-white"
                    : exploreEntry
                      ? saved
                        ? "text-[#8ea0ff] opacity-100 hover:border-[#8ea0ff]/45"
                        : "text-[#2147e8] opacity-100 hover:border-[#3150ff]/45"
                      : saved
                        ? "text-white opacity-58 hover:border-white/20 hover:opacity-100"
                        : "text-black opacity-58 hover:border-black/25 hover:opacity-100",
                ].join(" ")}
              >
                {exploreEntry && !active ? (
                  <span className="h-1 w-1 rounded-full bg-[#3150ff]" aria-hidden />
                ) : null}
                <span className="sm:hidden">{item.short}</span>
                <span className="hidden sm:inline">{item.label}</span>
                {active ? (
                  <span className="absolute inset-x-2 -bottom-[5px] h-[2px] bg-[#3150ff]" aria-hidden />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
