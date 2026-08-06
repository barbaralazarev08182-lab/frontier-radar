/**
 * GitHub API 类型（阶段 1.2）。
 *
 * 仅声明采集器实际使用的字段；完整对象通过索引签名保留，原样存入 raw_items。
 * 不绑定任何第三方 SDK，纯数据结构。
 */
import type { GitHubRateLimit, RateLimitResource } from "./rate-limit";

export interface GitHubOwner {
  login: string;
  id: number;
  node_id?: string;
  avatar_url?: string;
  html_url?: string;
  type?: string;
}

export interface GitHubLicense {
  key?: string | null;
  name?: string | null;
  spdx_id?: string | null;
  url?: string | null;
}

/** GitHub 仓库对象（搜索结果项与仓库详情共用的子集） */
export interface GitHubRepo {
  id: number; // 数字仓库 id，作为稳定 source_item_id
  node_id?: string;
  name: string;
  full_name: string;
  private: boolean;
  owner?: GitHubOwner;
  html_url: string;
  description: string | null;
  fork: boolean;
  archived?: boolean;
  disabled?: boolean;
  visibility?: string; // "public" | "private"
  homepage: string | null;
  language: string | null;
  default_branch?: string;
  created_at: string; // ISO 8601
  updated_at: string;
  pushed_at: string;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  open_issues_count: number;
  subscribers_count?: number; // 完整仓库接口才有，搜索结果通常为 undefined
  size: number;
  topics?: string[]; // 搜索结果与仓库接口均可能包含
  license: GitHubLicense | null;
  has_issues?: boolean;
  has_projects?: boolean;
  has_wiki?: boolean;
  has_pages?: boolean;
  has_discussions?: boolean;
  // 保留其余字段，原样存入 raw_items.raw_payload
  [key: string]: unknown;
}

export interface GitHubSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepo[];
}

export interface GitHubReadmeResponse {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: string;
  content: string; // base64
  encoding: string; // "base64"
  _links?: Record<string, string>;
}

/** README 获取结果（内部统一结构） */
export interface ReadmeResult {
  exists: boolean;
  /** 解码后的文本（exists 为 true 时存在） */
  content?: string;
  /** 是否因超长被截断 */
  truncated?: boolean;
  /** 原始字节大小 */
  original_size?: number;
  etag?: string | null;
}

/** 统一请求响应封装 */
export interface GitHubResponse<T> {
  data: T;
  status: number;
  rateLimit: GitHubRateLimit | null;
  etag: string | null;
  lastModified: string | null;
  /** 条件请求命中（304） */
  notModified: boolean;
}

export type { GitHubRateLimit, RateLimitResource };
