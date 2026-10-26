# 公版有限交付路線 — #346

擁有人於2026-10-26要求整理公版待開發並 trigger session 依序完成；權威索引為 [#346](https://github.com/lalagrass/earth-ascension/issues/346)。三核心玩法／世界保持獨立，公版只交換已可證資料及呈現。每包一主筆／一主PR，grass非作者集中review、#67唯一票、dev必要postCI成功後才派下一包。

| 包 | 狀態／具體成果 | 下一條件 |
|---|---|---|
| #342 共用場景 | PR344已交：固定GPT/Gemini真核心、同Pixi renderer；dev490b9ae/postCI40294390608成功 | 已復用 |
| #345 人物卡／行動 | PR347已合dev457aa0be902c26691bebaea2881820d86e5330db，postCI40301296266五成功；Grok真核心薄接線、來源／缺項語義 | 已復用，不追溯新增美術驗收 |
| [#348 素材版本](https://github.com/lalagrass/earth-ascension/issues/348) | PR352已合dev23b511db75f2fb2862241194a8a999aa357534aa、push postCI40304567407五成功：三獨立pin、正式主角既有圖裁切、女孩缺圖／權利未知、最多三景物、真GPT harness。見[工作包與交付](PUBLIC_ASSETS_HANDOFF.md)及[接手prompt](PUBLIC_ASSETS_AUTHOR_PROMPT.md) | 已復用 |
| #349 設施／互動點 | PR353已合dev95402dcaf6adff4b39a799c930af58c536273b6a，push postCI40307050558五成功；原正式設施詳情／tooltip／真水藥指派、第二真GPT薄適配。見[FACILITY_PUBLIC_HANDOFF](FACILITY_PUBLIC_HANDOFF.md) | 已復用 |
| [#350 武學卡／動作](https://github.com/lalagrass/earth-ascension/issues/350) | PR354已合dev67b49e3a078ea491432a9ff22de48400019fc57e，push postCI40309733677五成功；三真核心武學來源／缺項、正式兩skin原第一式共用映射，原公式不改。見[工作包](MARTIAL_PUBLIC_HANDOFF.md) | 已復用 |
| [#351 近期事件／整合](https://github.com/lalagrass/earth-ascension/issues/351) | 獨立Codex Cloud `/root/events351_author`，claim6414178870；本PR候選交既有事件唯讀EventView／120快取24近期／來源ID與原單位／原因遮罩與篩選連結；三核心能力／更新指南與正式同入口累積流程。見[工作包](EVENT_PUBLIC_HANDOFF.md)／[作者prompt](EVENT_PUBLIC_AUTHOR_PROMPT.md) | grass非作者review／dev／必要postCI後才done；有限序列到此停止，不啟其他backlog |

#343經典角色圖持續是研究候選，未定第三方權利與正式角色對應；#339完整素材庫等母願景不因有限包關聯而全部關閉。缺資料用unknown/hidden/unsupported，不以0補缺或拿別角冒充。保留單一正式生活入口、原長路與速度／命令／D45／D53；無存檔升版、手機、付費／CDN／LFS／新repo或整庫搬遷。當前正式dev與獨立原作者分支的最新功能不可混稱已同步。


## 母願景已交／未交

#340已由#345/#350交有限人物卡、行動與武學來源呈現，#351補真事件銜接；新天賦效果／新增經典角色與三原作者分支全面採用未交。#339只交#348有限本地pin／manifest與主角舊圖裁切，完整圖庫／女孩正式圖與第三方權利仍未交。#181/#315/#318只復用本序列已證薄接線，不當全面遷移或全角色動畫完成。#120只交唯讀原事件，完整canonical causes[]、保存升版與生成敘事未交且未授權。任何母願景不因本有限PR全部關閉；固定來源與更新步驟見[能力表／版本指南](EVENT_PUBLIC_HANDOFF.md#三版能力與固定來源)。
