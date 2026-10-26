# 有限立繪匯入（#368）

玩家在角色卡展示頁能看到已核對過的研究立繪。切換人物後，短介和背景仍在，已採用的人可以展開整張 3:4 圖。沒有圖的人繼續用文字。這包不新增開局，也不把研究角色做成可玩人物。

## 玩家結果

- 入口：`sect-chronicle/character-card/showcase.html`。選擇人物後看短介，打開背景，再按「展開立繪」。
- 已採用的 14 人：頭像和展開圖用同一張整圖，不再另切頭部。展開後圖在卡片裡往下長。
- 主角仍是既有活動圖的 idle-0 裁切。熟手同伴、道館女孩、天殘、地缺、阿紫、王語嫣、程靈素、虛竹、段譽沒有新臉。
- 圖片檔讀不到時，卡片寫「本地圖片缺失，使用文字代替。」，其餘文字還在。
- 研究展示不是角色創建。合法開局仍只有採藥童、農家子、道館學徒。女孩仍是資料記錄，生活名冊還沒有把她收成可選的人。

## 採用清單

14 張裡有 7 張安裝檔與所引原路徑是同一個 blob，直接複用：阿星、黃蓉、李莫愁、東方不敗、包租婆、令狐沖、郭靖。這 7 張在固定提交 `6760f21c342cbf72fc9fb4baf0aec8655abd0dd2` 的同一原路徑上也是同一個 blob。另外 7 張是 2026-10-26 起的新像素，與所引原路徑以及 `6760f21…` 上的該路徑都不同：小龍女、包租公、苦力強、裁縫、油炸鬼、火雲邪神、周伯通。這 7 列的來源提交與原路徑只標身份參照。新檔在 `sect-chronicle/assets/shared/portraits/1.1.0/{id}.png`。資產編號是 `person.research.{id}.portrait`，只綁 `dev:{id}`。

| 人物 | 來源提交 | 原路徑 | 尺寸 | 採用原因 |
|---|---|---|---|---|
| 阿星 | `edaf2ed60954808221447640efb79f0215dbc278` | `solo-sect/assets/portraits/v2/axing-v2b-a.png` | 864×1152 | 文件已選 v2。v1 `axing.png` 不匯入。安裝檔與該提交的原路徑同一 blob。 |
| 黃蓉 | `edaf2ed60954808221447640efb79f0215dbc278` | `solo-sect/assets/portraits/v2/huangrong-v2-ref.png` | 864×1152 | 提示紀錄鎖定的俏皮有英氣參考圖。安裝檔與該提交的原路徑同一 blob。 |
| 小龍女 | `cadb937fb7ed54f44c72e562639fc598a6a1e646`（身份參照） | `solo-sect/assets/portraits/v2/xiaolongnv-v2-c.png` | 864×1152 | 2026-10-26 試一版長髮與白緞帶，跟黃蓉的雙髻分開。清冷與白衣留著。來源提交與原路徑只作身份參照。 |
| 李莫愁 | `6760f21c342cbf72fc9fb4baf0aec8655abd0dd2` | `solo-sect/assets/portraits/v2/limochou-v2-h.png` | 480×640 | 擁有人已選的版本。安裝檔與該提交的原路徑同一 blob。 |
| 東方不敗 | `edaf2ed60954808221447640efb79f0215dbc278` | `solo-sect/assets/portraits/v2/dongfangbubai-v2-a.png` | 480×640 | 已選的陰柔危險樣子。不改成搞笑。安裝檔與該提交的原路徑同一 blob。 |
| 包租婆 | `6db09fd97cac3d9a66cde49103978d7793317418` | `solo-sect/assets/portraits/baozupo.png` | 480×640 | 功夫研究已引用的公開職業圖。2026-10-27 擁有人不要漫畫重畫，換回這張。安裝檔與該提交的原路徑同一 blob。 |
| 包租公 | `6db09fd97cac3d9a66cde49103978d7793317418`（身份參照） | `solo-sect/assets/portraits/baozugong.png` | 864×1152 | 2026-10-26 跟包租婆一起改掉擬真。髮卷少幾顆、一顆豎起，汗衫和懶笑留著。來源提交與原路徑只作身份參照。 |
| 苦力強 | `6db09fd97cac3d9a66cde49103978d7793317418`（身份參照） | `solo-sect/assets/portraits/kulijiang.png` | 864×1152 | 2026-10-26 依阿星風格重畫，隨後把身材收成街坊叔叔。竹竿與汗留著。來源提交與原路徑只作身份參照。 |
| 裁縫 | `6db09fd97cac3d9a66cde49103978d7793317418`（身份參照） | `solo-sect/assets/portraits/caifeng.png` | 864×1152 | 2026-10-26 依阿星風格重畫的搞笑稿。來源提交與原路徑只作身份參照。 |
| 油炸鬼 | `6db09fd97cac3d9a66cde49103978d7793317418`（身份參照） | `solo-sect/assets/portraits/youzhagui.png` | 864×1152 | 2026-10-26 依阿星風格重畫的搞笑稿。來源提交與原路徑只作身份參照。 |
| 火雲邪神 | `6db09fd97cac3d9a66cde49103978d7793317418`（身份參照） | `solo-sect/assets/portraits/huoyunxieshen.png` | 864×1152 | 2026-10-26 依擁有人要求改走阿星的搞笑路線。來源提交與原路徑只作身份參照。 |
| 令狐沖 | `6760f21c342cbf72fc9fb4baf0aec8655abd0dd2` | `solo-sect/assets/portraits/linghuchong.png` | 480×640 | 此來源只有這一張原圖。安裝檔與該提交的原路徑同一 blob。 |
| 周伯通 | `6760f21c342cbf72fc9fb4baf0aec8655abd0dd2`（身份參照） | `solo-sect/assets/portraits/zhoubotong.png` | 864×1152 | 2026-10-26 依擁有人要求對齊郭靖：抓頭、嘴裡塞著饅頭。來源提交與原路徑只作身份參照。 |
| 郭靖 | `6760f21c342cbf72fc9fb4baf0aec8655abd0dd2` | `solo-sect/assets/portraits/v2/guojing-v2-b.png` | 864×1152 | 提示紀錄標為採用的搞笑稿。`guojing-v2-a.png` 不採用。安裝檔與該提交的原路徑同一 blob。 |

