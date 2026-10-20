#!/bin/sh
# 把共用素材與 scene.json 複製進 Godot 專案（res:// 只能讀專案資料夾內的檔案），再讓 Godot 匯入。
# 用法（在 spikes/godot 下）：GODOT=/path/to/godot sh tools/sync-assets.sh
set -e
cd "$(dirname "$0")/.."
rm -rf shared && mkdir -p shared
cp -r ../shared/assets ../shared/scene.json shared/
"${GODOT:-godot}" --headless --import --path . >/dev/null 2>&1 || "${GODOT:-godot}" --headless --editor --quit --path . >/dev/null 2>&1
echo "synced $(ls shared/assets | wc -l) assets"
