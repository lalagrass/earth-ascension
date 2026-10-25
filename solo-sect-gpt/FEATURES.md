# 優化 M1–M6：目前交付

GPT / Codex，GPT-6.1 Sol / high，單一作者；獨立worktree的solo-sect-gpt。六階段已依序完成，總完成標記見`handoff/optimization-m1-m6.done.json`，可核索引見`evidence/optimization/index.json`；作者自校，非真人／獨立review。

| 階段 | 已交付與實際證據 |
| --- | --- |
| M1 | 分層水彩屋／樹／橋／地表，真門口／遮擋／行走，兩視窗與生活動作；m1/index.json。 |
| M2 | 日課、補給優先、一次命令回原安排、危急分級；兩邊各真實20分鐘，必要介入0=0，不宣稱減少；m2/index.json。 |
| M3 | 三近期武學目標、三風格／長招快拳佯攻五場真對練；六次合法慢招截擊，快招失敗、佯攻兩次真失敗；m3/index.json。 |
| M4 | 三門風、三有限事件六分支、普通／經典六場及後續真相處、實成本與來源；m4/index.json。 |
| M5 | 有限採藥交倉、同一村人護送、健康既有守路人營地真切磋、兩路／兩營地方案、真過橋召回；m5/index.json。 |
| M6 | 四類版本JSON、CLI/UI驗證／遷移、內嵌保存、兩個實例免改core；真訪客、新招14次真交手、事件／後續、刷新與壞檔拒絕；m6/index.json。 |

本版119項完整模型／整合回歸通過，另增一項所有方針共存後保存續跑測試，合計覆蓋120個不同案例。未受影響的根Python53／SG dev383／Earth語法沿用M2落檔證據。有限seed／情境不是平衡分布或真人體驗研究。全功能正常UI示範存檔：`evidence/optimization/showcase/showcase-all-features.save.json`；此短實走不替代M2事前登記的20分鐘。

下方保留第一版歷史紀錄；原development.done與當時報告不覆寫。

---

# 山居第一章：功能與驗收

GPT / Codex，GPT-6.1 Sol / high；作者自校，非獨立 review。base dev `148cfbbb27e43475c66744d53c2451125a9111a0`，spec `0a2e9c393a982d3476da70513e04ac0bed552909`，分支 `codex/solo-sect-gpt`。修改僅在本目錄，沒有 push／PR／merge／部署。

第一版軟體功能已完成。正式完成標記與 artifact commit 見 `handoff/development.done.json`；44案例、16故事節點與SL0–SL7出口由 `evidence/development/release/build_index.py` 生成版本索引，不能把單次立匾當全功能驗收。

