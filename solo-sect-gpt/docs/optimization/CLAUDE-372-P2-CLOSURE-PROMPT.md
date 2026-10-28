# Claude 接續委託：同分支修三項 P2，併 #372 有限套用收尾

日期：2026-10-28（Asia/Taipei）。整理：GPT / Codex。

請由你一位實際作者，沿 GPT 獨立遊戲同一分支，依序修好三項已重現 P2、補測試並驗收；同包完成已批准 #372 的健康資訊遮罩與兩個 renderer 必要小差異。這是原 M41–M44 的有限補修與 PUBLIC-ADOPT-GPT-01，不開 M45 或其他 backlog、不派代理。每步先寫短 spec、實作、局部反例與必要驗證，再 commit 接下一步；最後整包交集中非作者 review，必要補修留同一包。

## 1. 先讀、核狀態與環境

必讀並在恢復／推送前重核最新留言：

- 主單 https://github.com/lalagrass/earth-ascension/issues/372
- 最新批准 https://github.com/lalagrass/earth-ascension/issues/340#issuecomment-6447249972
- 原作者差異報告 https://github.com/lalagrass/earth-ascension/issues/340#issuecomment-6444660512
- 根 CONTRIBUTING.md、適用 AGENTS.md、PR template、docs/testing-policy.md。
- solo-sect-gpt/BRIEF.md、docs/optimization/M41-M44-PLAN.md、DELIVERY-M41-M44.md、M41／M44 spec、目前 handoff 與相關原碼。
- 公版固定 `00f4dbe26be5765a9622957b7c6a636ab5039f96` 的 `sect-chronicle/docs/{CARD_ACTION_HANDOFF,MARTIAL_PUBLIC_HANDOFF,PUBLIC_ASSETS_HANDOFF,PUBLIC_PORTRAIT_IMPORT_SPEC,SCENE_NAV01_HANDOFF,UI_PRESENTATION01_HANDOFF}.md`。舊文件的「候選」不推翻已合的正式收據。

本次盤點：本機與遠端 `codex/solo-sect-gpt` 均為 `9d7f62db2466989c152857fc9d97ac269edc3fbb`，M44 artifact `ae0f7dc`、總完成標記與文件已交。#372 當次讀取為 OPEN、0 留言，尚無有效認領；執行時重新查，不能把此快照當即時鎖。#340 的「52979ec、163個本機提交未發布、M43/M44進行中」是歷史報告，不要求退回或重做。

開發分支仍是 **`codex/solo-sect-gpt`**，程式只改 `solo-sect-gpt/`。原本機位置 `/Users/chenyuying/.codex/worktrees/solo-sect-gpt/earth-ascension` 只作來源與真人入口；保留 `.serena/`、`solo-sect-gpt/jsconfig.json` 及任何後來的工作，不 reset／清理／強推。若 HEAD 已前進，先列相關差異，已修的項目只驗證，不重複改。

先確認 #372 無有效重疊主筆，按4h規則具名認領／續期，寫實際模型／工具、Cloud host與checkout、來源branch/head、當前dev SHA、範圍／檔案與下一交付；再次讀取確認。若已有有效作者或完整待審PR，只停止重疊寫入並交接，不覆蓋。

**本包採 #372 的新環境規則：Cloud 工程與自動驗證，Mac 只真人試玩。** 先安全發布已提交來源：若遠端已是9d7f62d即記「已同步」，不用重推；後來若只有本機提交，核作者／claim／祖先關係後只正常快轉推送已提交成果，不帶未提交內容、不改歷史。Cloud 只從公開提交接手，不讀他人的未公開修改；不得為本包在Mac開runtime、server、browser或跑自動測試。使用實際可用且已授權的Cloud checkout；若不可用，交固定來源與具體環境checkpoint，不能改稱本機驗證為Cloud或假稱啟動成功。

本文件是擁有人本次明示交給你的規劃輸入，當下可能尚未提交；登記開工後可只提交本文件並正常發布供Cloud讀取，或由擁有人提供全文到Cloud。不要順手stage其他未提交成果；這個文件提交與後續工程的比較基線仍需清楚記錄。

