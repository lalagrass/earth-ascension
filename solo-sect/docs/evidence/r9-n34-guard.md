# N34 已付比較／明確守勢／負約束重用（2026-11-07 03:06 台北）

**共同根因已修，但N34/N36仍FAIL。沒有刪第一輪Hick、縮踢力、改瘀青或架勢閾值。** 已重讀#444、#436、#437完整body/comments及combat原世界理由。

## 先分清 t503.25 這筆本身
舊seed1 A在t503.25決定無可行攻招，仍比較.4秒，busy503.65；B的arrival503.4466462281，抽到r.2343203064，最後T0。單憑move=null不能證明這第一次比較是免費的：Hick確實可能令新手挨打。從**未修改的舊t503.25 frame快照**重播新規則到506，沒有已完成守勢證據，首筆仍同一r/T0/傷。這個保留正是沒有為70%免費抹掉認知代價。

真正缺口是：完整比較已付完的無招結果只被刪掉，沒有守勢語義或可重用的可行性判斷；相同對手/情境/可用招式秒數、遇到更緊的窗口，仍重做同份比較、重占身體。新`mode=defend`不是一招免費攻擊：完成原combatDecision後才記負約束證據，只有同一對手、情境、可用招式實際秒數/Hick與已見攻意種類不變、窗口不比已比較的寬，才重用。不重抽Thompson，不再次收Hick。招式/傷勢/熟練或已見攻意改變、時間變寬、惱羞接管，都重評；無來招也能再選攻。每個情境只留最近對手的證據，非按無限uid增長的檔案表。新生清selection，生還者可留真正已學過的守勢。

參考是#444的Hick/RPD與#437專心防守，加上一般planner的失敗約束記憶/事件驅動重評；論述先寫combat再改程式。守勢不把busy填到arrival（那會永遠T0），真反應/移步/抬手仍原串行，已花思考不退款，沒有新的常數/機率或預知尚未宣告的招。

## 真正同快照因果隔離
新正常duel seed1歷史在t16.75開始無可行招比較.4秒、t17.75完成；t30.75再遇同一對手/情境/選項的較緊窗口。公開工具真產生t30.75 frame快照，**兩側讀完全相同byte，沒有改n/f/HP/招式/cache**；舊側是ebd3817的原共用core，只拷新唯讀診斷CLI，不換世界規則。

| 同一已付快照 | 舊core | 新core |
|---|---|---|
|t30.75再次選無招|重收.4，busy31.15|沿t17.75已完成守勢，0次新比較；busy仍30.4|
|t31.25處理arrival31.0283647471|T0／中招|T.5283647471／進身閃|
|r／L|.2885639848／.7939601094|完全相同|
|真移步m|來不及|.1747918885|
|r+m|不可排入0窗|.4633558733 < .5283647471|
|接觸前精力|70|70|
|處理後busyUntil|31.6（受擊原.35恢復）|30.9633558733＝windowStart30.5+r+m，**不是now+整段動作再收一次**|

這是同輸入的根因證明；長duel兩側會因不再重新抽樣而有不同後續PRNG軌跡，不能把樣本總數差當每筆傷一對一因果。

## 全部有timing且T===0的互斥分類（不是只挑傷）
|來源（依表順序歸類，不重複）|修前全部T0|其中受傷T0|修後全部T0|其中受傷T0|
|---|---:|---:|---:|---:|
|null比較readyAt晚於arrival|1505|1463|1228|1114|
|自己的身體在途招晚於arrival|1091|1016|1071|962|
|攻招比較readyAt晚於arrival|1|0|1|0|
|倒地時間晚於arrival|49|49|19|19|
|宣告時窗已耗盡（含同時身體招結束）|18|12|17|12|
|合計|2664|2540|2336|2107|

末項逐筆驗opening.windowStart≥windowEnd（浮點容差沿原1e-9），沒有未分類項。1505不是全都可免費避免：含合法第一次比較，舊紀錄沒有完成證據就不能認定是重收；新20seed真重用643次。首筆503.25的隔離仍中招，不把全部T0歸同因。

