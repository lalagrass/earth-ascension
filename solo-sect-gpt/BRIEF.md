# GPT 獨立門派生活遊戲：三階段委託

日期：2026-10-25（Asia/Taipei）。委託整理：Codex 主聊天「重新規劃遊戲里程碑」。

## 使用者此次明確指示

使用者要求三個 task：規劃、開發 spec、開發；全部由 GPT 獨立完成，像 Grok 與 Gemini 的獨立開發 branch，這次不走既有多方協作。使用者另要求重新檢視完整場景，包括塔防延伸出去的遠征圖，參考社群／開源。模型配置經使用者明確選定：規劃 GPT-6 Astra / high；spec GPT-6.1 Sol / high；開發 GPT-6.1 Sol / high。

這是新的有限獨立實驗授權，並非正式 dev 整合或發布授權。工作只在本 checkout 的 `solo-sect-gpt/`（及其子目錄）進行；不修改原 dev、Gemini 或 Grok 成果、根契約、共用 CI 或其他產品。無需把這次獨立實驗送原 issue 認領／grass／Earth queue；以本文件與階段提交記錄作者、base、範圍與來源。日後若要進 dev，另依當時契約處理。不要建立 GitHub issue、PR、留言、push、merge 或部署。所有聊天不召喚其他 agent，不參與既有 PO／review 聊天；三階段串行，只有當前階段作者可寫本分支。主聊天只負責階段啟動與狀態追蹤。

工作區：`/Users/chenyuying/.codex/worktrees/solo-sect-gpt/earth-ascension`
分支：`codex/solo-sect-gpt`
起始 dev：`148cfbbb27e43475c66744d53c2451125a9111a0`
使用者原 checkout：`/Users/chenyuying/workspace/earth-ascension`，唯讀，不切換或清理它。

## 必讀來源與已知事實

先讀根 CONTRIBUTING.md 了解既有產品邊界；以上使用者新指示只替換本獨立分支的協作流程，不取消真實驗證、資料保護與範圍控制。

- dev：148cfbbb27e43475c66744d53c2451125a9111a0。讀 `sect-chronicle/docs/vision/NORTH_STAR.md`、FUTURE_BACKLOG.md、MARTIAL_ARTS_RESEARCH.md、SIMS_LIFE_RESEARCH.md、LIFE_M1_EXECUTION_PLAN.md，及 experiments/water-carry/demo 的 model/routes/palm/patrol 與 SCENE04 素材。
- Grok：`origin/codex/solo-sect-grok` at `7eb0f7a309e9ee90612ddd0f4f8ef08faf39be47`。用 git show 讀 `solo-sect/FEATURES.md`、DESIGN.md、ROADMAP.md、src/sim.mjs、src/expedition.mjs、arts/mind/social/hero/save。生活→分工→成長→遠征循環有價值；FEATURES 的193測試與7/7 UI是作者紀錄，不是本次重新驗證。遠征主要背景公式、無完整同圖出招；部分展示直接設定狀態。
- Gemini/Antigravity：本地 `plan/sect-life-architecture-redesign` at `32c1b88adbe00e206a6590ecf4f4e47261ceb9b9`。用 git show 讀 `sect-chronicle/FEATURES.md`、docs/vision/SECT_LIFE_REDESIGN_MASTERPLAN.md、五份 LIFE_V*_HANDOFF.md、life/core 與 life/data。模組、人物模板與武學設計有價值，但尚未完整合流到畫布。demo/model.mjs 的 dispatchSegmentedPatrol 直接填固定戰果、breakthroughLuohanLv10 直接設十級，不能當正式玩法沿用；verify-flow.mjs 是模型呼叫，不是瀏覽器正常玩家通關證據。
- 三來源只作可核對參考，保留來源與授權。不要整包合併兩套世界。

## 核心遊戲意圖

天下霸圖的門派生活、模擬市民的個性技能與人際、同圖即時武學與塔防式演武。從破道館開始，真實採集→搬運→施工，逐步建大廳、外功區、宿舍、膳房、藥園、菜園；延伸後山狩獵與遠征。看得見人物生活、練功與成長，設定性格／方針後能自主運作，仍可暫停、叫回與改派。不得把面板數值變動當成地圖行動已交付。

具名雇工、外門／內門共用人物身份，工作中識人，可邀請入門；另有下山義學、慕名拜師與奇遇。外門貢獻目標須保留練功時間及缺料／受傷例外，內門危機時也能幫忙。關係由事件形成，成年合適人物可結伴／家庭同住；既有小女孩保持親情陪伴，不引入戀愛。

自創固定配點＋性向問卷＋可解釋自主掌門；可選經典人物成長模板、遇見／招募經典人物。少量有深度代表角色優先：洪七公（飲食／俠義／傳授）、令狐沖（自由／切磋／破招）、喬峰（護人／承擔）、郭靖（勤勉／深修）、岳不群（門派／聲望／選擇）。未成名可招募模式與成熟宗師作客模式分開，原作宿命不強迫發生。經典 IP 先作私人原型內容，公開授權／原創化是後續發布決策，不做付費或發布。

武學兼具廣度與深度；理解、熟練、體悟分開。低悟性人物能靠長期練習把基礎拳練深；不要硬禁止高悟性人物精通基礎拳。獨孤九劍重觀察、辨識、時機、距離與失敗條件，不做無條件瞬發必中。演武與野外交手共用規則，練功前後差異要能肉眼看出。付費點數、手機、大型外交、世代子嗣、無限內容延後。

## 場景設計必須納入第一階段

