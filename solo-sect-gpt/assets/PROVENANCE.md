# 原創素材與來源

實際作者：GPT / Codex（GPT-6.1 Sol / high），2026-10-25。私人本機原型，未公開授權或發布。

本版沒有複製 dev、Grok 或 Gemini 的程式、立繪、音檔、水彩 bitmap 或外部遊戲素材。三方觀念與固定SHA見上游 BRIEF／DECISIONS；沿用的只有本GPT規劃階段的座標／拓撲資料，衍生自 planning `e530a2c078722fd69732332eef2cd964da99ad24` 的 `maps/design/layout.json`，保留原件。

- `src/render.mjs`：原創 Canvas 分層地面、屋體／獨立屋頂、床、灶、水缸、餐位、菜藥、四向人物骨架、負重與動作特效。
- `src/audio.mjs`：原創 WebAudio oscillator／envelope 短音，沒有下載配樂或樣本。
- `maps/runtime/layout.mjs`／`base.json`：上述設計資料的明示衍生副本；實際牆、水、家具、樹幹、可達路徑與站位由 `src/map.mjs` 定義。
- 經典人物只用私人原型姓名與自寫有限事件，沒有搬原作對白或外部圖音；公開IP清理是未來另案，不代表已取得公開商用許可。

manifest 的 hash 指實際生成模組／資料檔，不虛構已烘焙的 PNG。視覺與音訊驗收須連到 development 的真實證據；程序素材已做作者視覺自校與來源hash核對；實際截圖在 visual-final、presentation 及 presentation-continue。WebAudio 已驗首次互動解鎖、合成訊號、靜音及音量控制；無音訊硬體，未做真人聽感驗收。manifest 的局部腳錨為 [0,0]，其世界錨是 people[id].x/Q、y/Q；不是虛構 atlas 座標。

## 2026-10-26 M1 水彩層

優化採內建image_gen生成`watercolor/roof-v1.png`、`tree-v1.png`、`bridge-v1.png`與`meadow-v1.png`；每次各一素材；前三項要求真正透明，meadow是低對比不透明重複地表材質，保留原alpha，原始輸出留於Codex generated_images，選定PNG複製入本專案。完整prompt在`watercolor/prompts.json`與`watercolor/meadow-prompt.txt`，檔案hash、尺寸、透明統計、腳錨與消費圖層在`watercolor/manifest.json`。沒有把整張場景烘焙成背景。Gemini參考副本只在evidence/optimization/reference，不供runtime載入。

`src/scene-art.mjs`只屬顯示層：素材快取、紙面色洗、獨立牆身／窗／門框／生活物件與橋前欄；原屋頂與樹保留載入失敗時的程序fallback。腳錨、站位、幾何與模型RNG無修改。這段新增說明取代上文『沒有水彩bitmap』對優化版本的描述；舊版來源敘述保留作歷史。