## 招架／重心工程稽核：沒有因此改力
修前1078 parry全部無組織傷，全部且恰好滿足`postureAfter=max(0,postureBefore-contact.balance)`，0筆重收違例；518新倒地。518 dodge全部無contact，不曾把成功移步當硬擋。當前parry資料語義是#436的「抬手比勁」硬架，不是另有方向資料的接化；#448明定格擋會偏移。contact.balance沿原招式力臂/mass，連續格擋重設回正等待、倒地按資料回正。未發現這份樣本中成功移步仍扣硬擋或同一parry扣兩份的工程錯，**不憑「應該卸力」加新倍率/提高架勢**。修後1084 parry、521新倒地、0組織傷/0重收違例仍保留，這條鏈仍須後續世界驗證，不當它已達70%。

## 指令／門檻／真結果
```sh
mkdir -p out
bash solo-sect/test/run.sh smoke
node solo-sect/tools/duel.mjs --a day1 --b day1 --seeds 1-20 --log out/duel.json
# fresh舊503.25：不得憑空出現守勢記憶
gzip -dc solo-sect/docs/evidence/r9-n34-guard-old503.snapshot.json.gz > out/old503.json
node solo-sect/tools/duel.mjs --seed 1 --snapshot-in out/old503.json --until 506 --log out/old503-new.json
# 兩側未改的真已付快照；完整clone需含舊ebd3817
gzip -dc solo-sect/docs/evidence/r9-n34-guard-paid3075.snapshot.json.gz > out/paid.json
node solo-sect/tools/duel.mjs --seed 1 --snapshot-in out/paid.json --until 33 --log out/new.json
git worktree add --detach out/guard-before ebd3817
cp solo-sect/tools/duel.mjs out/guard-before/solo-sect/tools/duel-guard-probe.mjs
node out/guard-before/solo-sect/tools/duel-guard-probe.mjs --seed 1 --snapshot-in out/paid.json --until 33 --log out/old.json
# 舊prepared60只隔離目前短交手，不冒充新核心60日
gzip -dc solo-sect/docs/evidence/r9-n36-prepared60-public17.snapshot.json.gz > out/prepared.json
node solo-sect/tools/waves.mjs --seed 17 --history prepared-defend --trait normal,calm,rash --snapshot-in out/prepared.json --log out/waves.json
```
短`--until`會因原交手≥30門檻exit1；只是診斷，沒有移除原pass gate。工具新增snapshot參數保存/讀真frame，無新相依、不操控browser；完整events逐拍取出避免512筆上限丟早期診斷，不改世界事件生成。

- smoke **19/19 fail0**：只延伸原N34唯一test，首比較真付、未到期不退款/重收、完成後同證據不重抽RNG、第二來招/更寬窗口失效、無來招不永久守勢。
- duel20：修前308／32.6916748931%／喘氣6.05；修後 **302／39.0699983452%／6.2，無傷仍<70% FAIL**。不是任意seed證明；day60/day1仍待最終核心。
- waves舊能力短診斷counter1/2/4：normal **0/0/0**、calm **0/0/0**、rash **0/1/0**；超載counter全0，**總pass=false**；normal舊兩路2次不能沿用。calm一路仍無incoming，不診斷為反應慢，不餵敵額外機會/禁用正常武學。

所有raw gzip/解壓SHA256與兩份summary在`r9-n34-guard-summary.json`。原t503.25 snapshot hash `69a6243c2655cf0e60a971bbe8eb23ca30d31162fa0f76bc3d255b39166f6f57`；已付t30.75 hash `64b0ee875c56c810c8393b921275d1a072d84195ff81c80d22b29cdc22250d6f`。舊無曝光FAIL與先前門檻不刪。新規則真60日/自然護欄/N55最終三seed/3.4/golden/bot12/影片/真人均仍待，沒有UI實拍。
