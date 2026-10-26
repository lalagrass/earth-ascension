# 公版人物卡立繪與三分支共用素材取用提案

2026-10-26，擁有人追加「人物面板是否有立繪、共用asset位置／使用方式」。主 [#340人物卡評估](https://github.com/lalagrass/earth-ascension/issues/340)，素材實作仍歸 [#339未排程backlog](https://github.com/lalagrass/earth-ascension/issues/339)。**本輪只規劃／請三方評估，不建立素材庫、不搬圖、不安裝工具、不改載入或遊戲系統。**

[公版](CHARACTER_CARD_PUBLIC_PROPOSAL.md)／[對照](CHARACTER_CARD_BRANCH_MAPPING.md)／[三位agent提示詞](CHARACTER_CARD_AGENT_PROMPTS.md)。公版設計已同意作為評估基準，這裡新增的路徑、打包方式與素材清單仍是待評方案，不自動授權共用原本獨立分支的素材。

## 1. 人物面板的三種圖，不用同一張圖硬撐

| 用途 | 建議呈現 | 跟其他用途的差異 |
|---|---|---|
| 卡首頭像 avatar | 精簡選人／狀態卡，臉或半身裁切，可有焦點錨 | 快速識別，尺寸小；不能假設等同地圖sprite第一格 |
| 展開立繪 portrait | 點選人物後的半身／全身圖，顯示服裝與氣質，放在既有卡片展開區 | 作人物形象，不要求每秒跟地圖動作切換或先做Live2D |
| 地圖人物 sprite／rig | 行走、搬運、休息、施招等相容動作與方向 | 需腳錨、尺寸／遮擋、動作可用性；高解析立繪不能自動轉成逐格動畫 |

共用一份角色視覺設計可衍生頭像與立繪；若原圖構圖不適合裁切，保留各用途專圖。先沿用已有可用素材，缺大立繪可暫用半身圖；缺頭像用字樣／中性輪廓回退，不讓人物卡因缺圖失效。回退是建議，不在本輪實作。

窄卡保持頭像＋現在／原因／下一步＋重要狀態。展開時立繪與生活／武學資料並列；圖以保比例方式顯示，裁切焦點由視覺資料定義，不拉伸身形或遮住數值。此處只規劃桌面，手機適配仍最後。

立繪與人物狀態可用expression／outfit變體，但不為所有表情或技能生成一張大圖。主角／重要同伴有特色即可；地圖動作、姿態與武學呈現走原提案的動作族，不擴成「每人×每招×每種衣服」完整重畫。

## 2. 身份與外觀分開連結

建議視覺綁定至少區分：

- actorId：各核心本局人物ID，包含該人真屬性、關係、命令權限。
- designId：共用角色視覺設計的穩定ID；不因同名或都是hero就自動相同。
- skinId：該設計的衣服／身形／外觀版本；不代表遊戲模板或數值配點。
- assetId：avatar、portrait、map motion或VFX的具體資產引用。

可由不同自創人物共用某個外觀；也可同一人物換衣服而不改actorId、能力或關係。三版對經典模板、原創角色與家人身分的設定各有差異，視覺對應由各版binding表明，不把共用立繪當成跨版同一人物／canon。

素材不能決定角色能否練功／攻擊；人物與武學允許條件仍由核心決定。回覆時列一名實際人物的對應；不把未揭露身份／天賦塞入圖像命名或metadata洩漏。

## 3. 建議共用原圖位置（路徑未建立）

先建議同repo的**邏輯來源位置**，不急著另建素材repo／submodule：

```text
sect-chronicle/assets/shared/             # 提議的來源根，現在未建立
  manifest.json                         # 穩定ID、來源、版本、衍生關係
  provenance/                           # 作者／生成紀錄／使用範圍
  source/characters/<design-id>/         # 大立繪、可用分層原稿
  source/scenes/<scene-or-set-id>/       # 可重用場景原圖
  source/vfx/<effect-id>/                # 可重用效果原圖
  profiles/<design-id>/                  # avatar/portrait/skin、比例／錨點描述
```

此位置只是建議；原始檔是否適合入Git、體積上限、權限／授權與誰負責素材包，待339評估。未決前原檔留原作者位置，不搬、覆寫或改原創作來源。大檔案工具、公共CI／依賴若後續真要更動，再依根契約走相應owner，不因路徑在遊戲目錄就跳過權限。

共用目錄保存原圖與穩定語義，不同引擎的最終Pixi圖集／Canvas索引／壓縮圖另由各版產出。圖集衍生可按需求共享，但先註明格式，不能假設一份Pixi atlas可被所有版直接使用。

## 4. 各分支怎麼使用（待評，尚未部署）

採「固定版本的素材包／asset-only取用」：

1. 素材作者提交來源與manifest；形成可識別版本及commit SHA。可挑頭像／立繪／場景子集，不把所有大圖強塞進runtime。
2. 各分支在自己的binding／lock記錄pack ID／version／來源SHA、所用asset ID與hash。
3. 只把選用素材與必要metadata匯出／複製到各版自己的runtime assets目錄，保留作者與來源；不merge別版遊戲程式。
4. renderer透過本版adapter把asset ID解析到本地URL與圖集；原始圖不從GitHub raw當即時CDN載入。
5. 新素材版本由各版選擇升級，一次更新該版manifest、圖檔與圖集，避免只換metadata造成圖格不匹配。單一正式試玩入口內只使用該版選定的一個素材版本。

候選runtime位置（都不是本輪建立命令）：

| 分支 | 既有遊戲根 | 可評的取用位置 |
|---|---|---|
| GPT | solo-sect-gpt/ | solo-sect-gpt/assets/shared/<pack-id>/ |
| Gemini | sect-chronicle/experiments/water-carry/demo/ | 該demo/assets/shared/<pack-id>/，配原Pixi loader |
| Grok | solo-sect/ | solo-sect/assets/shared/<pack-id>/，配原載入與縮放 |

不共用可寫live資料夾、不跨worktree symlink、不把別人的本機路徑寫入runtime。版本化素材包也不等於新增存檔版本或回退試玩入口；本輪不改保存。既有角色／遊戲資料與素材版本的長期相容性若有真需求，留339後續取捨。

## 5. 最小manifest與呈現metadata

先列用途，不交可執行schema或自動pipeline：

| 資訊 | 用途 |
|---|---|
| assetId／designId／usage／variant／revision | 把角色、用途與素材版本分開 |
| author／origin／sourceCommit／permission | 可追來源與使用範圍；公開repo不直接代表所有圖片可自由共用 |
| file／format／hash／width／height／alpha | 檔案存在性、完整性與解碼需求 |
| faceAnchor／contentBounds（有才提供） | 頭像裁切與立繪留白／焦點 |
| feetAnchor／handAnchor／facing／rigFamily（有才提供） | 地圖站位、拿兵器與相容動作；不從立繪比例猜核心碰撞範圍 |
| derivedFrom／recipe | 原圖衍生縮放／裁切／圖集，避免把衍生檔誤記成新原作 |
| supportedMotions／fallback | 哪些動作真的有，避免列了kick就宣稱已可播放 |

生命／力氣／身法／武學熟練不放進素材包。素材中角色造型的胖瘦／衣服，也不自動賦予核心數值。頭像／立繪改版不重設角色或改權威座標。

## 6. 三位agent這次只評估的交付

各自在#340的同一份具名報告補一小節：

- 一名人物的actorId→design/skin→avatar／portrait／map角色的既有檔案對應；沒有的用途如實寫缺，不畫圖。
- 現有素材能否共用原圖、哪些只是分支衍生；來源／使用範圍已知或待核。
- 頭像裁切與立繪布局、共用motion對體型／武器／腳錨的限制。
- 本版如何固定版本、保持local載入與最小adapter；是否接受建議路徑，替代方案及代價。
- 最小可以先取用的1組人物圖片；與339場景素材候選分開，不要求整庫一次遷移。

這只是評估項目，不預占素材工程、停止現有包、安裝AssetPack、生成新圖或啟服務。既有BRIEF若限制原創／外部素材，先回報需調整的例外與provenance，不能因本提案自行越過原scope。相關規劃回連339，正式採用另定。


## 7. 本輪《功夫》紙上卡片：授權引用既有圖，不搬庫

擁有人2026-10-26追加「有立繪從branch拿，沒有留白待補」，本輪在[電影對照](KUNGFU_HUSTLE_TEMPLATE_COMPARISON.md#4-已有立繪直接引用缺圖保持空白)用固定SHA引用Grok七張既有PNG：阿星、包租婆、包租公、苦力強、裁縫、油炸鬼、火雲邪神；天殘、地缺圖欄空白。Gemini的阿星／包租婆也列替代來源，不互相覆寫。

這次對研究文件引用的明確授權，不代表#339素材庫、打包pipeline或三版載入工程已批准；本節不搬二進位、不新增live共享資料夾。沿sourceCommit／來源路徑／用途與生成紀錄，缺作者權利鏈、最終造型、圖格／rig就記待核，不用別人的臉補缺。圖片視覺不改先天、知識、武學或核心執行；固定分支不存在的圖不先寫假URL。
