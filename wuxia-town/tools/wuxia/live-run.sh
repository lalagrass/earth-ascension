#!/usr/bin/env bash
# 武俠小鎮 W0：live 實測（#552 範圍 9）。需要：已能跑的 Convex 部署（`npx convex dev`，本機或 Docker 自架）、
# LLM 端點（Ollama／OpenAI 相容）。這支腳本不是驗收的一部分；驗收只需要它產生的 journal。
# 用法：MINUTES=10 OUT=/tmp/live-qwen15 bash tools/wuxia/live-run.sh
# 會：清空資料表 → init（5 人）→ 每 60 秒 heartbeat（避免閒置停機）→ 時間到停引擎 →
#     匯出 journal、用量（wuxiaLlmUsage）、對話訊息到 $OUT.*
set -euo pipefail
MINUTES="${MINUTES:-10}"
OUT="${OUT:-/tmp/wuxia-live}"
cd "$(dirname "$0")/../.."
run() { npx convex run "$@"; }
run testing:wipeAllTables >/dev/null
run init >/dev/null
sleep 3
WORLD=$(run wuxia/journal:defaultWorld '{}' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).worldId))')
echo "world $WORLD; running ${MINUTES} min"
START=$(date +%s)
END=$((START + MINUTES * 60))
while [ "$(date +%s)" -lt "$END" ]; do
  run world:heartbeatWorld "{\"worldId\":\"$WORLD\"}" >/dev/null || true
  sleep 60
done
run testing:stop >/dev/null || true
sleep 5
DAY=$(date -u +%Y-%m-%d)
run wuxia/llmBudget:report "{\"day\":\"$DAY\"}" > "$OUT.usage.json"
run wuxia/journal:messages "{\"worldId\":\"$WORLD\"}" > "$OUT.messages.json"
npx tsx tools/wuxia/journal.ts export --world "$WORLD" --out "$OUT.jsonl" --note "live ${MINUTES}min"
echo "start=$START end=$(date +%s)" > "$OUT.meta"
