# M1–M6 交付

2026-10-26；GPT / Codex，GPT-6.1 Sol / high，單一作者。六階段依序完成；只在獨立`codex/solo-sect-gpt`分支的`solo-sect-gpt/`修改。總完成與artifact SHA見[總標記](../../handoff/optimization-m1-m6.done.json)，機器索引見[總索引](../../evidence/optimization/index.json)。原第一版`development.done.json`未改。

## 開啟與體驗

入口 [http://127.0.0.1:8878/](http://127.0.0.1:8878/)，服務只綁本機。尚未啟動時，在此獨立worktree執行`python3 -m http.server 8878 --bind 127.0.0.1 --directory solo-sect-gpt`。執行遊戲不需網路或安裝套件；作者驗證環境Node24.13／Chrome156、macOS26.2、Apple M2／8GiB。

可新開局從破廳開始；或在「存檔→匯入」選[全功能正常UI示範檔](../../evidence/optimization/showcase/showcase-all-features.save.json)，讀入後按繼續。示範已正常採用日課、武學、門風、遠行與內容包，成人恢復自主，並有兩個內容快照；這段額外短實走不取代M2的20分鐘驗收。

## 已完成

| 階段 | 玩家能做的事 | 索引／完成標記 |
| --- | --- | --- |
| M1 | 分層水彩山居、進出真門口、看生活動作，收起掌門簿仍可看懂；連續走橋回家。 | [視覺與行走](../../evidence/optimization/m1/index.json)；[M1–M2](../../handoff/optimization-m1-m2.done.json) |
| M2 | 安排工作與修行，先保補給／照護；一次命令完成後回原安排，只有危急打斷。 | [政策／20分鐘](../../evidence/optimization/m2/index.json)；[比較](../../evidence/optimization/m2/comparison.md) |
| M3 | 看三個武學下一步，實領器械，對長招、快拳與佯攻試三條路。 | [武學證據](../../evidence/optimization/m3/index.json)；[完成](../../handoff/optimization-m3.done.json) |
| M4 | 過三種門風生活，讓普通同門／經典本人參與同一套選擇與後續，承擔實成本。 | [生活證據](../../evidence/optimization/m4/index.json)；[完成](../../handoff/optimization-m4.done.json) |
| M5 | 採藥交倉、陪同村人、營地真切磋；選路／用糧或慢休，真過橋召回，帶結果回家。 | [遠行證據](../../evidence/optimization/m5/index.json)；[完成](../../handoff/optimization-m5.done.json) |
| M6 | 驗證並安裝JSON，邀新人物、研讀新招、相處與出手；帶內嵌快照存讀與遷移。 | [內容證據](../../evidence/optimization/m6/index.json)；[格式／工具](../../content/FORMAT.md)；[完成](../../handoff/optimization-m6.done.json) |

M2基線1201.774真實秒、候選1201.957秒；候選4801.5模擬秒、3.994735×。必要介入兩邊同為0，沒有宣稱下降；完整可觀察日每位成人至少120秒真修行。歷史分析的tick／秒標示更正以追加衍生檔保留，原輸出與兩次中止探索均未覆寫成成功。

M3正常五場：長招九劍成功6次；快拳無成功截擊、強行出手耗能並失敗；佯攻留下2次真失敗。M4普通／經典六場及後續皆實走。M5四場正常UI返院，兩營地選擇真耗糧／真時間；同樣慢休下，側路2180.24 DU／2548tick，主路1802.93 DU／2162tick。M6資料拳真交手14次，新人物熟練18→21有相處來源；純JSON第二招、完整刷新及壞包／壞存檔拒絕均驗證。

## 測試與限制

119項完整模型／整合回歸通過；另加所有新方針共存後保存續跑，120個不同案例皆有通過紀錄。M6子集含此新增案共12項。五seed、原golden、已知舊檔／未知版本／引用反例及兩視窗正常UI均留檔；[範圍與全部來源語法](../../evidence/optimization/m6-model/final-scope-and-syntax.json)通過。根Python53、SG dev383與Earth語法沿用未受改動的[M2輸出](../../evidence/optimization/m2-model/)，原SG main／manual完整發布矩陣不屬此私人本機交付。

這是作者自校，沒有真人／獨立review或音訊硬體聽感驗收。有限seed不是平衡分布；M4僅三個核心事件，M5只有四株有限草藥、守路人須真的健康，M6只開放既有三招式族／三場地族、四包上限，不作任意算法或同ID熱替換。停止的人仍有實際身體，佔位時需正常讓路。所有失敗、修補與受限之處保留，沒有把模型fixture當正常UI。

M1使用內建image_gen；四個分離bitmap、alpha／錨點／hash與[完整prompts](../../assets/watercolor/prompts.json)、[地表prompt](../../assets/watercolor/meadow-prompt.txt)、[來源說明](../../assets/PROVENANCE.md)皆在案。其餘人物／招式／旗幡仍用原生Canvas及可編輯資料層。

完成M6後停止，後續產品取捨與整合另需授權。
