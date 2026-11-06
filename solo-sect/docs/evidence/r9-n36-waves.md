# N36 歷史探索量測（不能當完整驗收通過）

**N37開工重讀#446後糾正：原文未授權aggregate；下表的probe pass是舊聚合判法，不能宣稱滿足N36。新工具每trait/每seed分別檢查1及2路。normal seed17的FAIL保留，修共用機制後重跑。**

這張表對應本N36提交；N37改受力/傷口後須重跑，不能代表往後head。Node22/24、無額外套件、無網路。每條命令真跑60日受控公開指派史，再做固定.25步的受控交戰；入場回滿HP/精力，沒有灌n/f。不是自然放生存活率，也沒有桌面實拍。兩個種子樣本不是任意seed已證明。

| seed/組合 | L≥1接法筆數 | 其中反擊 | 1路反擊 | 2路反擊 | 四狗open→cover | 冷靜/急躁搶攻 | 冷靜/急躁損血 | probe pass |
|---|---:|---:|---:|---:|---|---|---|---|
| 17/all3 | 110 | 0 | 1 | 1 | 2.883021803→0.720755451 | 3/4 | 48/138 | true |
| 904/calm,rash | 41 | 0 | 3 | 1 | 2.883021803→0.720755451 | 0/5 | 18/120 | true |

## 命令、原始檔雜湊

- `node solo-sect/tools/waves.mjs --seed 17 --log out/waves-17.json`
  - 原始完整逐拍JSON：工作box `/workspace/specs/t200u-live/n36-waves-release-default17.json`；reviewer可在乾淨clone重產，不依賴這個box路徑。
  - JSON SHA256 `90d6ba3240b961e6a11d77dce04e6fcb61c9f2fc5ff6e821430b1d4c807b5e07`；真60日事件SHA256 `4c326479897f5cdba30b225ffe26f5d01070b5c4097186abf30abcb742caa44d`。
- `node solo-sect/tools/waves.mjs --seed 904 --trait calm,rash --log out/waves-904.json`
  - 原始完整逐拍JSON：工作box `/workspace/specs/t200u-live/n36-waves-release-904.json`；reviewer可在乾淨clone重產，不依賴這個box路徑。
  - JSON SHA256 `28f12aa441cbd25f2ee3b9d5ba729a06aafe2ffc0f4e1403729067fdfe362f5d`；真60日事件SHA256 `945ae9e64c0df6df37146b5fa4676337969776815e4c320de936734359ec914d`。

## 不隱藏的邊界與失敗
- 預設包含calm/normal/rash，1/2路門檻是整個探針「各有情境出現反擊」，不是每個性格都必須反擊。seed17的normal三場反擊全0；先前normal單跑exit1、pass=false。現在預設仍完整列出normal原始行，沒有刪掉它。N29惱羞會禁止反擊，N37後仍要重驗，不說每個個性/任意種子全綠。
- 四狗probe先真接20次，眼熟15.8845476397、接後HP73，再換同一人物位置；不是陌生白身本來就能接.4秒狗咬。
- 後方50px的狗/跑者，8秒/.25步真速度追及：兩種子跑者各有11拍追擊接觸，不跑0拍。這只測資料chase/真移速，不是完整被咬率；不跑者仍可能在主遊戲被普通接近與攻擊。**自然玩法的跑/不跑追上比例尚待整輪補驗**。
- 逃敵單元驗uid、n/f、悟招/選招保留的通路；真主畫面已接，但沒有桌面驗證傷疤/假衝/援軍。N37之前仍是HP傷害，非分層筋骨傷。
- 中途有真FAIL：出口未離場造成比較偏差、把低定力誤作膽怯、把待命武器誤作每秒來招而互等死鎖；已依世界內理由修正，沒有改命中率、傷害或門檻湊數。舊檔不是本提交證據。
- smoke16/16、fail0，唯一N36小測試包含四狗/掩體、L≥1無反擊、待命無虛構攻意、人格承受風險、掩體超載預留應接、逐步移動與逃敵記憶。未跑完整suite；第九輪未push/開PR/CI。RULES_VERSION仍3.3，golden/save尚未改，不能說第九輪golden全綠。
