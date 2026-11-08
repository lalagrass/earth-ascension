#!/usr/bin/env bash
# loop145：一鍵跑測試。用法：bash test/run.sh [quick|all|archive|accept|golden|smoke]
#   quick（預設）：test/unit/<系統>/ 的短測試與資產檢查
#   all：unit ＋ archive（歷史回歸）＋ accept（長跑驗收）
#   accept：只跑 test/accept/
#   golden：唯一隱居 golden（tools/golden.mjs --check）
#   smoke（#402）：玩法 PR 最小驗證，同版隱居存讀、兩種子各 10 日與結構不變量。
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
    node tools/audit-hermitage-constants.mjs --check || exit 1
    node test/smoke.mjs || exit 1
    exec node --test test/unit/save/schema-invariants.test.mjs test/unit/growth/white-body.test.mjs test/unit/growth/h0-hermitage-isolation.test.mjs test/unit/growth/r4-scenarios.test.mjs test/unit/growth/r10-lineage.test.mjs test/unit/growth/r11-recipe.test.mjs test/unit/growth/r3-manuals.test.mjs test/unit/growth/phase4-hermitage-duo.test.mjs test/unit/growth/phase5-labor-herbal-diet.test.mjs test/unit/growth/phase6-awakening-cliff-qinggong.test.mjs test/unit/growth/phase7-dual-lineage-sect.test.mjs test/unit/social/n46-memory.test.mjs test/unit/social/r7-family.test.mjs test/unit/social/r8-rumor.test.mjs test/unit/social/n58-admission.test.mjs test/unit/social/n58-work-slot.test.mjs test/unit/growth/n40-luohan-book.test.mjs test/unit/growth/n41-life-study.test.mjs test/unit/growth/n42-substrate.test.mjs test/unit/growth/n61-card.test.mjs test/unit/threat/n43-rhythm.test.mjs test/unit/world/n45-map-bout.test.mjs test/unit/world/n47-facility.test.mjs test/unit/world/n51-visitor.test.mjs test/unit/threat/n44-teamwork.test.mjs test/unit/world/n62-foray.test.mjs test/unit/economy/v155a.test.mjs test/unit/economy/v155b.test.mjs
    ;;
  *) echo "用法：bash test/run.sh [quick|all|archive|accept|golden|smoke]"; exit 2 ;;
esac
