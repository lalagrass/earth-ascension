# 三輪完成：看著一個人的家蓋起來（H31–H36）

2026-10-30 UTC；主筆 Cloud Codex；非作者 `/root/homestead_review`。base `0ac7c5487f31ee803e55d1b83695c77a37834803`，分支 `codex/solo-sect-homestead-three-construction-rounds`。依擁有人要求剛好三輪，每輪先研究／定驗收、實作、測試、獨立審查修復再回顧。[逐輪事前規格／結果](HOMESTEAD-THREE-ROUNDS.md)。第1輪61563fb、第2輪078c120；第3輪與最後文件／真圖的精確HEAD見交付manifest及本地git。歷史分支完整保留，未重接dev。

**只在Cloud本地提交，未push／PR／merge／部署／Space上傳／Mac／付費／排程。第三輪結束，不開第四輪。**

## 玩家能做什麼

| 輪 | 可見改變與真正行為 | 工程界線 |
|---|---|---|
| 1：H31/H32 | 建造卡『看地塊』先看固定位置、外觀範圍、工作點／出入口示意及效果；可取消或確認。第一間屋由木樁、地基、骨架到屋頂逐步出現。 | 與真startBlueprint共用資格，缺木可立計畫但會備料；確認不扣料、不雙立。成形只讀已交木料與work，完成才給房屋收益。 |
| 2：H33/H34 | 點工地／建物或下拉用鍵盤選同一地塊，場景下方查看真材料、加工／施工、主角當前活動；就地暫停、繼續或優先。完工後顯用途。 | 檢視不是派工，控制沿原pauseProject/setProjectFocus；原隊列、carry及需求優先不改。Canvas命中框是外觀範圍，不是碰撞判定。 |
| 3：H35/H36 | 選中工地時看主角正去哪取料／運木／搬部件；可關方向線。材料分共用庫存、工地已交、在途已離庫、待運；真階段列與文字同步。 | 與執行器共用buildDestination；只畫當前任務，不預測物資／XP、不新造導航。取消／暫停無舊路線；返倉料不再歸此site預約。 |

未加建物／配方／資源／技能／生活懲罰／社交／新存檔功能；舊序列化不新增欄位，所有檢視／預覽／線設定都是介面暫態。既有solo／legacy、轉接與存讀保留。家名／屋舍配色沿前輪，不變成施工能力。

## 正常介面證據

全部作者路線都從UI新局零物資／XP／狀態注入，只讀debug作斷言；Chromium154.0.8037.57／Playwright1.62.1。混暫停、4×、16×，不能稱真人或1×完成時間。

- 第1輪[收據](HOMESTEAD-ROUND1-UI.json)：t0預覽／木樁、t17.75已交第一木、t85.5工0.25地基、t90.25工5骨架、t95.25工10覆頂、t100.25完工，真5木／15建造XP。世界暫停、工程暫停及存讀不增工。
- 第2輪[收據](HOMESTEAD-ROUND2-UI.json)：t141.75長凳在途1木，暫停後reserved1→0但人仍帶1木，存讀後繼續；鍵盤改花叢優先，t191.25花叢先完，面板改為可用設施，長凳接續完成。
- 第3輪[收據](HOMESTEAD-ROUND3-UI.json)：從首屋到菜園、灶、木床、木作台、改灶、舒適床，實際加工／搬運中斷、存讀、先休息、再回部件所在地拿取安裝；完成修繕、倉棚、長凳與花叢後自主閒坐。精確世界／壁鐘與部件座標都在JSON，最後重拍對應同一條正常路徑；沒有用fixture取代整條流程。

圖：第1輪[預覽](shots/homestead-round1-preview.png)、[已交木](shots/homestead-round1-delivery.png)、[地基](shots/homestead-round1-foundation.png)、[骨架](shots/homestead-round1-frame.png)、[屋頂](shots/homestead-round1-roof.png)、[首屋完成](shots/homestead-round1-done.png)；第2輪[設施檢視](shots/homestead-round2-inspector.png)；第3輪[實際木料方向](shots/homestead-round3-delivery.png)、[床部件搬回](shots/homestead-round3-parts.png)、[安穩家園](shots/homestead-round3-home.png)。相機固定，線為真當前直線目標，不宣稱能繞障礙。

## 適用驗收與限制

