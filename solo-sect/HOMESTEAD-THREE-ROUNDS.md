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
