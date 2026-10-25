# 原創素材與來源

實際作者：GPT / Codex（GPT-6.1 Sol / high），2026-10-25。私人本機原型，未公開授權或發布。

本版沒有複製 dev、Grok 或 Gemini 的程式、立繪、音檔、水彩 bitmap 或外部遊戲素材。三方觀念與固定SHA見上游 BRIEF／DECISIONS；沿用的只有本GPT規劃階段的座標／拓撲資料，衍生自 planning `e530a2c078722fd69732332eef2cd964da99ad24` 的 `maps/design/layout.json`，保留原件。

- `src/render.mjs`：原創 Canvas 分層地面、屋體／獨立屋頂、床、灶、水缸、餐位、菜藥、四向人物骨架、負重與動作特效。
- `src/audio.mjs`：原創 WebAudio oscillator／envelope 短音，沒有下載配樂或樣本。
- `maps/runtime/layout.mjs`／`base.json`：上述設計資料的明示衍生副本；實際牆、水、家具、樹幹、可達路徑與站位由 `src/map.mjs` 定義。
- 經典人物只用私人原型姓名與自寫有限事件，沒有搬原作對白或外部圖音；公開IP清理是未來另案，不代表已取得公開商用許可。

manifest 的 hash 指實際生成模組／資料檔，不虛構已烘焙的 PNG。視覺與音訊驗收須連到 development 的真實證據；目前狀態仍為開發中。
