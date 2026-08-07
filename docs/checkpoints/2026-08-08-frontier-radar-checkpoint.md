# Frontier Radar Checkpoint — 2026-08-08

## 当前稳定点

- 当前 main 基准提交：`db2ecd9680d43becc1950c532a32055f0ca19407`
- 提交说明：`feat: show project trajectory in intelligence detail`
- Vercel：Success
- GitHub CI：Success（Typecheck / Lint / Test / Build 全通过）
- 生产站点继续使用原 alias：`https://frontier-radar-eosin.vercel.app`

> 后续继续开发时，从这个提交之后接着做。不要回退到更早的 Feed/聚合器方向。

---

## 产品方向已经确定

Frontier Radar 不再定位为“AI 科技资讯聚合 / GitHub 搜索增强”，而是：

> **A personalized discovery engine for things being built at the frontier of technology.**
>
> 核心目标：发现那些用户不会主动搜索、但看到后会觉得“居然还能这么做 / 我也想拿它做点东西”的新项目。

产品主链路：

`Discover → Understand → Get Inspired → Build`

核心原则：

- Discovery > Search
- Rising > Popular
- Idea Spark > 单纯 Research Value
- 项目 > 文章
- 可试玩 / 可复现 / 可延展优先
- 不让推荐越学越窄，必须保留 Adjacent / Wildcard 探索位

---

## 已完成：候选池升级

当前候选来源：

- GitHub：重点找 AI × Software、MCP、Agent、AI Game、AI UI、3D、Creative AI、Small Projects 等
- Hugging Face：改成 Spaces-first，优先可试玩 Demo
- Show HN：已接入，用于发现 Side Project / Demo / 新工具 / 小实验
- Product Hunt：已接公开 Atom Feed，不需要 Token
- arXiv：保留但降权、降量，论文只做少数补充

当前候选池已经从“内容聚合”转向“项目发现网络”。

---

## 已完成：Discovery Score v3

公共 Discovery Score 已拆成 7 个独立维度：

1. Freshness
2. Domain Relevance
3. Momentum
4. Project Health
5. Novelty
6. Idea Spark
7. Tryability

设计原则：

- Star 绝对数量被明显弱化
- 新项目的增长速度可以压过老牌高 Star 项目
- Idea Spark 是高权重信号
- repo / Space / product / Demo 默认比纯 paper 更适合 Today
- Personal Match 不写入公共 latest_score，而是在用户级重排时单独叠加

已有回归测试保护：

- “2 天 80 Star”新项目的 Momentum 可以高于“5 年 3 万 Star”老项目
- 可体验项目默认高于纯论文
- 跨域创意组合得到更高 Idea Spark

---

## 已完成：真实 Momentum

已经开始使用历史指标快照，而不是只靠“项目年龄”估算：

- GitHub：stars / forks
- Hugging Face：downloads / likes
- Show HN：points / comments

目标信号：

- 24h delta
- 7d delta / velocity
- acceleration

已经有自动刷新和 rescore 链路；历史不足时自动回退旧算法。

注意：真正可靠的 24h / 7d 增长需要时间积累快照，第一天不会凭空出现。

---

## 已完成：Today 变成 Daily Radar

Today 不再是普通 20 条 Feed，而是每天固定最多 7 个 Radar Picks。

默认探索结构：

- 5 × Core
- 1 × Adjacent
- 1 × Wildcard

规则：

- Core：主要兴趣，限制来源和主题重复
- Adjacent：至少命中一个核心兴趣，同时引入一个新方向
- Wildcard：优先不与核心兴趣重合，但必须先过质量门槛，并优先可行动项目

已有测试保护 5/1/1 结构以及“Wildcard 不为随机而塞低质量内容”。

UI 已支持：

- CORE / ADJACENT / WILDCARD
- NEW
- RISING
- PLAYABLE
- OPEN SOURCE
- IDEA SPARK
- WHY NOW
- WHY YOU
- BUILD ON THIS

---

## 已完成：行为数据与推荐学习基础

`user_events` 已经记录：

- interested
- not_interested
- open_source
- open_detail
- dwell

metadata 已加入：

- rank
- lane
- surface
- algorithm_variant
- source
- content_type
- session_id

Dwell 规则：

- 卡片至少 60% 可见
- 累计停留 8 秒
- 才记录一次弱正向 dwell
- 普通曝光不直接当负样本

这样后面可以真实比较 Core / Adjacent / Wildcard 哪种更有效，而不是靠感觉调比例。

---

## 已完成：个性化基础

当前推荐不是最终 ML Ranker，但已经有：

- anonymous visitor id
- 用户行为历史
- 21 维兴趣向量
- 规则型 Personal Match
- cosine similarity 推荐基础
- semantic embedding / user semantic profile 的数据库与脚本基础设施

重要说明：

