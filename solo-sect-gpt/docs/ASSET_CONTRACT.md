# 第一章素材與地圖導入契約 v1

2026-10-25；GPT／Codex，指定 GPT-6.1 Sol / high，作者自校。規劃 commit `e530a2c078722fd69732332eef2cd964da99ad24`；本階段只訂契約，**沒有新遊戲圖像／音訊／runtime map交付**。依 [SCENE_ATLAS](SCENE_ATLAS.md)、[SPEC S03/S10](SPEC.md)、[驗收A04/A17/A41–43](ACCEPTANCE.md)。只新增於 `solo-sect-gpt/`，不替換來源圖或動原存檔。

## B01 美術目標與交付格式

第一版要有可持續觀看的山居感：暖紙底、低飽和山綠／赭木／溪藍，人物服飾與器械可辨，重要動作以輪廓與節奏傳達。可採原創分層SVG／Canvas程式繪圖，或按具體缺口新增透明raster；不強制外部美術包。設計圖線框只能作開發占位，development done需統一成可玩的美術，不能只剩debug色塊、工程路線與數字。水彩遠景不得烘焙可互動建築／門／人物／資源以掩蓋接線不足。

優先使用本分支原創工程幾何與新繪美術；借用dev／其他分支圖需逐檔核來源與合適性，沒有「repo可讀＝所有圖可公開商用」推論。若新增AI bitmap，先讀imagegen技能、看參照、用OpenAI image工具；生成記錄及來源參照寫manifest，不用Python替代AI編修。程式／矢量原生資產可直接編輯SVG／Canvas，無需為已可編輯圖層另生整張背景。公開IP／授權／發布不在本機原型完成範圍內，不因此要求再次批准正常可逆美術選擇。

推薦目錄：`assets/manifest.json`、`assets/terrain/`、`assets/structures/`、`assets/props/`、`assets/people/`、`assets/effects/`、`assets/audio/`、`maps/runtime/`。各檔local相對引用；禁止runtime CDN依賴、遠端圖片熱鏈、外部遊戲音樂／立繪／台詞搬運。

## B02 Asset manifest 必填欄位

每個可視ID及音效都有一筆記錄（同一圖譜可多ID引用），純程式生成亦需記生成函式／版本，不用虛構檔案：

| 欄位 | 契約 |
|---|---|
| id/type | 命名空間穩定，如 `person.amu.walk`、`structure.dorm.built.roof`、`fx.thrust`；type=texture/svg/procedural/audio |
| source | local path或generator module＋export；content hash、像素尺寸／viewBox、透明與色彩模式；不允許指向不存在檔 |
| provenance | original／derived／copied、實際作者／工具、來源repo完整SHA與路徑、衍生修改、生成prompt／參照路徑（若適用）、取得日期 |
| rights | 本機原創／生成紀錄、或具體license原文位置與義務；未知記unknown＋只供私人原型，不能填假MIT／商用許可 |
| geometryRef | 對應runtime map objectId；world尺度DU、feet/ground anchor、visualBounds、zBand；純遠景可null |
| presentation | stage／動作／朝向／frame順序與duration、occluderPart、tintPalette、低動態替代 |
| fallback | 明確替代ID及可識別文字／圖形，禁止缺圖換成透明就算成功 |
| verification | 實際尺寸／hash／解碼／alpha／錨點／截圖結果路徑與狀態；未跑寫未跑 |

同一素材在多身份間共用骨架可以，人物canonicalIdentity／服裝／名字仍需辨認。若整體不沿用來源實體碼／圖，記「觀念參考，無檔案複製」，不要偽造授權檔。來源證據索引保留於 `assets/PROVENANCE.md`，FEATURES再連至此。

## B03 圖層、尺寸與排序

以下像素是1DU對應2px的資產製作基準，runtime縮放另由相機處理；DPR不可乘回權威座標。SVG用同等viewBox即可。透明圖邊緣保留2px安全透明帶，無黑白底邊。

