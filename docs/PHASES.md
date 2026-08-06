# 开发阶段划分（PHASES）

> 原则：分阶段推进，每阶段独立验收；未通过类型检查 / 构建 / 基础测试不进入下一阶段；不擅自增加技术栈。

## 阶段 0 — 基础（已完成 ✅）

- 目录结构
- docs：PRD / DATA-SOURCES / SCORING / PHASES / RISKS
- Supabase Schema（迁移 + schema.sql）
- .env.example / .gitignore / README
- 统一 TypeScript 类型 + tsconfig
- 类型检查通过

**未开始**：任何页面业务代码、采集器实现、AI 调用、Supabase 实例创建与迁移执行。

---

## 阶段 1 — MVP（3 数据源 + 4 页面）

阶段 1 内部按子步骤推进，每完成一个子步骤先做类型检查再继续：

### 1.1 项目脚手架
- 初始化 Next.js（App Router）+ TypeScript + Tailwind + shadcn/ui
- 接入 Supabase 客户端（`@supabase/supabase-js`），服务端与浏览器两套 client
- 配置路径别名、ESLint、环境变量加载校验

### 1.2 数据库落地
- 在 Supabase 创建项目，执行 `supabase/migrations/0001_init.sql`
- 配置 RLS（单用户最低限度）
- 用 3 个数据源元数据 seed `sources` 表

### 1.3 采集器
- `src/lib/collectors/github.ts`、`huggingface.ts`、`arxiv.ts`
- 统一 `Collector` 接口、重试、缓存、限流
- 写入 `raw_items` + `collection_runs`
- 归一化写入 `items`

### 1.4 指标快照 + 评分流水线
- 每日写 `item_metrics_snapshot`
- `src/lib/scoring` 实现 7 维评分，写 `score_components` + `items.latest_score`
- 冷启动处理 + 单元测试

### 1.5 AI 分析流水线
- 接入腾讯模型 API（服务端）
- 结构化 JSON 输出（`ItemAnalysisResult`，对应 7 点解释）
- 写入 `ai_analyses`，失败重试与降级

### 1.6 调度
- Vercel Cron 或 Supabase Scheduled Function（二选一，见 RISKS）
- 每日触发：采集 → 快照 → 评分 → AI 分析

### 1.7–1.10 四个页面
- 1.7 **Today**：当日条目按分数排序 + 7 点解释摘要
- 1.8 **Explore**：筛选（来源/类型/标签/评分/时间）+ 搜索
- 1.9 **Saved**：收藏 + 笔记 + 文件夹
- 1.10 **Idea Lab**：灵感创建/编辑 + 关联条目 + AI 建议灵感

### 1.11 部署与验收
- `tsc --noEmit` 通过
- `next build` 通过
- 基础测试通过（采集器 mock、评分单测、AI 输出 schema 校验）
- 部署 Vercel

---

## 阶段 2+ — 未来（不在本阶段承诺）

- 更多数据源（Papers with Code、awesome-list、Newsletter、RSS）
- 跨源去重与条目合并
- 每周/每月回顾报告
- 邮件 / Webhook 推送
- 个人兴趣画像自动学习（基于 Saved 行为）
- 全文搜索（Postgres FTS 或外部索引）
- 移动端适配优化

> 任何阶段 2+ 内容必须由用户显式确认后才启动。
