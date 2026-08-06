/**
 * GitHub 仓库标准化（阶段 1.2）。
 *
 * 关键约定：
 *  - 稳定来源 ID 使用 GitHub 数字仓库 id（不是 owner/name），
 *    改名 / 转移所有者时 source_item_id 不变。
 *  - 缺失字段一律使用 null，禁止编造默认值。
 *  - watchers_count 与 stargazers_count 在 GitHub 上对仓库等同，
 *    两者都如实记录，但不互为独立热度指标（评分阶段另行处理）。
 *  - open_issues_count 包含 Pull Requests，如实记录，不解释为纯 Issue 数。
 *  - Topics 统一小写、去重、去空。
 *  - License 缺失或无法识别（NOASSERTION）记为 null。
 */
import type { SourceSlug } from "@/lib/types";
import type { GitHubRepo } from "@/lib/github/types";
import { computePayloadHash } from "@/lib/hash";

export const GITHUB_SOURCE: SourceSlug = "github";

export interface NormalizedRepo {
  sourceItemId: string; // String(repo.id)
  dedupeKey: string; // `${slug}:${repo.id}`
  itemType: "repo";
  title: string;
  canonicalUrl: string; // html_url
  description: string | null;
  author: string | null; // owner login
  ownerLogin: string | null;
  repositoryName: string;
  fullName: string;
  primaryLanguage: string | null;
  topics: string[]; // 已规范化（小写、去重）
  license: string | null; // spdx_id 或 null
  defaultBranch: string | null;
  homepageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  archived: boolean | null;
  fork: boolean | null;
  visibility: string | null;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  subscribers: number | null;
  repositorySize: number | null;
  hasIssues: boolean | null;
  hasDiscussions: boolean | null;
  hasWiki: boolean | null;
  hasPages: boolean | null;
  rawPayload: Record<string, unknown>;
  payloadHash: string;
}

/** 规范化 topics：小写、trim、去重、去空。 */
export function normalizeTopics(topics: string[] | undefined): string[] {
  if (!Array.isArray(topics)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of topics) {
    const norm = String(t).trim().toLowerCase();
    if (!norm) continue;
    if (seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm);
  }
  return out;
}

/** 解析 License：缺失或 NOASSERTION 记 null。 */
function normalizeLicense(repo: GitHubRepo): string | null {
  const spdx = repo.license?.spdx_id;
  if (!spdx || spdx === "NOASSERTION") return null;
  return spdx;
}

/** 将 GitHub 仓库对象标准化为内部规范结构。 */
export function normalizeRepo(
  repo: GitHubRepo,
  slug: SourceSlug = GITHUB_SOURCE
): NormalizedRepo {
  const sourceItemId = String(repo.id);
  const ownerLogin = repo.owner?.login ?? null;
  const rawPayload = repo as unknown as Record<string, unknown>;
  return {
    sourceItemId,
    dedupeKey: `${slug}:${sourceItemId}`,
    itemType: "repo",
    title: repo.name,
    canonicalUrl: repo.html_url,
    description: repo.description && repo.description.trim() ? repo.description : null,
    author: ownerLogin,
    ownerLogin,
    repositoryName: repo.name,
    fullName: repo.full_name,
    primaryLanguage: repo.language ?? null,
    topics: normalizeTopics(repo.topics),
    license: normalizeLicense(repo),
    defaultBranch: repo.default_branch ?? null,
    homepageUrl: repo.homepage && repo.homepage.trim() ? repo.homepage : null,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
    archived: repo.archived ?? null,
    fork: repo.fork ?? null,
    visibility: repo.visibility ?? null,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    watchers: repo.watchers_count,
    openIssues: repo.open_issues_count,
    subscribers: repo.subscribers_count ?? null,
    repositorySize: repo.size ?? null,
    hasIssues: repo.has_issues ?? null,
    hasDiscussions: repo.has_discussions ?? null,
    hasWiki: repo.has_wiki ?? null,
    hasPages: repo.has_pages ?? null,
    rawPayload,
    payloadHash: computePayloadHash(rawPayload),
  };
}

/** 从原始 GitHub 仓库对象计算 payload_hash（供去重比较）。 */
export function repoPayloadHash(repo: GitHubRepo): string {
  return computePayloadHash(repo as unknown as Record<string, unknown>);
}
