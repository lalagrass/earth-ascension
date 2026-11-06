# N37 受力整合 checkpoint（未完成整輪驗收）

所有命令從repo根目錄執行，Node既有內建模組，無網路/外掛/作者snapshot依賴。`--seed`是reviewer任選整數；下表只是真實跑過的樣本，非任意seed都已證明。

## 可重跑命令
```sh
bash solo-sect/test/run.sh smoke
node solo-sect/tools/contact.mjs --seed 17 --log out/contact-17.json
node solo-sect/tools/contact.mjs --seed 904 --log out/contact-904.json
node solo-sect/tools/duel.mjs --seed 1 --a day1 --b day1 --seeds 1-20 --log out/duel-day1.json
node solo-sect/tools/duel.mjs --seed 1 --a day60 --b day1 --seeds 1-20 --log out/duel-day60.json
node solo-sect/tools/waves.mjs --seed 17 --trait normal --log out/waves-normal17.json
```

## 真實數字
- smoke：17 tests、17 pass、0 fail；N37只新增1個test，沒有跑完整suite。
- contact seed17：force40連擋3次重心歸零，長破綻1.45s（資料1.45s）；開/關hitstop插入8次真tick的state SHA256皆`18d19d0db3bb60f8b734e484387ec1662acb12f990e9af089a0b4d6c30889ef4`，pass=true。
- contact seed904：force40連擋3次重心歸零，長破綻1.45s（資料1.45s）；開/關hitstop插入8次真tick的state SHA256皆`4a51762e804cf1a994fb07167d166d0e229df400cb2d1de96bdabb1ab86f4c66`，pass=true。
- 同腳force22：狗tendon、退82.5px；豬layer=null、退16.5px、damageFactor=0。不是兩種敵人的特製分支。
- hitstop：白拳0.1s、成人骨尺度0.5s、四人骨尺度0.288675134595s。只有程式輸出，未桌面實拍。
- N34 day1/day1，訓練seed1、交手seed1–20：中位428交手、無傷75.793184%（門檻≥30及≥70%不變），平均喘氣10；pass=true。瘀青算傷，只有低於首層才算無傷。
- N34 day60/day1，同訓練/交手種子：最小移步0.311320754717對baseline0.0810749774164，倍率3.8399117；同拍反擊33，pass=true。不是自然放生玩法或任意訓練seed都過。

### 開發中FAIL保留與理由
N34舊HP模型33.3782%失敗；新力層第一版約65%仍失敗，原始檔留在工作區。回看世界理由找到兩個模型錯誤：站不穩不能憑空把真force又乘legacy heavy；推/抱雙接觸面也不能當同總勁的一個拳面積。現在用招式資料的contactSites分力，並保留平衡的總衝量，沒有降低組織/70%門檻或調中招率。最終小測試包含16力雙掌各8力、armor5後pressure3、不受傷，並非將瘀青偷偷改算無傷。

## N36嚴格門檻仍FAIL
已回查#446追加原文：「reviewer 檢查所有 L ≥ 1 的拍都沒有反擊；1 到 2 人同時進攻時有反擊。」沒有aggregate授權。工具預設normal，每個指定trait分別驗1/2路；先前聚合其他trait當pass的聲明撤回。
- seed17/normal/1路：counter=2，超載反擊=0，損血=3.52380952381。
- seed17/normal/2路：counter=0，超載反擊=0，損血=77.5238095238。
- seed17/normal/4路：counter=0，超載反擊=0，損血=0。
- 四狗open=2.28193822349 → cover=0.741759288786；20次真接法後HP=100，uid/n保留。
- **summary.pass=false，原因兩路normal反擊0；不能以其他性格有反擊代替。** 受控60日日程入場不是對山賊的自然實戰成長，需繼續審共同負荷/決策/成長機制與真玩法，不改probe門檻。
- 追擊後方50px幾何：跑11拍接觸，不跑0；仍不是自然被咬比例。急躁/穩定最終碼對照尚未重驗，不沿用c23d645數字。

## 尚欠與最沒把握
1. 組織/接觸面積是本作力尺度設計，非醫療擬合；尚欠bot12全平衡/自然悟招日數/側擊勝率護欄。
2. N36兩路normal嚴格FAIL；不得宣稱整輪完成，下一工作要保留並修真正共用機制，不能包其他trait變綠。
3. UI只經唯讀工具；N55 A/B.webm、真人盲測及正常桌面傷層/局部停頓實拍都沒有。N55原三seed表不是最終head，仍須重跑。

N50→N38、RULES_VERSION3.4/MIGRATIONS/golden、最終指定文檔/bot12/PR/CI均尚待；本checkpoint仍3.3，沒有改golden或save.mjs。沒有push、沒有新head CI，沒有對外comments。

## 工作區原始JSON SHA256
- `n37-contact-final-17.json`：`38552d3f2da08a956c31986d8cf1606a1955d4da91459186a0e430c67af05854`
- `n37-contact-final-904.json`：`ed40578b20fbfa8f7c9a87915f0befc3eadcc1aea99a759b5669a4d54a1be1bd`
- `n37-duel-final-day1.json`：`eb469f987b67d5a391738a6a2b46f16534688ffa1ca65abfd911e7233cbf9e17`
- `n37-duel-final-day60.json`：`0ada52dbf39834a112093ff8653d31b4269786619bf5e20d0deae85dd75e7119`
- `n37-waves-final-normal17.json`：`7ec6020d5b912ad9e991c3968f0bd594756231a1667b40a3cb7a16cad43e9d7b`
