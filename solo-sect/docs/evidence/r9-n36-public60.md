# N36 真公開曝光史（仍有逐trait FAIL）

## 指令／前提
Node22/24，不裝新相依，repo根目錄：
```sh
node solo-sect/tools/combat-history.mjs --seed 17 --days 60 --strategy trained-defend --snapshot-out out/public60.json --events out/public60.events.jsonl > out/public60-history.json
node solo-sect/tools/waves.mjs --seed 17 --history trained-defend --trait normal,calm,rash --log out/public60-waves.log.json > out/public60-waves.json
# 第二行不讀快照，真的從新局重產60日；診斷可使用未改的公開輸出加速：
node solo-sect/tools/waves.mjs --seed 17 --snapshot-in out/public60.json --trait normal,calm,rash --log out/cached-waves.log.json
# 舊無刀賊曝光史反例仍可重產，不撤回FAIL：
node solo-sect/tools/waves.mjs --seed 17 --history labor --trait normal --log out/labor-fail.log.json
```
先`mkdir -p out`。所有history只公開操作：換日建舍/可招才招；trained-defend沿N55採石建井→每200秒練拳/砍柴/挑水，但真pending才按迎戰1、真山賊在場才改派defend，結束復工。`--strategy defend`不加勞動輪替，`passive`保留原執事處置；這三者與N55純勞動皆分明，不假稱自然放養。完整公開操作/結果在history JSON。沒有灌n/f/補HP/資源/免費敵人到**歷史**；交戰probe仍沿既有統一入場HP/精力/暫態重置及1/2/4敵人fixture，並未偷偷換敵人或門檻。人格是在同一真史人物的normal/calm/rash比較條件，不是假稱三種自然人格的完整60日史。

## 真數字
source eventHash `b9a308c9ec9fe2da02adb8cab393cc88404ddf59a5bb6c2fa30b4d8ea5969255`；234 exchange、505 observe、104 glimmerProgress、8次真迎戰。主角實際接刀12次，刀眼熟9.392835974155627（含同圖合法旁觀）、棍14.02701607370552、拳23.84008545362181；真力量/身法均100。正式會kuihua/kongming/basicSword，原具名江湖傳授/殘頁保留，不冒充只有土招。

| trait | 1路counter | 2路 | 4路 | overload counter |
|---|---:|---:|---:|---:|
|normal|0|1|0|0|
|calm|0|0|1|0|
|rash|0|1|0|0|

`pass=false`：**normal兩路由0到1是真進展，但一對一與calm二路仍FAIL**；不是aggregate。rash搶攻3>calm2、HP損155.04761904761898>0，此一樣本人格比較PASS，不代表任意seed。

## 第一個新缺口的真逐拍
`r9-n36-public60-defense17.json`含每個trait/count完整hero防守，原actors/next/cool/own swing/busy等。normal1路 t3：L0.623031867516424，卻T0，windowStart3.170539680486575 > windowEnd2.9464558156194833；不是L gate誤擋。防守當時自己的動作/時間已佔到來招之後，不能用r+移步看似小於原wind就說可免費反擊。t4.75 L1.0349653563524577，也不可反擊；calm2路t.25就真逃。後續須看N34選招/攻意/既有busy時間規劃與暴露量，不能刪L gate或灌眼熟求綠。本次沒有又為單一seed改戰鬥平衡。

## 原始資料
`r9-n36-public60-17.events.jsonl.gz`解壓4379137 bytes，SHA256 `b9a308c9ec9fe2da02adb8cab393cc88404ddf59a5bb6c2fa30b4d8ea5969255`；每條由主模擬emitPractice產生，未改snapshot。events hash與兩次獨立history/不帶快照waves生成一致。這只有seed17，尚未多seed或普遍證明。原勞動FAIL證據仍在r9-n36-current17.json。影片/真人盲測尚無。
