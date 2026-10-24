# #184 D35 階段A：場景素材與雙人造型（Grok）

狀態：**素材＋概念合成，未接線**（不動 runtime／atlas／LP17）。主筆 Grok（Grok Bot 託管環境）。Refs #184（#182 互連）。依 [D35 工作包](../../../../docs/ART184_PRODUCTION_HANDOFF.md)，沿 [D32 方向](../art184-scene-trio/README.md)。

## 目錄

| 路徑 | 內容 |
|---|---|
| `raw/*.jpg` | GenerateImage 實際原圖（1280×720，純綠底），含一張未採用 v1 |
| `sprites/*.png` | 31 件**真 RGBA alpha** 切件（雙人 12 姿態＋道館 8＋長路 11） |
| `ground/*.png` | 256×256 可平鋪地面：石板院地、土路（地面層，不透明） |
| `export/manifest.json` | 每件尺寸、腳底錨點、分層、建議場景顯示尺寸（`display_scale`／`display_size`） |
| `export/sprites-contact-sheet.png` | 全部切件聯絡表（棋盤格只為顯示透明，非素材內容） |
| `export/duo-turnaround-scale-v2.png` | 雙人正側背／挑擔／採藥同尺度對照 |
| `export/desktop-composite-concept-v2.png` | 1600×900 桌面**概念**合成（zoom 1.5、y-sort），未接線、非實際 1600×1350 地圖 |
| `export/ui-scale-overlay-concept.png` | 真 UI 占用區（紅框）與人物建議尺寸靜態標示：底圖為 dev 已合 `../lp16-integration/desktop-gather.png`（1280×633），以現有主角實測高 ≈85px 為主角基準，熟手 ×72/64、蹲姿 ×0.6；概念、未接線 |
| `source/*.py`／`prompts.md` | 去背切件、平鋪、合成、alpha 核對腳本；prompt 全文、工具與使用權 |

重現：`python source/extract.py && python source/ground_and_composite.py && python source/turnaround.py && python source/contact.py && python source/verify_alpha.py`（需 numpy／scipy／Pillow；在本目錄執行）。

## 分層與尺度

- **地面層**（不透明平鋪／貼花）：`ground/*`、`path_edge_stones`、`spring_pool`、`creek_bank`（貼地，不遮人）。
- **可遮擋層（y-sort，以腳底錨點排序）**：正堂、側屋、門、石牆、水缸、石磨、柴堆、晾架、松／竹／闊葉樹、石、蕨。
- **角色層**：`hero_*`、`senior_*`；錨點＝底邊中心＝腳底，所有站姿頭頂到腳底正規化為**概念建議**（主角 64、熟手 72 場景單位，是 TARGET 直接設定、按各姿態整張裁切高度換算；**尚未**證明與 demo SHOULDER [6.6,-45.6] 腳底／肩掛點對齊，B 待適配），蹲姿採 0.6 身高估計。熟手較高較瘦，主角圓潤；成長不變瘦。
- 建議顯示尺寸見 manifest；正堂約 190 單位高、樹 190–210、石 34–62，長路寬度保持清楚可讀。

## 驗證（實圖／alpha／尺寸；未跑遊戲套件）

`python source/verify_alpha.py` → `ALL OK 0`，exit 0：31 件皆 RGBA、四角 alpha=0、有半透明邊、綠溢色像素 ≤0.6%。已目視聯絡表／對照／合成修正一次切件順序與合成遮擋。

## 已知限制（如實）

- 姿態是**關鍵姿態**，不是動畫；B 需沿既有 POSE／bake 產生連續幀，不逐張生成 57 幀。關鍵姿態與 LP 現有 sheet 的幀名／掛點尚未對位（B 工作）。
- 生成圖：手指／桶繩細節偶有小瑕；兩人衣褶、補丁位置在姿態間略有差異；熟手側面姿態比正面略瘦。道具底部帶少量手繪草皮接地，非完全乾淨邊。
- 主角挑擔桶目前畫成空桶外觀，負重差異要靠 B 的姿態／掛點表現。
- 地面平鋪由生成圖切出再做中心交叉淡化，接縫處略糊；草地底色在合成中是程式噪聲，非生成素材。
- 熟手生成 prompt（`source/prompts.md`）寫「14 歲」是**生成偏差**，不是改年齡設定；D32 既定堂弟約 12 歲、比約 13 歲主角小一歲。保留原始 prompt 紀錄，B 採用時維持少年臉與堂弟關係。
- UI 占用區為目視量測框，非 DOM 實測。
- 光源為左上，與 D32 一致；dojo v1 因紅柱高彩度不協調已棄用。

## B（runtime 接線）—歷史紀錄（已解除）

~~blocked~~（歷史）：當時在等 #274／LP17 最終非作者接受→Earth 合 dev→postCI。前置已在 dev `28bb2e7` 完成，B 已實裝（見下）。

## B（實裝）

`demo/tools/export-art184.js` → `demo/assets/art184-production/`：人物 sheet（契約與 LP17 相同）、bg（無殘影道館替換）、竹叢與三種山石 kit。預覽見 `export/preview/`（contact-sheets、bg-dojo、flow-dojo、flow-long-route）。已知限制：人物為單張姿勢＋剪切步態，非逐幀手繪；山石 kit 比原 Graphics 略大。

### B 補修（review 5632022434 兩 P2）

- **動作／工具語義**：herbHand＝站姿空手（交藥、掌法起手／收勢底圖）；herbGather＝蹲採，烘焙時挖掉原圖自帶竹簍（app.placeBasket 的動態簍是唯一的簍）；rest（熟手）＝席地坐（正面上身＋衣襬落地，同 LP17 rest 構圖），不再和採藥共用一張。熟手側身原圖本來就朝右，修正誤翻面。
- **比例／掛點**：站姿／蹲姿高度改為實量 LP17 同名幀 alpha（主角 173／134 px、熟手 169／130 px），腳底對齊保留的 anchor／hitbox。掌法手臂改讀 sheet `meta.palmShoulder`（新圖實量肩點），app 把肩／肘／手一起平移，PALM_POSE 表、命中與模型不改。
- 對照：`export/preview/fix-{hero,cousin}-lp17-vs-new.png`（上 LP17、下新皮；紅＝hitbox、藍＝腳底、洋紅＝掌法肩點）、`fix-flow-herb-palm.png`（真 app：蹲採／站姿交藥／背簍回程／起手／出掌／收勢）。
