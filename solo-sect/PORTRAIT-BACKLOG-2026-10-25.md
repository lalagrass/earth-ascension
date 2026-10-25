# 立繪檢討與 Backlog（2026-10-25）

分支 `codex/solo-sect-grok`，base head `4e3b105`。只加文件與比較圖，未改遊戲程式與 `assets/portraits/`。

## 1. 比較素材

- 我方：`assets/portraits/*.png`，32 張，480×640，RGB。產生方式：Grok Bot 圖像生成，**當時未保存提示詞**（缺口，見 PB-01）。
- 對方：`plan/sect-life-architecture-redesign`（head `32c1b88`）的 `sect-chronicle/experiments/water-carry/demo/assets/portraits/`，7 張，512×512。由 commit `70a7efe`（作者 Gemini (Antigravity)，2026-10-25 13:42 台北時間）加入，commit 訊息寫「watercolor portraits」，**也沒有保存提示詞**。以 `git archive` 唯讀取出，Mac 上的暫存檔已刪。
- 共同角色：阿星、郭靖、韋小寶、令狐沖、岳不群，外加包租婆（對方 `landlady`）。對方另有 `custom_hero`。

| 圖 | 路徑 |
|---|---|
| 阿星三方比較＋縮圖測試（我方／對方／試畫 A） | [cmp-axing-3way-with-thumbs.png](artifacts/portrait-review/cmp-axing-3way-with-thumbs.png) |
| 逐角色並排 | [axing](artifacts/portrait-review/cmp-axing.png)、[guojing](artifacts/portrait-review/cmp-guojing.png)、[weixiaobao](artifacts/portrait-review/cmp-weixiaobao.png)、[linghuchong](artifacts/portrait-review/cmp-linghuchong.png)、[yuebuqun](artifacts/portrait-review/cmp-yuebuqun.png)、[baozupo](artifacts/portrait-review/cmp-baozupo.png) |
| 全體總覽 | [ours-all-sheet.png](artifacts/portrait-review/ours-all-sheet.png)、[redesign-all-sheet.png](artifacts/portrait-review/redesign-all-sheet.png) |
| 試畫 | [axing-test-A-inkline.png](artifacts/portrait-review/axing-test-A-inkline.png) |

## 2. 阿星逐項比較

| 面向 | 我方 axing | 對方 ah_sing | 屬於 |
|---|---|---|---|
| 剪影 | 人物和背景同色（米褐），輪廓融進水墨漬，縮小後剩一團 | 深色外框線＋淡背景光暈，剪影一眼分離 | 風格（明度） |
| 姿勢／演技 | 斜身伸掌、掌心發金光，比較有動態；但頭歪、眼瞇，看起來像「耍帥青年」 | 正面、雙手捧《如來神掌》秘笈，表情平靜帶點倔 | 設計 |
| 表情 | 淡淡斜笑，情緒不明 | 直視鏡頭、OK 繃，「窮但有骨氣」很清楚 | 設計 |
| 招牌道具 | 只有掌心光；吊帶不是阿星特徵 | 白背心＋補丁褲＋秘笈＋OK 繃，四個記號都對 | 設計 |
| 豬籠城寨脈絡 | 無 | 無（只有素背景） | 設計（兩邊都缺） |
| 上色 | 單色褐調、髒污筆觸蓋滿全身 | 淡彩平塗＋一層陰影，膚色、布料、書本分色 | 風格 |
| 線條 | 幾乎沒有線，靠筆觸 | 粗細有變化的墨線，手指、肌肉都有結構線 | 風格 |
| 調色 | 全套 32 張都是同一種褐黃，角色之間難分 | 每人一個主色（藍書、綠馬甲、紫衫） | 風格＋設計 |
| 構圖 | 3:4，頭偏左上，手搶走重心 | 1:1 胸像置中，頭佔上三分之一 | 設計（規格） |
| 解析度 | 480×640 | 512×512 | 差不多，不是主因 |
| 一致性 | 32 張之間很一致（但一致在「暗、糊」） | 7 張之間一致，比例和光向統一 | 風格 |
| 縮圖可讀性（48–64px） | 臉看不出來 | 臉、書都還看得出 | 兩者合成的結果 |

