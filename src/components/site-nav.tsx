import Link from "next/link";

const NAV_ITEMS = [
  { href: "/today", label: "Today" },
  { href: "/explore", label: "Explore" },
  { href: "/saved", label: "Saved" },
  { href: "/idea-lab", label: "Idea Lab" },
];

/**
 * 基础导航（阶段 1.1 占位，非最终视觉设计）。
 * Server Component：静态链接，不做交互态。
 */
export function SiteNav() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/today" className="text-base font-semibold tracking-tight">
          Frontier Radar
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
