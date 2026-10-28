# #372 P2 收尾與 PUBLIC-ADOPT-GPT-01：逐項規格與紀錄

開工比較基線 `9d7f62d`（M44 交付）；來源 `codex/solo-sect-gpt@ce4def8`（加上原樣提交的提示詞）。規劃 GPT / Codex（`CLAUDE-372-P2-CLOSURE-PROMPT.md`），實作主筆 Claude Opus 5.5（Anthropic），單一作者。**執行環境：擁有人 Mac 本機（擁有人 2026-10-28 明示例外），不是 Cloud。** 認領：#372 issuecomment-6468542990。

分兩類：**擁有人本次追加的三項 P2**（A、B、C），以及 **PO 原批准的 #372 套用**（健康遮罩、兩個 renderer）。每項先寫規格與修前反例，修好、驗證、commit 後才做下一項。

## P2-A 掌門簿收起時仍能獨立開導覽

- 玩家問題：新局預設收起掌門簿；按「導覽」後 `aria-expanded=true`、`hidden=false`、標記都在，但面板 `display:none`、尺寸 0——舊規則 `.panel-hidden aside{display:none}` 把場景裡的 `<aside id="nav-panel">` 也一起藏了。打開掌門簿才看得到。
- 檔案：`style.css`（只限縮那條規則到 `main` 直屬的側欄 `aside`）。不改 renderer、不讓導覽偷開掌門簿。
- 出口（Mac 本機正常 UI，1440×900、1280×800）：新局掌門簿收起→開導覽，面板實際有尺寸且在畫面內；導覽開著時開／收掌門簿，導覽不受影響；導覽自己開收、Escape 與焦點返回；鏡頭框跟著 Canvas CSS 寬度（側欄開收時寬度不同）刷新；這些操作在暫停中前後 world／RNG／命令紀錄不變。

紀錄（P2-A）：`style.css` 的 `.panel-hidden aside{display:none}` 改成 `.panel-hidden>aside{display:none}`（只藏 `main` 直屬的掌門簿側欄）。

| 項目 | 結果 | 證據 |
| --- | --- | --- |
| 修前 | ce4def8 上，新局（掌門簿收起）按導覽：`aria-expanded=true`、`hidden=false`，但 `display:none`、0×0；收起掌門簿後又消失；Escape 因面板不可見無法把焦點留在面板內 | 372-p2a-ui-before-fix-at-ce4def8-1440 |
| 修後 | 1440×900、1280×800（Mac 本機）：掌門簿收起時導覽有尺寸且在畫面內；開／收掌門簿導覽都在；鏡頭框高度＝Canvas CSS 高×span／Canvas CSS 寬，側欄開收時隨之改變；導覽自己開收、Escape 收起並把焦點還給按鈕；暫停中 world 快照不變；無頁面錯誤 | 372-p2a-ui-accepted-1440／1280 |
| 受影響重跑 | M43、M35 正常 UI 驅動通過 | m43-ui-372-recheck-1440、m35-ui-372-recheck-1440 |

驅動第一版把「鏡頭框跟著 Canvas 寬」寫成比寬度；框寬永遠等於 span，正確的可觀察量是框高，已改正並以修前版本重跑存證。
