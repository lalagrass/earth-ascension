# 第一章串行實作與交接 v1

2026-10-25；GPT／Codex，指定 GPT-6.1 Sol / high，作者自校。前置規劃 `e530a2c078722fd69732332eef2cd964da99ad24`。本階段完成 [SPEC](SPEC.md)、[ACCEPTANCE](ACCEPTANCE.md)、[ASSET_CONTRACT](ASSET_CONTRACT.md) 及本文件；沒有runtime。第一版範圍依 [PRODUCT_PLAN](PRODUCT_PLAN.md)，本次不重新請批已定工作。

## C01 唯一作者、工作區與入口

開發開始前核 `handoff/spec.ready.json` 的status、artifactCommit、planningCommit、branch、所列檔案／證據與實際祖先關係，核HEAD及乾淨工作區。只在 `/Users/chenyuying/.codex/worktrees/solo-sect-gpt/earth-ascension`、branch `codex/solo-sect-gpt` 操作；所有shell/file command明示此工作區。只寫 `solo-sect-gpt/`，不改根契約／共用CI／依賴／dev或他分支；不在原checkout切分支／清理。

主聊天安排啟動，當前階段一位作者有唯一寫入權。開發一人持續完成SL0–SL7，不派子代理、不找Grok／Gemini／Dot／grass／Earth、不走原issue／queue、不啟其他聊天。不得push、PR、merge、部署或接觸8800。正常可逆的數值／幾何／美術修補自行完成，留證據；真正外部花費／公開發布仍不在範圍內。

在同一正式入口逐片增加，玩家每片可操作；不可前六片都只寫模型，最後再接Canvas。設計檢視器保留用途，不把它改名遊戲入口當SL0完成。遇語義衝突依SPEC不變量與上游產品取捨處理，不能採直接加資源／賦級／固定戰果的展示捷徑。

## C02 建議程式分工與資料方向

不強制檔名，但責任分離需成立；小型章節不引入新框架／大型通用引擎／多世界同步。建議：

| 模組／資料 | 寫入權責 |
|---|---|
| `src/world.mjs`, `clock.mjs`, `rng.mjs` | 純JSON World、穩定ID、tick順序、定點運算、PRNG、命令與canonical化 |
| `src/map.mjs`, `navigation.mjs`, `maps/runtime/` | 衍生導航／室內／水岸／橋／門、A*、sweep、LOS、候位與通道token |
| `src/activities.mjs`, `reservations.mjs`, `economy.mjs` | 活動狀態機、原子預約、ledger、配方、搬運／工地／種植 |
| `src/people.mjs`, `autonomy.mjs`, `social.mjs` | 同ID身份、作息／方針、理由、意願／記憶／家庭，不持第二份people |
| `src/combat.mjs`, `growth.mjs`, `expedition.mjs` | 同moves與幾何戰鬥、觀察／三軌、自然個體、守點、真遠征／救援 |
| `src/stories.mjs`, `data/` | 16節點、三模板／五人物、分歧承諾與真返院事實；先有限資料，不生成無限劇本 |
| `src/save.mjs`, `storage.mjs` | 純codec／驗證與平台storage分離；保存整個權威World，UI設定獨立 |
| `src/render.mjs`, `ui.mjs`, `audio.mjs`, `assets/` | 只讀World投影；玩家命令回command入口；顯示缺料／阻擋，不私自改模型 |
| `test/`, `evidence/development/` | M fixture、U正常玩家流程與V檢查分清，證據index對應驗收ID |

資料流：UI命令→權威step→World事件／view→Canvas／側欄／音效。禁止renderer呼叫扣血、面板直接設level、遠征以DPS先算勝負再補動畫、save codec載入時默默發新人物。

先訂save payload的事實清單與引用，即使SL7才接完整操作；每加活動都保留可序列化state，不把Set／Map／DOM／函式偷偷塞進World。純模組由Node測，瀏覽器資料用ESM／JSON fetch本機檔而非`node:fs`。既有來源碼若選用需改寫／保來源，不整包合兩世界。

## C03 各里程碑的可見出口