其他角色的情況類似：郭靖、令狐沖、岳不群在我方都偏暗、背景搶戲；對方各自帶一件識別物（郭靖抱拳、令狐沖酒葫蘆、岳不群摺扇、韋小寶元寶）。我方的優點是人物多（32 位）、氛圍統一、部分角色演技更活（包租婆捲髮怒吼兩邊都有、周伯通、火雲邪神）。

## 3. 結論：設計還是風格？

**兩者都有，但「看起來沒感覺」主要是風格造成的，約七成；剩下三成是設計。**

- 風格因素（最傷）：沒有線稿、人物與背景同明度、全套單一褐調、髒污筆觸蓋在臉上。結果是剪影不清、縮圖看不到臉，阿星的臉在卡片上就「沒感覺」。
- 設計因素：阿星少了他的記號（秘笈、OK 繃、補丁、豬籠城寨），姿勢從「窮小子」變成「耍帥」，表情也沒有喜劇感。對方的阿星其實演技普通（正面站樁），贏在記號正確和讀得清楚。
- 所以單純換成某個畫風不夠，要同時補「角色記號表」。

## 4. 《活俠傳》風格適不適合

來源（皆已開啟查證）：
- Steam：<https://store.steampowered.com/app/1859910/>（Legend of Mortal，Obb Studio／原始鳥熊，2024-06-14 發售，92% 好評）
- udn 遊戲角落專訪：<https://game.udn.com/game/story/122090/8114531>：美術幾乎由「熊」一人手繪；趙活刻意畫醜但「醜得有變化」，立繪有大量表情差分；哭臉依個性設計。
- 遊戲分析（vocus）：<https://vocus.cc/article/667711f6fd897800015f7464>：風格統一、遠景簡、近景與可互動物件細；角色配件辨識度高，沒有難分的角色。
- 129 題訪談（活俠傳 wiki）：<https://smilin.net/LoM-wiki/ja/other/qna/interview-129.html>：趙活的臉設計了 3–4 版才定案。

特徵：水墨淡彩底＋清楚線稿的手繪半身立繪、偏動漫的臉、**每人大量表情差分**、配件與性格強綁。

適合度：
- **有幫助的部分**：「線稿＋淡彩」、「每人一個表情差分組」、「配件即性格」正好補我們的兩個缺口。我們的抉擇卡、喜劇卡、問心都是對話型介面，差分很有用。
- **要小心的部分**：它的臉偏美型動漫，周星馳角色（阿星、包租婆、火雲邪神）的喜劇感靠誇張變形，太美型會失味；金庸角色則很合。
- **不能做的**：不描摹、不拿原作素材當參考圖餵生成、不模仿特定角色外貌。只取「做法」。即使是本機自玩，也只當方向參考。

結論：**值得借「做法」，不是整套換成它的畫風。**

## 5. 方向比較

| 方向 | 說明 | 優點 | 缺點 | 適合度 |
|---|---|---|---|---|
| A. 墨線淡彩＋喜劇差分（建議） | 深褐墨線、淡彩平塗一層陰影、宣紙淡背景、每人主色＋記號；表情差分 4 種 | 縮圖清楚；金庸與周星馳都能放；接近對方和活俠傳的優點但不抄 | 32 張要重出 | ★★★ |
| B. 保留現有水墨厚塗，只修明度 | 把人物提亮、背景壓淡、加外輪廓光 | 最便宜、保留氛圍 | 臉仍糊，記號問題不解 | ★★ |
| C. 港漫／武俠漫畫粗線 | 黃玉郎式粗黑線、高對比 | 周星馳味最強 | 金庸女角、生活場景太硬；與地圖小人不搭 | ★ |
| D. 傳統工筆／戲曲臉譜 | 細線工筆、平面裝飾 | 最「經典」 | 表情差分難、喜劇感弱 | ★ |

