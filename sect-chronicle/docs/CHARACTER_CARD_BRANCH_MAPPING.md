# 公版人物卡：三分支屬性對照（評估稿）

主 [#340](https://github.com/lalagrass/earth-ascension/issues/340)；讀 [公版設計](CHARACTER_CARD_PUBLIC_PROPOSAL.md)／[評估提示詞](CHARACTER_CARD_AGENT_PROMPTS.md)。這是欄位語義盤點，不是三版功能 review／畫面驗收，也不批准改任何分支系統。

## 1. 固定快照與讀取邊界

2026-10-26 盤點。三邊仍持續開發，agent 回覆時補自己的實際 HEAD 與相對下列快照的差異即可，不重查未變欄位。

| 版本 | 分支與本次 SHA | 主要來源 |
|---|---|---|
| GPT | 本機 codex/solo-sect-gpt；bd82ee7b4c38356759df1a8cc590604a4238578c；本次未證明已推遠端 | solo-sect-gpt/src/state.mjs、ui.mjs、person-view.mjs、data.mjs、activities.mjs、life.mjs、combat.mjs |
| Gemini | [plan/sect-life-architecture-redesign](https://github.com/lalagrass/earth-ascension/tree/bae43412dced2a2f0d9d82008d5cdf8b3acfb8f9)；bae43412dced2a2f0d9d82008d5cdf8b3acfb8f9（遠端與本機已核一致） | sect-chronicle/life/core/persona-creation.mjs；experiments/water-carry/demo/model.mjs；life/core/martial-evolution.mjs |
| Grok | [codex/solo-sect-grok](https://github.com/lalagrass/earth-ascension/tree/842d879e634e45ab9f44c6ce49a236c07380498d)；842d879e634e45ab9f44c6ce49a236c07380498d | solo-sect/src/hero-data.mjs、hero.mjs、data.mjs、gen.mjs、arts.mjs、sim.mjs、main.mjs、status.mjs |

GPT 用已提交 Git 物件唯讀取樣，沒有讀取／搬用未提交成果；Gemini／Grok 同樣只核固定提交。程式定義／接線文字不等於已在瀏覽器觀察運作。本輪未啟服務、未跑三版遊戲或測試矩陣。

符號：**有**＝原碼已有對應定義／欄位；**近似**＝語義或來源尚不能合一；**未核得**＝本次沒有獨立、可信的對應，不宣稱全分支一定不存在。所有「有」仍待各 agent 確認權威來源及真實效果。

## 2. 起點／稟賦聯集

GPT stats 的欄位名稱取自 ui.mjs 創角標籤，順序不能憑索引跨版猜。其自創主角五項1–7、總20；Grok 自創六項1–5、基礎總12，另有低悟性／宿慧特例；Gemini 自創五項1–10、基本池30，另有 expanded 別名／模板。這些是各自創角預算，不是公版新規則或所有 NPC 的硬域。

| 候選語義／分類 | GPT | Gemini | Grok | 公版處置 |
|---|---|---|---|---|
| 悟性 aptitude.comprehension | p.stats[3]；授課／研讀增量引用 | innateStats.comprehension；亦有 stats.comprehension | 主角 H.stats.wu→d.wu；部分舊寫法 d.wu ?? d.root | 同學習題材，效果／量尺不同；Grok 缺wu的fallback不等於根骨就是悟性 |
| 根骨 aptitude.root | 未核得獨立根骨，不能把stats[0]直接當根骨 | innateStats.bone；自創路徑 bone=constitution，模板資料可能另填 | H.stats.gen→d.root；rootKnown 控揭露 | 保留獨立；Gemini 自創別名不能算兩種天賦，Grok先遮罩再輸出 |
| 體魄 baseline.physique／來源待判 | p.stats[0]，初始 maxHp=80+stats[0]×5 | innateStats.constitution；另有後天 skills.physique | 六項創角未有同名獨立項 | 不用根骨／生命反算體魄；Gemini先天constitution與後天physique分開 |
| 臂力 baseline.strength／來源待判 | p.stats[1]，傷害有引用 | innateStats.strength；另見breathing別名 | H.stats.li，創角時 skills.strength=4+li×3 | 起始臂力與練成的力氣分開，Grok不得把增長skills反寫回li |
| 身法 baseline.agility／來源待判 | p.stats[2]，轉向／出招部分時序引用 | innateStats.agility | H.stats.shen，創角時 skills.agility=4+shen×3 | 與後天腳力、輕功、當前速度為不同欄 |
| 定力 baseline.composure／來源待判 | p.stats[4]，觀察保留有引用 | innateStats.composure；另見temperament | H.stats.ding→d.ding | 各版效果另說明；不能把性格溫柔當定力高 |
| 吐納資質 extension.gemini.breathing | 未核得 | innateStats.breathing；自創路徑 breathing=strength | 未核得同義獨立項 | 原標籤與來源保留；不能當作已練內力／真氣槽 |
| 心性值 extension.gemini.temperament | traits另列，不強映射 | innateStats.temperament；自創 temperament=composure | personality／values另列，不強映射 | Gemini是否別名／獨立規則由作者核，不重複計分 |
| 福緣 aptitude.fortune | 未核得 | destinyBonusPoints為配點獎勵，不能當福緣 | H.stats.fu／s.hero.fu | 公版可容納；別版不補0、不加新掉落公式 |
| 天賦／特殊能力 | 需區分模板／後續已學能力來源 | innatePerks／traits含模板能力 | traits倍率、模板封印／覺醒等 | 以有來源的標籤／效果列表，保持人物可知範圍 |
| 創角預算／宿慧／命運點 | 五項預算20 | destinyBonusPoints | STAT_BUDGET／suhui等 | 創角／劇情元資料，不當作戰力軸 |

**先天與後天的核心歧義**：GPT 五項是創角起點，本次未核得每項獨立訓練增長；Gemini叫 innateStats 但同時有 stats 與後天 skills；Grok把創角 li／shen 轉成當前 skills 初值。公版保留「起點」作第三類，請作者證明真先天與可練部分。沒有歷史快照時，不能回溯宣稱已分解出生值＋鍛鍊值。

## 3. 後天能力、生活技能與武學聯集

| 候選語義 | GPT | Gemini | Grok | 公版處置 |
|---|---|---|---|---|
| 腳力／移動本領 skill.locomotion | 不把stats[2]直接視為獨立腳力成長 | 舊people.level／xp／initialLevel；新persona.skills.legStrength.level／exp／nextExp | d.skills.agility；speedOf有使用 | Gemini雙軌先核哪份權威；不同類等級不可直接相加 |
| 後天力氣 capability.strength | 本次未核得獨立於stats[1]的力氣訓練值 | skills.physique非同義，不能直接充當臂力 | d.skills.strength；chop／quarry等有skill增量設定 | 可顯示現有力氣，缺獨立值則不新增 |
| 後天體能／耐力 | energy是狀態，非耐力成長 | skills.physique（名稱定義）；energy仍另列 | energy是狀態，未核得獨立耐力值 | 不用精力剩餘推算耐力；請作者核physique效果 |
| 採藥／農事／烹飪 | 有相應活動；本次未核得每項獨立技能等級 | 有相關系統／配方，不等於每項有個人熟練 | skills.herbal／farming／cooking | 「能做工作」與「有個人成長值」分開；聯集容納，不補假等級 |
| 營造 | build活動／貢獻，不直接當熟練 | persona.skills.construction | build活動、strength增量，未核得獨立construction | 貢獻、工地進度、技能經驗不同 |
| 武學理解／熟練／體悟 | p.skill[art].U／F／I＋contexts／sources；三軌 | 舊people.palm novice／adept、train01進度；新martialArts及其他解鎖資料 | d.arts[id].xp／階段／突破與變體；另有skills.palm／leg | 三軌、一條XP、解鎖旗標不能硬壓成同一百分比 |
| 所學招式／主修／裝備 | weapon／move／skill、contentMoves | unlockedArts／yardDualLineageLoadout與舊palm等 | moves／style／arts與技法 | 用「招式清單＋本版進度」卡，不假稱同名武學同一規則 |
| 當前移速／負重／招式耗能 | 核心位置／bagWeight／actionTiming；速度待作者指定權威函式 | 舊motion／level及新autopilot pos等；雙軌需釐清 | speedOf(d)包含skills.agility、負重、低能量、輕功效果 | 顯示衍生效果與單位，不回寫能力，不跨不同地圖比px數字 |

## 4. 當下狀態、性情與社交聯集

| 類別 | GPT | Gemini | Grok | 公版處置 |
|---|---|---|---|---|
| 精力 | p.energy 0–10000；既有UI除100顯示 | 舊people[id].energy，rules.energy.max=100；新needs.energy.current/max | d.needs.energy，顯示條沿0–100 | GPT除100只是顯示換算；Gemini回報同步方向與同tick來源；無共同恢復公式 |
| 生命／傷勢 | hp／maxHp／injury | 本次未核得與所有路徑統一的人類HP／傷勢來源 | d.hp；其他受傷效果待作者核 | 野獸HP不可冒充人類HP；未知max不填100 |
| 飲食／飽足 | meals／mealDay為用餐紀錄，不等於連續飢餓條 | persona.needs.thirst；舊people.waterQ／drink暫態亦仍有欄 | needs.hunger，現有UI標「飽足」 | 各有語義、方向；原dev D45不加水分條，聯集不批准重新啟用舊字段 |
| 社交／樂趣需求 | 有行為／相處，不代表存在同名需求條 | 本次未核得獨立連續值 | needs.social／fun | 可選需求，其他版不需補做需求模擬 |
| 心情／思想 | 原碼來源需作者核，不以traits推算 | persona敘事／其他效果需核 | mood／thoughts／moodParts、wexin | 只用已知來源；wexin是狀態，不是道德或人格分 |
| 特質／價值／志向 | traits雙軸等，語義由原catalog核 | persona／問卷／心印／判詞與traits | personality／known／values、aspirations等 | 特質／價值／願望分型；未知性格須遮罩，卦象不替代規則 |
| 關係／家人／床位 | family／kin／bed與世界相處資料 | affinity／housing.roomId／bedId等，權威需核 | social／bonds／family／配對等資料 | 有向好感、家人身份與床位權利不混成一數值；不強加跨作戀愛 |
| 現在／原因／下一步 | person-view.situation()／life-policy說明 | snapshot.master.explain／舊人員view的why／next等 | statusOf／statusHtml | 最適合首批共用文字區；先釐清選中的是哪個角色 |
| 工作／巡山／交手紀錄 | 真journal／sources等 | done／lastTrip／巡山與新系統結果，需核真路徑 | 歷史／skills／arts等 | 真事件與fixture／預設進度分開；沒有紀錄不造「剛剛成長」 |

未列滿每個分支所有劇情／經濟／門派欄位；那些進 branch extension 並由作者補附錄。此表的聯集針對人物卡，不是世界全資料匯總。

## 5. 動畫接線盤點

| 分支 | 已見接點 | 請作者評估 |
|---|---|---|
| GPT | action.phase（windup／active／recover）、combat.actionTiming、固定tick、人物朝向，renderer另在render／scene-art | 現有action ID／實際hit／miss／cancel來源、程序姿態／逐格資產、不同體型和兵器共用邊界；不改真時長 |
| Gemini | 舊palm起手／收勢與motion；demo/app.mjs PixiJS圖集；新combat／autopilot資料另存 | 目前玩家看到哪份action／position；phase到圖格與腳錨、相容素材缺口；避免兩套人物同時驅動移動 |
| Grok | main.mjs按d.anim／task／face等顯示，獨立moves／arts | 戰鬥真相位／結果與視覺anim的對應、人物sprite族、缺圖fallback；不可把任務圖示視為完整武學動畫 |

只建議「武學規則→呈現模板→相容動作族＋人物外觀→素材目錄」。每人不必每招獨畫，逐格水彩仍需各外觀相容圖格；有自訂演法不等於另加傷害／位移。

## 6. 三方共同回覆表

各自在 #340 新增一份具名回覆（無法寫GitHub可貼原聊天給擁有人轉貼），不互相編輯別人的報告：

| 公版語義ID | 原路徑／函式與固定HEAD | 真正含義／單位／方向 | 先天／起點／後天／當下 | 誰寫入／何時改變／核心效果 | 對應類型 | 可見範圍與限制 | 最小接法／代價 |
|---|---|---|---|---|---|---|---|

對應類型填：可直接投影／有損近似／同名異義／未支援／雙來源待釐清；未核實效果另外註記，不以字面同名判定。另附：

- 目前看得到什麼：挑水／修練／休息一段資料流的紙上追蹤，不啟新瀏覽器。
- 一個先天／創角起點案例、一個有證據的後天成長案例、一個短期狀態案例、一個缺項／隱藏案例；沒有案例就如實標缺。
- 動作模板例：一招，規則phase→視覺motion；兩個相容人物可否共用、何時要專用圖格，缺圖怎麼辦。
- 建議採用／保留擴充／拒絕對應；必須改核心的項目與理由；最小包／成本粗估與未定事項。
- 不做全量改名、點數重配、補全六角、開需求系統、全骨架重製、存檔升版、手機或合併三版。
