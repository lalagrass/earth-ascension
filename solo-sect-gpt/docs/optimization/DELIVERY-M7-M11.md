# M7–M11 交付

2026-10-26；實際主筆 Claude Opus 5.5（Anthropic，經 Claude Code 在擁有人 Mac 上執行），單一作者，作者自校。分支 `codex/solo-sect-gpt`，起點 `292bc9a`，只改 `solo-sect-gpt/`；本機 commit，沒有 push／PR／merge／部署。M1–M6（GPT / Codex）的文件、標記與證據沒有改寫。

## 開啟

```sh
cd /Users/chenyuying/.codex/worktrees/solo-sect-gpt/earth-ascension
python3 -m http.server 8879 --bind 127.0.0.1 --directory solo-sect-gpt
```

開 <http://127.0.0.1:8879/>（8878 若已有別的服務在跑，不要停它）。新局或在「存檔→匯入」讀 `evidence/optimization/showcase/showcase-all-features.save.json` 後按繼續；在人物／經營／遠征頁按各自的「採用／升級」才會啟用 M9–M11 的新規則。

## P2：原因與修法

遠征用「領糧活動＋storyBusy」代表擁有這個人，但切磋（`beginSpar` 內的 `cancel`）和個別叫回（`begin('return')` 內的 `cancel`）只拆掉領糧活動，沒有釋放或轉移擁有權；`expeditionTick` 只等「全員已領糧」，沒有發現已經沒人在領糧；invariants 只查物資與幾何，沒有活性條件，所以存讀後仍卡住，也無法再派新遠征。同類路徑還有：對隊員下 task／stop 會把整隊設成沒有出口的 `halted`。

修法（M7）：`src/commitment.mjs` 從既有欄位推得每個人唯一的擁有者，`command()` 在任何副作用前經 `ownershipGate` 判定；新的共享安排不能搶走別人的人；遠征隊員的個別改派被拒並提示召回全隊；個別叫回在準備中＝全隊取消出發（釋放預約、手上糧保留），出門後＝全隊實走返院。低層 `beginSpar` 不加限制，營地切磋照舊。舊卡住存檔讀入後顯示診斷、記一次事件，按「全隊召回／取消出發」恢復，不補物資。新的 5 seed×64 指令序列測試對舊程式在第 20 個指令就抓到卡死。

## 各階段

| 階段 | 玩家可見改變 | runtime commit | 標記 | 正常 UI |
| --- | --- | --- | --- | --- |
| M7 | 拒絕／轉移明確，卡局可恢復 | 226b546 | 6ce2816（done） | m7-ui-accepted-1440／1280 |
| M8 | 情境卡、具體阻擋建議、分組、地圖狀態膠囊、對比 | 76d7a77 | 5f0ca0e（done） | m8-ui-accepted-1440／1280 |
| M9 | 經營簿、分欄不重複、時間與瓶頸、備糧真的生效、事前比較 | 145e639 | 52b38d9（done） | m9-ui-accepted-1440／1280 |
| M10 | 遠行 v2：份數、撤退線、預估、沿途紀錄、返院報告 | 5732a27 | f388227（done_with_exception） | m10-ui-accepted-1440／1280 |
| M11 | 一師一徒、約定、共同記憶、依歷史的一次性後續 | 048f6b6 | optimization-m11.done.json | m11-ui-accepted-1440／1280 |

## 測試

- 模型／整合：150 項全過（`evidence/optimization/m11-model/m11-regression.log`）；起點 120 項。
- 根契約：Python 53、SG dev 383、Earth 語法、`git diff --check 292bc9a..HEAD` 皆在 048f6b6 實跑通過（m11-model/root-*.log）。SG main／manual 完整 RT 矩陣沒有跑（不屬此私人本機交付）。
- 正常 UI：每階段 1440×900 與 1280×800 都只經正式 UI 操作；牆鐘、4× 倍率與實際 ticks 在各 summary.json。失敗與受干擾的執行都保留並標示。

## 必須知道的結果與限制

- M10 一項事前方向「帶 3 份糧抵達精力比 1 份高」沒有成立，照實標為未通過（標記 done_with_exception）。
- M11 期間發現並修正兩個 M10 v2 缺口（謹慎撤退的生命條件、返程被纏鬥後停住），已在 M10.md 補記；5732a27 的紀錄不改寫。
- M9 比較只有兩個真正獨立的起點（新局換 seed 結果相同），且兩起點都沒有工地，測不到修屋收益；備糧的乾糧儲備會和做飯搶菜。
- Serena：第一個 session 未載入；重啟後自動啟用在原 checkout（並在那裡建立未追蹤的 `.serena/`），沒有 activate_project 可切換，因此全程未用 Serena，以 rg 與局部讀取完成。
- 作者自校，沒有獨立 review；真人試玩未執行，計畫見 [PLAYTEST](PLAYTEST.md)。done 只代表列出的軟體驗收成立。
