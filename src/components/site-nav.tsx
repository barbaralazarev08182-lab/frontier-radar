"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PersonalMemoryNavTools } from "@/components/personal-memory-nav-tools";
import { ProjectGate15BNav } from "@/components/project-gate15b-nav";

const NAV_ITEMS = [
  { href: "/today", label: "Today", short: "T" },
  { href: "/explore", label: "Explore", short: "E" },
  { href: "/radar", label: "Radar", short: "R" },
  { href: "/saved", label: "Saved", short: "S" },
  { href: "/idea-lab", label: "Idea Lab", short: "I" },
];

function shouldEagerPrefetch(href: string) {
  return href === "/today" || href === "/explore" || href === "/radar";
}

export function SiteNav() {
  const pathname = usePathname();
  const today = pathname === "/today";
  const project = pathname.startsWith("/project/");
  const explore = pathname === "/explore" || pathname.startsWith("/explore/");
  const radar = pathname === "/radar" || pathname.startsWith("/radar/");
  const memorySurface = pathname === "/saved" || pathname.startsWith("/idea-lab");
  const lightEditorial = explore || radar;

  if (project) return <ProjectGate15BNav />;

  if (today) {
    return (
      <header className="fixed inset-x-0 top-0 z-[120] h-12 border-b border-black/[0.11] bg-[#f1eee5] text-[#111214]">
        <div className="flex h-full w-full items-center justify-between gap-6 px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-5">
            <Link href="/today" prefetch className="group flex min-w-0 items-center gap-2.5" aria-label="Frontier Radar Today">
              <span className="relative grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border border-black/35 transition-transform duration-300 group-hover:rotate-12">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3150ff]" />
              </span>
              <span className="truncate font-mono text-[10px] font-black uppercase tracking-[0.16em]">Frontier Radar</span>
            </Link>
            <div className="flex items-center gap-2.5 border-l border-black/15 pl-5 font-mono text-[9px] font-extrabold uppercase tracking-[0.12em]">
              <span className="grid h-6 min-w-6 place-items-center bg-[#3150ff] px-1.5 text-[8px] font-black tracking-[-0.02em] text-white">01</span>
              <strong className="text-[9px] font-black">Today</strong>
              <span className="hidden text-black/42 lg:inline">Daily Discovery</span>
            </div>
          </div>

          <nav className="flex items-center gap-5 font-mono text-[9px] font-extrabold uppercase tracking-[0.14em]" aria-label="Primary navigation">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || (item.href !== "/today" && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={shouldEagerPrefetch(item.href) ? true : undefined}
                  aria-current={active ? "page" : undefined}
                  className={active ? "text-black" : "text-black/48 transition-colors hover:text-black"}
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

  return (
    <header
      className={[
        "inset-x-0 top-0 z-[120] transition-colors",
        lightEditorial
          ? "sticky border-b border-black/10 bg-[#f3f0e7] text-[#111214] shadow-[0_1px_0_rgba(255,255,255,.6)]"
          : "sticky border-b border-white/[0.06] bg-background/82 text-foreground backdrop-blur-xl",
      ].join(" ")}
    >
      <div className="relative flex min-h-14 w-full items-center justify-between gap-5 px-4 py-2.5 sm:px-7 lg:px-10">
        <Link
          href="/today"
          prefetch
          className="pointer-events-auto group flex min-w-0 items-center gap-2.5"
          aria-label="Frontier Radar Today"
        >
          <span
            className={[
              "relative grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-transform duration-300 group-hover:rotate-12",
              lightEditorial ? "border-black/35" : "border-white/35",
            ].join(" ")}
          >
            <span className={["h-1.5 w-1.5 rounded-full", lightEditorial ? "bg-[#3150ff]" : "bg-cyan-300"].join(" ")} />
          </span>
          <span className="truncate font-mono text-[10px] font-black uppercase tracking-[0.16em] sm:text-[11px]">
            Frontier Radar
          </span>
        </Link>

        <nav
          className={[
            "pointer-events-auto flex items-center gap-1 px-1 py-1 font-mono uppercase",
            lightEditorial ? "border-y border-black/20 bg-white/30" : "border-y border-white/15 backdrop-blur-[2px]",
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
                prefetch={shouldEagerPrefetch(item.href) ? true : undefined}
                aria-current={active ? "page" : undefined}
                className={[
                  "group/nav relative inline-flex min-h-7 items-center justify-center gap-1.5 border border-transparent px-2.5 text-[9px] font-extrabold tracking-[0.12em] transition-all duration-180 sm:px-3 sm:text-[10px]",
                  active
                    ? lightEditorial
                      ? "border-black/60 bg-[#111317] text-white"
                      : "border-white/55 text-foreground"
                    : exploreEntry
                      ? lightEditorial
                        ? "text-[#2147e8] opacity-100 hover:border-[#3150ff]/45"
                        : "text-cyan-200 opacity-100 hover:border-cyan-300/35"
                      : lightEditorial
                        ? "text-black opacity-58 hover:border-black/25 hover:opacity-100"
                        : "text-foreground opacity-55 hover:border-white/20 hover:opacity-100",
                ].join(" ")}
              >
                {exploreEntry && !active ? (
                  <span className={["h-1 w-1 rounded-full", lightEditorial ? "bg-[#3150ff]" : "bg-cyan-300"].join(" ")} aria-hidden />
                ) : null}
                <span className="sm:hidden">{item.short}</span>
                <span className="hidden sm:inline">{item.label}</span>
                {active ? (
                  <span className={["absolute inset-x-2 -bottom-[5px] h-[2px]", lightEditorial ? "bg-[#3150ff]" : "bg-cyan-300"].join(" ")} aria-hidden />
                ) : null}
              </Link>
            );
          })}
          {memorySurface ? <PersonalMemoryNavTools /> : null}
        </nav>
      </div>
    </header>
  );
}
