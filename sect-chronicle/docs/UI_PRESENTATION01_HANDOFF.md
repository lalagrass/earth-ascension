# UI-PRESENTATION-01 — #366

實際主筆 Codex Cloud `/root/presentation366_author`，host `bd5f96b62f8a`，checkout `/workspace/presentation366-author`，branch `codex/366-public-presentation`，base dev `bb251ab78e4bc0579e3e750afd0cc7fe2a9c6dd5`。狀態為作者交付候選，待 grass 非作者集中 review／#67 串行 dev 與必要 postCI；未認領 #367。

## 玩家問題與可見出口

紙底／墨線、字級、收合焦點與 disabled 樣式原散在各元件，event-view 還跨檔覆寫人物及武學樣式。現在 `public-ui/style.css` 集中同方向的少量 tokens、重複紙塊、summary focus、按鈕及狀態色。正式入口 `sect-chronicle/index.html` 沿既有跳轉載入同一套樣式；沒有第二個正式玩家入口。

兩分鐘流程：正式入口選主角，開工作目標 details，播放工作／坐休並以鍵盤聚焦 summary，切熟手再回主角；開資源看原五欄及原命令結果。開既有 `character-card/showcase.html` 檢查長公開背景、缺圖、0／unknown／hidden／unsupported、disabled、錯誤與示意結果。後者標為開發工具，fixture 都是示意，不代表真世界驗收。

## 抽取與專屬部分

| 採用共用 | 保持專屬 |
|---|---|
| 紙、墨、次文字、邊線、控制底、焦點、錯誤色；12/13px 字級、12px 紙塊間距、6px 控制圓角 | 正式 HUD／camera／場景、面板大小與位置、resource 固定浮層 |
| 人物行動／武學 article／事件／意圖的紙塊與收合焦點；正式 `.btn` 與 disabled 可讀狀態 | 人物 portrait 裁切／fallback／背景、資源 dl、武學條件、事件清單、意圖政策布局 |
| `public-ui/values.mjs` 抽出原 escape/valueText 與重複 value/source span；人物舊 exports 相容 | 三核心 availability、來源 SHA、原單位、原值與各自規則／commands |

hidden 值無 tooltip；field 合約原有遮罩保持，預覽沒有 hidden payload。0 保持已知 0，unknown／hidden／unsupported 仍文字分開，不僅靠顏色。命令原因與原結果照字面顯示，disabled 以邊線與文字保持可辨。ViewWriter／app／adapters 未改，每人物 details 與焦點仍走既有 scope。

開發 preview 擴原 showcase，直接 import production renderCard（含 martialHtml）、resourcesHtml、intentHtml、recentHtml；fixture 無模型、時鐘、存檔、隱藏資料或真命令 dispatch。點示意按鈕只更新明標示意結果。

## 來源與選擇

讀過 [Unciv skin](https://yairm210.github.io/Unciv/Modders/Creating-a-UI-skin/) 將外觀與元件分開的設計，以及 [FasterUIDevelopment](https://yairm210.github.io/Unciv/Developers/UI-development/) 直接預覽元件的工作方式。採 CSS tokens＋既有 HTML renderer，因現有 Pixi/DOM 已能完成；不移植 LibGDX、不複製第三方程式或圖像、不加 framework／npm／字型服務／skin 切換。既有水彩紙墨／Grok 圖與 pin 不變。

## 驗證與復用

定向命令：`node --test sect-chronicle/public-ui/checks/presentation.test.mjs sect-chronicle/character-card/checks/card.test.mjs sect-chronicle/resource-view/checks/resources.test.mjs sect-chronicle/intent-view/checks/intent.test.mjs sect-chronicle/event-view/checks/events.test.mjs sect-chronicle/public-fix/checks/fixes.test.mjs sect-chronicle/martial-view/checks/martial.test.mjs`。新增反例驗 shared value 的 0／狀態、escape、hidden tooltip 遮罩、renderer 不改 input、原結果 literal 與 ViewWriter keys。

Cloud 桌面重跑：`node sect-chronicle/public-ui/checks/desktop-check.mjs`（既有 Cloud Playwright、Chromium 路徑；port 8836）。一頁順次正式 before／after／既有 preview；before 路由讀精確 base 的原 production CSS/renderers，沒有另一個 server。少量 JPEG 與實際 checks／cleanup 在 `public-ui/evidence/desktop-results.json`。需要 Cloud exec network capability 以啟子程序；預設 sandbox 的 `spawnSync git EPERM` 發生於 browser/server 啟動前，不冒稱已驗。

本地結果：定向 7 個 test modules 通過；Python 53/53、m2 syntax、diff check 通過。game 快驗預設 sandbox 25/28 檔通過，production/progression/story 三個原 smoke 子程序檔失敗且無詳細診斷；相同三檔以 Cloud process capability、concurrency=1 重驗 85/85 通過，不改引擎／門檻。最終 Cloud 桌面 19 checks、0 page errors，finally page/context/browser/server 全 true；[結果 JSON](../public-ui/evidence/desktop-results.json)、[before](../public-ui/evidence/official-before.jpg)、[after](../public-ui/evidence/official-after.jpg)、[fixture 狀態](../public-ui/evidence/preview-states.jpg)。兩次初步 harness assertion 以鍵盤 modality／先展開 details 修正；各次均清理。PR 仍須當前必要 CI，不把本地限制當平台綠燈。復用 #357 可見性／茶真行動、#358 真資源／第二 GPT、#359 真自主恢復／原命令、#364 profile／portrait fallback 的未變證據，不重跑全 seed／手機／保存矩陣。rule/schema/RNG、世界數值、長通勤速度、D45／D53、保存格式均未改。

## 風險與後續作者短 prompt

風險是跨元件 CSS cascade，因此以同一正式桌面實測可見 focus／disabled、工作與坐休 live details、人物切換及資源；沒有宣稱完成手機適配或全畫面快照矩陣。預覽是 fixture，不能取代正式真核心驗證。

> 補修只接 #366 原 PR，先核最新 head/base／有效 claim 與非作者意見；沿 public-ui 少量 tokens／value markup 與既有 showcase，保留 ViewWriter、原 DOM/commands、0/unknown/hidden/unsupported 及原結果。只改 sect-chronicle/，不碰 Grok 立繪圖或作者 box/branch。針對實際新差異驗一次，finally 關自有 page/context/browser/server 並還原 viewport。交 grass 非作者集中 review，不自合／關 issue；#367 須 #366 dev/postCI 才可另由作者登記，現在不預占。
