# 內容包 v1

這是私人本機原型的有限資料介面。`core-v1.json`保存核心人物、招式、門風與事件，移出時與前一版逐值相同。外部JSON只能增加普通人物、三種既有招式族的變體與既有場地的有限生活內容；不支援JS、URL資產、任意公式、新地形／新武學算法或覆寫經典身份。

從`examples/breeze-v1.json`複製開始。`shortform-v1.json`示範只加一招，其餘三類空字典。UI「內容」先遷移此局、預覽檔案、再明示安裝；預覽不改世界。至多四包，每包128KiB，每類最多20條。參照可用核心ID或先前已裝包；事件人物必須是外部普通人物。相同包ID不熱換，請另存原局並用新命名空間作新內容，不能卸包破壞現有引用。

```sh
node solo-sect-gpt/tools/validate-content.mjs solo-sect-gpt/content/examples/breeze-v1.json
node solo-sect-gpt/tools/validate-content.mjs solo-sect-gpt/content/examples/breeze-v0.json --migrate solo-sect-gpt/content/examples/breeze-migrated.json
node solo-sect-gpt/tools/migrate-save.mjs OLD.save.json NEW.save.json --adopt-content
```

遷移輸出用獨占新檔寫入，不覆寫來源／既有目標。schema0只有明確欄位改名：packId→id、revision→version、displayName→title、characters→people、techniques→moves、activities→sectActivities；事件及數值保留，得到和v1相同的資料指紋。未知schema拒絕。

## 根欄位與ID

必填且只接受：`schemaVersion:1`、`id`（2–24位小寫英數／減號、首字母小寫）、`version`（x.y.z，每段1–2位數）、`title`（1–40字）、`people`、`moves`、`events`、`sectActivities`。後四者是字典，條目key為`包ID.條目ID`，條目小寫英數／減號、1–28字；不可覆蓋核心或跨類／跨包重複。所有層次禁止`__proto__`、`constructor`、`prototype`鍵；未知欄位拒絕。文字不可含HTML尖括號／控制字元；UI仍按純文字顯示，色彩只接受六位hex。

## 四類資料

| 類別 | 必填資料／限制 |
| --- | --- |
| people | name≤16字、description≤120字、adult必為true；stats五項1–7合20，traits兩項−2…2、color；skills需punch，可含staff/sword，每項U5–10、F0–18；moves最多6個外部招式ID。不能取既有經典人物名。只在UI邀請後從南路真走來，佔訪客名額及已保留名額；不直接變成弟子。 |
| moves | name≤16字、description≤120字、base為punch/sweep/thrust；wind8–40、active1–4、recover7–40 tick；punch距離12–24、另兩族24–38，width4–36、damage1–10、cost200–1000；requires含U5–10與F0–30。1tick=0.05秒，精力內值100=畫面1點。拳／棍／劍原理、實際器械與20秒靜室研讀仍須成立。 |
| sectActivities | name≤20字、description≤120字、base為hearth/discipline/freedom，繼承既有膳房／廳／外功場及站位；color與單字symbol。只改門風美術／文案，沒有任意座標或額外設施。 |
| events | name≤30、text≤180，pack參照活動、person參照包人物、role為顧人／勤勉／自由，choices字典2–3項；選項ID小寫英數／減號≤16字。沿用M4成年casting、站位／共享預約、相處完成與後續邀約，不能連點刷獎。 |

選項必填name≤30、cost≤120（作者的成本文案，須與數值一致）、duration160–400tick、meal0–2、energy−1000…800、trust−4…4、practice0–3、prestige0–2、pose為talk/eat/practice、callback≤180；可選heal0–3、injury0–5、requiresMove招式ID。熟練獎勵需practice姿態且至少240tick；所有效果都在真正到場並完成後才結算。沒有任意物品／自訂腳本效果。數值可有取捨，但本驗證器不替作者判斷故事品質或全局平衡。

## 保存與相容性

未遷移舊檔保持原規則和原hash；明示遷移只新增內容格式／命令紀錄，不改人物、物資、RNG或tick。新標記`chapter1-content-1`、contentState.version1、coreVersion1.0.0，舊reader拒絕新檔。安裝包的完整資料、版本、遷移來源與FNV-1a識別指紋內嵌在World；這個指紋是變動辨識，不是簽章或來源信任。存檔封套仍用SHA-256 checksum，讀取時重驗所有引用／數值／包指紋。外部JSON搬走不影響續局。核心版本不可不升版便改語義；未知版本、缺快照、壞引用拒絕，不偷偷套用磁碟上的新值。

新增內容流程只改JSON並通過同一驗證器／UI。若想要新招式算法、其他場地或超出上述界限，需要另行設計與版本授權，並不屬於這個介面。
