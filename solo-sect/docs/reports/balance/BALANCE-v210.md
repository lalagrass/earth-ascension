# BALANCE v2.1 — plain arc, plain income, gate safety, pill counts

Date: 2026-10-29 (Taipei). Rules version stays `1.95`. Save version stays 1. This package does not migrate saves.

Refs MILESTONES-2026-10-26 v2.1.

Same scripted player as `artifacts/v200/longrun60.mjs` (no `A9`). Matrix: seeds 3, 7, 11, 17, 23 × openings plain, guojing, weixiaobao, linghuchong, yuebuqun, zhangwuji, axing. Raw: `artifacts/v210/longrun30.json`, `artifacts/v210/longrun60.json`. Summary: `artifacts/v210/analyze.json`. v2.0 files were not overwritten.

Knobs that shipped: `PLAIN.earlyDays = 10`, `earlyBonus = 4`, `repMul = 0.6`. `RAID.logAfter = 30`, `logK = 0.2`, `hurtCool = 2`. `hurtCool` was not raised. No injury ceiling. The plain art is 風雷掌腿, not 降龍十八掌.

## 1. Acceptance

| Check | Target | v2.0 (60 d) | v2.1 (60 d) |
|---|---|---|---|
| plain best, 5 seeds | ≥700, 5/5 | 515–551, 0/5 | 551, 585, 585, 657, 657, **0/5** |
| coin d60/d10 | every case ≤2.5×, average ≤2.0× | avg 1.62; 6 cases over (all 5 plain, guojing3 2.67) | **avg 1.00; 0 cases over** |
| home serious injuries | average 0.5–2, deaths 0 | 4.17, deaths 0 | **3.83** (0–6), deaths 0 |
| pill made / (used + sold + aged) | a number; ≤1.3 or list it | not measured | **1.14** (2271 / 410 / 1585 / 0). Five cases are over 1.3; see §5 |
| 岳不群 to 1600 | ≥4/5 | 5/5 | **5/5** |
| 郭靖 to 1600 | ≥3/5 | 4/5 (seed 7 is 1581) | **4/5** (seed 7 is still 1581) |
| wage departure | do not bankrupt a run | 0 | **0** (the five 岳不群 departures are the same story leaves as v2.0) |

35/35 runs finished. Invariant failures: 0. Threat deaths: 0.

Two targets are misses. They are recorded here and not forced.

## 2. Plain power — miss

The card `wuming` is in `destiny-trees.json` (`arcs.plain`, `checks.plain`). On a plain game (`s.hero` is null) the checker fires at day 15, before any stuck jianghu card can block the day. Nobody is at the keyboard, so option 0 resolves at once. Both options teach 風雷掌腿 at 大成 (`xp` 56, first bottleneck broken). A template opening does not take this card.

By the record-setting trip, ordinary training has carried that art to the next cap. 雷動九天 is on the move list. On seed 7 the selected per-second move at the record is 崩拳 (基礎拳 also reached 圓滿, about 32.8), and 雷動九天 is second (about 29.2). On seed 17, 雷動九天 is the selected move (about 29.2). Palm skill is 100 either way.

The team is still 主角 + 林師姐. The record trip turns around in 深谷, short of the bridge bear at 700:

| Seed | Best | Day of that record | Reason | Stamina left |
|---|---|---|---|---|
| 7 | 657 | 43 | 主角氣血低於 50% | 72 |
| 17 | 551 | 19 | 主角氣血低於 50% | 87 |

Seeds 3, 11, and 23 land at 585, 585, and 657. Stamina is not the wall. One 大成 on the hero does not keep both bodies above the 50% retreat line through the gorge. 林師姐 does not learn the art. This package does not grant a second art, does not raise the tier by hand, and does not swap in a secret classic.

## 3. Plain coin — met, after one knob step

`incenseOf` is unchanged when `s.hero` is set. Plain only:

- Through day 10, add `earlyBonus` (4) on top of the old base and reputation term.
- After day 10, the reputation term is multiplied by `repMul` and floored.

`repMul` 0.5 made every 60-day ratio legal, and it also made plain seed 11 lose one disciple to unpaid monthly wages by day 20. v2.0 had no wage departures. `repMul` 0.7 cleared the departures and pushed plain seeds 17 and 23 to 2.87× and 3.37×. `repMul` 0.6 clears the departure and keeps every 60-day case ≤2.5×.

Plain 60-day coin, d10 → d60:

| Seed | d10 | d60 | Ratio | Built | Disciples |
|---|---|---|---|---|---|
| 3 | 44 | 75 | 1.70 | 12 | 12 |
| 7 | 49 | 72 | 1.47 | 16 | 12 |
| 11 | 37 | 44 | 1.19 | 16 | 12 |
| 17 | 51 | 89 | 1.75 | 16 | 12 |
| 23 | 35 | 43 | 1.23 | 15 | 12 |

