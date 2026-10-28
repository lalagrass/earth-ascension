# #372 P2 收尾與 PUBLIC-ADOPT-GPT-01：交付

2026-10-28；實際主筆 Claude Opus 5.5（Anthropic，經 Claude Code desktop 在擁有人 Mac 上執行），單一作者、作者自校，**不是**獨立 review。規劃：GPT / Codex（`docs/optimization/CLAUDE-372-P2-CLOSURE-PROMPT.md`，原樣提交於 ce4def8）。認領：[#372 issuecomment-6468542990](https://github.com/lalagrass/earth-ascension/issues/372#issuecomment-6468542990)。

**執行環境**：提示詞要求 Cloud 工程與驗證、Mac 只做真人試玩。本 session 沒有 Cloud checkout，擁有人 2026-10-28 在專案對話中明確選擇讓我在 **Mac 本機**做。以下所有「正常 UI」都是 Mac 本機、`127.0.0.1:8879`、Chrome headless、一次一個瀏覽器，不是 Cloud。

- 分支：`codex/solo-sect-gpt`；開工比較基線 `9d7f62db2466989c152857fc9d97ac269edc3fbb`（M44 交付）。
- 只改 `solo-sect-gpt/`；沒有 merge、部署，也沒有整條分支進 dev 的 PR。審查用 refs 與 review-only PR 見 #372 回填。

## 啟動

```sh
cd /Users/chenyuying/.codex/worktrees/solo-sect-gpt/earth-ascension
python3 -m http.server 8879 --bind 127.0.0.1 --directory solo-sect-gpt
```

## 擁有人本次追加的三項 P2

| 項目 | 修前 | 修正 | 修後 | commit |
| --- | --- | --- | --- | --- |
| P2-A 掌門簿收起時導覽被一起藏 | `aria-expanded=true`、`hidden=false`，但 `display:none`、0×0 | `.panel-hidden aside` → `.panel-hidden>aside`（只藏側欄） | 收起掌門簿也看得到；開收掌門簿不影響；Escape／焦點返回；框高隨 Canvas 寬改變；暫停中 world 不變（兩種尺寸） | 4e8f05f |
| P2-B 舊格式 exiting 檔讀入後第一個命令 | 讀入後直接試拳，回顧 1617（不試拳對照 1417；模型與正常 UI 都重現） | `save.decode` 驗證通過後呼叫 `jointCut`：在成功讀檔時截止 | 直接試拳、直接工作、不下命令續跑都＝1417；被拒與重複命令不改世界；新檔 `closedAt` 不變；壞檔照舊被拒；M41 斷言改為「讀入時截止」 | 23e544b |
| P2-C 召回近院 20–48 DU 被打斷後停住 | 43.9 DU 時下合法試拳，2000 tick 仍是 return | return 階段抽出 `atHome`，續走＝`!atHome`，與返院完成同一判定（v2 旅程仍走 M10） | 正常命令序列與 19.93／21.53／47.11／48.71 DU 邊界（標註 fixture）都返院、storyBusy 解除；存讀雙軌相同；M7、M10、M44 照過 | e78b98b |

## PO 原批准的 #372 套用

**健康資訊遮罩**（b701c1d）：非掌門的體魄是 hidden，但生命上限＝80＋5×體魄。新增 `src/health-view.mjs`：掌門照舊精確，其他人顯示「完好／輕傷（≥80%）／帶傷（≥50%）／重傷／倒地」，血條用分類的固定寬度。套到公開快照（`state.hp` 改 hidden、不帶原值，另加 known 的 `state.health`）、人物頁生命列與血條（含 aria）、觀察卡、返院報告、紀事文字、畫布交手血條。核心 hp／傷害／門檻／存檔不改。`assets/manifest.json` 對 `src/render.mjs` 的 sha256 隨之更新（55728465… → df836dbc…）。修前沈禾人物頁「生命 10/100」；修後「健康 重傷」、側欄文字與所有屬性都沒有精確值；兩位隱藏體魄不同、同分類的人（標註 fixture）公開內容相同。

**兩個 renderer**（1a10f7d）：`vendor/public/00f4dbe/martial-view/render.mjs`（上游 bbf241b6…，本地 e91ddaac…）與 `event-view/render.mjs`（上游 659dd4bd…，本地 64dcc677…），只改 import 指向已鎖的 6f959f5 `public-ui/values.mjs`；ef823ac 舊副本保留給舊測試。新舊 martial 輸出文字相同、多了 `martial:<id>` 展開鍵（沿 M35 依人物＋條目保存）；event 輸出逐字相同。沒有發現無關回歸。

## 驗證

| 範圍 | 結果 | 證據 |
| --- | --- | --- |
| 模型（新） | P2-B 4 項、P2-C 3 項、健康遮罩 4 項、renderer 4 項 | `evidence/optimization/372-p2-closure/*-model.json` |
| 修前紀錄 | P2-A、P2-B、健康：正常 UI 修前版；P2-B、P2-C：模型修前 log | `372-*-before-fix-*`、`372-p2-closure/*before-fix*.log` |
| 正常 UI（Mac 本機） | P2-A、P2-B、健康、renderer 各 1440×900 與 1280×800 通過 | `372-p2a-ui-accepted-*`、`372-p2b-ui-accepted-*`、`372-health-ui-accepted-*`、`372-render-ui-accepted-*` |
| 受影響舊驅動 | M28、M29、M33、M35、M41、M43、M44 相容驅動重跑通過（只留 summary） | `*-372-recheck-1440`、`*-372h-recheck-1440`、`*-372r-recheck-1440`、`m44-compat-ui-372-p2b-recheck-1440` |
| 完整回歸 | 最後一次 326 項全過（每項之後都跑過：312／316／321／326） | `372-p2-closure/regression-*.log` |

完整回歸會重寫 M2、M7、M13、M20、M23、M29、M30 的舊報告，每次都已還原。

**復用、沒有重跑**：導覽的可見性（不可見→可見→不可見）、跟隨清除、換局與讀檔失敗時的 marker／名單清理沿 M42–M44 的模型與正常 UI 證據（本包只改了導覽面板的 CSS，並在 P2-A 重驗開收）；自創／郭靖／令狐沖外觀、女孩缺圖沿 M38／M39；沒有重跑全人物×武學×倍率、長 seed、手機或全存檔矩陣。

## canonical hash 與相容

- 預期改變：讀入**沒有 `closedAt` 的舊格式 exiting 檔**時，世界多了 `closedAt`／`bodyAt`（P2-B）；召回後在 20–48 DU 停下的隊員會繼續走（P2-C），影響這類情境之後的軌跡。其他固定 seed 情境不變（回歸中所有舊的雙軌、重放與 hash 測試照過）。
- 沒有新存檔欄位、沒有升版；健康遮罩只在投影與畫面。

## 限制與未做

- 驗證是 Mac 本機，不是 Cloud；沒有真人試玩、沒有非作者 review、沒有 CI 以外的平台綠燈。
- 健康分類界線本身仍透露比例範圍；`window.__game` 遙測與存檔仍是原始世界。
- P2-C 的 20–48 DU 打斷沒有另跑正常 UI（路線 B 的召回返院沿 M44 正常 UI 證據）。
- 手機、存檔升版、新玩法、更多導覽設施與公開路線都不在本包。
