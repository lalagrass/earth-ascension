# BALANCE v1.78 — 60-day no-goal longrun, resource invariant, 岳不群 fix

Refs ROADMAP-NEXT-2026-10-26 (v1.78). Same scripted player as `artifacts/review-fix/longrun.mjs`. The only change: patrols use `target: 'inf'`, so they go past 1600 into the endless section (絕頂之上, 200 steps per layer).

## 1. 岳不群 regression (v1.75 5/5 → v1.76 3/5 reaching 1600)
- **Root cause.** With the v1.76 food gate, sects keep 16–17 disciples instead of 14–16, so he gets more chat, spar and pass invitations. `chatMates` and `passPick` could pull a disciple out of **meditate**, and more than half of his meditations were interrupted. Meditation is the only way to ease 違心, so it stayed high (mood term −17 vs −8). His mood sat under `EXP.moodMin` 30, and patrols aborted with 「岳不群心情低落」.
- **Fix (閉關不見客).** A disciple who is meditating can no longer be picked as a chat, spar, encourage or pass partner. The change is two filters: `src/sim.mjs` chatMates and `src/bonds.mjs` passPick.
- **30-day 35-case result.** 35/35 runs complete.
  - 岳不群 reaches 1600 in 4/5 runs; the fifth stops at 1580. Before the fix it was 3/5 (seeds 11 and 17 stopped at 1108 and 901).
  - Mood average is 49.6 → 53.6.
- **Side effects at 30 days, per seed (v1.76 → v1.78):**
  - Most openings are unchanged or up.
  - 郭靖 seed 17 drops 1380 → 805 and seed 7 drops 1600 → 1380; seeds 3 and 23 rise. This is the usual chaotic spread from a changed RNG path; I don't see a systematic drop.
- **Golden changed** (`test/fixtures/golden-30d*.txt`). The fix changes who can be invited, so the seeded RNG sequence changes. There are no data or constant changes.
- Test: `test/v178.test.mjs`「閉關不見客」. It fails on the old code (22 pulls) and passes on the new code (0 pulls).

## 2. 60-day curve (35 cases, averages; `artifacts/v178/summary60.json`)
| day | coin (min–max) | stages built | raids (cum) | best step | endless layer avg / max | disciples | couples | pill |
|---|---|---|---|---|---|---|---|---|
| 10 | 453 (218–585) | 16 | 30 | 1134 | 0 / 0 | 12.7 | 3.8 | 3.5 |
| 20 | 1269 (623–1553) | 16 | 42 | 1444 | 0.6 / 3 | 14.1 | 9 | 8 |
| 30 | 2116 (1064–2548) | 16 | 55 | 1537 | 0.9 / 3 | 15.2 | 14.9 | 8.8 |
| 40 | 3103 | 16 | 67 | 1605 | 1.3 / 3 | 15.2 | 21 | 8.2 |
| 50 | 4079 | 16 | 79 | 1628 | 1.5 / 3 | 15.2 | 26.9 | 8.5 |
| 60 | 5071 (2657–5963) | 16 | 91 | 1650 | 1.6 / 4 | 15.2 | 30.1 | 8.6 |

Ring populations are flat across the whole run: foot 18, wood 23, slope 23, gorge 9, cliff 18, cave 18, peak 13.

Damage taken at home from raids is cumulative 27.6 per run, all of it before day 10. Departures and deaths average 0.1 per run.

Per opening at day 60:

| opening | food-gate days | best step | endless layer | runs reaching 1600 | coin |
|---|---|---|---|---|---|
| plain | 0.8 | 579 | 0 | 0/5 | 2698 |
| 郭靖 | 1.1 | 1568 | 0.2 | 3/5 | 4613 |
| 韋小寶 | 1.1 | 1961 | 2.2 | 5/5 | 5771 |
| 令狐沖 | 1.1 | 1800 | 2 | 5/5 | 5572 |
| 岳不群 | 1.3 | 2040 | 3.2 | 5/5 | 5369 |
| 張無忌 | 1.0 | 1806 | 2 | 5/5 | 5735 |
| 阿星 | 1.6 | 1796 | 1.8 | 5/5 | 5740 |

**Implications for v1.8+:**
- **There is no coin sink.** All 16 stages are built by day 10, and coin then grows linearly at about 95 per day, reaching about 5k by day 60.
- **Raids stop mattering.** They arrive steadily at about 1.2 per day, but cause no damage after day 10.
- **The endless section is barely used.** The average depth is 1.6 layers and the maximum is 4. Progress stalls at about 1650 because ×1.18 per-layer scaling outruns growth.
- **Plain never leaves the mid-route.** Its best step stays around 580.
- **The population is saturated.** Disciples plateau at 15 by day 30, while couples keep climbing to 30.

## 3. Resource invariant
`test/v178.test.mjs` puts a Proxy on `s.res` and runs 3 cases for 15 days with the scripted player. It checks three things:
1. No value is ever negative.
2. Every write comes from a whitelisted `(resource, sign, file:function)` channel. There are 34 channels, taken from a 3-seed × 7-opening × 40-day audit.
3. For every resource, final = initial + Σ deltas.

**Ledger gaps found** (these resource changes are not booked in `s.ledger`; they are documented here only, so golden is kept):
- cook veg −2
- boar kill food +2
- expedition loot
- chapter and aspiration rewards
- jianghu card coin and food
- adoption coin and food
- 神鵰 feeding
- jianghu herb

This is a candidate fix for v1.8, and it will change golden.

## Files
- `artifacts/v178/longrun60.mjs`, `analyze60.mjs`, `longrun60.json`, `longrun60.log`, `summary60.json`: the 60-day runs.
  - `longrun60.log` was regenerated from the JSON. The first run's console line printed `final` as undefined because of a script typo. The run is deterministic and the data was unaffected.
- `artifacts/v178/longrun-results.json` and `longrun.log`: the standard 30-day 35-case matrix after the fix.
