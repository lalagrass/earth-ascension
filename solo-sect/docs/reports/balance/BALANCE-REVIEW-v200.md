# v2.0 Balance Review: 60 days, comparing v1.46, v1.75 and v2.0

Date: 2026-10-26 (Taipei time). Rules version 1.95 (v2.0 is a pure refactor, so the rules did not change).

Matrix: 5 seeds (3, 7, 11, 17, 23) × 7 openings = 35 cases, run for both 30 and 60 days.

Data: `artifacts/v200/`
- `longrun-results.json` (30 days) and `longrun60.json` (60 days)
- `analyze.json`
- `extra-v200.json`, made by `extra-v200.py`
- `parity-v200.txt`

## 0. The v2.0 runs match v1.95 exactly

- The 30-day and 60-day longrun JSON and `analyze.json` from v2.0 are deep-equal to `artifacts/v195/`.
- The core and full golden fixtures did not change.
- `parity-v200.mjs` ran each opening (plain plus 6 templates) on 3 seeds for 30 days, once on the pre-refactor `src` and once on the current one. All 21 save hashes match.

So every v2.0 number below is also the v1.95 number. A8 changed nothing in gameplay.

## 1. Every metric, against the targets

Sources:
- **v1.46** and **v1.75** come from their 30-day reports, which used the older bot. They had no 60-day runs. v1.75 is the roadmap's §0 table (v1.76 baseline).
- **v2.0** columns come from the v1.95 bot, which buys plots, pays wages and runs raids. The bots differ, so read the trend, not exact deltas.

| Metric | Target | v1.46 (30d) | v1.75/1.76 (30d) | v2.0 30d | v2.0 60d | Met at 60d? |
|---|---|---|---|---|---|---|
| Coin d30/d10 (60d: d60/d10) | ≤2.0× (60d ≤2.5×) | 3.8× | 4.5–4.6× | 0.93 avg; 2 cases >2× (plain7, plain17) | 1.62 avg; **6 cases >2.5×** (all 5 plain at 4.8–6.6×, guojing3 2.67×) | Average yes; per case **no** |
| Bankruptcies | 0 | — | — | 0 | 0 | yes |
| Building top-out | ≤70% built by day 15; still buildable on day 25 | 7 stages by day 2–4 | 16/17 by day 4–8 | 0/35 topped out; built 55% on d10, 62% on d20; 35/35 buildable on d25 | 0/35 topped out by d60; built 85% avg, 95% max | yes, but too slow (see §2) |
| Couples | 3–5 | 12.4 avg (3–21) | 14.5 avg (4–21) | 4.26 avg, max 5 | max 5 (3–5) | yes |
| Skill transfers per case per day | ≤1.5 | — | 5–6 | — | 0.68–0.92 (avg 0.82) | yes |
| 岳不群 reaches 1600 | ≥4/5 | 2/5 | 3/5 (min 901) | 4/5 | 5/5 | yes |
| 郭靖 reaches 1600 / best | ≥3/5 / ≥1500 | 2/5 / 1281–1600 | 1/5 (0/5 in v1.75) / 1444 | 3/5 (11 seed: 656) | 4/5; best 1581–2000 | yes |
| plain disciples / best | ≥10 / ≥700 | 7 / 482–551 | 7 / 551–691 | 12 / 482–551 | 12 / 515–551 | disciples yes; **power no** |
| Home serious injuries / deaths per case | 0.5–2 / 0 | 0 / 0 | 0 / 0 | 1.83 avg (0–3) / 0 | **4.17** / 0 | 30d yes; **60d no** |
| Raid extortion paid share | (I-6) | — | — | 0.40 | 0.40 | — |
| Population: ≥1 ring ≤30% and recovers | ≥1 per case | every ring full | every ring full | 35/35 (median 2.5 days) | 35/35 (median 2.51 days; peak never recovered in 1 case) | yes |
| Pill stock | production/use ≤1.3 | — | 0–10 (made more than used) | 0–10 | 0–10 | **not measured** (the bot records stock only) |
| Endless stretch tested | 35 cases have a no-target group | 0 cases | 0 cases | bot uses `inf` target | 29/35 cases past 1600 by d60 | yes |
| Food shortage in first 5 days | ≤1 day | 1.9 days | 0.3 days | 0.14 | 0 snapshot zeros in the first 5 days; foodLowDays 0.99 over 60 days | yes |
| Unpaid-wage departures | (I-1) | — | — | — | 5 across 35 cases | watch |
| bestAvg | — | — | — | 1397.7 | 1654.1 | — |

60-day results by opening (`extra-v200.json`):

