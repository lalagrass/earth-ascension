# 三輪建設感工程（2026-10-30 UTC）

擁有人明確指派 exactly three rounds：研究→小規格→逐包實作→驗證／非作者審查修復→回顧，結果定下一輪。實際主筆 Cloud Codex，非作者 `/root/homestead_review`。起點 `0ac7c5487f31ee803e55d1b83695c77a37834803`；隔離分支 `codex/solo-sect-homestead-three-construction-rounds`。只改solo-sect，歷史分支／成果保留，不重接dev。本輪不push／PR／merge／部署／Space上傳／Mac／付費／排程；不重試被拒FF/WebKit下載。直接指派為本地工程依據，不新增遠端認領留言。

## 第1輪事前規格：H31–H32（從0ac7c54）

玩家問題：目前要先立藍圖才看地塊，第一間屋主體到完工才跳出。採[前輪AoE／0AD／OpenRA研究](HOMESTEAD-CONSTRUCTION-NEXT.md)；本次重核[AoE grid](https://www.ageofempires.com/age-ii-de-accessibility/)與[0AD Foundation](https://docs.wildfiregames.com/javascript/simulation/Foundation.html)：放置可視化、施工由真工作量推進。只借原則，自寫Canvas，不搬code/assets。

- H31：既有固定地塊『看地塊』，完成輪廓ghost、佔用顯示與工作點／入口說明；共享blueprintReason與真startBlueprint資格。預覽／取消／切換不寫world；缺木仍可立藍圖備料，技能／屋舍／既有site等拒絕要明白。確認只立一site，不加扣料；當stage變化不能把過期預覽確認成下一級。鍵盤／Escape／焦點、手機寬度與舊模式保留。
- H32：先第一間木屋，依site.delivered與work/workNeed顯木樁、地基、骨架、屋頂收尾；修繕保留原屋加既有施工。階段取0工量／<1/3／<2/3／>=2/3，完工才正常建物收益；視覺門檻不是額外工序或數值。人物只有真正build do才揮槌；材料堆只顯已交材料。

驗收：正常UI零注入首屋、至少4真圖＋site數據；預覽取消state相同、連按一次建案、缺料／技能原因、在途／暫停／休息／離開／重載同工量同畫面；未完工休息能力不提早。三性格20日與固定dt/既有資源XP矩陣沿適用聚合重跑；純呈現無新平衡宣稱。非作者有界diff／反例／瀏覽器複核；作者全跑與reviewer實跑分清。

第2／3輪：第1輪回顧後才定義，每輪最多2–3小包；優先建設可讀、可控制與單人生活整合，不預先灌內容。不自由選址／碰撞引擎／戰爭／社交／新存檔。第三輪結束即停。

### 第1輪作者結果（非作者審查另記）

H31預覽／共享資格與H32真工量成形已實作。`node --test test/*.test.mjs`於solo-sect：441/441，21.57秒，完整log `/workspace/deliverables/homestead-round1-tests.log`；新增建設測試3/3。正常Chromium零注入、混暫停/4×/16×：[收據](HOMESTEAD-ROUND1-UI.json)，t0預覽／木樁，t18木料已交1，t85.5工0.25地基，t90.25工5骨架，t95.25工10屋頂，t100.25完成5木／15建造XP；工程暫停／存讀與世界暫停不增工，非真人或1×耗時。三性情從零首屋完整state配對相等；原48路與五seed等隨適用聚合重跑，不用呈現改動宣稱新平衡。真圖 `shots/homestead-round1-{preview,stakes,delivery,foundation,frame,roof,done}.png`。

現場回顧：預覽讓建屋位置與效果可見，成形不再只在完工跳出；但立下後面板關閉，畫布仍標空地／完成設施名、沒有地方就地問『停在哪裡、誰在做什麼』。下一輪可優先固定地塊檢視與原有工程控制，避免拿自由放置填空。此為觀察／候選，待獨立審查完成才定下一輪規格。

第1輪非作者：實跑新增3/3及1440／390正常新局零注入預覽／取消／確認，未重跑作者整段成形與441聚合。發現P3新骨架中央仍有舊90×70小框／木堆，修為首屋專用外框、木堆屋外、工量條底邊；非作者核source與重拍frame/roof通過，其他地塊不動。作者重拍全UI路線通過（delivery停點更新為t17.75，其餘停點如前）；初輪已跑441的模擬／條件未變，純scene修復復用聚合。入口標籤另避開HOME人物。小木堆與冷灶標籤邊緣近，留到地塊呈現時一起避讓，非阻擋。

## 第2輪事前規格：H33–H34（base61563fb）

第1輪確實改善成形，但場景只能看、已立工程的原因／控制要回側欄翻找。參考[AoE官方地點命令](https://www.ageofempires.com/learn-to-play/match-goals-advanced-controls-xbox/)的場景就地操作概念；另實讀[2021玩家找建物／返回控制抱怨](https://forums.ageofempires.com/t/add-find-building-hotkeys-option-for-no-building-menu/176254)，只當歷史個人可用性需求，不聲稱當代bug／共識。延續0AD真施工狀態與具體原因，不借戰爭熱鍵／群體控制。

- H33 地塊檢視：點已建設施／已立工地，或用原生下拉選擇（鍵盤等價），在場景旁讀當前設施能力、真正材料／施工／加工階段及主角現做什麼；檢視不等於派工／優先。以外觀bounds命中、內含床優先小範圍，非碰撞／可行走驗證。空地可從下拉看待建原因，不自動開藍圖。
- H34 就地工程控制：檢視中的既有site可用原pauseProject及setProjectFocus；只改本來有的工程意圖，不做新隊列。暫停仍保材料、在途改令仍按原取消規則；完成後同一檢視轉設施結果，不殘留繼續工程或施工狀態。

驗收：點選與鍵盤同id、1440/390與border座標正確；檢視／關閉不改state。缺料／搬運／台前加工／安裝／暫停／吃睡或其他活動／完工顯真實狀態，不給菜園叫覆頂。工程控制在途／暫停／續讀／多工地聚焦與原側欄函式完全一致。正常UI新局到首屋，兩工地檢視、換優先、暫停續建、讀檔後重選，獨立審查；適用聚合與既有守恆回歸。仍不改自主策略／資源規則。

### 第2輪作者結果（等待非作者複核）

H33地塊點選／原生鍵盤選擇與H34共用控制已實作。適用聚合444/444、21.86秒，新增建設測試6/6（含第1輪3例）；log `/workspace/deliverables/homestead-round2-tests.log`。正常UI零注入混暫停／4×／16×：[收據](HOMESTEAD-ROUND2-UI.json)。t141.75長凳在途1木，檢視暫停後reserved由1→0、人物仍攜1木，存讀保留暫停，續建後選花叢優先；t191花叢先完成，檢視即轉設施效果／藏工程鍵，長凳仍待料後自行完成。1440及390的Canvas border縮放命中與下拉鍵盤均同一地塊，無橫向溢出／pageerror；檢視不改state。[真圖](shots/homestead-round2-inspector.png)。

第2輪非作者實跑6/6與1440／390 own-context選取純讀／幾何命中；幾何檢查有明示stage1 fixture，不當正常造屋證據。P2原原因只列吃睡／此地施工，沒說其他真活動：補共用activityText目前主角採果等活動，不猜未來決策；加反例。P3 select外Escape不關面板：handler移整個plot-controls；非作者真原生下拉click展開→Escape只關popup，再Escape關檢視，焦點回select（僅Chromium證據）。修復後作者6/6與完整在途UI再跑通過，完成停點t191.25；444聚合的規則未變，展示修復後復用其餘結果。無剩餘阻擋。第2輪收束。

回顧：就地查看與控制已成立；但1木在途仍是文字數字，人物在住處／工地／木作台間移動時，目的地不易連起來。第三輪只把既有真物流及階段做成可掃讀呈現，不再擴建物或調度。

## 第3輪事前規格：H35–H36（base078c120）

R2實際在途暫停路線證明材料守恆，但運去何處仍只在長段文字中。核[0AD Builder API](https://docs.wildfiregames.com/javascript/simulation/Builder.html)（頁面標2022生成）的target／IsTargetInRange／StopRepairing(reason)分離；借『呈現真目標與停止原因』，不把舊API文件當現版效能／玩法實玩。延續[AoE官方高亮與放置網格](https://www.ageofempires.com/age-ii-de-accessibility/)僅需要時顯示提示，以及第2輪歷史玩家找地點／返回控制的個人經驗。Widelands猜測的source路徑／API本次404，未當已讀實作或另行繞取。

- H35 真物流方向：只在選中正在作業的工地，畫主角目前位置→真任務目的地的線／箭頭，並說是前往取料（尚未拿）、搬1木、去加工、拿部件或搬回安裝。從現有執行器抽出共用目的地查詢，執行和呈現同一答案，不建立預測路徑／導航器。不把在身上的木當庫存；暫停／改令／改地塊時沒有舊路線殘留。可關線，文字仍在。
- H36 可掃讀工料與階段：同一檢視下用少量文字格列庫存可用（共用）、工地已交、真正運來、尚待運；首屋用命名的備料→地基→骨架→屋頂→完工階段列，其他工地顯正確加工／施工／用途，不拿屋頂名稱套田。只讀同一site；在途不是又一套庫存，不新開帳本／排程／保存功能。

驗收：fetch/deliver/go craft/pickup/install對真執行目標；do／吃睡／另一工地／暫停／取消無假在途，取消後返倉不再認作此地預約。規劃／切換／畫線／關線不改完整state。五固定seed、三性情／既有長矩陣及不同dt回放隨適用聚合重驗；新增目的地反例與在途存讀、部件中斷。正常UI零注入經首屋、菜園／灶、木床→木作台→改灶→舒適床的真搬運與安裝，圖＋收據；不把混倍速當1×耗時。獨立審查／修復後第三輪結束，不開始第四輪。
