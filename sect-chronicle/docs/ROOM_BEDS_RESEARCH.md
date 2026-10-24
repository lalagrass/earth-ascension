# 宿舍、床位認領與漸進改建：開源研究及候選
日期2026-10-24，Codex遊戲PO；本輪依擁有人問「一張床、兩張床逐步改建，角色認領自己的床」整理。沿BL-S01／S03／S04與#75，不另建同義系統。**床／睡眠／改建runtime未批准**；目前只研究與新場景空間設計，不能把既有石凳恢復偷偷換成睡眠或增加缺床懲罰。

## 結論與查核方式

有可參考的完整機制，也有可直接評估的小型JS工具；沒有核實到一個可無縫接入目前PixiJS生活入口的「宿舍認領插件」。優先借穩定身份、房間容量與使用預約的設計，未來只做一間屋／少量床，不為此換Unity／Godot／Java引擎或先建全套建造平台。

Exa兩方向8筆發現結果，深入核官方repo README／license與必要原碼，不以第三方舊程式鏡像作實作事實；另核JS路徑小庫。以下固定SHA是查核快照，不代表已執行、相容或成熟度保證；未安裝／跑外部遊戲、複製碼圖或加入依賴。

| 參考／版本（提交UTC） | 已核與適配程度 | 授權／限制 |
|---|---|---|
| [OpenKeeper](https://github.com/tonihele/OpenKeeper)，6534930b98f15898074a7fb0a762c80de74c9e9d（2026-10-22 18:14:31） | [ClaimLair](https://github.com/tonihele/OpenKeeper/blob/6534930b98f15898074a7fb0a762c80de74c9e9d/src/main/java/toniarts/openkeeper/game/task/creature/ClaimLair.java)把實際lair實體ID綁到生物；[GoToSleep](https://github.com/tonihele/OpenKeeper/blob/6534930b98f15898074a7fb0a762c80de74c9e9d/src/main/java/toniarts/openkeeper/game/task/creature/GoToSleep.java)依有無lair選睡眠；[RoomLairControl](https://github.com/tonihele/OpenKeeper/blob/6534930b98f15898074a7fb0a762c80de74c9e9d/src/main/java/toniarts/openkeeper/game/controller/room/storage/RoomLairControl.java)維護容量，房間拓撲改變可暫拆／重新附同一lair實體。很適合參考「擴房別丟原床身份」 | [GPLv3或更後](https://github.com/tonihele/OpenKeeper/blob/6534930b98f15898074a7fb0a762c80de74c9e9d/README.md)，Java／jMonkeyEngine，需原Dungeon Keeper II資產才能玩／開發；不是可搬的免費美術／JS插件。程式中的玩家ownerId不是單一角色床主，不能混淆 |
| [Project Porcupine現repo](https://github.com/OrderOfThePorcupine/ProjectPorcupine)，19792e9d458f20cabb971c4b60e8b349ea1130cf（2025-01-02 21:00:00） | [家具資料](https://github.com/OrderOfThePorcupine/ProjectPorcupine/blob/19792e9d458f20cabb971c4b60e8b349ea1130cf/Assets/StreamingAssets/Data/Prototypes/Furniture.json)有simple_bed、1×2尺寸、可旋轉、comfort與建／拆工期材料；可借房間／家具資料與可達性分離。本次沒有核實完整個人床位所有權／升級UI，不把有床素材當已完成整套認領 | [README](https://github.com/OrderOfThePorcupine/ProjectPorcupine/blob/19792e9d458f20cabb971c4b60e8b349ea1130cf/README.md)：程式預設GPLv3、非碼資產預設CC-BY-NC-SA3，個別例外另查。舊TeamPorcupine入口已指向此repo；Unity教學／骨架，非可承諾維護或直接移植的成品 |
| [EasyStar.js](https://github.com/prettymuchbryce/easystarjs)，10615147add3af46f76a5d86ee7b7e7bebf83ac5（2020-11-19 03:48:50） | JS格點A*，可設可走格／額外成本、取消及同步模式；語言適配目前JS，可在將來可變牆／床障礙真的需要重算路時評薄整合。**不提供房間、床主、容量或睡眠AI** | [MIT](https://github.com/prettymuchbryce/easystarjs/blob/10615147add3af46f76a5d86ee7b7e7bebf83ac5/LICENSE)；本次只核官方說明／授權，非效能／可重播實驗。現有固定折線足夠就不加依賴；未來採用仍以權威tick固定尋路與穩定打平，不讓非同步完成時間改世界 |

## 適合本作的最小演進（仍是候選）

1. **現在只設計空間**：側屋／宿舍畫出一床初始、增加第二張獨立床與後續擴房的相容平面，留門、床側站位、通道與個人物品。不是只在屋頂畫「Lv2」或加一床卻堵門；現版本無睡眠功能時標「預留」。
2. **日後第一個整包**：一間固定房、少量真床、角色可認領／取消、走到床位使用再回生活，房間／床牌與必要保存一起做；是否睡眠、何時想睡、效果與人工停工續接須另選，不先批新生理條。
3. **再擴一床→雙床／改建**：保留房間ID與bed-A／原角色引用，只新增bed-B；如果房間幾何變動，需驗床側可達／可用名額。使用中的床不能直接消失，把拆床／搬床的等待或改派說清楚；不每次升級全刪重建再抽床主。
4. **多人與生活品質較後**：私人房／合住偏好、舒適、作息、衝突、房租／材料／建造者、完整排隊與人口容量等看試玩再加，非首個床位前置。

資料概念要分清：房間是用途／空間、床是有穩定ID的設施；**認領者、當前使用者、短時預約者**是不同關係。兩床是兩個名額，不是同一床給兩人同時睡。無床／床不可達／有主可否借用、兩人同時認領如何打平、主人離開／床拆除如何釋出，未來整包需明示；不能只改圖片容量或讓畫面自行挑床。

### 驗證與回訪

沿BL-S01，接S03可達性、S04內容資料與U01名冊／床牌；[下一場景設計](SCENE02_HANDOFF.md)只納平面與擴建可能。正式選中後，同作者一PR驗代表雙人競爭／已有床保留／新增床可達／取消或拆改釋放／保存續玩，UI只一段桌面，不所有房型×床型×人物×平台矩陣。純研究現在只查來源／連結，不啟引擎spike／新agent或採購。
