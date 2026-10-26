# GPT / Codex 審查（bd82ee7）的修正

Claude Opus 5.5，2026-10-26。審查：`~/.codex/reviews/earth-ascension/claude-m7-m11-20261026/REVIEW.txt`（changes requested）。

| 發現 | 修法 | 證據 |
| --- | --- | --- |
| P1 採藥後存檔校驗失敗（`j.fullSince=undefined`，v1 也受影響） | 改為只在存在時 `delete` | review-fixes.test 第一項：v1／v2 採藥中、返院後、下一趟遠行後都能存讀；正常 UI 採藥中與返院後手動保存成功 |
| P2 成立前的遠行被算成共同經歷 | 只計入成立後出發、成立後返院的遠行 | 第二項 |
| P2 弟子叫停後續，師父意圖又自動重開並結算 | 任一方叫停都清掉對應的師徒後續意圖；可重約 | 第三項（兩個方向＋存讀）；正常 UI 弟子叫停後 60 秒不結算、重約後完成 |
| P2 缺少約定參數時先寫入再丟例外 | 驗證 undefined／null／非字串，任何寫入前拒絕 | 第四項 |
| 帳務：M2 的 projection-samples.json 被我的回歸重跑改寫 | 還原為 292bc9a 原始內容；之後重跑完整回歸仍會重寫此檔，提交前需還原 | git |

新測試對 bd82ee7 執行 0/4 通過（review-fixes-against-bd82ee7.log）；審查者的 5 個 probe 對修正後版本 5/5 通過（reviewer-probes-on-fix.log）；完整回歸 154 項通過；正常 UI 兩個視窗通過（review-fixes-ui-accepted-*）。M10／M11 的標記狀態不改寫；真人試玩仍未執行。