| 順序 | 同一作者實作內容 | 出口／驗收 | 失敗時下一步 |
|---|---|---|---|
| SL0 空間與契約 | index、基本UI／時鐘／seed、三人物World、runtime map衍生、室內門／床／站位、原創分層美術骨架、命令／預約／取消／保存payload架構 | 3人不同位置；能實走床／灶／水／練功點與北接縫；A01–04基本通，無路明拒；素材anchor可驗 | 先修sweep／門洞／站位與候位；不可加瞬移／穿牆開關，或把PNG當碰撞 |
| SL1 第一天 | 完整創角表單骨架、木石水真採搬、dorm施工／真床、精力與恢復、直拳訓練、有限自然護家、玩家改派／叫停 | 正常新局做第一天短流程；A05–07/A11/A14/A17基本通，S0及入床／負重／起手畫面 | 缺料／取消／床在屋外先修；先有真流程再調節奏，不給debug「第一天完成」 |
| SL2 共作首徒 | 具名阿木／三招募、工資與有限交貨、10地塊stage／容量、菜藥與3配方、外門日課／晉升真考核 | 阿木同ID入門、菜到餐桌、建設材料守恆、無床／缺餐可恢復；A08–10/A16及各建物可達 | 查原子交易／供餐／空床與採集來源，補正常UI恢復出口 |
| SL3 生活與人際 | 方針／作息／可讀理由、雙人活動cleanup、六類記憶、成年雙意願結伴／同住、小女孩鼓勵、8＋2分時人流 | 一日自主與成人家庭正常畫面；A10–15/A41生活部分通，兩日負載無永鎖 | 先修候位／錯峰／可行候選／intent revision，局部調路寬須重驗；不減成兩人假裝完成 |
| SL4 同一武學出門 | 棍劍／推掌／短步及裝備、兩組兩波演武、E1/E2/E3同tick、穩定自然個體、1–3人隊／營地／預留／負傷召回／救援 | 同圖六招基礎、完整走到洞再回；A17/A20–26/A40通，鏡頭換區不換World | 先修幾何命中／橋公平／回程／救援可達，不以背景戰報或倒數到家過關 |
| SL5 深修識人 | 三軌來源／深修節奏、五人物各二節點、九劍觀察／成功與失敗、young／mature身份互斥及主角替代故事 | 低悟／高悟都深修、練前後可見比較、五人10節點正常可達；A18–19/A27/A29–32通 | 調成長來源／預約／節點重試，補精準失敗原因；不賦F/I／固定截擊成功 |
| SL6 掌門與分歧 | 三模板完整差異理由／問卷、自主掌門預覽／覆寫、古洞三節點、周行與糧真後果、返院回呼 | A28/A33通，三主角替代路徑齊；兩選擇均可繼續立匾，partial不假報履約 | 查choice／promise／fulfilled分離、攜重與扶助／實際到家，不強加宿命或反悔清空前史 |
| SL7 立匾完整交付 | 完成線／回顧、完整手動auto存讀／匯出入／原子失敗保護、教學／音效／低動態、美術統一、README／FEATURES／驗收index | A01–44全部適用層通，U01–U05與本機效能／save矩陣／來源清單齊；真資料持續遊玩 | 有未通案例留checkpoint，補修直接風險後重驗；不得因到SL7就標done |

順序依賴是開發安排，不是要求每項等人類批准；可在同片做必要後段骨架，例如SL1創角、SL0save contract、SL4周行護送結構。不能用「SL6才做創角」拖延前面玩家流程，或「SL7才做保存」作兩世界臨時接線理由。SL4前即可先做洪七公教掌必要節點，其餘SL5補齊。

每個出口commit包含模型＋UI＋直接風險測試＋證據／checkpoint；無需為每個檔案或圖開一輪審批。上游四份規劃、設計圖及ready標記保持原樣。

## C04 驗證成本、修補與節奏調校

按 [ACCEPTANCE](ACCEPTANCE.md) 分層。常規開發跑3seed冒煙；一般局部行為5seed；高風險預約／RNG／命中／存讀改動先跑對應反例、hash與配對。有回歸疑慮擴驗，不以少量seed宣稱正式平衡分布。必要root命令輸出落檔，無改動的證據可明示復用，不必每片重跑完整舊RT。

在起始兩片就跑正常瀏覽器，用真點擊暴露UI／室內／改派接線；每段V看人物／路／物姿態，不能只驗按鈕數值。正式完成至少一次從新局完整U01與另條分支U02；五人物與三模板可由正常存檔分叉。M人工fixture只支持精準反例，與U證據分開命名。

