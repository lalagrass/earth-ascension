#!/usr/bin/env bash
# loop145：一鍵跑測試。用法：bash test/run.sh [quick|all|archive|accept|golden|smoke]
#   quick（預設）：test/*.test.mjs（各版 v*、sim 與領域測試）
#   all：quick ＋ test/archive/（loop 歷史回歸）＋ test/accept/（驗收：M1 傳記分類 48 種子，約 70 秒）
#   accept：只跑 test/accept/
#   golden：R0（#388）完整行為鎖定矩陣＋舊檔回放（tools/golden.mjs --check；重構 PR 必跑，4 核約 5 分鐘）
#   smoke（#402）：玩法 PR 最小驗證，約 30 秒。舊存檔各跑 3 日、兩種子新局各跑 10 日、結構不變量。
cd "$(dirname "$0")/.." || exit 1
case "${1:-quick}" in
  quick)
    node tools/check-assets.mjs || exit 1
    node tools/label-overlap.mjs --seed 1 --day 10 --phase dawn > /dev/null || exit 1
    node tools/r9b-acceptance.mjs --seed=17 || exit 1
    exec node --test test/*.test.mjs
    ;;
  archive) exec node --test test/archive/*.test.mjs ;;
  accept) SS_DT=${SS_DT:-0.25} exec node --test test/accept/*.test.mjs ;;
  all) SS_DT=${SS_DT:-0.25} exec node --test test/*.test.mjs test/archive/*.test.mjs test/accept/*.test.mjs ;;
  golden) exec node tools/golden.mjs --check ;;
  smoke)
    node test/smoke.mjs || exit 1
    exec node --test test/schema-invariants.test.mjs test/white-body.test.mjs
    ;;
  *) echo "用法：bash test/run.sh [quick|all|archive|accept|golden|smoke]"; exit 2 ;;
esac