本提示詞是使用者新增的有限授權：取代 BRIEF 原本禁止本包對外推送／交審的部分，允許原作者安全發布自己的提交、在 #372 認領／交付、摘要回 #340及建立本包審查差異／主PR；不授作者 merge/dev/main/部署、不授修改別版、根契約／CI／依賴或整條長分支合dev。#67只由相應owner處理，作者不占merge票、不自審。

三項P2是擁有人在本聊天此次明確追加的補修；#372認領與PR需分列「PO原批准套用」與「擁有人本次追加三P2」，不假稱舊報告／原驗收已涵蓋新反例。相應行為與canonical hash的預期差異照實記，只改修補所需的範圍。

## 2. P2-A：掌門簿收起時仍能獨立開導覽

目前 `index.html` 新導覽是 `<aside id="nav-panel">`，舊 `.panel-hidden aside{display:none}` 把它與掌門簿一起藏掉。正常UI已重現：新局預設收掌門簿→點「導覽」→aria-expanded=true、hidden=false、9個標記存在，但面板display:none且尺寸0；打開掌門簿才出現，再收又消失。

最小修正：限縮掌門簿的隱藏規則或等價小修，讓導覽只受自己的開收控制；保留 `[hidden]`、aria、鍵盤、焦點與既有layout。不要重寫renderer或讓點導覽偷偷打開整個掌門簿。

先加失敗反例，再驗1440×900、1280×800：新局掌門簿關閉→開導覽；導覽開著時開／收掌門簿；導覽自身開／收、Escape與焦點返回；框線按Canvas CSS尺寸刷新。暫停時比較world／RNG／命令記錄不變，不把「DOM有標記」當畫面可見。

## 3. P2-B：舊退場檔的第一個命令之前補截止

目前 M41 只在 `jointTick` 提早截止。缺 `closedAt/bodyAt` 的舊格式 `exiting` 檔若讀入後保持暫停、直接試拳，`world.command`仍先扣精力，再於命令末尾 `jointCut`，新消耗又污染演練。

已用與M41測試相同的舊形相容fixture重現：載入時沈禾精力8521；不試拳的對照回顧耗能1414；讀入後不step直接試拳，精力降8321，回顧耗能1614。fixture只移除既有截止欄位，須明標，不能冒稱正常UI產生的舊玩家存檔。

在舊退場狀態首次命令／後續行為之前，沿既有生命週期補最早可證截止。不能等命令已生效或要求玩家先按繼續；不反推讀檔前歷史，不改生命／耗能公式，不新增保存欄位或升版。若選擇命令前的補截止，保留非法命令無副作用與去重契約，不讓拒絕的命令順便改世界；也可在真正成功載入邊界作最小相容處理，說清權威／時點。

反例：舊exiting檔→不step直接attack；舊檔→直接工作／其他耗能命令；無新命令直接續跑；成功載入／預覽取消／壞檔保護；拒絕與重複命令；新M41途中檔已存在截止時不覆寫。保留M37同tick截止前出招照算、截止後出招不算、多人的各自截止與自然完成。舊歷史未知如實列限制，不能將載入後的新消耗也當作「歷史無法還原」。

## 4. P2-C：召回近院中斷後續走，判定須與完成一致

M44 `expedition.mjs:111` 新續走條件只涵蓋距回院點 `>48 DU`，但非journey返院完成條件是 `<20 DU`，所以20–48 DU之間仍會永久停住。

已重現：從M44展示檔、calm，阿木只加到至少8000精力（與作者M44測試一樣的明標休養fixture）；正常 `expedition` 單派阿木往valley，1300tick後 `recallParty`，沿核心真路徑走到距safe.0為42.3148 DU時，下合法 `attack/punch`。路徑被核心清空；2000tick後仍距42.3148、phase=return、path=0、action/target/activity皆null、storyBusy=true、hp80、energy4874。相同中斷前世界的「不試拳」對照組已returned。沒有移動人物或手填return phase。