試畫 A（[axing-test-A-inkline.png](artifacts/portrait-review/axing-test-A-inkline.png)，Grok Bot 圖像生成，提示詞見附錄）：剪影、記號（白背心、OK 繃、補丁、伸掌金光、背景淡淡的城寨樓）和縮圖可讀性都明顯比現版好；缺點是臉偏美型動漫、喜劇感還不夠，正式版要把表情做誇張一點。

## 6. 風格指南（方向 A）

- **畫布**：3:4，960×1280 原檔、輸出 480×640；另裁 1:1 頭像 256×256（以眼睛為中心）。
- **比例**：胸像到腰，頭佔畫面高度約 28–33%，頭頂留白 5–8%，眼線位於上 1/3。
- **剪影**：人物明度與背景差至少 40%；48px 縮圖下要看得出臉和一件記號。
- **線條**：深褐墨線 `#3a2b25`，外框粗、內部細；不用純黑。
- **上色**：淡彩平塗＋一層陰影＋少量高光，光從左上（與地圖一致）。臉上不加髒污筆觸，髒污只放衣服。
- **調色**：底 `#f3ead8` 宣紙、墨 `#3a2b25`；每角色一個主色＋一個點綴色，同陣營（丐幫、華山、明教、城寨）共用色系。
- **背景**：淡到 15–25% 的地點剪影（城寨、華山、桃花島），不搶人物。
- **記號表**：每人至少 2 件固定記號（例：阿星＝白背心、OK 繃、如來神掌；郭靖＝抱拳、樸素布衣；令狐沖＝酒葫蘆、劍；韋小寶＝元寶、瓜皮帽）。
- **表情差分**：日常／得意（或逞強）／受挫（或疲累）／激動（怒或哭），依個性設計；周星馳角色可誇張變形。頭、衣共用，只換臉。
- **提示詞與種子**：每張都存進 `assets/portraits/PROMPTS.md`（角色、日期、工具、提示詞、參考圖）。不得放活俠傳或電影劇照作參考圖。

## 7. Backlog

| ID | 角色/項目 | 問題 | 做法 | 優先 | 建議版本 |
|---|---|---|---|---|---|
| PB-01 | 全體：提示詞紀錄 | 兩邊都沒存提示詞，無法重現 | 建 `assets/portraits/PROMPTS.md`，之後每張必填 | P0 | v1.45 |
| PB-02 | 風格指南定稿 | 未定方向 | 你選定 A/B 後，用阿星、郭靖、黃蓉三張做樣張 | P0 | v1.45 |
| PB-03 | 阿星 | 沒記號、耍帥不搞笑、縮圖糊 | 依試畫 A 重畫，加如來神掌秘笈或掌印、城寨背景、表情更誇張 | P0 | v1.45 |
| PB-04 | 六位主角（郭靖、韋小寶、令狐沖、岳不群、張無忌） | 偏暗、背景搶戲、記號弱 | 依指南重畫，配記號表 | P1 | v1.45 |
| PB-05 | 頭像裁切 | 480×640 直接縮小看不到臉 | 每張另出 256 頭像，UI 小尺寸改用頭像 | P1 | v1.45（配合弟子狀態面板） |
| PB-06 | 縮圖可讀性測試 | 沒有驗收標準 | 腳本出 48/64/96px 對照表，進 artifacts | P1 | v1.45 |
| PB-07 | 開局同門 12 位（黃蓉等） | 同上 | 依指南重畫 | P2 | v1.5 |
| PB-08 | 主角表情差分 4 種 | 抉擇卡只有一張臉 | 六位主角各 4 差分，接到抉擇卡情緒欄 | P2 | v1.5 |
| PB-09 | 自創主角立繪 | 目前灰階佔位 | 男女各 2 款，可換主色 | P2 | v1.5 |
| PB-10 | 地圖小人與立繪對應 | 立繪和小人配色對不上 | 小人主色取自記號表 | P2 | v1.55（新地圖） |
| PB-11 | v1.3 群像 11 位＋其他名俠 | 同上 | 依指南重畫，周星馳角色走誇張臉 | P3 | v1.65（人物內容） |
| PB-12 | 鎮派建築與門派旗幟小插圖 | 未做 | 共用指南色系 | P3 | v1.6 |
| PB-13 | 二代弟子成長立繪（孩童→成人） | 共用 3 種 | 每血脈孩童/成人 2 張 | P3 | v1.7 |
| PB-14 | 立繪一致性複查 | 重畫後可能走樣 | 全體總覽圖＋縮圖表，對照 v1.46 版 | P3 | v1.75 |

