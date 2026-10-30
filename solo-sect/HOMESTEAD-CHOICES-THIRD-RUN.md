# R21–R30 可移植試玩

版本：本文件所屬提交；分支 `codex/homestead-life-choices`，base `7b23f25ab2800a615409d2e1362441100716feb9`。成果本地未發布；其他機器不能僅憑分支名取回，需後續明確授權的交付。不要用舊版6bdc589冒稱此版。

## 啟動

在repo根目錄或交付ZIP解壓根目錄：

```sh
python3 -m http.server 8804 --bind 127.0.0.1 --directory solo-sect
```

開 `http://127.0.0.1:8804/homestead.html?frontier`。若埠已被使用，換自己的空埠；不關他人服務。多檔ES modules需HTTP，不雙擊HTML；玩本體不需npm或帳號。此版沿原存檔機制，沒有新增槽位／備份功能。

## 五分鐘辨認新選擇（世界可加速，非1×時長保證）

1. 新局選喜靜、「先學會應對」，保持自動用餐步調。只開16×看主角自己安家、耕作、料理、休息；重要事件自動降速可關。約第7日有餘裕時，可看見主角真坐在既有長凳吃一份餐。沒有工作或建造命令是這條自主測試的前提。
2. 另一次新局選開朗、同樣先學應對與auto；不必逐次聊天派工，安家有餘裕且林舟願意／有食慾時，會真備餐、走到兩個座位等齊、各吃一份。人物不一定每次走完全相同路線；有工程／急需／對方不願意時不保證共食。
3. 展開防線／招式細節：選自選招，與固定招比較；有限練步選基本或熟習，達標會停，暫緩不禁止真交手。
4. 選避戰：有屋後遇足跡會回屋等候；急需吃睡及搬運優先，不是無敵罩。恢復應戰不自動撤銷先前近山暫緩，仍可另外允許再考慮。
5. 合作需真缺材及對方願意。開自動商量只代替提出一次請求，木材仍要砍與搬；全暫停工程不會求工。手動命令、獨處、快吃、節儉仍可改方向。

## 可重跑檢查

Node24：

```sh
cd solo-sect
node --test test/*.test.mjs
node tools/homestead-frontier-acceptance.mjs
node tools/homestead-choices-comparison.mjs
node tools/homestead-frontier-compat.mjs --output CHOICES-R30-COMPAT.json
```

真歷史讀取器檢查需git物件 `556e40ec5f6b18b663b6a383c60d90432b5d318c`；不含.git的ZIP不能假稱跑過此歷史驗證。正式工具預設寫 `CHOICES-R30-METRICS.json`，可用 `HOMESTEAD_METRICS`換輸出。LCG是命令回放，不宣稱隨機世界樣本。

正常UI工具需你環境已允許的Playwright與Chromium：

```sh
HOMESTEAD_PLAYWRIGHT=/path/to/playwright/index.mjs HOMESTEAD_CHROMIUM=/path/to/chromium node tools/homestead-choices-autonomy-browser.mjs quiet R30
```

也可用 `HOMESTEAD_URL`換自有HTTP origin。不下載被拒絕的引擎、不繞政策。全驗收、作者／非作者界線見 `HOMESTEAD-CHOICES-THIRD-REVIEW.md`，逐輪規格／回顧見 `HOMESTEAD-CHOICES-THIRD.md`。

## 真人探索腳本（尚未執行）

建議3–5位，每位20–30分鐘：先不派工觀察，再任選快吃／慢餐、獨處／共食、有限練習及避戰／應戰。記第一次不懂的原因、能否指出真成本、介入是否改方向、等待是否值得、是否想再回來。不暗示應喜歡、不拿小樣本當市場調查。輔具、真機Safari／手機及其他OS也未驗；Chromium自動化不代表這些已通過。
