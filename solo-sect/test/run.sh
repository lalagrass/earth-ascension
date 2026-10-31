#!/usr/bin/env bash
# loop145：一鍵跑測試。用法：bash test/run.sh [quick|all|archive]
#   quick（預設）：test/*.test.mjs（各版 v*、sim 與領域測試）
#   all：quick ＋ test/archive/（loop 歷史回歸，約 30 秒）
cd "$(dirname "$0")/.." || exit 1
case "${1:-quick}" in
  quick) exec node --test test/*.test.mjs ;;
  archive) exec node --test test/archive/*.test.mjs ;;
  all) exec node --test test/*.test.mjs test/archive/*.test.mjs ;;
  *) echo "用法：bash test/run.sh [quick|all|archive]"; exit 2 ;;
esac
