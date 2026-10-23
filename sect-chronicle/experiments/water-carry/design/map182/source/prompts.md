# 生成紀錄與來源追溯

## 工具與環境

- **生成工具**：Grok Build Imagine（2026-10-23，Grok CLI 會話於 PR #248 提交 `d56acd3`）。
- **接手補查**：Gemini（Antigravity，D25 改派接手）。
- **原創性聲明**：全部圖檔為本次提示詞與圖生圖流程產出，未匯入任何第三方遊戲圖檔；《活俠傳》與《天下霸圖》僅在設計討論時作為宗門場景辨識與山居氛圍之方向參照。

## 圖像衍生鏈與提示詞存檔狀態

| 檔案 | 直接輸入來源 | 生成／改圖意圖摘要 | 原始文字 Prompt 存檔狀態 | 生成工具 |
|---|---|---|---|---|
| `paint/basin.jpg` | 無（文生圖初始畫布） | 斜俯視晨間盆地：右上道館與水缸、左下泉池、中段竹林木橋、右下藥圃曬架、左上遠村山門觀景石。橋上兩人同挑雙桶。 | **未保存**（Grok CLI 提交 `d56acd3` 時未將原始提示詞文字存入 repo） | Grok Build Imagine |
| `paint/bridge.jpg` | `paint/basin.jpg` | 近景裁切與局部重繪（inpaint）；人物經兩次微調為同高、罩袍、髮帶，保留圓身特徵。 | **未保存**（Grok CLI 局部改圖指令未留檔） | Grok Build Imagine |
| `paint/steps.jpg` | `paint/bridge.jpg`＋`paint/basin.jpg` | 將挑水兩人移至石階，熟手在較高一階、主角在較低一階。 | **未保存**（Grok CLI 衍生指令未留檔） | Grok Build Imagine |
| `paint/spring.jpg` | `paint/basin.jpg`＋`paint/bridge.jpg` | 將兩人移至泉池邊起挑點，滿桶啟程。 | **未保存**（Grok CLI 衍生指令未留檔） | Grok Build Imagine |
| `paint/yard.jpg` | `paint/basin.jpg` | 院落近景重繪；刪除誤生成的遠處橋上人物，保留水缸旁兩人（髮帶誤生成為紅頭巾，如實保留不掩飾）。 | **未保存**（Grok CLI 局部改圖指令未留檔） | Grok Build Imagine |
| `motion/return-load.mp4` | `paint/spring.jpg`（起）＋`paint/yard.jpg`（終） | 10 秒影片剪輯（848×480），首幀泉邊、末幀回院，以橋面人物作過渡參照。 | **未保存**（Grok CLI 影片合成參數未留檔） | Grok Build Video |

## 限制與重製性邊界

1. **原始 Prompt 文字無法倒推偽造**：Grok CLI 在 PR #248 交付時僅提交最終 JPG 與 MP4 檔案及上述做法大綱，並未將實際英文或中文提示詞字串、隨機 seed 或採樣設定寫入版本庫。依貢獻契約，不能倒寫推測虛構為「Grok 真實提示詞」，此項紀錄限制如實列出，交由 PO 審查。
2. **設計概念存檔而非逐像素工程資產**：全景與分鏡圖旨在展示生活盆地的空間分層（遠景、地面、遮擋、人物尺度），圖面中的透視將挑水路徑長度畫短，可度量之權威折線坐標以 `source/layout.json` 與 `source/plan.svg` 為準，不可直接將 JPG 切入 atlas 使用。
3. **後續改圖原則**：若後續擁有人或 PO 決定重產或替換特定局部圖檔，應使用可驗證工具並將完整 prompt、輸入圖 SHA 與模型版本同步記錄於本檔。
