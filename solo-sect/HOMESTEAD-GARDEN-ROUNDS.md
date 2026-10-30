# 又三輪：從施工接到真正生活（2026-10-30 UTC）

擁有人新指派恰好三輪；H37–H39完成不重算。本輪主筆Cloud Codex、非作者 `/root/homestead_review`。base `649fcbf887da25514791be7b911685d8fab1f5bb`；分支 `codex/solo-sect-homestead-garden-life`。核實clean工作樹後接續，原分支／成果保留，不重接dev。只本地solo-sect工程與提交，不push／PR／merge／部署／上傳／Mac／付費／排程／網路安全變更，不重試被拒FF/WebKit下載。

## 第1輪H40事前規格

實際source與非作者核：菜園只在正式stage才有土／三排畦，灶也在stage1/2完工才整件出現，施工仍通用框。這不是重做H38木作：只補既有菜園首築、灶首築與改灶表現。

來源核[0AD Foundation真工作量／預覽分離](https://docs.wildfiregames.com/javascript/simulation/Foundation.html)（2022生成文件），延續先前[AoE視覺／占地社群討論](https://forums.ageofempires.com/t/visual-enhancement-of-buildings-without-compromising-playability/209624)對不改占地改善辨識的歷史個人觀點；本次另讀[Stardew官方1.6 changelog](https://www.stardewvalley.net/stardew-valley-1-6-update-full-changelog/)真位置／地點資訊思路，後續只借狀態對應呈現，不搬新農作／社交／季節／素材。未執行外部遊戲，來源不證明荒居好玩。

範圍：菜園按真work顯逐塊整土→畦列（施工不是種植，未正式完工不畫作物）；初灶從少量石圈到完整圈，鍋／火與料理能力仍要真stage；改灶保留可用舊灶，真work顯基座／兩側／爐口與煙道收尾。材料未交齊或work0不增長，模型預覽只畫完成設施。沿原成本、施工時間、供給、技能、需求、tick與存讀；不加採石鏈或手動新工序。

驗收：零注入UI首屋→菜園→初灶→改灶，各至少前／中／後／完成圖與真work；暫停／存讀／離開休息不增工。未完成園不能farm、灶不能cook，改灶未完不能燉菜；完成造型呼叫與原renderer配對相同。真鍋火只對應實際熱料理活動，不靠裝飾給效果。適用聚合及非作者有界審查，修復後回顧再定第2/3輪。後續優先考慮已建園／灶inspector缺即時狀態的實際決策缺口，不預填功能湊數。
