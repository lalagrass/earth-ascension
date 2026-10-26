# SG-PUBLIC-02／#348 工作包與作者交付

玩家問題：同一素材更新需要手找三份接線，不能確認每版採用來源。本包讓三固定核心各自選擇可追溯本地版本，正式人物卡採用主角原活動圖裁切；圖片缺失或來源未知時可讀替代。

實際作者為獨立Codex Cloud `/root/asset348_author`，不是grass／reviewer；runtime只提供GPT-6 family身份，確切model/effort沒有啟動收據。共享GitHub帳號lalagrass只是傳輸身份。Base dev `457aa0be902c26691bebaea2881820d86e5330db`；[claim](https://github.com/lalagrass/earth-ascension/issues/348#issuecomment-6412984167)真GitHub created_at為2026-10-26T09:46:13Z、expires_at為13:46:13Z（由公開issue-comment API唯讀核實）。前置PR347已合及postCI40301296266五成功。最終受審head與CI以本包PR／issue作者收據為準。

## 已交的有限範圍

- `assets/shared/manifests/{gemini,gpt,grok}-1.0.0.mjs`與`pins/*.mjs`：各一份獨立凍結快照及digest；完整核心SHA沿#342/#345真來源，不推原作者分支。新版本明確repin，無latest／全局可寫映射。
- `assets/shared/resolve.mjs`：穩定ID、本地URL、來源／hash／尺寸／alpha／腳錨／權利／recipe驗證及可讀missing/unknown/unsupported。讀取不推進世界／RNG。
- `character-card/portrait.mjs`沿#345單一API接pin，`render.mjs/style.css`在原正式入口人物卡顯示190×214 `idle-0`，完整atlas950×1284以裁切顯示，沒有新存圖或覆寫原圖；載入失敗保文字替代。懸停來源包含作者、完整SHA/path與版號。
- 真GPT/Gemini開發harness用各自pin解析主角atlas，再交同一renderer；它仍不是第二玩家入口。Grok卡沿自己的pin，無對應角色明示不支援，沒有把經典主角硬配D35人物。
- 檢查／證據與`test/public-assets.test.js`、[路線](SHARED_PUBLIC_ROADMAP.md)、[接手prompt](PUBLIC_ASSETS_AUTHOR_PROMPT.md)同PR交付。

## 素材來源與限制

原作者Grok Bot，原接受來源commit **`ac7148d3a4d9f6b07cf2576b61cb4a2faad8c0df`**。完整path前綴為`sect-chronicle/experiments/water-carry/demo/assets/art184-production/`，下表每件完整source path亦保存在每個manifest及[source-hashes.json](../assets/shared/evidence/source-hashes.json)。四件都逐一用`git show <sourceSHA>:<fullPath>`核對與本地位元組相同。

| ID | 原檔／SHA-256 | 用途 |
|---|---|---|
| person.hero.sheet | hero.png `7a0f42ac86c9ea804611964cf86634e77bbf10c79e886d482e75f65ba71cccd3` | 原活動圖及idle-0卡片裁切；非新立繪 |
| scene.bamboo | bamboo.png `23bed590ec5e4d329046584dd1d2dc44c5acabd3808af748c95089c275768103` | 原景物，無碰撞／規則 |
| scene.boulder.large | boulder_l.png `5757f2b15698f22cdc9653df154fe2dcf10e696cf46c88474f1c7c6d85a6ac35` | 同上 |
| scene.boulder.small | boulder_s.png `f18764f0f745ff870bd97b0e49cb6f20383503ba87fed4d8f8ce922d1fab92f8` | 同上 |
| person.adopted-girl.portrait | **missing**，source/rights unknown | 收養女孩正式立繪未在#345映射／本dev取得；可讀替代 |

權利證據同commit的`sect-chronicle/experiments/water-carry/design/art184-production/source/prompts.md`：記Grok owner-account生成／本repo使用與原參考；不將AI生成等同最終權利清查，也未宣稱全倉OSS license。衍生鏈是既有D35 raw／去背／`demo/tools/export-art184.js`與LP17 pose契約；本包僅讀原檔及原hero.json frame/anchor，無新增raster。尺寸／RGBA與腳錨在每筆manifest，校驗工具逐檔實讀。

#345的portrait mapping原本刻意為空；正式app目前仍沿原hero/cousin展示。D53家庭身分不被本包重寫，legacy `cousin`字面不能證明女孩圖；D35來源實際寫的是熟手村少年，所以沒有把它改標女孩。D32女孩概念與#343經典圖保持候選，不拿李莫愁或其他人替代。這是交付內明示的缺圖限制，沒有生圖湊數。

## 驗證與可見證據

可重跑命令：`node assets/shared/checks/verify.mjs`（在sect-chronicle下）及`node --test --test-isolation=none sect-chronicle/assets/shared/checks/assets.test.mjs`（repo root）。定向覆蓋真位元組／腳錨、重複ID／路徑、缺項／缺檔／未知來源、獨立版本更新、經典／女孩fallback、真official/Gemini/GPT/Grok paired-world結果。必要dev/root檢查及最終CI在PR收據列真結果。

本地定向6/6、`node --test sect-chronicle/test/*.test.js`快驗404/404、Python root53/53、root/變更JS syntax與diff檢查通過。sandbox內CLI子程序回空JSON，允許Cloud escalation後原命令404全通；沒有修改測試門檻或核心。快驗後只補了影像事件空節點保護，定向與相同桌面短流程再通，最終完整devCI另核。版本digest及圖片hash由可重跑工具／CI驗證，runtime不逐張重新計算hash；原路徑若被覆寫會被校驗拒絕，正式版本更新應用新path保原檔。

一次Cloud Chromium154／1440×1000流程：正式人物卡載入本地hero裁切→暫停保持權威→攔截本地圖請求驗失敗文字→同頁到真固定GPT原生地圖，確認自己的gpt1.0.0 pin與source6cbd3e6。四項通過、零page errors，[結果](../assets/shared/evidence/desktop-results.json)、[正式卡](../assets/shared/evidence/official-asset.jpg)、[真GPT場景](../assets/shared/evidence/gpt-pinned-asset.jpg)。第一次sandbox在開頁前因Chromium socket限制失敗；允許的Cloud sandbox escalation後完成，沒有Mac fallback或新專案依賴。

同一短流程因最後的explicit Spritesheet接線補驗時，發現快取圖片事件可能撞DOM替換的空節點；已加deferred/guard，同流程最終4/4、零page errors。僅針對這個實際失敗重驗，未重跑長矩陣。

finally確認page/browser/server全關，viewport僅在自建browser設定、關閉即釋放，未動他人頁／服務／8800。復用#342/#345未變長水藥路、原速度差／負重／暫停命令與真交付證據；原核心與規則／schema／RNG／save/D45/D53未修改，無長矩陣、手機或其他包。工程待非作者集中review／dev整合／postCI，不能把作者自校寫成接受或完成序列。
