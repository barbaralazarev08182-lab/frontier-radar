# Frontier Radar

个人前沿信息雷达：每日从 GitHub、Hugging Face、arXiv 发现值得关注的 AI / 机器学习 / 开源 / Vibe Coding / 产品设计 / 量化金融条目，并用 AI 解释成可行动的内容。

## 技术栈

Next.js (App Router) · TypeScript (strict) · Tailwind CSS · shadcn/ui · Supabase PostgreSQL · Vercel · 腾讯云 TokenHub / OpenAI 兼容模型接口（经 AI Provider 抽象层）

## 环境要求

- Node.js ≥ 20
- npm（本仓库使用单一 lockfile：`package-lock.json`）

## 安装

```bash
npm install
```

## 环境变量

复制 `.env.example` 为 `.env.local` 并填写。

- **构建不依赖**任何密钥：缺环境变量时 `npm run build` 不会崩溃。
- 调用 Supabase / AI 功能时才校验对应变量，缺失会给出清晰错误。
- 仅 `NEXT_PUBLIC_*` 前缀变量会暴露给浏览器；密钥（service role / AI key）一律仅服务端。
- 真实密钥只放 `.env.local` 或部署平台环境变量，**禁止**入库、入 git、入文档或快照。

| 变量 | 说明 | 范围 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目地址 | 前端可用 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名 key | 前端可用 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role（绕过 RLS） | 仅服务端 |
| `GITHUB_TOKEN` | GitHub 采集 token（fine-grained PAT） | 仅服务端 |
| `GITHUB_API_BASE_URL` / `GITHUB_API_VERSION` | GitHub API 地址与版本 | 仅服务端 |
| `GITHUB_DISCOVERY_DAYS` 等 `GITHUB_*` | 发现/搜索/富化/超时/重试参数 | 仅服务端 |
| `AI_PROVIDER` | AI Provider 标识（默认 `tencent`） | 仅服务端 |
| `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` / `AI_EMBEDDING_MODEL` | 统一 AI Provider 配置 | 仅服务端 |

## 启动

```bash
npm run dev      # 开发
npm run build    # 生产构建
npm run start    # 生产启动
```

## 检查命令

```bash
npm run typecheck   # TypeScript strict 类型检查
npm run lint        # ESLint
npm run test        # node:test（GitHub 采集器单元测试，不真实消耗 API 配额）
npm run build       # 构建验证
```

## GitHub 采集（阶段 1.2）

```bash
npm run collect:github      # 真实采集：需 GITHUB_TOKEN + Supabase 配置
npm run collect:github:dry  # dry-run：调用真实 GitHub API，完成发现/标准化/去重，不写数据库
```

- **真实采集**（`collect:github`）：发现 → 标准化 → 去重 → 写 `raw_items` /
  `items` / `item_metrics_snapshot` / `collection_runs` / `collector_state`。
- **dry-run**（`collect:github:dry`）：调用真实 GitHub API 并输出汇总统计，
  不写数据库、不输出完整 payload、不输出 Token、不伪造成功。
- 缺 `GITHUB_TOKEN`：真实采集明确失败；dry-run 输出缺失 Token 提示且不伪造成功。
- 缺 Supabase 配置：真实采集明确报错；dry-run 仍可运行（但需 Token 调用真实 API）。
- 可选参数：`--days` `--pages` `--per-page` `--enrich-limit` `--min-stars` `--readme-max-bytes`。

健康检查（不返回任何密钥）：

```bash
curl http://localhost:3000/api/health
```

## 路由

| 路径 | 说明 |
| --- | --- |
| `/` | 重定向到 `/today` |
| `/today` | 今日值得关注条目 |
| `/explore` | 按源 / 类型 / 标签浏览 |
| `/saved` | 收藏与笔记 |
| `/idea-lab` | 灵感沉淀 |
| `/api/health` | 健康检查 |

## 目录结构

```
frontier-radar/
├── docs/                  文档（PRD / 数据源 / 评分 / 阶段 / 风险）
├── supabase/migrations/   数据库迁移（0001 初始 + 0002 增量）
├── src/
│   ├── app/               App Router（today/explore/saved/idea-lab/api）
│   │   └── api/cron/      未来 Vercel Cron（占位）
│   ├── components/        UI 组件（site-nav / page-placeholder）
│   ├── lib/
│   │   ├── types/         统一数据类型
│   │   ├── supabase/      client.ts（浏览器端）/ server.ts（服务端）/ admin.ts（脚本）
│   │   ├── env/           server.ts / public.ts 环境变量封装
│   │   ├── ai/            AI Provider 抽象层（暂不调用模型）
│   │   ├── github/        GitHub HTTP 客户端（client/errors/rate-limit/types）
│   │   ├── collectors/github/ 采集器（collector/normalize/discover/enrich/sink）
│   │   ├── db/repositories/ 数据访问层（sources/collection-runs/raw-items/items/metric-snapshots/collector-state）
│   │   ├── scoring/       评分逻辑（阶段 1.4）
│   │   ├── jobs/          后台任务（阶段 1.6）
│   │   ├── hash.ts        稳定 payload 哈希
│   │   ├── concurrency.ts 受限并发执行器
│   │   ├── logger.ts      结构化日志
│   │   └── utils.ts       cn() 工具
│   ├── config/            interest-profile.ts（兴趣画像）/ github-discovery.ts（发现查询组）
│   └── styles/            全局样式
└── scripts/               collect-github.ts（采集命令）
```

## 阶段进度

- **阶段 0（基础）**：完成。
- **阶段 1.1（可运行 Next.js 工程）**：完成（含 1.1.1 升级至 Next.js 16）。
- **阶段 1.2（GitHub 采集器）**：完成。
- 阶段 1.3（Hugging Face 采集器）及之后：未开始，须经确认。

## 下一步

见 `docs/PHASES.md` 与 `docs/RISKS.md`。