先盤點 SCENE04 S0/S1/S2 與 plan.json 的建築輪廓、門、互動站位、水流、長路和擴建空間。現有母版有家庭／教學／菜藥園與出圖路口，遠征還只有邊界提示，不能直接宣稱容量不足或整張重畫必要；以實際動線與目標人口驗證。

推薦檢驗三層空間：生活核心（大廳／膳房／倉庫／床位／社交院落），外圍生產及演武防衛帶（資源、農藥園、守點、撤退與側路），連續分段遠征（林緣、溪谷、窄橋、山寨／古洞、休整點）。同一世界規則、真實角色與時間；鏡頭可跟隨／切區，戰鬥不切到抽象戰報或另一套戰鬥系統。第一版不必無限大圖，不要求所有遠區每幀渲染。

交付成熟全圖反推破敗／初建／成形的共用幾何；生活／搬運／訪客／敵人／撤退五種路線；資源與風險、補給、視線、窄路容量；初期只實作一條完整外出路線。防衛波次限可重複演武；自然獸群保有棲地與個體來源，避免家園變成無休止壓力。保留有意義的長通勤與成長差，但基本吃飯睡覺靠近。不得將建築、門口、路網和人物烘焙成一張不可用的大背景。

規劃階段至少交可看的 SVG/HTML 配置圖與 3 階段疊圖、尺寸／站位／地形與素材清單；如需要水彩氣氛圖，使用 imagegen 技能與 OpenAI 圖像工具，先檢視參考素材；圖像是美術目標，工程幾何仍須可編輯且可驗。開發階段接入地圖、人物動作、遮擋與出招效果，不能只交漂亮圖或 debug 按鈕。

已查來源（仍須核對適用性，社群意見不等於共識）：
- https://steamcommunity.com/app/294100/discussions/0/3808408158825922960/ — 玩家在整體規劃、緊湊效率、自然聚落感間有不同偏好。
- https://eremitegames.com/devlog-3-smouldering-city-world-map-and-more/ — 開發者區分世界選址與即時聚落層、地形帶來資源／威脅／獎勵差；不照搬其重置聚落機制。
- https://github.com/Anuken/Mindustry 與 https://mindustrygame.github.io/wiki/ — 生產／防衛互相支撐；地形與敵人來路需要可玩測試。
- https://github.com/riperiperi/FreeSO/wiki/Project-Structure — 人物、物件、指令、狀態與畫面分層。
- https://docs.cataclysmdda.org/JSON/MARTIALART_JSON.html — 武學／招式／條件資料化。
- https://wildermyth.com/wiki/Writer%27s_Guide — 背景／動機／性格驅動事件。

## 三階段與交付鎖定

1. 規劃：產出 docs/PRODUCT_PLAN.md、docs/SCENE_ATLAS.md、docs/MILESTONES.md、docs/DECISIONS.md 與 maps/design/ 可檢視配置圖。先廣度總圖，再有限第一版。完成自校／連結／來源核對、提交，寫 handoff/planning.ready.json，含 status=ready、artifactCommit、artifacts、remainingDecisions。一般可逆數值自行作明示暫定，不把整份計畫擱置等逐項批准；遇真正外部花費／發布才留後續。不得自行啟動下一聊天。
2. spec：等待 planning.ready.json 的真實 ready／提交後，讀規劃且盤點來源，產出 docs/SPEC.md、docs/ACCEPTANCE.md、docs/ASSET_CONTRACT.md、docs/IMPLEMENTATION_ORDER.md；覆蓋單一權威狀態、人物/設施/任務/預約/尋路/武學/成長/關係/招募/地圖與素材、保存邊界、固定種子與正常 UI 驗收；不先實作引擎。自校並提交後寫 handoff/spec.ready.json。
3. 開發：只在 spec.ready.json ready 且文件齊全後取得寫入權。從同一分支接續，自行完成 spec 內所有第一版 milestones、場景與必要素材、測試、正常瀏覽器玩家流程、補修、README、FEATURES.md 與證據。核心實作一人完成，不派子代理或找既有 reviewer。不把 milestone 或單次 turn 結束當全部完成；有未完工作就保留明確 checkpoint。只有完整第一版驗收成立才寫 handoff/development.done.json。

階段 ready/done JSON 都須帶文件／程式 commit 和證據路徑；不得只有口頭宣稱。交付只影響本獨立分支。恢復先核 HEAD、工作區、handoff 狀態，保護前一階段成果。各階段可自行作已授範圍內的常規決策與必要補修，毋須逐項請示。規劃與 spec 待機時僅可唯讀，不預占寫入，不預設上游已完成。

## 第一版完成線候選

SL0 三方收斂／真實地圖與第三人；SL1 破道館第一天（修住處／練拳／同圖護家）；SL2 雇工與首徒／生產建造；SL3 自主作息、生活分工與人際；SL4 多種打法與同圖演武／遠征；SL5 基礎深修與少量特殊人物；SL6 自創／經典主角與一條完整分歧；SL7 開宗立派與完整存讀／教學／音效／測試／完成畫面。規劃者可整併順序與適度收斂內容數量，但須涵蓋上述核心意圖，不把全部願景擴成無限工程。

既有保存與使用者資料須保護；前期先訂狀態契約，新增完整保存靠後交付。獨立實驗可在本機隔離埠測試，不碰既有 8800 與原存檔 key；不宣稱作者自校是獨立 review。測試按風險與範圍，必要根檢查依契約；輸出落檔，只讀摘要與失敗；未跑項誠實標記。
