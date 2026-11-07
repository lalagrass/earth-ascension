#!/usr/bin/env bash
# loop145：一鍵跑測試。用法：bash test/run.sh [quick|all|archive|accept|golden|smoke]
#   quick（預設）：test/unit/<系統>/ 的短測試與資產檢查
#   all：unit ＋ archive（歷史回歸）＋ accept（長跑驗收）
#   accept：只跑 test/accept/
#   golden：R0（#388）完整行為鎖定矩陣＋舊檔回放（tools/golden.mjs --check；重構 PR 必跑，4 核約 5 分鐘）
#   smoke（#402）：玩法 PR 最小驗證，約 30 秒。舊存檔各跑 3 日、兩種子新局各跑 10 日、結構不變量。
cd "$(dirname "$0")/.." || exit 1
case "${1:-quick}" in
  quick)
    node tools/check-assets.mjs || exit 1
    node tools/label-overlap.mjs --seed 1 --day 10 --phase dawn > /dev/null || exit 1
    node tools/r9b-acceptance.mjs --seed=17 || exit 1
    exec node --test test/unit/*/*.test.mjs
    ;;
  archive) exec node --test test/archive/*.test.mjs ;;
  accept) SS_DT=${SS_DT:-0.25} exec node --test test/accept/*.test.mjs ;;
  all) SS_DT=${SS_DT:-0.25} exec node --test test/unit/*/*.test.mjs test/archive/*.test.mjs test/accept/*.test.mjs ;;
  golden) exec node tools/golden.mjs --check ;;
  smoke)
    node test/smoke.mjs || exit 1
    exec node --test test/unit/save/schema-invariants.test.mjs test/unit/growth/white-body.test.mjs test/unit/social/n58-admission.test.mjs test/unit/social/n58-work-slot.test.mjs test/unit/growth/n40-luohan-book.test.mjs test/unit/growth/n41-life-study.test.mjs test/unit/growth/n42-substrate.test.mjs test/unit/growth/n61-card.test.mjs test/unit/threat/n43-rhythm.test.mjs test/unit/world/n45-map-bout.test.mjs test/unit/world/n51-visitor.test.mjs
    ;;
  *) echo "用法：bash test/run.sh [quick|all|archive|accept|golden|smoke]"; exit 2 ;;
esac
