#!/usr/bin/env bash
# loop145：一鍵跑測試。用法：bash test/run.sh [quick|all|archive|accept|golden]
#   quick（預設）：test/*.test.mjs（各版 v*、sim 與領域測試）
#   all：quick ＋ test/archive/（loop 歷史回歸）＋ test/accept/（驗收：M1 傳記分類 48 種子，約 70 秒）
#   accept：只跑 test/accept/
#   golden：R0（#388）完整行為鎖定矩陣＋舊檔回放（tools/golden.mjs --check；重構 PR 必跑，4 核約 5 分鐘）
cd "$(dirname "$0")/.." || exit 1
case "${1:-quick}" in
  quick) exec node --test test/*.test.mjs ;;
  archive) exec node --test test/archive/*.test.mjs ;;
  accept) SS_DT=${SS_DT:-0.25} exec node --test test/accept/*.test.mjs ;;
  all) SS_DT=${SS_DT:-0.25} exec node --test test/*.test.mjs test/archive/*.test.mjs test/accept/*.test.mjs ;;
  golden) exec node tools/golden.mjs --check ;;
  *) echo "用法：bash test/run.sh [quick|all|archive|accept|golden]"; exit 2 ;;
esac
