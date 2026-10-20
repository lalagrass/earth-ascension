# Coding agent 接手入口

## SG-EXP-01：已批准 UI／視覺切片（D11，取代舊純挑水包）

擁有人於 2026-10-20 更正並批准 [#155](https://github.com/lalagrass/earth-ascension/issues/155)：**先交完整畫面稿 → 比較 PixiJS 與 Godot → 做可操作 UI／視覺展示**。讀[工作包／最新 Claude prompt](docs/EXPERIMENT_WATER_CARRY.md)與[決策 D11](docs/DECISIONS_AND_SOURCES.md#d11sg-exp-01-ui視覺切片2026-10-20)。挑水、成長與跑步是完整介面的驗證情境；舊「只挑水、固定 Canvas、不准評估新引擎」與舊 prompt 已被取代，不照舊功能清單開工。

Claude 僅改 `sect-chronicle/experiments/water-carry/` 的設計圖／素材、兩條技術小試作與一條最終展示，可在該處使用原型依賴／Godot project；不改正式 `js/`、`viewer/`、storage、主線測試、root CI／依賴或 Earth。獨立模型不寫正式 world／RNG／存檔；原型選型不批准正式引擎遷移或整份 GDD／完整成長、輕功、戰鬥等新系統。

V1 交兩張完整狀態畫面／可編輯來源與動作設計，V2 同素材／同場景比較製作與接線成本並推薦路線，V3 才接極小模型完成操作。先交每段可看成果，串行小 PR；不是一次做完程式才給人看。未回覆不新增每段批准 gate，重大偏離另提案；測試／輸出依工作包分段，未變主線長矩陣不重跑。

預定 Claude 接手不等於已認領。開始核對 #155／#139／#154 最新狀態，從最新 dev 的獨立 worktree／短分支登記目前階段與精確檔案／四小時期限，不承襲 #139 租期或預占後段。#154 待審時可做本包，需補修則先 checkpoint／釋出原型 active 再串行；不動 #154 checkout，不提前開 #140。RT-04／05 依賴與 DoD 不變。本輪只更新工作包與授權紀錄，不代 Claude 開工。

## 認領有效期限（優先於下方歷史作者指派）

依根目錄 [認領期限與接手](../CONTRIBUTING.md#認領期限與接手)：預設 4 小時，具體進度可續期，額度不足可立即釋出；過期後下一位在原 issue 登記並核對即可接手。恢復 session／推送前先重讀有效主筆；不搶改原分支或 worktree。完整待審 PR 不因審查等待過期，受阻後包不因作者過期解鎖。下方歷史姓名不永久保留工作，現況以 issue 最新有效認領及產品依賴為準；本節不重排已完成任務。

## D10下一工作包：RT-02V開放待認領（優先於下方歷史prompt）

擁有人已於2026-10-19明確選「先做 viewer（建議）」，並因Grok額度用盡要求保持開放待接手。批准來源見[決策D10](docs/DECISIONS_AND_SOURCES.md)。**不要再指定Grok或自行啟動其他agent；核心實作仍一次只有一位已登記主筆。**

RT-02 #107／PR #108已合dev0875d116且postCI39161730112五項成功。下一包為[RT-02V #129](https://github.com/lalagrass/earth-ascension/issues/129)，讀[RT02V_HANDOFF](docs/RT02V_HANDOFF.md)。本排程／交接文件合dev且postCI成功後可認領，無新的產品待決；保護原worktree／未提交修改，從最新dev建短分支、記實際身份／base／檔案，不重做已完成R1–R4。

順序：RT-02V觀察版→RT-03存讀／因果資料→RT-04完整介入UI→RT-05試玩。觀察版只做正式新局、地圖／角色工作／既有原因與D9播放控制，不改規則／schema／RNG、不存讀、不改主角工作／目標。真實瀏覽器固定seed2700tick與控制器邊界驗證，未改引擎矩陣證據復用。

Claude #128三份架構文件有獨立主筆邊界；不寫其檔案，也不等待架構提案才做viewer。下方指定Grok、RT-03先行及RT-00／01尚待開工文字是歷史接手提示，以本節與#129最新狀態為準。

## D9凍結接續（2026-10-18，優先於下方歷史prompt）

擁有人已批准P1–P4，權威[RT00_CONTRACT.md](docs/RT00_CONTRACT.md)與[批准紀錄D9](docs/DECISIONS_AND_SOURCES.md#d9rt-00-p1p4-產品契約凍結2026-10-18)。不重問已批時間／移動／取消／自主預設及舊檔B。Grok CLI接續Grok Bot原#93認領；#99凍結文件合dev與postCI後，由遊戲PO建立RT-01 issue／prompt。不要重做RT-00、先寫RT-02～05或把文件批准當實作通過。

RT入口採P4=B：拒絕舊slot檔並保留原檔；歷史slot引擎／golden及20seed×42回歸保留，不做雙模式續玩UI或轉換。RT-01先交tick／移動／工作／手動核心與canonical續玩證據；自主RT-02、瀏覽器存讀RT-03、UI RT-04、試玩RT-05。每包小PR、前置合dev／postCI後續接。沿相關測試優先、必要3/5seed、證據復用／摘要輸出；高風險完整適用20seed×2700tick驗收保留，未交付情境不冒稱通過。

## D8產品方向（優先於下方早期時段／backlog交接）

擁有人已批准[可暫停即時自主生活](docs/REALTIME_LIFE_SLICE.md)：戰鬥延後；初始條件／目標設定後無人介入可持續發展，玩家可暫停改主角工作／目標。從RT-00 #99／總單#93接續，不依舊prompt先寫SG-06或重做已完成SG-01～05。現由Grok CLI接續，維持單一核心主筆。

新RT的真移動／工作共用單一權威JS世界時間，自主策略只讀可見資訊並走正式指令；render不改世界，暫停零進度。這取代「行走只作動畫／按格才能產出」對新模式的限制，不授權並行兩套權威引擎或slot＋tick雙重收益。RT-00時間／工量／移動／政策與人工覆寫／舊檔B已依D9凍結；保留舊回歸／golden。BL-M01／A01只提取最小真移動與規則式自主範圍，其餘backlog、戰鬥／輕功／第二境與28天新內容仍未批准。

先讀根目錄 [AGENTS.md](../AGENTS.md)、[CONTRIBUTING.md](../CONTRIBUTING.md) 與本資料夾 [README](README.md)。此處補充獨立遊戲契約，不覆蓋根目錄規則。

## 協調與整合

遊戲 PO 為另一個 Astra 聊天，管理 SG 產品範圍、任務、驗收與試玩；Earth PO 兼任唯一共用合併佇列負責人。作者／遊戲 PO 將 ready PR 與審查證據交到 [#67](https://github.com/lalagrass/earth-ascension/issues/67)，由 queue owner 依根目錄 CONTRIBUTING 整合到 dev。各 PO 不互相指派另一產品的實作；本次更新不變更既有產品批准。

## 如何提出建議

依 [提案與溝通流程](docs/AGENT_PROPOSALS.md) 分流並使用其中 issue／留言格式：任務內實作選擇留原 issue；改玩法、語義或範圍另開 Proposal；未來靈感先留 #75。**非阻擋建議記錄後繼續已批准且已認領工作**，不擅加 DoD／依賴；真正阻擋只停受影響部分，說明最小所需決策與可繼續項目。無回覆不等於批准，已批准範圍不重問。決策回填 issue 並同步必要文件；每次標明實際身份，共用帳號不當成獨立審核。ready PR 依上節交 #67，不自行合併。

## 目前可以做什麼

專案擁有人已於 2026-10-18 在本對話批准 D1–D5 與 14 天切片 SG-01～SG-12，見 [批准紀錄](docs/DECISIONS_AND_SOURCES.md)。不得再次把這些任務標成「等待產品批准」。SG-01 已由 Grok Bot 在 #71 認領，其餘實作任務以各 issue 登記為準；開始前完成 issue／主筆／base dev SHA 登記及依賴檢查。SG-13 真人試玩需後續安排，SG-14～17 與發布仍未授權。

- 實際主筆、issue、base dev SHA、修改檔案、依賴與驗收證據必須寫入 PR，採根目錄 PR 模板。
- 新程式限制於 `sect-chronicle/`。不要改 `earth_ascension/`、`guwu-game/`、`sect_ascension/`，不要將原型檔案整批搬入。
- 若來源檔不在你的 checkout，先讀 [來源紀錄](docs/DECISIONS_AND_SOURCES.md)；缺少的原型不是可以自行編造的實作。本次批准包含依新契約獨立實作，不必因原型未入庫重問授權；若需要移植原型程式，核對唯讀來源快照。
- 統一JavaScript純引擎與單一權威世界時間；舊slot基線及新D8 RT契約依各自模式驗證，同一世界不重複結算。不得同時啟動 Python tick 引擎或另一套月／週制引擎。
- UI 只能送指令與顯示引擎結果；動畫、預覽、倍率不能消耗 RNG 或修改世界。
- 不得把候選數值、範例 JSON、期望測試結果寫成已實測結果。不得事後改門檻讓報告變綠。
- 不自動呼叫其他 coding agent；若維護者安排多 agent，按任務檔案邊界分工，同檔採串行整合。

## 最新設計修訂

D6「道館成為門派」已由專案擁有人批准，見 [OPENING_REVISION.md](docs/OPENING_REVISION.md)。按設計 0.2 開發，不再沿用四人開局或開局掌門。先核對本地文件差異、#71 與既有 PR 進度，補缺而非重寫。SG-02A／04A 已在批准的 14 天切片範圍內；28 天仍未授權。

## 未來構想不是實作指派

[FUTURE_BACKLOG.md](docs/FUTURE_BACKLOG.md)／[#75](https://github.com/lalagrass/earth-ascension/issues/75) 僅供未來評估，除D8提取的最小真移動與規則式自主生活外，BL項目仍未排程／未批准實作。不要加入生活能力成長、輕功、靈材科技或領地巡防，也不要預留其schema／API。現行 D6 靈氣復甦與獸患契約照常開發；此 backlog 不新增依賴、不阻擋切片。SG-13 真人試玩後仍須專案擁有人另行批准個別項目。

## 第一個接手工作包

1. 讀 README 與 [雙 agent 接手計畫](docs/PARALLEL_HANDOFF.md)，核對已批准的 14 天範圍。
2. 先讀 SG-00 #69 的最新完成紀錄，已完成的文件合併與工作區交接不要重做；核對最新 dev 並登記自己的 SG-01 issue／主筆；不是重新詢問 D1–D5。
3. 遊戲 agent 在獨立 worktree 從 SG-01 開始；Earth agent 留在自己的 checkout 做原本已認領任務。Gemini 本輪不參與，SG 任務沒有對 Gemini 的依賴。
4. 每任務獨立小 PR，前置合併後才開始依賴任務；不搶改另一位 agent 的檔案。

## 每個 PR 的回報

- 任務／issue、主筆身份、base SHA、修改檔案。
- 改前問題 → 改後行為；採用與捨棄方案。
- ruleVersion、schemaVersion、rngVersion 與舊檔影響。
- 實際命令、結果、失敗 seed、瀏覽器／遷移證據。
- 完成與未完成判準；不可只報測試數量。
- 下一個可認領任務、依賴與需產品判定的地方。

## 測試 seed 與成本

依共用 [分層測試政策](../docs/testing-policy.md) 執行開發 3 seed／一般局部行為 PR 5 seed 冒煙；一般單測／golden與dev CI保留；20seed×2700tick長RT矩陣改在main／manual full，執行 `node --test sect-chronicle/test/acceptance/*.test.js`。AC-C01 與未來獲准階段的 SG-15 樣本不縮減，正式量測照原規格；高風險先驗受影響反例／相容／hash，有不明回歸再擴驗。未交付的流程不能宣稱已測；完整輸出落檔，agent 優先讀摘要與失敗案例。

## 檢查

文件階段：相對連結、任務依賴、狀態與數值來源、`git diff --check`。程式階段跑快驗 `node --test sect-chronicle/test/*.test.js`（共用 CI Node 22／24）及相關瀏覽器驗證；發布前完整層另跑 `node --test sect-chronicle/test/acceptance/*.test.js`。dev快驗與SG-01未交付時的bootstrap訊息都不是完整矩陣通過。另跑根目錄要求的 `python3 -m unittest discover -s tests -v`、`node --check earth_ascension/static/m2.js`、`git diff --check`。原型回歸可用 `node --test guwu-game/test/*.test.js`（Node 24 下不要使用目錄作為測試參數）。新增未追蹤文件仍需額外掃描空白，因為 git diff 不涵蓋它們。
