# 長期願景與討論入口

狀態：**討論草案／未排程／不是開發契約**。2026-10-20；前三份由 Codex（遊戲 PO）整理擁有人在遊戲 PO 聊天提供的構想，追蹤 [Proposal #152](https://github.com/lalagrass/earth-ascension/issues/152)；第四份資源／物流／人口維持及第五份三問心印／近期方針由 Codex（Earth PO）整理其聊天來稿，分別追蹤 [#160](https://github.com/lalagrass/earth-ascension/issues/160)／[#163](https://github.com/lalagrass/earth-ascension/issues/163)。授權是保存與整理；#163另保存擁有人明確的初始性格預選、無操作可續進UX方向，沒有批准全部玩法、數值、技術選型或交期。

後續批准 [D11](../DECISIONS_AND_SOURCES.md#d11sg-exp-01-ui視覺切片2026-10-20)：[SG-EXP-01 #155](https://github.com/lalagrass/earth-ascension/issues/155)已由純挑水包更正為 UI／視覺切片，先完整畫面稿與動作設計，再比較 PixiJS／Godot，最後可操作展示；挑水成長作驗證情境。見[新版工作包／Claude prompt](../EXPERIMENT_WATER_CARRY.md)。只批准獨立展示與比較，不代表全本 GDD 採用、正式引擎遷移或正式世界加入成長。

| 文件 | 內容與用途 |
|---|---|
| [破道館到小門派：重新架構與系統設計總藍圖](SECT_LIFE_REDESIGN_MASTERPLAN.md) | 整合五支柱、Smart Object 模擬核心、SCENE-04 七大區域擴建、三層性格與三問心印、同圖武學與塔防演武的完整架構與 S0–S6 路線圖 |
| [北極星：門派生活五支柱](NORTH_STAR.md) | 原話／五支柱、M1完成狀態與D52落地順序；方向選定與工程授權分開 |
| [SOCIAL01：主角與小女孩的相處](../SOCIAL01_HANDOFF.md) | D53 S1–S4已批准：真對談／鼓勵／本局相處事件，A–D整包工程；[Grok提示詞](../SOCIAL01_GROK_PROMPT.md)，[原提案](../SOCIAL01_BATCH_PROPOSAL.md)留沿革 |
| [山間道長期願景](SHANJIANDAO_DRAFT.md) | 現代山村、師徒生活、復甦與門派發展；原意、PO 建議、現況差異與待決策 |
| [人格、命譜與卦象草案](PERSONALITY_DESTINY_DRAFT.md) | 人格呈現／行為偏好、命格天賦、判詞、占卜與事件的責任及取捨 |
| [村民生活與邀請入門草案](NPC_LIFE_RECRUITMENT_DRAFT.md) | NPC 的追求、交往與可知資訊、入門意願／安置及非弟子合作 |
| [資源、物流倉儲與人口維持草案](LOGISTICS_UPKEEP_DRAFT.md) | 採集／搬運／儲存／消耗、住房／保存／建造／自動化；原意、現況差異與逐步驗證候選 |
| [生活逐片展示與初學／熟手對照](LIFE_ACTIVITIES_GROWTH_DRAFT.md) | 最近可看版本、挑水→採藥→砍柴→打獵候選，以及主角／熟練堂親的差距與成長；[#170](https://github.com/lalagrass/earth-ascension/issues/170)，不是正式角色／玩法批准 |
| [三問心印與近期方針草案](PERIODIC_INTENTIONS_DRAFT.md) | 八種原創風格、初始性格預選、可略過與修改；人格／方針／回顧分層、卦象校對及待決策 |
| [第一份原稿](sources/2026-10-20-shanjiandao-original.md) | 《山間道：靈氣復甦》GDD，原樣保存；原文公式、JSON 與週數均屬提案 |
| [第二份原稿](sources/2026-10-20-personality-destiny-original.md) | 人格命盤／易經構想，文字保存，僅清除三處空白行的行尾空白以通過 diff 檢查；原文錯誤與 GDScript 範例保留供對照，不能直接採用 |
| [第三份原稿](sources/2026-10-20-npc-life-recruitment-original.md) | 村民自主／交友／點化招募，按聊天來稿保存；範例不是已完成的 Utility AI 或可直接使用的引擎 |
| [第四份原稿](sources/2026-10-20-logistics-upkeep-original.md) | 資源／物流／Upkeep 完整聊天草稿，空白行／行尾正規化，非逐位元相同；數值、設施表與 Godot 程式均為示意，矛盾保留供對照 |
| [第五份原稿](sources/2026-10-20-periodic-intentions-original.md) | 三問／八種當期心境附件全文，僅清行尾空白與補末尾換行；錯配的爻形／Godot示例原樣保留，擁有人後補UX要求見整理版 |

第六份[生活增量草案](LIFE_ACTIVITIES_GROWTH_DRAFT.md)由遊戲PO依本聊天新要求評估，接#75／#152／#123；初學主角與堂親對照是遊戲側希望評估的方向，親屬canon／時代／模板與正式實作仍待定。原#155三段／#140驗收不擴張。

## 怎麼一起討論

聊天用來探索想法；#152／#160／#163 留各自選項、回饋與決策；這裡保存可版本比較的完整草案。[FUTURE_BACKLOG](../FUTURE_BACKLOG.md)／[#75](https://github.com/lalagrass/earth-ascension/issues/75)維持構想索引，成熟題目才拆獨立研究或實作 issue。不把整本 GDD 貼成 coding agent 的工作包。沿 [D12](../VISIBLE_DELIVERY_PLAN.md)逐步可見交付與驗證後整合；只保留參考可歸檔／記回訪條件，擬正式採用才另排差異包。

每次討論留下「問題、方案、建議與代價、是否採用、來源與日期、影響哪個工作包」。未定項可持續補充，不阻擋已批准的工作。採用時另以文件 PR 同步正式設計、決策紀錄、任務與驗收；不要只改草案就宣稱批准。

## 與現在開發的關係

現行產品以 [D8 即時生活](../REALTIME_LIFE_SLICE.md)、[RT-00 凍結契約](../RT00_CONTRACT.md)、[批准紀錄](../DECISIONS_AND_SOURCES.md)及 task 最新狀態為準。這些願景不改 D6／D7／D9／D10，不增加 14 天切片或 RT-04／05 的依賴、DoD，不啟動第二套引擎、不改 schema／RNG、不指派新作者。文件合併只表示保存草案。

共用人格分析仍由 Earth PO 管理 [#106](https://github.com/lalagrass/earth-ascension/issues/106)；遊戲在這裡研究呈現與未來採用方式。安全區／巡山見 [#104](https://github.com/lalagrass/earth-ascension/issues/104)，村莊故事與結局見 [#105](https://github.com/lalagrass/earth-ascension/issues/105)。研究者依原 issue 確認單一範圍認領，不重建另一套共用人格核心。

原稿是使用者提供的提案文字；收錄不保證其中第三方名稱、引文、程式或傳統術語已取得採用授權／完整考證。整理版將已核對、推導與未驗證內容分開，沒有下載、安裝或整合新套件。
