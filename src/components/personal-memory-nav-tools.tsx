"use client";

import { Download, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import {
  buildPersonalMemoryBackupJson,
  importPersonalMemoryBackupJson,
} from "@/lib/personal-memory/browser";
import {
  parsePersonalMemoryBackup,
  type PersonalMemoryBackupV1,
  type PersonalMemoryImportMode,
} from "@/lib/personal-memory/contract";

interface PendingImport {
  raw: string;
  backup: PersonalMemoryBackupV1;
  fileName: string;
}

type Feedback =
  | { kind: "success"; text: string }
  | { kind: "error"; text: string }
  | null;

function backupFileName(now = new Date()): string {
  return `frontier-radar-backup-${now.toISOString().slice(0, 10)}.json`;
}

function formatExportedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "UNKNOWN DATE";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(date)
    .toUpperCase();
}

export function PersonalMemoryNavTools() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [replaceArmed, setReplaceArmed] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  function exportBackup() {
    try {
      const raw = buildPersonalMemoryBackupJson();
      const backup = parsePersonalMemoryBackup(raw);
      const blob = new Blob([raw], { type: "application/json;charset=utf-8" });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = backupFileName();
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);
      setFeedback({
        kind: "success",
        text: `EXPORTED ${backup.savedItems.length} SAVED`,
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message.toUpperCase() : "EXPORT FAILED",
      });
    }
  }

  async function chooseImport(file: File | null) {
    if (!file) return;
    setFeedback(null);
    setReplaceArmed(false);

    try {
      const raw = await file.text();
      const backup = parsePersonalMemoryBackup(raw);
      setPending({ raw, backup, fileName: file.name });
    } catch (error) {
      setPending(null);
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message.toUpperCase() : "IMPORT FAILED",
      });
    }
  }

  function commitImport(mode: PersonalMemoryImportMode) {
    if (!pending) return;

    if (mode === "replace" && !replaceArmed) {
      setReplaceArmed(true);
      return;
    }

    try {
      const next = importPersonalMemoryBackupJson(pending.raw, mode);
      setFeedback({
        kind: "success",
        text: `${mode.toUpperCase()} COMPLETE · ${next.savedItems.length} SAVED`,
      });
      setPending(null);
      setReplaceArmed(false);
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message.toUpperCase() : "IMPORT FAILED",
      });
    }
  }

  function dismissPending() {
    setPending(null);
    setReplaceArmed(false);
  }

  return (
    <div className="relative flex items-center gap-1 border-l border-white/10 pl-1.5">
      <button
        type="button"
        onClick={exportBackup}
        className="inline-flex min-h-7 items-center gap-1.5 border border-transparent px-2 text-[8px] font-extrabold tracking-[0.12em] text-foreground/55 transition hover:border-white/20 hover:text-foreground sm:px-2.5 sm:text-[9px]"
        aria-label="Export local Frontier Radar backup"
      >
        <Download className="h-3 w-3" aria-hidden />
        <span className="hidden lg:inline">EXPORT</span>
      </button>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex min-h-7 items-center gap-1.5 border border-[#5366ff]/45 bg-[#5366ff]/10 px-2 text-[8px] font-extrabold tracking-[0.12em] text-[#9da7ff] transition hover:border-[#8490ff] hover:bg-[#5366ff]/20 sm:px-2.5 sm:text-[9px]"
        aria-label="Import local Frontier Radar backup"
      >
        <Upload className="h-3 w-3" aria-hidden />
        <span className="hidden lg:inline">IMPORT</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0] ?? null;
          void chooseImport(file);
          event.currentTarget.value = "";
        }}
      />

      {pending ? (
        <div
          className="fixed right-4 top-[4.4rem] z-[140] w-[min(23rem,calc(100vw-2rem))] border border-white/20 bg-[#090e16]/96 p-3 text-left text-[#f0eee8] shadow-[0_1.2rem_3rem_rgba(0,0,0,.46)] backdrop-blur-xl sm:right-7"
          role="dialog"
          aria-label="Confirm personal memory import"
        >
          <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-2.5">
            <div className="min-w-0 font-mono uppercase tracking-[0.11em]">
              <span className="block text-[8px] font-black text-[#8490ff]">PERSONAL MEMORY / IMPORT</span>
              <strong className="mt-1 block truncate text-[10px] text-white">{pending.fileName}</strong>
            </div>
            <button
              type="button"
              onClick={dismissPending}
              className="grid h-7 w-7 shrink-0 place-items-center border border-white/10 text-white/50 transition hover:border-white/30 hover:text-white"
              aria-label="Cancel import"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>

          <div className="grid grid-cols-2 border-b border-white/10 font-mono uppercase tracking-[0.1em]">
            <div className="py-2.5 pr-2">
              <span className="block text-[7px] text-white/35">Saved</span>
              <strong className="mt-1 block text-sm text-white">{pending.backup.savedItems.length}</strong>
            </div>
            <div className="border-l border-white/10 pl-2 py-2.5">
              <span className="block text-[7px] text-white/35">Version</span>
              <strong className="mt-1 block text-sm text-white">V{pending.backup.version}</strong>
            </div>
          </div>

          <p className="mt-2.5 font-mono text-[8px] uppercase leading-relaxed tracking-[0.09em] text-white/42">
            EXPORTED {formatExportedAt(pending.backup.exportedAt)}
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => commitImport("merge")}
              className="border border-[#8490ff]/65 bg-[#5366ff] px-3 py-2.5 font-mono text-[9px] font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#6273ff]"
            >
              MERGE BACKUP
            </button>
            <button
              type="button"
              onClick={() => commitImport("replace")}
              className={[
                "border px-3 py-2.5 font-mono text-[9px] font-black uppercase tracking-[0.12em] transition",
                replaceArmed
                  ? "border-[#ff744d] bg-[#ff5b21] text-white"
                  : "border-white/20 bg-white/[0.03] text-white/62 hover:border-[#ff744d]/60 hover:text-[#ff9a7b]",
              ].join(" ")}
            >
              {replaceArmed ? "CONFIRM REPLACE" : "REPLACE LOCAL"}
            </button>
          </div>

          <p className="mt-2.5 font-mono text-[7px] uppercase leading-relaxed tracking-[0.08em] text-white/32">
            MERGE KEEPS THE NEWER RECORD PER ID. REPLACE REMOVES LOCAL RECORDS NOT PRESENT IN THIS BACKUP.
          </p>
        </div>
      ) : null}

      {feedback ? (
        <div
          className={[
            "fixed right-4 top-[4.4rem] z-[139] max-w-[min(23rem,calc(100vw-2rem))] border bg-[#090e16]/94 px-3 py-2 font-mono text-[8px] font-black uppercase tracking-[0.1em] shadow-[0_.8rem_2rem_rgba(0,0,0,.34)] backdrop-blur-xl sm:right-7",
            feedback.kind === "success"
              ? "border-[#8490ff]/45 text-[#aab2ff]"
              : "border-[#ff744d]/55 text-[#ff9a7b]",
          ].join(" ")}
          role="status"
          aria-live="polite"
        >
          {feedback.text}
        </div>
      ) : null}
    </div>
  );
}
