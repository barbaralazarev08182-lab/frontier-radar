import type { ChatMessage, TokenUsage } from "./types";
import { TokenHubClient } from "./tokenhub-client";
import {
  DAILY_SYNTHESIS_PROMPT_VERSION,
  DAILY_SYNTHESIS_SCHEMA_VERSION,
  computeDailySelectionHash,
  isDailySynthesisSnapshot,
  type DailySynthesisPattern,
  type DailySynthesisSignalInput,
  type DailySynthesisSnapshot,
  type SynthesisFormation,
} from "./daily-synthesis";

interface GeneratedPattern {
  formation: SynthesisFormation;
  title: string;
  short: string;
  summary: string;
  why: string;
  signalIds: string[];
  confidence: number;
}

export interface GenerateDailySynthesisOutput {
  snapshot: DailySynthesisSnapshot;
  tokenUsage: TokenUsage | null;
  latencyMs: number;
  promptVersion: typeof DAILY_SYNTHESIS_PROMPT_VERSION;
}

export class DailySynthesisValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DailySynthesisValidationError";
  }
}

function stripCodeFence(content: string): string {
  const trimmed = content.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match?.[1]?.trim() ?? trimmed;
}

function parseGeneratedPatterns(content: string, selectedSignalIds: string[]): GeneratedPattern[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(content));
  } catch {
    throw new DailySynthesisValidationError("daily synthesis 不是合法 JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new DailySynthesisValidationError("daily synthesis 顶层必须是对象");
  }

  const rawPatterns = (parsed as { patterns?: unknown }).patterns;
  if (!Array.isArray(rawPatterns) || rawPatterns.length < 1 || rawPatterns.length > 3) {
    throw new DailySynthesisValidationError("patterns 必须包含 1 到 3 个方向");
  }

  const selected = new Set(selectedSignalIds);
  const patterns: GeneratedPattern[] = rawPatterns.map((value, index) => {
    if (!value || typeof value !== "object") {
      throw new DailySynthesisValidationError(`pattern ${index + 1} 不是对象`);
    }
    const p = value as Partial<GeneratedPattern>;
    if (
      (p.formation !== "strong" && p.formation !== "emerging" && p.formation !== "novel") ||
      typeof p.title !== "string" ||
      p.title.trim().length < 8 ||
      typeof p.short !== "string" ||
      p.short.trim().length < 2 ||
      typeof p.summary !== "string" ||
      p.summary.trim().length < 12 ||
      typeof p.why !== "string" ||
      p.why.trim().length < 12 ||
      !Array.isArray(p.signalIds) ||
      p.signalIds.length < 1 ||
      !p.signalIds.every((id) => typeof id === "string" && selected.has(id)) ||
      typeof p.confidence !== "number" ||
      !Number.isFinite(p.confidence) ||
      p.confidence < 0 ||
      p.confidence > 1
    ) {
      throw new DailySynthesisValidationError(`pattern ${index + 1} 不符合契约`);
    }

    return {
      formation: p.formation,
      title: p.title.trim(),
      short: p.short.trim(),
      summary: p.summary.trim(),
      why: p.why.trim(),
      signalIds: p.signalIds,
      confidence: p.confidence,
    };
  });

  const evidence = patterns.flatMap((pattern) => pattern.signalIds);
  if (evidence.length !== selectedSignalIds.length || new Set(evidence).size !== evidence.length) {
    throw new DailySynthesisValidationError("7 条 signal 必须被恰好分配一次，不能遗漏或重复");
  }
  if (!evidence.every((id) => selected.has(id))) {
    throw new DailySynthesisValidationError("evidence 包含未选中的 signal");
  }

  return patterns;
}

function formatSignals(signals: DailySynthesisSignalInput[]): string {
  return signals
    .map((signal) => {
      const lines = [
        `ID: ${signal.id}`,
        `RANK: ${String(signal.rank).padStart(2, "0")}`,
        `LANE: ${signal.lane}`,
        `TITLE: ${signal.title}`,
        `SUMMARY: ${signal.summary}`,
        `TAGS: ${signal.tags.join(", ") || "none"}`,
        `WHY_NOW: ${signal.whyNow ?? "unknown"}`,
        `FR_SCORE: ${signal.score ?? "unknown"}`,
      ];
      return lines.join("\n");
    })
    .join("\n\n---\n\n");
}