| 圖層／ID族 | 最少內容／製作尺寸 | anchor／規則 |
|---|---|---|
| L0 `backdrop.home/e1/e2/e3` | 各一背景氣氛區，可用程序水墨山景；raster每塊≤1024×1024 | 純遠景，不宣告碰撞／站位；只由相機render |
| L1 `ground.*` | 草、土路、石、溪、潭、橋兩岸；256px可拼紋理或同等矢量 | 以map polygon裁切，河岸與portal對齊；不能讓看似橋面的圖擋住真通路 |
| L2 `structure.*` | 6封閉建築（hall/dorm/store/kitchen/annex/quiet），各實際stage：未建地塊／施工／可用；開敞dining/yard/garden/herb，兩橋、北門 | 以footprint局部左上為geometry origin，視覺地面錨點在footprint下中；屋簷可外擴≤20DU，外擴不改碰撞；hall基準440×280px地面框，其他按2×footprint |
| L3 `prop.*` | 空滿水缸／桶、木／石堆、灶／餐盤、8床＋hall臨鋪、書架、各4樁／器械、菜藥各3生長態、糧袋、營地2格／地包 | 每件獨立objectId及位置，約32..160px；物資堆量由inventory投影，不能圖一換就產料 |
| L4 `person.*` | 掌門／小禾／阿木、林青／沈禾／周行、五名俠、村民／守路人／演武對手／必要救援者；獸鼠／豬獨立骨架 | 共用96×128px格、feet `(48,116)`；角色腳底圓半徑6DU不受披風／武器視覺寬影響；5名俠各自裝束色／髮式可辨 |
| L5 `foreground.*` | 獨立樹幹／樹冠、屋頂／前牆、岩角 | 128..512px級；footY sortKey與geometry occlusion polygon分離；不可全前景一層永蓋住角色 |
| L6 `fx.*` | punch線、push掌弧、sweep棍弧、thrust刺線、intercept閃點、step足跡／殘影、命中／落空／恢復提示 | 發自權威actionId與phase，位置取真朝向／範圍；低動態減閃爍不改有效tick |
| UI `portrait.*` | 開局主角／小禾／阿木與有限候選肖像或一致原創印章，256×256足夠 | 不用肖像代替地圖小人動作；無缺圖文字破版 |

ground、door、人物腳底、資源點都能在debug疊圖核對；正式UI預設不顯示工程線。building body／人物／樹幹依 `(zBand, footY, stableId)` 排序，屋頂／前牆帶同棟occlusion關係，不從sprite全高度猜前後。選中或屋內有人時可淡屋頂／剖牆，看見床上姿態；此為顯示效果，不改LOS感知。

## B04 人物動作與招式時序

每個成人骨架至少4朝向N/E/S/W（左右可鏡像；非對稱武器位置需獨立attachment修正）。獸可用四向同規格。程序骨架採等效pose key即可，不必輸出大量PNG。角色身份只換外觀／數據，不新建模擬替身。

| 動作族 | 最低可辨姿態／frame要求 | 接線 |
|---|---|---|
| idle/walk/carry | 站2、走4、負重走4（雙手桶／扛木／糧包有不同附件） | 腳步phase取實際位移距離，非倍率獨立轉圈；停止移動腳步也停 |
| work | 取水／砍木／採石／搬交／施工／種收／烹調，至少各兩個有效姿態 | 完成事件一次，不能動畫loop每輪產物 |
| eat/rest/sleep | 用餐2、坐休2、躺卧2；小女孩沿兒童合適姿態 | 到真站位／床側後進入，睡床要身體位於床家具上並足點留可驗錨 |
| social/teach/help | 發話／聆聽、老師／學生、鼓勵、攙扶與被扶至少成對姿態 | 雙方session ID相同，任一中斷後氣泡／姿態不幽靈繼續 |
| martial | 拳／推掌／棍掃／劍刺／截擊／短步，各windup、active、recover至少1獨立pose；受擊／倒地各1 | pose由action phase進度插值，不能動畫先命中再補規則；在不同倍率仍有可辨silhouette |

時長一律讀SPEC S07 tick表，sprite sheet不另定傷害時點。active只有2tick也不能靠延長active增加命中；可留短軌跡視覺餘韻，必須標非判定層。長棍左右鏡像不能把扇形判定反向；美術接近鏡像與幾何朝向分別測。小禾骨架只綁親情／生活動作，不需要或允許給她成人戀愛／出招pose來應付缺圖。

## B05 Runtime map object 契約

`maps/runtime/`需有version、units、origin、walkable/corridor、wallSegments／water／rocks、door portals、stations／queueSlots、occluders、resource nodes、spawn／departure boundaries、guard/leash zones、route graph和closed exits。每個object有穩定ID，相關asset引用不能取代幾何。