| 狀態 | 實際證據 |
|---|---|
| 通過 | 三輪各在solo-sect跑 `node --test test/*.test.mjs`：**441/441 → 444/444 → 447/447**，完整log在 `/workspace/deliverables/homestead-round{1,2,3}-tests.log`。最後447再跑於最終顯示／fixture修復後，非借用舊438。原48路20日、五seed20000拍與dt／取消／舊資料／本篇等仍隨聚合重跑；不改原樣本要求或把數字當樂趣。 |
| 通過 | 新建設聚焦 **3/3→6/6→9/9**。未知id／legacy床／技能／滿級／已有site／過期stage確認；缺木仍可立；預覽／讀取不改state；三性情從零首屋一次完工；在途暫停／續讀、其他活動原因、床craft/pickup/install、無site與完工階段、錯地塊／取消無假路線等。 |
| 通過 | [五固定指令seed×20日基線配對](HOMESTEAD-CONSTRUCTION-PAIR.json)，用git取**三輪前0ac7c54的原引擎**與現版並行，非兩份現版自比；每拍完整序列化bytes及每53拍續讀一致，共96000拍／5局。涵蓋三性情、手動改令、工程、暫停、補餐偏好與優先。最低飢餓34.425、精力17.6；此情境無0需求，主要結論為模擬未改，不代表新平衡更好。 |
| 通過 | 三輪作者正常UI零注入；1440/390、原生下拉／Tab／Enter／Escape、Canvas含6px border換算、顯示線切換state相同、無水平溢出／pageerror。跨dt回放／資源／XP／容量與舊模式沿聚合；所有圖為真瀏覽器。 |
| 通過 | 非作者每輪獨立跑3／6／9聚焦、bounded Chromium UI與反例，發現後修復。自行核第1輪1440/390預覽零注入；第2輪幾何用明示fixture加原生popup Escape；第3輪390新局／真在途零注入與鍵盤關線。**非作者未獨立跑作者全路線或全447，也未重跑五局20日配對**；其餘是唯讀核收據。 |
| 通過 | 改動mjs語法、git diff --check、文件本地連結；文字patch實套到base並核變動檔bytes。 |
| 失敗 | 無剩餘已知阻擋；初稿／腳本失敗與修復見下節，未隱藏為全程一次通過。 |
| 受阻 | Firefox／WebKit官方域cdn.playwright.dev、playwright.download.prss.microsoft.com先前403政策仍有效，未重試／改端點／proxy／executor／Mac。只有現有Chromium。 |
| 未測 | 真人理解／美感／樂趣、輔具使用者、OS級IME、真機Safari／手機、其他引擎；390只是viewport。外部遊戲／引擎未執行。未改其他產品，不跑Earth／sect-chronicle無關全矩陣；無遠端CI／發布。 |

## 每輪發現與修復

1. R1非作者P3：原通用小工地框疊在新屋架中央。首屋改187×172專用框、木堆屋外、工量底邊，其他工地不變；核source與重拍圖。入口標籤避開HOME人物，木堆再上移避免冷灶標籤邊緣。
2. R2非作者P2：檢視等候工程沒說主角正在採果等活動；復用activityText顯真目前活動，不猜未來。P3：Escape從select外不能退出；移到plot-controls。獨立Chromium實驗原生popup先吃Escape只關清單，再Escape關檢視；其他引擎不宣稱同樣。
3. R3非作者P2與作者同時發現：沒藍圖的空地不該顯『立樁備料』；改『尚未立藍圖』。P3『真正運來』可能誤讀已交，改『在途（已離庫）』。新反例／短UI通過。
4. 作者第一個返倉UI斷言想在4×捕捉很短的return任務，但按暫停時已回倉，失敗是腳本時機；改驗當下reserved0＋carry仍在、隨後carry消失且庫存實增，不把它當遊戲bug。圖曾因fullPage保留scroll讓sticky header遮屋頂，已在拍攝前回頁頂重拍；床中斷點也改為真正走離木作台後，保留實際中途座標再回去拿取。目的地單測工量改讀真recipe.craft，沒有硬寫舊數字。

## 來源採用與拒絕

| 一手來源 | 採用 | 延後／拒絕與證據限制 |
|---|---|---|
| [AoE II官方無障礙](https://www.ageofempires.com/age-ii-de-accessibility/)、[官方地點命令](https://www.ageofempires.com/learn-to-play/match-goals-advanced-controls-xbox/) | 需要時才看位置／高亮、在場景就地操作 | 不照搬軍事、多人、整圖網格；荒居實體搬木沿自己的既有規則，未聲稱AoE建屋也逐根送木。 |
| [0AD BuildRestrictions](https://docs.wildfiregames.com/javascript/simulation/BuildRestrictions.html)、[Foundation](https://docs.wildfiregames.com/javascript/simulation/Foundation.html)、[Builder](https://docs.wildfiregames.com/javascript/simulation/Builder.html) | 資格／原因共用、真工作進度、真目標與停止原因分離 | 文件頁有2022生成時間，未當現版效能或全遊戲審計；不搬領土、海岸、多人效率或AI。 |
| [OpenRA footprints](https://docs.openra.net/en/release/traits/) | 識別外觀、阻擋、通道是不同問題 | 現版仍直線travel，非collision/routing驗收；不能只因可點範圍就宣稱自由放置。 |
| [2021 AoE玩家原帖](https://forums.ageofempires.com/t/add-find-building-hotkeys-option-for-no-building-menu/176254) | 減少找建物／來回控制負擔，補鍵盤可返回 | 個別歷史體驗，不是現今bug或社群共識，不直接採軍事熱鍵。 |

只借原則、自寫幾何／程式，未複製第三方code/assets、未安裝引擎。0AD與OpenRA授權分層見[原研究](HOMESTEAD-CONSTRUCTION-NEXT.md)，引擎開源不代表AoE／EA原版資產可用。Widelands猜的文件路徑本次404未讀到，不以搜尋片段填成已驗來源。

## 停在第三輪，剩餘門檻

可執行的三輪已交付，沒有開H37／第四輪。下一步是[真人探索腳本](HOMESTEAD-CONSTRUCTION-PLAYTEST.md)：是否理解預覽不是立即扣料、能辨成形與停工原因、能否從場景控制而不誤派工、是否感到在經營自己的家；不能用正確性數字代替喜歡。

若擁有人之後仍希望選址，先另定建築本體／屋內使用點／工作入口／通道規則，以及保證果、床、灶、取料點、村路可達的最小方案；原PLACES多處引用與舊坐標也要明確處理。此三輪沒有碰撞或繞路器，任意自由放置不是可順帶交付的小功能。推送／發布另需當輪授權。