function buildMessages(signals: DailySynthesisSignalInput[]): ChatMessage[] {
  const system = `You are the synthesis engine for Frontier Radar, an AI frontier intelligence product.\n\nYour job is not to summarize seven items one by one. Infer the smallest set of 1-3 higher-order directions that explains what these signals add up to.\n\nRules:\n- Every supplied signal ID must appear in exactly one pattern.signalIds array.\n- Never invent signal IDs, facts, metrics, momentum, novelty scores, sources, or dates.\n- A pattern title must be a strong analytical claim, not a category label.\n- short must be a compact 2-5 word interface label.\n- summary explains the shared movement in one concise sentence.\n- why explains why this direction matters structurally, not why one item is interesting.\n- formation is strong when several signals clearly reinforce one structure; emerging when evidence is sparse or early; novel when the cluster is unusually experimental or interface/product-form driven.\n- confidence is 0..1 and reflects confidence in the grouping, not business importance.\n- Keep claims conservative enough to be supported by the provided text.\n\nReturn JSON only with this shape:\n{"patterns":[{"formation":"strong|emerging|novel","title":"...","short":"...","summary":"...","why":"...","signalIds":["..."],"confidence":0.0}]}`;

  const user = `Synthesize these ${signals.length} selected signals into 1-3 directions.\n\n${formatSignals(signals)}`;
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

function buildRepairMessages(
  signals: DailySynthesisSignalInput[],
  invalidOutput: string,
  reason: string
): ChatMessage[] {
  return [
    ...buildMessages(signals),
    { role: "assistant", content: invalidOutput.slice(0, 12_000) },
    {
      role: "user",
      content: `The previous output failed validation: ${reason}. Return corrected JSON only. Preserve evidence grounding and assign every supplied signal ID exactly once.`,
    },
  ];
}

function buildSnapshot(
  editionDate: string,
  signals: DailySynthesisSignalInput[],
  generated: GeneratedPattern[]
): DailySynthesisSnapshot {
  const signalIds = signals.map((signal) => signal.id);
  const selectionHash = computeDailySelectionHash(signalIds);
  const patterns: DailySynthesisPattern[] = generated.map((pattern, index) => ({
    id: `p${index + 1}`,
    index: String(index + 1).padStart(2, "0"),
    ...pattern,
  }));

  const snapshot: DailySynthesisSnapshot = {
    schemaVersion: DAILY_SYNTHESIS_SCHEMA_VERSION,
    editionDate,
    selectionHash,
    signalIds,
    patterns,
  };

  if (!isDailySynthesisSnapshot(snapshot)) {
    throw new DailySynthesisValidationError("生成后的 daily synthesis snapshot 未通过最终校验");
  }
  return snapshot;
}

export async function generateDailySynthesis(
  client: TokenHubClient,
  params: { editionDate: string; signals: DailySynthesisSignalInput[] }
): Promise<GenerateDailySynthesisOutput> {
  if (params.signals.length < 1 || params.signals.length > 7) {
    throw new DailySynthesisValidationError("daily synthesis 需要 1 到 7 条 signal");
  }
  if (new Set(params.signals.map((signal) => signal.id)).size !== params.signals.length) {
    throw new DailySynthesisValidationError("signal IDs 不能重复");
  }

  const started = Date.now();
  let response = await client.chatCompletion(buildMessages(params.signals), { temperature: 0.15 });
  let generated: GeneratedPattern[];

  try {
    generated = parseGeneratedPatterns(response.content, params.signals.map((signal) => signal.id));
  } catch (error) {
    if (!(error instanceof DailySynthesisValidationError)) throw error;
    response = await client.chatCompletion(
      buildRepairMessages(params.signals, response.content, error.message),
      { temperature: 0.05 }
    );
    generated = parseGeneratedPatterns(response.content, params.signals.map((signal) => signal.id));
  }

  return {
    snapshot: buildSnapshot(params.editionDate, params.signals, generated),
    tokenUsage: response.tokenUsage,
    latencyMs: Date.now() - started,
    promptVersion: DAILY_SYNTHESIS_PROMPT_VERSION,
  };
}
