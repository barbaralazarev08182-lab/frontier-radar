/**
 * 稳定哈希工具（阶段 1.2）。
 *
 * 用于 raw_items.payload_hash，判断同一 source_item_id 的 payload 是否变化。
 * 采用 key 排序后的 JSON 序列化 + SHA-256，保证跨平台 / 跨运行稳定。
 */
import { createHash } from "node:crypto";

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const parts = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`);
  return `{${parts.join(",")}}`;
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** 计算原始 payload 指纹（用于去重与变更检测）。 */
export function computePayloadHash(payload: unknown): string {
  return sha256Hex(stableStringify(payload));
}
