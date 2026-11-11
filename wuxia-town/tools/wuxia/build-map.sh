#!/usr/bin/env bash
# 武俠小鎮 W1：重產地圖與人物圖（#553）。
#   1. bake-tiles.py：水彩底圖 → public/wuxia/tiles/town.jpg＋Tiled 原檔 data/wuxia/tiled/town.tmj
#   2. 上游 data/convertMap.js：Tiled JSON → data/wuxia/town-map.js（上游工具原樣使用，輸出到暫存目錄再搬）
#   3. bake-folk.py：8 個古裝人物 → public/wuxia/characters/folk.png
# 需要 python3（numpy、scipy、Pillow）與 Noto Serif CJK 字型。素材來源見 tools/wuxia/prep-art-src.py。
set -euo pipefail
cd "$(dirname "$0")/../.."
python3 tools/wuxia/bake-tiles.py
python3 tools/wuxia/bake-folk.py
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
(cd "$tmp" && node "$OLDPWD/data/convertMap.js" "$OLDPWD/data/wuxia/tiled/town.tmj" /ai-town/wuxia/tiles/town.jpg 1536 1152)
{
  echo '// 武俠小鎮 W1：由 tools/wuxia/build-map.sh 產生（Tiled 原檔 data/wuxia/tiled/town.tmj → 上游 data/convertMap.js），請勿手改。'
  cat "$tmp/converted-map.js"
} > data/wuxia/town-map.js
echo "data/wuxia/town-map.js written"
