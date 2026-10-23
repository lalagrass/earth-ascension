# 生成紀錄

實際繪圖：Grok Build 的 Imagine（image_gen、image_edit、reference_to_video）。沒有第三方貼圖，沒有取用《活俠傳》或《天下霸圖》的圖檔。參考只留官方頁，不把印象寫成已核對的原作特徵。

- 《活俠傳》Steam：https://store.steampowered.com/app/1859910/?l=tchinese
- 同鏡頭底圖的位置來自本庫 `spikes/shared/scene.json` 與 `demo/routes.mjs`，由 `scene.svg` 重畫，不是把舊 PNG 濾鏡化。

| 檔案 | 做法 |
|---|---|
| `paint/characters-daily.jpg` | 兩人同張生成，再改成露腳的全身 |
| `paint/characters-tired.jpg` | 由日常稿只改臉。熟手的汗滴仍偏多 |
| `paint/turnaround.jpg` | 由日常稿改成正面、側面、背面 |
| `paint/novice-side.jpg`、`paint/skilled-side.jpg` | 由日常稿各取一人、朝右側面 |
| `paint/novice-carry.jpg` | 由主角側面加上扁擔與兩桶 |
| `paint/scene-mood.jpg` | 材質氣氛。鏡頭已離開遊戲構圖，不能當同鏡頭替換 |
| `motion/skilled-walk.mp4`、`motion/novice-carry.mp4` | 各 6 秒，首尾釘在同一張側面，480p |
| `source/scene.svg` | 手寫向量，1600×900，可直接改 |

影片關鍵幀用 ffmpeg 以每秒 2 張抽出，再挑進 `motion/frames/`。