候選60–90分鐘章節節奏、道路36/48、速度／成本／成長都是待測。本章可自行調可逆參數，記 `evidence/development/.../calibration.md`：原假設→實際遊玩／瓶頸→修正→配對結果與剩餘限制。不為了縮工時刪一條正常玩家流程、把窄橋變雙人、讓高悟／低悟硬互斥、把遠征改成背景公式。

效能先量World step、render、DOM更新，不擴scope換框架。可裁剪離鏡渲染／降低純裝飾，不裁掉權威tick、家園生活或遠征幾何。加速落後時保持一致性並顯示，數值未達A43則補修，不默默改成4倍按鈕其實1倍。

## C05 保存開發與回歸樣本順序

SL0保留全事實schema／canonicalizer；SL1增加在途料與工量的roundtrip測試；SL2加料理在製／栽培／身份；SL3加雙人session／家庭／候位；SL4加橋token／action hitSet／自然個體／救援；SL5–6加觀察／記憶／故事承諾。SL7把整體codec／本地槽／auto／匯入匯出正式接UI並完成壞檔／quota保護。

每種新狀態都要「直跑 vs tick尾保存→load→同命令續跑」比較，不只測JSON.stringify能成功。若開發中變schema，先保留舊新fixture並明示這是未公開本分支開發版；真正支援的schema1之後才固定。不得承諾讀Grok／Gemini／原life-save，本版一律保護且拒絕外格式。

初始golden由spec規則實作完成後接受，記seed／commands／rulesVersion／artifact；之後有意改規則才更新並列差異，不能在每次測試失敗自動更新。canon排除UI偏好但保所有影響下一tick的餘數、token、觀察／冷卻及RNG。

## C06 checkpoint、done與停止寫入

未完時保存 `handoff/development.checkpoint.json`：stage、status=`in_progress|blocked`、branch、HEAD、specCommit、實際作者、已過案例／證據、未完成SL／A ID、真阻塞／下一個具體動作。不要把一次turn結束或單一milestone完成誤寫done。可以沿已授範圍繼續，不需主聊天反覆重授常規工作。

完全交付後先commit完整runtime／assets／tests／README／FEATURES／evidence index，確認範圍與工作區，再以獨立commit寫 `handoff/development.done.json`，至少含：

```json
{
  "schemaVersion": 1,
  "stage": "development",
  "status": "done",
  "branch": "codex/solo-sect-gpt",
  "artifactCommit": "<完整遊戲與證據commit>",
  "specCommit": "<spec.ready.json所指artifactCommit>",
  "planningCommit": "e530a2c078722fd69732332eef2cd964da99ad24",
  "author": "GPT / Codex; author self-review, not independent review",
  "milestones": ["SL0", "SL1", "SL2", "SL3", "SL4", "SL5", "SL6", "SL7"],
  "acceptanceIndex": "solo-sect-gpt/evidence/development/<version>/index.json",
  "artifacts": ["<實際交付路徑>"],
  "evidence": ["<測試摘要與正常UI證據路徑>"],
  "remainingWork": [],
  "limits": ["private local prototype; no publication/IP clearance", "human playtest status explicitly recorded"]
}
```

關閉自己啟動的測試server／browser，不關他人服務；不要清使用者原資料。done後停止寫入並回報commit、實際範圍、已驗／未驗與限制；不啟動其他聊天、下一章、PR或部署。

## C07 本spec的交付核對

本spec輸入planning.ready的artifactCommit與25個檔案已核對存在且是HEAD祖先，規劃作者已釋寫入。來源核對採三固定SHA；FEATURES的193測試／7UI與Gemini核心／展示記錄只作來源狀態，未重跑也不算本分支驗收。自行看過規劃S2畫面／配置與檢視器資料；室內、排隊、河岸和側路的runtime規則在本spec新增，仍待開發證明。

spec完成先commit四文件及自校證據，然後另一commit寫 `handoff/spec.ready.json`，status=ready、artifactCommit指向完整spec commit、planningCommit、artifacts、evidence、remainingDecisions=[]；ready代表可開始開發，不代表遊戲驗收已過。提交後停止本階段寫入，由主聊天接續開發。
