# Frontier Score 评分模型（SCORING）

> 目标：用可解释的多维度评分替代"唯 Star 数论"。每个维度的原始值、归一化分数、权重、理由都写入 `score_components`，做到透明可审计。

## 1. 总分

```
FrontierScore = Σ ( normalized_score_d × weight_d )     // d ∈ 7 个维度
```

- 每个维度归一化到 0–100。
- 权重之和 = 1.0。
- 总分保留两位小数，存入 `items.latest_score` 与 `item_metrics_snapshot.score_raw`。
- 当日无 24h/7d 增长数据（冷启动）时，动量维度按"中性 50"处理并标注 `rationale='cold-start'`。

## 2. 七个维度

| 维度 | 权重 | 含义 | 主要信号 |
| --- | --- | --- | --- |
| momentum（动量） | 0.25 | 短期增长加速度 | 24h 与 7d 的 stars / downloads / likes 增长率 |
| velocity（活跃速度） | 0.15 | 近期开发与发布节奏 | 最近 7d push、release 新鲜度、提交频率 |
| novelty（新颖性） | 0.20 | 与已有方案的差异度 | AI 分析 `what_is_new` + 主题稀缺度 |
| relevance（相关性） | 0.20 | 与个人兴趣领域的匹配 | 命中 AI/ML/开源/Vibe Coding/产品设计/量化金融关键词与权重 |
| engagement（参与度） | 0.10 | 社区互动健康度 | issues/PR/discussion 活跃、stars:forks 比 |
| accessibility（可复现性） | 0.05 | 能否快速跑起来 | has_code / has_demo / license 清晰度 / AI 评估复现难度 |
| quality（质量） | 0.05 | 工程质量信号 | 文档完整度、维护者信号、license 规范 |

> 权重可在 `src/config` 中集中配置，调整无需改库表。个人偏好通过 relevance 维度的"兴趣画像"注入。

## 3. 动量（momentum）计算

依赖 `item_metrics_snapshot` 历史快照：

```
g_24h = (metric_today - metric_yesterday) / max(metric_yesterday, 1)
g_7d  = (metric_today - metric_7d_ago)    / max(metric_7d_ago, 1)
```

- 主指标按 item_type 选择：repo→stars，model→likes/downloads，dataset→downloads，space→likes，paper→citations（阶段 1 论文若无引用数据则降级为 downloads/views，缺则冷启动）。
- 合成：`momentum_raw = 0.6 × log1p(g_24h×100) + 0.4 × log1p(g_7d×100)`，再按预设分位阈值映射到 0–100。
- **冷启动保护**：若 `metric_yesterday` 或 `metric_7d_ago` 缺失，该子项记中性分并写理由。

## 4. 速度（velocity）

- `pushed_at_source` 在最近 7d 内 → 高分；30d 外 → 低分。
- GitHub：可叠加最近 release 发布时间（阶段 1 可选）。
- arXiv：以 `published` / `updated` 近因计分。

## 5. 新颖性（novelty）

- 来源 1：AI 分析结构化结果中的 `novelty_score`（0–100）。
- 来源 2：主题稀缺度——`topics` 在近 30d 全库中出现的逆频率。
- 合成：`novelty = 0.7 × ai_novelty + 0.3 × topic_rarity`。

## 6. 相关性（relevance）

- 维护一张"兴趣关键词 → 权重"画像（AI、ML、开源、Vibe Coding、产品设计、量化金融等大类）。
- 命中越多、权重越高，分数越高；命中屏蔽词直接将该 item 排除（不进入 Today）。
- 画像存配置文件，阶段 1 硬编码默认值，未来可由 Saved 行为反向调参。

## 7. 参与度（engagement）

- GitHub：open_issues 趋势、stars:forks 比异常（过高过低都降分）、最近 PR/issue 活跃。
- HF：likes 与 downloads 的比例（高赞低下载可能是 hype）。
- 综合反映"真有人用"而非"刷数"。

## 8. 可复现性（accessibility）

- `has_code` + `has_demo` + license 清晰 → 加分。
- AI 评估 `reproduction_difficulty`（easy/medium/hard/unknown）反向映射。
- 论文若有公开代码（阶段 1 默认无此信号）按 unknown 中性处理。

## 9. 质量（quality）

- 有 README / 有文档站 / license 规范 → 加分。
- 维护者信号（GitHub owner 类型、历史活跃）。
- 阶段 1 该维度权重低，避免噪声。

## 10. 透明性

- 每次评分写入 `score_components`：`dimension` / `raw_value` / `normalized_score` / `weight` / `rationale`。
- Today 页面可展开查看每个维度的理由（阶段 1 可选，阶段 2 补 UI）。
- 评分逻辑集中在 `src/lib/scoring`，便于单测。
