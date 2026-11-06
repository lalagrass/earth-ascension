# N36 busy重收的根因修正與N34傷來源

## 推導與保持的一次一事
#446原式是每個打我的人的接法需求/來招時間。舊程式`need=r+guard+busy`讓N個攻擊者把同一初始busy加N次，clashTimes又從單一可用窗口扣busy。有限初始占用不是每人的週期需求。L現在只累加各人(r+guard)/(原wind+readyDelay+travel)，busy另列診斷，不再加進L；實際窗口仍由同一絕對busyEnd、自己的在途出手與downUntil扣一次，resolveSwing仍以所有已占區間的最大端點串接，不是釋放行動或刪L gate。

手算對照（純排程小例子，不冒充遊戲訓練）：兩人各.25秒需求、各.8秒窗口，共同已忙.2秒。舊L=2×(.25+.2)/.8=1.125，新L=2×.25/.8=.625；實際仍只有T=.8−.2=.6秒，不是.8。原N36唯一test也以真狗來招檢查busy增加不變L但T確減.2，四狗/掩體與超載零反擊舊斷言保留。世界理由與單處理器需求/有限初始backlog參考先寫在combat.md，沒有新常數。

## 可重跑（同未改snapshot，不是final長史）
```sh
mkdir -p out
gzip -dc solo-sect/docs/evidence/r9-n36-prepared60-public17.snapshot.json.gz > out/snapshot.json
node solo-sect/tools/waves.mjs --seed 17 --history prepared-defend --trait normal,calm,rash --snapshot-in out/snapshot.json --log out/waves.json
node solo-sect/tools/duel.mjs --a day1 --b day1 --seeds 1-20 --log out/duel.json
bash solo-sect/test/run.sh smoke
```
新短counter（1/2/4）：normal2/0/0、calm0/0/2、rash1/0/0，L≥1反擊全0，**整體仍FAIL**。人格rush15>11、HP損88.0952>77.5238只本樣本成立。不是任意seed已證明。

## day1無傷低的實際分類（沒有直接縮力）
20seed交手中位288、無傷33.9713743749%、喘氣6.1，仍FAIL。duel現在唯讀輸出每次contact/counterContact、接法前後posture/downUntil/busy、why與完整events，傷定義仍包括bruise，沒有偷偷改成只扣HP才算傷。

- 3121筆普通踢：force24、armor5、pressure19，超blunt bruise10但不超skin24；是瘀青，不是皮破或深層傷。
- 687筆惱羞踢：force31.2（原惱羞倍率）、pressure26.2，跨skin24造成皮破。沒有修改原倍率/力量。
- 21筆惱羞拳：force18.2、pressure13.2，瘀青。
- 以上3829傷筆中只有105筆由posture空的`why=open`強制中招（90瘀青/15皮破），其餘3724不是倒地必中。只修倒地不能解釋全部缺口。
- 1019筆parry接觸無組織傷，但仍承接真衝量扣posture；424筆一般hit無傷、另2筆open hit無傷。沒有反擊傷害造成的傷筆（counter0），所以不能把33.97%怪到延遲反擊。
- 第一傷seed1 t1.25，A在.5起踢/arrival1.1，B的可用T.1、r1.96839，T確不夠；不是把有效r+m≤T判成hit。舊在途同拍的真到期排序仍須獨立修復，再查身體忙碌與辨認能否重疊的原規則，不能把未驗推論變成減力旋鈕。

calm一路incoming resolved=0是kh1真壓制，不是反應慢；仍保留FAIL，不刪正常武學或額外餵招。完整raw/SHA見r9-n36-busy-proof.json；smoke19/19，未fullsuite，未影片/盲測，版本未升。
