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
  const editorial = pathname === "/today" || project;

  return (
    <header
      className={[
        "sticky top-0 z-50 border-b transition-colors",
        project
          ? "border-transparent bg-transparent text-white mix-blend-difference"
          : editorial
            ? "border-black/10 bg-[#f1eee5]/88 text-[#0b0b0b] backdrop-blur-xl"
            : "border-white/[0.06] bg-background/82 text-foreground backdrop-blur-xl",
      ].join(" ")}
    >
      <div className="flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-7 lg:px-10">
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

        <nav className="flex items-center gap-3 sm:gap-6">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== "/today" && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "relative py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition-opacity",
                  active ? "opacity-100" : "opacity-55 hover:opacity-100",
                ].join(" ")}
              >
                <span className="sm:hidden">{item.short}</span>
                <span className="hidden sm:inline">{item.label}</span>
                {active ? (
                  <span
                    className={[
                      "absolute inset-x-0 -bottom-[0.84rem] h-[2px]",
                      project ? "bg-white" : editorial ? "bg-[#3150ff]" : "bg-cyan-300",
                    ].join(" ")}
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
