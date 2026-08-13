"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PersonalMemoryNavTools } from "@/components/personal-memory-nav-tools";

const NAV_ITEMS = [
  { href: "/today", label: "Today", short: "T" },
  { href: "/explore", label: "Explore", short: "E" },
  { href: "/saved", label: "Saved", short: "S" },
  { href: "/idea-lab", label: "Idea Lab", short: "I" },
];

function surfaceIdentity(pathname: string) {
  if (pathname.startsWith("/project/")) return { index: "03", label: "PROJECT", descriptor: "INTELLIGENCE" };
  if (pathname === "/explore" || pathname.startsWith("/explore/")) return { index: "02", label: "EXPLORE", descriptor: "FRONTIER FIELD" };
  if (pathname === "/saved" || pathname.startsWith("/saved/")) return { index: "04", label: "SAVED", descriptor: "RESEARCH SHELF" };
  if (pathname === "/idea-lab" || pathname.startsWith("/idea-lab/")) return { index: "05", label: "IDEA LAB", descriptor: "DIRECTION WORKBENCH" };
  return { index: "01", label: "TODAY", descriptor: "DAILY DISCOVERY" };
}

export function SiteNav() {
  const pathname = usePathname();
  const today = pathname === "/today";
  const project = pathname.startsWith("/project/");
  const memorySurface = pathname === "/saved" || pathname.startsWith("/idea-lab");
  const tone = today ? "overlay" : memorySurface ? "dark" : "light";
  const position = today || project ? "fixed" : "sticky";
  const surface = surfaceIdentity(pathname);

  return (
    <header className="fr-site-nav" data-fr-tone={tone} data-fr-position={position}>
      <div className="fr-site-nav__inner">
        <div className="fr-nav-context">
          <Link href="/today" className="fr-brand" aria-label="Frontier Radar Today">
            <span className="fr-brand__mark" aria-hidden />
            <span className="fr-brand__label">Frontier Radar</span>
          </Link>
          <div className="fr-surface-identity" aria-label={`${surface.label} workspace`}>
            <span className="fr-surface-identity__index">{surface.index}</span>
            <strong>{surface.label}</strong>
            <span className="fr-surface-identity__descriptor">{surface.descriptor}</span>
          </div>
        </div>

        <nav className="fr-primary-nav" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || (item.href !== "/today" && pathname.startsWith(`${item.href}/`));
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className="fr-primary-nav__link">
                <span className="sm:hidden">{item.short}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
          {memorySurface ? <PersonalMemoryNavTools /> : null}
        </nav>
      </div>
    </header>
  );
}