## 7.1 既有立繪不重畫優化（2026-10-25 擁有人排入）

既有 32 張不重畫，用後製改善可讀性。PB-15～17 可用腳本批次處理；輸出放 `assets/portraits/v2/`，舊圖不刪，沿用新舊並存開關。批次項排為**獨立美術任務、隨 v1.5 一起交付**（v1.46 是試玩基準，不動素材；不阻擋 v1.5 核心）。PB-18 頭像與 PB-05 合併執行。

| ID | 角色/項目 | 問題 | 做法 | 優先 | 建議版本 |
|---|---|---|---|---|---|
| PB-15 | 全體 32 張：人物與背景分離 | 人物和背景同褐色同明度，輪廓糊 | 腳本去背、人物提亮，背景壓淡或換門派底色 | P1 | v1.5（獨立美術任務，批次） |
| PB-16 | 全體 32 張：外圍描邊 | 縮成頭像認不出 | 人物外圍加深色描邊，驗收用 PB-06 縮圖表 | P1 | v1.5（獨立美術任務，批次） |
| PB-17 | 全體：每人一個主色 | 角色之間難以一眼區分 | 衣服或配件帶主色（郭靖土黃、令狐沖青、張無忌紅…），寫進記號表 | P2 | v1.5（獨立美術任務，批次；PB-10 沿用） |
| PB-18 | 全體：臉部頭像 | 半身圖硬縮小給小卡、名單 | 另裁臉部特寫頭像，UI 小尺寸改用頭像（與 PB-05 合併） | P1 | v1.5 |
| PB-19 | 漫畫符號表情差分 | 只有一張臉，抉擇卡沒情緒 | 疊加汗滴、青筋、臉紅、怒氣符號圖層，不重畫；PB-08 完成前的替代 | P2 | v1.5 |
| PB-20 | 招牌記號修圖（如阿星） | 記號缺漏或錯誤 | 局部修圖：阿星拿掉吊帶、加 OK 繃，其他角色依記號表補 | P2 | v1.65（人物內容） |

註：阿星「更像電影人物」的重畫依擁有人決定暫停。我們不描繪真人演員長相；v2 候選圖與提示詞保留在 `assets/portraits/v2/`。PB-03 的正式重畫一併暫停。

舊圖保留在 git 歷史，重畫時不刪舊檔，先放 `assets/portraits/v2/` 由開關切換。

## 附錄：試畫 A 提示詞（Grok Bot 圖像生成，3:4）

> Original character portrait for a wuxia comedy game: a scrappy young street hustler in a dirty white sleeveless undershirt, dark baggy trousers with patches, messy black hair, small bandage on cheek, cocky half-grin with nervous sweat drop. Upper-body bust, 3/4 view toward viewer, head occupying top third, one arm thrust forward palm open in a Buddhist-palm strike pose, faint golden glow and a small palm-shaped shockwave ring around the hand. Style: clean confident dark-brown ink linework with varied line weight, flat watercolor color blocks plus one shadow layer, light from upper left, strong value contrast between figure and background, limited palette of warm off-white, ink black, rust red accent, muted teal. Background: pale rice paper with a very light faded silhouette of a crowded old tenement courtyard building. Readable at 64px thumbnail. No text, no logo.

