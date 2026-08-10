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
  const immersive = today || project;
  const lightEditorial = explore;

  return (
    <header
      className={[
        "inset-x-0 top-0 z-[120] transition-colors",
        immersive
          ? "pointer-events-none fixed border-transparent bg-transparent text-white mix-blend-difference"
          : lightEditorial
            ? "sticky border-b border-black/10 bg-[#f3f0e7]/92 text-[#111214] backdrop-blur-lg"
            : "sticky border-b border-white/[0.06] bg-background/82 text-foreground backdrop-blur-xl",
      ].join(" ")}
    >
      <div
        className={[
          "relative flex w-full items-center justify-between gap-5 px-4 sm:px-7 lg:px-10",
          today ? "min-h-0 justify-end pt-[3.35rem]" : "min-h-14 py-2.5",
        ].join(" ")}
      >
        {!today ? (
          <Link
            href="/today"
            className="pointer-events-auto group flex min-w-0 items-center gap-2.5"
            aria-label="Frontier Radar Today"
          >
            <span
              className={[
                "relative grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-transform duration-300 group-hover:rotate-12",
                project ? "border-white/55" : lightEditorial ? "border-black/35" : "border-white/35",
              ].join(" ")}
            >
              <span
                className={[
                  "h-1.5 w-1.5 rounded-full",
                  project ? "bg-white" : lightEditorial ? "bg-[#3150ff]" : "bg-cyan-300",
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
            "pointer-events-auto flex items-center gap-1 border-y px-1 py-1 font-mono uppercase backdrop-blur-[2px]",
            immersive
              ? "border-white/35"
              : lightEditorial
                ? "border-black/20"
                : "border-white/15",
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
                    ? immersive
                      ? "border-white/70 text-white"
                      : lightEditorial
                        ? "border-black/60 text-black"
                        : "border-white/55 text-foreground"
                    : exploreEntry
                      ? immersive
                        ? "text-white opacity-90 hover:border-white/50"
                        : lightEditorial
                          ? "text-[#2147e8] opacity-100 hover:border-[#3150ff]/45"
                          : "text-cyan-200 opacity-100 hover:border-cyan-300/35"
                      : immersive
                        ? "text-white opacity-58 hover:border-white/35 hover:opacity-100"
                        : lightEditorial
                          ? "text-black opacity-52 hover:border-black/25 hover:opacity-100"
                          : "text-foreground opacity-55 hover:border-white/20 hover:opacity-100",
                ].join(" ")}
              >
                {exploreEntry && !active ? (
                  <span
                    className={[
                      "h-1 w-1 rounded-full",
                      immersive ? "bg-white" : lightEditorial ? "bg-[#3150ff]" : "bg-cyan-300",
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
                      immersive ? "bg-white" : lightEditorial ? "bg-[#3150ff]" : "bg-cyan-300",
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