## 欄位

複用的 7 張記錄作者 Grok Bot。來源提交與原路徑 `source.originPath` 的 blob 就是安裝檔。重畫的 7 張作者是 Grok（本機 Grok Build）。`source.commit` 與 `originPath` 只標身份參照，`source.bytesNote` 寫明新像素與該參照不同。兩組都有複製後路徑、sha256、寬高、`alpha.channel: false`、錨點 `{x:0.5, y:1}`。配方類型是 `portrait`，矩形等於整張圖。複用檔的生成紀錄來自 `6760f21:solo-sect/assets/portraits/PROMPTS.md`：工具 Grok Bot GenerateImage，模型版本未量測，3:4，無參考圖，無 seed。阿星與郭靖的風格記號是 `wcaricature`，黃蓉是 `inkpretty`。李莫愁、東方不敗、包租婆、令狐沖的提示紀錄沒有逐檔風格記號，欄位寫 `unrecorded-for-this-file`。

2026-10-26 擁有人指定：男角搞笑對齊阿星，女角清秀對齊黃蓉，周伯通對齊郭靖。因此裁縫、苦力強、油炸鬼、火雲邪神改以阿星為風格重畫，周伯通改以郭靖為風格重畫。新像素的工具是 Grok Build Imagine `image_edit`，模型版本與 seed 未記錄，權利是 `owner-requested-generation; third-party-rights-unverified`。同日又補兩處：包租公戴上與包租婆相同的髮卷，苦力強的身材收到跟裁縫、油炸鬼同一種街坊叔叔。小龍女另試一版長髮與白緞帶，跟黃蓉分開。包租公隨後改成漫畫墨線。包租婆的漫畫稿已於 2026-10-27 換回採用的原圖。黃蓉、東方不敗、阿星、郭靖維持原採用圖。

卡片氣泡顯示的 `source.path` 是複製後的 `sect-chronicle/` 路徑。pin 驗證只接受這種路徑。原路徑寫在 `originPath` 和 `recipe.derivedFrom`。

權利狀態：`repository-research-reuse; third-party-rights-unverified`。不把私人試作寫成商業授權，也不補造 seed 或授權條款。

隱藏身分只用公開職業名。資產編號、替代文字和提示都不寫未公開的身份。

## 相容

- 新 manifest：`sect-chronicle/assets/shared/manifests/gemini-1.1.0.mjs`。`gemini-1.0.0.mjs`、`gpt-1.0.0.mjs`、`grok-1.0.0.mjs` 不改。
- 只改 `pins/gemini.mjs` 的 import 和 digest。GPT、Grok 的 pin 不變。
- `gemini:hero` 與 `gemini:girl` 維持原記錄。不新增 `gemini:`、`gpt:`、`grok:` 的研究鍵。
- 主角、場景、女孩缺圖記錄的位元組與編號不變。
- 腳錨是圖的底邊中點，不是走路或碰撞點。不做地圖行走、動作圖集、腳速或權限。
- 不改世界、RNG、能力、關係、戰鬥或存檔格式。
- `resolve.mjs` 對 `recipe.type === 'portrait'` 標成「公開立繪」。活動圖裁切維持原標籤。卡片上那行「既有活動圖裁切」仍由既有 renderer 寫出，這包不改那個檔。

## 不做

天殘和地缺沒有具名立繪，而且是兩個人。阿紫、王語嫣、程靈素、虛竹、段譽在固定來源上沒有立繪檔。道館女孩維持 `person.adopted-girl.portrait` 缺圖。不把堂親或女孩套成經典人物或功夫人物的臉。不生成缺圖。
