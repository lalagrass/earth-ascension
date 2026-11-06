# N50→N36 真世界pipeline：廚房上限與招募口糧互鎖

不是L gate問題，也不是把勞動史改成免費眼熟。原 `sim.mjs PRED.cookable` 與 `data.mjs SCORE cook` 都固定food<10；`admissionStatus` 卻要四人口一日14份。seed17第16日可見food8/veg11、床9、真師父空檔295秒、招募唯一blocked為8/14；人口一直3，舊RAID.minPopRules=4，所以沒有任何山賊可見。**沒有修改RAID人口門檻或出現率**。

共同修正是廚房目標讀真住民及已聽聞候選口糧，不改分數倍率。相同15日/seed17/ISTJ、公開玩家只在真pending呼叫resolveRaid(s,1)、換日既有botDaily。修前沒有pending，exchange0/eyes{}；修後人口4，d8/t4200與4285.5兩次真迎戰，exchange57、observe58、glimmerProgress20；主角真blade眼熟2.38100603431318、staff1.3178576508100348、fist3.0535072053705767。

raw `r9-n50-pantry-before17.json` / `r9-n50-pantry-after17.json` 包含公開指令/真來犯pending與所有exchange列。這是單seed15日公開迎戰診斷，不是N36每trait 1/2路已過、更不是12seed自然護欄。後續公開combat-history工具重現完整events與60日snapshot；原N55勞動史FAIL不撤銷。

另真第一日野狗沿SOURCES走到院路，在距主角204px時看見兩居民而士氣broken、回den，無起手。#446允許敵方看守山人數退，這項觀測本身不能當作必須禁止退的世界bug；無操作遇狗與真正對刀賊曝光必須分開。公開單人guard守山一波可得真dog交手，但不是刀賊熟悉度，也不假充自然護欄。

本地只smoke19/19，fail0；唯一N50小測試延伸口糧目標斷言，未加第二測試。沒有UI實拍/影片。