## Update: 阿星 v2 candidates (2026-10-25)
6 candidates in `assets/portraits/v2/axing-cand-*.png`, sheet `artifacts/portrait-review/axing-v2-candidates.png`, prompts in `assets/portraits/PROMPTS.md`. Top 3: 2-beaten, 1-sneer, 6-scheme. Next: lock a character sheet (face shape, hair, vest/patches/red sash) and derive the expression set from 2-beaten via reference-image passes; remove AI-generated text; consistency across images not yet proven.

## 7.2 風格方向評估（2026-10-25，擁有人覺得唯美漫畫風無趣）

樣張：`artifacts/portrait-review/style-directions.png`（郭靖＋黃蓉各 4 風格，含 64/48px 縮圖），提示詞見 `assets/portraits/PROMPTS.md`。依擁有人回饋，排名以黃蓉為重。

| 排名 | 方向 | 黃蓉 | 郭靖 | 縮圖 | 判定 |
|---|---|---|---|---|---|
| 1 | 港漫粗線（80 年代武俠漫畫氣勢，原創） | 眨眼＋彈石子，古靈精怪最到位 | 有氣勢但偏帥 | 強 | 主風格；喜劇角色加誇張臉 |
| 2 | 報紙諷刺漫畫／大頭（老夫子式精神，原創） | 吐舌藏雞腿，最好笑但偏幼 | 啃包子最有郭靖憨味 | 最強 | 周星馳角色與表情差分專用 |
| 3 | 年畫木刻 | 噓手勢有戲，配色獨特 | 端正但呆 | 中（背景太花） | 抉擇卡／過場 CG、門派旗幟 |
| 4 | 黑暗重墨（Darkest Dungeon 式） | 像反派，失去可愛 | 酷但不像郭靖 | 弱 | 不採；僅宿敵／魔頭 |

未生成但評估：水墨寫意（縮圖糊、AI 易變唯美）、連環畫小人書（適合事件插圖）、Disco Elysium 油彩（成本高、喜劇弱）、Hades／Slay the Spire（扁平粗線，可借輪廓原則）、RimWorld 極簡（只適合地圖小人）、Cult of the Lamb 可愛詭異、太吾繪卷（同類武俠參考）、浮世繪（日味重）。
建議：PB-21 以「港漫粗線＋喜劇誇張臉」為 v2 主風格，大頭諷刺版做表情差分與小頭像；先畫 黃蓉／郭靖／阿星三張定調（排 v1.5 美術任務，不改既有 PB-03 暫停決定）。

## 7.3 風格方向第二輪（2026-10-25）

擁有人不喜歡木刻和重墨，覺得港漫太像漫畫，硬要選的話選諷刺漫畫。第二輪樣張在 `artifacts/portrait-review/style-directions-2.png`，排名以黃蓉為重：
1. 水彩諷刺漫畫：留住諷刺漫畫的魅力，畫風更像繪畫。黃蓉吐舌拿雞腿最古靈精怪，郭靖鼓著腮幫啃包子最憨。是 PB-21 的首選候選。
2. 繪本水粉：黃蓉眨眼、雀斑、壞笑，生動但不唯美。郭靖太寫實，喜感偏弱。
2b. 墨線淡彩唯美（受活俠傳啟發，只借方向，未拿它的圖餵給工具，也沒照描；擁有人現在也能接受唯美）：最完整、最好看，配件也點出身分（黃蓉的桃花簪、郭靖的蒙古弓）。黃蓉有眨眼、拿雞腿，但比水彩版乖；縮圖表現最好。可以跟水彩諷刺漫畫並列首選，再由擁有人二選一。
3. 黏土定格：最有個性，也最好笑，但偏 3D 動畫感，跟武俠水墨的 UI 可能不搭。可留給特別場景。
4. 連環畫：樸素、耐看，但黃蓉又回到唯美臉，郭靖也太呆板。不採。
待擁有人選定後，PB-21 再用該風格為黃蓉、郭靖、阿星定調。