| 功能 | 已實作及實際驗證 | 證據 |
|---|---|---|
| 單一World、20Hz、固定seed、三人起步 | M與正常UI；1/2/4批次、集合反序、每千tick hash、存讀及view不改規則；長幀保留經過時間 | core／determinism測試；save-controls-release、clock-recovery-final |
| 真採集→手持→搬交→分階施工 | 10地塊；最多2施工位；材料／工量與在途取消不回空氣倉 | material-cancel-final；journey-01；交易／幾何M |
| 菜藥／水／餐／乾糧／茶 | 播種、實搬水、成長、收成地包再入倉；配方在製／出鍋批次／手持搬交及取消續做；滿缸可恢復 | operations-final、water-recovery-final；production測試 |
| 自主作息／主次職務／貢獻 | 睡眠、用餐、低精力自理、有效意圖續做、修行窗口及傷病／缺料豁免；內門危機幫工 | boundaries A10；正常8＋2長局；u04-guo-resume |
| 阿木／林青／沈禾 | 原ID、原包裹與關係；共作入門、實走義學、接待、供餐拒絕後恢復與真30秒考核 | journey-03／04／05 |
| 一師四生／雙人交流 | 固定不同站位、整組預約；退出者不取收益、老師取消清全員；完整課程有學理來源 | classroom-final、classes測試 |
| 家庭及女孩親情 | 成年雙方意願、拒絕分叉、兩張相鄰床真入房；解除保前史與其他人的床；女孩不勞作／戰鬥／戀愛 | u03-family-legends-rerun、operations-final；模型邊界 |
| 五門六動作／實際器械 | 拳、掌、掃棍、刺劍、觀察截擊、短步；三階段／LOS／一次命中；棍劍需知識及真裝備 | presentation、presentation-continue；equipment-guard、combat測試 |
| 廣度／深修／觀察 | U/F/I來源不同；低悟2、高悟7都經正常練習與攻防深修；九劍成功、短起手、佯攻失敗可達 | u04-guo-resume、depth-high-seven、nine-lesson-fixed |
| 甲乙兩波演武 | 有限4個訓練ID、真入場／退場、安全HP下限；同moves與幾何 | journey-04、u43-load-current；M甲乙／配對 |
| 有限自然生態 | 三鼠兩豬同ID；受傷回棲地休養一次，不反覆刷驅離事件、不由出征重生 | ecology／replay M；正常森林旅程 |
| 連續外出／單人橋 | 1–3人真領糧走E1／營地／溪谷／橋／洞口／古洞；岸上候位、傷員優先、有限批次、實走召回 | journey-05、u43-load-current、bridge-opposed-complete |
| 真失利／扶傷／救援 | 正常守路交戰倒地；等待120秒後援手真走到場／回家；三人分趟、滿日訪槽及橋繩模型 | u05-rescue-current；bridge-policy／persistence-load |
| 五代表人物／三主角 | 五人各兩節點；郭靖／令狐沖／岳不群主角替代均正常完成；young／mature不複製身份，mature一日離院及不可永久入門 | u03-finish、u04-*、u03-mature-verified、final-contract |
| 古洞分歧／後續履約 | 救人少帶糧／保4糧／回來救人；物品來源、第一次選擇、歷次承諾／報告分開；三份返院明記partial | u02-seed29、u02-return-rescue-final、partial-promise |
| 立匾／回顧／續玩 | 真完成條件、實際建物／人物／選擇，關閉回顧後同World生活 | founding-final |
| 完整保存與保護 | 手動、auto3輪換及讀取、匯出／預覽取消／確認；九狀態各續6000tick hash相同；壞檔／版本／引用／quota保護 | save-controls-release、u05-rescue-current；codec／storage M |
| 程序分層美術／音效 | 原創341個參數化素材ID，屋體／屋頂／床／物資／四向人物／六招；1440與1280畫面自校，WebAudio解鎖與訊號／設定已驗 | visual-final、presentation*、assets/manifest.json |
| 本機負載 | Apple M2／8GiB／Chrome156，8常住＋2客、三人外出、4訓練對手，4倍600模擬秒 | performance-release/performance.json；實際約3.996倍、frame工作p95 13.9ms、最大幀間隔約167ms |

模型／整合共有55個不同案例通過（49項完整回歸＋4項末輪合約＋部分履約／器械前置各1）；固定五seed不是平衡分布研究。根53 Python與383 SG快驗沿用本獨立實驗已跑且未受改動的證據；M2與全部新ESM語法重核。未跑舊SG main／manual完整RT，這不是main發布。

正常UI由新局或可追溯的正常存檔接續，無World注入、賦級、固定戰果或debug dispatcher。長旅程跨開發版本，保留失敗、修補與來源鏈；未受影響項明示復用，針對新物流／候位／故事／保存反例重驗。原始證據與版本hash可核，不宣稱每個早期截圖出自最後同一commit。

**未驗界線：**作者未聽驗音效、未經真人試玩或獨立review。已驗的是音訊產生／首次互動／靜音／音量訊號與視覺時機，沒有把它冒充聽感通過。經典姓名僅供私人原型，公開IP清理、手機、下一章、世代與正式發布都不在本次範圍。

素材／程式為本GPT版本原創，只衍生本分支planning座標。三固定來源僅作觀念參考，沒有搬用外部圖音或整包合併世界；詳見 `assets/PROVENANCE.md`、BRIEF及DECISIONS。