- 真正 `multilingual-e5-small` 本地批量 embedding 还没有在用户电脑上完成第一次正式运行
- 原因是本地 E 盘代码与 GitHub main 不同步，且用户已经明确不想再手动敲 PowerShell
- 后续必须由 DeepSeek/本地 Agent 自己处理本地同步、安装和 embedding 生成，不再要求用户手动跑命令
- 真正 Learning-to-Rank 模型还没有训练；目前数据量也不适合强行训练

---

## 已完成：Project Entity / Project Intelligence 第一版

这是当前最新阶段。

### 1. 跨来源项目聚类

原来的跨来源 dedupe 已升级为 Project Entity clustering：

- 不再发现重复后直接把其他来源丢掉
- 保留一个 primary item
- 同时保留所有 evidence
- 支持 canonical URL 匹配
- 支持保守的跨来源标题高相似匹配
- 同来源相似标题不会互相误合并
- primary item 保持上游已经个性化后的顺序，不重新按公共 score 选

当前是请求时聚类，还没有持久化成独立数据库 project entity 表。

### 2. Cross-source confirmation

同一项目如果同时出现在多个平台，会得到温和的跨来源确认信号。

限制已经加上：

- 项目本身必须先达到质量门槛
- 跨来源证据要够强
- 只允许最多前移 1 位
- 与前一项公共分差不能过大
- 不修改数据库公共 latest_score

目的是利用“GitHub + Show HN + Product Hunt 等同时出现”作为外部确认，而不是奖励营销式多平台铺量。

### 3. Today 卡片 Project Intelligence

跨来源项目会显示：

- PROJECT INTELLIGENCE
- 出现过的来源
- 哪个来源是 Code / Demo
- earliest seen
- 直接打开各来源

单来源项目不会强行显示这一块。

### 4. Project Intelligence Detail 页面

已新增站内：

`/project/[id]`

Today 卡片现在有“查看情报”，不会直接把用户送走。

详情页已经包含：

- Project title / summary
- 主项目入口
- Source Evidence
- GitHub / HF / Show HN / Product Hunt 等来源证据
- HN 讨论入口（存在时）
- 每个来源的 Momentum 历史
- 7 维 Discovery Signals
- WHY NOW
- What matters
- problem / novelty / target users / limitations / hype risk（已有 AI 分析时）
- BUILD ON THIS
- Project trajectory / 传播轨迹

当前最后提交就是“show project trajectory in intelligence detail”。

---

## 当前没有继续做的内容

以下是下一阶段，不要误认为已经完成：

1. **Project Entity 持久化**
   - 还没有 `projects` / `project_sources` 这类正式数据库实体表
   - 当前 clustering 是 runtime heuristic

2. **更强的跨来源实体识别**
   - 当前主要是 canonical URL + 保守标题相似度
   - 还没有 semantic entity resolution / homepage-domain / repo-link graph 等

3. **完整 Project Timeline Intelligence**
   - 已有第一版 trajectory UI
   - 还可以继续加入“首次 GitHub → Show HN → Product Hunt → growth acceleration”的更明确事件语义

4. **真实语义 Embedding 全量生成**
   - 基础设施已写
   - 本地首次批量生成尚未完成

5. **Learning-to-Rank / ML Ranker**
   - 尚未训练
   - 需要继续积累真实 user_events / impressions / lane feedback 后再做

6. **自适应 Discovery Mix**
   - 当前固定目标 5 Core + 1 Adjacent + 1 Wildcard
   - 已经收集 lane 行为数据
   - 还没有根据数据自动调整成 4/2/1、5/2/0 等

7. **Idea Lab / Save Idea**
   - 产品方向已确定
   - 还没有真正做“Save Idea → Build”工作区

---

## 下次继续时的推荐顺序

不要先堆更多来源，也不要先继续加复杂 ML。

推荐从这里继续：

1. 把 Project Entity 从 runtime clustering 升级成可持久化实体模型
2. 改善 entity resolution，降低误合并/漏合并
3. 用跨来源实体做真正的传播时间线 + cross-source momentum
4. 再做 Idea Lab / Save Idea，让 `BUILD ON THIS` 形成行动闭环
5. 等行为数据积累后，再回到 semantic embedding + Learning-to-Rank

---

## 运维/协作约束

- 不要要求用户复制或暴露任何 secret
- 不要再让用户手动做 PowerShell 本地步骤
- 能直接改 GitHub/Vercel 的直接做
- 必须在本地运行的任务交给 DeepSeek/本地 Agent
- 操作说明一次只给一个动作，不要堆检查清单
- 用户本地 `E:\Projects\frontier-radar` 和 GitHub main 曾经发生历史分叉，不要盲目 `git pull` / `git push`
- 最新远端代码可能不会自动出现在用户 E 盘

---

## 恢复开发时的一句话

用户说：

> “继续 Frontier Radar”

就从本 checkpoint 往下做，不需要重新讨论产品定位。