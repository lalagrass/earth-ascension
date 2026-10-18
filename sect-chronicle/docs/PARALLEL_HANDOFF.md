# Earth 主專案與遊戲子專案的隔離接手計畫

更新：2026-10-18。使用者澄清：並行是「一位開發上層 Earth 模擬、一位開發下層遊戲」，不是兩位一起拆 SG 任務。Gemini quota 已用完，本輪不參與；任何任務與審核不得依賴 Gemini。產品分工已由擁有人於同日指定：Earth PO（Codex，本 PO 聊天）管理 Earth 並兼任唯一共用合併佇列負責人；另一個 Astra 聊天為遊戲 PO。開發主筆仍以各 issue 的實際認領為準。

## 1. 建議：同一 repo，兩個分開的 worktree

保留 `sect-chronicle/` 作為 Earth repo 內的子專案，不在子資料夾 `git init`，暫不拆成另一個 repo 或 submodule。

示意路徑（尚未建立）：

```text
workspace/
  earth-ascension/                  # 既有 checkout：Earth agent 使用
    earth_ascension/                # 主模擬
    tests/                         # 主模擬測試
    sect-chronicle/                 # 已合併的遊戲版本；Earth agent 不修改
  earth-ascension-game/             # 另一個 worktree：遊戲 agent 使用
    earth_ascension/                # 完整 checkout 中仍有主模擬；遊戲 agent 不修改
    sect-chronicle/                 # 遊戲 agent 的工作範圍／常用 cwd
```

第二個 worktree 放在既有 repo 外側的同層目錄，或工具管理的獨立位置；不要建立在既有 `sect-chronicle/` 裡。worktree 分離的是整個 checkout，不是只把一個子資料夾切出去。兩者共享 Git 歷史與物件，但有各自的分支、index 和工作檔案。

只把兩位 agent 的 cwd 設成父／子資料夾仍然共用相同 index 與分支，容易互相 checkout、stage 或提交對方內容；因此不建議作為並行隔離方式。

## 2. 檔案所有權與分支

| 角色 | 開發範圍 | 分支與 PR | 不在其範圍 |
|---|---|---|---|
| Earth agent | 原本已認領的 Earth issue，例如 earth_ascension/、主專案 tests/ 與對應 docs/m2 或 docs/m3 文件 | 各 issue 短分支，PR 指向 dev | sect-chronicle/；未批准的 Earth M3 實作 |
| 遊戲 agent | sect-chronicle/ 下的文件、js、test、tools、HTML/CSS；SG-01～SG-12 | 例如 codex/sg-01-foundation，每個任務一個小 PR，指向 dev | 主模擬、根目錄 tests/、兩個舊原型、SG-14 起擴充 |

根目錄 AGENTS.md、CONTRIBUTING.md、CI、依賴設定與共用啟動腳本屬共用檔案；需要修改時另開協調 issue，指定單一主筆。遊戲測試放 `sect-chronicle/test/`，不要混入根目錄 Python tests。

工作範圍是協作規則，不是檔案權限沙箱。每次提交用明確檔案路徑 stage，核對 staged diff，避免 `git add .` 混入其他未追蹤原型。

## 3. 啟動順序

1. 先將核准文件作為獨立文件提交／PR，按根目錄流程合入 dev。第一批文件已由 #70 合入（`7510a8b`）；設計 0.2（D6）修訂另以 SG-00b 文件 PR 獨立審核，合併後以含 0.2 文件的 dev SHA 為 SG-01 基底。
2. 文件 PR 只納入 `sect-chronicle/` 的 Markdown，不把 guwu-game/、sect_ascension/ 或其他使用者未追蹤資料一起提交。登記實際主筆、文件 issue 與最新 dev SHA。
3. 遊戲 agent 從含批准文件的最新 dev 建立獨立 worktree 和 SG-01 短分支。保留現有 Earth checkout，不自動切換其分支或搬移其未提交變更。
4. 遊戲 agent 從自己的 worktree 閱讀根目錄契約，再以 `sect-chronicle/` 為日常 cwd。確認 `git rev-parse --show-toplevel` 指向遊戲 worktree，不是原 Earth 目錄。
5. 註冊 SG-01 issue／實際主筆與基底後開始；SG-01～12 已批准，不重問 D1–D5。SG 任務按既定依賴依序完成，由同一遊戲 agent 接手即可。
6. 每個 PR 合入 dev 後，下一任務由最新 dev 建新短分支；可在乾淨的遊戲 worktree 繼續，無需每個 task 都新增 worktree。若有未提交變更先妥善保存，不強制 reset。

