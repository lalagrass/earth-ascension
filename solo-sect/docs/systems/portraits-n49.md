# N49 女角視覺與肖像

13 張肖像從本倉 `dev` 的 `sect-chronicle/assets/shared/portraits/1.1.0/` 依固定提交與 `gemini-1.1.0` manifest hash 複製。每張舊圖留在 `assets/portraits/old/`，逐張 SHA-256 見 `assets/portraits/PROMPTS.md`，權利與來源逐檔見 `assets/portraits/LICENSES.md`。`artifacts/round8/n49-64px-comparison.png` 是 64px 前後縮圖。未換的九位女角（穆念慈、雙兒、阿珂、岳靈珊、任盈盈、寧中則、趙敏、小昭、阿芳）縮至 64px 仍可讀作女角，檢視圖見 `n49-unreplaced-64px.png`；目前沒有必須更換的一張。

`data.mjs` 的 15 位舊女角及 `wuxia.mjs` 的五位後續名俠使用明寫 `fem` 欄位。`visualSpriteOf` 只讀此欄位，為顯示選 `sister`；不從名字推斷，也不把欄位寫進權威狀態。舊存檔和新局的 `sprite` 字串保持，N49 的 golden 應與 N52 一樣。暫用 `senior.png` 加髮髻、長髮與裙擺在瀏覽器 Canvas 合成 `sister`；練功／交手姿勢同樣依這個 metadata 畫女角輪廓。這是可見暫代，正式 sprite 追蹤於 [#472](https://github.com/lalagrass/earth-ascension/issues/472)。

`artifacts/round8/n49-female-map.png` 與 `n49-female-close.png` 是郭靖開局、帶黃蓉後，視覺測試場景加入小龍女與林師姐的近景。現有開局選單沒有小龍女模板；為守住本 milestone「只動畫面、golden 不變」，截圖用既有名俠加入流程，而沒有新增小龍女開局規則。
