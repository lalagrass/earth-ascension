# BALANCE v1.85 — money sinks (wages, upkeep, market), A10 recruitment trips, plain dorm, 郭靖

Same harness as v1.8: 35 cases (7 openings × seeds 3/7/11/17/23), `artifacts/v185/longrun.mjs` (30 d) and `longrun60.mjs` (60 d). The bot in the harness additionally sends a school trip when nobody is waiting to join, sells pills above 6, buys herbs when herb <5 and coin >300, buys a weapon when coin >500. Raw: `artifacts/v185/longrun-results.json`, `longrun60.json`, stats `analyze.json`.

| Metric | v1.8 | v1.85 | Target |
|---|---|---|---|
| coin d30/d10 (mean of cases) | 4.6× | **1.66×** | ≤2.0× |
| coin d30/d10 (aggregate Σd30/Σd10) | — | **1.40×** | ≤2.0× |
| coin d30/d10 worst case | — | 4.41× (8/35 cases >2×: plain×4, 郭靖×3, 岳不群×1 — small d10 coin) | — |
| coin d60/d10 (60 d run) | — | 2.57× (d30/d10 in same run 1.69×) | v1.95 target ≤2.5× |
| bankrupt (anyone left over wages or coin <0) | — | **0/35** (30 d and 60 d) | 0 |
| unpaid bills per case (mean) | — | 0.74 (30 d), 0.69 (60 d); max leavers 0 | leavers ≤1 |
| famine days (food<5) per case | (v1.8 baseline kept, no regression flagged) | 0.17 | no regression |
| 岳不群 reaches 1600 | 4/5 | **4/5** (60 d: 5/5) | ≥4/5 |
| 郭靖 reaches 1600 | 0/5 (best 1530) | **3/5** (1480 1600 1600 1331 1600; 60 d: 5/5) | ≥3/5 |
| couples max / mean | ≤5 | 5 / 4.17 | ≤5 |
| plain disciples | 7–8 (pool exhausted, 8 beds) | **12** (5/5) | ≥10 |
| plain best power | (not tracked) | 515–551 | doc wish ≥700 — **not met** |

Notes
- Wages grow as N^1.5 so a big sect pays more per head; cap 400 keeps late game from death-spiralling. Outer disciples weigh 0.25 (at 1.0 the plain/large openings went into repeated misses).
- 郭靖 is chaotic: damage multiplier 1.2 → 2/5, 1.35 → 3/5, 1.5 → worse. 3/5 is at the edge; it may flip with unrelated changes.
- Golden regenerated: wages/upkeep, the dorm stage, market/school hooks and the 郭靖 early buff change resources and the RNG path.
