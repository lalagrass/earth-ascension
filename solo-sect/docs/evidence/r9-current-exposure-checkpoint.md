# 最新來源指向（第九輪尚未驗收完成）
現在以[r9-n36-prepared-exposure.md](r9-n36-prepared-exposure.md)及[r9-n34-spar-source.md](r9-n34-spar-source.md)的真來源與FAIL為準。下列0ac263a數據全部是歷史反例，**不是目前head最終量測**；N55也仍須最終重產。

## 歷史0ac263a checkpoint（原文留作對照）
# 0ac263a 核心的最新checkpoint（不是第九輪驗收完成）

本節取代較早b9a308...公開史/0a07b9...成長表作為**目前**觀測；舊檔保留前後因果，不冒充新head。只有seed17，不是任選種子普遍證明。

## 命令
```sh
mkdir -p out
node solo-sect/tools/waves.mjs --seed 17 --history trained-defend --trait normal,calm,rash --snapshot-out out/current60.json --log out/current-waves.log.json > out/current-waves.json
node solo-sect/tools/combat-history.mjs --seed 17 --days 60 --strategy trained-defend --snapshot-out out/reproduced60.json --events out/current-public.events.jsonl > out/current-history.json
node solo-sect/tools/white-body.mjs --seed 17 --days 30 --types ISTJ --events out/current-natural.events.jsonl > out/current-natural.json
node solo-sect/tools/blind.mjs --seed 17 --action train --out out/current-blind
```
第一行waves exit1是護欄FAIL，非例外；其餘工具輸出真資料，並未宣稱護欄通過。兩次獨立公開史eventHash同為`673b380679634a83d7c12e0f1a15fab265f6f47f9bae8f131ef260278f8faf9c`。

## 真世界pipeline已修：不用主動指派就會交手首野狗
另短命令white-body同seed/ISTJ `--days 2`：53次exchange，首t417.5主角bodyKick對firstDog；主角接44次dogBite，f21.53630832691692。原自然30日exchange0/eyes空，修後30日真刀19次/狗44次，非灌f/補血/改出現率。首狗不再只因路過村民的裸人頭壓力提前退，仍會依真L/工具/傷病士氣正常選動作。

## 新60日受控公開訓練史仍不夠：不能用隔離改善假稱通過
|trait|counter 1/2/4路|overload counter|
|---|---|---:|
|normal|1/0/0|0|
|calm|1/0/0|0|
|rash|0/0/0|0|
人格比較此樣本true：rash搶攻14>calm10、HP損169.1428571429>112.7619047619；**summary.pass=false**。
新史主角實際只接刀1次（f.85207100591716），總exchange102是全局，絕不能冒稱主角刀曝光102次。公開迎戰/改派守柵不保證本人實際趕到，需沿orders、走路/已有工作與其餘守軍事件繼續查；`trained-defend`是公開受控日程，不是自然玩法，也還不能說是充分刀訓練史。
normal2路33次防守，L<1 **0次**；首t1 L1.7234056508、自己的toolKnife還在前搖到1.1530438523，對方真窗已在.8結束，T0。`r9-n36-current-two-route17.json`保留完整before actors/cool/next/eyes/swing與timing，不為反擊刪L gate/改n/f/減門檻。

## 自然30日 ISTJ 未過的項目
狗級d8、躲豬d8、空手賊截d8、刀賊級d18，均不符現有各日數範圍；兩路級未達。N35首悟null、單獨趕豬null、名俠0；拿手kh1真17用15勝。這是單人格，不能用specialtiesAtLeast2=false斷言三個性都相同；另外兩人格未跑。狗追擊只有holding44次/中30，running0次，沒有追咬率比較樣本。

## N55準備新真1/60資料，不是影片
新CLI的A/B兩份hero/hash逐字核對真snapshot。斧停.5→.1787999442、水桶傾15→.9157264374、重心17→11.1974161916、套路6.9→2.5073959570、拳前搖.45→.1696210185；此seed五欄皆>25%差，但另兩seed/重複一致性與最終head三seed仍欠。`r9-n55-offline-current17.json`保留數字與來源hash。
parent正常桌面使用`/workspace/specs/t200u-live/n55-offline-current17/A.json`、B.json，key.txt分開；正常遊戲紀錄底部連結匯入，真人按錄10秒。尚無WebM、沒開UI、沒有真人盲測；不能拿JSON/SVG當影片。

## Raw
- public gzip解壓2128384 bytes，SHA256 `673b380679634a83d7c12e0f1a15fab265f6f47f9bae8f131ef260278f8faf9c`。
- natural gzip解壓659618 bytes，SHA256 `193843c617bcd8e0c4ac8ff2a893d53a0c7c218906e4b4b1bbdad628c8fac975`。

最新本地smoke19/19 fail0（n36-morale-smoke.log），未full suite；沒有push/PR/新headCI，仍3.3，3.4/MIGRATIONS/golden與整輪收尾全待。沒有自行留言。
