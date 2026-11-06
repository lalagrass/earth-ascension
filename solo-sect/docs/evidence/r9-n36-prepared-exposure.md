# N36 合法先整備再迎戰：真刀賊曝光與仍FAIL的逐trait

## 不是降低怪物/同門能力，不是自然放養
原`trained-defend`警報立即迎戰史的刀0次FAIL保留於`r9-n36-arrival-root.md`及08ffd4c snapshot。新`prepared-defend`只是新增公開玩家策略：警報時間繼續流逝，先公開rest/吃飯；真去菜園工作、交回負重，到FENCE節點且path空、氣血/精力符合活動條件才resolveRaid(1)、改派守柵。若農活不可行就等；過原期限仍由原執事自動處置。沒有變更期限、敵人率、同門強度、退走規則、n/f/HP/資源，沒有傳送。農活途中主動取消的損失照原setOrder處理，不免費完成原工。

|來源|公開操作/設定|能力含義|
|---|---|---|
|N55 growth-scenario|bare/askMajor:false/steward:true；真採石/建井/三段工作|受控勞動播放成長，不代表見過刀賊|
|原trained-defend|ALL_ON；警報立即迎戰、才走向柵邊|保留刀0次反例，不能冒充充分訓練|
|新prepared-defend|ALL_ON；警報內先休養/走路/菜園到場再迎戰|本seed主角真接17刀，不是全軍次數|
|spar-history|ALL_ON；真砍柴取刀/自修/兩人餵招|human:toolKnife，不免費遷移到bandit:looterBlade|

**核對parent audit後的重要更正**：上述是caller options差異，不應據ALL_ON有jhev、growth沒有就推論後者關閉江湖事件。`createState`現行#390規則轉正、`tick`換日無條件jhevDaily及jhStep；舊jhev選項不是現行開關。兩種公開設定真跑至t600/day2都已有相同jhev狀態（`r9-jhev-options-proof.json`），實際明留的玩家選項差異有stewyard/stewkit。葵花/空明等舊事件的來源仍需從每份真史看，不能靜默關事件、更不能提前做N51或刪10%僥倖讓數字過。

## 乾淨clone重產
```sh
mkdir -p out
node solo-sect/tools/combat-history.mjs --seed 17 --days 60 --strategy prepared-defend --events out/history.events.jsonl --snapshot-out out/history.snapshot.json > out/history.json
node solo-sect/tools/waves.mjs --seed 17 --history prepared-defend --trait normal,calm,rash --snapshot-in out/history.snapshot.json --log out/waves.log.json > out/waves.json
bash solo-sect/test/run.sh smoke
```
第一命令這次真從0跑滿60日，第二只是同一未修改snapshot的短probe（不是灌值fixture）。同樣可不帶snapshot-in由waves重產；這次沒有再跑第二份60日。snapshot/summary現在寫完整creationOptions。每路數的normal/calm/rash除personality外初始人物fingerprint相同：ARTS/裝備/n/f/身體沒有因trait換另一份史。personality同時影響選招和定力，**這不是只變定力的純因果實驗**，不以其結果誇大定力效果。

## 實測與FAIL
新史hash `1d090070e1968fa61aa634a40c80e9a74e6b356b0bc4e5869c5d0939ffe64e84`。第一個迎戰在t4214.75，主角已真走到veg[1200,515]、energy99.75、hunger82.9875、hp100；不是從其他工作瞬移。全史公開resolveRaid13次，期限內的所有指令/前置狀態都在history JSON。

主角實接：刀17次（7 hit，w總6.7538566941695）、拳24次、棍13次。blade f9.14385169989263包含真接法與真旁觀，不是全軍158次充主角。新史有609個各人的drill，仍不把human的刀f改成bandit刀f。主角ARTS實有kuihua/kongming/breath/basicSword，合法舊事件沒有關閉；不能把此史假稱純白身無正式武學。

|trait|1路counter|2路counter|4路counter|L≥1 counter|
|---|---:|---:|---:|---:|
|normal|0|1|0|0|
|calm|0|10|10|0|
|rash|0|1|0|0|

**exit1 / summary.pass=false**。normal兩路有1次不是整體通過；所有一對一仍0。人格rush為rash14<calm15，HP損158.5714285714>56.3809523810，故人格比較也FAIL。沒有降門檻、aggregate、刪normal/換seed或改反應公式。這是單seed樣本，不是任選seed已證明。

本次已把『公開點指派但刀0』推進到『真接17刀』，但未把可見前搖/思考時段語義錯誤混進修復：已逐一讀parent audit腳本/hero-defenses/lgate-blocked/counter-rows，並核對`decision.mjs:18/30`確實normal只看射程、Hick直接被呼叫者加進可見wind；主世界/工具宣告次序也仍有偏差。後續應獨立修共用決策/宣告生命週期，不能因這個FAIL就改f/物理時間/刪L gate。

完整raw events、history、snapshot、probe log已gzip，雜湊/解壓bytes在`r9-n36-prepared60-proof17.json`。這不是遊戲實拍/影片。最新smoke19/19 fail0，沒有本地full suite；其他seed/自然N35/N38/N50護欄及N55最終量測仍欠。
