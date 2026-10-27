# M41–M44 交付

2026-10-27；實際主筆 Claude Opus 5.5（Anthropic，經 Claude Code 在擁有人 Mac 上執行），單一作者、作者自校，不是獨立 review。規劃由 GPT / Codex 寫在 [M41–M44 計畫](M41-M44-PLAN.md)（原樣提交於 1f2181b）。分支 `codex/solo-sect-gpt`，盤點 HEAD `d9c7810`。只改 `solo-sect-gpt/`；途中依擁有人 2026-10-27 的指示把分支推到 `origin/codex/solo-sect-gpt`（當時 52979ec）交 PO 審，沒有開 PR、merge 或部署。M1–M40 的文件、證據與標記不改寫。完成 M44 即停止。

## 開啟

```sh
cd /Users/chenyuying/.codex/worktrees/solo-sect-gpt/earth-ascension
python3 -m http.server 8879 --bind 127.0.0.1 --directory solo-sect-gpt
```

開 <http://127.0.0.1:8879/>。鏡頭列多了「導覽」按鈕。所有素材從本地載入。

## 展示檔與兩條路線

新展示檔 `evidence/optimization/m44/showcase-m41-m44.save.json`（`m44-demo-ui.mjs` 以正常 UI 產生）：從 M40 展示檔做一鍋飯上桌、阿木與沈禾同時前攔的演練自然打完，exiting 時手動保存途中檔 `drill-exit-midway.save.json`（帶 M41 自然截止），沈禾同 tick 試拳，回顧，最後手動保存。

**A 生活→演武**（匯入 M40 展示檔）：開「導覽」→ 名單點阿木（選取＋跟隨）→ 膳房卡派阿木做基礎餐，鏡頭跟著他搬，資源總覽餐在途、上桌後歸零 → 阿木、沈禾都前攔、同時抵達，演練兩波自然打完 → 在退場中暫停，沈禾朝空地試拳 → 回顧只算到自然結束時的截止。

**B 遠征觀看**（同一局接著做）：阿木、林青休息到精力 80 → 遠征頁往溪谷出發 → 導覽寫「實際路線未提供」，隊伍真走出去；野豬只在有人看得到時出現在導覽 → 點牠跟隨 → 牠離開視線時從圖上與名單消失、跟隨清掉、鏡頭不再追 → 「全隊召回」→ 兩人真走回院子。

`m44-route-ui.mjs` 在 1440×900、1280×800 走完 A、B：牆鐘約 161 秒／141 秒，模擬 tick 201219→約 207200（A 約 2100 tick、B 約 2200 tick）；逐步記在 `m44-route-ui-accepted-*/summary.json` 的 `marks`。回顧沈禾耗精力 1215／1222（兩次的開打與截止精力不同，各自＝開打－截止）。驅動不停下閱讀；真人邊看邊讀的時間沒有驗證，真人趣味判斷沒有做。

## P2 與途中發現的問題

| 問題 | 修正 | 驗收 |
| --- | --- | --- |
| **P2（M41）**：演練兩波自然打完時，`sessionsTick` 轉 exiting 並清 session，但截止要等下一個命令才拍；自然退場後第一次試拳多算 200（規劃者證據：應 1215、記 1415） | `jointTick` 在同一 step、`combatAI` 與活動之前呼叫 `jointCut`：記 `closedAt` 與還在場者的 `bodyAt`；沿用 M37 欄位，存檔不升版 | 修前 0160b73 模型 5 項失敗；修後自然完成無命令、exiting 同 tick 試拳、之後工作、人工＋自然混合、exiting 當下存讀、舊形 exiting 檔都正確；正常 UI 實測截止 7779、試拳 7779→7579、回顧 1215（兩種尺寸） |
| **召回後停在半路（M44 發現，b0ca007 就有）**：遠征在營地休息時召回，回程遇到野豬交手，打完後阿木沒有路徑、也沒有活動，一直停在溪谷（40000 tick 不回家） | `expeditionTick` 的 return 階段：活著、沒在出手、沒有目標與活動、已走完路徑、離自己的回院點超過 48 DU 的隊員，重新走回院點 | 修前 b0ca007 模型重現（`m44/recall-stall-before-fix-at-b0ca007.log`）；修後營地與溪谷兩個召回時點都在 900 tick 內回院；路線 B 兩種尺寸返院。v2 旅程原本就有 M10 的同一條規則（`journey.mjs`，記 `rerouted`）；新規則只用在沒有 v2 旅程的遠征，M10 測試照過 |

