# N34 真思考、可見動作與共同提交：根因修復，驗收仍FAIL

## issue與世界內理由
已重新讀#444/#446完整live正文（含2026-11-06追加）。#444說決定時間吃掉群戰窗口，熟悉情境才能零思考；不等於思考時身體已經露出起手供人截。思考仍真付Hick時間/busy、能被打，不退費、不拉長敵人原前搖。RPD的第一個可行做法與動作遊戲anticipation（起手訊號）是不同階段；採固定步長觀測/提交邊界，沿同步模擬的read/compute/commit機制，避免先遍歷者看到別人同拍尚未宣告的招。沒有引進引擎或依賴，沒有改反應/手熟/眼熟/怪率/力量常數。

## 真根因與修法
修前`pick.seconds`被sim/threat/duel/waves各自加進wind，並立刻interceptOpening；normal效用只看射程，不看可觀測期限。prepared60同一人物的原第一筆就是**t0**被foe0看破toolStone，T1.0048909124、r.3317225092＋strike.5；需要.8317225092秒的回手卻在0秒扣了狀態。可見wind含Hick .6918863237，真正身體前搖只有.3130045887；思考不但被當起手，反擊還瞬移到了開始那刻。

現在所有正式地圖路徑（首狗/狩獵/守柵）、duel/waves共用：
1. `prepareCombatMove`選擇→真combatDecision，單一busy預留；未到期不重抽，沒有swing/warn/起手。取消指派不退已占秒數，收養新人不繼承父母思考。思考中仍會被真攻擊。
2. 每固定步開始記可觀測狀態；選招/戰術只讀該共同快照的已宣告目標/在途招。不預知同拍後宣告的敵意。RPD/Thompson仍只在對應穩定/不穩定情境使用。
3. 一般人用可見剩餘時間檢查`Hick+實際前搖 <= window`；沒有可行招就花該花的思考再防守，而不是貪長招。惱羞的舊習慣仍可能硬搶。思考後若原招已不及/失去來源/換目標就放棄，不免費換成快招。
4. 本步舊落招先結算，才提交新的思考占用/動作提案。全體身體起手先同時發佈，再算所有opening；不讓新攻擊/新思考倒扣同拍已發生的防守窗口。原招被本步接法占用而無法起手時不耗工具/精力/冷卻；真起手才各付原1精力一次（也移掉狩獵原落招再扣一次的重複扣費）。每個隊伍各自仍按原冷卻長度，Hick另付真時間，不免費消除。
5. 不在起手當刻瞬間扣看破傷害。共同`combatSwingReady`讓可行截擊到`windowStart+r+strike`後才結算，否則原招到原arrival才落下；仍保留L≥1禁止反擊。固定步長只能在下一個.25秒處理，不把處理拍當成新的反應起點。林克時間延遲同時更新swing.at/wind/opening.windowEnd，避免絕對時間相互矛盾。舊獨孤被動至少移到真決定完成後才可能觸發，不拿思考當身體前搖。

單測只延伸原N34唯一test：真Hick busy/無warn、下拍才看見來招、未到期不退費/重抽、放慢絕對時間一致、相反宣告順序同一物理T。另有既有公開真短spar史，沒加第二個test。不是宣稱所有隨機抽樣/同拍傷害結算順序都已完全可交換；共同觀測和起手邊界不再有先看後發的系統資訊偏差。

## 同一prepared60 snapshot的短診斷（不是新60日自然史）
```sh
mkdir -p out
gzip -dc solo-sect/docs/evidence/r9-n36-prepared60-public17.snapshot.json.gz > out/prepared.snapshot.json
node solo-sect/tools/waves.mjs --seed 17 --history prepared-defend --trait normal,calm,rash --snapshot-in out/prepared.snapshot.json --log out/timing.waves.json
node solo-sect/tools/duel.mjs --a day1 --b day1 --seeds 1-20 --log out/day1.duel.json
bash solo-sect/test/run.sh smoke
```
沒有再跑相同60日。snapshot的hash仍1d090070e1968fa61aa634a40c80e9a74e6b356b0bc4e5869c5d0939ffe64e84；n/f/ARTS未動。舊勞動/舊立即迎戰FAIL保留；這不是本規則重新生成的final成長史。

修後normal第一筆：t0思考toolStone到.6918863237，沒有身體起手；敵人真想.2秒後，在t.25起拳，到.75才命中（主角只有T.0581136763，r.3645048751，思考確實會挨打）。主角真第一個可見動作是t2的km2，身體wind.2314491101、arrival2.2314491101，Hick.6918863237已在前段付過、不加進wind。t2.5反擊刀賊的真手算：T.4081136763，r.3740391652＋m.0042574434＝.3782966086≤T，窗口[1.9418863237,2.35]、完成2.3201829323（固定步長2.5才處理）。不是t0瞬移反擊，也沒有刪L gate。

|trait|修前counter 1/2/4|修後counter 1/2/4|修後超載counter|
|---|---|---|---:|
|normal|0/1/0|2/0/0|0|
|calm|0/10/10|0/0/1|0|
|rash|0/1/0|1/0/0|0|

**N36整體仍FAIL**，兩路目前全0，calm一對一亦0；沒有隱藏退步。人格比較本樣本rashRush15>calm9、hpLost88.0952381>77.5238095成立，但不拿它代替每trait/路數門檻，也不以單seed證明任意seed。

**N34指定day1/day1 20seed也FAIL**：交手中位288（≥30）、無傷33.9713743749%（<70%）、平均喘氣6.1。舊約75.793%來自把Hick當露招窗口的舊語義，不能冒充本head通過。現規則正確與否仍須從事件看；下一步檢查真身體受力/暴露與負荷占用，不調低門檻或無由改力量。day60/day1與final N35/N38/N50/N55尚未重產。最新smoke19/19、fail0，沒有local full suite。

全逐拍/choice/thinking/windup事件與duel20原始輸出gzip、SHA見`r9-n34-timing-proof.json`。沒有實拍/影片/真人盲測，版本仍3.3、golden未重產，不宣稱第九輪完成。
