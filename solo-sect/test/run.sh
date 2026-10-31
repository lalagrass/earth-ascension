#!/usr/bin/env bash
# loop145：一鍵跑測試。用法：bash test/run.sh [quick|all|archive|accept]
#   quick（預設）：test/*.test.mjs（各版 v*、sim 與領域測試）
#   all：quick ＋ test/archive/（loop 歷史回歸）＋ test/accept/（驗收：M1 傳記分類 48 種子，約 70 秒）
#   accept：只跑 test/accept/
cd "$(dirname "$0")/.." || exit 1
case "${1:-quick}" in
  quick) exec node --test test/*.test.mjs ;;
  archive) exec node --test test/archive/*.test.mjs ;;
  accept) SS_DT=${SS_DT:-0.25} exec node --test test/accept/*.test.mjs ;;
  all) SS_DT=${SS_DT:-0.25} exec node --test test/*.test.mjs test/archive/*.test.mjs test/accept/*.test.mjs ;;
  *) echo "用法：bash test/run.sh [quick|all|archive|accept]"; exit 2 ;;
esac
