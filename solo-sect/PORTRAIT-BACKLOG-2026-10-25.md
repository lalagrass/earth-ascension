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

舊圖保留在 git 歷史，重畫時不刪舊檔，先放 `assets/portraits/v2/` 由開關切換。

## 附錄：試畫 A 提示詞（Grok Bot 圖像生成，3:4）

> Original character portrait for a wuxia comedy game: a scrappy young street hustler in a dirty white sleeveless undershirt, dark baggy trousers with patches, messy black hair, small bandage on cheek, cocky half-grin with nervous sweat drop. Upper-body bust, 3/4 view toward viewer, head occupying top third, one arm thrust forward palm open in a Buddhist-palm strike pose, faint golden glow and a small palm-shaped shockwave ring around the hand. Style: clean confident dark-brown ink linework with varied line weight, flat watercolor color blocks plus one shadow layer, light from upper left, strong value contrast between figure and background, limited palette of warm off-white, ink black, rust red accent, muted teal. Background: pale rice paper with a very light faded silhouette of a crowded old tenement courtyard building. Readable at 64px thumbnail. No text, no logo.

## Update: 阿星 v2 candidates (2026-10-25)
6 candidates in `assets/portraits/v2/axing-cand-*.png`, sheet `artifacts/portrait-review/axing-v2-candidates.png`, prompts in `assets/portraits/PROMPTS.md`. Top 3: 2-beaten, 1-sneer, 6-scheme. Next: lock a character sheet (face shape, hair, vest/patches/red sash) and derive the expression set from 2-beaten via reference-image passes; remove AI-generated text; consistency across images not yet proven.
