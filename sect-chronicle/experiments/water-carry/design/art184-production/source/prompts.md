# 實際 prompt、工具與使用權

- 工具：Grok Bot 內建 `GenerateImage`（2026-10-24 台北時間生成，16:9，1280×720 JPG）；後製為本地 Python（numpy／scipy／Pillow）腳本，見本目錄 `*.py`。未用付費外部服務、未用他人公開素材、未讀 Gemini #274 未公開成果。
- 參考輸入：D32 已合 `design/art184-scene-trio/paint/trio-lineup.jpg`／`scene-master.jpg`（同 repo，Grok 自產）；姿態圖再以本包轉面圖為參考，以鎖臉髮衣。
- 使用權：生成圖由專案擁有人帳號下 Grok 產出，供本 repo 使用；無第三方素材。

| raw 檔 | 參考 | prompt 摘要（全文如下） |
|---|---|---|
| hero-turnaround.jpg | D32 trio-lineup | 圓潤13歲少年、小髻、藍短衫紅布結、深灰褲、草鞋；正／右側／背；純綠底 |
| senior-turnaround.jpg | D32 trio-lineup | 瘦長14歲村少年、深色頭巾、橄欖褐補丁村衣；正／右側／背；純綠底 |
| hero-poses.jpg | hero-turnaround | 同一人：側面挑扁擔雙桶、背面挑擔、側蹲採藥入簍 |
| senior-poses.jpg | senior-turnaround | 同一人：側面輕鬆挑擔、背面挑擔、側蹲採藥 |
| dojo-props.jpg（v2，採用） | path-kit＋hero-poses | 灰瓦木構正堂（石基石階）、側屋、木門（無紅漆）、石牆段、水缸、石磨、柴堆、竹晾架；水彩、低彩度 |
| dojo-props-rejected-v1.jpg | D32 scene-master | 同上第一版；紅柱牌樓與高彩度寫實與其他素材不協調，**未採用**，留作紀錄 |
| path-kit.jpg | D32 scene-master | 兩松、竹叢、闊葉樹、三種苔石、路緣石、泉池、溪岸蘆葦、蕨 |
| ground.jpg | path-kit | 可平鋪俯視地面：左石板院地、右土路 |

## 全文

1. hero-turnaround：Game character turnaround sprite sheet, top-down 3/4 view hand-painted Chinese ink-wash watercolor game style, soft light from upper-left. One character only: chubby round-faced 13-year-old boy, short black hair tied in small topknot, earnest determined expression, short blue cotton jacket with red cloth sash knot at waist, dark grey trousers, straw sandals. Show the same boy three times in a row, full body, same size, evenly spaced: front view, right side view, back view. Standing empty-handed. Solid flat pure green #00FF00 background, no ground shadow, no text, no border.
2. senior-turnaround：同上句式，角色改為 slim tall lanky 14-year-old village boy, youthful face, calm skilled look, olive-brown patched village tunic and trousers, dark head cloth, straw sandals.
3. hero-poses：Key pose sheet of exactly the same chubby boy from the reference (same face, topknot, blue jacket, red sash knot, dark grey trousers, white leg wraps, straw sandals, same proportions and hand-painted watercolor style, light from upper-left). Three poses in a row, full body, same scale: 1) right side view walking carrying a bamboo shoulder pole with two wooden water buckets on ropes, straining but determined; 2) back view walking with the same pole and buckets; 3) crouching right side view picking herbs into a small woven basket. Solid flat pure green #00FF00 background, no ground, no shadow, no text.
4. senior-poses：同 3，角色換熟手，1) 改為 walking easily … relaxed skilled posture。
5. dojo-props v2：Game prop sprite sheet in exactly the same soft hand-painted watercolor style, palette and upper-left lighting as the reference image, top-down 3/4 view, isolated objects with wide gaps: a small rustic mountain martial dojo main hall with grey clay tile roof, weathered dark timber posts, raised grey stone base and stone steps; a small side kitchen/storehouse …; a simple weathered wooden courtyard gate with small grey tile cap (no red paint); a low grey fieldstone courtyard wall segment; a large clay water vat; a stone grinding mill; a woodpile; a bamboo drying rack with herbs. Muted natural colors. No ground under objects. Solid flat pure green #00FF00 background, no text.
6. path-kit：Game environment prop sprite sheet, top-down 3/4 view hand-painted Chinese ink-wash watercolor game style, soft light from upper-left, isolated objects with gaps: two pine trees, a clump of green bamboo, a broad-leaf tree, three mossy boulders, a row of path-edge stones, a small natural spring pool ringed with stones, a short curved creek bank with reeds and pebbles, a small fern bush. Each object separate, no ground under them. Solid flat pure green #00FF00 background, no text.
7. ground：Seamless tileable top-down game ground texture, hand-painted watercolor style matching reference, soft light from upper-left: left half grey flagstone courtyard paving with moss in cracks, right half packed earth dirt mountain path with small pebbles and sparse grass edges. Flat orthographic top view, no objects, no text.

> 註（D35 A 補修）：上方熟手 prompt 的「14 歲」為生成時的偏差，保留原文以如實記錄；設定仍以 D32 為準——堂弟約 12 歲，比約 13 歲主角小一歲。
