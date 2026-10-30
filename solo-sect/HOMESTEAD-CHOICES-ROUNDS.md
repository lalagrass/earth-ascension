# 新三輪：建造選擇與生活設施（2026-10-30 UTC）

新指派恰好三輪，前H31–H36已完成，不重算為本輪。實際主筆Cloud Codex，非作者 `/root/homestead_review`；base `2d7e312d382d5a79d78d3456bc468b8c09092430`；隔離分支 `codex/solo-sect-homestead-construction-choices`。核實雲端檔案／clean HEAD後接續，歷史分支／成果保留，不重接dev。只本地solo-sect工程／提交；不push／PR／merge／部署／上傳／Mac／付費／排程／安全設定變更，不重試被拒FF/WebKit下載。

## 新第1輪／H37事前規格

實際code與正常UI核現況：既有固定地塊預覽只有線框及效果文字，木屋1→2看不見新屋頂／門窗，其他設施只有矩形輪廓。這不是再做H31地塊功能，而是**建造前的成品造型比較**。非作者唯讀亦確認此缺口。

來源重新核[0AD Foundation.CreateConstructionPreview](https://docs.wildfiregames.com/javascript/simulation/Foundation.html)（文件有2022生成時間）與[Tiny Glade開發者頁](https://store.steampowered.com/app/2198150/Tiny_Glade/?l=english)：採預覽與實體分開、先看再決定、可逆無懲罰；不搬引擎／素材／自由建築／龐大內容。未執行外部遊戲，來源不證明玩家喜歡。

範圍：同一既有renderer產生『目前設施造型』／『完工示意』兩圖，保留真配色與固定場景脈絡；不畫人物、標籤、施工框或假工作。預覽圖型別與world分開，不能被當合法遊戲存檔；真資格／材料／效果仍讀原world。未解鎖亦可看造型，但明說不代表可立即建。保留地塊位置線框、取消／Escape／確認一次、過期stage拒絕。

驗收：未建首屋、木屋1→2、灶1→2、木床1→2、菜園／倉棚等成品圖可辨且對真設施造型；同一視角前後圖、中文標題／文字效果同步，1440／390鍵盤可操作。預覽／重繪／切換／取消不改world完整bytes，假view拒當真存檔，不發資源／XP／設備收益。舊存讀與既有工程守恆不變；適用聚合＋非作者有界審查，正常UI零注入進屋／預覽／取消／再確認修繕。

新第2／3輪在每輪回顧後再定，最多2–3小包，不為數字硬加功能。候選非首屋施工目前仍通用框／完工瞬現，須依新圖核實；沒有自由擺放／碰撞／繞路或新AI／社交／存檔框架授權。第三輪完成即停。

### 新第1輪／H37結果

作者適用聚合450/450（22.23秒，choice1-tests.log），新模型3/3；非作者獨立3/3及1440/390新局預覽／取消／焦點／world位元不變。作者正常UI零注入混暫停/16×：[收據](HOMESTEAD-CHOICE1-UI.json)，t0首屋示意、t100.75木屋1→2對照並真修繕，t504.25已有屋2／菜園／灶／木床，看缺木作台的舒適床與灶升級；前後像素通道差91405／74264／64781／34649，都是同停點，不冒稱1×或真人體驗。[改前](shots/homestead-choice-before.png)、[屋修繕](shots/homestead-choice-upgrade-preview.png)、[床局部](shots/homestead-choice-locked-bed-preview.png)、[灶](shots/homestead-choice-stove-preview.png)。

非作者P3：床局部原裁到門，容易誤認窗口。縮到同實景床面、明標『屋內床鋪局部（床墊／枕頭）』，不改世界床形／位置；非作者核新圖解決。作者補前置原因／部件解釋句點與modelOnly不畫工地／料理火斷言，再3/3及正常UI重拍通過；其餘模擬未變，復用450。所有視圖kind=homestead-preview拒作真存檔，無提前能力。第一輪完成。

回顧：未建與完工樣貌現在可比；但現場看長凳、木作台、倉棚施工，仍是通用框到成品瞬現。這個缺口由code與非作者雙方核實，不是重做首屋H32。下一輪限這三種已有木作設施成形，保持實際成本／工作與已建外觀。
