/**
 * HuggingFace Hub 内容发现（阶段 1.3）。
 *
 * 遍历 Models / Datasets / Spaces 三类查询组，调用 HF API 获取内容列表，
 * 按类型内部去重，返回标准化结果。
 *
 * 不写数据库；由 collector.ts 负责持久化。
 */
import type { HFClient } from "@/lib/huggingface/client";
import type {
  HFDataset,
  HFModel,
  HFSpace,
  HFContentType,
} from "@/lib/huggingface/types";
import { normalizeHFItem, type NormalizedHFItem } from "./normalize";
import type { HFDiscoveryGroup } from "@/config/huggingface-discovery";
import { HF_DISCOVERY_GROUPS } from "@/config/huggingface-discovery";
import type { Logger } from "@/lib/logger";

export interface DiscoveredHFItem {
  normalized: NormalizedHFItem;
  /** 命中该内容的查询组 id 列表（去重后合并） */
  queryIds: string[];
}

export interface DiscoveryHFResult {
  models: DiscoveredHFItem[];
  datasets: DiscoveredHFItem[];
  spaces: DiscoveredHFItem[];
  /** 各类型发现总数（去重前） */
  totalDiscovered: { models: number; datasets: number; spaces: number };
  /** 各类型去重数 */
  deduplicated: { models: number; datasets: number; spaces: number };
  /** ETag 映射（按查询键，用于条件请求） */
  etags: Record<string, string | null>;
}

export interface DiscoverHFOptions {
  /** 兼容旧调用：每种类型的默认最大采集数量 */
  limitPerType: number;
  /** 科技项目发现模式下可单独控制各类型配额。 */
  modelLimit?: number;
  datasetLimit?: number;
  spaceLimit?: number;
  logger?: Logger;
  /** 可选：按查询键返回 ETag */
  getQueryEtag?: (queryKey: string) => Promise<string | null | string | null>;
}

/**
 * 构建查询参数。
 * Spaces 默认按 trendingScore，而不是 downloads：Frontier Radar 更关心
 * “现在出现了什么值得试玩的新应用”，而不是长期下载量最大的仓库。
 */
function buildQueryParams(
  group: HFDiscoveryGroup,
  limit: number,
  contentType: HFContentType
): Record<string, string> {
  const params: Record<string, string> = {
    sort: contentType === "space" ? "trendingScore" : "downloads",
    direction: "-1",
    limit: String(limit),
  };
  if (group.search) params.search = group.search;
  for (const f of group.filters ?? []) {
    if (!params.filter) params.filter = f;
  }
  return params;
}

/** 发现指定类型的内容。 */
async function discoverType<T extends HFModel | HFDataset | HFSpace>(
  client: HFClient,
  contentType: HFContentType,
  groups: HFDiscoveryGroup[],
  limitPerType: number,
  normalizeFn: (raw: T, ct: HFContentType) => NormalizedHFItem,
  opts: DiscoverHFOptions
): Promise<{ items: DiscoveredHFItem[]; totalDiscovered: number; etags: Record<string, string | null> }> {
  const byId = new Map<string, DiscoveredHFItem>();
  let totalDiscovered = 0;
  const etags: Record<string, string | null> = {};
  const logger = opts.logger ?? { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} };

  for (const group of groups) {
    if (!group.enabled) continue;

    const params = buildQueryParams(group, limitPerType, contentType);
    const queryKey = `${contentType}::${group.id}`;
    const etag = opts.getQueryEtag ? await opts.getQueryEtag(queryKey) : null;

    try {
      let res;
      switch (contentType) {
        case "model":
          res = await client.listModels(params, etag);
          break;
        case "dataset":
          res = await client.listDatasets(params, etag);
          break;
        case "space":
          res = await client.listSpaces(params, etag);
          break;
      }

      etags[queryKey] = res.etag;

      if (res.notModified) {
        logger.info("hf.discover.not_modified", { query_key: queryKey });
        continue;
      }

      const items = res.data as unknown as T[];
      for (const raw of items) {
        totalDiscovered++;
        const normalized = normalizeFn(raw, contentType);
        const existing = byId.get(normalized.sourceItemId);
        if (existing) {
          if (!existing.queryIds.includes(group.id)) existing.queryIds.push(group.id);
          continue;
        }
        byId.set(normalized.sourceItemId, {
          normalized,
          queryIds: [group.id],
        });
      }

      if (byId.size >= limitPerType) break;
    } catch (err) {
      logger.warn("hf.discover.group_error", {
        query_key: queryKey,
        error: err instanceof Error ? err.message : String(err),
      });
      continue;
    }
  }

  return {
    items: [...byId.values()].slice(0, limitPerType),
    totalDiscovered,
    etags,
  };
}

/** 主发现函数：遍历三种类型，返回全部结果。 */
export async function discoverHFContent(
  client: HFClient,
  opts: DiscoverHFOptions
): Promise<DiscoveryHFResult> {
  const modelGroups = HF_DISCOVERY_GROUPS.models ?? [];
  const datasetGroups = HF_DISCOVERY_GROUPS.datasets ?? [];
  const spaceGroups = HF_DISCOVERY_GROUPS.spaces ?? [];
  const modelLimit = Math.max(0, opts.modelLimit ?? opts.limitPerType);
  const datasetLimit = Math.max(0, opts.datasetLimit ?? opts.limitPerType);
  const spaceLimit = Math.max(0, opts.spaceLimit ?? opts.limitPerType);

  const [modelResult, datasetResult, spaceResult] = await Promise.all([
    modelLimit > 0
      ? discoverType<HFModel>(client, "model", modelGroups, modelLimit, (raw, ct) => normalizeHFItem(ct, raw), opts)
      : Promise.resolve({ items: [], totalDiscovered: 0, etags: {} }),
    datasetLimit > 0
      ? discoverType<HFDataset>(client, "dataset", datasetGroups, datasetLimit, (raw, ct) => normalizeHFItem(ct, raw), opts)
      : Promise.resolve({ items: [], totalDiscovered: 0, etags: {} }),
    spaceLimit > 0
      ? discoverType<HFSpace>(client, "space", spaceGroups, spaceLimit, (raw, ct) => normalizeHFItem(ct, raw), opts)
      : Promise.resolve({ items: [], totalDiscovered: 0, etags: {} }),
  ]);

  return {
    models: modelResult.items,
    datasets: datasetResult.items,
    spaces: spaceResult.items,
    totalDiscovered: {
      models: modelResult.totalDiscovered,
      datasets: datasetResult.totalDiscovered,
      spaces: spaceResult.totalDiscovered,
    },
    deduplicated: {
      models: modelResult.totalDiscovered - modelResult.items.length,
      datasets: datasetResult.totalDiscovered - datasetResult.items.length,
      spaces: spaceResult.totalDiscovered - spaceResult.items.length,
    },
    etags: { ...modelResult.etags, ...datasetResult.etags, ...spaceResult.etags },
  };
}
