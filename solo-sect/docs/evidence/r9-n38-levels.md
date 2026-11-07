# N38 工程checkpoint：真自然玩法護欄仍FAIL

## 9c 收尾量測（取代下方施工 checkpoint）

`node solo-sect/tools/white-body.mjs --seed 17 --days 30 --check` 使用真模擬與三種公開人格；[完整輸出](../../artifacts/round9c/white-body-seed17-final.json)。A 類級名即時投影 `rulePass=true`。ISTJ／INTP／ESTP 首達 1 級 d8／d2／d3，3–5 級均 d8，2 級均未達；拿手招揮拳／踢／踢，單人對豬逼退均 null。到達日數是 C 報告，與設計日期偏差；d8 舊江湖葵花殘頁及後續真授藝促成正式級名，不表示白身自然悟到拳譜。規則 3.6、Node22 golden 重產完成；CI 狀態以 9c PR 為準。

2026-11-07 台北時間；N50 2eecc07、出生記憶隔離a60ae75/f73f34d、正式知識來源1ff212b之後的N38碼。沒有升3.4、沒有重產golden、沒有push/PR/新head CI。不是整輪完成。

## 可重跑與真數字
`node solo-sect/tools/white-body.mjs --seed 17 --days 30 --check`，固定.25秒，三個公開人格新局，同seed，只換日botDaily，不用N55受控練拳/砍柴/挑水輪替，不補血/資源/手熟眼熟。`--check`這次exit1（護欄FAIL），不是執行例外。完整原始`r9-n38-natural17.json`、摘要`r9-n38-summary17.json`；加formalAcquisitions唯讀診斷欄前產生，模擬規則相同。這只有一個seed，不是12seed/任意seed已證明。

|公開人格|1 狗|2 進身閃豬|3 截空手賊能力|4 刀賊|5 兩刀|真交手最常用招（次數／得手）|
|-|-|-|-|-|-|-|
|ISTJ|30日未達|d8|d24|未達|未達|kh1 繡花針 5／2|
|INTP|d3|d4|d28|d28|未達|km2 妙手空空 7／6|
|ESTP|d2|d4|d28|d28|未達|push 推山掌 4／1|

- 拿手招3種≥2，此seed這條PASS；不是宣稱這三招都是N35土招或其餘護欄過了。
- 狗d3–5、躲豬d10–15、刀賊d20–30各有不符，**整包FAIL**，沒有調門檻/秒數/常數湊過。
- 三局N35首悟日皆null；自然主角單獨趕豬日皆null。這不是「永遠不會」，也不是首悟d7–10通過。
- 跑/不跑對狗的自然交手曝光皆0，不能以0/0推論被咬率；N36自然追擊護欄仍沒有足夠證據。
- 來源追蹤`node solo-sect/tools/white-body.mjs --seed 17 --days 30 --types ISTJ`：d8/t4200.25先從舊江湖「擊退東方不敗」事件得到葵花殘頁，d9周伯通教空明拳。原始context在`r9-n38-formal-source17.json`。這是舊江湖事件影響自然玩法的真觀測，不能冒充純土招能力。其後「師父傳授」的舊learn單人任務仍要稽核真師父/教材來源，N50新指導已用真雙人時間，但不能用它掩蓋舊learn旁路；列下一個共用規則修正。N51將處理江湖登門/10%僥倖，沒有在此偷偷刪掉舊事件。

## N38等級投影的精確定義
`bodyAssessment`由遊戲同一clashOdds/assessLoad/chooseCombatMove/士氣模型純查詢，人物卡即時讀它，不存level/XP。標準位置用真前院，徒手接觸距離讀抱的range、豬助跑位置取其合法minDistance與range中點，刀賊用真bandMembers工廠80點兩人的資料。優先clone之前逃走且符合武器的個體（保留真n/f/筋骨），沒有才生成參考個體；從不消耗主局survivors。

這是無動作占用/無當下惱羞的**接法能力**，保留真成長、工具、筋骨，不是自然整場勝率。機率直接取引擎同一log-logistic CDF，不用種子抽樣湊過半：
- 狗：共用士氣真選逃則能嚇退；否則比較真N34 preview首攻（含決策秒數，出手早於狗且能命中）與等狗來招的反擊。舊開發版漏了主動先打的合法途徑，已補，不改引擎門檻。
- 豬：真衝撞來招的dodge機率。
- 空手賊：反應+出手來得及的機率（read+dodgeCounter）；其中也來得及先移步者，AI可能實際選進身閃反。輸出另外列actualRead，**不能把能力率說成自然read事件頻率**。這是需要review特別核對的解讀。
- 刀賊：可行進身閃或已悟、條件/力都成立的奪械策略較佳者；沒有假設人人已會奪械。
- 兩刀：同引擎算出的L<1，確定性條件轉為0或1，不另加勝率。

每個名稱取其明列條件>1/2的最高級，不加issue未寫的「所有前級先過」暗門檻；各級到達日分別按自己的條件記，不虛構前級通過。級名可能隨當下工具或重返敵人的成長改變，這是投影，不是存起來只升不降的等級。

## N36仍FAIL（重新讀live #446後重跑）
`node solo-sect/tools/waves.mjs --seed 17 --trait normal --log out/waves.json`，本checkpoint原始`r9-n38-waves-normal17.json`：1/2/4路反擊2/0/0，超載反擊全0，真HP差3.5238095238/77.5238095238/0，pass=false。四狗空地L2.2819382235→掩體.7417592888，uid/n保留。40秒/60日公開日程fixture與門檻未改，不把其他trait包進來變綠。11追及拍/不跑0仍只是幾何。

#446原文：「reviewer 檢查所有 L ≥ 1 的拍都沒有反擊；1 到 2 人同時進攻時有反擊。」沒有aggregate許可；normal兩路0必須保留FAIL，後續繼續查實際眼熟、攻意生命週期、共同忙碌時間與實際可反擊窗口，不為seed17灌值。
