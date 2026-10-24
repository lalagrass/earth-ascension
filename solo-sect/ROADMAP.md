# 門派生活 solo-sect — 系統優化與 v0.6–v1.0 路線圖

> 2026-10-25，Grok Bot 獨立分支 `codex/solo-sect-grok`。我掃過 earth-ascension 全部 140 張 issue（含已關閉的），也參考了社群和開源資料。issue 只用來取材，沒有留言，也沒有改動任何 issue。
> 判定欄位：**採用**＝照原意做；**改編**＝取核心想法，換成本作的簡化版；**延後**＝有價值但不在 v1.0 範圍；**不取**＝不適用。

## 1. Issue 取材表

### 1A. 人物、性格與心智（最值得做）
| Issue | 想法 | 判定 | 理由 |
|---|---|---|---|
| [#163](https://github.com/lalagrass/earth-ascension/issues/163) 三問心印 | 開局回答三題決定初始性格，沒有特別想法就用預選 | **改編→v0.7** | 招募時讓玩家從兩三個「性格組合」裡挑；不想選就直接預設 |
| [#106](https://github.com/lalagrass/earth-ascension/issues/106) 16 型人格／八卦判詞 | 人格分析加上敘事呈現 | **改編→v0.8** | 系統不跑 16 型，只用 8 個特質；卦辭／判詞當作 UI 上的說明文字 |
| [#152](https://github.com/lalagrass/earth-ascension/issues/152) 人格命譜、村民自主、招募 | 長期願景：命譜、村莊自主 | 改編→v0.9 | 命譜改成每人一條人物時間線，記錄重大想法與事件 |
| [#5](https://github.com/lalagrass/earth-ascension/issues/5) 人格漂移近乎零 | 改成由事件驅動漂移，參考 CK3 壓力 | **採用→v0.8** | 壓力累積→崩潰事件→特質可能改變（例如膽大→多慮） |
| [#2](https://github.com/lalagrass/earth-ascension/issues/2) 記憶超過 12 個月失效但仍佔位 | 改成半衰期衰減；參考 Generative Agents | **已採用 v0.6** | 想法有 ttl，到期就移除；之後再加「重大記憶」長期保留 |
| [#1](https://github.com/lalagrass/earth-ascension/issues/1)、[#8](https://github.com/lalagrass/earth-ascension/issues/8) 目標達成後全員「穩定生活」 | 人物變得同質化 | **採用→v0.7** | 用性格乘數加長期志向（志向見 v0.7）避免收斂成一樣 |
| [#176](https://github.com/lalagrass/earth-ascension/issues/176) 目標完成後第 7 天停擺 | 需要可以無限循環的日常 | **採用（已大致具備）** | 需求衰減加生態再生，本來就會循環；v0.7 再加「志向」當中期目標 |
| [#119](https://github.com/lalagrass/earth-ascension/issues/119) decide(perception, mind) 介面 | 心智決策做成純函式 | 改編 | scoreActs 已經是純評分；v0.7 把評分拆成 considerations |
| [#133](https://github.com/lalagrass/earth-ascension/issues/133) 「這個角色現在為什麼這樣」 | 用來源支撐角色事實 | **採用→v0.6/v0.7** | 面板顯示想法清單（已做）；v0.7 加「為什麼做這件事」的分數拆解 |
| [#36](https://github.com/lalagrass/earth-ascension/issues/36) 技能回饋斷鏈 | 每項技能都要回饋到決策 | 採用 | 每個技能至少影響一個活動的速度或產出 |
| [#37](https://github.com/lalagrass/earth-ascension/issues/37) 玩家角色與組織脫節 | — | 改編 | 玩家扮演「師父」，主角是首徒，下指令的就是師父 |

### 1B. 關係與家庭
| Issue | 想法 | 判定 | 理由 |
|---|---|---|---|
| [#319](https://github.com/lalagrass/earth-ascension/issues/319) A5 人際：聊天、好感、階段 | — | 已採用 v0.4 | 改成雙向不對稱好感（見 §3.2） |
| [#337](https://github.com/lalagrass/earth-ascension/issues/337) 主角與收養小女孩交談、鼓勵 | 師徒或長幼之間的鼓勵互動 | **採用→v0.7** | 新增「鼓勵」社交：給對方正面想法，對低落的人特別有效 |
| [#180](https://github.com/lalagrass/earth-ascension/issues/180) 長住堂弟／堂妹 | 已有堂弟 | 已採用 | 成年禮與入門事件放在 v0.9 |
| [#251](https://github.com/lalagrass/earth-ascension/issues/251) 道館三人組深化 | 人物各有特色 | 採用 | 初始三人的性格組合現在各不相同（v0.6） |

### 1C. 生活與自主（Sims 方向）
| Issue | 想法 | 判定 | 理由 |
|---|---|---|---|
| [#188](https://github.com/lalagrass/earth-ascension/issues/188) 模擬市民式自主：完工後社交、娛樂 | — | **採用→v0.7** | 新增「娛樂」需求和閒暇活動（下棋、看雲、說書） |
| [#317](https://github.com/lalagrass/earth-ascension/issues/317) A3 弟子：需求、技能、作息 | — | 已採用 | |
| [#315](https://github.com/lalagrass/earth-ascension/issues/315) A1 設施提供活動 | — | 已採用 | 就是 Sims 的廣告物件（advertisement） |
| [#205](https://github.com/lalagrass/earth-ascension/issues/205)、[#208](https://github.com/lalagrass/earth-ascension/issues/208) 精力、偏好休閒、叫回 | — | 已採用 | 偏好由性格乘數接手 |
| [#279](https://github.com/lalagrass/earth-ascension/issues/279)、[#300](https://github.com/lalagrass/earth-ascension/issues/300) 自主飲水 | 水需求 | 延後 | 需求太多會稀釋重點；可以併進「膳房」 |
| [#170](https://github.com/lalagrass/earth-ascension/issues/170) 生活展示、初學與熟手對照 | 熟練度要看得出來 | 採用→v0.8 | 熟手做得快，動畫也不一樣 |

### 1D. 經濟、物流與擴張
| Issue | 想法 | 判定 | 理由 |
|---|---|---|---|
| [#160](https://github.com/lalagrass/earth-ascension/issues/160) 資源、物流倉儲、人口維持消耗 | 有搬運、有 upkeep | **改編→v0.8** | 已經有 deliver；加上每人每日的維持費，加上倉庫容量 |
| [#321](https://github.com/lalagrass/earth-ascension/issues/321) A7 設施階段 | — | 已採用 | 預計再加藥圃、丹房、藏經閣、演武場 |
| [#104](https://github.com/lalagrass/earth-ascension/issues/104) 安全區、資源收益、巡山擴張 | — | **採用→v0.9** | 清過的區域變成安全區，開放新的資源點 |
| [#75](https://github.com/lalagrass/earth-ascension/issues/75) 生活鍛鍊、輕功、靈材工藝 | — | 改編→v0.8/v1.0 | 輕功＝移速技能線；工藝＝丹房與鍛造 |
| [#145](https://github.com/lalagrass/earth-ascension/issues/145) 優先復用成熟開源 | — | 採用 | 本作零依賴；有需要再評估 PixiJS（見 [#155](https://github.com/lalagrass/earth-ascension/issues/155)） |

### 1E. 戰鬥、生態與狩獵
| Issue | 想法 | 判定 | 理由 |
|---|---|---|---|
| [#219](https://github.com/lalagrass/earth-ascension/issues/219) 鼠巢生態：清巢可能失敗、鼠群逃散遷徙 | — | **採用→v0.9** | 加巢穴實體、巡山時發現巢穴，以及遷徙機制 |
| [#320](https://github.com/lalagrass/earth-ascension/issues/320) A6 塔防式狩獵 | — | 已採用 v0.4/v0.5 | |
| [#318](https://github.com/lalagrass/earth-ascension/issues/318) A4 招式、熟練度 | — | 已採用 | v0.8 改成武學樹，加入互斥的流派 |
| [#98](https://github.com/lalagrass/earth-ascension/issues/98) 獸患與結局 | — | 改編→v1.0 | 山君（boss）事件當作第一章終局 |
| [#213](https://github.com/lalagrass/earth-ascension/issues/213)、[#241](https://github.com/lalagrass/earth-ascension/issues/241) 野豬騷擾、自主清鼠 | — | 已採用 | |

### 1F. 敘事與事件
| Issue | 想法 | 判定 | 理由 |
|---|---|---|---|
| [#120](https://github.com/lalagrass/earth-ascension/issues/120) 事件帶因果欄位，日報與編年史當投影 | story sifting | **採用→v0.9** | log 改成結構化事件，帶 causes[]；編年史只讀不寫 |
| [#105](https://github.com/lalagrass/earth-ascension/issues/105) 自主產生多樣故事 | — | 採用 | 性格、心情、關係和事件疊在一起產生分歧 |
| [#47](https://github.com/lalagrass/earth-ascension/issues/47)、[#54](https://github.com/lalagrass/earth-ascension/issues/54)、[#60](https://github.com/lalagrass/earth-ascension/issues/60) 事件流可讀性 | 每則事件都要有主詞、不被淹沒 | 採用→v0.7 | 依人物篩選、重大事件置頂 |
| Novel 系列 [#123](https://github.com/lalagrass/earth-ascension/issues/123)–[#135](https://github.com/lalagrass/earth-ascension/issues/135) | 互動小說 | 不取 | 是另一個產品 |

### 1G. 架構、流程與 CI（多半不適用於單人輕量分支）
| Issue | 判定 | 理由 |
|---|---|---|
| [#117](https://github.com/lalagrass/earth-ascension/issues/117) kernel＋系統模組 | 改編→v0.7 | sim.mjs 超過 450 行；拆成 mood、social、eco、hunt 幾個檔 |
| [#3](https://github.com/lalagrass/earth-ascension/issues/3) 快照內嵌完整事件史 | 採用 | log 已經只留 60 筆；編年史只存重大事件 |
| [#10](https://github.com/lalagrass/earth-ascension/issues/10)、[#71](https://github.com/lalagrass/earth-ascension/issues/71)、[#22](https://github.com/lalagrass/earth-ascension/issues/22) 規則／資料版本與可回放 RNG | 採用→v0.7 | 存檔加 rulesVersion；rng 已經在 state 裡 |
| [#215](https://github.com/lalagrass/earth-ascension/issues/215) 技術債盤點 | 採用 | 每個版本做一次 |
| #4、#6、#7、#9、#11、#12、#18–#21、#35、#38、#48、#52、#53、#55、#65、#67、#69、#72、#77、#79、#81–#95、#99、#102、#107–#116、#118、#121、#122、#128、#129、#136–#143、#149、#155、#158、#165、#173、#181、#182、#184、#197、#198、#201、#203、#218、#220、#228、#232、#238、#254、#257、#259、#262、#265、#271、#274、#284、#290、#303、#305、#309、#314、#316、#330、#334 | 已涵蓋或不取 | 這些是 Earth M2/M3 或舊 SG 實作、流程、CI、美術交付單。其中可以借用的概念（存讀、作息、巡山、補水、場景整合）在 v0.1–v0.5 已經用簡化方式做掉；其餘屬於別的產品或流程 |

## 2. 社群與開源參考
- **RimWorld**：[Mood](https://rimworldwiki.com/wiki/Mood)、[Thoughts](https://rimworldwiki.com/wiki/Thoughts)、[Traits](https://rimworldwiki.com/wiki/Traits)、[Social](https://rimworldwiki.com/wiki/Social)。心情＝基線＋想法總和，往目標值慢慢移動；三段崩潰門檻；好感是每人各自持有的意見值。→ v0.6 的心情模型
- **Dwarf Fortress**：[Personality facet](https://dwarffortresswiki.org/index.php/Personality_facet)、[Value](https://dwarffortresswiki.org/index.php/Personality_value)、[Need](https://dwarffortresswiki.org/index.php/Personality_need)。facet 0–100，需求影響專注度 ±50%。→ focusMul（心情影響成長 0.8–1.2）
- **了不起的修仙模擬器**（[攻略](https://www.steamxo.com/2019/01/12/535264/)、[Steam 討論](https://steamcommunity.com/app/955900/discussions/0/2997674076180695788/)）：心情低落時外門弟子怠工、內門弟子走火入魔；傳授功法打折。→ v0.8 崩潰事件、師父傳授
- **太吾繪卷 處世立場**（[灰機 wiki](https://taiwu.huijiwiki.com/)）：立場是連續光譜，違背立場會掉心情，立場相近的人比較容易有好感。→ v0.8「志趣相近加成」
- **The Sims**／Needs-based AI：[Zubek, Needs-Based AI](https://robert.zubek.net/publications/Needs-based-AI-draft.pdf)、[Sims AI slides](https://team.inria.fr/imagine/files/2014/10/sims-slides.pdf)。智慧物件負責廣告，代理人依需求評分。→ 本作的 FACILITIES 與 ACTIVITIES
- **Utility AI／IAUS**（Dave Mark）：[IAUS](https://gameai.com/iaus.php)、[Consideration](https://www.gameai.com/manuals/index.php/Consideration)、[Response Curve](https://www.gameai.com/manuals/index.php/Response_Curve)。多個 consideration 經過反應曲線後相乘。→ v0.7 重構 scoreActs
- **CK3 壓力機制**（#5 提到）：做違背性格的事會累積壓力，崩潰時可能改變特質。→ v0.8
- **Generative Agents**（Park et al. 2023，#2 提到）：用 recency×importance×relevance 檢索記憶。→ v0.9 編年史挑選重大記憶
- **Felt／story sifting**（#120 提到）：在事件流上用查詢找出故事。→ v0.9
- 社群評價（整理自 #284）：鬼谷八荒新手引導好，但突破太偏向強度；太吾探索可以玩 20 小時以上，但 UI 負擔重。→ 本作 UI 只露出人物、心情、想法和建議三樣

## 3. 系統優化設計

### 3.1 性格與心情（v0.6 已實作第一片）
- 8 個特質，每人 2 個：勤奮、健談、貪玩、溫和、膽大、樂天、多慮、貪吃。每個特質可以帶三種東西：`mods`（活動乘數）、`moodBase`（基線偏移）、`thoughtMul`（放大某一類想法）
- 想法（記憶）：學會新招 +15、聊得開心 +6、睡床 +5、破地鋪 −5、膳房熱飯 +6、受傷 −12、守住後山 +8、菜被拱 −5。每個想法有 ttl，同一種想法只刷新、不疊加
- 心情 = 50 + 基線 + 想法總和 + 需求不足的懲罰，每秒往目標移動（上升 3、下降 2）
- 決策：分數 = 基礎 × 作息 × 性格 × 心情 + 雜訊。心情低於 30 時，練功、砍柴、建造、切磋 ×0.6，休閒 ×1.35；高於 70 時工作 ×1.15
- **踩到的坑**：如果把種菜和煮飯也算進「低落時壓低」，就會出現餓→低落→沒人煮飯→更餓的死亡螺旋。求生活動不能被心情壓低，現在已經排除
- 成長 × focusMul(0.8–1.2)

### 3.2 關係（v0.7）
- 改成雙向不對稱：`rel[a→b]`。好感來源分成「熟悉」（相處時間）和「印象」（事件），參考 RimWorld 的 opinion
- 相容度 = 共同特質加分，對立特質（勤奮 vs 貪玩）扣分。聊天的成功率依相容度而定，失敗會產生「話不投機」的負面想法
- 新增「鼓勵」（#337）：長輩對心情低落的人使用，給對方「被鼓勵」+10

### 3.3 Utility AI 重構（v0.7）
- 每個活動 = 數個 consideration（需求曲線、距離、資源、作息、性格、心情）相乘，再加上 Dave Mark 的補償因子，避免考量越多分數越被壓低
- 面板上「為什麼做這件事」直接列出前 3 名活動的分數拆解（#133）

### 3.4 武學樹（v0.8）
- 掌法和腿法各分兩個分支，互斥。熟練度到某個值之後可以「悟」出被動效果
- 師父傳授的時間隨徒弟熟練度遞減；同門互教（了不起的修仙模擬器式的傳授）

### 3.5 事件（v0.9）
- 結構化事件 `{id,t,type,actors,causes[]}`。日報、人物時間線、編年史都只讀不寫
- 隨機事件卡：遊方郎中、山洪、鄰村求援。玩家二選一，選擇會給相關弟子想法

### 3.6 經濟節奏（v0.8）
- 每人每日糧食 upkeep；倉庫容量；名聲帶來香火錢（新資源「銀」），用來招募和買種子
- 目標曲線：S0→S1 約 3 天、S1→S2 約 7 天、S2→S3 約 15 天（目前偏快，大約 2/4 天）

## 4. 版本計畫
| 版本 | 範圍 | DoD | 風險 |
|---|---|---|---|
| **v0.6 性格與心情**（本次） | TRAITS／THOUGHTS／mood／focus，面板顯示性格、心情、想法；舊存檔補預設 | 21 項測試通過；5 個 seed 跑 40 分鐘不餓死；無頭走查 0 page error | 心情偏低：開局破道館給玩家壓抑感，算是刻意的，之後要給回升的手段 |
| v0.7 心智與社交 | consideration 拆解並顯示原因；雙向關係與相容度；鼓勵；娛樂需求；招募時選性格；拆檔；rulesVersion | 「為什麼」面板可以看到；對立性格的兩人好感明顯比較慢；招募 UI 可以預選 | 評分重構可能改變平衡 → 用固定 seed 的回歸快照守住 |
| v0.8 壓力、武學樹、經濟 | 壓力與崩潰（怠工、出走、走火入魔），特質漂移；武學分支；upkeep、倉庫、銀；藥圃與丹房 | 崩潰事件每 10 天 ≤1 次；同一個人 30 天內可以觀察到特質改變；經濟節奏符合 §3.6 ±30% | 崩潰太頻繁會讓人挫折 → 門檻和冷卻時間做成資料 |
| v0.9 生態與編年史 | 鼠巢實體、巡山發現、遷徙；安全區擴張；結構化事件加 causes[]；人物時間線；事件卡 | 清巢有成功與失敗兩種結局；時間線每一筆都追得到來源；投影層不消耗 RNG（測試保證） | 範圍大 → 生態和敘事可以拆成 0.9a/0.9b |
| v1.0 第一章完結 | 山君事件、演武場、輕功、存檔版本遷移、新手引導、效能（10 人以上） | 從破道館玩到擊退山君大約 2–3 小時，不會卡關；舊存檔都能讀；60fps | 美術素材不足 → 繼續用 dev art 加上色塊替代 |

## 5. 需要擁有人決定的事
1. **後代與世代**：道侶之後要不要生子、年齡增長、世代傳承？（會影響時間尺度和存檔結構；建議 v1.0 只做「收養」，不做生育）
2. **心情崩潰的強度**：只是怠工，還是包含出走／死亡等級的走火入魔？
3. **特質可見度**：一開始就全部顯示，還是相處久了才揭露（太吾式）？
4. **招募的性格選擇**：完全隨機、三選一，還是三問心印式的問答？
5. **時間尺度**：一天 600 秒是否保留？要不要加季節和年齡？
6. **是否引入 PixiJS 或其他引擎**（#145、#155）：目前維持零依賴