| 結構 | 必填／驗證 |
|---|---|
| facility | footprint、stage availability、wall thickness4、door center／width28、室內可走區、家具障礙、床owner；對應SPEC S03室內節點 |
| station | position、facing、capacity slots（非單圓多人重疊）、activity kinds、approach／exit nodes、queue slots、stage；各槽腳圓不相撞 |
| corridor/portal | centerline／width、connected node IDs、direction／capacity／priority policy、clearance；每段circle sweep有效，交點真分節 |
| obstacle | polygon／segment、blocksMove／blocksLOS、visual occlusionRef；材質只影響顯示時明示 |
| resource | sourceId、position／站位、kind、quantity／regrow規則、inventoryRef、harvest duration；可見木堆與可採木節點不混同 |
| spawn/boundary | south visitor／north travel／training prep／natural habitat的明定位置與允許類型；生成有eventId，不在宿舍／看不見的戰報內造人 |
| camp/cave | 2×4乾糧格、候位、傷員休整／周行／4有限糧、守路人側位、對話站位、返程通路 |

所有10地塊沿planning footprint；house interior／排隊、園圃第二站、側路修正依SPEC。若實測需微調站位／局部路寬，改runtime mapVersion（尚未正式出檔前可維持開發版）、記原點／新點／理由／可達／碰撞／視覺再驗，不覆寫design-1來源。不允許把橋增寬成雙人、短步跨溪、把取水縮到廚旁以逃避規格。

素材與工程幾何的唯一權威分工：map決定可走／門／LOS／站位，World決定stage／人物／物資，asset決定長相，renderer決定相機／排序。禁止從背景某個顏色推「已完工」或透過切貼圖變更居民數。

## B06 音訊、回退與品質門檻

最少四類可辨短音：腳步、木石施工、出招／命中、完成／重要提示。可用本機程序WebAudio合成，不需購買或下載聲音；記oscillator／envelope generator ID與版本。腳步節流每人最多4次／秒、同畫面混音限8聲，重要提示不因同事件重render重播。靜音／音量、首次互動啟動、低動態依SPEC；無授權配樂不是缺陷，無任何可用音效則不能宣稱SL7聲音完成。

缺素材時開發可用同類矢量輪廓＋名字印章作fallback，保留腳底／器械／動作區別，log一次缺失ID。正式交付manifest所有必需ID都要有已驗primary或明示完整原創procedural primary；fallback不能永久遮住必需門、橋、床、武學動作。找不到可再利用圖不阻止用原創矢量完成；不能把「缺圖」改成省略功能。

導入檢查至少包含：所有manifest source可解碼／程序export可用；尺寸／alpha／frame rect不越界；ID唯一且map引用齊；四向feet不漂移（靜站誤差≤1DU）、walk/carry落腳不穿牆；門／水岸／橋與幾何最大對齊誤差≤2DU；S0/S1/S2個別stage混合不換整張圖；屋內床／教學／園圃第二位可見；六招active特效與幾何方向一致；離鏡不影響規則。保存 `asset-check.json` 及至少家園S0/S2、屋內、林緣、橋、古洞、招式比較的實際截圖。

## B07 來源採用邊界

| 固定來源 | 可以借的部分 | 本spec的採用狀態 |
|---|---|---|
| dev `148cfbbb27e43475c66744d53c2451125a9111a0` 的SCENE04、hero/cousin atlas | 山居拓撲／負重姿態／水彩氣氛，若逐檔確認外觀與生成記錄可選用 | 設計觀念已引用；沒有複製圖檔；`cousin`技術ID不能把小女孩改成堂弟 |
| Grok `7eb0f7a309e9ee90612ddd0f4f8ef08faf39be47` | 具名人物／日課／動作與圖譜的局部實作參考 | 未整包匯入，FEATURES作者測試不是本分支證據；實際複用才逐檔登錄 |
| Gemini `32c1b88adbe00e206a6590ecf4f4e47261ceb9b9` | 資料宣告、portrait mapping、站位預約的概念 | 未採整套立繪／新世界；五代表人物不擴21人，不能將半身圖視為行走素材已完成 |
| planning `e530a2c078722fd69732332eef2cd964da99ad24` | 原創SVG幾何與版面palette | 可作本分支衍生工程來源，保留原作者／SHA，設計檢視器不是runtime畫面驗收 |

外站研究／社群／開源觀念及license查核沿 [DECISIONS](DECISIONS.md) 的具體限制；本spec未引入外部碼、圖、音。開發如真引入第三方檔，重新核該檔版本與權利／義務並記錄，不擅將GPL／MPL／CC條文總結成免費可商用。這是來源紀錄要求，不是新增付費／發布批准程序。