| Opening | Disciples | Best | Couples |
|---|---|---|---|
| plain | 12 | 515–551 | 3–5 |
| guojing | 17 | 1581–2000 | 4–5 |
| weixiaobao | 17 | 1800–2030 | 4–5 |
| linghuchong | 17 | 1800 | 4–5 |
| yuebuqun | 17–18 | 1800–2130 | 5 |
| zhangwuji | 18–19 | 1780–1800 | 4–5 |
| axing | 19 | 1780–1881 | 4–5 |

**Verdict on the v2.0 acceptance line ("every metric meets its target over 60 days"): not met.**

3 targets miss:
- plain best power stays at 515–551, against a target of 700.
- 60-day home injuries average 4.17, against a band of 0.5–2.
- Per case, all 5 plain cases inflate coin by 4.8–6.6× from d10 to d60. Their d10 coin is small (36–57), so the ratio overstates the absolute amounts (226–291). The 60-day average of 1.62 hides this.

1 target cannot be measured: the pill production/use ratio.

All other targets are met.

## 2. Open items (not fixed in v2.0)

1. **Encounters do not yet react softly to population.** In v1.95 a ring at 0 still produces encounters. Removing them outright (the "skip" variant) put 郭靖 at 0/5 and was rejected. The next step is a soft scale, such as encounter chance × max(0.3, pop/cap). It needs its own A/B, with 郭靖 ≥3/5 as the guard.
2. **Plot pricing and the bot's plot rule.**
   - 護山哨 (missing in 34/35 cases) and 鐘樓 (26/35) are limited by plots. The bot buys a plot only when it can still keep a wage+upkeep reserve, which comes to 3–4 plots by day 60.
   - 大殿 (20) and 演武廣場 (18) are the tier-4 blockers.
   - Either lower the price curve or let the bot buy when its reserve is above 1 day. Then re-check the 85%→top-out timing, aiming for top-out around day 45–55 over 60 days.
3. **Plain-opening power 700.** plain has 12 disciples but best is still 515–551. It has no famous hero and no arc art. Candidates: a plain arc (one 大成 art around day 20) or teacher visits for plain.
4. **The 2 plain coin cases.**
   - At 30 days these are plain7 (2.85×) and plain17.
   - At 60 days all 5 plain cases exceed 2.5×. The cause is plain's low early income followed by a cheap 12-person payroll.
   - A fix should target the plain income curve, not global upkeep, which would hurt the template openings.
5. **60-day home injuries average 4.17, outside the 0.5–2 band.** Raid pressure grows with wealth and accumulates over 60 days.
   - Options: a raid cooldown after a home injury, or capping threat growth after day 30.
   - Deaths stay at 0.
6. **A9 hurts 岳不群 when automated.** In the v1.9 run with `A9=1`, 岳不群 fell to 2/5 (vs 4/5) because `suggestTeam` rotates partners. A9 stays a player-facing suggestion, and the bot keeps the hero+senior picker.
   - Fix: make `suggestTeam` keep the hero on the team when the hero is the strongest fighter.
7. **PB-17 / PB-10** (roadmap v1.85 row: PB-17, plus PB-10's main colour for the small figures). Neither was done in v1.85–v2.0; both still open.
8. **resv warehouse merge and undo** (roadmap I-11, v1.9 row). Not requested and not implemented. Warehouse stock and vegRes are still separate from `resv`, and build steps have no undo.

## 3. A8 (the v2.0 code change)

- **Data file:** `src/destiny-trees.json` holds:
  - the arc step names for 岳不群, 令狐沖, 張無忌, 韋小寶, 阿星 and 郭靖;
  - all 30 華山/江湖 choice cards (title, who, text, option labels and value deltas);
  - declarative mainline checks for 張無忌, 韋小寶 and 阿星.
- **Checker:** `src/destiny.mjs` holds:
  - `buildCards`, which rebuilds the exact old `CARDS` shape and throws if the number of effects does not match the number of options;
  - `destinyStep`, which evaluates the checks in their original order with the same short-circuit behaviour.
- **What stays in code:**
  - The effect functions, keyed by card id and option index.
  - The 岳不群/令狐沖 triggers (辟邪 states, the 思過崖 timing, the jealousy check). They have stateful side effects and do not fit the JSON vocabulary without new predicates.
- **Test changes:**
  - `test/v178`: the resource-channel whitelist now names `jianghu:FX.*` instead of `jianghu:CARDS.*.opts`. The stack frame name changed; the same 3 channels are involved.
  - New `test/v200`: 3 tests covering card equality against a pre-refactor snapshot and the checker's semantics.
