# Gate 16A — Personal Radar Data Contract + Lieflat Audit

Status: CURRENT / AUDIT LOCKED / NO UI IMPLEMENTATION YET

## Objective

Define what Personal Radar can truthfully show **before** creating a route or drawing a visualization.

Standing product rule:

> Product contracts conservative. Visual expression aggressive.

Standing visualization rule:

```text
real data shape
→ user question
→ Lieflat SKILL.md + catalog
→ Lupi Editorial audit
→ Lupi Basics audit
→ compare >= 3 real candidates
→ Glance only when Lupi/Basics do not honestly solve the actual interaction question
```

No literal radar chart merely because the feature is named Personal Radar.

---

# 1. Current personalization truth

Current interpretable profile implementation:

```text
FEATURE_VECTOR_VERSION = interest-keyword-v1
21 named interest dimensions
```

The dimensions are:

1. ai_creative_projects
2. ai_integrations
3. ai_games
4. ai_ui_interaction
5. small_open_source
6. new_ai_capabilities
7. ai_agents
8. vibe_coding
9. developer_tools
10. multimodal
11. product_design
12. speech_audio
13. speaker_recognition
14. machine_learning
15. computer_vision
16. nlp_llm
17. education_ai
18. reinforcement_learning
19. mlops
20. quant_finance
21. general_tech_news

This is an interpretable keyword-feature model, **not** an active semantic embedding model.

Event strengths used by current personalization:

```text
interested      +4
not_interested  -5
open_source     +2
open_detail     +1
dwell           0..2 = clamp(dwell_ms / 30000)
```

Per-event recency:

```text
0.5^(ageDays / 30)
```

Current global personalization confidence:

```text
evidence = eventCount / (eventCount + 12)
activity = 0.5^(ageDaysSinceLastEvent / 30)
confidence = evidence * activity
```

Stored profile snapshots are considered stale when a newer event exists.

---

# 2. Live Production audit — 2026-08-14

Read-only Production aggregate audit; no visitor identifiers are recorded here.

## Event inventory

```text
183 total feedback events
15 visitors
```

By type:

```text
dwell           152 events / 14 visitors
open_detail      17 events /  2 visitors
interested       10 events /  3 visitors
not_interested    2 events /  1 visitor
open_source       2 events /  1 visitor
```

The current profile evidence is therefore dominated by passive dwell, with relatively little explicit positive/negative feedback.

By surface:

```text
Explore          124 events / 13 visitors
Today             48 events /  2 visitors
legacy/unknown     9 events /  1 visitor
Project detail     2 events /  1 visitor
```

## Density per visitor

```text
min events       1
p25              2
median           7
p75             15
max             59
```

Unique-item depth:

```text
median unique items  3
max unique items    14
```

Active-day depth:

```text
median active days  1
max active days     3
```

Coverage thresholds:

```text
>= 3 events   10 / 15 visitors
>= 6 events    8 / 15 visitors
>=12 events    4 / 15 visitors
>=20 events    3 / 15 visitors
>= 3 items    10 / 15 visitors
>= 6 items     6 / 15 visitors
```

## Stored interpretable vectors

```text
4 stored profiles
vector version: interest-keyword-v1
21 dimensions
7..11 nonzero dimensions
median nonzero dimensions: 9.5
```

All four stored snapshots were stale relative to their visitors' latest feedback at audit time.

Therefore Personal Radar must not treat `user_interest_vectors` as the guaranteed current truth. The page needs a live derivation path from events, consistent with the existing rules fallback / profile semantics.

## Semantic profile reality

```text
user_semantic_profiles rows: 0
nonempty semantic embeddings: 0
```

Do not describe Personal Radar as a semantic embedding map, trained preference embedding, or ML latent-space visualization.

## Aggregate confidence reality

Across current event-bearing visitors, applying the existing global confidence formula at audit time:

```text
average ≈ 0.348
median  ≈ 0.349
max     ≈ 0.807
```

This is early-stage personalization evidence, not a mature long-history behavioral model.

---

# 3. What Personal Radar should answer in v1

Primary questions:

1. **What interests does the system currently have evidence for?**
2. **How strong is the behavioral signal for each interest?**
3. **How much evidence supports that signal?**
4. **How fresh is that evidence?**
5. **How confident should the user be that this is learned behavior rather than cold-start prior?**

Do not answer yet:

- how interests changed over months
- long-term preference trajectories
- semantic neighborhoods
- latent personality structure
- stable causal preference claims

Current history is too short for these claims.

---

# 4. Proposed truthful per-interest data contract

Personal Radar should derive a live, display-only evidence record for each of the 21 existing interest keys.

For each interest dimension:

```ts
{
  key,
  priorWeight,          // INTEREST_PROFILE cold-start prior
  behaviorSignal,       // signed sum of contributing event strength × recency
  evidenceCount,        // count of contributing events
  positiveEvidence,
  negativeEvidence,
  lastEvidenceAt,
  freshness,            // existing activityFreshness semantics
  confidence            // evidenceConfidence(evidenceCount) × freshness
}
```

Important boundaries:

