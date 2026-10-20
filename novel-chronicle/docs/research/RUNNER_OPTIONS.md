# 互動式小說系統選型：先復用敘事工具（#134）

狀態：**文件研究與架構建議，非正式選型或 runtime 授權**。主筆 Codex，2026-10-20。以 [#124／PR #168](https://github.com/lalagrass/earth-ascension/pull/168) 待審的《挑水的暑假》內容作同一比較題：小滿挑水後察覺恢復較快，在「告訴爺爺／先記下來」之間選擇；後文匯流時回應誰知道什麼，最後可達平凡的「明天再一起挑水」結尾。#124 尚未合併，例句只是選型 fixture，不替它定稿。現行 [TECHNICAL_DESIGN](../TECHNICAL_DESIGN.md) 的自製 JSON runner 是提案，不是既定實作。依 [#145](https://github.com/lalagrass/earth-ascension/issues/145) 先比較成熟開源與薄 adapter。

## 結論與適用範圍

**優先推薦以 Ink 原始碼＋inkjs 瀏覽器 runtime 作為 #125 的候選路線**，作者用 Ink／Inky 寫分支正文，建置或匯出時編譯成故事 JSON；讀者介面只做文字、選項與續讀。這能復用敘事語言、條件回呼、編譯器和執行器，專案只需實作自己的內容版本／存檔封套、可見資訊與選擇來源檢查。推薦仍須 #123 核准選型與存讀語義，並在 #125 前用**同一小段**跑一次離線打包／續讀／版本錯誤的有限 spike；此文件沒有安裝、執行或量測任一候選。

[Twine](https://twinery.org/)＋SugarCube 是快速、可給讀者直接打開的**內容試讀基線**：單一 HTML、視覺化 passage 編輯與內建存檔適合 #124/#127 的早期試讀。若最終產品保持獨立單頁、無自訂讀者外殼，它可能比 inkjs 更省工；若要與本專案明確的故事身份、選擇來源、版本拒絕、專屬 UI 整合，須再比較 adapter 費用。自製 JSON runner 只在同場景 spike 證明 Ink／Twine 無法以薄 adapter 滿足必要契約時保留，不能因既有設計稿已寫就默認開工。

## 一手來源、版本與授權（核對於 2026-10-20）

| 候選 | 核對來源 | 維護／授權與採用邊界 |
|---|---|---|
| Ink＋inkjs | [Ink 官方倉庫](https://github.com/inkle/ink)、[Ink 的 Web 教學](https://www.inklestudios.com/ink/web-tutorial/)、[inkjs runtime／compiler 倉庫](https://github.com/y-lohse/inkjs)、[inkjs v2.4.0 release](https://github.com/y-lohse/inkjs/releases/tag/v2.4.0)、[MIT license](https://github.com/y-lohse/inkjs/blob/master/LICENSE.md) | Ink 與 inkjs 均 MIT；inkjs v2.4.0 發布於 2026-02-17，顯示仍有維護。Ink 原稿需編譯成 JSON；Inky 可預覽並匯出 Web。若採用，鎖精確 runtime／compiler 版本並保存授權文；需確認其版本與 Ink 原稿格式相容。 |
| Twine 2＋SugarCube 2 | [Twine 官方網站](https://twinery.org/)、[Twine 源碼](https://github.com/klembot/twinejs)、[故事格式說明](https://twinery.org/cookbook/starting/twine2/storyformat.html)、[SugarCube 官網](https://www.motoslave.net/sugarcube/2/)、[SugarCube 源碼](https://github.com/tmedwards/sugarcube-2) | Twine 2.12.1 於 2026-10 發布；Twine 編輯器源碼 GPL-3.0，SugarCube 格式 BSD-2-Clause。故事作品由作者自行使用，編輯器授權與輸出的格式授權要分開保存。SugarCube 官網列 v2.37.3（2024-07-26），需在實際匯出時核對 Twine 內建格式版本。 |
| 小型 JSON runner | [本專案既有技術提案](../TECHNICAL_DESIGN.md) | 無外部依賴，但驗證圖、條件、選擇重送、存讀與編輯工具都由本專案負責；不是因為零套件就零維護成本。尚無 runtime／授權套件可採用。 |
| Yarn Spinner（次選，不進第一輪 spike） | [官方文件](https://www.yarnspinner.dev/docs/)、[授權 FAQ](https://yarnspinner.dev/license/) | 有故事節點、變數、預覽和遊戲引擎整合，主軸偏對話；不同整合套件授權不同。若之後以遊戲人物對話為核心，可再評估；本次三章散文先不加第四套比較。 |

以上只核對公開文件與 release，**沒有實測**本機 bundle 大小、首次載入、作者修改所需時間、跨瀏覽器相容或存檔遷移。沒有基於「開源一定比較快」作性能宣稱。[Ren'Py Web](https://www.renpy.org/doc/html/web.html) 擅長有立繪／音效的視覺小說，但其 WebAssembly 包裝、伺服器與素材流程對目前散文切片較重，因此只留為產品轉型時的參考。

## 同一個最小故事切片

共同約束：兩個選擇、一個後文回呼／匯流、一個安靜結尾、中途關閉再續讀。選項效果僅代表「爺爺是否知道小滿的感受」，**不代表靈氣已被證實**。以下是語法／資料形狀示意，未在工具中編譯或執行；採用前須以實際工具驗證。

### A. Ink／inkjs（作者寫散文與條件）

```ink
VAR told_grandpa = false

=== c1_evening ===
小滿仍有些肩疼，呼吸卻比午後平順。
* [把自己的感受告訴爺爺]
    ~ told_grandpa = true
    -> c2_road
* [先記下來，明天再比一次]
    -> c2_road

=== c2_road ===
{told_grandpa:
    爺爺讓他仍挑半桶，沿昨天的路走，不許逞強。
- else:
    他只拿得出昨晚的私記，還沒有人能替他核對。
}
阿祁在院門口等著。兩人又沿同一條山路下去。
-> END
```

Ink 官方說明其原稿編譯成 JSON，runtime 以 `Continue()`／`currentChoices`／`ChooseChoiceIndex()` 推進，並可用 `state.ToJson()`／`LoadJson()` 存讀；參見[執行文件](https://github.com/inkle/ink/blob/master/Documentation/RunningYourInk.md)。inkjs 有可直接打開 `index.html` 的 serverless 模板，也可載入 JSON；`fetch` JSON 則需要本機／網站伺服器，見[inkjs README](https://github.com/y-lohse/inkjs)。**Ink 內部存檔格式不等於本專案的故事內容版本契約**。

### B. 小型 JSON runner（目前設計提案）

```json
{
  "storyId": "water-summer",
  "contentVersion": 1,
  "flags": { "toldGrandpa": { "type": "bool", "initial": false } },
  "nodes": {
    "c1-evening": {
      "text": "story/chapter-1.md#c1-evening",
      "choices": [
        { "id": "c1-tell", "effects": [{ "op": "set", "flag": "toldGrandpa", "to": true }], "next": "c2-road" },
        { "id": "c1-record", "effects": [], "next": "c2-road" }
      ]
    },
    "c2-road": { "text": "story/chapter-2.md#c2-road", "acknowledges": ["c1-tell", "c1-record"], "next": "end-quiet" }
  }
}
```

資料 ID 與效果來源很清楚，但作者須在正文與 JSON 兩處同步修改。條件回呼、結局節點與圖驗證要本專案自己實作；這個節錄不是完整合法故事包，不能把它當已通過 `validateStory` 的證據。

### C. Twine／SugarCube（快速試讀）

```twee
:: c1-evening
小滿仍有些肩疼，呼吸卻比午後平順。
[[告訴爺爺->c1-tell]]
[[先記下來->c1-record]]

:: c1-tell
<<set $toldGrandpa = true>>
<<goto "c2-road">>

:: c1-record
<<goto "c2-road">>

:: c2-road
<<if $toldGrandpa>>爺爺讓他仍挑半桶。<<else>>他只拿得出昨晚的私記。<</if>>
阿祁在院門口等著。兩人又沿同一條山路下去。
[[繼續->end-quiet]]
```

Twine 以 passage 與故事格式輸出 HTML；[SugarCube 文件](https://www.motoslave.net/sugarcube/2/docs/)有變數、條件和存檔能力。此示例未執行，且 SugarCube 內建存檔不自動提供本專案要求的 story ID／contentVersion／損壞原檔保留語義。

## 按同場景比較，而非按框架聲量比較

| 決策面 | Ink／inkjs | JSON runner | Twine／SugarCube |
|---|---|---|---|
| 原創散文、修改一個回呼 | 文字與分支相鄰；Inky 可預覽；編譯步驟另算 | 正文與資料分離，改選擇須兩處同步 | passage 圖易討論；HTML 試讀快；長期需保留可 diff 的 Twee 原稿 |
| 兩選擇後匯流 | Ink 條件原生支援 | 需實作條件與 `acknowledges` 檢查 | passage＋SugarCube 變數可表達 |
| 穩定選擇 ID／來源 | 需薄 adapter／作者標記規約；不要假設 compiled JSON path 修改後穩定 | 顯式 choice ID；仍需規則驗證 | passage 名可作一層 ID；同 passage 多選擇需另定 stable ID |
| 中途存讀與改版 | Ink 有狀態 JSON；需外包 story/content/schema 版本、壞檔保存、舊內容策略 | 需自行做封套、重播、備份與錯誤處理 | SugarCube 有讀者存檔；跨內容版及本專案身份仍需另定 |
| 瀏覽器／離線交付 | Inky Web 匯出或 inkjs serverless 模板可試；預編譯與 bundle 需鎖定 | `file://` 可用 script 資料，renderer／runner 全自建 | 發布單一 HTML 最直接 |
| 與既有小說 UI 接合 | runtime 可嵌入自有 reader，保留 UI／存檔薄 adapter | 原設計天然可控，但維護面最大 | 須在 SugarCube 格式內客製 UI 或接受內建呈現 |

這是**文檔級可行性／成本判斷**，不是時間、KB、FPS 實測；任何性能比較須用相同文字與裝置量測。寫作者是否真的覺得哪一版好改，也要讓 #124 作者以相同改稿任務試用，不能由程式員代判。

## 建議的最小系統邊界（若 #123 選 Ink）

```text
原創 .ink／故事聖經與選擇來源清單
  → 鎖版 compiler 預編譯成故事 JSON
  → inkjs 只推進已批准的故事與變數
  → 薄 reader：顯示正文／選項、鍵盤操作、選擇回顧
  → 薄 save adapter：storyId＋contentVersion＋schemaVersion＋inkState，拒絕未知版並保留原檔
```

- **來源權威**：故事正文與條件由作者審定的 `.ink` 檔決定；adapter 不從自由文字猜旗標，也不寫 Earth／SG 狀態。穿越與靈氣在第一章是角色所知／假說，不能因文字提到就成為世界已驗證事實。
- **可見資訊**：回顧只列讀者已見的選擇、公開承諾與可知事實；內部 `told_grandpa` 不宜直接顯示成數值。若用 Ink tag 記來源／選項 ID，要在 spike 驗證 inkjs 的實際暴露介面，否則保留獨立 manifest；不能憑設計圖假定 tag API 可用。
- **存檔**：adapter 另加產品身份與內容版本，載入先檢查，不相容／JSON 壞檔保留原始字串並提供匯出／重開；保存失敗不可宣稱成功。Ink `ToJson/LoadJson` 管引擎內部狀態，未承諾可跨任意修改後的故事內容讀回。多分頁並寫保護須依 #123 選定，不把 localStorage 假裝成原子資料庫。
- **文字與版本**：原稿可改錯字；若變更選項意義、路徑或狀態條件，升 `contentVersion`。是否讓舊讀者在舊內容包續讀或要求重開，是 #123 的產品選擇，不能由 library 預設代決。
- **互動尺度**：第一版只追少量「誰知道／誰信任／答應了什麼」，無即時世界模擬、數值修行或全員 LLM。遊戲角色／場景設定可共用受審 IP 設定卡，兩套 runtime／save 不互相寫入。

## #123 決策與 #125 前的有限 spike

請在 #123 對照以下選項後再授權 #125：

1. **採 Ink／inkjs**（推薦）：接受作者編譯步驟與薄 adapter；#125 的實作 DoD 從自製圖驗證轉成「原稿編譯、穩定選擇來源、內容版、載入錯誤、相同故事的回呼與續讀」。原 [TECHNICAL_DESIGN](../TECHNICAL_DESIGN.md) 相關 JSON 欄位改標未採用，經審查更新，不能兩套正式 runner 並存。
2. **採 Twine／SugarCube**：若產品只求獨立短篇 HTML 試讀，接受其讀者呈現與存檔限制；先證明內容版與回顧需求可由薄設定滿足。
3. **保留小型 JSON runner**：須在同場景比較後列明 Ink／Twine 無法滿足的具體必要契約與其代價，再限縮自建範圍；不是任意擴成敘事平台。

同場景 spike 僅需：原創兩選擇→回呼／匯流→安靜結尾；完成一處文案修改及一處條件修改；在第二章前保存、重新開啟、換 `contentVersion` 嘗試讀舊檔；檢查瀏覽器離線入口和 Node 可重跑方式。記實際工具版本、授權、操作步驟、作者耗時、輸出大小與錯誤；不需要第二套 production runner、100 個 seed 或長篇生成。**本文未跑此 spike，也未提供性能數字。**
