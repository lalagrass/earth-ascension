# 公版人物卡：三位 agent 套用評估提示詞

主 [#340](https://github.com/lalagrass/earth-ascension/issues/340)。本頁三段各可獨立貼給相應 agent，**尚未代送／啟動**。本輪只研究／回覆，不修改系統、不開發人物卡或動畫。先收集三份語義評估，PO集中整理下一次選擇，不新增三個互相阻擋的工程前置。

[公版提案](CHARACTER_CARD_PUBLIC_PROPOSAL.md)｜[三分支對照與共同回覆表](CHARACTER_CARD_BRANCH_MAPPING.md)。

## GPT

```text
你是GPT獨立遊戲分支的開發agent，這次請做「公版人物卡套用評估」，不是開始實作。
目標分支：codex/solo-sect-gpt；本次盤點HEAD bd82ee7b4c38356759df1a8cc590604a4238578c，若你已前進，僅補相關差異。此快照目前只確認本機，不假設遠端存在；不要為本研究擅自push原分支。

請讀完整文件（可直接從網頁讀，不必把提案分支merge進自己的工作分支）：
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/CHARACTER_CARD_PUBLIC_PROPOSAL.md
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/CHARACTER_CARD_BRANCH_MAPPING.md
主issue：https://github.com/lalagrass/earth-ascension/issues/340

目的：先取欄位目錄的聯集，區分真先天天賦、創角起點、後天能力／生活技能／武學、當下狀態、性格價值與關係；公版容納差異，不要求三版新增同一套屬性或硬湊六角。先有唯讀投影，玩法與數值仍由各核心負責。

本輪只交評估，不改runtime、數值／點數預算、存檔、UI、素材或測試，不安裝依賴、換引擎、重做骨架、不開服務／瀏覽器、不跑完整測試或新seed量測。你若有既有批准開發包，沿原授權完成到穩定交付點再評估，不因這份提示詞取消／重置工作。不要讀取其他agent未公開修改、不要編輯共用工作目錄或合別版程式。

請在#340用具名新留言交同一格式（不能寫GitHub則交原聊天供轉貼）：
1. 實際身份、分支、固定HEAD；相對對照表快照的相關差異。
2. 映射表：公版語義ID｜原路徑/函式｜含義/單位/界限與方向｜先天/起點/後天/狀態｜寫入者/改變時點/真核心效果｜直接/近似/異義/缺項/雙來源｜可見範圍｜最小接法/代價。優先填已列欄位，新項放擴充，不追求列世界全部資料。
3. 一個起點/天賦、一個有證據的後天成長、一個短期狀態、一個未知/隱藏/未支援案例。沒有獨立後天值或歷史就如實寫缺，不從目前值反算出生天賦，不填假0。
4. 紙上追蹤一段現有生活流程：核心更新→可讀快照→人物卡；說明權威狀態與同一角色ID，不新增實作。
5. 一招的規則phase→呈現模板→motion/圖格→人物外觀接法。評估兩個既有人物能否共用動作、是否相容體型/兵器、需補哪些圖格與fallback。逐格換頭像不會自動生成全套動作；核心控制真時長/命中/耗能/位移，動畫只演出，不另跑戰鬥。
6. 建議採用/保留擴充/拒絕對應、必須改核心才做得到的項目、最小工程包與成本粗估（小/中/大＋理由）、未定事項。

跨版不以0–100、同名招式或px/s直接比較。先天與後天雷達分開，不納入精力、福緣或隱藏性格湊實戰六角。未知/未支援/未揭露分開；隱藏值不要放進回覆或畫面資料。保留來源與原有已知規則。

回覆集中在同一研究issue，不預占後續工程，不代其他兩位作結論。完成評估就回交等待下一次指派，不自行開始套用、串行多包、review/merge或啟永久loop。存檔升版與手機適配繼續最後。

你的專項核對：
- state.makePerson與ui創角五項stats[0..4]＝體魄/臂力/身法/悟性/定力。哪些是真先天、哪些只是創角基線？是否有獨立訓練增長來源？沒有就保留起點，不把同一值同時寫進先天與後天。
- energy 0–10000到顯示0–100只是單位轉換；hp/maxHp/injury、meals/mealDay與真需求的差異。
- 武學skill[art]的U/F/I與sources，不壓成一個熟練百分比；person-view.situation已是唯讀投影候選，說明能沿用與缺口。
- 請列可核對的實際速度/負重/招式時序函式，並說明是否受體態、兵器或短期狀態影響。
- render/scene-art與combat.action.phase的邊界；主角與另一個適用角色的動作共用可行性。若原規則不允許該角色出招，標不適用，不為動畫修改角色權限。
```

## Gemini

```text
你是Gemini獨立遊戲分支的開發agent，這次請做「公版人物卡套用評估」，不是開始實作。
目標分支：plan/sect-life-architecture-redesign；本次盤點HEAD bae43412dced2a2f0d9d82008d5cdf8b3acfb8f9，若你已前進，僅補相關差異。

請讀完整文件（可直接從網頁讀，不必把提案分支merge進自己的工作分支）：
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/CHARACTER_CARD_PUBLIC_PROPOSAL.md
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/CHARACTER_CARD_BRANCH_MAPPING.md
主issue：https://github.com/lalagrass/earth-ascension/issues/340

目的：先取欄位目錄的聯集，區分真先天天賦、創角起點、後天能力／生活技能／武學、當下狀態、性格價值與關係；公版容納差異，不要求三版新增同一套屬性或硬湊六角。先有唯讀投影，玩法與數值仍由各核心負責。

本輪只交評估，不改runtime、數值／點數預算、存檔、UI、素材或測試，不安裝依賴、換引擎、重做骨架、不開服務／瀏覽器、不跑完整測試或新seed量測。你若有既有批准開發包，沿原授權完成到穩定交付點再評估，不因這份提示詞取消／重置工作。不要讀取其他agent未公開修改、不要編輯共用工作目錄或合別版程式。

請在#340用具名新留言交同一格式（不能寫GitHub則交原聊天供轉貼）：
1. 實際身份、分支、固定HEAD；相對對照表快照的相關差異。
2. 映射表：公版語義ID｜原路徑/函式｜含義/單位/界限與方向｜先天/起點/後天/狀態｜寫入者/改變時點/真核心效果｜直接/近似/異義/缺項/雙來源｜可見範圍｜最小接法/代價。優先填已列欄位，新項放擴充，不追求列世界全部資料。
3. 一個起點/天賦、一個有證據的後天成長、一個短期狀態、一個未知/隱藏/未支援案例。沒有獨立後天值或歷史就如實寫缺，不從目前值反算出生天賦，不填假0。
4. 紙上追蹤一段現有生活流程：核心更新→可讀快照→人物卡；說明權威狀態與同一角色ID，不新增實作。
5. 一招的規則phase→呈現模板→motion/圖格→人物外觀接法。評估兩個既有人物能否共用動作、是否相容體型/兵器、需補哪些圖格與fallback。逐格換頭像不會自動生成全套動作；核心控制真時長/命中/耗能/位移，動畫只演出，不另跑戰鬥。
6. 建議採用/保留擴充/拒絕對應、必須改核心才做得到的項目、最小工程包與成本粗估（小/中/大＋理由）、未定事項。

跨版不以0–100、同名招式或px/s直接比較。先天與後天雷達分開，不納入精力、福緣或隱藏性格湊實戰六角。未知/未支援/未揭露分開；隱藏值不要放進回覆或畫面資料。保留來源與原有已知規則。

回覆集中在同一研究issue，不預占後續工程，不代其他兩位作結論。完成評估就回交等待下一次指派，不自行開始套用、串行多包、review/merge或啟永久loop。存檔升版與手機適配繼續最後。

你的專項核對：
- life/core/persona-creation.mjs的STAT_NAMES與STAT_NAMES_EXPANDED、stats與innateStats。自創路徑bone=constitution、breathing=strength、temperament=composure，模板卻有各自資料；逐項說明是別名/新維度/暫時相容，禁止把同一值算兩次。
- 真先天與skills.legStrength/physique/construction後天成長分開。不要把breathing當已練內力，不能用命運配點獎勵代替福緣。
- 最優先說清demo/model.mjs舊people.level/xp/energy/motion/position，與masterDisciple/persona.needs.energy/skills/pos的權威擁有人、同步方向及時點。卡片每個值要能指出來源；不能用??fallback掩蓋兩套不同值。
- 區分目前可操作路徑、只有資料定義/預設進度、可執行但尚未接線的功能；不因欄位存在就稱為已完成成長。
- 掌法舊palm/train01與新martialArts的真含義、phase/結果如何交PixiJS圖集；角色身形/握點/腳錨的共用與缺圖限制。
- 盤點thirst/waterQ時記錄目前分支事實即可；本提案沒有批准原dev重開D45已撤的水分主條。
```

## Grok

```text
你是Grok獨立遊戲分支的開發agent，這次請做「公版人物卡套用評估」，不是開始實作。
目標分支：codex/solo-sect-grok；本次盤點HEAD 842d879e634e45ab9f44c6ce49a236c07380498d，若你已前進，僅補相關差異。

請讀完整文件（可直接從網頁讀，不必把提案分支merge進自己的工作分支）：
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/CHARACTER_CARD_PUBLIC_PROPOSAL.md
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/CHARACTER_CARD_BRANCH_MAPPING.md
主issue：https://github.com/lalagrass/earth-ascension/issues/340

目的：先取欄位目錄的聯集，區分真先天天賦、創角起點、後天能力／生活技能／武學、當下狀態、性格價值與關係；公版容納差異，不要求三版新增同一套屬性或硬湊六角。先有唯讀投影，玩法與數值仍由各核心負責。

本輪只交評估，不改runtime、數值／點數預算、存檔、UI、素材或測試，不安裝依賴、換引擎、重做骨架、不開服務／瀏覽器、不跑完整測試或新seed量測。你若有既有批准開發包，沿原授權完成到穩定交付點再評估，不因這份提示詞取消／重置工作。不要讀取其他agent未公開修改、不要編輯共用工作目錄或合別版程式。

請在#340用具名新留言交同一格式（不能寫GitHub則交原聊天供轉貼）：
1. 實際身份、分支、固定HEAD；相對對照表快照的相關差異。
2. 映射表：公版語義ID｜原路徑/函式｜含義/單位/界限與方向｜先天/起點/後天/狀態｜寫入者/改變時點/真核心效果｜直接/近似/異義/缺項/雙來源｜可見範圍｜最小接法/代價。優先填已列欄位，新項放擴充，不追求列世界全部資料。
3. 一個起點/天賦、一個有證據的後天成長、一個短期狀態、一個未知/隱藏/未支援案例。沒有獨立後天值或歷史就如實寫缺，不從目前值反算出生天賦，不填假0。
4. 紙上追蹤一段現有生活流程：核心更新→可讀快照→人物卡；說明權威狀態與同一角色ID，不新增實作。
5. 一招的規則phase→呈現模板→motion/圖格→人物外觀接法。評估兩個既有人物能否共用動作、是否相容體型/兵器、需補哪些圖格與fallback。逐格換頭像不會自動生成全套動作；核心控制真時長/命中/耗能/位移，動畫只演出，不另跑戰鬥。
6. 建議採用/保留擴充/拒絕對應、必須改核心才做得到的項目、最小工程包與成本粗估（小/中/大＋理由）、未定事項。

跨版不以0–100、同名招式或px/s直接比較。先天與後天雷達分開，不納入精力、福緣或隱藏性格湊實戰六角。未知/未支援/未揭露分開；隱藏值不要放進回覆或畫面資料。保留來源與原有已知規則。

回覆集中在同一研究issue，不預占後續工程，不代其他兩位作結論。完成評估就回交等待下一次指派，不自行開始套用、串行多包、review/merge或啟永久loop。存檔升版與手機適配繼續最後。

你的專項核對：
- hero-data.STATS六項wu/gen/li/shen/ding/fu，hero.applyHero把wu/gen等交給d；創角li/shen轉成skills.strength/agility初值。分清H.stats起點、d當前值與真鍛鍊，不從skills倒推原天賦。
- d.wu與d.root的用途、舊wu??root fallback；說明根骨/悟性是否真的分別參與規則。rootKnown、known personality先遮罩，不曝光未揭露內容。
- skills.agility腳力與speedOf衍生速度、負重/低精力/輕功倍率；skills.strength與農/藥/廚；arts[id].xp/突破/階段與舊skills.palm/leg的關係，指出單一權威來源與相容欄位。
- needs.hunger在現UI標飽足，確認方向；energy/social/fun/mood/wexin分組，不把心情或違心當先天能力。
- main/statusOf已有現在/原因/下一步可否直接投影；戰鬥真phase/hit/miss/cancel與anim/task/face如何對接，別把工作圖示當完整招式動畫。
- 提出「共用動作族＋人物外觀＋少量招牌變體」的最小方案，沿現有素材先評估，不開始新出圖、改圖、全場景重做或未指派後包。
```
