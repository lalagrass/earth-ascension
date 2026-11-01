# BALANCE v1.8（2026-10-26）

Refs ROADMAP-NEXT-2026-10-26 v1.8. 35 cases = 5 seeds (3, 7, 11, 17, 23) × 7 openings. Raw data: `artifacts/v180/longrun-results.json` (30 d), `artifacts/v180/longrun60.json` (60 d); summaries `analyze30.json`, `analyze60.json` (`node artifacts/v180/analyze.mjs`).

| Metric | Target | v1.78 30 d | v1.8 30 d | v1.78 60 d | v1.8 60 d |
|---|---|---|---|---|---|
| Couples per case (avg / min–max) | 3–5 | 14.8 / 4–24 | **3.71 / 1–5** | 30.1 / 5–44 | **3.80 / 1–5** |
| 傳功 per case per day (avg / max) | ≤1.5 | not recorded | **0.74 / 0.80** | not recorded | **0.85 / 0.90** |
| Famine days in days 1–5 (avg) | ≤1, no regression | 0.31 | **0.26** | — | — |
| Food-low days over the whole run (avg) | — | — | — | 1.15 | 1.31 |
| 岳不群 reaching 1600 | ≥4/5 | 4/5 | **4/5** | 5/5 | **5/5** |
| Average best score | — | 1416 | 1405 | 1650 | 1675 |
| Average coin at the end | — | 2107 | 1651 | 5071 | 4687 |
| Cases OK | 35 | 35 | 35 | 35 | 35 |

郭靖 (30 d), seed: 3→1380, 7→1480, 11→1430, 17→1530, 23→1380. The v1.78 drop on seed 17 (805) is gone.

Notes
- Couples: the 5 cap and the 5-day cooldown always hold. Five cases end below 3 couples (30 d: seeds 3, 7, 11, 23 plain and seed 3 郭靖), because pairs that are mutual sweethearts and compatible enough are rare in small plain sects. The floor is emergent, not forced.
- Weddings now cost 100 coin each, a small coin sink: about 370 coin per case over 30 days.
- 傳功: a pass reserves the day's slot when it starts. Without that, several leads could start at once, and saturation alone left the rate at 1.74–1.79 per case per day. The tuning went sat 0.5 → 0.3, pairDays 1 → 2, then a perDay cap (tried 1; set at 2). A cap of 1 dropped 岳不群 to 3/5 at 30 d, so it is 2.
- Golden: regenerated. Marriage and pass rules change who does what each tick, so the RNG path changes. The ledger commit (526e7e1) changed ledger fields only: the hash without ledger/ledgerPrev is identical.
