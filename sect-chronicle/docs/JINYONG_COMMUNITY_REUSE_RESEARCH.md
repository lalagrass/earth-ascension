# 金庸人物／武學社群與公開源碼：可重用內容研究

核對：2026-10-26。主[#340](https://github.com/lalagrass/earth-ascension/issues/340)，文件PR #341。擁有人要求搜尋既有人物、武學與遊戲設定，評估能直接套用什麼。本輪只研究／記錄，不安裝、匯入程式／角色資料／素材、不改三分支或公版規則，未替作者聯絡授權。

## 1. 結論與採用順序

**有現成資料與成熟設計可以省工，但未找到一包可直接放進本作、同時解決生活AI、心性、隱藏分支與即時武學的完整通用模組。**

1. **先套用到設計的分類**：基本功／特殊武學分開；讀書、拜師、自練、切磋、領悟、修內功是不同活動；取得、理解、當前資源、施展與突破分開判斷。
2. **優先的小型轉接候選**：sdd330/jy-skill的JSON角色／武學目錄與TypeScript型別。技術棧接近，但需另授工程、保留授權／來源並核內容，不安裝其agent skill或整套回合制系統。
3. **先參考、不整包複製**：jynew配置管線、kys-cpp條件／人物所學結構、北俠LPC技能生命週期。原碼、資源的使用範圍有待核項，且引擎不同。
4. **社群表格只作版本化對照**：MUD官方Wiki、金庸S等MOD攻略。不把其中的門檻、陰陽、道德或左右互搏設定直接升格為原著或本作規則。

這些是PO研究建議，不代表新增數值或批准移植。最值得先取的是**欄位與判斷的分工、小量可核樣本**，而非全部數值與素材。

## 2. 本輪實際核讀來源

| 來源 | 固定版本／資料範圍 | 可用方式 |
|---|---|---|
| [sdd330/jy-skill](https://github.com/sdd330/jy-skill) | 279943579adef35b0427cf5c5e540b0ce72dd9fe；package 0.7.0；LICENSE、角色index及抽樣、skills／templates、game-types／game-engine／game-logic | 靜態目錄、型別與小型adapter首選候選；不是完整生活引擎 |
| [jynew/jynew](https://github.com/jynew/jynew) | 773f3e76492f4af277e8c93ced2c8d18ba516f6c；README、LICENSE／社區協議、JYX2 Configs說明與目錄 | 配置／生成管線與事件傳授設計參考；實際範圍授權需核 |
| [scarsty/kys-cpp](https://github.com/scarsty/kys-cpp) | 357feee2b2d4fc2dbcbe1a1e6560bd4cdb1bc594；README、LICENSE、src/Types.h／Types.cpp | 角色與武學分離、帶方向的門檻及內力類型等條件表達參考 |
| [北俠UTF-8公開源碼](https://github.com/ly19811105/pkuxkx-utf8) | 0eaf237c9970795a51aa4cc04b5b762003300cbd；README、技能／指令目錄、九劍／降龍／葵花技能檔 | 不同活動的准入／消耗／出招分工參考；根授權未確認 |
| [北大俠客行技能Wiki](https://wiki.pkuxkx.net/wiki/newbie/skill)／[日月神教頁](https://wiki.pkuxkx.net/wiki/menpai/riyue) | 本次讀取的主站社群文件，非上述歷史碼庫的同版本證明 | 學習活動、補教法與內功風險的設計樣例 |
| [金庸S正傳1.41攻略](https://game.ali213.net/forum.php?action=printable&mod=viewthread&tid=6267179) | 游俠論壇2017版攻略及討論，不是DOS原版／全部MOD通則 | 比較低／高資路線、內力上限層次、角色特效與選路後果 |

以上均為唯讀核對，不曾啟動／驗收外部遊戲。README功能數、目錄實數與執行規則分開看；不能拿倉庫更新日期代替功能驗證。

## 3. 最接近直接轉接的候選：jy-skill

### 3.1 已核內容

[角色資料目錄](https://github.com/sdd330/jy-skill/tree/279943579adef35b0427cf5c5e540b0ce72dd9fe/assets/characters)有116份編號JSON及index；[武學資料](https://github.com/sdd330/jy-skill/blob/279943579adef35b0427cf5c5e540b0ce72dd9fe/assets/skills.json)實際有33項，包含基礎武功。README稱25種武功，不能直接拿宣傳數當當前實數；角色檔也含一般敵人／自訂資料，不宣稱116份全是可直接使用的經典人物模板。

已抽樣郭靖、令狐沖、段譽；角色保存ID、作品來源、能力、所學武學ID／等級，武學另存ID、名稱、消耗、階段數值與演出標記。資料確實分開，適合做公版投影對照。

[NpcCard等型別](https://github.com/sdd330/jy-skill/blob/279943579adef35b0427cf5c5e540b0ce72dd9fe/scripts/game-types.ts)另列persona描述／喜惡、可教內容與教學條件；這是資訊架構參考，不是已驗證的完整人格模型或隱藏天賦樹。

### 3.2 可直接借用的設計與需要改寫的地方

| 上游內容 | 公版接法建議 | 邊界 |
|---|---|---|
| characters/index＋獨立角色JSON | actor/template穩定ID＋來源作品＋能力與已學分開 | 原數字可能混起始／成熟能力，不貼先天標籤 |
| skills目錄＋角色skills的ID／等級引用 | 武學定義與個人所學分離 | 本版等級不換成GPT U/F/I，也不混其他分支同名ID |
| 型別中的persona／likes／dislikes | 心性面板的可選敘事／偏好欄 | 沒有就未知；不是六價值權重／MBTI的直接替代 |
| canTeach＋teach conditions | 接觸／傳授機會獨立於練習、施展 | 型別／提示存在不代表底層授予函式每次都檢查 |
| animation字串 | 呈現模板的引用候選 | 只是標記，未提供本作可用水彩圖格或真phase |

[game-engine.ts](https://github.com/sdd330/jy-skill/blob/279943579adef35b0427cf5c5e540b0ce72dd9fe/scripts/game-engine.ts)會產生教師條件提示；但learnSkill本身核存在／已學等，再寫入狀態，沒有在該函式內重做全部教師條件。**不能把裸寫入API直接當本作的完整授權入口。** 其休息可即時回滿並清理多種狀態，也與本作可暫停即時生活不同，不列直接移植。

抽樣另見郭靖原檔所學ID會指向九陰、九陽、空明等；這是該作者資料配置，不能當原著／本作階段真值。角色武學配對與基線需挑少量核對，不因JSON齊全就全量採納。

### 3.3 授權與成本

[LICENSE](https://github.com/sdd330/jy-skill/blob/279943579adef35b0427cf5c5e540b0ce72dd9fe/LICENSE)為MIT。若未來取用其可授權程式／資料，需保留相應聲明；小說人物／素材的權利範圍仍分開核，不將MIT等同金庸IP整體使用已解決。本輪沒有複製進遊戲或安裝agent skill。

成本估計：**靜態對照小；只讀adapter小至中；完整移植不推薦。** 原因是既有核心與進度模型不同，不是缺一個npm套件。

## 4. 成長與風險最值得參考：北俠MUD

### 4.1 學習不只有一個經驗條

[技能Wiki](https://wiki.pkuxkx.net/wiki/newbie/skill)分讀書、拜師、練習、切磋、內功修煉與領悟；不同活動有基礎、師長或其他要求。可借「學習方式對應不同資料」與基本功／特殊武學的分工，適合放回道館的教學、演武、靜室與日常循環。不要搬其長期線上遊戲的潛能倍率與巨大經驗門檻。

### 4.2 源碼也把學習、練習、施展分開

本次讀的[降龍技能檔](https://github.com/ly19811105/pkuxkx-utf8/blob/0eaf237c9970795a51aa4cc04b5b762003300cbd/kungfu/skill/xianglong-zhang.c)分valid_learn、practice_skill與動作／特殊招式；學習檢查空手、配套內功、最大內力，練習另核當前資源並扣耗。[九劍技能檔](https://github.com/ly19811105/pkuxkx-utf8/blob/0eaf237c9970795a51aa4cc04b5b762003300cbd/kungfu/skill/dugu-jiujian.c)自練要求器械、體力／精神／內力與特定師承經歷。這直接支持公版把條件作用階段分開，而非同一個可學開關。

檔中的資源扣耗不能僅因函式名含damage就解讀成永久內傷；傷勢、反噬需另有真規則。門派限制亦是此MUD設定，不當原著普遍規則。

### 4.3 對我們四類條件的啟發

| 本作分類 | 可借的做法 | 尚不能直接說已滿足 |
|---|---|---|
| 入門／理解 | 教法、師長上限、基本功與特殊武學分層，回報缺什麼 | 不能把所有拜師條件等同悟性 |
| 承載 | 最大能力和當前資源分開，練習前核消耗 | 不是本作根骨公式，也不等於已有強度調整 |
| 控制 | 用真練習／交手與技巧資料表現 | 本輪未在MUD找到可直接當公版通用控制軸的證明，保留缺項 |
| 特殊前提／風險 | [日月神教Wiki](https://wiki.pkuxkx.net/wiki/menpai/riyue)列配套心法／內功殘留等影響修煉的例子 | 主站Wiki不等於舊公開碼庫現狀，也不是本作已接受的走火公式 |

公開庫根目錄／README未找到明確可重用授權，來源又是轉碼／微調版本；**列設計參考，不列可直接複製LPC或內容**。可讀不等於已取得再散布許可。只核必要檔，未對整庫做授權或品質審計。

## 5. 配置與條件設計：jynew、kys-cpp

### 5.1 jynew：內容表、所學、事件效果可分工

[JYX2配置說明](https://github.com/jynew/jynew/blob/773f3e76492f4af277e8c93ced2c8d18ba516f6c/jyx2/Assets/Mods/JYX2/Configs/README.md)明定Excel編輯、生成Lua供運行；[Configs目錄](https://github.com/jynew/jynew/tree/773f3e76492f4af277e8c93ced2c8d18ba516f6c/jyx2/Assets/Mods/JYX2/Configs)有人物、武功、物品等表。[事件指令](https://github.com/jynew/jynew/wiki/游戏事件指令)可作傳授與條件判斷的導讀。可借作者內容與程式分離、武學定義／個人所學／事件授予的分工；本輪只核說明和目錄，沒有讀取二進位Excel或聲稱已驗整套配置。

其[README](https://github.com/jynew/jynew/blob/773f3e76492f4af277e8c93ced2c8d18ba516f6c/README.md)提及MIT，但[根LICENSE](https://github.com/jynew/jynew/blob/773f3e76492f4af277e8c93ced2c8d18ba516f6c/LICENSE)另列未經公開授權不可使用程式／資源，[社區協議](https://github.com/jynew/jynew/blob/773f3e76492f4af277e8c93ced2c8d18ba516f6c/COMMUNITY_LICENSE_FOR_JYX2/README.md)對特定目錄又有專門範圍限制。**不能據README的MIT字樣把整庫列為可直接搬用；先核具體檔案與授權範圍。**

成本：借表格分工小；接其Unity／Lua完整管線大，本作目前不需要換引擎或增加一套內容編輯器。

### 5.2 kys-cpp：條件不一定只有「至少多少」

[Types.h](https://github.com/scarsty/kys-cpp/blob/357feee2b2d4fc2dbcbe1a1e6560bd4cdb1bc594/src/Types.h)分Role、Item、Magic，人物另記所學／等級；[Types.cpp](https://github.com/scarsty/kys-cpp/blob/357feee2b2d4fc2dbcbe1a1e6560bd4cdb1bc594/src/Types.cpp)的物品／秘籍適用檢查含內力類型、人物專用與各能力條件，且以符號表達下限或上限。可借「限定人物／類型／範圍與多前提」的表達，不必學其帶符號的壓縮存法。

[根LICENSE](https://github.com/scarsty/kys-cpp/blob/357feee2b2d4fc2dbcbe1a1e6560bd4cdb1bc594/LICENSE)是BSD-3-Clause文字，但[README授權段](https://github.com/scarsty/kys-cpp/blob/357feee2b2d4fc2dbcbe1a1e6560bd4cdb1bc594/readme.md)另有金庸題材遊戲牟利用途的限制。只看GitHub標籤會漏掉這個差異；本輪列作者確認／範圍核對項，先不歸為無條件直接重用。

其README亦描述不同戰鬥模式，可參考同一內容搭不同演出／戰鬥的方向；本輪沒試玩／評估模式完成度，不推薦因此移植C++／SDL戰鬥核心。

## 6. 社群攻略可借什麼，不能當什麼

[金庸S正傳1.41攻略](https://game.ali213.net/forum.php?action=printable&mod=viewthread&tid=6267179)包含高／低資質選路、不同內力上限、角色特效與條件互動。值得借「不同起點形成不同路線」與「玩家需要知道卡在哪裡」，不將其係數或陰陽體系納入本作既定規則。這是2017指定MOD版本，不能與DOS原版、其他MOD或原著混成一張表。

巴哈姆特的原版修煉條件表本輪搜尋可見，但直接開頁回403，**未逐項核表，不採其精確數字**。網路攻略彼此混入不同MOD、上限／下限方向與版本，需用可讀的實際規則交叉核。

另搜尋到[pi-jinyong-xia](https://pi.dev/packages/pi-jinyong-xia)公開描述含天賦進階與行為推導MBTI；本輪只核套件頁，未核repo版本／源碼／授權完整性與內容品質，不列直接套用候選。它將工具活動映成修煉，也不是本作角色生活AI。未安裝或執行任何第三方skill。

## 7. 建議直接納入公版的欄位與取捨

| 可先納設計的內容 | 我們的語義 | 避免誤用 |
|---|---|---|
| 人物／武學穩定ID與來源 | 身份、來源版本、本版變體、角色所學分離 | 同名不合併，同一人物不同階段不倒填先天 |
| 基本功＋專門武學 | 基礎技能、單門所學、招式與熟練 | 不是所有功法都靠同一悟性／總等級 |
| 讀書／受教／演練／交手／領悟 | 各自有效投入與能提升的項目 | 讀懂不等於熟練，空揮不等於實戰經驗 |
| 教法與前提回饋 | 取得機會、目前能練到哪、缺何能力／資源 | 缺老師不等於低根骨，資源扣耗不等於內傷 |
| 內功類型與衝突（候選） | 原版若有就作特殊前提或效果來源 | 不要求三分支全新增陰陽／調和或經脈系統 |
| 醫毒／知識／專門技藝（候選） | 可選技能擴充 | 不把單一morality代替人格／六價值；iq不默認就是本作單一理悟 |
| 人物敘事／偏好與關係條件 | 卡片可選子區塊與教學機會 | 靜態描述不冒充有因果效果的人格AI |

不另建一套來源數值真相：保留raw值、單位與本版規則；是否能直映先由三方報告確認。古典角色資料不全部自動當先天，隱藏特性樹亦不因某包有欄位就直接採用。

## 8. 若後續要真正套用，最小工作包怎麼切

建議另授一個小型整包，**目前未開工／未認領**：

1. 只選jy-skill的郭靖／令狐沖／一位對照人物，及九劍／降龍／一門內功的固定版本靜態樣本；先核武學配對、角色階段與可取用檔案範圍。
2. 建來源清單：repo、固定SHA、檔案、raw ID、版本／階段、授權／聲明位置、已核或待核、哪些是上游自訂。按明確白名單取用，維持引用來源。
3. 投影成公版人物卡／武學卡的**唯讀研究fixture**，顯示缺項與同名異義；不讓外部休息、授予、保存或戰鬥函式進本作核心。
4. 最多一個理解已足但承載／特殊前提仍不足的紙上案例，配一門已有武學的來源核對；缺原規則就標缺，不先造控制／內傷公式。
5. 工程若獲批准，只驗有界樣本／ID引用／缺值與一段桌面可見流程。研究接受不授工程，不因資料多先匯全部116人或33項。

本輪只交研究與可直接借用的設計清單；沒有新增模板數值、世界事實、資料庫、依賴、第三方skill、試玩入口或保存升版。存檔升版與手機繼續最後，既有開發／集中review不受阻。
