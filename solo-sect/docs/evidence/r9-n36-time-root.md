# N36 根因修正：前搖內做過的動作，不在落下後再做一次

2026-11-07 台北時間。這是根因修復checkpoint，**normal兩路仍FAIL**，不是第九輪完成。

## 最小真反例與來源行
1. 原`n38-waves-normal17`兩路第一個符合r+m≤T卻沒有反擊的真窗口在t=.75：r=.48624304581713246、m=.004323954075174684、T=.7，L=1.6071428571428574。這拍的**不反擊本身正確**，因#446明確要求L≥1不能反擊；不能見到r+m可行就刪L gate。原角色眼熟{}，兩個真來招各需要.6秒，並非工具已養成刀賊眼熟。
2. 發現工具當時沒有走真地圖`sim.mjs`/`threat.mjs`的interceptOpening：直到落下才抽反應，忽略了起手截擊和同一次抽樣，與真實世界不同。修工具使用起手抽樣、若即時截則同一finish，否則opening原封傳到落下；不變人物/敵人數、位置、武器、HP、40秒、seed、門檻。原/修工具不是同一RNG路徑，不能把數字變化全部說成平衡改善。
3. 只修工具後，第一個對應窗口在t=1（招實際[0,.8]，固定步長到1才處理）：r=.6822403087503717、step=.1、m=.004323954075174684、L=1.5，不反擊仍正確。但`arts.mjs settleDefense`舊式`max(busyUntil,now)+used+recovery`把已在[0,.8]完成的.7822403087503717秒再排到**1.7822403087503718**。另一同刻來招隨後又排hitRecover，變2.132240308750372，污染下一拍負荷/可用時間。這不是實際第二個動作，是把同一反應移步收兩次時間。
4. 共用修正：`clashTimes`保存絕對`windowStart/windowEnd`（現arts.mjs約1317），`resolveSwingCore`（約1381）以真宣告到達時刻和前次真動作終點求剩餘窗，不拿較晚處理tick憑空加可反應秒數；`settleDefense`（約1342）只保留`max(原占用,開始+實用秒數,真接觸+回復)`，沒回復就不把已完成動作終點硬拉到now。回復沿既有.20/.35秒，沒有新常數/勝率調整。此函式就是人/獸/賊、地圖/試煉/交手共用路徑。
5. 同一真快照、同一工具起手路徑，修後第一拍busyUntil=.7822403087503716。第二個同刻來招只剩**.017759691249628395秒**，依然中招，busyUntil=1.35。不是把前一動作免費抹掉讓兩招都能躲；原N36唯一小測試新增此串行回歸斷言。

完整三階段第一個窗口、角色實際busy/next/cool/swing/eyes、每個攻方need/window/share/active和摘要在`r9-n36-time-root17.json`。程式來源見`arts.mjs:clashTimes/settleDefense/resolveSwingCore`、`tools/waves.mjs:capture/finish`；數值不是按新造fixture挑出來的。

## 重新生成／本地隔離診斷
```
node solo-sect/tools/waves.mjs --seed 17 --trait normal --snapshot-out out/real60.json --log out/full.json
node solo-sect/tools/waves.mjs --seed 17 --trait normal --snapshot-in out/real60.json --log out/replay.json
bash solo-sect/test/run.sh smoke
```
- 第一行在乾淨clone由公開指派日程產生真60日snapshot，未灌n/f/資源；可任選seed。不需要預存機器私有檔案或新增依賴。
- snapshot-in僅加速同一個真角色的逐拍根因診斷，驗seed/day60/id/hash。檔案由snapshot-out產生，不可編輯人物。不是把新版本60日歷史也已跑過的證明；修模擬後整輪收尾仍須不用snapshot-in重產。
- 本次隔離輸入為**修前7c5d9b0**公開日程真60日，eventHash `9180d6f130d7a6a18ba7f9c57f5c1a1bcaf86254a6cd3bb710aaa695b8f0c7c4`。它是受控train/chop/water日程，**不是自然bot玩法**。原檔在`/workspace/specs/t200u-live/n36-real-snapshot17.json`，原始逐拍n36-root-{before,opening,timefix}17.log.json。
- 只修工具起手路徑時，1/2/4路counter=0/0/3；再修共用時間後=**1/0/2**，各自超載counter都0；兩路HP損失77.52380952380949，**pass=false**。不將一個counter改善或四路後來有人逃走的counter說成兩路通過。
- 最新smoke19/19、fail0，沒有本地full suite。N36仍只有原來一個小測試，沒有新增第二個。

## 還沒修，不隱藏
兩路仍沒有反擊：第一個窗口本來L就≥1，不能強行通過。剩下需檢查共用攻意預測仍把「持續有目標，但正在冷卻/回復、沒有在途招」當作立刻可出招，未把**真正下一次可起手秒數**加入來招窗；這是下一個獨立根因候選，不是現在已修，也不能刪待命敵人湊L。冷卻/攻意欄已進逐拍輸出，足以逐拍核對。也要區分真刀/拳眼熟與N55受控身體練習，不能灌f。

未碰舊learn來源/N50入門規則、N51事件或出現率；未動傷害/反應/學習常數。既有N34/N35/N38/N50/N55量測皆需在最後模擬重新驗，這次沒有以舊數字說新head全綠。未push/PR/CI/3.4/golden/影片。
