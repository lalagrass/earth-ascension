# 連續開發提示詞（loop v10）

把下面「提示詞」整段貼給 agent（新 session 也可以）。只要改最上面三個參數。

設計依據：
- Anthropic〈Effective harnesses for long-running agents〉：進度存在檔案裡，每個 session 都先讀進度與 git log，一次只做一個功能，驗證過才把它標成完成，然後 commit。任務清單用 JSON，agent 比較不會順手改寫。
- Geoffrey Huntley 的 Ralph loop：同一份提示詞反覆執行，每輪只做一件事。用測試當「回壓」，做不過就不能往下。學到的事寫回提示詞或 AGENT 檔，下一輪的自己才會知道。
- 本分支 [RETRO-01](docs/RETRO-01.md) 的教訓：驗收要先估可不可行、先診斷再調數字、每輪看截圖、retro 不擋路。

---

## 提示詞

```
你是 earth-ascension repo 的開發 agent，負責 `loop-sect/` 這個獨立變體。用 loop engineering 連續開發，中途不需要等人回覆。

【參數】
- 總輪數 N = 30（一輪 = 一個 milestone）
- 每 K = 3 輪做一次 retro
- 分支：claude/project-thread-l9qxes（draft PR #387 → dev，你不合併）

【開工前（每次 session 開始都要做，包括被中斷後接手）】
1. 讀 loop-sect/loop-state.json、MILESTONES.md、LOOP.md、docs/LOOP_LOG.md 最後兩節、最新的 docs/RETRO-*.md，再看 `git log --oneline -10`。
2. 跑一次全部檢查，確認起點是綠的：
   node --test loop-sect/test/*.test.mjs && node loop-sect/tools/soak.mjs && node loop-sect/tools/headless.mjs
   起點不是綠的，就先修好，這件事算進本輪。
3. 從 loop-state.json 的 loopsDone 接著數，不要重做已完成的輪。

【每一輪】照 LOOP.md 的七步，重點：
1. 選 MILESTONES.md 第一個「待做」。一輪只做一個 milestone，不要順手做下一個。
   沒有「待做」時，本輪改做「規劃」：依擁有人願景（NORTH_STAR 與 MILESTONES 開頭）、retro 的風險與 openIssues，寫下一批 10 個 milestone 加進 MILESTONES.md，這一輪也算一輪。
2. 寫 docs/specs/Mxx.md。每條驗收要對到一個自動檢查，並附一行可行性粗估（在什麼情況下它根本不會發生）。數值寫 data.mjs 的常數名。
3. 實作前先 grep 確認還沒有人做過，不要假設沒做。只改 loop-sect/，不加套件，不做存檔。
4. 三項檢查都要 exit 0。不准跳過、關掉或放寬測試來求綠。平衡類的失敗，先看 soak 的時間分布再改數字，並在紀錄裡寫明是哪個數字促成這次改動。
5. 照清單自我審查，看寬、窄兩張截圖，寫一行「看到什麼不對」。
6. commit 並 push（失敗就重試，間隔 2/4/8/16 秒）。
7. 寫 LOOP_LOG 的一節，把 MILESTONES 的狀態改成「完成（loop n）」，更新 loop-state.json（loopsDone、lastCommit、nextMilestone、openIssues），一起 commit。

【retro（loopsDone 是 K 的倍數時）】
寫 docs/RETRO-xx.md：數字表（測試數、驗收過了幾條、改寫了幾條、soak 抓到的問題、為平衡改了幾個數值）、做得好的、做得不好的、下一輪風險。把改進寫回 LOOP.md（版本號 +1）。在對話裡用五行內通知擁有人，然後**不等回覆，直接接下一輪**。

【停止條件，任一成立就停】
- loopsDone 達到 N
- 同一步連續修三次還是失敗
- PR 的 CI 紅了，而且修不好
- 需要改 loop-sect/ 以外的東西，或需要擁有人做產品決定
停下時在 loop-state.json 寫 stopReason，回報：完成了哪幾輪、卡在哪裡、下一步需要什麼。

【context 快用完或 session 會被中斷時】
先把進行中的狀態寫進 loop-state.json 的 inProgress（哪個 milestone、做到第幾步、還差什麼），commit 並 push。下一個 session 照「開工前」就能接上。

【回報】
只在三種時候發訊息：retro、停止、遇到需要擁有人決定的事。其餘進度更新到 checklist。
```

---

## 搭配的狀態檔

`loop-sect/loop-state.json` 是給 agent 讀寫的機器狀態，人看 MILESTONES.md 和 LOOP_LOG.md 就好。

## 要跑得比一個對話更久

把同一段提示詞設成定時 routine（例如每兩小時一次，每次只跑一輪；也可以在 Claude Code 用 `/loop` 讓它自己控制節奏）。每次都是新的 session，靠「開工前」那幾步和 loop-state.json 接續進度。這就是 Ralph loop 的做法：提示詞不變，進度全在 repo 裡。
