# SCENE-NAV-01 — #367（#365 最後包）

實際作者 Codex Cloud `/root/presentation366_author`，host `c39a8ded2b44`，隔離 checkout `/workspace/navigation367-author`，branch `codex/367-scene-navigation`，base origin/dev `3079a03de5c2e8c79af64b0962ae3da75f274466`。狀態：作者整包交付候選，待 grass 非作者集中 review／#67／dev 與必要 postCI；不是作者自審或整合收據。

## 玩家問題與短流程

挑水長路在大場景容易失去位置參照。正式 `sect-chronicle/index.html` 仍跳到同一生活入口，HUD「導覽」開收同一個紙墨小地圖。●表示當下人物，□表示已知地點，虛線框是原相機視窗與地圖邊界的交集。點人物走原 select／follow，點地點用原 locateView（由既有 look 抽出原公式）；不發 work、move、teleport 或任何模型指令。

兩分鐘：暫停→開導覽→點熟手→選泉眼→原場景拖曳／縮放看視窗框→關開人物／地點圖層→選主角、4×沿原長路下行→暫停核位置→重來清 epoch。UI 與小地圖沒有另一個時鐘。鍵盤／pointer／wheel 在導覽內不穿透原場景或全域播放指令。

## 資料與生命週期

- `navigation-view/contract.mjs` 只收 SceneDefinition 的原生 width/height、當下公開 SceneSnapshot、原 camera/viewport。只複製 id/label/x/y，不把 action、秘密、事件、歷史快取或未知設施傳入 NavigationView。
- 設施只取當下 snapshot.facilities，不以 definition 裝飾、世界快取或背景圖作 fallback。正式 `official.mjs` 補上原已畫的茶座／枯木／寢舍／院倉／練功樁掛點，直接引用 routes.mjs 原座標；不展出未公開床位／預留工坊，不新增建物或規則。
- 生產 SVG renderer 用原生 viewBox，保留各版比例；圖層關閉後 marker/list/pick 同時移除。marker 以 id 小量更新，人物不再可見即刪除舊 node/title/焦點面；source/epoch 改變時刪掉全部舊 marker/dropdown 暫態，不留下歷史軌跡或探索記憶。
- selectedId 每次只核當前公開 actors，沒有第二份人物選取權威。原正式 reset／成功 load 之後立即重繪導覽 epoch，保留既有 world/save 語義。
- route 明示 `unsupported`：「實際路線未提供；不推算路徑或目的地。」現有公開 SceneSnapshot 沒有角色實際剩餘 path，公開固定水路幾何也不代表每個角色當下實際路徑。不讀 raw private path、不連端點、不算 UI A*。缺路線不阻擋位置導覽。

## 來源與能力表

| 版 | 位置／邊界／可見性來源 | 本包導覽 | 缺項 |
|---|---|---|---|
| 正式 current dev（Gemini-derived） | base `3079a03…` 的原 model.view／sense.placeOf → createGeminiAdapter；WORLD_SIZE 1600×1350、公開 places/routes 掛點 | 正式入口，人物／已知點／視窗框／原跟隨定位；不改原速度差、暫停、倍率 | SceneSnapshot 沒有公開實際角色 path；不從裝飾／巡山未見資料補野獸 |
| 固定 GPT `6cbd3e6fccb8bc376e95e2f406ce6cead2a30fdc` | 未改原20Hz world，Q=256只轉呈現；gptDefinition/map.world 2400×1800；原 visibleEntity／LOS；snapshot 原設施 | 原 `scene-shared/harness/?core=gpt` 接同一 renderer；已知設施、當下公開人物、原生尺度；操作只camera/selected | 沒有公開route projection；不從 raw people.path/known 記憶取線或位置；不是正式替代遊戲 |
| 固定 Gemini `bae43412…` | 原 scene-shared harness／同 SceneSnapshot 和1600×1350邊界 | 同 harness 薄接線可收當下人物／camera | 該host原未傳公開 facilities，保持空；無實際path；不宣稱已同步原作者最新功能 |
| 固定 Grok | 原 adapter 有節點座標，但 definition 未提供 width/height | 本包未接線，不硬套1600×1350或由node估世界邊界 | 未證bounded map/camera／當下可見與公開path能力；不改原作者分支／固定core |

原 SceneSnapshot.source 的既有來源標識保留；本包正式 host 的實際 base/head 另在 PR 鎖定，不把固定來源說成原作者最新版。

讀過 [Tiled Layers](https://doc.mapeditor.org/en/stable/manual/layers/) 的 object point／圖層顯示概念；只借分層和點資訊概念，不複製程式／圖像、導入Tiled/TMX或改碰撞／尋路。共用外觀沿 [#366 tokens](../public-ui/style.css)，無新framework/npm/字型/大地圖素材。

## A–D 證據與限制

5項局部反例：原camera轉換和不同native尺度、正式read-only/速度差、原GPT invisible→visible→invisible及epoch、hidden/unknown設施／額外payload遮罩與layer-off pick、公開掛點來源。命令：

```sh
node --test sect-chronicle/navigation-view/checks/navigation.test.mjs
node sect-chronicle/navigation-view/checks/desktop-check.mjs
```

Cloud桌面沿同一頁依次正式入口→既有固定GPT harness→既有 #357 可見性proof，最多一個page/context/browser與一server:8837。第三段沿既有明標 observer placement fixture，只在開發頁移觀察者來驗原LOS，不能冒稱正式玩家移動或傳送。真snapshot／DOM/title/list/pick與epoch清理都有反例；固定core bytes／world規則未改。

實際結果在 [desktop JSON](../navigation-view/evidence/desktop-results.json)／[測試摘要](../navigation-view/evidence/test-summary.json)。少量桌面圖：[正式導覽](../navigation-view/evidence/official-navigation.jpg)、[原長路位置](../navigation-view/evidence/official-long-route.jpg)、[第二真核心](../navigation-view/evidence/gpt-native-navigation.jpg)。桌面初驗找到select/reset到下一frame前的小地圖舊狀態，已在原UI接線加即時refresh，最終整段通過。每次finally清page/context/browser/server，自有viewport還原。

必要Python／m2 syntax／現行game快驗與當前head CI在PR列實際結果；不跑手機、全人物／全倍率或新增長seed／保存矩陣。復用 #342 原camera/renderer、#357可見性／#366狀態focus／#370圖與profile已接受的未變證據。世界數值、RNG/tick、路徑、長通勤速度差、D45/D53、保存格式、Grok素材與原作者box/branch均保持原範圍。沒有Mac/8800/他人服務。

環境限制：此作者session沒有Serena工具，repo與可讀agent目錄未提供初始手冊；已於claim如實回報。實際使用Cloud rg/git、既有Chromium/Playwright與GitHub connector，沒有假稱呼叫Serena。

## 補修短 prompt 與停止線

> 只補 #367 原PR：核最新head/base、有效claim與grass集中意見，沿NavigationView公開snapshot/camera與SVG生產renderer，不讀raw秘密或推算route。保留原座標／UI權威，地圖操作只改camera/selection；不可見與epoch須清marker/title/list/pick。只驗新差異，復用未變證據；Cloud自有頁/服務finally清理，Mac不動。交grass非作者review／#67唯一票，不自合dev/main／關issue；#367 dev/postCI與#365總收據完成後休息，不開下一公版或永久循環。