讓「該繼續走」與真正返院完成條件使用一致語義，涵蓋中間區間與邊界，不用擴大完成半徑／傳送／硬設returned掩蓋。保留v2旅程原規則、橋位、多人、占位、貨物實交與救援所有權；只有必要時抽共用純判定，不重做尋路或全遠征。

先加上述正常命令序列與對照，再補20／48及略內外的明標邊界fixture；原M44營地／溪谷召回兩反例、M7共享安排、M10返程，以及受影響途中存讀雙軌。確認真的回院、交貨及解除storyBusy，不只看到新path。模型fixture與正常UI證據分開。

三項逐一完成局部驗收與commit，不要修完第一項就總done；也不要等待整包才補基本回歸。

## 5. 併 #372：隱藏體魄的直接可逆顯示與renderer小差異

### 健康資訊遮罩

沿原 `disclosed`／既有揭露政策：只有掌門目前公開五項stats，非掌門不可因公版而擅改known。`makePerson` 生命上限公式是 `80 + stats[0]*5`，所以只藏體魄欄位不夠。現有 `personSnapshot.state.hp` 同時送rawValue/current/max，`publicCard`再投影；舊人物UI也印精確hp/maxHp，應一起核對。

在公開投影與玩家呈現邊界作最小共用遮罩，提供有來源、實用的粗健康狀態。不要只刪max卻在滿血時保留精確current hp；也不要把同一精確值留在tooltip、aria、data-*、rawValue/base/effective、來源文字或精確bar寬度。精確hp加百分比也可能直接反算上限，不能只換成百分比就宣稱修好。直接衍生的公開健康欄位／圖表也應沿同一政策，不能把raw物件先交給renderer再用CSS遮住。

核心hp/maxHp、傷害、治療、閾值、RNG、保存資料不改，不新增開局快照／保存欄位；不是要求消除一切戰鬥策略推測，也不藉機改玩家原本可知的其他資訊。既有開發fixture與原始存檔不是人物卡的公開payload；不要把它們混用來宣稱公開卡已遮罩，也不擴成本包的存檔／debug架構重建。若發現真正需要改揭露規則，列具體選項交PO，不能自行放開hidden。

必要測試：非掌門滿血／受傷、不同隱藏體魄但相同可公開健康分類的配對fixture，公開快照／公版卡／DOM與accessibility內容沒有直接可逆精確值；掌門原本已公開資料維持；known0、hidden、unknown、unsupported不混同。遮罩查詢與顯示前後world／RNG不變。至少一段Cloud桌面選人／切頁／刷新確認舊數字不殘留，不只測一個adapter函式。

### 兩個renderer，限定小差異

對照固定00f4dbe的 `sect-chronicle/{martial-view,event-view}/render.mjs`。上游sha256：martial `bbf241b6a08da283ecdde3c208ef77f3504e5043df8e07632868a5c60be8a5c7`；event `659dd4bdd3dc61282fb166eacf403a244300b3f3f230f983408a3bbe6297897b`。

相對ef823ac：event只改從public-ui/values取escape/valueText；martial改用publicValueHtml並加穩定 `data-view-key`。目前本版還有notApplicable、布林／清單文字與每人物開合焦點等本地相容行為，不能因換版本而丟掉。

保留ef823ac舊副本，新增固定版本的最小本地取用／必要import改寫，記上游與本地hash、依賴閉包、偏差於SOURCES；沿本版已鎖的values與不適用語義。只換正式入口需要的render，不帶 `*/gpt.mjs`、舊6cbd3e6核心、Pixi或整份公版。測known0／布林／清單／缺項、來源與escaping、同人刷新／換人／成功失敗讀檔的展開與焦點，以及U/F/I與紀事原語義。若新版確有無關回歸，按#372允許保留原版，交具體差異、反例與缺項，不重寫整個UI或假稱已更新。

### 復用既有套用

保留所有已完成adapter、Canvas、20Hz/Q256、人物／活動唯一權威、U/F/I與模板映射；自創／郭靖／令狐沖外觀沿原pin及私人原型權利，女孩缺圖回退，不加新角色或搬整庫。導覽仍讀當下公開人物／已知三設施／真camera；無公開route就unsupported，不讀私有path、不推路線、不派工。補驗不可見→可見→不可見、舊跟隨與選取、marker/title/list/pick清理、換局與失敗載入；未變證據復用，不重做M43/M44。

