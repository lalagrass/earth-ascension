#!/usr/bin/env bash
# 下載上游 AI Town（a16z-infra/ai-town @ 1b2f7d8）的美術、音樂、字型到本機工作目錄，
# 只為了在本機跑原版畫面。這些檔案授權條款不明（見 #548），已被 .gitignore 排除，不可 commit。
# 用法：bash tools/wuxia/fetch-upstream-assets.sh   （在 wuxia-town/ 下執行）
set -euo pipefail
UPSTREAM_COMMIT="1b2f7d8b824c7bc679017a091d9d45ba3dc3029e"
BASE="https://raw.githubusercontent.com/a16z-infra/ai-town/${UPSTREAM_COMMIT}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LIST="${ROOT}/tools/wuxia/upstream-assets.txt"
cd "$ROOT"
n=0
while IFS= read -r path; do
  [ -z "$path" ] && continue
  mkdir -p "$(dirname "$path")"
  if [ -s "$path" ]; then continue; fi
  curl -fsSL --retry 3 -o "$path" "${BASE}/${path}"
  n=$((n + 1))
done < "$LIST"
echo "fetched ${n} upstream asset(s) into ${ROOT} (gitignored; do not commit)"