舊原型不是新遊戲的 runtime 依賴，無須為了啟動遊戲 worktree 而整包複製。必要時由原工作目錄唯讀參考；來源 hash 見決策文件。若執行環境無法讀取原型，報告缺少的參考，依已批准契約實作，不假稱已完成原型回歸。

## 4. 合併與執行隔離

- Earth 與遊戲可同時開發，SG 開發不依賴 Earth M3 實作批准；也不能反過來把 SG 的授權當成 Earth M3 授權。
- 兩邊都往 dev 提 PR；各產品 PO／審查者準備證據，由 Earth PO 作為唯一共用 queue owner 依貢獻契約安排並執行 squash merge，不要求已退出的 Gemini 核准。共用帳號下的自我留言不算獨立審核。
- 功能分支不互相合入，也不互相 cherry-pick 未合併的程式；各自更新已核對的 dev。共用契約若有變動，更新基底後重跑受影響檢查。
- 每專案一個核心實作工作包；文件及唯讀審查可平行。ready PR 交共用 [#67](https://github.com/lalagrass/earth-ascension/issues/67) 佇列。基底無關文件前進時，按 CONTRIBUTING 記錄 head/base/merge tree，可復用未受影響的審查證據；必要 CI 仍驗證當前合併結果，不機械式要求所有作者更新。
- 各自在自己的 checkout 執行測試。遊戲 worktree 跑本地遊戲測試與根目錄要求的 Earth 回歸；它不會測到另一 checkout 尚未提交的 Earth 改動。共用 CI 的 `game-test` 以 Node 22／24 跑 `node --test sect-chronicle/test/*.test.js`；SG-01 未合入且 `js/`、`test/` 都不存在時僅記錄 bootstrap，任一目錄出現後缺測試即失敗。
- 若同時啟動兩個網頁服務，使用不同埠，避免 localStorage origin 混淆；遊戲維持獨立存檔 key。開發伺服器的實際埠由啟動文件記錄，不沿用原型埠作硬假設。
- SG-00 文件整合與工作區交接進度以 [#69](https://github.com/lalagrass/earth-ascension/issues/69) 為準；本文件不代表已啟動或訊息通知其他 agent。

## 5. 可直接交給遊戲 agent 的接手訊息

更新：原交接訊息須搭配 [設計 0.2 開端修訂](OPENING_REVISION.md)。D6 已批准；接手保留並納入本地文件修訂，不再按四人開局／開局掌門實作。Earth／遊戲 worktree 隔離及 Gemini 不參與的安排不變。

> 接手 Earth Ascension repo 內的 sect-chronicle 子專案。專案擁有人已於 2026-10-18 批准 D1–D5、D6（設計 0.2「道館成為門派」）、14 天切片與 SG-01～SG-12（含新增 SG-02A／SG-04A），不需要重問產品授權；28 天擴充未批准。請同時讀 sect-chronicle/docs/OPENING_REVISION.md，不再按四人開局或開局掌門實作。請讀根目錄 AGENTS.md、CONTRIBUTING.md 及 sect-chronicle/AGENTS.md、README 與 docs/PARALLEL_HANDOFF.md。先確認批准文件已納入 dev，依貢獻流程登記 issue、實際主筆與 base dev SHA，使用獨立遊戲 worktree；保留既有 Earth checkout 不動。從 SG-01 開始，按依賴逐任務交付小 PR 到 dev。程式與測試僅修改 sect-chronicle/，不要改 Earth 模擬或兩個舊原型。Gemini 本輪不參與，不得等待或分派任務給 Gemini。交付附實際測試、版本影響與未完成項；SG-12 完成後交付可試玩的切片與真人試玩交接，不自行開發 SG-14。

Earth agent 不需要因遊戲啟動改變原本任務；只需知悉 `sect-chronicle/` 已由另一工作區負責。未經使用者授權，本文件不代表可向另一 chat 發送訊息或新建 chat。