## 7.4 定調組 v2 與性別風格規則（2026-10-25 擁有人決定）

- **規則：** 女性角色用 inkpretty（墨線淡彩唯美，只借活俠傳的方向），男性角色用 wcaricature（水彩諷刺漫畫）。
- **定調首選：**
  - 黃蓉 `huangrong-v2-a`：眨眼吐舌、彈石子。
  - 郭靖 `guojing-v2-b`：抓頭、嘴裡塞著包子。
  - 阿星 `axing-v2b-a`：黑眼圈、缺牙比讚，秘笈插在褲頭。
- **配對檢查：** 看 `artifacts/portrait-review/keyart-v2-pairing.png`。可以並存，因為紙底和墨線是共通的。差異在女性比較乾淨、偏冷、細節少，男性比較髒、偏暖、筆觸粗；並排時看得出兩種畫法，但看起來像刻意的對比，不算衝突。
- **調和規則（PB-22）：**
  1. 統一底紙：所有立繪去背後，放在同一張米白紙紋上。
  2. 統一線色和線寬：一律用深褐墨，不用純黑。輸出 1024px 時外框約 3–4px，女性的線不要更細。
  3. 共用色盤：男性的飽和度降一級，女性加一點暖色和髒污，各自保留一個主色（PB-17）。
  4. 統一構圖：一律半身，頭頂留白 5%，眼睛約在 1/3 高。卡框和陰影都一樣。
  5. 表情誇張的上限：女性要俏皮、有英氣，避免嫵媚的暗示（吐舌、媚眼、扭捏姿勢）。女性可以眨眼、吐舌、壞笑，但不畫成諷刺漫畫的大臉；男性不畫成美型臉。
- **PB-03：** 阿星照電影長相重畫的那項維持暫停。這次是原創風格化的重畫，不受影響。

## 7.5 定調完成與 v1.5 美術排程（2026-10-25 擁有人核准）

**定調完成（鎖定參考）：** `huangrong-v2-ref`（inkpretty，雞腿版，2026-10-25 擁有人改選；`huangrong-v2-a` 保留但不再當參考）、`guojing-v2-b`（wcaricature）、`axing-v2b-a`（wcaricature）。PB-22 調和規則核准。之後所有重畫都以這三張當參考圖，依性別套風格規則；新圖放 `assets/portraits/v2/`，舊圖保留，用 v2 開關切換。PB-03（照電影長相重畫阿星）仍然暫停。