End coin is much smaller than v2.0's 226–291, and built stages are 12–16 instead of 18–20. The ratio is the acceptance, and it passes. Nobody ends below 0. The ledger line 「明晨預計」 uses the same `incenseOf`, with tomorrow's day.

At day 30, plain seed 11 is 2.65× (the only case over 2.5 in the 30-day file). By day 60 that same case is 1.19×. The milestone measures the 60-day ratio.

郭靖 seed 3 was 2.67× in v2.0 and is 2.12× here. Plain income does not apply to 郭靖. The drop comes from the threat schedule (fewer or cheaper raids), which the milestone allowed to move other openings. Global upkeep was not touched.

## 4. Gate injuries — miss

After a serious injury at the gate, the next visit is `hurtCool` (2) days later than the visit that was already scheduled. From day 31 the day multiplier continues from the day-30 linear value (1.5) by `ln(1 + (day-30)/30) * 0.2`, capped at 2. Day 60 is about 1.64, where the old curve was already at the cap of 2. Day 30 matches the old line, so the v1.9 cap test still holds.

60-day home serious injuries:

| Opening | v2.0 avg | v2.1 (five seeds) | v2.1 avg |
|---|---|---|---|
| plain | 2.6 | 0, 1, 3, 0, 2 | 1.2 |
| guojing | 3.2 | 5, 4, 0, 3, 6 | 3.6 |
| weixiaobao | 5.0 | 5, 4, 3, 3, 4 | 3.8 |
| linghuchong | 5.4 | 6, 4, 3, 6, 6 | 5.0 |
| yuebuqun | 4.0 | 4, 5, 5, 2, 4 | 4.0 |
| zhangwuji | 5.6 | 3, 4, 3, 6, 6 | 4.4 |
| axing | 3.4 | 5, 4, 3, 6, 6 | 4.8 |
| all 35 | 4.17 | 0–6 | **3.83** |

Deaths stay 0. The 30-day average is 1.63, which sits inside 0.5–2. The overshoot is the second month. `logK` was left at 0.2. A flatter curve was not iterated, and no cap was added to force the chart.

## 5. Pills — measured, not tuned

Counters are lazy (`s.pills` appears on the first brew, heal, sale, or aging). Sell and age are not counted as healing.

60-day totals: made 2271, used (heal) 410, sold 1585, aged 0. Ratio 2271 / 1995 = **1.14**, under 1.3.

Cases over 1.3, left for the next version: linghuchong3 1.33, plain7 1.38, yuebuqun7 1.32, yuebuqun11 1.32, guojing23 1.40. plain3 and plain23 never brewed a pill, so they have no ratio. Nothing aged: the bot sells stock down before the aging rule fires. That split is the measurement. The rates were not changed.

## 6. Golden

`test/fixtures/golden-30d.txt`: `21d793baf6b63256` → `fc6db9bc522e0316`.

`test/fixtures/golden-30d-core.txt`: `58e8b7588d4c777f` → `e7828e732a099e3a`.

Seed 42, 30 days, tick only (the golden does not send patrols, so `records.sect` stays 0):

1. Plain incense. The first 10 mornings add 4. After that the reputation term is ×0.6. Idle coin at the end of the run is 95.
2. The day-15 card teaches 風雷掌腿 and sets `s.jh.wuming`. Training then takes the art to xp 100 and unlocks storm, storm2, storm3. Arts, moves, and the log change.
3. Pill counters do not appear. This seed never brews, so `s.pills` is absent and is not part of the hash.
4. Threat does not fire. Headcount stays under 8, so `homeHurt` is 0 and `next` stays 35. The log curve and the 2-day cooldown do not write a raid onto this save.

`repMul` 0.5 and 0.6 hash the same on this idle seed: the reputation segments floor to the same integer. The longrun, which spends and recruits, does feel the difference (§3).

## 7. What was clicked

Opening the ledger was clicked in headless Chrome (`artifacts/v210/smoke-v210.mjs`, port 19201, not 8800). After 「開山立派」:

- 照舊（無名主角）: 明晨預計 香火 +6 (base 2 + early bonus 4). `s.hero` is null.
- 郭靖 with the default 黃蓉: +4 (base 2 + companion 2). That +4 is not the plain bonus.
- Counterexample: 郭靖 switched to 穆念慈 before start: +2. No page errors.

The day-11 drop in the plain forecast was checked by `test/v210.test.mjs` (payday coin matches `incenseOf`). It was not clicked through 11 game days. The plain card never appears on screen, because a plain game has no one to ask; the unit test and the longrun are the evidence for that path.
