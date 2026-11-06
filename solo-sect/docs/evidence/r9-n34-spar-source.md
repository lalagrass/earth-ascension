# N34/N50 真對刀通路，不把同門當實戰刷取

原程式spar只有每1.2秒最後一招的浮字/正式示範，完成時rehearse只加手熟，沒有任何眼熟寫入。白身不需要ARTS便能spar，問題不是資格，而是缺了真前搖/真應接與眼熟資料通路。

修正：雙方真到場/互相持有任務、都不走路/倒地才累積共同時辰；輪流真前搖，使用同一clashTimes/clashOdds/反應抽樣/resolveSwingCore，主遊戲同一swing/warn/renderer顯示，不是工具自造第二套反應。餵招等夥伴有空並把自己的實際前搖放慢一倍（沿原rehearse二倍可控節奏），所以p自然偏高、w隨學會變小，沒有固定學習加成/截斷。安全練習不扣HP/組織傷/架勢/真氣、不獎實戰悟招/反擊傷害/旁觀；真活動耗能和動作/回復時間仍要付。雙人交替由pair.turn決定，不能陣列前面的人永遠示範；解散/改派回收孤立partner。

每真示範只記一次drill：自己的手熟增量以夥伴該招真n為上限，學生對這招的f以示範者實際n為上限；保留w=4p(1-p)。不把從未會的招灌給老師，不把一次完成8秒直接等於免費f。原spar完成的bulk rehearse不再重複加，正式示範只在真出招落下才記來源。

```sh
mkdir -p out
node solo-sect/tools/spar-history.mjs --seed 17 --out out/spar.json > out/summary.json
bash solo-sect/test/run.sh smoke
```

工具公開操作：全員chop，t22.5真拿到工作刀後改train，t200解除同伴指派、主角spar。沒有生成新老師/設定n/f/HP/資源。來源旗標是harness ALL_ON（含jhev），與N55 growth-scenario的bare/askMajor:false/steward:true不同；本段只有400秒，未遇到第8日江湖傳授。所有指令與來源事件保留於raw。

seed17：第一次origin-2→hero刀餵招，start203.25、wind.8752627037386106、真arrival204.1252627037386、固定步長t204.25結算。雙方yard同[1175,419]且path空；老師knife真n14.545454545454545來自先前自修。第一次學生成功p.7402511884/w.7691174659；最後p.9602199530/w.1527903795。共30次實際對刀，主角human:toolKnife f8.749206291608877，未越過老師能力。所有人物都真參與輪流，不是英雄固定教人。smoke19/19 fail0，只延伸原N34唯一小測試。

**human:toolKnife不是bandit:looterBlade**。#443明列哪種敵人的哪一招，因此沒有為N36門檻把同門柴刀眼熟搬給刀賊。此結果證明正常雙人對練通路可用，不是刀賊反擊護欄已過。N36原刀0次史及逐trait FAIL保留，需用真正對賊曝光/可行選招再驗，不能灌f或調反應公式。

raw `r9-n34-spar-public17.json.gz` 解壓SHA256 `f0213fb1a086b4d98c0da2d2d6a3546ce1b1711d66eab28da5f77302c9dade34`、868331 bytes，含完整指令、drill、原始事件與逐拍位置/動作。這是程式真狀態，不是實拍或影片。任選seed可重產，當前seed樣本不能冒充普遍成立。參考#444的LPMud同伴上限、RPD實際當面餵招、#443的w；未搬其他遊戲資料/程式。

caller options含jhev不代表另一工具把規則關掉：#390後jhevDaily/jhStep已無條件執行。兩種設定跨換日的真核對與完整creationOptions見[r9-n36-prepared-exposure.md](r9-n36-prepared-exposure.md)。這裡不把舊選項字串當作用中的開關。
