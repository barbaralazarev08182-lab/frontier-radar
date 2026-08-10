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
  const today = pathname === "/today";
  const project = pathname.startsWith("/project/");
  const explore = pathname === "/explore" || pathname.startsWith("/explore/");
  const lightEditorial = explore;

  return (
    <header
      className={[
        "inset-x-0 top-0 z-[120] transition-colors",
        today
          ? "pointer-events-none fixed border-transparent bg-transparent text-white mix-blend-difference"
          : project
            ? "pointer-events-none fixed border-transparent bg-transparent text-[#111214]"
            : lightEditorial
              ? "sticky border-b border-black/10 bg-[#f3f0e7]/92 text-[#111214] backdrop-blur-lg"
              : "sticky border-b border-white/[0.06] bg-background/82 text-foreground backdrop-blur-xl",
      ].join(" ")}
    >
      <div
        className={[
          "relative flex w-full items-center justify-between gap-5 px-4 sm:px-7 lg:px-10",
          today ? "min-h-0 justify-end pt-[3.35rem]" : project ? "min-h-0 pt-4" : "min-h-14 py-2.5",
        ].join(" ")}
      >
        {!today ? (
          <Link
            href="/today"
            className={[
              "pointer-events-auto group flex min-w-0 items-center gap-2.5",
              project
                ? "border border-black/15 bg-[#f5f1e8]/92 px-3 py-2 shadow-[5px_5px_0_rgba(49,80,255,.2)] backdrop-blur-xl"
                : "",
            ].join(" ")}
            aria-label="Frontier Radar Today"
          >
            <span
              className={[
                "relative grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-transform duration-300 group-hover:rotate-12",
                project ? "border-black/40" : lightEditorial ? "border-black/35" : "border-white/35",
              ].join(" ")}
            >
              <span
                className={[
                  "h-1.5 w-1.5 rounded-full",
                  project || lightEditorial ? "bg-[#3150ff]" : "bg-cyan-300",
                ].join(" ")}
              />
            </span>
            <span className="truncate font-mono text-[10px] font-black uppercase tracking-[0.16em] sm:text-[11px]">
              Frontier Radar
            </span>
          </Link>
        ) : null}

        <nav
          className={[
            "pointer-events-auto flex items-center gap-1 px-1 py-1 font-mono uppercase",
            today
              ? "border-y border-white/35 backdrop-blur-[2px]"
              : project
                ? "border border-black/15 bg-[#f5f1e8]/94 shadow-[7px_7px_0_rgba(255,91,33,.18)] backdrop-blur-xl"
                : lightEditorial
                  ? "border-y border-black/20 backdrop-blur-[2px]"
                  : "border-y border-white/15 backdrop-blur-[2px]",
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
                  "group/nav relative inline-flex min-h-7 items-center justify-center gap-1.5 border border-transparent px-2.5 text-[9px] font-extrabold tracking-[0.12em] transition-all duration-180 sm:px-3 sm:text-[10px]",
                  active
                    ? today
                      ? "border-white/70 text-white"
                      : project
                        ? "border-[#3150ff] bg-[#3150ff] text-white shadow-[3px_3px_0_rgba(0,0,0,.12)]"
                        : lightEditorial
                          ? "border-black/60 text-black"
                          : "border-white/55 text-foreground"
                    : exploreEntry
                      ? today
                        ? "text-white opacity-90 hover:border-white/50"
                        : project
                          ? "border-[#3150ff]/20 bg-[#3150ff]/[0.06] text-[#1738d1] opacity-100 hover:border-[#3150ff]/55 hover:bg-[#3150ff]/[0.12]"
                          : lightEditorial
                            ? "text-[#2147e8] opacity-100 hover:border-[#3150ff]/45"
                            : "text-cyan-200 opacity-100 hover:border-cyan-300/35"
                      : today
                        ? "text-white opacity-58 hover:border-white/35 hover:opacity-100"
                        : project
                          ? "text-black/58 hover:border-black/25 hover:bg-black/[0.04] hover:text-black"
                          : lightEditorial
                            ? "text-black opacity-52 hover:border-black/25 hover:opacity-100"
                            : "text-foreground opacity-55 hover:border-white/20 hover:opacity-100",
                ].join(" ")}
              >
                {exploreEntry && !active ? (
                  <span
                    className={[
                      "h-1 w-1 rounded-full",
                      today ? "bg-white" : "bg-[#3150ff]",
                    ].join(" ")}
                    aria-hidden
                  />
                ) : null}
                <span className="sm:hidden">{item.short}</span>
                <span className="hidden sm:inline">{item.label}</span>
                {active ? (
                  <span
                    className={[
                      "absolute inset-x-2 -bottom-[5px] h-[2px]",
                      today ? "bg-white" : project || lightEditorial ? "bg-[#3150ff]" : "bg-cyan-300",
                    ].join(" ")}
                    aria-hidden
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
