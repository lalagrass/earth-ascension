# 人物卡與角色對照：三方最新差異評估提示詞

2026-10-26，依擁有人最新方向：**前述新天賦列備選，先用角色驗欄位；只評估、不改系統。** 三段各自可貼。GPT／Grok的R2報告已在#340，請沿用；沒有重啟／代送任何agent。舊R2語義與動畫／素材研究保留於公版、對照與經典研究，不要求重交。

補充入口：[心性設計](CHARACTER_PERSONA_TRAITS_DESIGN.md)｜[隱藏特性與武學路線](CHARACTER_TRAIT_PATHS_PROPOSAL.md)｜[公版武學模板](MARTIAL_ART_PUBLIC_TEMPLATE_PROPOSAL.md)。最新增量問題已放入下方三段，仍只補差異、不實作。

主[#340](https://github.com/lalagrass/earth-ascension/issues/340)｜[本輪角色研究](CHARACTER_TEMPLATE_CONTRAST_REVIEW.md)｜[公版](CHARACTER_CARD_PUBLIC_PROPOSAL.md)｜[舊固定對照](CHARACTER_CARD_BRANCH_MAPPING.md)。文件PR #341可直接讀，不必先合進自己的分支。

## GPT

```text
你是GPT／Codex，請依擁有人最新要求做「角色優先的人物卡／先天天賦差異評估」，只研究並具名回覆#340，不開始實作。
目標分支：codex/solo-sect-gpt；本輪盤點HEAD 79c1665328c186e7208dbeae3a4f7b20fcb3898f。你若已前進，附當前已提交SHA，只補相關差異，不reset、不讀其他agent未公開修改、不合別版程式。

必讀本輪研究：
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/CHARACTER_TEMPLATE_CONTRAST_REVIEW.md
公版／舊語義對照按需核讀：
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/CHARACTER_CARD_PUBLIC_PROPOSAL.md
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/CHARACTER_CARD_BRANCH_MAPPING.md
主issue：https://github.com/lalagrass/earth-ascension/issues/340
沿用你已交報告：https://github.com/lalagrass/earth-ascension/issues/340#issuecomment-6408206643；這次只補角色差異，不重做原報告。

最新追加方向：這輪一併評估心性／價值、問答生成有感的開局隱藏特性、歷練分支，以及公版武學模板；全為紙上提案，未批准修改系統。先看公版武學模板1–3節與本版對應段落，心性／支系按所選反例讀，不必重讀全部舊報告：
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/MARTIAL_ART_PUBLIC_TEMPLATE_PROPOSAL.md
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/CHARACTER_PERSONA_TRAITS_DESIGN.md
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/CHARACTER_TRAIT_PATHS_PROPOSAL.md
請在原回覆只補最多三個例：①能力接近但心性／價值不同的一對；②開局特性→一次真歷練分叉，分清發現／獲得／啟動、取代／疊加與可見資料；③九劍／降龍的取得、入門、精通、施展＋人物進度＋動畫映射（缺該武學就一門已有武學，不補造）。可合併同一例回答，不要求再做三份報告或逐個角色全評。
東方不敗等只是研究對照。開局特性可以較強，不要求所有路線等強或有同一人格；學法、師承與真功力分開。不把低悟性當降龍必需、高悟性當所有絕學通行證，不用一個隱藏ID綁所有武學。人格／問答結果不是現實玩家心理診斷；MBTI／心印／卦象可作敘事，不作新權威戰力。人物定義、角色所學、核心規則、動畫呈現四份資料分層，公版先唯讀，不改教法／門檻／效果／存檔，不做天賦樹UI或安裝規則引擎。沿用D53女孩純親情與鼓勵無buff的邊界。

方向：先盤點角色身份與階段，逐項核根骨→悟性→定力→力量／身法／耐力起點→福緣劇情。先天潛質、開局已學經歷、性格／意願、當下狀態和劇情所得分開；initial／base／effective不混。原量尺保持，缺項不是0，不能把三版滿分比例當能力等價。
感知、武感、氣感、專注、親和／共感、工巧及新「記識」都只是備選；研究v0數字是紙上假設，不是原著評分或批准新模板。同型天才可以相近／相同，不為辨名字加軸；不同天才要指出學什麼／做什麼會不同。

本版重點：核郭靖／令狐沖／岳不群的五項創角基線，與U/F/I、走過距離、traits不同。洪七公／喬峰目前無專屬stats、來客初始化回退[4,4,4,4,4]，不能把回退當真天賦；成熟作客／青年可招募身份模式分清。沒有根骨／福緣／腿法就報缺，不替公版補上。重點比較郭靖與令狐沖、令狐沖與岳不群，再挑一個新增研究角色作紙上反例。此SHA目前只確認本機已提交，不要求為研究push分支。

回覆用具名新留言，不覆寫別人的報告，最多8項摘要＋最多三組角色反例：
1. 身份、分支／固定SHA、已有報告連結及本輪相關差異。
2. 各選角色的原生數值／來源、所處階段、真核心用途；哪些只是混合創角值／回退／未顯露。新增王語嫣、虛竹、石破天、成熟張三豐僅為研究樣本，沒有的不要創建。
3. 每項判斷：現有欄位足夠／先改語義標籤／學法特性足夠／值得新維度／資料不足。能用既有技能、背景或人格解釋就不全塞先天。
4. 一個相同教師／時間／起始技能、只改候選學習傾向的紙上反例；一個同天賦但因經歷／傳功／志向而不同的反例。沒有公式就寫待定，不自創可執行結算。
5. 最小建議與未決：只選1–2個值得PO下一步確認的問題，不要求三版同時重構。

不改runtime、數值／模板／成長、UI／動畫／素材、存檔或依賴，不新增角色／招式，不開服務／瀏覽器，不跑測試矩陣或啟動loop。已批准開發包沿原授權到穩定交付點，不受研究阻擋。動畫仍由核心真phase／命中／耗能／位移驅動；立繪／頭像／地圖sprite及共用asset規劃不重做，只有與本輪相關的語義差異才補。存檔升版與手機繼續最後。不能寫GitHub就交原聊天供擁有人轉貼。完成回覆後休息，等待新指派。
```

## Gemini

```text
你是Gemini，請依擁有人最新要求做「角色優先的人物卡／先天天賦差異評估」，只研究並具名回覆#340，不開始實作。
目標分支：plan/sect-life-architecture-redesign；本輪盤點HEAD bae43412dced2a2f0d9d82008d5cdf8b3acfb8f9。你若已前進，附當前已提交SHA，只補相關差異，不reset、不讀其他agent未公開修改、不合別版程式。

必讀本輪研究：
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/CHARACTER_TEMPLATE_CONTRAST_REVIEW.md
公版／舊語義對照按需核讀：
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/CHARACTER_CARD_PUBLIC_PROPOSAL.md
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/CHARACTER_CARD_BRANCH_MAPPING.md
主issue：https://github.com/lalagrass/earth-ascension/issues/340
目前PO未確認你的具名報告；若已交請附連結，只補差異，不重做。

最新追加方向：這輪一併評估心性／價值、問答生成有感的開局隱藏特性、歷練分支，以及公版武學模板；全為紙上提案，未批准修改系統。先看公版武學模板1–3節與本版對應段落，心性／支系按所選反例讀，不必重讀全部舊報告：
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/MARTIAL_ART_PUBLIC_TEMPLATE_PROPOSAL.md
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/CHARACTER_PERSONA_TRAITS_DESIGN.md
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/CHARACTER_TRAIT_PATHS_PROPOSAL.md
請在原回覆只補最多三個例：①能力接近但心性／價值不同的一對；②開局特性→一次真歷練分叉，分清發現／獲得／啟動、取代／疊加與可見資料；③九劍／降龍的取得、入門、精通、施展＋人物進度＋動畫映射（缺該武學就一門已有武學，不補造）。可合併同一例回答，不要求再做三份報告或逐個角色全評。
東方不敗等只是研究對照。開局特性可以較強，不要求所有路線等強或有同一人格；學法、師承與真功力分開。不把低悟性當降龍必需、高悟性當所有絕學通行證，不用一個隱藏ID綁所有武學。人格／問答結果不是現實玩家心理診斷；MBTI／心印／卦象可作敘事，不作新權威戰力。人物定義、角色所學、核心規則、動畫呈現四份資料分層，公版先唯讀，不改教法／門檻／效果／存檔，不做天賦樹UI或安裝規則引擎。沿用D53女孩純親情與鼓勵無buff的邊界。

方向：先盤點角色身份與階段，逐項核根骨→悟性→定力→力量／身法／耐力起點→福緣劇情。先天潛質、開局已學經歷、性格／意願、當下狀態和劇情所得分開；initial／base／effective不混。原量尺保持，缺項不是0，不能把三版滿分比例當能力等價。
感知、武感、氣感、專注、親和／共感、工巧及新「記識」都只是備選；研究v0數字是紙上假設，不是原著評分或批准新模板。同型天才可以相近／相同，不為辨名字加軸；不同天才要指出學什麼／做什麼會不同。

本版重點：核六個初始模板與22筆legends登錄、招募候選分開，段譽已在登錄表，不算這次新實裝。先釐清bone/constitution、breathing/strength、temperament/composure的語義／權威狀態，數字相同不當作獨立天賦。韋小寶悟性8是否混入社交機靈？令狐沖定力4是否混入自由／嗜酒？郭靖低悟性卻有peerless_talent加成意圖為何？perk須分學法、已有武功、經濟與劇情，不因名為innatePerks就全當天生。若尚未交R2，只補本輪必需語義與角色反例，不跑全系統盤點。

回覆用具名新留言，不覆寫別人的報告，最多8項摘要＋最多三組角色反例：
1. 身份、分支／固定SHA、已有報告連結及本輪相關差異。
2. 各選角色的原生數值／來源、所處階段、真核心用途；哪些只是混合創角值／回退／未顯露。新增王語嫣、虛竹、石破天、成熟張三豐僅為研究樣本，沒有的不要創建。
3. 每項判斷：現有欄位足夠／先改語義標籤／學法特性足夠／值得新維度／資料不足。能用既有技能、背景或人格解釋就不全塞先天。
4. 一個相同教師／時間／起始技能、只改候選學習傾向的紙上反例；一個同天賦但因經歷／傳功／志向而不同的反例。沒有公式就寫待定，不自創可執行結算。
5. 最小建議與未決：只選1–2個值得PO下一步確認的問題，不要求三版同時重構。

不改runtime、數值／模板／成長、UI／動畫／素材、存檔或依賴，不新增角色／招式，不開服務／瀏覽器，不跑測試矩陣或啟動loop。已批准開發包沿原授權到穩定交付點，不受研究阻擋。動畫仍由核心真phase／命中／耗能／位移驅動；立繪／頭像／地圖sprite及共用asset規劃不重做，只有與本輪相關的語義差異才補。存檔升版與手機繼續最後。不能寫GitHub就交原聊天供擁有人轉貼。完成回覆後休息，等待新指派。
```

## Grok

```text
你是Grok Bot，請依擁有人最新要求做「角色優先的人物卡／先天天賦差異評估」，只研究並具名回覆#340，不開始實作。
目標分支：codex/solo-sect-grok；本輪盤點HEAD 6db09fd97cac3d9a66cde49103978d7793317418。你若已前進，附當前已提交SHA，只補相關差異，不reset、不讀其他agent未公開修改、不合別版程式。

必讀本輪研究：
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/CHARACTER_TEMPLATE_CONTRAST_REVIEW.md
公版／舊語義對照按需核讀：
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/CHARACTER_CARD_PUBLIC_PROPOSAL.md
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/CHARACTER_CARD_BRANCH_MAPPING.md
主issue：https://github.com/lalagrass/earth-ascension/issues/340
沿用你已交報告：https://github.com/lalagrass/earth-ascension/issues/340#issuecomment-6408140530；這次只補角色差異，不重做原報告。

最新追加方向：這輪一併評估心性／價值、問答生成有感的開局隱藏特性、歷練分支，以及公版武學模板；全為紙上提案，未批准修改系統。先看公版武學模板1–3節與本版對應段落，心性／支系按所選反例讀，不必重讀全部舊報告：
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/MARTIAL_ART_PUBLIC_TEMPLATE_PROPOSAL.md
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/CHARACTER_PERSONA_TRAITS_DESIGN.md
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/CHARACTER_TRAIT_PATHS_PROPOSAL.md
請在原回覆只補最多三個例：①能力接近但心性／價值不同的一對；②開局特性→一次真歷練分叉，分清發現／獲得／啟動、取代／疊加與可見資料；③九劍／降龍的取得、入門、精通、施展＋人物進度＋動畫映射（缺該武學就一門已有武學，不補造）。可合併同一例回答，不要求再做三份報告或逐個角色全評。
東方不敗等只是研究對照。開局特性可以較強，不要求所有路線等強或有同一人格；學法、師承與真功力分開。不把低悟性當降龍必需、高悟性當所有絕學通行證，不用一個隱藏ID綁所有武學。人格／問答結果不是現實玩家心理診斷；MBTI／心印／卦象可作敘事，不作新權威戰力。人物定義、角色所學、核心規則、動畫呈現四份資料分層，公版先唯讀，不改教法／門檻／效果／存檔，不做天賦樹UI或安裝規則引擎。沿用D53女孩純親情與鼓勵無buff的邊界。

方向：先盤點角色身份與階段，逐項核根骨→悟性→定力→力量／身法／耐力起點→福緣劇情。先天潛質、開局已學經歷、性格／意願、當下狀態和劇情所得分開；initial／base／effective不混。原量尺保持，缺項不是0，不能把三版滿分比例當能力等價。
感知、武感、氣感、專注、親和／共感、工巧及新「記識」都只是備選；研究v0數字是紙上假設，不是原著評分或批准新模板。同型天才可以相近／相同，不為辨名字加軸；不同天才要指出學什麼／做什麼會不同。

本版重點：核六主角／14同伴／XIA客卿／劇情卡／portrait圖片ID各層，不把有圖當可選。主角韋小寶wu3與XIA_T客卿wu1是否不同階段／學法？阿星開局wu/gen=1/1是潛質未顯還是真低天賦？H.stats快照、d.wu/root、skills後天值分清，黃蓉與張無忌／令狐沖可做不同天才對照。保留既有leg是腿法技能、agility含移速／閃避的結論；不新增腿力或改arts／skills權威。黃蓉高悟性也不能自動等於所有社交都強。

回覆用具名新留言，不覆寫別人的報告，最多8項摘要＋最多三組角色反例：
1. 身份、分支／固定SHA、已有報告連結及本輪相關差異。
2. 各選角色的原生數值／來源、所處階段、真核心用途；哪些只是混合創角值／回退／未顯露。新增王語嫣、虛竹、石破天、成熟張三豐僅為研究樣本，沒有的不要創建。
3. 每項判斷：現有欄位足夠／先改語義標籤／學法特性足夠／值得新維度／資料不足。能用既有技能、背景或人格解釋就不全塞先天。
4. 一個相同教師／時間／起始技能、只改候選學習傾向的紙上反例；一個同天賦但因經歷／傳功／志向而不同的反例。沒有公式就寫待定，不自創可執行結算。
5. 最小建議與未決：只選1–2個值得PO下一步確認的問題，不要求三版同時重構。

不改runtime、數值／模板／成長、UI／動畫／素材、存檔或依賴，不新增角色／招式，不開服務／瀏覽器，不跑測試矩陣或啟動loop。已批准開發包沿原授權到穩定交付點，不受研究阻擋。動畫仍由核心真phase／命中／耗能／位移驅動；立繪／頭像／地圖sprite及共用asset規劃不重做，只有與本輪相關的語義差異才補。存檔升版與手機繼續最後。不能寫GitHub就交原聊天供擁有人轉貼。完成回覆後休息，等待新指派。
```
