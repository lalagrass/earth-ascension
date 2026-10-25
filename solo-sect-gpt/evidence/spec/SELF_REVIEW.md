# Spec作者自校

2026-10-25（Asia/Taipei）。GPT／Codex，指定 GPT-6.1 Sol / high；作者自校，沒有獨立審查。工作區 `/Users/chenyuying/.codex/worktrees/solo-sect-gpt/earth-ascension`，branch `codex/solo-sect-gpt`，接手HEAD `14432ac879424ba5b97ca69279af9f4787845fb3`，規劃artifact `e530a2c078722fd69732332eef2cd964da99ad24`，base dev `148cfbbb27e43475c66744d53c2451125a9111a0`。

## 輸入與來源核對

已重讀BRIEF、planning.ready、四份規劃及layout.json／README／檢視器HTML，目視planning的viewer-S2畫面。ready的status、branch、artifact祖先關係與所列25檔在指定commit可讀，工作區起始乾淨。保留規劃及原ready檔，沒有代改上游。

三固定來源沿規劃的完整來源盤點；本階段再次讀Grok與Gemini FEATURES，直接抽查dev routes的SEATS／MEET／TRAIN_POSTS與床路、palm起手／收勢、patrol真返程；Grok DESIGN／ROADMAP與expedition的startExpedition／fight／expStep；Gemini reservation、martial-combat、grand-founding-save與demo/model的dispatchSegmentedPatrol／breakthroughLuohanLv10。dev願景／武學／生活研究、LIFE_M1與FUTURE_BACKLOG的產品邊界作對照。沒有宣稱本階段重新讀完或重跑三來源全部程式／測試。

| 來源 | 本次看到的具體風險 | spec處理 |
|---|---|---|
| dev `148cfbbb27e43475c66744d53c2451125a9111a0` | routes仍以hero/cousin固定雙人、共院心端點；palm有novice/adept fixture；原木／工地／床只本局 | 不按兩ID擴容、不把選fixture當真成長；S02–04動態人物／當前位置尋路／預約；S07真三軌，S11新隔離保存 |
| Grok `7eb0f7a309e9ee90612ddd0f4f8ef08faf39be47` | FEATURES自己區分腳本展示與UI；expedition清path設away，fight以0.5秒DPS，backLeft倒數返院 | 保留生活／身份／日課觀念，S07/S09同圖動作與真返程；不沿用背景勝負；193測試／7UI只為來源作者紀錄 |
| Gemini `32c1b88adbe00e206a6590ecf4f4e47261ceb9b9` | core有node:fs讀資料；展示函式直接寫清場／level10；FEATURES明列未完整合流畫布／保存 | S01純模擬瀏覽器可用，S10禁賦級／戰果捷徑，A00分M/U/V證據；單一World，不搬兩套狀態 |

本輪沒有外站研究新主張或移植外部碼／美術／音，外站證據與具體授權限制沿規劃DECISIONS，不推定「可讀repo即可商用」。本輪沒有聯絡任何其他作者／聊天，沒有子代理。

## 產品到規格覆蓋

| 規劃要求 | 規格／驗收 |
|---|---|
| SL0真地圖／第三人／素材分層 | S02–03、B02–05；A01–04/A41；C03 SL0 |
| SL1取木／搬運／修床／練拳／有限護家 | S04–05/S07/S09；A05–07/A17/A21 |
| SL2雇工同ID／首徒／生產建設／內門 | S04–06；A08–10/A16 |
| SL3自主日常／可讀理由／成年家庭／8＋2 | S03/S05–06；A10–15/A43；小女孩雙層選角拒絕A14 |
| SL4五門六動作／演武／三段遠征／真返回 | S07/S09；A17/A20–26/A40；不另開戰鬥系統 |
| SL5低高悟都深修／九劍失敗／五人故事 | S07–08；A18–19/A27/A29–32；10節點＋主角替代 |
| SL6自創／三模板／性向／古洞兩分支 | S06/S08；A28/A33；choice／承諾／履約分開 |
| SL7立匾／存讀／教學聲音／全功能 | S01/S10–11；A34–44；B06音訊／C06完成標記 |
| 固定seed／暫停／倍率／改派／缺資源／無路 | S02–04；A02–06/A11/A23–25/A35–40 |
| 正常玩家路徑與畫面 | A00、U01–U05；不以M層fixture代UI；未獨立review／未真人試玩明列 |

## 作者因果走查與補正

1. 從3人破廳走第一日：木石從採點→手中→工地，dorm完成4床，可把hall臨鋪住者搬出，後續修廳不憑空減床。採集量240木／160石足以列出的固定建設，初始菜／餐讓備餐與邀人有開始來源。阿木本來已是留宿常住，轉外門不能多算床／人口。
2. 四成年門人完成線可用掌門＋阿木＋林青＋沈禾，小女孩另占床；不依賴招全部五名俠，mature模式也可結尾。五名俠逐次日訪／排約，十節點可在2訪客限制下完成；周行護送先留日訪槽，無到家才超容。
3. 遠征負重改令、糧留洞、周行扶助、救援都保同ID／inventory，真回家才記結果。窄橋不為兩人扶助擴成容量2：護送者先過、傷員單列；橋中失能用岸端繩沿橋實拖回，保留token，列入開發反例。救援不代清敵／不免費補滿；周行已占訪客槽時可由一名救援者分趟，不等兩槽全空形成死鎖。
4. 成熟喬峰故事限定護送同行能真走路／照料／見證，但不能變可派遣宗師代打；主角模板的自身節點有同樣教學／練習來源，不生成第二個自己。
5. 打樁只給熟練，深修還要兩種可實得情境；低悟不鎖死、高悟不排除。模式觀察、LOS／時機／朝向／收勢阻止九劍必中。演武HP50%安全底線同時觸發session判負／退出，不等待不可能到達的HP0，兩波可真正結束。UI能學會／練熟，沒有設level或固定清場按鈕。
6. 保存活動中途狀態，codec不清預約裝作成功；暫停載入不追離線時間；舊key用sentinel驗不動，壞檔／quota不能覆寫最後有效槽。倍率／鏡頭／聲音只變view，不能變World。

以上是紙上走查，**不是已證實擁塞、碰撞、平衡、救援可行或60–90分鐘節奏**。runtime的室內sweep、河岸封閉／側路、橋上失能／3人分趟救援、8＋2負載、全部人物事件與正常UI通關仍要開發逐案驗。可逆數值／局部幾何可在本章內校準，沒有尚待擁有人決定才能開始的項目。

## 實際執行檢查

結果見同目錄checks-summary.txt；原始root-unittest.log、m2-syntax.log、document-check.log、layout-check.log與whitespace.log保留。這些只證明文件／既有根檢查，沒有跑新遊戲測試／瀏覽器UI／舊SG完整RT，沒有啟動server或使用8800。文件沒有改遊戲code，因此未以此純spec階段跑遊戲程式專用Node矩陣；開發階段依ACCEPTANCE執行。

預設Homebrew Python3.14執行layout檢查因系統libexpat符號不相容而失敗，原log留 `layout-check-default-python-failed.log`；改用上游README指定的 `/usr/bin/python3`（3.9.6）原命令通過。沒有修環境／改上游腳本；53根測試以預設Python3.14.8通過，Node語法檢查版本24.13.0。

真正阻塞：無。規格已足以開發，停止新增願景；下一階段依同一spec完成第一版及真驗收，不能把本文自校當完成遊戲。spec提交與ready提交分開，ready的artifactCommit指完整四文件／證據commit，planningCommit保留上述固定值。
