#!/usr/bin/env python3
"""武俠小鎮 W1：從本 repo 既有的自製水彩美術分支取素材（#562 W1）。

來源都是本專案（earth-ascension）自己的資產，不是上游 AI Town 美術：
  - codex/art184-watercolor-grok @ 16e2892c（#184 D37，Grok 山居水彩）
  - codex/art184-production-grok @ 032f09a9（#184 D35，地面平鋪）
輸出縮小後的副本到 tools/wuxia/art-src/（bake-tiles.py 的輸入），並寫 art-src/SOURCES.json。
用法（在 wuxia-town/ 下）：python3 tools/wuxia/prep-art-src.py
需要 git 能讀到上面兩個 commit（git fetch origin codex/art184-watercolor-grok codex/art184-production-grok）。
"""
import io
import json
import os
import subprocess
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "art-src")
WC = "16e2892c31c023bd56ff54ac641a07a188337067"
PR = "032f09a9e011d8c29209c73588510df7f15c6074"
WC_ASSETS = "sect-chronicle/experiments/water-carry/demo/assets/art184-watercolor"
WC_RAW = "sect-chronicle/experiments/water-carry/design/art184-watercolor/raw"
PR_GROUND = "sect-chronicle/experiments/water-carry/design/art184-production/ground"

# (輸出檔名, commit, 路徑, 最長邊上限 px)
ITEMS = [
    ("tex-meadow.jpg", WC, f"{WC_RAW}/tex-meadow.jpg", 512),
    ("tex-forest.jpg", WC, f"{WC_RAW}/tex-forest.jpg", 512),
    ("tex-water.jpg", WC, f"{WC_RAW}/tex-water.jpg", 512),
    ("far-mountains.jpg", WC, f"{WC_RAW}/far-mountains.jpg", 960),
    ("dirt-path.png", PR, f"{PR_GROUND}/dirt-path-tile-256.png", 256),
    ("flagstone.png", PR, f"{PR_GROUND}/flagstone-tile-256.png", 256),
]
for name, cap in [
    ("bamboo_clump", 170), ("boulder_l", 120), ("boulder_m", 90), ("boulder_s", 60),
    ("broadleaf_tree", 200), ("court_wall", 160), ("creek_bank", 110), ("dojo_gate", 150),
    ("dojo_main_hall", 340), ("dojo_side_house", 280), ("fern", 50), ("herb_bed", 170),
    ("herb_rack", 110), ("pine_a", 190), ("pine_b", 180), ("shrub_fern", 70),
    ("stone_bench", 120), ("stone_mill", 90), ("water_vat", 80), ("wild_grass", 46),
    ("woodpile", 110),
]:
    ITEMS.append((f"{name}.png", WC, f"{WC_ASSETS}/{name}.png", cap))


def git_blob(commit: str, path: str) -> bytes:
    return subprocess.run(
        ["git", "show", f"{commit}:{path}"], check=True, capture_output=True
    ).stdout


def main() -> int:
    os.makedirs(OUT, exist_ok=True)
    sources = {}
    for out_name, commit, path, cap in ITEMS:
        im = Image.open(io.BytesIO(git_blob(commit, path)))
        im.load()
        w, h = im.size
        scale = min(1.0, cap / max(w, h))
        if scale < 1.0:
            im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
        dst = os.path.join(OUT, out_name)
        if out_name.endswith(".jpg"):
            im.convert("RGB").save(dst, quality=88)
        else:
            im.save(dst, optimize=True)
        sources[out_name] = {"commit": commit[:8], "path": path, "size": list(im.size)}
        print(f"{out_name:22s} {w}x{h} -> {im.size[0]}x{im.size[1]}")
    with open(os.path.join(OUT, "SOURCES.json"), "w", encoding="utf-8") as f:
        json.dump(sources, f, ensure_ascii=False, indent=1, sort_keys=True)
        f.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