M37 舊驅動的搬飯觀測也改了：暫停後用同一份暫停快照核對 phase、背包與畫面；暫停時若已上桌就再做一鍋（最多 3 次），仍沒捕捉到就讓驅動失敗並寫明，不把 undefined 當 0。

## 固定公版與本地 hash（M42）

dev `00f4dbe26be5765a9622957b7c6a636ab5039f96`（PR #371）。只取 `navigation-view`：

| 本地 | 上游 sha256 | 本地 sha256 |
| --- | --- | --- |
| `vendor/public/00f4dbe/navigation-view/contract.mjs` | da43ab2b915d7eed8256b0d8cdeaeea24c4cab3a7eaba2b11d29a731f2cb961a | 4a4aca1412414334bf7d11aa11044ae0686e676e869ad399e7f6c99aa61d1f17 |
| `vendor/public/00f4dbe/navigation-view/render.mjs` | c352e0b938fef1e5039ee876160921390303a9ba64403169ce57d84eca393499 | 256ecd3f716b2e9d5a38b3eef2d5ce7f6113ce443364e978de038dbb511c2605 |
| `vendor/public/00f4dbe/navigation-view/style.css`（`@import` 改指 6f959f5 的相同 tokens） | 4e7748d76eb2703fff741d8475658ea291d6eed59a64501002792bb46d9aa2f0 | 221bbc77be93258da12d4bd1827bfbf4dce07dd38689869714125a31f4b8f34d |

不採 `official.mjs`、checks、scene-shared、Pixi、舊核心 `6cbd3e6`。本地轉接 `src/navigation-view.mjs`：邊界 `MAP.world` 2400×1800 DU、座標 `x/Q`、`zoom=Canvas CSS 寬/span`、人物＝水彩場景畫的人、地點＝三張設施卡 rect 中心、路線 unsupported。公版採用備註（未代發上游）：span→zoom、Canvas CSS viewport、成功換局才換 epoch、點選時重核。

## 各階段

| 階段 | 玩家可見改變 | spec | artifact | 標記 |
| --- | --- | --- | --- | --- |
| M41 | 演練自然打完後的試招不算進回顧 | 0160b73 | c42c330 | optimization-m41.done.json |
| M42 | （資料層）導覽快照：只看得到的人、三個地點、鏡頭框 | a4ee913 | c788356 | optimization-m42.done.json |
| M43 | 「導覽」面板：點人選取跟隨、點地點移鏡頭、圖層、鍵盤不穿透、換局清除；跟隨的人離開視線就不再跟 | 52979ec | c4da25c | optimization-m43.done.json |
| M44 | 兩條路線、新展示檔、召回停住的修正、相容收尾、本文件 | 49415fa | ae0f7dc | optimization-m44.done.json |

## 驗收摘要

- 回歸：最終一次全套 307 項全過（`evidence/optimization/m44/regression.log`；各階段：M41 297、M42 303、M43 303）。完整回歸會重寫 M2、M7、M13、M20、M23、M29、M30 的報告，每次都已還原。
- 正常 UI：每階段 `mXX-ui-accepted-1440／1280`；舊驅動重跑在 `*-m41-recheck-1440`、`*-m43-recheck-1440`（只留 summary）。
- 相容（`m44-compat-ui-*`）：新展示檔壞校驗碼被拒且原局與槽位不變、預覽取消、確認續玩、刷新保留；讀壞檔保留展開與紀事、讀好檔重來；M30、M36、M40、新展示檔各續玩 600 tick 無頁面錯誤；新 exiting 途中檔讀入後試拳、回顧＝截止；讀壞檔時導覽節點保留，讀入同一世界較早的存檔與新局（同樣的 `leader`／`amu`）都重建節點；令狐沖圖 404（標註 UI fixture）時回退；內容包缺失沿 M30 存讀驅動。tick 倒退單獨的 epoch 重置在模型（M42）驗，畫面上讀入較早存檔同時也換了世界物件。
- 模型：新展示檔與途中檔存讀雙軌續跑相同；召回反例兩個時點。

## 限制

- 導覽只有人物與三個設施點；沒有公開路線（unsupported）、沒有探索記憶、沒有更多設施。演武對手站在場上時也會列在名單（與水彩場景畫的人一致）。
- 跟隨的人離開視線後，鏡頭停在原地，不再追；選取若是野外人物會回到掌門。
- 召回修正只在 return 階段把停下的隊員送回院點，不改交手、路徑或速度規則；第一次失敗的路線 B 證據資料夾在重跑時被我誤刪，該失敗以模型重現紀錄代替。
- 真人趣味、手機、整體存檔升版、更多設施、公版關係、全角色動畫、新地圖都不在本包。
