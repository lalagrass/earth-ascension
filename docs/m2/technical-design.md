# M2 技術方案 — 最小可追溯人物模型

狀態：事前設計紀錄；實作差異、測量與未完成驗收見[實作驗收與回顧](implementation-review-retro.md)。具體欄位／常數以 [驗收](acceptance.md)和首輪校準為準。基於 M1 的 [`engine.py`](../../earth_ascension/engine.py)、[`store.py`](../../earth_ascension/store.py) 與 [`server.py`](../../earth_ascension/server.py)。研究依據見[研究紀錄](research.md)。

## M1 接點與限制

M1 `world.version == RULES_VERSION` 才能通過 `validate_world`。`Store.advance` 在單一 SQLite 交易中寫入逐月快照、事件及 `current_month`，並以 `expected_month` 擋重複推進。`rng_for(seed, month, key)` 把規則版本放進 hash。現有每人每月一支 RNG，抽樣次數受分支影響；只改規則版本就會改所有抽樣。`advance` 逐人決策並立即更動世界知識及對方關係；後面的 NPC 可看到同月新知識，前面的無法看到。`memories` 是最近 12 條重要事件文字；`relations` 僅是 ID→分數；`goal` 是字串，`short_goal` 未參與選擇。決策原因有基礎分數，未記錄完整雜訊、限制、事件引用。這些都要有明確升級邊界。

## 資料契約（提議）

在既有 world/person JSON 上加版本化欄位，不另建第二事實庫。舊欄位可暫保留作 UI 相容投影，規則只讀新欄位；新舊欄位若不一致視為驗證錯誤。

| 欄位 | 最小內容及約束 |
|---|---|
| `world.schema_version`, `world.rules_version`, `world.policy_mode` | 分開資料格式與規則；`policy_mode` 僅 `m1_legacy` 或 `m2_rules`，存檔不可隱式切換。 |
| `person.goals` | 活躍目標最多 1，候選最多 2；`id/type/status/started_month/review_month/progress/target/trigger_event_id/stop_reason`。新角色的類型限既有五個方向及健康／生計緊急目標；舊玩家自訂目標用 `legacy_custom` 原文保留，見遷移段。 |
| `person.plan` | `goal_id/step/action/review_month/last_progress_month`；一月最多一個主行動；計畫可被緊急需求暫停。 |
| `world.events[]` | 穩定 `event_id`、月、kind、actor、target、effects、causal_event_ids、可觀察範圍；文字只是顯示層。舊事件保留原文，缺細節不得回填猜測。 |
| `person.memories_v2[]` | `event_id/observed_month/source/importance/expiry_or_review_month`；單人活躍最多 24 筆，滿額時按確定性規則淘汰低重要度，但原事件留在世界歷史。 |
| `person.knowledge_v2[]` | 已知 `fact_id/source_event_id/learned_month/confidence`，只表示人物可用情報；先限研究發現與有來源的交流，避免建立通用知識圖。 |
| `person.relationships_v2` | 以對方 ID 為鍵，`trust` 有界、`last_event_id`、`last_interaction_month`；A→B 與 B→A 可不同。舊 `relations` 分數按明示映射轉入。 |
| `person.profile_base`, `person.profile_current`, `person.profile_changes[]` | 保留創角值；現值仍 0–1、與先天 `traits` 分離。每次變更記錄維度、前後值、觸發事件與月份。 |
| `person.last_decision` | `state_month/selected_action/candidate_scores/constraints/goal_id/plan_step/memory_event_ids/relationship_event_ids/rng_draw_key/resolution/outcome_event_ids`。可從決策快照重算，文字解釋不得超出欄位。 |

世界事件的可見性：本人親歷，目標人物收到互動／影響，其他人物僅能經同區公開事件或後續實際交流取得；不得因 `world.events` 存在就自動成為全員知識。對不確定傳聞，先僅記來源與信心，不讓其改寫世界事實；M2 可限定為確定事件。事件 ID 使用穩定的月份／階段／角色鍵或順序編號，並強制唯一；原因引用需指向本月或過往真實事件，不能形成循環。

