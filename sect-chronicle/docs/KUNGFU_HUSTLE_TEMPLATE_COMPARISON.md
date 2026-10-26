# 《功夫》人物／武學與公版模板紙上補充

2026-10-26，擁有人要求加入《功夫》的特色人物與武功，已有立繪從分支取用，沒有的留白待補；並先參考社群／公開源碼現成設定。主[#340](https://github.com/lalagrass/earth-ascension/issues/340)，併文件PR #341。**只做研究、文件與既有圖片引用，不改三版系統、不生成新圖、不匯入資料或建立共用素材工程。**

接[原12人／18研究條目](CLASSIC_TWELVE_TEMPLATE_COMPARISON.md)，另列K01–K08八個案例（七個單人＋天殘、地缺雙人，共九人）。K號不改actorId；新增樣本不要求三位agent重做完整矩陣。

## 1. 先審模板：沿用既有層次，補語義即可

既有identity／referenceWork／storyStage、技能與availability、經歷／特性、武學components／executionMode及素材binding已能表達。只需明確以下用法，**不新增「音波天賦」「腿力」「覺醒值」等必填基本屬性**：

- 作品／版本身分：電影包租婆的「小龍女」稱呼，不自動綁原C04小說小龍女；電影蛤蟆功、太極與其他作品同名招式分定義／來源，不因同名共用傷害或學習前提。
- 發現≠獲得≠啟動：隱居高手被看出本領屬知識揭露；阿星的覺醒為有來源的角色經歷／特殊轉變。先天潛力、成長、傷勢恢復與新武學授予分開，不把挨打變成通用成長機制。
- 行走／追逐／腿招分開：苦力強譚腿是腿法，通勤是移動；追逐車輪腿是電影演出參考，不能直接推永久跑速或招式名稱。
- 合奏是多人參與，夫妻同場不代表公版固定加成。大鐘可記器具／合用前提，音波與突進記招式執行特徵；真距離、遮擋、位移、命中與打斷由各版核心證據決定，VFX不代判。

電影造型、個性與隱居職業提供差異，不靠新增數字硬分天才。先天值一律未定；分支既有值是本版設計，不能當電影官方屬性。

## 2. 人物卡與武學配對

F＝電影與官方／媒體參考；C＝社群改編；B＝本版已提交觀察；P＝本作紙上假設。原D為金庸外部資料，不拿來補電影人物。以下窗口／差異為F參考＋P選樣，不是正式數值或所有版本設定。

| 案例／人物 | 研究窗口 | 對應主武學 | 公版需要區分 | Grok視覺ID／Gemini登錄ID |
|---|---|---|---|---|
| K01 阿星 | 覺醒前→決戰後兩片段 | 如來神掌 | 初期表現、潛在天賦、真正學會與當下施展分開；重傷是此角色情節，不是人人挨打升級 | Grok axing；Gemini ah_sing |
| K02 包租婆 | 已退隱，出面保護街坊 | 獅吼功 | 嗓門／性情不等內功；音波作用、器具擴音與核心真結果分開 | Grok baozupo；Gemini landlady |
| K03 包租公 | 退隱高手出手窗口 | 太極拳 | 柔化／卸力、時機控制與原力量分開；不因日常懶散判定武功低 | Grok baozugong；Gemini landlord |
| K04 苦力強 | 搬運生活→揭露高手身分 | 十二路譚腿 | 搬運能力、腿部出力、腿法熟練、身法與通勤速度分開 | Grok kulijiang；Gemini kuli_qiang |
| K05 裁縫 | 縫製生活→出手護街坊 | 洪家鐵線拳 | 縫紉與拳法可並存；溫和／外觀不代表弱；鐵環屬器具，不是人物天賦 | Grok caifeng；Gemini tailor_hong |
| K06 油炸鬼 | 早餐工作→持棍出手 | 五郎八卦棍 | 烹飪／經營與棍法獨立；工具、棍長、握持與攻擊距離分開 | Grok youzhagui；Gemini youzha_gui |
| K07 火雲邪神 | 決戰前後兩片段 | 蛤蟆功 | 蓄力突進、反應／移動、好戰動機與暗器選擇分開；不由名字繼承金庸歐陽鋒 | Grok huoyunxieshen；Gemini the_beast（alias huoyun_xieshen） |
| K08 天殘、地缺 | 兩人合奏攻擊窗口 | 琴音攻擊（研究描述名） | 兩個參與者＋一組合奏；不能把一個群組登錄當一人的完整先天值 | Grok 未核到具名角色；Gemini tiancan_dique（群組） |

表中的Grok字串是立繪檔名ID，非保證同名actorId；三隱士可能沿原雜工ID揭露。Gemini為archetype登錄，亦不等本局人物ID。

可另外記阿星開鎖／追逐、火雲邪神暗器、三隱士生活技能，屬既有領域或裝備／演出描述，不為湊武功數量新增門派。價值與行為可比較阿星前後選擇、包租婆護街坊／催租、火雲邪神尋強敵；均不以性格標籤強制行為或診斷。

| 主武學研究條目 | 分層與紙上條件／未滿足處置 | 已見本版對應與缺項 |
|---|---|---|
| KM01 如來神掌 | 讀過圖冊、領會、承載、真正可施展分開；轉變只沿角色特定來源，沒有就待核 | Grok rulai；Gemini art.buddha_palm_ultimate；不把圖冊持有當已練成 |
| KM02 獅吼功 | 基本發功與大鐘擴音變體分開；器具缺時是否可用基礎版依各核心 | Grok shihou；Gemini art.lion_roar_bell；音波≠一般掌擊，倍率不統一 |
| KM03 太極拳 | 取得教法、卸力技術、時機／對抗與當前可用分開；控制不足不自動內傷 | Grok taiji；Gemini art.true_taiji_circle；同名張無忌／包租公來源不可默認同套 |
| KM04 十二路譚腿 | 腿法熟練、承載、站立／距離與動作時序；腿法不直接等於走得快 | Grok tantui；Gemini art.tan_twelve_kicks；不要求新增獨立腿力 |
| KM05 洪家鐵線拳 | 拳法與配套器具；有鐵環不等已學會，無器具時的合法選項待核 | Grok tiexian；Gemini art.iron_wire_fist；原生palm分類保留 |
| KM06 五郎八卦棍 | 棍法、持有器械、長度／握持、熟練與執行分開；缺棍是否有替代由核心定 | Grok bagua原school=leg，不能據此當腿法；Gemini art.bagua_staff；異義標註而不修系統 |
| KM07 蛤蟆功 | 蓄力、突進、釋放與恢復描述；承載不足／疲累時的限制、取消與改善均待本版核實 | Grok hama；Gemini art.toad_missile_charge；北俠同名為另一規則體系 |
| KM08 琴音攻擊 | 器具、演奏／合奏、參與人與招式結果分開；缺一人／琴時能否單用待核 | Gemini art.harp_wave_blade／art.skeleton_soundwave；Grok此次未核到專項；不把宣傳招式名當電影正式全譜 |

所有條件沿[武學四類前提](MARTIAL_ART_PUBLIC_TEMPLATE_PROPOSAL.md#8-入門承載控制與特殊前提條件不足如何表達)：未有風險資料標未知，不造全力／減力模式、回饋倍率或保證改善途徑。金庸同名功法前提不能自動套電影版本。

## 3. 現成分支設定：可以先借哪些

只讀已提交快照，不運行／測試這些分支，也不宣稱已驗證整條行為。GPT本輪本機HEAD625255077e5628a9955d4a9e5035765e89f46034；Gemini bae43412dced2a2f0d9d82008d5cdf8b3acfb8f9；Grok 6db09fd97cac3d9a66cde49103978d7793317418。GPT前輪79c1665報告不覆蓋本輪HEAD；後兩者沿已發布固定版。原分支持續前進時由各agent回覆新HEAD差異。

| 來源 | 本輪核到的現成內容 | 用法／限制 |
|---|---|---|
| GPT solo-sect-gpt | 具名文字／檔名檢索未找到本組電影角色及立繪對應 | 標本輪未找到，不推定全repo永遠沒有；不要求補實作 |
| [Gemini persona-creation.mjs](https://github.com/lalagrass/earth-ascension/blob/bae43412dced2a2f0d9d82008d5cdf8b3acfb8f9/sect-chronicle/life/core/persona-creation.mjs) | ah_sing／landlady模板、portrait manifest、性情／自動政策與特殊效果描述；例如阿星bone8／comprehension6、包租婆bone8／comprehension7 | 原值只是本版設定。效果文案／條目存在不等於所有路徑可執行；不把先天、移速特效或督工加成整包帶入dev |
| [Gemini legends-v09.json](https://github.com/lalagrass/earth-ascension/blob/bae43412dced2a2f0d9d82008d5cdf8b3acfb8f9/sect-chronicle/life/data/legends-v09.json) | 本組8個archetype登錄及signatureMoves，含合奏群組與招式shape／phase等combatPhysics配置 | 登錄／配置不等可控角色或已整合行為。天殘地缺是一個登錄，公版研究需保留雙人語義；倍率／半徑是本版平衡 |
| [Grok hero-data.mjs](https://github.com/lalagrass/earth-ascension/blob/6db09fd97cac3d9a66cde49103978d7793317418/solo-sect/src/hero-data.mjs) | axing stats為wu1／gen1／li3／shen3／ding2／fu2、sealed、性情與價值、圖冊背景 | 與Gemini阿星量尺／窗口不同，不能平均。root／wu封鎖與覺醒行為須核當前核心，不能從這行直接倒推真先天 |
| [Grok wuxia.mjs](https://github.com/lalagrass/earth-ascension/blob/6db09fd97cac3d9a66cde49103978d7793317418/solo-sect/src/wuxia.mjs)、[jianghu.mjs](https://github.com/lalagrass/earth-ascension/blob/6db09fd97cac3d9a66cde49103978d7793317418/solo-sect/src/jianghu.mjs)、[data.mjs](https://github.com/lalagrass/earth-ascension/blob/6db09fd97cac3d9a66cde49103978d7793317418/solo-sect/src/data.mjs) | 包租公婆角色、三隱士揭露／授藝、反派事件及rulai／shihou／tantui／tiexian／bagua／hama／taiji定義 | 函式已存在是靜態證據，非本輪流程測試。大成後noGrow、夫妻加成、覺醒與勝敗規則皆屬本版；不改為公版電影真值 |

優先沿本repo已具名、可追SHA的角色／圖像作紙上樣本，避免重新搜尋拼湊各遊戲分數；外部來源補缺口，不替換原權威。三位agent只需對自己版本評最小轉接，不跨merge。

## 4. 已有立繪直接引用；缺圖保持空白

擁有人本輪授權研究文件取用已有分支立繪。下列七圖已查blob存在／PNG可解碼、480×640，並實看圖像；採Grok原assets/portraits根目錄版本，不以v2候選、post衍生或TOP評語冒充runtime已換。圖像是分支風格化造型，部分服裝／年齡不同電影，不當真人劇照或已核定最終公版造型。

**只在文件固定SHA引用，沒有複製到dev runtime、改各版載入或建立#339共用庫。** 原檔、作者與生成紀錄仍在來源分支；若GitHub私有圖片預覽受登入影響，可點來源檔。缺圖格、動作／phase與圖像授權不能從立繪存在推定。

| 人物 | 既有立繪預覽 | 固定來源／狀態 |
|---|---|---|
| 阿星 | <img src="https://github.com/lalagrass/earth-ascension/blob/edaf2ed60954808221447640efb79f0215dbc278/solo-sect/assets/portraits/v2/axing-v2b-a.png?raw=true" width="120" alt="阿星v2分支立繪"> | [Grok v2/axing-v2b-a.png](https://github.com/lalagrass/earth-ascension/blob/edaf2ed60954808221447640efb79f0215dbc278/solo-sect/assets/portraits/v2/axing-v2b-a.png)；864×1152；擁有人偏好的v2（鼻青臉腫比讚、手持秘笈）；v1 [axing.png](https://github.com/lalagrass/earth-ascension/blob/6db09fd97cac3d9a66cde49103978d7793317418/solo-sect/assets/portraits/axing.png)保留比對；仍非最終公版造型 |
| 包租婆 | <img src="https://github.com/lalagrass/earth-ascension/blob/6db09fd97cac3d9a66cde49103978d7793317418/solo-sect/assets/portraits/baozupo.png?raw=true" width="120" alt="包租婆既有分支立繪"> | [Grok baozupo.png](https://github.com/lalagrass/earth-ascension/blob/6db09fd97cac3d9a66cde49103978d7793317418/solo-sect/assets/portraits/baozupo.png)；480×640 |
| 包租公 | <img src="https://github.com/lalagrass/earth-ascension/blob/6db09fd97cac3d9a66cde49103978d7793317418/solo-sect/assets/portraits/baozugong.png?raw=true" width="120" alt="包租公既有分支立繪"> | [Grok baozugong.png](https://github.com/lalagrass/earth-ascension/blob/6db09fd97cac3d9a66cde49103978d7793317418/solo-sect/assets/portraits/baozugong.png)；480×640 |
| 苦力強 | <img src="https://github.com/lalagrass/earth-ascension/blob/6db09fd97cac3d9a66cde49103978d7793317418/solo-sect/assets/portraits/kulijiang.png?raw=true" width="120" alt="苦力強既有分支立繪"> | [Grok kulijiang.png](https://github.com/lalagrass/earth-ascension/blob/6db09fd97cac3d9a66cde49103978d7793317418/solo-sect/assets/portraits/kulijiang.png)；480×640 |
| 裁縫 | <img src="https://github.com/lalagrass/earth-ascension/blob/6db09fd97cac3d9a66cde49103978d7793317418/solo-sect/assets/portraits/caifeng.png?raw=true" width="120" alt="裁縫既有分支立繪"> | [Grok caifeng.png](https://github.com/lalagrass/earth-ascension/blob/6db09fd97cac3d9a66cde49103978d7793317418/solo-sect/assets/portraits/caifeng.png)；480×640 |
| 油炸鬼 | <img src="https://github.com/lalagrass/earth-ascension/blob/6db09fd97cac3d9a66cde49103978d7793317418/solo-sect/assets/portraits/youzhagui.png?raw=true" width="120" alt="油炸鬼既有分支立繪"> | [Grok youzhagui.png](https://github.com/lalagrass/earth-ascension/blob/6db09fd97cac3d9a66cde49103978d7793317418/solo-sect/assets/portraits/youzhagui.png)；480×640 |
| 火雲邪神 | <img src="https://github.com/lalagrass/earth-ascension/blob/6db09fd97cac3d9a66cde49103978d7793317418/solo-sect/assets/portraits/huoyunxieshen.png?raw=true" width="120" alt="火雲邪神既有分支立繪"> | [Grok huoyunxieshen.png](https://github.com/lalagrass/earth-ascension/blob/6db09fd97cac3d9a66cde49103978d7793317418/solo-sect/assets/portraits/huoyunxieshen.png)；480×640 |
| 天殘、地缺 |  | 待補；本輪三個快照未找到具名立繪對應，不以其他人物頂替 |

Gemini另有[阿星](https://github.com/lalagrass/earth-ascension/blob/bae43412dced2a2f0d9d82008d5cdf8b3acfb8f9/sect-chronicle/experiments/water-carry/demo/assets/portraits/ah_sing.png)／[包租婆](https://github.com/lalagrass/earth-ascension/blob/bae43412dced2a2f0d9d82008d5cdf8b3acfb8f9/sect-chronicle/experiments/water-carry/demo/assets/portraits/landlady.png)，已核檔名與manifest引用，未以這兩張取代Grok圖。兩版外觀各自保留，不建立同名自動覆蓋。

Grok來源[生成紀錄PROMPTS.md](https://github.com/lalagrass/earth-ascension/blob/6db09fd97cac3d9a66cde49103978d7793317418/solo-sect/assets/portraits/PROMPTS.md)稱使用Grok Bot GenerateImage、原創風格化／無真人肖像與無參考圖，模型精確版未量測；此為作者紀錄，不替七個blob逐一補造生成日期、種子或完整權利鏈。各圖具體prompt與授權缺項如實待核；不從repo公開或程式LICENSE推定電影人物／素材全已授權。

## 5. 社群／公開源碼是否已有整套設定

核對2026-10-26，搜尋Kung Fu Hustle／功夫人物、GitHub、MUGEN及既有金庸來源。**本輪未確認一份授權清楚、涵蓋整組電影人物的可直接匯入資料包**；不是斷言全網沒有。

| 來源／已核範圍 | 已有設定／可借用 | 授權／缺項與採用判斷 |
|---|---|---|
| [Sony官方簡介](https://www.sonypictures.com/movies/kungfuhustle)、[官方角色屏保頁](https://www.sonyclassics.com/kungfuhustle/screensavers/) | 官方角色身分與電影背景；沒有可用人物屬性表 | 研究引用；不下載／搬官方圖音，不當開源素材 |
| [小白_陳華的包租婆技能設計](https://www.magesbox.com/works/detail/id/27399)，2025-07-27作者作品頁 | 普通攻擊、突進與雙人鐘聲大招的視覺分工；符合將器具／參與者分開的方向 | 有作者原始設計，但未見明確開源重用授權；只摘要參考，不搬圖／動畫／傷害表 |
| [MUGENwiki火雲邪神](https://w.atwiki.jp/niconicomugen/pages/8485.html) | 社群列Borewood製作的Custom Kung Fu Hustle The Beast，提到蓄力突進、一般／boss模式 | 僅線索頁已核，作者包／README／程式／素材授權未核；不列已可直接套用，不下載或執行；數值不採 |
| [北俠UTF8固定蛤蟆功](https://github.com/ly19811105/pkuxkx-utf8/blob/0eaf237c9970795a51aa4cc04b5b762003300cbd/kungfu/skill/hamagong.c) | 實讀valid_learn、practice_skill、valid_enable、skill_improved：學習、運用、特定進階限制分開；可借條件分層 | 原碼有門派／內功相容等自訂限制，屬金庸MUD而非電影。根授權未確認，且部分條件分支順序有待審，不複製數字／程式或當已驗安全規則 |
| 原[金庸來源研究](JINYONG_COMMUNITY_REUSE_RESEARCH.md) | 已核的角色／武學資料形狀可沿用；例如同名太極／蛤蟆供異義反例 | 不把同名武學當電影角色整套設定；D資料不能補出本輪缺的電影先天值 |

電影配對參考另核[2004年人物報導](https://ent.sina.com.cn/2004-12-18/0149603025.html)與[場面報導](https://ent.sina.com.cn/m/c/2004-12-24/1339609364.html)；只作作品與演出參考，沒有全量逐鏡校勘或官方數值。報導／Wiki的招式命名、時間碼與主觀強弱不能當權威規則；不抄電影台詞、招式原文或劇照。傳統武術同名也不等電影特效。

## 6. 三方評估：追加一個案例即可

沿[三方prompt](CHARACTER_CARD_AGENT_PROMPTS.md)與舊#340報告，把本組當額外選樣池：原本每方最多三組合併案例／原碼至多兩門武學的上限保持，不在十二人之外再加一整套作業。優先用阿星前後、包租婆＋大鐘、苦力強腿法、天殘地缺合奏中一項替換舊案例。

回覆原ID／已提交HEAD、直接／近似／異義／缺項、先天vs當下、知識／所學／執行、器具／參與者與核心真phase；沒有就待補。立繪沿固定來源，可用的記用途／版本；天殘與地缺圖欄空白，不生成新圖／借他人臉。先評公版是否足夠，無需新增基礎屬性、共同核心／renderer或測試矩陣。只回#340，不改runtime／本版平衡、存檔、手機或既有工程。


## 7. MBTI v0.1另列，立繪與武學不隨型號改動

[電影候選型與原創語氣](CHARACTER_MBTI_CANDIDATES.md#4-功夫先放本作暫擬不冒充社群分析)已加入：七位單人先給P本PO暫擬，天殘／地缺兩人各留未定；不宣稱找到社群整組MBTI。K08a／b只為紙上子列，不改原群組ID或演奏規則。型號、覺醒前後能力、價值轉變分開，沿用既有立繪／缺圖，不生新圖、不授新效果。
