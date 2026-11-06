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
