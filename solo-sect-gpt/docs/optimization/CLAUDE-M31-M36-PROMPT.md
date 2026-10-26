# Claude 接續 M31 至 M36 實作委託

請在下列 GPT 獨立遊戲分支，由你一位作者依序完成 M31→M36。每階段短 spec→實作→受影響驗收／修補→commit→下一階段；這是有限委託，完成 M36 即停止回交，不另派 agent、不啟永久 loop。

工作區：`/Users/chenyuying/.codex/worktrees/solo-sect-gpt/earth-ascension`

分支：`codex/solo-sect-gpt`

盤點 HEAD：`b0ca007b00d7e78af916030c3d9a545d28e887f6`

先核工作樹與 HEAD。保留 `.serena/`、`solo-sect-gpt/jsconfig.json` 和他人變更；若已前進，只核相關差異、不退版。讀根 CONTRIBUTING、適用 AGENTS、`solo-sect-gpt/BRIEF.md`、`docs/optimization/M31-M36-PLAN.md`、`DELIVERY-M24-M30.md`、PROGRESS 及相關原碼。原 M30 停止線由本有限委託延伸至 M36。

只修改 `solo-sect-gpt/`，不 push／PR／merge／部署，不改原 dev、其他作者分支／工作區、根契約／依賴／CI，不對外留言。可取得固定來源必要檔案，不能 merge 另一版程式或載入另一個核心／時鐘。

新公版固定 `6f959f534e9a00994f1cea7c230b4110e60db8c6`，詳讀計畫列的 resource-view、intent-view、公開 profile、public-ui 與 view-state。上一批 `vendor/public/ef823ac/` 保留，新增來源版本／必要本地依賴閉包與 SOURCES 記錄，不原地覆寫舊版。公版 `gpt.mjs` 多處仍 import `scene-shared/sources/gpt` 舊核心，禁止直接接它們；所有 adapter 讀目前 GPT 世界。保留 Canvas、20Hz、Q256、五項 stats、U/F/I 與既有角色權限。

依序做：

1. **M31 三項必修**：
   - `event-feed` 只接受 event.N，正常 mentor-event 的 `mentor.direction-set` 等 ID 變 NaN 被略過。做兼容原生／重複 ID、同 tick、ring rollover、世界 epoch 的唯讀游標，不改歷史來遷就 adapter。
   - 聯合演練 body 回顧直到整場結束才讀退出者目前能量／傷勢，退出後另打三拳被算入演練。以參與截止時點結算，覆蓋外部切磋／工作／休息、退出前後存讀；舊檔缺截止快照不填假值。
   - facility 的 dest reservation 不等於實物在途，新局採木一 tick、空包卻顯示木4正在送來。容量預留、耗用預約與真正搬運分開，沒有可靠查詢就缺項。
2. **M32 資源總覽**：水／木／藥／菜／餐，原生實存、容量、耗用預約與 availableQty 原口徑；連回既有設施與派工。不能加總隱藏物資，不能猜 available 淨額或以 dest 預約填 incoming。
3. **M33 意圖與自主控制**：同一人物目前活動、原意圖、temporary、pendingCommands、stop／auto／必要恢復與 owner，沿真核心 reason／commands；舊按鈕與切人重驗，單擊只能 dispatch 一次，不新建排程或 AI。
4. **M34 共用簡介**：既有 custom／guo／linghu／yue 選角與人物卡共用公開背景，能力摘要讀真配置；再給小禾與一名普通門人本版介紹。依 canonicalIdentity／模板綁定，不以同名猜角色。不新增可選經典人物、不搬研究頁的「本作無開局」說明到本版真可玩角色，不洩漏未公開資訊。外觀用目前已接受圖與回退。
5. **M35 共用呈現**：新值呈現／少量 CSS tokens、per-person details／焦點、0／false 與各缺項、disabled 原因及結果。適配 notApplicable，保留 GPT 版面與表單。可有明標開發元件預覽，但正式流程必須跑現有遊戲入口。
6. **M36 累積交付**：按計畫連一條正常 UI 路線，交新可達展示檔、相容收尾、來源／各階段證據與限制。

Grok 立繪 PR #370 在規劃時仍待審，不在本批必要範圍、不採候選 diff、不等它才修 bug。其後即使合入，也先記新來源差異留正式立繪後包，不自動擴本批或重綁全部角色。

每階段先提交 `docs/optimization/Mxx.md`：玩家問題、修改範圍、權威資料／來源、狀態及保存影響、正常流程、反例與出口。M31 新增持久欄位時當階段就驗保存與舊檔；整體收尾留 M36，不把新增狀態相容工作拖延到最後。保持原生語義，不新增腿力／腿法、共同戰力、人格效果或隱藏值雷達。

沿 CONTRIBUTING／既有測試政策執行必要檢查。新針對性回歸須含上述真命令反例；有／無面板讀取的同命令 twin 結果與 RNG 相同。純呈現不反覆跑無關長矩陣，必要存讀／所有權／可見性反例不可省。測試可能重寫歷史 evidence，請在隔離 snapshot 執行或妥善保留還原；歷史相容測試需可讀 Git 舊提交，缺 Git 環境要修測試環境，不當 runtime 失敗或跳過。

模型 fixture、正常瀏覽器操作與真人趣味判斷分開記；按本獨立分支既有驗收方式做必要 UI，不宣稱拿到 dev Cloud 審查或正式整合。UI 用空閒隔離埠，不占 8800、不碰他人服務。每階段新證據放 `evidence/optimization/m31/` 至 `m36/`，正常 UI 可另命名子目錄，不覆寫 M30 舊失敗證據。示範檔由正常流程保存，fixture 不冒充示範通關。

各階段先有實際 artifact commit，再交 `handoff/optimization-mxx.done.json`，列作者、base、artifactCommit、spec、測試／正常 UI／存讀證據、限制。marker 可另小提交，不填未存在或自我引用 SHA。未達必要出口只能 checkpoint／blocked；不能用未接受 exception 宣稱 done 或先跳依賴。

總交付 `docs/optimization/DELIVERY-M31-M36.md` 與 `handoff/optimization-m31-m36.done.json`：三項 review 對應、新公版採用清單、每階段 artifact、啟動入口／命令、展示檔／觀看路線、測試與剩餘限制。全部出口通過才總 done；真權限／必要來源／新產品取捨阻擋時，列具體 blocker 與已有可繼續項目回交。手機、全面存檔升版、完整素材／動作與 M37+ 另案；完成本包停止。
