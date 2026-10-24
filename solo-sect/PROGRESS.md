# 進度
- v0.1 可玩：`python3 -m http.server` 於 repo 根或 solo-sect/ 開 `solo-sect/index.html`（需經 http，不可 file://）。
- 測試：`node --test solo-sect/test/`（7/7）。
- 截圖：`node solo-sect/shoot.mjs`（PW=playwright-core 路徑；臨時 port 18931，finally 關閉）→ `shots/01–06`。

## 已知限制
- 地圖為示意路網，尚未換成 SCENE04 母版；設施精靈尺寸未精修。
- 動作僅以傾斜/搖擺/招式軌跡表現，無逐幀動畫。
- 只有宿舍一項可建；膳房/菜園為單階段。
- 平衡為 demo 速度（約 15 遊戲分鐘可見學招、關係升階）。

## 版本
- v0.2：日夜（600s/日，晨日暮夜）＋作息權重、菜畦播種→成熟→收菜→灶煮飯→用飯、膳房為第二建造案。

## 接續點
v0.2：作息表＋日夜、膳房煮食鏈、第二個建造案（膳房），見 DESIGN.md 路線表。