| ID | 角色 | 性別 | 風格 | 參考圖 | 版本 |
|---|---|---|---|---|---|
| PB-23 | 韋小寶（`weixiaobao`）・主角 | 男 | wcaricature | guojing-v2-b / axing-v2b-a | v1.5 美術任務 |
| PB-24 | 令狐沖（`linghuchong`）・主角 | 男 | wcaricature | guojing-v2-b / axing-v2b-a | v1.5 美術任務 |
| PB-25 | 岳不群（`yuebuqun`）・主角 | 男 | wcaricature | guojing-v2-b / axing-v2b-a | v1.5 美術任務 |
| PB-26 | 張無忌（`zhangwuji`）・主角 | 男 | wcaricature | guojing-v2-b / axing-v2b-a | v1.5 美術任務 |
| PB-27 | 阿芳（`afang`） | 女 | inkpretty | huangrong-v2-ref | v1.5 美術任務 |
| PB-28 | 阿珂（`ake`） | 女 | inkpretty | huangrong-v2-ref | v1.5 美術任務 |
| PB-29 | 包租婆（`baozupo`） | 女 | wcaricature（喜劇例外） | guojing-v2-b / axing-v2b-a | v1.5 美術任務 |
| PB-30 | 彩鳳（`caifeng`） | 女 | inkpretty | huangrong-v2-ref | v1.5 美術任務 |
| PB-31 | 穆念慈（`munianci`） | 女 | inkpretty | huangrong-v2-ref | v1.5 美術任務 |
| PB-32 | 寧中則（`ningzhongze`） | 女 | inkpretty | huangrong-v2-ref | v1.5 美術任務 |
| PB-33 | 任盈盈（`renyingying`） | 女 | inkpretty | huangrong-v2-ref | v1.5 美術任務 |
| PB-34 | 雙兒（`shuanger`） | 女 | inkpretty | huangrong-v2-ref | v1.5 美術任務 |
| PB-35 | 小龍女（`xiaolongnv`） | 女 | inkpretty | huangrong-v2-ref | v1.5 美術任務 |
| PB-36 | 小昭（`xiaozhao`） | 女 | inkpretty | huangrong-v2-ref | v1.5 美術任務 |
| PB-37 | 岳靈珊（`yuelingshan`） | 女 | inkpretty | huangrong-v2-ref | v1.5 美術任務 |
| PB-38 | 趙敏（`zhaomin`） | 女 | inkpretty | huangrong-v2-ref | v1.5 美術任務 |
| PB-39 | 東方不敗（`dongfangbubai`） | — | inkpretty（已定案） | huangrong-v2-ref | v1.5 美術任務 |
| PB-40 | 包租公（`baozugong`） | 男 | wcaricature | guojing-v2-b / axing-v2b-a | v1.5 美術任務 |
| PB-41 | 肥仔聰（`feizaicong`） | 男 | wcaricature | guojing-v2-b / axing-v2b-a | v1.5 美術任務 |
| PB-42 | 風清揚（`fengqingyang`） | 男 | wcaricature | guojing-v2-b / axing-v2b-a | v1.5 美術任務 |
| PB-43 | 海大富（`haidafu`） | 男 | wcaricature | guojing-v2-b / axing-v2b-a | v1.5 美術任務 |
| PB-44 | 洪七公（`hongqigong`） | 男 | wcaricature | guojing-v2-b / axing-v2b-a | v1.5 美術任務 |
| PB-45 | 火雲邪神（`huoyunxieshen`） | 男 | wcaricature | guojing-v2-b / axing-v2b-a | v1.5 美術任務 |
| PB-46 | 苦力強（`kulijiang`） | 男 | wcaricature | guojing-v2-b / axing-v2b-a | v1.5 美術任務 |
| PB-47 | 林平之（`linpingzhi`） | 男 | wcaricature | guojing-v2-b / axing-v2b-a | v1.5 美術任務 |
| PB-48 | 田伯光（`tianboguang`） | 男 | wcaricature | guojing-v2-b / axing-v2b-a | v1.5 美術任務 |
| PB-49 | 楊過（`yangguo`） | 男 | wcaricature | guojing-v2-b / axing-v2b-a | v1.5 美術任務 |
| PB-50 | 油炸鬼（`youzhagui`） | 男 | wcaricature | guojing-v2-b / axing-v2b-a | v1.5 美術任務 |
| PB-51 | 周伯通（`zhoubotong`） | 男 | wcaricature | guojing-v2-b / axing-v2b-a | v1.5 美術任務 |
| PB-52 | 批次後製：PB-15～19 套用於全部 v2 新圖與舊圖 | — | 依 PB-22 | — | v1.5 美術任務 |

附註：**喜劇例外規則（2026-10-25 擁有人核准）**：周星馳系的喜劇女性角色可以改用 wcaricature，目前適用的是包租婆。東方不敗已經定案用 inkpretty。每位各畫 2 張候選，挑 1 張，另附 64/48px 縮圖。驗收標準是跟三張定調圖並排不衝突。

註：黃蓉的參考圖改成 `huangrong-v2-ref`（雞腿版，俏皮有英氣）；`huangrong-v2-a` 吐舌版擁有人覺得太嫵媚，不再當參考。