## 6. 驗收成本、提交與一份可審差異

只驗新差異與受影響反例，遵守分層政策及實際必要CI。三項P2都有修前失敗／修後成功；新遮罩與renderer有最小反例；保存只做相容風險所需續跑，不開升版工程。復用先前已驗的303／307項及未變UI證據，不把固定項數當門檻、不要求重跑全人物×武學×倍率／長seed／全保存矩陣；若新失敗／改動風險需要才擴驗。跑哪些、未跑哪些、復用哪些逐項列清。

Cloud桌面以同一正式入口、一頁／一browser／一server串行走新流程，最多這一組同時存在，finally清理；不要拿harness或模型fixture當正式玩家流程。測試輸出落新目錄，例如 `evidence/optimization/372-p2-closure/`，保留原M41–M44歷史證據，會覆寫舊報告的測試用隔離snapshot與正確唯讀Git context。模型、Cloud UI、作者自校、真人試玩分開，沒有跑就不宣稱通過。

工程commit全部接在 **codex/solo-sect-gpt**；同一作者、同一核心，不另外開一套遊戲。本包固定比較基線為實際開工前已發布的9d7f62d（若已有他人接續，依新claim鎖定基線），每項小commit後更新PROGRESS與本包紀錄；不得改舊done把未修寫成已修。

**同分支開發與短差異交審要分開：** source branch可正常快轉發布，但禁止開整條 `codex/solo-sect-gpt → dev` PR。若#372已存在主PR或Earth指定的審查base，沿既有唯一主PR；沒有時，可建立只供審查的固定refs：`codex/372-gpt-review-base` 指開工基線、`codex/372-gpt-review` 指本包最終source HEAD，兩者只引用同一批既有commits，不另作開發。以後者→前者交一份review-only主PR，正文明寫base/head、僅本包差異、不是dev整合或發布；附固定compare與patch/stat，確認不含開工前長歷史。已存在的ref不得覆寫他人成果，有衝突則沿現有合法主PR或交固定差異請Earth指定base，不搶推。必要補修沿同一source與review head正常快轉，不重開多PR、不自行merge。

實際diff涉及 `solo-sect-gpt/`，依#372交 **Earth** 集中非作者review；不能因是遊戲就交grass合此長分支。未來是否及如何拆進dev，由Earth另決定接續範圍／base與#67票，不把review-only PR或分支完成當成dev已接受。任何PR用根template、如實記Claude實際身份、規劃／原作者與證據來源；共用帳號留言不冒充獨立approval。

## 7. 最終交付與停止線

交 `docs/optimization/DELIVERY-372-P2-CLOSURE.md` 及本包新marker（例如 `handoff/public-adopt-gpt-01.done.json`）：

- 開工base、最終已存在的artifactCommit、source遠端HEAD、review PR／固定差異、作者與Cloud環境。
- 三P2逐項修前／修後、健康遮罩的資料邊界與保留健康資訊、兩renderer取用／保留理由與hash。
- 局部測試、Cloud桌面短流程、保存相容、未變證據復用、來源／模板／權利與未做項；不寫自己才要產生的SHA。
- 在 #372 具名回填同一份主交付／PR與限制，摘要連回 #340。本包工程與作者驗收完成可交review；非作者review／CI／dev接受各自記真狀態，不以自己done取代它們。

只有三P2、#372必要出口與可審交付齊全才記本包實作done；Cloud不可用、真相容／揭露取捨或審查base無法安全建立時交具體checkpoint/blocked與已完成成果，不循環催同一錯誤，不把未跑驗收填pass。不要清理既有相容欄位、新增保存欄位、重開水分需求或女孩buff；手機、保存升版、新玩法／新天賦／新圖庫繼續最後。

整包交回集中review後休息；若收到必要補修只收尾同包。不自行merge／部署、啟動下一milestone、派其他作者或永久loop。
