"use client";

import Link from "next/link";

const NAV_ITEMS = [
  { href: "/today", label: "Today", short: "T" },
  { href: "/explore", label: "Explore", short: "E" },
  { href: "/saved", label: "Saved", short: "S" },
  { href: "/idea-lab", label: "Idea Lab", short: "I" },
] as const;

export function ProjectGate15BNav() {
  return (
    <header className="fr-site-nav" data-fr-tone="light" data-fr-position="fixed">
      <div className="fr-site-nav__inner">
        <div className="fr-nav-context">
          <Link href="/today" className="fr-brand" aria-label="Frontier Radar Today">
            <span className="fr-brand__mark" aria-hidden />
            <span className="fr-brand__label">Frontier Radar</span>
          </Link>
          <div className="fr-surface-identity" aria-label="PROJECT workspace">
            <span className="fr-surface-identity__index">03</span>
            <strong>PROJECT</strong>
            <span className="fr-surface-identity__descriptor">INTELLIGENCE</span>
          </div>
        </div>

        <nav className="fr-primary-nav" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="fr-primary-nav__link">
              <span className="sm:hidden">{item.short}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
