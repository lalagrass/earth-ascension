# N36 公開指派→到場：共同準備門檻與任務生命週期

## 原真史，不是灌眼熟的fixture
同seed17/ISTJ，`combat-history --days 10 --strategy trained-defend`。09b9693的完整逐拍raw為`r9-n36-arrival-before17.json.gz`，SHA見`r9-n36-readiness-proof17.json`。共用主遊戲生成、公開setOrder/resolveRaid，沒有免費n/f/HP或新敵人。

第一波t4200公開守柵成功；主角原在s1，carry水2、energy18.5。t4203.75送回court，t4211.5吃完飯，t4211.75–4232.5每拍task=null/「守柵暫不可行」，energy18.5不變。`sim.decide`自理只查15，`threat.canDefend`要20；不是移速不足、指派丟失或其他守軍曝光可以代算。第二波t4328.25再卡energy15.5，並留下已到期bswing(at4328.18536629948)直到t4350離場；此生命週期問題仍須另一修正，不能說準備門檻一修就全通過。

## 根因A：單一活動前置條件
原40氣血/20精力搬到ACTIVITIES.defend.minHp/minEnergy；BAND可行性和指派先休息讀同一來源。原自理15、休息真耗時/床位/80醒來不變。精力已滿但受傷也要真的休養到活動門檻。N36原唯一小測試加普通同伴energy18.5與主角低氣血反例，沒有增加第二測試。

重產指令（repo根目錄）：
```sh
node solo-sect/tools/combat-history.mjs --seed 17 --days 10 --strategy trained-defend --trace-from 4200 --trace-to 4400 --trace out/arrival.json > out/history.json
bash solo-sect/test/run.sh smoke
```
門檻：不能在[15,20)永遠空轉；須花真路程/休息再回原指派。預期：19/19 fail0；本次t4204真走向床位，t4206.5休息，t4214精力80.5，吃完再走，t4228.75實到veg守柵。第一波能到場但已接近結束，不保證玩家每次都趕到。

修A的新10日eventHash=e97f9f225c29c9b090aeb4d9aed360349a195cfebfe281c70a8d308bba1e5c2b。主角刀1次/f.9213655339559574、拳2次、棍1次。這不是60日逐trait通過；仍有6秒周期完成/等待扣精力/在途動作失去處理者的根因B（raw含t4340 task=null但bswing在途）。保留原FAIL，下一步只依此共同任務時序修，不調L門檻或灌曝光。

## 根因B：持續交手與真起手耗能（不是新敵人/灌眼熟）
修A的同一公開史中，令狐沖t4217精力67.33333333333351；修B則80（賊仍未起手前沒有揮招）。N36原唯一回歸：8秒空等沒有掉精力/送style、task.timer超過6仍在守者集合；低於活動門檻但已發出的招先保持到落下或明確取消。改派清在途招、不退款busy/cool/精力。實際交手共用既有每次起手1精力；狩獵/護院/首狗/守柵雙方/duel/waves都讀同helper。刪的是空等周期獎懲，不是調反擊門檻。

同一10日指令修後eventHash `7392af1d9e14b1032d46ff531c61f6db3cbcf4b29a23a7b50fed3a02834dd48a`；t4228.75主角到場，但第一波已由先到同伴擊退，主角真exchange **0**，不能拿全軍戰績充主角。此seed本身證明『能到場』不等『練到眼熟』。在所錄4200–4400窗口，沒有task非defend卻掛bswing的列；不以此短窗口證明全遊戲絕無此bug。

### 新60日逐trait，FAIL完整保留
```sh
node solo-sect/tools/waves.mjs --seed 17 --history trained-defend --trait normal,calm,rash --snapshot-out out/snapshot.json --log out/waves.log.json > out/waves.json
# 需要整個訓練event stream時，以同一公開工具直接重產，不改snapshot：
node solo-sect/tools/combat-history.mjs --seed 17 --days 60 --strategy trained-defend --events out/history.events.jsonl --snapshot-out out/history.snapshot.json > out/history.json
```
門檻仍是每trait的1/2路各有counter，所有L≥1零counter；人格rash的搶攻及受傷高於calm。第一次命令已真跑，exit1 **FAIL**。第二命令是乾淨clone可重產同源全events的方法，本段未再重跑另一份60日，不能說兩次hash已相同。

| trait | 1路counter | 2路counter | 4路counter | L≥1 counter |
|---|---:|---:|---:|---:|
|normal|0|0|1|0|
|calm|1|1|7|0|
|rash|2|0|0|0|

新60日hash `e2a92f3b637e18f2114bac726a6a8ac84b13a24fb09a00bae82a062f2857015a`，全局158 exchange不是主角158次；主角刀 **0**、棍1（w0）、拳1（w.1502947857）。blade眼熟.9797607118205667來自真旁觀，不能稱充分接刀。人格rashRush8 < calm18，雖rashHpLost155.0476190476 > calm91.6190476190，故比較也FAIL。未刪normal/改aggregate/換seed/調門檻/免費加n/f；未宣稱整輪通過。

下一個最小診斷應從『報警後真的走到柵邊、哪些來招以主角為目標、同門先擊退/敵人合理撤退』的合法操作史釐清曝光前提，或直接重用此snapshot查選招/架勢窗口，**不要再把這份刀0次的勞動+迎戰史稱充分刀賊訓練，也不要重跑同一FAIL後就調世界平衡**。新snapshot與逐拍log已存gzip/SHA供短重現。自然N35/N38/N50/跑狗被咬比例未在本段重驗。N55舊表也不是此核心最終證據。
