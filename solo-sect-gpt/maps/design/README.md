# 場景設計檢視器

開啟 [index.html](index.html) 可切 S0／S1／S2、顯示／隱藏路線與站位、疊上成熟建築外框。窄視窗可選「放大檢視」後橫捲；SVG 也可獨立開啟放大。HTML 已內嵌三階段圖，其他圖走本目錄相對連結，無網路函式庫。

[世界全圖](world.svg)｜[家園 S2](S2.svg)｜[遠征](expedition.svg)｜[階段對照](stages.svg)｜[場景圖冊](../../docs/SCENE_ATLAS.md)

`build_atlas.py` 只生成離線設計檔，`layout.json` 是候選幾何，沒有遊戲模擬、時鐘或存檔。改圖時編輯生成器後重建；不可單改 SVG 後忘了同步資料。重建與自校（在獨立 checkout 根執行）：

```sh
python3 solo-sect-gpt/maps/design/build_atlas.py
/usr/bin/python3 solo-sect-gpt/maps/design/check_layout.py
```

本機預覽可在獨立 checkout 根執行 `python3 -m http.server 8876 --bind 127.0.0.1 --directory solo-sect-gpt`，開 `http://127.0.0.1:8876/maps/design/index.html`。這只是設計預覽，無 runtime；不使用8800、不部署。結束後關掉自己啟動的程序。

所有圖由 GPT／Codex 本次原創繪製，SCENE04 只作已目視的氣氛／拓撲參考，沒有把原水彩圖片複製進此資料夾。建築、門、路、站位在資料及 SVG 分層。視覺／設計自校不等同遊戲可走、碰撞或容量驗收。
