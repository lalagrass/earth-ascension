# N34 真到期排序與完全同時仲裁（2026-11-07 02:41 台北）

**工程根因已修，N34/N36 驗收仍 FAIL。** 這是與130cc6a之前後比較同一份舊prepared60能力的短診斷，不是最終head重新生成60日，也不是自然玩法或任意seed證明。

## 規則／來源
原本同一固定拍內依人物陣列依序落招，1.20秒的招能先於排後面的1.10秒招打斷它。sim首狗/狩獵、threat守柵、duel/waves現在都將舊在途招交給`settleCombatSwing → flushCombatImpacts`。按尚有效的真arrival／合法截擊完成時刻依序處理，先到的打斷才有權取消後到招。全部仍於原.25秒固定處理拍結算，不回滾世界/身體恢復；`resolvedDeadline`與`processedAt`分列。這不是改成可變步長，也不聲稱小數截止時刻已變更世界狀態。

完全同時先按穩定ID建立集合，再用既有世界PRNG Fisher–Yates均勻置換選先手；無主角/陣列優先，可重播。這是平局仲裁，不宣稱雙方必能同時命中。世界理由與離散事件模擬／Fisher–Yates參考見combat.md；沒有新常數、相依、n/f灌值或L gate修改。自己的最快招必須真伸得到攻方，不能用28拳距截100外投石；面板、起手、落招共用射程條件。舊獨孤起手被動在新起手提交階段，不搶舊到期招之前。

## 可複驗（repo根目錄）
```sh
mkdir -p out
bash solo-sect/test/run.sh smoke
gzip -dc solo-sect/docs/evidence/r9-n36-prepared60-public17.snapshot.json.gz > out/prepared.json
node solo-sect/tools/waves.mjs --seed 17 --history prepared-defend --trait normal,calm,rash --snapshot-in out/prepared.json --log out/waves.json > out/waves-summary.json
node solo-sect/tools/duel.mjs --a day1 --b day1 --seeds 1-20 --log out/duel.json > out/duel-summary.json
```
probe exit1表示原門檻FAIL，不是例外。smoke **19/19、fail0**；只延伸原N34唯一小測試，沒有local full suite。smoke輸出`N34 deadline proof`：1.10與1.20到期的兩招，在t1.25處理；forward/reverse都只有a落下、deadline1.10，b被真`shiftBalance`打斷。完全同時seeds1–32，a19次/b13次，逐seed逆序相同；無偏來自演算法，32樣本不是對任意seed均衡次數的證明。

snapshot SHA256仍`1d090070e1968fa61aa634a40c80e9a74e6b356b0bc4e5869c5d0939ffe64e84`，舊合法17刀/ARTS來源保留；同路數三trait fingerprint相同。只換personality仍會同時影響選招與定力，不稱純定力因果。

| trait | counter 1/2/4（130cc6a→本修復） | 本次incoming resolved 1/2/4 | L≥1 counter |
|---|---|---|---|
|normal|2/0/0 → **0/2/0**|5/28/70|0|
|calm|0/0/2 → **0/0/0**|0/32/54|0|
|rash|1/0/0 → **0/1/0**|1/30/83|0|

**pass=false**；沒有aggregate、降低門檻或移除normal。normal兩路首次在此因果隔離下出現2次，但一對一/其他trait仍未過；calm一路實際來招0，是kh1壓制/打斷而非反應慢，仍不當作PASS，不禁止正常武學或餵敵額外機會。只新增唯讀`incomingResolved/timedIncoming/timeLoadFits`；末欄只計r+strike<T與L<1，不含射程/架勢/視力/惱羞，**不是完整合法反擊機會數或改pass gate**。人格樣本rush12>5、HP損109.238095>77.523810，僅此樣本成立。

真同拍例：normal兩路t13.75先hero deadline13.5042574434、後foe1 deadline13.7128845180；normal四路t4.5先foe0 deadline4.4683715274、後foe1 deadline4.4869712296。所有raw同一處理拍已記錄落招未見deadline逆序；這是所量樣本，不是所有世界狀態排序交換的全稱證明。

## N34無傷仍未過；不以受力常數湊門檻
本次20seed day1/day1：中位交手 **308≥30**、無傷 **32.6916748931%<70% FAIL**、平均喘氣 **6.05**。4089次傷＝普通踢瘀青3416、惱羞踢皮破428、架勢空踢瘀青198/皮破44、普通拳瘀青5。242次架勢空強制，不是其餘3847次皆倒地必中；反擊造成傷0，不能把無傷FAIL歸咎延遲在途反擊。普通踢原force24/armor5/pressure19到bruise閾值10，不到skin24；仍保留原組織傷定義/力門檻，不直接縮力或把瘀青改算無傷。

三筆真parry供手算（m=guard=0，取原始秒數非加工機率）：
|處理拍|arrival|T|r|m|T−r−m|
|---|---|---|---|---|---|
|155|154.9979645785|.4979645785|.4565409847|0|.0414235939|
|158.5|158.4946225028|.4946225028|.4432508403|0|.0513716626|
|162|161.9913423877|.4913423877|.4399250324|0|.0514173553|

兩路normal t24.75真反擊：原arrival24.6708793520、windowStart23.85，T=.8208793520；r=.3467873302、step=.0507845489、strike=.0042574434，合計.4018293225<T；L=.5086070040。busy原.1秒仍扣，非免費動作。

## 原始資料
`r9-n34-deadline-summary.json`含實際測試proof/完整各路summary/傷分類/手算三筆；raw以gzip保留，解壓後SHA256：
- `r9-n34-deadline17.waves.log.json.gz`：`3e017b5f70ee7b88faddb20a5605b928c43261a0df19605a55ffa2f6c39134e2`
- `r9-n34-deadline.duel20.json.gz`：`3f96c5b329c4c27ca36ce50acf513fd2272c8b0e0b67f2575a326fac1a956159`

尚欠：新核心真60日逐trait/seed、day60/day1、N35/N38/N50自然護欄、3.4/MIGRATIONS/golden/bot12同尺、N55最終三seed/影片/真人。沒有桌面實拍或WebM；本次未操作browser。
