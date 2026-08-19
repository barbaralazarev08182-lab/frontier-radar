import type { SupabaseClient } from "@supabase/supabase-js";

export interface NewAiUsageEvent {
  analysis_id: string;
  item_id: string;
  source: string;
  provider: string;
  model: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  /** Logical model completions: normally 1; 2 when JSON repair was required. */
  model_call_count: number;
  repair_count: number;
}

/**
 * Persist AI usage separately from the intelligence payload.
 * `analysis_id` is unique so retries in the application layer cannot double count one analysis.
 */
export async function insertAiUsageEvent(
  supabase: SupabaseClient,
  event: NewAiUsageEvent
): Promise<void> {
  const { error } = await supabase.from("ai_usage_events").insert(event);
  if (error) throw new Error(`写入 ai_usage_events 失败: ${error.message}`);
}
