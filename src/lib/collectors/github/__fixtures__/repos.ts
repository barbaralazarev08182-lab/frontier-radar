/**
 * GitHub API 脱敏固定 fixture（阶段 1.2）。
 * 全部为虚构数据，不含真实 Token / Header / 用户私人数据。
 */
import type { GitHubRepo } from "@/lib/github/types";

export const OWNER_ALICE = {
  login: "alice",
  id: 11,
  type: "User",
  avatar_url: "https://avatars.example.com/11",
  html_url: "https://github.com/alice",
};

export const OWNER_BOB = {
  login: "bob",
  id: 22,
  type: "User",
  avatar_url: "https://avatars.example.com/22",
  html_url: "https://github.com/bob",
};

/** 基础仓库：字段齐全，用于标准化测试。 */
export const repoAgent: GitHubRepo = {
  id: 1001,
  node_id: "MDEwOlJlcG9zaXRvcnkxMDAx",
  name: "awesome-agent",
  full_name: "alice/awesome-agent",
  private: false,
  owner: OWNER_ALICE,
  html_url: "https://github.com/alice/awesome-agent",
  description: "An AI agent framework",
  fork: false,
  archived: false,
  disabled: false,
  visibility: "public",
  homepage: "https://agent.example.com",
  language: "TypeScript",
  default_branch: "main",
  created_at: "2026-08-01T10:00:00Z",
  updated_at: "2026-08-05T12:00:00Z",
  pushed_at: "2026-08-05T12:00:00Z",
  stargazers_count: 128,
  watchers_count: 128,
  forks_count: 12,
  open_issues_count: 5,
  subscribers_count: 30,
  size: 2048,
  topics: ["AI", "agent", "LLM", "agent"],
  license: { key: "mit", name: "MIT License", spdx_id: "MIT", url: null },
  has_issues: true,
  has_projects: true,
  has_wiki: false,
  has_pages: true,
  has_discussions: true,
};

/** 改名 + 转移所有者：数字 id 仍为 1001，full_name/name 变化。 */
export const repoAgentRenamed: GitHubRepo = {
  ...repoAgent,
  name: "awesome-agent-v2",
  full_name: "bob/awesome-agent-v2",
  owner: OWNER_BOB,
  html_url: "https://github.com/bob/awesome-agent-v2",
  pushed_at: "2026-08-06T09:00:00Z",
};

/** 极简仓库：大量字段为 null，用于空值处理测试。 */
export const repoMinimal: GitHubRepo = {
  id: 2002,
  name: "min-repo",
  full_name: "x/min-repo",
  private: false,
  owner: { login: "x", id: 33, type: "User" },
  html_url: "https://github.com/x/min-repo",
  description: null,
  fork: false,
  archived: false,
  visibility: "public",
  homepage: null,
  language: null,
  created_at: "2026-08-03T00:00:00Z",
  updated_at: "2026-08-03T00:00:00Z",
  pushed_at: "2026-08-03T00:00:00Z",
  stargazers_count: 0,
  watchers_count: 0,
  forks_count: 0,
  open_issues_count: 0,
  // subscribers_count 故意省略（搜索结果不含该字段）
  size: 1,
  // topics 故意省略
  license: null,
  // has_issues / has_discussions / has_wiki / has_pages 故意省略
};

/** 第二个独立仓库，用于多查询去重测试。 */
export const repoVision: GitHubRepo = {
  id: 3003,
  name: "vision-toolkit",
  full_name: "alice/vision-toolkit",
  private: false,
  owner: OWNER_ALICE,
  html_url: "https://github.com/alice/vision-toolkit",
  description: "Computer vision toolkit",
  fork: false,
  archived: false,
  visibility: "public",
  homepage: null,
  language: "Python",
  default_branch: "main",
  created_at: "2026-08-02T08:00:00Z",
  updated_at: "2026-08-04T08:00:00Z",
  pushed_at: "2026-08-04T08:00:00Z",
  stargazers_count: 256,
  watchers_count: 256,
  forks_count: 20,
  open_issues_count: 3,
  subscribers_count: 40,
  size: 4096,
  topics: ["computer-vision", "cv", "deep-learning"],
  license: { key: "apache-2.0", name: "Apache License 2.0", spdx_id: "Apache-2.0", url: null },
  has_issues: true,
  has_discussions: false,
  has_wiki: true,
  has_pages: false,
};
