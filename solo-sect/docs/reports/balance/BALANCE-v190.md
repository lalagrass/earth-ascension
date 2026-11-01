# BALANCE v1.9 (Refs ROADMAP-NEXT-2026-10-26 v1.9)

Runs: 5 seeds (3, 7, 11, 17, 23) × 7 openings = 35 cases, 30-day and 60-day, plus a 30-day A9 comparison. Data: `artifacts/v190/longrun-results.json`, `longrun60.json`, `longrun-a9.json`; metrics: `analyze.json`, `analyze-a9.json`; logs in `artifacts/v190/logs/`.

## Acceptance (30 days, default bot)
| Target | v1.9 | Pass |
|---|---|---|
| Buildings max out at median day ≥18 | median 31 (none topped by day 30; none by day 60 either); built fraction 0.55 @d10, 0.62 @d20; all 35 still have something buildable at d25 | ✓ |
| 0.5–2 serious injuries at home per case | avg 1.83 (range 0–3) | ✓ (average) |
| No deaths | 0 | ✓ |
| 30–70% pay extortion | 40% of raid events paid (31/35 cases paid at least once) | ✓ (per event; per case it is 89%) |

"Home serious injury" counts only raid injuries (`threat.homeHurt`), not patrol injuries.

## No-regression
| Check | v1.85 | v1.9 |
|---|---|---|
| Famine (share of cases with ≥5 hungry days) | 0.17 | 0.14 |
| 岳不群 1600 (30d) | 4/5 | 4/5 |
| 郭靖 1600 (30d) | 3/5 | 3/5 |
| Couples max | 5 | 5 |
| Bankruptcies | 0 | 0 |
| Coin d30/d10 avg | — | 0.93 (agg 0.77); >2×: plain7, plain17 (v1.85: 8 cases) |
| Best power avg | 1419.4 | 1397.7 |

The "coin >2×" item: the new sinks (lots, rare-gated stages, extortion/raid losses) cut over-2× cases from 8 to 2; both remaining are plain-opening seeds.

## 60 days
0 bankruptcies, couples max 5, 岳不群 5/5, 郭靖 4/5 (v1.85: 5/5), raids 9.2/case, home injuries 4.17/case, 0 deaths, coin d60/d10 1.62 (v1.85 2.57), 5 departures over all cases (unpaid wages; v1.85 did not track this), still nothing fully built at day 60.

## A9 comparison (`A9=1`, bot uses `suggestTeam`)
Honest result: worse for 岳不群 (2/5 vs 4/5) because it rotates partners instead of always sending hero+senior; 郭靖 4/5; homeHurt 1.66; payShare 0.42; coin >2×: 3 cases (max 7.21). The longrun bot default therefore stays the v1.85 picker; A9 is a player-facing suggestion button.

## Golden
`golden-30d*` regenerated (core hash 9f113329… → 44417b15…): new resources (鐵木/靈石), rare drops on far patrol stretches consume RNG, new stages, lots and the threat state change the snapshot. Deterministic: same seed → same hash.

## Not done
- "resv 併倉+undo" from the roadmap's v1.9 row was not requested and not implemented.
- Browser evidence for tiers, lots and raids used state edits → 已接線 only.