M1 以全局 `world.knowledge >= 2` 解鎖所有人的修習；M2 規則必須改以本人已知的具來源「可修習基礎」事實作前置條件。研究者可由親自發現獲得；其他人只能由事後公開且可觀察的發現或實際交流獲得，最早於下一個決策快照使用。`world.knowledge` 仍可作全局研究統計，不可當作所有人的信念。M1 legacy 路徑保留原解鎖規則；[A6](acceptance.md#可執行案例與通過線)需測同月、跨月的知情差異。

## 決策與月度管線

使用輕量 BDI 映射：belief＝人物可見狀態及知識；desire＝有限候選目標；intention＝活躍目標和短計畫。這是自訂規則資料模型，不引入 BDI 框架。[Rao／Georgeff](research.md#來源與設計取捨)提供概念依據，具體月度規則是本專案設計。

1. 在 `expected_month` 交易鎖內，讀取上月快照。先計算本月共同外生環境（如區域靈氣），建立**凍結的決策快照**；本月人物決策只能看到該快照的個人可知部分。環境更新的時點固定並存入追蹤資料。
2. 依穩定人物 ID 遍歷以便重現，但每人只從凍結快照產生一個 intent：行動、對象、需求、候選分數、擬消耗資源及理由。重規劃條件限：目標完成／失敗、檢查月到期、健康生計緊急、重大事件已在上月可見。先判有效行動，再計分；目標進度與成本同時影響分數。對同一工作／研究的連續投入，若進度或生計收益為正不加任意「重複懲罰」；停滯超過檢查窗口才降低吸引力並解釋原因。
3. 解決衝突：個人工作／休息等不競爭；社交需目標在凍結快照中可互動，允許單方接觸但對方關係更新依明定回應規則；互斥資源或唯一發現先驗證容量／條件，再以 seed、月、資源鍵的獨立抽籤排序，平手用穩定 ID。不得按 dict 插入順序或先提交者勝。拒絕的 intent 有明確失敗／備援結果，不靜默換成成功行動。
4. 對已解決 intent 計算結果、事件及個人狀態變化，統一套用；同月新發現只進入月底紀錄，下月才影響他人決策。月底更新記憶、關係、目標進度與低速人格變化，驗證事件引用、值域及資源守恆／來源，再在 M1 原子交易中寫入本月快照和事件。衝突／失敗不製造故事性補償事件。

人格變化只由白名單事件／長期累積觸發，單維每月最大變化候選 0.02、12 月累積候選 0.10（**待校準**）。事件累積計數有觀察窗口與上限；已形成的人格不會在無新事件時自動回退。能力與技能不跟著改。重大事件是否產生長期影響由後續行動的可追溯引用驗收，不規定一定朝某種戲劇方向變。

## 隨機數、版本與回放

三種版本各自獨立（[#10](https://github.com/lalagrass/earth-ascension/issues/10)）：`schema_version` 是存檔資料格式；`rules_version`（與相容投影 `version`）是行為規則；`RNG_NAMESPACE` 是程式常數，只決定亂數鍵，除非刻意重洗所有抽樣否則不改。程式以 `m2.COMPATIBLE` 明列可載入與推進的組合，其他一律拒絕；`Store` 只要存檔帶有任一 M2 版本標記（`schema_version`、`rules_version`、`policy_mode`）就走 M2 路徑，所以未來 schema、較新規則版或異常模式的存檔都由 M2 validator 明確拒絕，不會誤走 M1；只有完全沒有這些標記的 M1 存檔走 M1 路徑。規則升版後，0.2.0 存檔不得靜默改標續玩；優先採來源唯讀的複製式明確遷移，遷移完成前清楚拒絕跨規則續玩。

規則版紀錄：`0.2.1`（[#2](https://github.com/lalagrass/earth-ascension/issues/2)）只改記憶名額已滿時的淘汰順序，先淘汰對下一次決策已無作用的記憶。0.2.0 存檔不改標，繼續以 0.2.0 規則推進（`m2.RULES_0_2_0_EVICTION`），所以其回放與原 golden hash 不變；新建或由 M1 遷移的世界使用 0.2.1，另有自己的 golden 基線。`RNG_NAMESPACE` 不變。鎖定 0.2.0 hash 的歷史驗收腳本（`run_m2_experiments.py`、`run_m2_goal_funnel.py`、`run_m2_acceptance_gaps.py`）以 `new_world(seed, "0.2.0")` 明確選 0.2.0 規則，原 raw 不改寫；0.2.1 的新驗收基線須另外標版。`tests/test_golden.py` 另鎖一個由 0.2.0 程式建立並推進到月 24、再續推到月 25 的真實 SQLite 存檔 hash。

`0.2.2`（[#8](https://github.com/lalagrass/earth-ascension/issues/8)／[#1](https://github.com/lalagrass/earth-ascension/issues/1)）只改「目標完成後」：完成的目標仍轉入「穩定生活」，但它是**休整**，到每個檢查月（4 個月）從現有五類目標（含繼續休整）重新評估，不再自動延長；剛完成的那個類型不列入候選（同標籤重開沒有新的機制）。評分只讀月初凍結快照中本人的人格、財富、健康、已知事實與有來源的記憶，本月結算事件最早下月可用；平手與擾動使用新的 RNG purpose `goal-review`（`RNG_NAMESPACE` 不變）。每次評估寫入 `goal_reviews`（月份、候選分數、結果、原因碼 `review_month`、轉向事件 ID），轉向產生 `目標轉向` 事件，新目標帶 `parent_goal_id` 與 `transition_kind`（`complete_rest`／`rest_exit`）。0.2.0／0.2.1 存檔不改標、不新增欄位，繼續以原規則回放；`tests/test_golden.py` 鎖定三版基線。休整長度、評分權重與候選池是初版選擇，未校準；#9 的受挫短計畫與 #4 的目標規則表不在此版。

保留 M1 `m1_legacy` 引擎及其 RNG 行為供舊快照原樣回放；M2 使用隔離的隨機流：`seed/rng_namespace/month/actor_id/purpose[/target_id]` 作 hash 鍵，行動選擇、對象、成功、衝突分別取流。新增某類抽樣不應改動不相關抽樣。序列化須固定鍵順序、事件順序與數值量化規則；比較完整 canonical state hash，不只比較敘事文字。相同 seed、初始快照、模式及規則版本重現；**不承諾 M1 與 M2 在相同 seed 下產生相同未來**。每月保存 `state_hash`、規則／schema 版本及必要 decision trace；歷史快照不可原地重算。

## 舊存檔與遷移

首選明確、單向、可重試的 `M1 → M2` 遷移命令：複製原 SQLite 到新路徑，記錄原 SHA-256、月份與版本；讀入最新 M1 快照，將既有五個目標映射為初始目標與計畫。M1 玩家實際可輸入任意 1–40 字目標：非既有五類者以 `legacy_custom` 保留原文、給中性的「維持生活」短步驟及可見提示，無專屬機械加成，待玩家明確改選類型；不得由文字猜測意圖或因遷移而遺失原文。舊記憶文字標記 `legacy_unstructured`（只展示，不作機械因果），舊關係分數轉成有界 trust，個人已知研究紀錄僅映射可核實來源，基準人格複製現值。新檔先全量驗證後才可推進；原檔及其全部歷史快照保持位元不變，M2 檢視器可讀舊歷史。遷移不可把舊事件文字推斷成人格轉折或來源不明知識。版本未知、欄位損壞、映射不明時拒絕並給錯誤報告，不半途覆寫。

若實作評估發現完整遷移成本過高，最小可接受替代是 M2 介面可**唯讀**開啟 M1 存檔，明確提示該存檔不能在 M2 續玩；仍可用 M1 legacy 模式續玩，並在後續另評估遷移。此方案沒有假設遷移工具存在，不得默默建立新世界或宣稱能直接在 M2 續玩。此替代需要[驗收](acceptance.md)列出的舊存檔唯讀測試，產品決策列於[backlog](backlog.md#待使用者確認的決策)。

## 可觀測性與 LLM 邊界

人物觀察顯示當前／歷史時點的 `goal → plan → considered intents → selected intent → resolution → event effects`，隱藏或標示 NPC 未知的事實；顯示進度與記憶來源而非臆測動機。統計輸出含重規劃率、停滯月數、重複行動的收益、記憶命中與遺失、關係稀疏度、順序敏感度、每月執行時間與快照大小。

正式基線為全規則、無付費呼叫。可選影子實驗僅離線選取少量已匿名化決策快照，讓人工或本機可用模型提出候選 intent／文字；經同一前置條件與權限檢查、與規則結果盲評。影子輸出不提交世界、不補寫事實、不影響正式 RNG；記錄模型／提示版本、時間與成本（付費呼叫固定為零）。只有在可解釋性、可重現性和成本相對基線有明確增益後，才另行提案。
