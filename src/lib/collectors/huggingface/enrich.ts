/**
 * HuggingFace Hub Card / README enrichment（阶段 1.3）。
 *
 * 为已发现的 Model / Dataset / Space 获取 Card 内容（Model Card / Dataset Card / Space README），
 * 写入 item_documents 表。
 *
 * 只处理前 enrichLimit 条；Card 不存在时不失败，跳过即可。
 */
import type { HFClient } from "@/lib/huggingface/client";
import type { HFContentType, HFCardResponse } from "@/lib/huggingface/types";
import type { NormalizedHFItem } from "./normalize";
import type { Logger } from "@/lib/logger";

export interface EnrichedCard {
  /** 对应的 sourceItemId */
  sourceItemId: string;
  contentType: HFContentType;
  card: HFCardResponse | null; // null = 无 Card 或获取失败
}

export interface EnrichHFResult {
  cards: EnrichedCard[];
  fetched: number;
  notFound: number;
  errors: number;
}

/** Card 文档类型映射（对应 item_documents.document_type） */
export const CARD_DOCUMENT_TYPES: Record<HFContentType, string> = {
  model: "model_card",
  dataset: "dataset_card",
  space: "space_readme",
};

/**
 * 获取指定条目的 Card 内容。
 * 404 / 401 / 403 或其他错误不抛出，返回 null（Card 无法获取不是致命错误）。
 * revision 优先使用 API 返回的 sha，缺失时由客户端回退 "main"。
 */
async function fetchCard(
  client: HFClient,
  item: NormalizedHFItem
): Promise<HFCardResponse | null> {
  try {
    const res = await client.getCard(item.contentType, item.fullName, item.sha);
    if (res.notModified || !res.data.content) return null;
    return res.data;
  } catch {
    // Card 获取失败不阻断
    return null;
  }
}

/**
 * 批量 enrichment：为前 N 条内容获取 Card。
 */
export async function enrichHFCards(
  client: HFClient,
  items: NormalizedHFItem[],
  enrichLimit: number,
  logger?: Logger
): Promise<EnrichHFResult> {
  const log = logger ?? { info: () => {}, warn: () => {}, error: () => {} };
  const candidates = items.slice(0, enrichLimit);
  const cards: EnrichedCard[] = [];
  let fetched = 0;
  let notFound = 0;
  let errors = 0;

  for (const item of candidates) {
    try {
      const card = await fetchCard(client, item);
      if (card && card.content) {
        cards.push({ sourceItemId: item.sourceItemId, contentType: item.contentType, card });
        fetched++;
        log.info("hf.enrich.card_fetched", {
          source_item_id: item.sourceItemId,
          content_type: item.contentType,
          size: card.content.length,
        });
      } else {
        notFound++;
      }
    } catch (err) {
      errors++;
      log.warn("hf.enrich.card_error", {
        source_item_id: item.sourceItemId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { cards, fetched, notFound, errors };
}
