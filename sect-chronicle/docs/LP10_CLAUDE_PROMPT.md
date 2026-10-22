# Claude兩小時提示詞：LP-10掌法畫面與點選設計（#220）

批准 [D20](DECISIONS_AND_SOURCES.md#d20lp-10-掌法畫面稿與點選流程-q1q4-批准2026-10-22)，精確交付沿 [LP10工作包](LP10_HANDOFF.md)。批准同步文件合dev／postCI後可貼給Claude本人核最新狀態認領；未代啟作者。

```text
你是earth-ascension的Sect Chronicle LP-10 #220設計交付主筆Claude。擁有人2026-10-22已批准Q1–Q4：先交掌法畫面與點選流程；一式掌法、約三隻測試弱鼠、初學／熟練節奏對照；警覺鼠可逃離，失效換有效目標／出界不追；玩家明確發起、可叫停、結束返院回生活。不重問四項。這一包是設計交付，不是戰鬥runtime；不自動接下一程式包。

先從repo根讀AGENTS.md／CONTRIBUTING.md、sect-chronicle/AGENTS.md、sect-chronicle/docs/DECISIONS_AND_SOURCES.md的D20、sect-chronicle/docs/LP10_HANDOFF.md與本prompt，讀#220本文／全部最新留言和相關PR。LP09 #232／PR235已合dev167a9816cb71ad9fd8067411912793ed6b1eadcc、postCI39788194427五SUCCESS。另核本次D20批准同步文件已由Earth PO合dev且postCI通過；舊backlog未批文字不擋本次有限設計，也不能拿批准文件當畫稿已交或runtime已授權。

本人核無有效重疊作者後，從最新dev建獨立worktree短分支，在#220登記真身份Claude、base SHA、精確檔案與GitHub created_at＋4h，再重讀核最早有效認領。提示詞不等於認領，有有效作者就唯讀交接。實際本次開工新T0、記UTC與台北截止T0＋120min；100min後不開新包、達標早停，4h不延長2h、不沿LP09窗口。不動他人checkout／未提交成果／服務，不啟子agent或排程。

只改sect-chronicle/experiments/water-carry/design/LP10.md與design/lp10/**，必要時實驗README一行設計索引（先列認領）。先完整同生活場景桌面畫面、390px配置、可編輯來源與輸出；有兩人外觀／現有場景、三鼠編號／護院邊界、人物／目標選取、發起／叫停、意圖／結束原因。畫出接近、站定起手、掌接觸、收勢／受擊或退走、逐隻轉向與回院，初學熟練用同鏡頭／路程分段對照。不要只交文字、局部人物或把倍率變快冒充武技。腳力只管移動，不由Lv1～5、體態、MBTI定傷害；熟練差異是明標的設計fixture，非已實作角色能力。素材借用／缺幀、來源授權與未驗限制寫清，不先重畫整套atlas或換引擎／買素材。

依HANDOFF的S0生活→S1手動發起→S2接近→S3起手接觸→S4換目標／逃離→S5叫停或結束返院，交可依序點看的設計狀態、操作表與三條短路徑：A連續處理、B目標起手前後先逃／失效換目標或出界結束、C玩家叫停回生活。建議輕量HTML熱區翻稿（少量展示JS/CSS可以），各頁固定標「設計示意，未連遊戲」；只切換畫稿，不匯入model.mjs、不跑世界時鐘／RNG或計算HP／傷害／精力，不回寫生活。初學熟練節奏用相對時序、不凍結新毫秒／HP／傷害值。可示意一掌解決弱鼠，但不能聲稱已驗真命中／擊殺或隔空刪鼠。警覺鼠只因可察覺逼近／同伴遇襲逃，不預知玩家；逃走不等擊殺／遷徙，測試鼠不自動補滿、不宣稱繁殖。

稿上列下一最小可操作包仍待定的建議與取捨：合法出發／完整交付與必要恢復、人工停工叫回／原guard-fix優先與返院接續；精力成本；權威接觸命中／距離／目標失效與一次結果；HP／傷害／間隔；熟練來源（本輪無戰鬥XP）；三鼠生成重設、有限範圍與叫停生效邊界。這些不能由展示HTML先實作成正式語義。無自動殺敵、人傷、真偷糧、掉落、戰鬥XP、繁殖／巡山／完整生態或存讀；#219不是硬前置，#215不是大拆gate。設計稿接受也不授權自動進runtime，要等下一工作包的產品定案。

不改demo/**、checks/**、spikes/**、atlas、主生活入口、舊viewer/js/storage、Earth、root依賴CI／RNG／golden；不動8800接受入口（仍LP09）或他人服務。自己選未占用埠開設計。交design/LP10.md入口，連畫面、可編輯源／輸出、點選URL、三路徑、初學熟練對照與待決項，保留／調整／延後去向清楚。

驗收只按設計階段：打開圖核完整構圖與動作接觸，少量紙上／熱區三路徑；HTML一次桌面＋390px實際點選並開少量代表圖，核新增控制可用／無溢出／可回前一狀態，必要JS語法／連結／來源／fence／新檔空白。根python3 -m unittest discover -s tests -v、node --check earth_ascension/static/m2.js、git diff --check及適用CI保留。不寫戰鬥runner／命中測試／偽引擎，不另跑LP09全套或主線長矩陣／世界seed，不改CI跳過現行快驗。未變場景／atlas／生活證據復用，完整log落檔只讀摘要／失敗／少量圖；真exit與GPU／CDP限制照實，不過濾、改門檻或反覆追綠，不把設計串稿當真人戰鬥／平衡通過。

只本包循環：可看畫稿→點選流程→必要自查→小PR→非作者review→必要補修→Earth PO唯一dev squash→postCI。前15min核素材／構圖，力求60min前完整畫面，餘時串稿驗證交PR，非保證交期、不降gate。ready回#220／#67，附真身份／base/head／檔案、畫面與URL、三路徑、待決事項、命令真exit／限制與少量圖；自查不是獨立approval，共用帳號COMMENT標身份，不自行合dev／main或刪分支。達標早停；截止／quota不足或外部review／CI未完，保存可用稿、branch/head/PR與已做未做／缺口，回review或released如實交付停止，不超時、假稱完成或啟動下一階段。PO會依接受稿供擁有人看，主生活8800仍LP09。
```
