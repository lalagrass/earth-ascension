# N35 自然悟招逐日帳

在 `solo-sect/` 以 Node 22 執行：

```sh
node tools/glimmer-metrics.mjs --days=30 > artifacts/n35-natural/default-30.json
node tools/glimmer-metrics.mjs --days=60 > artifacts/n35-natural/default-60.json
node tools/glimmer-metrics.mjs --days=30 --wu=3 > artifacts/n35-natural/wu3-30.json
node tools/glimmer-metrics.mjs --seed=1001 --days=30 --hunt-every=3 > artifacts/n35-natural/hunt-every-3-seed1001.json
PW=/path/to/playwright-core/index.mjs node tools/n35-ledger-chart.mjs
```

預設 seed 為 1001–1012；`--seed` 可指定其他整數。`daily` 包含每個完成日各招匹配、失手、主角失手、當日進度事件總 `w`、主角保存進度、已悟招及全門最高進度比。執行時會驗證每日增量與最終計數及主角保存進度相符，失敗即 throw。`--hunt-every=3` 是玩家合法出獵的輸入，與無玩家巡獵的自然 bot 日程分開。

`bot12-base.json` 為 #501 head、`bot12-head.json` 為此診斷 PR head；命令為 repo 根目錄下 `docker run --rm -v "$PWD:/work" -w /work node:22-bookworm-slim node solo-sect/tools/bot12.mjs solo-sect --json`。兩檔需逐位相同，因沒有模擬更動。圖只由兩份 30 日 JSON 畫出，不改遊戲素材或存檔。
