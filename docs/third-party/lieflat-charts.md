# Lieflat Charts attribution

Gate 15A uses implementation geometry from `larashero3-dotcom/lieflat-charts`.

## Current Explore experiment — v4

Gate 15A v4 adapts **L12 Type Colonnade** as the current Explore composition.

- Source: `templates/lupi-gallery.html` (`8 · type colonnade`)
- Data contract: one hairline per real Explore candidate
- Left-side vertical order: current Lens rank
- Right-side ownership target: a shared tag family derived only from tags already present in candidate metadata
- Rare tagged records: explicit `OTHER TAGS` bucket
- Records without tags: explicit `UNTAGGED` bucket
- Hub size: number of visible records assigned to that displayed family/bucket
- Lens changes ordering only; Frontier Radar Global Score remains unchanged
- This is **not** an embedding cluster, semantic coordinate system, or trained semantic recommender claim

The v4 product layout turns detail into a click-revealed interaction sheet rather than a permanent structural sidebar.

## Retained comparison — v3

The earlier Gate 15A v3 adapts **L1 Launch Fan** and remains in the branch for visual/data-shape comparison only; it is no longer the rendered Explore entry.

- Source: `templates/lupi-gallery.html` (`1 · launch fan`)
- v3 data contract: one spoke per record, emergence time determines the start position, time marks continue toward the present, and the primary node size encodes Frontier Radar Global Score

## License

- License: **PolyForm Noncommercial License 1.0.0**
- License terms: https://polyformproject.org/licenses/noncommercial/1.0.0/
- Upstream repository: https://github.com/larashero3-dotcom/lieflat-charts

The upstream templates are used here for a noncommercial research / experiment build. Before any commercial use of Frontier Radar, re-check and obtain any license required for this adapted code.
