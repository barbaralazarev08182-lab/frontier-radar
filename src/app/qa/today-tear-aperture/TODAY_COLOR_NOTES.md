# Today color notes

## Warm Milk Orange — archived for future use

Status: **DO NOT use for Signal 07 in the current Today design.** Signal 07 keeps its original solid Wildcard orange treatment.

This palette was tested in R23 and is worth retaining for a future secondary state, editorial surface, onboarding moment, ambient panel, or non-Wildcard feature.

- Base field: `rgba(248,240,234,.98)`
- Warm orange: `rgb(241,96,46)` / `#F1602E`
- Radial wash: `rgba(241,96,46,.24)` → `rgba(241,96,46,.12)` → transparent
- Secondary warm highlight: `rgba(255,184,139,.075)`
- Recommended text on stronger warm fields: white / warm white
- Character: soft, editorial, warm, translucent, less aggressive than the canonical Wildcard orange

Reference treatment:

```css
background:
  radial-gradient(ellipse at 58% 44%, rgba(241,96,46,.24) 0, rgba(241,96,46,.12) 31%, transparent 61%),
  linear-gradient(112deg, rgba(241,96,46,.095) 0 20%, rgba(241,96,46,.14) 20% 59%, transparent 59% 72%, rgba(255,184,139,.075) 72% 100%),
  rgba(248,240,234,.98);
```
