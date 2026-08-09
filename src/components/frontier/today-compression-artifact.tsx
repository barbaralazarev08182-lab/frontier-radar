"use client";

import type { CSSProperties } from "react";

interface TodayCompressionArtifactProps {
  totalDiscoveries: number;
  dateLabel: string;
}

const SHEETS = [
  { index: "07", kind: "pearl" },
  { index: "06", kind: "silver" },
  { index: "05", kind: "candy" },
  { index: "04", kind: "pearl" },
  { index: "03", kind: "holo" },
  { index: "02", kind: "silver" },
  { index: "01", kind: "pearl" },
] as const;

export function TodayCompressionArtifact({
  totalDiscoveries,
  dateLabel,
}: TodayCompressionArtifactProps) {
  return (
    <section className="today-compression-artifact" aria-hidden="true">
      <div className="today-compression-shadow" />

      <div className="today-compression-stack">
        {SHEETS.map((sheet, sheetIndex) => (
          <div
            key={sheet.index}
            className={`today-compression-sheet today-compression-sheet-${sheet.kind}`}
            style={{
              "--sheet-index": sheetIndex,
              "--sheet-depth": SHEETS.length - sheetIndex,
            } as CSSProperties}
          >
            <span className="today-compression-edge-index">{sheet.index}</span>
            <span className="today-compression-registration" />
          </div>
        ))}

        <div className="today-compression-cover">
          <div className="today-compression-cover-film" />
          <div className="today-compression-cover-sheen" />

          <header className="today-compression-cover-head">
            <div>
              <strong>FR / DAILY BRIEF</strong>
              <span>FRONTIER RADAR</span>
              <span>INTELLIGENCE DOSSIER</span>
            </div>
            <span>{dateLabel}</span>
          </header>

          <div className="today-compression-flow">
            <div className="today-compression-flow-node">
              <strong>{totalDiscoveries}</strong>
              <span>SCANNED</span>
            </div>
            <i>↓</i>
            <div className="today-compression-flow-node">
              <strong>07</strong>
              <span>SELECTED</span>
            </div>
          </div>

          <div className="today-compression-core">
            <span className="today-compression-crop today-compression-crop-tl" />
            <span className="today-compression-crop today-compression-crop-tr" />
            <span className="today-compression-crop today-compression-crop-bl" />
            <span className="today-compression-crop today-compression-crop-br" />
            <strong>07</strong>
            <span>DAILY BRIEF</span>
            <em>SELECTED INTELLIGENCE</em>
          </div>

          <footer className="today-compression-cover-foot">
            <div>
              <strong>COMPRESSION ARTIFACT</strong>
              <span>7-LAYER DOSSIER</span>
              <span>LAMINATED / VERIFIED / READY</span>
            </div>
            <div>
              <strong>FR / 07 / 01</strong>
              <span>{totalDiscoveries} → 07 → 01</span>
              <span>DAILY RADAR INTERNAL</span>
            </div>
          </footer>
        </div>
      </div>
    </section>
  );
}
