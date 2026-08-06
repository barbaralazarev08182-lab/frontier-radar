# 数据源接入说明（DATA-SOURCES）

> 阶段 1 仅接入 3 个源。所有采集器统一实现 `Collector` 接口（见 `src/lib/types/index.ts`），统一缓存 / 重试 / 限流策略。

## 0. 通用采集器契约

每个采集器必须：

- 声明 `source: SourceSlug`。
- 实现 `collect(): Promise<CollectorResult>`。
- 内置：指数退避重试（默认 3 次）、HTTP 缓存（ETag / Last-Modified 优先）、Rate Limit 余量感知。
- 每次运行写入一条 `collection_runs` 记录（状态、计数、错误、剩余配额、重置时间）。
- 产出写入 `raw_items`（不可变 raw_payload），再由归一化逻辑写入 `items` 与 `item_metrics_snapshot`。
- 失败不阻塞其他源；单条失败计入 `error_count` 但不中断整批。

## 1. GitHub REST API

- **Base URL**：`https://api.github.com`
- **鉴权**：`Authorization: Bearer $GITHUB_TOKEN`（服务端环境变量）。
- **目标对象**：仓库（repo）。
- **主要端点**：
  - `GET /search/repositories?q=...&sort=stars|updated&order=desc` —— 发现候选。
  - `GET /repos/{owner}/{repo}` —— 详情（含 stars/forks/watchers/open_issues）。
  - `GET /repos/{owner}/{repo}/topics` —— 主题标签。
  - `GET /repos/{owner}/{repo}/languages` —— 语言占比。
- **Rate Limit**：
  - 搜索 API：30 req/min（已鉴权）。
  - 核心 API：5000 req/h（已鉴权）；未鉴权 60 req/h。
  - 通过响应头 `X-RateLimit-Remaining` / `X-RateLimit-Reset` 感知并写回 `collection_runs`。
- **分页**：`?page=&per_page=`，Link header；搜索结果上限 1000 条。
- **缓存**：支持 ETag（`If-None-Match`）与 `Last-Modified`，304 不计配额。
- **字段映射**（raw → `items`）：
  - `id` → `source_item_id`
  - `full_name` → `full_name` / `dedupe_key`（`github:{full_name}`）
  - `html_url` → `source_url` / `external_url`
  - `description` → `summary`
  - `language`, `license.spdx_id`, `homepage`, `topics`, `stargazers_count`, `forks_count`, `subscribers_count`, `open_issues_count`, `created_at`, `pushed_at`
- **发现策略（阶段 1）**：按关键词 + 主题 + 最近更新时间筛选 AI/ML/量化/Vibe Coding 方向仓库；不依赖总 Star 排序，结合 `pushed_at` 与增长。

## 2. Hugging Face Hub API

- **Base URL**：`https://huggingface.co/api`
- **鉴权**：`Authorization: Bearer $HF_TOKEN`（服务端环境变量，部分端点可匿名但建议带 token）。
- **目标对象**：模型、数据集、Space。
- **主要端点**：
  - `GET /api/models?search=&sort=likes|downloads|lastModified&direction=-1&limit=&skip=`
  - `GET /api/datasets?...`
  - `GET /api/spaces?...`
  - `GET /api/models/{repo_id}` —— 详情。
- **Rate Limit**：官方未严格文档化，建议自我限流（≤ 1 req/s），并观察 429 响应头退避重试。
- **分页**：`skip` / `limit`（建议 limit≤100）。
- **缓存**：按 `lastModified` 做条件请求；列表返回的 `lastModified` 可作为变更判断。
- **字段映射**：
  - `id`（如 `org/model-name`）→ `source_item_id` / `dedupe_key`（`hf:{kind}:{id}`）
  - 对应 `item_type`：模型→`model`、数据集→`dataset`、Space→`space`
  - `likes`, `downloads`, `downloadsAllTime` → 指标快照
  - `lastModified` → `pushed_at_source`
  - `tags`（含 `license:`、任务类型、框架）→ `topics` / `tags`
  - `pipeline_tag` → 主题
  - `sdk`（Space）→ 复现信号
- **发现策略**：按 `sort=likes` 与 `sort=downloads` 结合 `lastModified` 近期窗口；按任务标签过滤 LLM / 量化 / 多模态 / Agent 方向。

## 3. arXiv

- **Base URL**：`http://export.arxiv.org/api/query`
- **鉴权**：无需。
- **目标对象**：论文（paper）。
- **主要端点**：
  - `GET /api/query?search_query=...&start=0&max_results=50&sortBy=submittedDate&sortOrder=descending`
- **Rate Limit**：官方建议 **每 3 秒最多 1 次请求**；采集器强制 ≥3s 间隔。出现 429 时指数退避。
- **返回格式**：Atom XML（需解析 `<entry>`，提取 `id`/`title`/`summary`/`published`/`updated`/`author`/`link`/`arxiv:primary_category`/`category`）。
- **分页**：`start` + `max_results`。
- **字段映射**：
  - `id`（如 `http://arxiv.org/abs/2401.00001v1`）→ `source_item_id`；规范化为 arXiv ID `2401.00001` → `dedupe_key`（`arxiv:{id}`）
  - `title` → `title`；`summary` → `summary`（abstract）
  - `published` → `created_at_source`；`updated` → `pushed_at_source`
  - `link[rel=related][title=pdf]` → PDF 链接
  - `primary_category` / `category` → `topics`
  - 论文通常 `has_code=false`，除非 abstract 或外部链接提示（阶段 1 默认 false，未来可接 Papers with Code）
- **发现策略**：按 `cat:cs.AI|cs.LG|cs.CL|stat.ML|q-fin.*` 等类别 + 关键词 + 最近提交日期；`sortBy=submittedDate`。

## 4. 归一化与去重

- 每个 item 生成 `dedupe_key`（源内唯一）：`github:{full_name}` / `hf:{kind}:{id}` / `arxiv:{arxiv_id}`。
- 阶段 1 仅做**源内去重**（同一 `dedupe_key` 复用同一 `items` 行，更新指标）。
- 跨源去重（如 arXiv 论文 ↔ GitHub 仓库）列为 `docs/RISKS.md` 待确认事项，阶段 1 不强求。

## 5. 采集调度

- 阶段 1 默认**每日 1 次**全量采集（按 `COLLECTION_TIMEZONE`，默认 Asia/Shanghai）。
- 调度器在 Vercel Cron 或 Supabase Scheduled Function 之间二选一（见 `docs/RISKS.md`）。
- 每次采集后立即写入当日 `item_metrics_snapshot`，再触发评分与 AI 分析流水线。
