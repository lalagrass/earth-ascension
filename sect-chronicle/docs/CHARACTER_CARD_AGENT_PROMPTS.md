# 十二人公版人物／武學：三方差異評估提示詞

2026-10-26，擁有人確認十二人紙上對照，並要求**先檢查模板是否需要優化**。本輪範圍見[完整對照](CLASSIC_TWELVE_TEMPLATE_COMPARISON.md)；原更多角色保留備選。舊#340報告沿用，不重做全套，不改系統。

[人物卡適配](CHARACTER_CARD_PUBLIC_PROPOSAL.md#9-十二人適配審查與最小補充)｜[武學適配](MARTIAL_ART_PUBLIC_TEMPLATE_PROPOSAL.md#9-十二人適配條目粒度合用與資源)。三段各可手動貼，未代送或啟動agent；可直接讀PR #341提案分支，不必先merge進自己的分支。

## GPT

```text
你是GPT／Codex。本輪只評估十二人與對應條目如何投影到公版人物卡／武學模板，先審模板是否足夠，不開始實作。
分支：codex/solo-sect-gpt；舊盤點SHA 79c1665328c186e7208dbeae3a4f7b20fcb3898f。以你當前已提交HEAD為準並附SHA，不reset、不互合程式、不讀他人未公開修改。
沿用已交報告：https://github.com/lalagrass/earth-ascension/issues/340#issuecomment-6408206643；只補本輪差異。

必讀本輪對照（已有12人階段／18條目與來源缺項，不用再盤全世界）：
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/CLASSIC_TWELVE_TEMPLATE_COMPARISON.md
按需核人物卡第9節與武學第8／9節：
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/CHARACTER_CARD_PUBLIC_PROPOSAL.md
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/MARTIAL_ART_PUBLIC_TEMPLATE_PROPOSAL.md
回覆：https://github.com/lalagrass/earth-ascension/issues/340

限定12人：郭靖、令狐沖、東方不敗、小龍女、李莫愁、黃蓉、阿紫、王語嫣、程靈素、虛竹、周伯通、段譽。W01–W18含體系、單門技藝、合用、知識／生活，不是18門攻擊功法；C／W研究號不要求改runtime主鍵。
先天與起始能力、後天所學、性情／價值、當下狀態分開；成熟／傳功後能力不倒填出生。D是已讀外部JSON，N為敘事參考，P為本作紙上選擇，B是本版證據，不能拼成同一份角色真值。
上游12檔都存在，但郭靖／東方／小龍女／黃蓉／虛竹多個武學配對不符本輪樣本；保留原觀察，不自動替換。MIT文本不等於小說／圖像權利已核。缺版次、階段、人格／價值、特性、材料或圖格就明記；資料有來源與玩家可見是兩回事。

先交模板審查：既有分類／availability是否足夠？版本階段／來源授權、知識vs能施展、entryKind/domain、合用組件／參與方式、器具／耗材等可選補充，哪些可沿用、過度、仍缺？只指出最小必要描述，不新增通用數值／存檔欄位或規則引擎。
本版重點：優先核既有郭靖／令狐沖及U/F/I、traits、程序演出；以王語嫣／程靈素知識技藝做缺項反例。U不是出生悟性，F／I不當承載；沒有根骨、毒物／合用、風險或專用圖格就報缺。九劍入門不等完整九式，快拳／佯攻造成失敗不直接等於內傷。舊SHA只確認本機，不要求為研究push。

最多6項摘要＋一張短表、最多三組合併案例；原碼核讀至多兩門本版已有武學。可從小龍女／李莫愁、黃蓉／王語嫣、阿紫／程靈素、小龍女／周伯通中選兩組，第三組合併本版一門武學的條件案例；本版缺角色／功法就用紙上資料報未實作，不創建。不要做12×18或每人全欄位矩陣。
表中至少列：本版原ID／路徑／真用途→公版位置；原資料觀察／假設／待核；直映／近似／異義／缺項／配對不符；來源／授權範圍與素材缺項；最小adapter成本及1–2個未決問題。
條件案例分入門／理解、承載、控制、特殊前提及作用階段，沿用本版硬門檻／倍率／上限／安全規則；比較理解足但承載可能不足，以及高理解不抵銷特殊前提。沒有強度、控制或內傷規則就寫缺，不造機率／公式；未知不報安全，不假設總有藥物／特性繞過。
知識不強填傷害0；會兩門不等能合用，互搏旗標不等所有攻擊雙倍，知道毒方不等已有毒物；核心有結果才給可施展／可操作。動畫只讀真phase與結果，缺phase／圖格就如實寫缺。

不改runtime、問答／角色模板、數值／成長／傷勢／自主AI、UI／動畫／素材、存檔或依賴，不匯外部資料／安裝skill，不跑服務／瀏覽器／矩陣或loop。原已批准工程到穩定點後再評，D53純親情／鼓勵無buff、保存升版／手機末位與單一入口保持。具名新增#340留言，不覆寫別人報告；不能寫GitHub就交原聊天供擁有人轉貼。回覆後休息，待新指派。
```

## Gemini

```text
你是Gemini。本輪只評估十二人與對應條目如何投影到公版人物卡／武學模板，先審模板是否足夠，不開始實作。
分支：plan/sect-life-architecture-redesign；舊盤點SHA bae43412dced2a2f0d9d82008d5cdf8b3acfb8f9。以你當前已提交HEAD為準並附SHA，不reset、不互合程式、不讀他人未公開修改。
若已交#340報告附連結，只補差異；不因PO未見就重交全套。

必讀本輪對照（已有12人階段／18條目與來源缺項，不用再盤全世界）：
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/CLASSIC_TWELVE_TEMPLATE_COMPARISON.md
按需核人物卡第9節與武學第8／9節：
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/CHARACTER_CARD_PUBLIC_PROPOSAL.md
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/MARTIAL_ART_PUBLIC_TEMPLATE_PROPOSAL.md
回覆：https://github.com/lalagrass/earth-ascension/issues/340

限定12人：郭靖、令狐沖、東方不敗、小龍女、李莫愁、黃蓉、阿紫、王語嫣、程靈素、虛竹、周伯通、段譽。W01–W18含體系、單門技藝、合用、知識／生活，不是18門攻擊功法；C／W研究號不要求改runtime主鍵。
先天與起始能力、後天所學、性情／價值、當下狀態分開；成熟／傳功後能力不倒填出生。D是已讀外部JSON，N為敘事參考，P為本作紙上選擇，B是本版證據，不能拼成同一份角色真值。
上游12檔都存在，但郭靖／東方／小龍女／黃蓉／虛竹多個武學配對不符本輪樣本；保留原觀察，不自動替換。MIT文本不等於小說／圖像權利已核。缺版次、階段、人格／價值、特性、材料或圖格就明記；資料有來源與玩家可見是兩回事。

先交模板審查：既有分類／availability是否足夠？版本階段／來源授權、知識vs能施展、entryKind/domain、合用組件／參與方式、器具／耗材等可選補充，哪些可沿用、過度、仍缺？只指出最小必要描述，不新增通用數值／存檔欄位或規則引擎。
本版重點：優先核persona／工作人物的主權與bone等別名；legends登錄不等可控角色或完整先天。v04／v07／legends同名異ID先核權威，governingStat不等唯一學習前提。挑小龍女／李莫愁或知識／醫毒反例，原版沒有材料／合用／強度就寫缺，不為展示表補控制／內傷公式。

最多6項摘要＋一張短表、最多三組合併案例；原碼核讀至多兩門本版已有武學。可從小龍女／李莫愁、黃蓉／王語嫣、阿紫／程靈素、小龍女／周伯通中選兩組，第三組合併本版一門武學的條件案例；本版缺角色／功法就用紙上資料報未實作，不創建。不要做12×18或每人全欄位矩陣。
表中至少列：本版原ID／路徑／真用途→公版位置；原資料觀察／假設／待核；直映／近似／異義／缺項／配對不符；來源／授權範圍與素材缺項；最小adapter成本及1–2個未決問題。
條件案例分入門／理解、承載、控制、特殊前提及作用階段，沿用本版硬門檻／倍率／上限／安全規則；比較理解足但承載可能不足，以及高理解不抵銷特殊前提。沒有強度、控制或內傷規則就寫缺，不造機率／公式；未知不報安全，不假設總有藥物／特性繞過。
知識不強填傷害0；會兩門不等能合用，互搏旗標不等所有攻擊雙倍，知道毒方不等已有毒物；核心有結果才給可施展／可操作。動畫只讀真phase與結果，缺phase／圖格就如實寫缺。

不改runtime、問答／角色模板、數值／成長／傷勢／自主AI、UI／動畫／素材、存檔或依賴，不匯外部資料／安裝skill，不跑服務／瀏覽器／矩陣或loop。原已批准工程到穩定點後再評，D53純親情／鼓勵無buff、保存升版／手機末位與單一入口保持。具名新增#340留言，不覆寫別人報告；不能寫GitHub就交原聊天供擁有人轉貼。回覆後休息，待新指派。
```

## Grok

```text
你是Grok Bot。本輪只評估十二人與對應條目如何投影到公版人物卡／武學模板，先審模板是否足夠，不開始實作。
分支：codex/solo-sect-grok；舊盤點SHA 6db09fd97cac3d9a66cde49103978d7793317418。以你當前已提交HEAD為準並附SHA，不reset、不互合程式、不讀他人未公開修改。
沿用已交報告：https://github.com/lalagrass/earth-ascension/issues/340#issuecomment-6408140530；只補本輪差異。

必讀本輪對照（已有12人階段／18條目與來源缺項，不用再盤全世界）：
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/CLASSIC_TWELVE_TEMPLATE_COMPARISON.md
按需核人物卡第9節與武學第8／9節：
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/CHARACTER_CARD_PUBLIC_PROPOSAL.md
https://github.com/lalagrass/earth-ascension/blob/codex/public-character-card-proposal/sect-chronicle/docs/MARTIAL_ART_PUBLIC_TEMPLATE_PROPOSAL.md
回覆：https://github.com/lalagrass/earth-ascension/issues/340

限定12人：郭靖、令狐沖、東方不敗、小龍女、李莫愁、黃蓉、阿紫、王語嫣、程靈素、虛竹、周伯通、段譽。W01–W18含體系、單門技藝、合用、知識／生活，不是18門攻擊功法；C／W研究號不要求改runtime主鍵。
先天與起始能力、後天所學、性情／價值、當下狀態分開；成熟／傳功後能力不倒填出生。D是已讀外部JSON，N為敘事參考，P為本作紙上選擇，B是本版證據，不能拼成同一份角色真值。
上游12檔都存在，但郭靖／東方／小龍女／黃蓉／虛竹多個武學配對不符本輪樣本；保留原觀察，不自動替換。MIT文本不等於小說／圖像權利已核。缺版次、階段、人格／價值、特性、材料或圖格就明記；資料有來源與玩家可見是兩回事。

先交模板審查：既有分類／availability是否足夠？版本階段／來源授權、知識vs能施展、entryKind/domain、合用組件／參與方式、器具／耗材等可選補充，哪些可沿用、過度、仍缺？只指出最小必要描述，不新增通用數值／存檔欄位或規則引擎。
本版重點：優先核黃蓉生活技能、已有小龍女／周伯通與功法的真所學／skills雙源；阿紫／程靈素等缺角色就報缺。H.stats與後天skills、悟性與values.wu分開。gated／curCap封進度不等完全不能入門或內傷；dugu原生school=palm如實保留，不為公版改成sword。靜態sprite／缺phase沿原報告。

最多6項摘要＋一張短表、最多三組合併案例；原碼核讀至多兩門本版已有武學。可從小龍女／李莫愁、黃蓉／王語嫣、阿紫／程靈素、小龍女／周伯通中選兩組，第三組合併本版一門武學的條件案例；本版缺角色／功法就用紙上資料報未實作，不創建。不要做12×18或每人全欄位矩陣。
表中至少列：本版原ID／路徑／真用途→公版位置；原資料觀察／假設／待核；直映／近似／異義／缺項／配對不符；來源／授權範圍與素材缺項；最小adapter成本及1–2個未決問題。
條件案例分入門／理解、承載、控制、特殊前提及作用階段，沿用本版硬門檻／倍率／上限／安全規則；比較理解足但承載可能不足，以及高理解不抵銷特殊前提。沒有強度、控制或內傷規則就寫缺，不造機率／公式；未知不報安全，不假設總有藥物／特性繞過。
知識不強填傷害0；會兩門不等能合用，互搏旗標不等所有攻擊雙倍，知道毒方不等已有毒物；核心有結果才給可施展／可操作。動畫只讀真phase與結果，缺phase／圖格就如實寫缺。

不改runtime、問答／角色模板、數值／成長／傷勢／自主AI、UI／動畫／素材、存檔或依賴，不匯外部資料／安裝skill，不跑服務／瀏覽器／矩陣或loop。原已批准工程到穩定點後再評，D53純親情／鼓勵無buff、保存升版／手機末位與單一入口保持。具名新增#340留言，不覆寫別人報告；不能寫GitHub就交原聊天供擁有人轉貼。回覆後休息，待新指派。
```
