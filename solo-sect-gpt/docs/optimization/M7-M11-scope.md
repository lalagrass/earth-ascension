# 優化 M7→M11 的授權範圍

2026-10-26（Asia/Taipei）；實際主筆：Claude Opus 5.5（Anthropic，經 Claude Code 於擁有人 Mac 上執行），單一作者。M1–M6 的主筆是 GPT / Codex；本文件起的新工作不標成 GPT／Codex 主筆，也不改寫 M1–M6 的作者、done 標記或證據。

## 起點與授權

- 工作區：`/Users/chenyuying/.codex/worktrees/solo-sect-gpt/earth-ascension`，分支 `codex/solo-sect-gpt`。
- 起始 HEAD：`292bc9a3eab4e85716810ca1b9dc7c04aedb2027`（與委託整理時相同，工作區乾淨）。
- 使用者這次新增 M7–M11 授權，取代 M1-M6-scope「M6 完成後停止」的限制，並指定由 Claude Opus 接手。其餘資料保護與範圍限制照舊。
- 只改 `solo-sect-gpt/`。不改根契約、共用 CI、dev、Grok、Gemini 或其他產品；不切換或清理 `/Users/chenyuying/workspace/earth-ascension`。
- 允許本機 commit；不 push、不建 issue／PR、不留言、不 merge、不部署。不派子代理、不開其他聊天。測試服務用本機隔離埠（8879 起），不占 8800，不停他人服務。

## 產品目標

「帶出一位你記得住的弟子，完成一次有取捨的遠行。」延續單一 World、實體人物、真實移動與搬運、同圖戰鬥與保存。深化既有玩法，不換引擎、不另造抽象遠征結算、不無限擴圖。

## 分階段

| 階段 | 主題 | 文件 | 完成標記 |
| --- | --- | --- | --- |
| M7 | 指令可靠：先修遠征準備被切磋／召回卡死的 P2，定義活動所有權 | M7.md | handoff/optimization-m7.done.json |
| M8 | 看懂人物：情境化面板、具體阻擋原因、收起面板仍看得懂 | M8.md | optimization-m8.done.json |
| M9 | 經營有選擇：真實事件產生收支／耗時摘要，比較兩種安排 | M9.md | optimization-m9.done.json |
| M10 | 遠行有理由：準備、負重、路線與撤退的可追溯後果 | M10.md | optimization-m10.done.json |
| M11 | 人物有後續：一師一徒的有限約定與真實共同記憶 | M11.md | optimization-m11.done.json |

每階段依序：盤點 → 短 spec 與事前驗收（先寫入文件並 commit，再實作）→ 實作 → 測試 → 正常 UI 驗證 → 修補 → 文件／證據 → 本機 commit。看到結果後不改事前標準；失敗與修補保留。全部完成才寫 `handoff/optimization-m7-m11.done.json`。

## 驗證分層

- 模型測試：`node --test solo-sect-gpt/test/*.test.mjs solo-sect-gpt/test/integration/*.test.mjs solo-sect-gpt/test/optimization/*.test.mjs`。開發用 3 seed，一般行為至少 5 個固定 seed（11、29、73、101、211），高風險擴大。
- 正常 UI：只經正式 UI 操作（表單、按鈕、畫布點擊）；`window.__game` 只讀。不注入 World、不呼叫內部完成函式稱為通關。記錄真實牆鐘、倍率與實際 ticks。
- 測試 fixture、正常 UI、作者自校與真人試玩分開記錄。沒有真人受試者就標示未執行，不以自動化代替。
- 根契約檢查：`python3 -m unittest discover -s tests -v`、`node --check earth_ascension/static/m2.js`、`node --test sect-chronicle/test/*.test.js`、`git diff --check`；本分支不改這些檔案，必要時實跑並落檔。

## 研究來源（實讀後才引用）

| 來源 | 讀取 | 採用 | 不採用 |
| --- | --- | --- | --- |
| [fast-check model-based testing](https://fast-check.dev/docs/advanced/model-based-testing/) | 2026-10-26 | 指令有前置條件（check）與執行後斷言（run）；簡化模型而非複製實作；失敗序列可重播 | 不新增 fast-check 依賴；用固定 seed 的確定性指令序列產生器代替 |
| [Godot FSM demo](https://github.com/godotengine/godot-demo-projects/blob/master/2d/finite_state_machine/state_machine/state_machine.gd) | 2026-10-26 | 轉移時先 exit 舊狀態再 enter 新狀態、只有一個 current owner | 不移植節點／訊號結構或狀態堆疊；示範在 pop 後不重呼 enter 的作法不適合需重新取得預約的活動 |
| 其餘五個來源 | 各階段實讀 | 記在 M8–M11 文件 | — |
