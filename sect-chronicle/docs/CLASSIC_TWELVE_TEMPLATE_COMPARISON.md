# 十二位經典角色與人物卡／武學模板紙上對照

狀態：2026-10-26，擁有人已確認用下列12人與對應武學作**紙上評估**，先檢查模板是否足夠；未授系統、數值、資料匯入或UI工程。主[#340](https://github.com/lalagrass/earth-ascension/issues/340)，文件PR #341。先前25人／19組及更多角色保留為備選，本輪評估清單以本文件為準。

## 1. 模板先審：保留架構，小幅補齊可選描述

檢查結論：既有稟賦／身體、技能、心性／價值、狀態、經歷及武學定義／所學／規則／呈現分工足夠，**不需要新增一套人物基本屬性或換引擎**。十二人暴露的缺口，主要是來源、粒度與依賴描述：

| 最小補充 | 為何需要 | 放哪裡／界限 |
|---|---|---|
| 參考作品版本、故事階段、研究caseId | 初學郭靖與成熟東方的數字不能當同齡出生測量 | 人物身份／provenance的可選資料；小說版本未校勘就待核，不造年齡 |
| 來源主張與授權範圍 | 上游自訂配置不等於原著；MIT不等於所有人物圖文的使用範圍均已核 | provenance區分原資料觀察／敘事參考／本作假設，另附licenseScope／引用與對應狀態 |
| 知識、領會、能否執行分開 | 王語嫣識招、程靈素醫毒，不能強塞攻擊熟練 | 既有skill的領域／用途與availability；無攻擊資料用不適用／未核，不補0 |
| 條目粒度與合用依賴 | 葵花是體系；互搏是學法；素心合用還有組件與參與方式 | 武學模板entryKind／domain、組件／參與方式；先描述，不執行條件圖 |
| 器具、材料與耗用 | 銀針、毒術、配製有資源前提 | 既有curriculum／current execution補資源角色；未知不造毒物、數量、配方或傷害 |

[人物卡補充](CHARACTER_CARD_PUBLIC_PROPOSAL.md#9-十二人適配審查與最小補充)與[武學補充](MARTIAL_ART_PUBLIC_TEMPLATE_PROPOSAL.md#9-十二人適配條目粒度合用與資源)已同步。這是模板設計修訂，不是新存檔／可執行schema版本。已有同義欄位就沿用，不再建一份會漂移的數值。

## 2. 來源、授權與已知程度

| 代碼 | 來源／版本 | 可主張什麼／授權範圍 |
|---|---|---|
| D／L-D | sdd330/jy-skill固定279943579adef35b0427cf5c5e540b0ce72dd9fe；[角色目錄](https://github.com/sdd330/jy-skill/tree/279943579adef35b0427cf5c5e540b0ce72dd9fe/assets/characters)、[skills表](https://github.com/sdd330/jy-skill/blob/279943579adef35b0427cf5c5e540b0ce72dd9fe/assets/skills.json)、[MIT](https://github.com/sdd330/jy-skill/blob/279943579adef35b0427cf5c5e540b0ce72dd9fe/LICENSE) | 本輪逐讀12個角色與skills表，能確認原始配置／ID引用。MIT文本已核，取用可授權程式／資料時須保留聲明；小說IP、人物圖／音像等另核，本輪未匯入 |
| N | 金庸作品的敘事參考＋選定研究窗口；具體小說版次／章節未全面校勘 | 用自行概述的角色／武學作對照，不當官方數值、完整版原著設定或圖文素材許可；不摘錄小說段落 |
| P | 擁有人選定12人與本PO紙上角色窗口、差異問題、機制假設 | 只代表本作研究選擇，不改原著，不是本作已授權runtime；精確門檻、效果／機率未定 |
| B | 原三版固定盤點GPT79c1665（本機）、Gemini bae4341、Grok6db09fd及既有#340報告 | 只供既有欄位／規則對照；本輪未重掃最新HEAD，不與D拼成同一角色狀態。後續各agent以自己當前已提交HEAD報差異 |
| 其他公開碼庫 | jynew、kys-cpp、北俠及社群Wiki，詳[來源研究](JINYONG_COMMUNITY_REUSE_RESEARCH.md) | 僅借分層與設計；其授權差異／未確認項保持，不當本輪資料匯入來源 |

**十二個D角色均未提供本輪要用的明確小說版次／故事階段、完整人格／價值權重或隱藏分支資料。** 原iq、attack、maxMp等也沒有可直接當出生根骨／本作理悟的證明。已讀原值不等於玩家可見或語義可直映，不能為湊表反推。

圖像方面，pic／modelKey只證明引用欄位；本輪沒有核人物原圖、圖格／rig、phase動作或其授權。十二人素材皆列待核，不以可讀JSON宣稱已拿到立繪／動畫。

## 3. 十二人：固定研究窗口與公版卡片對照

本輪不做強弱排行、不新增先天分數。以下故事窗口是P設定，用於控制比較；不是D資料已有的階段。根骨、原悟性、身體初始值均維持待核；已有所學不得倒填先天。同一人物前後變化另附事件／第二片段，不靠名字重生另一人。

| case／角色 | 固定研究窗口 | 人物卡想呈現的差異 | 對應條目 | 來源／主要缺項 |
|---|---|---|---|---|
| C01 郭靖 | 初受洪七公教掌的研究窗口 | 守一／持續投入是性情假設；理解、掌法熟練與當前承載分開 | W01 | D角色#5＋N／P；階段未標；上游所學與本輪降龍配對不同，先天／控制與低強度練習待核 |
| C02 令狐沖 | 思過崖受教九劍後的初學窗口 | 理悟／觀變與自由性情分開；高理解不免除器械、熟練與時機 | W02 | D角色#4＋N／P；九劍有引用但完整九式、教法、故事階段與真控制效果未核 |
| C03 東方不敗 | 黑木崖成熟施展窗口 | 成熟所學與精密控制；牽掛／志向不倒填天賦 | W03 | D角色#14＋N／P；上游所學為吸星；不能據姓名自動換成葵花，特殊前提與先天值待核 |
| C04 小龍女 | 已習左右互搏、可研究合用劍法的窗口 | 內向／專注與深厚關係可共存；個人所學和合用資格分開 | W04／W05／W06 | D角色#9＋N／P；上游列黯然／凌波；玉女劍與合用資料缺，互搏旗標與技能引用分別核 |
| C05 李莫愁 | 毒掌、銀針已成名的窗口 | 情緒牽掛、掌法／暗器控制、毒物知識分開 | W07／W08 | D角色#28＋N／P；僅通用毒術引用，不等於完整毒掌／銀針；配製、耗材與反噬未核 |
| C06 黃蓉 | 已有桃花島基礎、初受打狗棒教法的窗口 | 機變、知識、實作與生活技藝；價值觀不等於聰明程度 | W09／W18 | D角色#8＋N／P；上游所學為空明／醫療；打狗條目存在卻不在本檔引用，生活技藝待分支核 |
| C07 阿紫 | 星宿學藝後、觀察毒術與器具使用的窗口 | 毒術技能、冒險偏好、準備資源及使用目的分開 | W10 | D角色#25＋N／P；僅通用毒術，不當已精通星宿全部功法；化功／版本、暗器專名與耗材未核 |
| C08 王語嫣 | 已積累典籍知識、未以親身實戰為主的窗口 | 知識／識招與身體執行分離；強記只列候選 | W11 | D角色#18＋N／P；本檔無武學引用不等於知識0；文獻範圍、記識天賦與版本待核 |
| C09 程靈素 | 已有醫毒傳承、以診治配製作比較的窗口 | 知識、觀察、醫毒技巧、關懷動機分離 | W12 | D角色#69＋N／P；上游作品標雪山飛狐，與本輪飛狐外傳參考不同；配方、條件與材料細節未核 |
| C10 虛竹 | 已受逍遙傳承、習得相關手法後的窗口 | 所得內力、掌握技巧、意願與控制分開；不回填出生根骨 | W13／W14 | D角色#3＋N／P；上游列六陽掌／小無相，不是本輪折梅／生死符；傳功前後與具體控制未核 |
| C11 周伯通 | 已創空明、互搏的成熟窗口 | 玩心與高投入可共存；分心學法不是通用低悟性獎勵 | W15／W05 | D角色#16＋N／P；條目有引用；實際分心協調、左右手與所學來源未核，青年先天未知 |
| C12 段譽 | 初學六脈尚不穩、已有步法的研究窗口 | 功力、控制、步理與練武意願分離 | W16／W17 | D角色#1＋N／P；武學引用存在不證明初學階段或施展穩定；內功來源／強度與回退未核 |

四組優先成對走查：小龍女／李莫愁（同門而所學／性情不同）；黃蓉／王語嫣（知識與實作）；阿紫／程靈素（相近技術領域、目的與用途不同）；小龍女／周伯通（同學法、不同性情）。其餘郭靖／令狐沖／東方與段譽／虛竹作學法、承載／控制及傳承反例。每方不必重做12×全部屬性。

## 4. 上游原樣引用盤點：不是自動採用的人物本領

以下只列D角色檔的skills陣列，等級保留原量尺。欄位標記如ambidextrous、其他能力、劇情可能另有含義；不因未列ID就斷言整個上游沒有該能力，也不臆造引用。此表不是原著考據結論。

| case／固定原檔 | 原始所學ID解析 | 原source欄／授權狀態 |
|---|---|---|
| C01／[D角色#5](https://github.com/sdd330/jy-skill/blob/279943579adef35b0427cf5c5e540b0ce72dd9fe/assets/characters/5.json) | #12 九阴真经@2、#13 九阳神功@2、#14 空明拳@1 | 射雕英雄传；L-D／N／P分開 |
| C02／[D角色#4](https://github.com/sdd330/jy-skill/blob/279943579adef35b0427cf5c5e540b0ce72dd9fe/assets/characters/4.json) | #10 独孤九剑@3、#11 紫霞神功@2 | 笑傲江湖；L-D／N／P分開 |
| C03／[D角色#14](https://github.com/sdd330/jy-skill/blob/279943579adef35b0427cf5c5e540b0ce72dd9fe/assets/characters/14.json) | #96 吸星大法@5 | 笑傲江湖；L-D／N／P分開 |
| C04／[D角色#9](https://github.com/sdd330/jy-skill/blob/279943579adef35b0427cf5c5e540b0ce72dd9fe/assets/characters/9.json) | #15 黯然销魂掌@2、#5 凌波微步@3 | 神雕侠侣；L-D／N／P分開 |
| C05／[D角色#28](https://github.com/sdd330/jy-skill/blob/279943579adef35b0427cf5c5e540b0ce72dd9fe/assets/characters/28.json) | #51 用毒术@3 | 神雕侠侣；L-D／N／P分開 |
| C06／[D角色#8](https://github.com/sdd330/jy-skill/blob/279943579adef35b0427cf5c5e540b0ce72dd9fe/assets/characters/8.json) | #14 空明拳@1、#50 医疗术@2 | 射雕英雄传；L-D／N／P分開 |
| C07／[D角色#25](https://github.com/sdd330/jy-skill/blob/279943579adef35b0427cf5c5e540b0ce72dd9fe/assets/characters/25.json) | #51 用毒术@2 | 天龙八部；L-D／N／P分開 |
| C08／[D角色#18](https://github.com/sdd330/jy-skill/blob/279943579adef35b0427cf5c5e540b0ce72dd9fe/assets/characters/18.json) | 空陣列（非知識0） | 天龙八部；L-D／N／P分開 |
| C09／[D角色#69](https://github.com/sdd330/jy-skill/blob/279943579adef35b0427cf5c5e540b0ce72dd9fe/assets/characters/69.json) | #50 医疗术@3、#51 用毒术@4、#52 解毒术@3 | 雪山飞狐；L-D／N／P分開 |
| C10／[D角色#3](https://github.com/sdd330/jy-skill/blob/279943579adef35b0427cf5c5e540b0ce72dd9fe/assets/characters/3.json) | #8 天山六阳掌@2、#9 小无相功@2 | 天龙八部；L-D／N／P分開 |
| C11／[D角色#16](https://github.com/sdd330/jy-skill/blob/279943579adef35b0427cf5c5e540b0ce72dd9fe/assets/characters/16.json) | #14 空明拳@4、#98 双手互搏@4 | 射雕英雄传；L-D／N／P分開 |
| C12／[D角色#1](https://github.com/sdd330/jy-skill/blob/279943579adef35b0427cf5c5e540b0ce72dd9fe/assets/characters/1.json) | #3 六脉神剑@1、#4 北冥神功@1、#5 凌波微步@1 | 天龙八部；L-D／N／P分開 |

**重要結果：12個角色檔都能找到，不代表12個配對都符合本輪研究。** 郭靖原檔未列降龍、東方列吸星、小龍女列黯然／凌波、黃蓉列空明／醫療、虛竹的六陽不是折梅，均與本輪選定對照不同；保留原觀察，列不符／近似／待核，不替上游改檔、不自動換ID。空skills也不等於王語嫣無知。

程靈素的D source是「雪山飛狐」；本輪N參考為《飛狐外傳》，兩者明確分開。可參照[角色概述](https://zh.wikipedia.org/wiki/程灵素)，但仍未完成逐版原著校勘。

因此D目前降為**資料形狀與選擇性樣本來源**，不建議全量匯成經典人物真值；前次研究的MIT候選資格，不等於內容已通過本輪配對驗證。

## 5. 十八個對應條目：武學、學法、合用、知識與生活分開

W01–W18是本文件的研究標號，**不是新runtime artId**。D#n指上述固定skills表原ID；「表缺專項」只限本輪已讀範圍，不宣稱整個repo／物品／劇情不存在。

每條都以N／P作研究配對，以D作來源對照；授權沿L-D／N／P說明，未拿到專用素材或原著圖文授權。四類條件（入門／理解、承載、控制、特殊前提）的不足後果與改善沿[武學模板第8節](MARTIAL_ART_PUBLIC_TEMPLATE_PROPOSAL.md#8-入門承載控制與特殊前提條件不足如何表達)，本表不新增門檻或反噬公式。

| 研究條目 | 粒度／領域；角色 | D可對應／缺項 | 條件與資料分工重點 | 不足／風險與缺項邊界 |
|---|---|---|---|---|
| W01 降龍十八掌 | 技藝／戰鬥；C01 | D#6 | 師承、掌法、勁力／內息承載與收放；低強度可否練須分支證據 | 低悟性不是通用門檻；控制、強度、風險與完整招式未核 |
| W02 獨孤九劍 | 技藝／戰鬥；C02 | D#10 | 劍術與教法、觀變、時機／距離；招理領會不等於每次截擊成功 | 高悟性不自動破解一切；完整九式／對抗機制各版不同 |
| W03 葵花寶典 | 體系／戰鬥；C03 | D#91 | 配套功法／技術的體系；特殊前提與完整運使分開 | 條目名不等於整套功法完備；特殊代價／條件與安全路徑未核 |
| W04 玉女劍法 | 技藝／戰鬥；C04 | 本輪skills表缺專項 | 教法、劍術、精密控制、真器械 | 不可用上游黯然／凌波替代；同名資料權威待核 |
| W05 左右互搏 | 技藝／戰鬥；C04／C11 | D#98；另有ambidextrous欄 | 特殊分心協調學法；已有兩路所學與能否合用另核 | 旗標不等於完整技巧，技能引用也不證明真雙手執行；不綁某人格 |
| W06 玉女素心劍法合用 | 組合／戰鬥；C04 | 本輪skills表缺專項 | 引用玉女／全真等組件與參與角色；雙人／單人互搏兩種方式分開 | 全真組件另需來源；不因高好感、男女／情侶身份或互搏旗標自動成立 |
| W07 赤練神掌 | 技藝／戰鬥；C05 | 無專項；D#51僅通用毒術 | 掌法／毒性運用；與解法知識、毒物狀態分開 | 五毒神掌等名稱涉及版本／別名待核，不直接合併 |
| W08 冰魄銀針運用 | 技藝／戰鬥；C05 | 本輪skills表缺專項 | 暗器手法、準備與耗材、命中／毒性效果分離 | 本輪未核items表／器物來源；不把知道毒方等於手上有針 |
| W09 打狗棒法 | 技藝／戰鬥；C06 | D#7 | 教法、棍術、變化、器械與距離 | 目錄有條目不等於黃蓉個人已學；不沿降龍同一強度門檻 |
| W10 毒術／暗器運用 | 技藝／戰鬥＋知識；C07 | D#51僅毒術；hiddenWeapon為能力欄 | 技術、毒物知識、器具／消耗與行事目的分開 | 是研究能力群，不冒稱一門原著絕學；化功大法不自動列阿紫已學 |
| W11 識譜／辨招 | 技藝／知識；C08 | martialKnowledge欄；無專用招式 | 已讀知識、辨認與可提供資訊；如實標知識適用範圍 | 不填傷害0或全武學熟練100；可出招為不適用／未核，非永久不能學 |
| W12 醫藥／辨毒／解毒／配製 | 技藝／知識＋生活；C09 | D#50／51／52部分對照 | 知識、診察、技術、配方、材料與對象狀態分開 | 醫療條目不證明診治全流程；不移植瞬間回滿／清傷公式 |
| W13 天山折梅手 | 技藝／戰鬥；C10 | 本輪skills表缺專項 | 傳承、融會、已學手法與控制 | D#8天山六陽掌不是同名同技，不偷換 |
| W14 生死符 | 技藝／戰鬥；C10 | 本輪skills表缺專項 | 特殊手法、內力運使、材料／條件與效果 | 傳功不等於精通手法；器材、解除、風險均待核，不補執行細節 |
| W15 空明拳 | 技藝／戰鬥；C11 | D#14 | 拳法理解、技巧／柔勁與實際所學 | 不以頑皮判定低定力；源碼能力效果未驗 |
| W16 凌波微步 | 技藝／戰鬥＋生活移動；C12 | D#5 | 步理理解、實際協調／步法、精力與移動結果 | 基礎身法、跑速、輕功是不同資料；特效不送權威位移 |
| W17 六脈神劍 | 技藝／戰鬥；C12 | D#3 | 教法、內息承載、控制與當次能否施展 | 高內力或已學不代表次次穩定；精確門檻／代價不採上游常數 |
| W18 烹飪等生活技藝 | 技藝／生活；C06 | 本輪sdd角色／skills表未表達 | 既有生活技能、材料、實際製作與結果 | 不是戰鬥武學，不能硬填出招／傷害；Grok烹飪需另綁自己的固定來源 |

W11、W12、W18可由人物卡跨域技藝區引用，不為湊「武學數量」塞進攻擊清單。W05是可研究的學法／技藝，W06是組件合用，不能直接給所有攻擊雙倍；W03不當單一招式。修正「武學」一詞的粒度，比再加十個人物數值更能處理本輪差異。

## 6. 用既有模板填一個欄位，而不是把源資料照搬

| 上游／研究資料 | 公版歸屬 | 直映判斷 |
|---|---|---|
| 姓名、原ID、作品source | identity／provenance，加本輪case與窗口 | 可保留原資料；本輪窗口屬P，不寫成D原值 |
| iq、morality | 原量尺欄位及原義待核 | 不直接變本作理悟、性情／六價值；不從道德推人格 |
| maxHp／maxMp、attack／agility | 資源上限或身體／派生能力，依原版真用途 | 不反推出生根骨／悟性，也不把原攻擊力當通用力量 |
| skill ID／原等級 | actor-art binding／native progress | 先核配對與量尺；只因同名不能合GPT U/F/I或Grok xp |
| martialKnowledge、醫毒能力 | skill的知識／生活用途與availability | 可作已知原值；是否具體涵蓋某招／某病仍待核 |
| 人格、價值、隱藏支系 | persona／values／traits | 原檔缺就缺；本輪描述是P假設，不假裝上游已提供權重 |
| 參與者、左右手、器具／耗材 | 武學合用依賴與current execution | 未核就不給可施展；不從高好感、性別或持有圖像判成立 |
| 動作與圖像欄 | presentationRef／素材來源 | 字串不是已交圖格；未核權利與相容族就缺項 |

## 7. 紙上接受準則與三方差異評估

文件完成線：12人固定窗口與來源齊、18條目各有引用／缺項、模板適配補充與授權範圍一致；**不是12人／18條目已實裝**。不要求每人新增同一組數值或隱藏天賦，也不把所有門檻改成軟限制。

各agent在#340具名回覆，以自己最新已提交HEAD為準，沿用舊報告：最多三組有代表性的合併案例，不重做完整研究。推薦從四組成對反例選兩組，再用本版已有一門武學說清理解／承載／控制／特殊前提；缺角色／功法就寫未實作，不建立。至少標明：
- 原欄位／規則來源與真用途，何者為上游觀察、本輪假設或待核。
- 可直映／近似／異義／缺項／配對不符；條目存在、角色已學、能合用、能安全施展分開。
- 不足效果／風險與改善是否原版真有，無資料不說安全、不補機率。
- 若未來接公版，最小adapter與內容修正成本；不用新存檔／通用規則引擎當前置。

只做紙上走查，不跑12×18矩陣、遊戲／瀏覽器或新seed。提示詞由擁有人手動貼，未代送／啟動；三版既有工程不受阻，保存升版／手機最後，單一正式生活入口保持。研究結果再由PO集中確認首批欄位與工程，不因本文件更新授權移植。


## 8. 追加《功夫》樣本

擁有人另確認加入電影特色人物與武學，見[電影八案例／九人、八類主武學及既有立繪](KUNGFU_HUSTLE_TEMPLATE_COMPARISON.md)。原C01–C12／W01–W18與上游逐檔觀察保留，不把電影人物硬塞入D金庸資料或改原研究號。K／KM為另一組紙上標記，三方可選一個替換既有案例，整份報告仍最多三組／原碼至多兩門；不追加全矩陣或實作。


## 9. MBTI候選與仙俠補充

十二人已補[MBTI v0.1](CHARACTER_MBTI_CANDIDATES.md#3-十二人先放一版)：型號僅候選摘要，S社群標示與P暫擬／原創語氣分開，不改C／W研究號、先天、所學或既有規則。李莫愁／程靈素缺已核分類則暫擬並明標，不冒充社群共識；同型不強行拉開數字。另見[仙俠欄位研究](XIANXIA_ATTRIBUTE_CANDIDATES.md)，所有新增稟賦／資源／狀態仍待選，沒有追溯填經典角色靈根、神識或新公式。

## Grok v2立繪補充（2026-10-26，非最終）

擁有人偏好Grok v2立繪。下列只以固定SHA引用 `codex/solo-sect-grok` 的PNG，沒有複製到dev、沒有改各版載入或建立#339共用庫，也未接入Grok runtime切換。

| 人物 | v2立繪預覽 | 固定來源／狀態 |
|---|---|---|
| 黃蓉 | <img src="https://github.com/lalagrass/earth-ascension/blob/edaf2ed60954808221447640efb79f0215dbc278/solo-sect/assets/portraits/v2/huangrong-v2-ref.png?raw=true" width="120" alt="黃蓉v2分支立繪"> | [Grok v2/huangrong-v2-ref.png](https://github.com/lalagrass/earth-ascension/blob/edaf2ed60954808221447640efb79f0215dbc278/solo-sect/assets/portraits/v2/huangrong-v2-ref.png)；864×1152；既有v2女性風格基準（啃雞腿），俏皮機靈 |
| 小龍女 | <img src="https://github.com/lalagrass/earth-ascension/blob/edaf2ed60954808221447640efb79f0215dbc278/solo-sect/assets/portraits/v2/xiaolongnv-v2-b.png?raw=true" width="120" alt="小龍女v2分支立繪"> | [Grok v2/xiaolongnv-v2-b.png](https://github.com/lalagrass/earth-ascension/blob/edaf2ed60954808221447640efb79f0215dbc278/solo-sect/assets/portraits/v2/xiaolongnv-v2-b.png)；480×640；本輪選定；清冷出塵、平靜無笑；白衣、白綾、玉蜂；候選a [xiaolongnv-v2-a.png](https://github.com/lalagrass/earth-ascension/blob/edaf2ed60954808221447640efb79f0215dbc278/solo-sect/assets/portraits/v2/xiaolongnv-v2-a.png) |
| 李莫愁 | <img src="https://github.com/lalagrass/earth-ascension/blob/edaf2ed60954808221447640efb79f0215dbc278/solo-sect/assets/portraits/v2/limochou-v2-a.png?raw=true" width="120" alt="李莫愁v2分支立繪"> | [Grok v2/limochou-v2-a.png](https://github.com/lalagrass/earth-ascension/blob/edaf2ed60954808221447640efb79f0215dbc278/solo-sect/assets/portraits/v2/limochou-v2-a.png)；480×640；本輪選定；高傲淒厲帶恨；杏黃道袍、拂塵、捏碎紅花；本版無遊戲角色，只是美術；候選b [limochou-v2-b.png](https://github.com/lalagrass/earth-ascension/blob/edaf2ed60954808221447640efb79f0215dbc278/solo-sect/assets/portraits/v2/limochou-v2-b.png) |
| 東方不敗 | <img src="https://github.com/lalagrass/earth-ascension/blob/edaf2ed60954808221447640efb79f0215dbc278/solo-sect/assets/portraits/v2/dongfangbubai-v2-a.png?raw=true" width="120" alt="東方不敗v2分支立繪"> | [Grok v2/dongfangbubai-v2-a.png](https://github.com/lalagrass/earth-ascension/blob/edaf2ed60954808221447640efb79f0215dbc278/solo-sect/assets/portraits/v2/dongfangbubai-v2-a.png)；480×640；本輪選定；陰柔危險；紅袍、繡花針與紅線；inkpretty為核准例外；候選b [dongfangbubai-v2-b.png](https://github.com/lalagrass/earth-ascension/blob/edaf2ed60954808221447640efb79f0215dbc278/solo-sect/assets/portraits/v2/dongfangbubai-v2-b.png) |

來源：Grok Bot以GenerateImage於2026-10-26生成，風格style2-inkpretty（女性與東方不敗；男性另用wcaricature），以 `v2/huangrong-v2-ref.png` 為風格參考圖。個別情緒依人物性格決定，不統一為俏皮：小龍女清冷出塵、李莫愁高傲淒厲帶恨、東方不敗陰柔危險。規則：不吐舌、不媚眼、不作嬌羞姿態，不仿任何真人演員臉。電影／小說人物權利、模型版本與種子未記，仍待#339核；不是最終公版造型。

### 新舊對照、人物卡預覽與權限（審閱用）

預覽圖放在 `docs/assets/portrait-preview-grok/`，是 PIL 合成的靜態審閱圖，**不是 runtime 素材**。人物卡畫面標「示意」，只顯示立繪、姓名和 actorId，不含任何數值或隱藏欄位。

| 人物 | actorId（solo-sect src） | 替換原因 | 素材來源 | 使用權限 | 對照／卡片預覽 |
|---|---|---|---|---|---|
| 阿星 | `axing`（hero-data.mjs:34） | 擁有人偏好 v2：比讚和秘笈比 v1 更具辨識度，且不仿演員臉 | Grok Bot GenerateImage，2026-10-25 生成（commit 0aa722d）；風格 wcaricature；提示與參考見 solo-sect/assets/portraits/PROMPTS.md；以 edaf2ed 固定引用 | 見下方權限說明 | [對照](assets/portrait-preview-grok/axing-compare.png)／[卡](assets/portrait-preview-grok/axing-card.png) |
| 黃蓉 | `huangrong`（hero-data.mjs:38） | v2 啃雞腿為女性風格基準 | GenerateImage 2026-10-25（0aa722d）；inkpretty（本圖即風格參考，見 PROMPTS.md）；以 edaf2ed 固定引用 | 同上 | [對照](assets/portrait-preview-grok/huangrong-compare.png)／[卡](assets/portrait-preview-grok/huangrong-card.png) |
| 小龍女 | `xiaolongnv`（wuxia.mjs:33） | v1 偏中性；v2 依女性 inkpretty 規則，清冷出塵 | GenerateImage 2026-10-26；inkpretty；參考 huangrong-v2-ref；edaf2ed | 同上 | [對照](assets/portrait-preview-grok/xiaolongnv-compare.png)／[卡](assets/portrait-preview-grok/xiaolongnv-card.png) |
| 東方不敗 | `dongfangbubai`（sect-data.mjs:6、data.mjs:435） | 統一 inkpretty（核准例外），陰柔危險 | 同上 | 同上 | [對照](assets/portrait-preview-grok/dongfangbubai-compare.png)／[卡](assets/portrait-preview-grok/dongfangbubai-card.png) |
| 李莫愁 | 未建角（建議 `limochou`） | 新增，無舊圖；高傲淒厲帶恨 | 同上 | 同上 | [對照](assets/portrait-preview-grok/limochou-compare.png)／[卡](assets/portrait-preview-grok/limochou-card.png) |

**權限說明**：
- 這些圖是 AI 生成的，**沒有核對過任何第三方權利**。
- 模型與條款以影像生成服務為準，模型版本和種子沒有記錄。
- 原著人物屬於各小說或電影的權利人。
- 目前只供本機個人研究使用，**不宣稱任何授權**。
- provenance 和 BRIEF 例外待 #339 確認。
