# artifacts/review-fix
GPT review（2026-10-25，reviewed 77e1b2d，判定「須修改」）的重現與修正證據。原文見對話 t126u。
- `repro-4b9dcd9.log`：把新回歸測試放到修正前 head 4b9dcd9 跑的結果（7/8 失敗；P1-1 雙人取料情境在舊碼未觸發，改由原子取料反例與 smoke 長跑重現）。
- `longrun-results-old.json`：修正前 smoke（2/2 違反 warehouse over-reserved）。`longrun-results-smoke.json`：修正後 smoke 2/2 通過。
- `longrun.mjs`：35 案矩陣腳本（`node artifacts/review-fix/longrun.mjs 30`），延後執行。
- `flow-save-roundtrip.mjs`／`flow-save.log`／`flow-save-result.json`／`save-toast.png`：瀏覽器存讀往返。
- `test-full.log`：d2692d9 全套 213/213。
