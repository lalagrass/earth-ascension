# BALANCE v1.95 — ecology (Refs ROADMAP-NEXT-2026-10-26 v1.95)

Runs: 5 seeds (3, 7, 11, 17, 23) × 7 openings = 35 cases, 30 and 60 days, same v1.9 bot (v1.85 team picker). Data `artifacts/v195/longrun-results.json`, `longrun60.json`, `analyze.json`, logs in `logs/`. Rejected variant: `longrun-skip.json`, `longrun60-skip.json`, `analyze-skip.json`, `logs-skip/`.

## What changed
- `src/world.mjs` ECO2: ring cap = base max × (0.5 while den razed) × (1 − kill pressure, ≤0.3; +0.02 per kill, ×0.85/day). Growth per `regen` s = immigration (1 with den, 0.5 without) + 2·4·x(1−x) logistic breeding; above cap the ring shrinks 1 per `regen` s. No RNG.
- Den: ≥4 kills in one ring in one trip razes its den for 5 days, then it rebuilds (BL-D07 "cleared ≠ permanently safe"; roadmap I-7 "cap −50% for 5 days").
- Report: mutually exclusive outcome fields (encounters = knocked + driven off + evaded + other), razed dens listed.
- Raid descent: the roadmap does not tie raid descent to ring populations (I-7 only lists dens, cap feedback and kills), so the boar raid / descent animation is unchanged (still `s.eco.boar` + foot nest path).

## Acceptance
| Target | 30 d | 60 d |
|---|---|---|
| ≥1 ring per case ≤30% of base cap, then recovers (≥60%) | 35/35 | 35/35 |
| Recovery time (days, median / max) | 2.5 / 5.35 | 2.51 / 5.65 |
| Rings that never recovered by run end | none | peak once (low near day 60) |
| Rings that hit 0 (times) | 50 | 71 |
"≤30%" is measured against the base max (stricter than against the lowered cap).

## No-regression
| Check | v1.9 | v1.95 30 d | v1.95 60 d |
|---|---|---|---|
| Famine (starve5 / foodLowDays) | 0.14 / 0.99 | 0.14 | 0.99 |
| 岳不群 1600 | 4/5 (30d), 5/5 (60d) | 4/5 | 5/5 |
| 郭靖 1600 | 3/5, 4/5 | 3/5 | 4/5 |
| Couples max | 5 | 5 | 5 |
| Bankruptcies | 0 | 0 | 0 |
| Coin d30/d10 avg | 0.93 | 0.93 (>2×: plain7, plain17) | d60/d10 1.62 (roadmap ≤2.5× ✓) |
| Home serious injuries avg, deaths | 1.83, 0 | 1.83 (0–3), 0 | 4.17, 0 |
| Extortion paid (per event) | 0.40 | 0.40 | 0.40 |

All 30-day metrics are identical to v1.9: populations now only feed caps/map/report and use no RNG, so the sim path is unchanged. The 60-day home-injury average (4.17) is above the 0.5–2 band per case; it is ~2.1 per 30 days and identical to v1.9 (the band was defined on 30-day runs).

## Rejected variant: "empty ring → no encounter"
First build skipped encounters in a ring at 0 (and used harsher params: kill 0.03, max 0.4, den at 3 kills). 30 d: 岳不群 3/5, 郭靖 **0/5**, bestAvg 1353 (v1.9 1398); 60 d was fine (5/5, 4/5). A NOSKIP check on the same params restored 郭靖 3/5 and 岳不群 4/5, so the skip was the cause: the small gorge ring (cap 9) is often emptied and the hard bear/chief fights disappear. Gentler params alone still left gorge at 0 and 郭靖 at 1/5. So populations do not gate encounters in v1.95; that is the main open item for a later version (e.g. scale encounter spacing instead of skipping).

## Buildings at 60 days (measure only, tiers unchanged)
- 0/35 cases max out all buildings by day 60 (median "top day" >60). Built fraction at d60: avg 0.85, best 0.95; 1 case is one stage short.
- Missing stages at d60 (cases): 護山哨 34, 鐘樓 26, 大殿 20, 演武廣場 18, 客房 7, 水井 5, 醫館 4, 大膳房 2, 演武場 1.
- So the most common blockers are v1.6 plot buildings (護山哨, 鐘樓): the bot buys plots conservatively (only with wage+upkeep reserve; 4 bought by day 60 in seed 3 plain). Tier 4 (大殿, 演武廣場) is the second blocker, in about half the cases. If tiers feel too hard, the data points at plot pricing / bot plot policy first, then tier-4 renown (70/60) + rare costs.

## Golden
`golden-30d*` regenerated (core 44417b15… → 58e8b758…; full 441feb23… → 21d793ba…). Cause: rules version 1.95, new report fields (`out`, `razed`, `encN`) and report log text, den/kill-pressure fields. No RNG change (30-day longrun metrics identical to v1.9). `test/v155a` pop-kill check now compares against the pre-kill count because logistic breeding can add a wood animal in the same step.
