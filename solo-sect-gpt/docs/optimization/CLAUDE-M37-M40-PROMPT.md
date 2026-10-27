# Claude 接續 M37 至 M40 實作委託

請由你一位作者依序完成 GPT 獨立遊戲 M37→M40。每階段先短 spec→實作→受影響測試與正常 UI→修補→commit→下一階段。完整出口通過才 done；完成 M40 停止，不自行延伸或派其他 agent。

## 工作位置與邊界

工作區：`/Users/chenyuying/.codex/worktrees/solo-sect-gpt/earth-ascension`

分支：`codex/solo-sect-gpt`

盤點 HEAD：`fa001cedcbc0323ee9d3a21e1fbd779d764fb521`

先核 HEAD／工作樹；若已前進，只補相關差異，不 reset 或覆寫成果。保留 `.serena/`、`solo-sect-gpt/jsconfig.json`。讀根 CONTRIBUTING／適用 AGENTS、`solo-sect-gpt/BRIEF.md`、`docs/optimization/M37-M40-PLAN.md`、`DELIVERY-M31-M36.md`、PROGRESS 與相關原碼。原 M36 停止線由這次有限委託延伸至 M40。

工程只修改 `solo-sect-gpt/`；不 push／PR／merge／部署，不動 dev／其他作者工作區、根契約／CI／依賴，不對外留言、不啟永久 loop。保留 Canvas、20Hz、Q256、角色與活動唯一權威、五項 stats、U/F/I 及原權限。可取得必要固定來源檔，不載入別版核心／時鐘或合另一支程式。

## 固定公版來源

dev `3079a03de5c2e8c79af64b0962ae3da75f274466`。相對 M31–M36 的6f959f5只有已合 PR #370 立繪包；不再把它當待審，也不為更新圖重搬資源／意圖／樣式模組。

讀固定 `sect-chronicle/docs/PUBLIC_PORTRAIT_IMPORT_SPEC.md`、`assets/shared/manifests/gemini-1.1.0.mjs`、`resolve.mjs` 與相關來源。14張只在dev研究卡採用，不等14新開局，GPT pin尚未自動更新。只選本版既有 guo／linghu 對應的郭靖、令狐沖兩圖；這次委託把它們用作本私人原型模板的外觀，保留研究來源與權利範圍，不宣稱 dev 已批准新開局或公開發布。不要用被退回候選或較早originPath替換固定dev檔。

## 串行階段

**M37 三項 review 必修。**

1. 暫停演練，沈禾「自己退出」後同 tick 朝空地試拳，退出精力9609→試招9409，回顧錯計200。`jointTick`下次才拍bodyAt太晚。沿真正退出／所有權移交路徑記截止，覆蓋practiceStop、stop、改派、外部切磋、倒地、全部退出／直接終止及途中存讀。統計按實際先後，不能把截止前同tick出手也抹掉。
2. 正常做飯成品在 `haulOutput`，阿木包裹meal4、dest:table:meal預約4，總覽卻known0。將facility／resource重複在途查詢共用化，依真搬運階段、包裹／batch實物與目的地，覆蓋採集、成品領出／搬交／分批、鍋內未搬、滿倉、中斷及接手；容量預留不是在途，無法判定不填假0。不新增物流規則。
3. 舊數字游標離開ring後，若保留窗第一筆是mentor事件就被跳過。反例：先讀游標→一筆 `mentor.direction-set`→499筆數字事件；核心保留500，adapter只499。用有界reader保留仍存在的未讀非數字／重複ID、同tick順序與去重；超窗已被清掉的不補造。不能放寬斷言接受漏一筆。

三條反例各加入回歸，必要正常 UI 覆蓋暫停同tick操作與一鍋飯搬運；ring壓力測試標模型fixture。新增持久截止資料當階段就處理驗證／舊檔相容，不等M40，不改舊世界歷史ID來配adapter。

**M38 兩張圖的本地版本包。**

先實看原圖，核身份／故事階段與構圖，再從固定dev取得：

- `sect-chronicle/assets/shared/portraits/1.1.0/guojing.png`，sha256 `9ca10bf0686f8efcb1f6a446025d47ed2a1622127403b655cc43a99cde1f326c`。
- `sect-chronicle/assets/shared/portraits/1.1.0/linghuchong.png`，sha256 `55a3e9e6abd9562bbe065b9dd0fe49613b73aa729f3dee36c268ad5401ad11e2`。

新增本地manifest／pin版本（如gpt-local-1.1.0），保留舊1.0.0與hero／竹石／缺女孩記錄、原作者／origin／固定dev來源與hash。兩圖為複用，不能冒稱本輪新生成；其他七張重畫的source.commit只可能是身份參照，不當bytes來源。最小適配resolver的portrait／atlas-frame分流與本地路徑；不生成圖、不搬全14張、不改其他consumer pin、不加依賴／CDN／symlink。hash、尺寸／RGB、來源與缺檔回退可核。

**M39 選角與人物卡接入。**

模板／canonicalIdentity明確綁guo與linghu，選人縮圖與進局人物卡同圖、可展開整幅3:4立繪。custom保持既有外觀；yue、小禾、阿木與無對應訪客缺圖回退，不按名字借臉。整圖不套idle裁切標籤，不延伸地圖動畫／碰撞／能力／角色權限。介紹與真能力維持M34分層，外觀固定資料不進世界存檔。正常UI驗四既有開局切換、改名／同名、舊檔、缺圖／錯URL、長背景、播放中展開與鍵盤操作。

**M40 累積交付。**

交兩段路線：新局看郭靖／令狐沖簡介與立繪；中期示範檔做飯搬運→師徒紀事→暫停演練退出後同tick試招→正確回顧。示範檔由正常UI保存，不注入資源、關係或完成旗標。模型ring案例不能冒充正常玩家歷史。驗舊M30／M36、新截止途中檔、壞檔拒絕／成功失敗載入、快取、刷新／槽位、內容包與圖片缺失；手機及整體存檔升版仍另案。

## 交付與驗收節奏

每階段先提交 `docs/optimization/Mxx.md`：玩家問題、修改檔案、權威資料／來源、相容影響、正反流程與出口。按CONTRIBUTING／既有政策跑必要檢查；優先真反例、活動／session／順序、同命令twin世界／RNG不變、存讀與圖像來源，不為純呈現反覆跑無關長矩陣。

測試輸出落新 `evidence/optimization/m37/`–`m40/`；保留歷史失敗證據，測試會重寫舊evidence時用隔離snapshot或還原原檔。歷史測試需要Git舊提交時提供正確唯讀Git環境，不跳過或修改runtime讓環境錯誤變綠。模型、正常瀏覽器UI、真人趣味判斷分開。UI沿本獨立分支方式，使用空閒隔離埠，不占8800或碰他人服務；記實際viewport／時間並finally關自有頁、browser、server。

每階段先有實際artifact commit，再交 `handoff/optimization-mxx.done.json`，列作者／base／artifactCommit／spec／測試／正常UI／存讀證據／限制，marker可另小提交，不能填自我引用或未存在SHA。未達必要出口用checkpoint／blocked，不能用未接受exception自動跳依賴。

最後交 `docs/optimization/DELIVERY-M37-M40.md`、`handoff/optimization-m37-m40.done.json`，含三項修補對應、兩圖來源／pin、各artifact、啟動入口／命令、示範檔與路線、驗收及限制。真來源／權限／新產品取捨阻擋時，具體回報受阻範圍並完成獨立可做項目；不另生成、換引擎、擴角色或擅改上游。全部必要出口通過才總done，完成M40停止等下一次指派。