- This display contract must reuse the same keyword matching / event-strength / recency semantics as current personalization.
- It does not change ranking semantics.
- It does not mutate `latest_score`.
- It does not invent semantic similarity.
- An item may contribute to multiple existing interest keys only when the current matching logic actually matches those keys.
- Negative evidence must remain negative; do not silently hide it.
- `priorWeight` must be visually distinguished from learned behavioral evidence.

---

# 5. Lieflat candidate audit

Upstream source of truth:

```text
larashero3-dotcom/lieflat-charts
SKILL.md
catalog.md
actual gallery implementation
```

## Candidate A — L5 Radial Convergence

Data shape:

```text
many real records -> a few real themes/hubs
```

Potential mapping:

```text
feedback-bearing items -> interest dimensions
```

Verdict: **REJECT AS DEFAULT V1 HERO**.

Reason:
- median visitor has only ~3 unique evidence items
- an item can truthfully match multiple interest keys
- a radial network can visually overstate evidence richness for sparse users

May be reconsidered only for high-evidence users or a later explicit evidence-network mode.

## Candidate B — L15 Ballot Tally

Data shape:

```text
<=6 independent percentages
```

Verdict: **REJECT**.

Reason:
- the 21D interest vector is L2-normalized / weighted evidence, not a set of independent vote percentages
- converting it to ballot-style percentages would change the meaning

## Candidate C — F5 Tick Rows

Data shape:

```text
<=8 category values / ranking
```

Mapping:

```text
top 6–8 current interest dimensions
-> current behaviorSignal or profile strength
```

Verdict: **SELECTED LOW-EVIDENCE / BASELINE VIEW**.

Why:
- honest with sparse data
- readable with 3–8 meaningful dimensions
- supports cold-start / early-profile states without decorative complexity
- directly answers “what is strongest now?”

## Candidate D — F8 Plumb Scatter

Data shape:

```text
<=20 entities with two real continuous variables
```

Potential mapping for nonzero interests only:

```text
x = signed behaviorSignal
y = confidence
point = interest dimension
```

Verdict: **SELECTED CANDIDATE FOR EVIDENCE-QUALIFIED PROFILE**.

Conditions:
- only plot dimensions with real contributing evidence
- normally 7–11 nonzero dimensions in current stored profiles, so the <=20 contract is plausible
- axes must be explicitly labeled and must not imply semantic distance

## Candidate E — G9 Scatter Morph / “One dataset, three views”

Upstream Glance example:

```text
same entity set
three scalar views
ECharts universalTransition
```

SKILL boundary:
- Glance is not a peer default
- it is allowed only after Lupi/Basics audit when the actual task requires fast multi-view reading or a capability Lupi/Basics do not provide

Personal Radar-specific justification:

The actual advanced question can be:

> **How does the same set of learned interests look when I switch between Strength, Evidence and Freshness?**

F5 and F8 can answer individual slices, but neither preserves the same interest entities through a three-view identity transition.

Verdict: **CONDITIONALLY SELECTED SIGNATURE INTERACTION, NOT DEFAULT FOR EVERY USER**.

Use only when enough real per-interest evidence exists. Preserve object identity across views; do not redraw unrelated scenes.

Possible views:

```text
STRENGTH   -> behaviorSignal
EVIDENCE   -> evidenceCount / confidence
FRESHNESS  -> lastEvidenceAt / freshness
```

The exact geometry must come from the actual upstream G9 implementation if/when Gate 16B implements it.

---

# 6. Adaptive visual contract

Personal Radar should not show the same visual complexity to every profile.

## State A — COLD START

```text
0 contributing events
```

Show:
- clearly labeled PRIOR / STARTING PROFILE
- no claim that preferences were learned
- no morph

## State B — FORMING

Typical early evidence:

```text
1–5 contributing events or very few distinct items
```

Use:
- F5 Tick Rows
- explicit evidence counts / confidence
- copy such as `RADAR FORMING`, not `WE KNOW YOU`

## State C — EVIDENCE-QUALIFIED

Candidate threshold to verify in implementation:

```text
>=6 events
>=3 distinct evidence items
>=3 interest dimensions with contributing evidence
```

May unlock:
- F8 strength × confidence field
- G9 identity-preserving Strength / Evidence / Freshness morph

The visual must still show confidence rather than treating the profile as certain.

---

# 7. Product / route direction for Gate 16B

Provisional identity:

```text
06 PERSONAL RADAR · INTEREST FRONTIER
```

This is not yet a navigation contract; Gate 16B must decide how it enters the global shell without disturbing FROZEN routes.

Provisional page structure:

```text
PROFILE STATUS / CONFIDENCE
        ↓
CURRENT INTEREST FIELD
        ↓
WHY THE RADAR THINKS THIS
        ↓
EVIDENCE LEDGER / MODEL TRUTH
```

The page should feel like a research instrument, not a user-profile settings dashboard.

---

# 8. Gate 16A lock

Gate 16B may implement only after preserving these truths:

- current semantic embeddings are inactive
- current history is short (median 1 active day, max 3)
- explicit feedback is sparse; dwell dominates
- stale stored snapshots are not authoritative
- cold-start prior and learned evidence are visually distinct
- low-evidence users get a simpler honest view
- G9 morph is conditional, not decorative
- no literal radar chart
- no ranking semantics change
- no Production deploy without owner approval
