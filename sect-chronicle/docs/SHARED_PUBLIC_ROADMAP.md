# 公版有限交付路線 — #346

擁有人於2026-10-26要求整理公版待開發並 trigger session 依序完成；權威索引為 [#346](https://github.com/lalagrass/earth-ascension/issues/346)。三核心玩法／世界保持獨立，公版只交換已可證資料及呈現。每包一主筆／一主PR，grass非作者集中review、#67唯一票、dev必要postCI成功後才派下一包。

| 包 | 狀態／具體成果 | 下一條件 |
|---|---|---|
| #342 共用場景 | PR344已交：固定GPT/Gemini真核心、同Pixi renderer；dev490b9ae/postCI40294390608成功 | 已復用 |
| #345 人物卡／行動 | PR347已合dev457aa0be902c26691bebaea2881820d86e5330db，postCI40301296266五成功；Grok真核心薄接線、來源／缺項語義 | 已復用，不追溯新增美術驗收 |
| [#348 素材版本](https://github.com/lalagrass/earth-ascension/issues/348) | PR352已合dev23b511db75f2fb2862241194a8a999aa357534aa、push postCI40304567407五成功：三獨立pin、正式主角既有圖裁切、女孩缺圖／權利未知、最多三景物、真GPT harness。見[工作包與交付](PUBLIC_ASSETS_HANDOFF.md)及[接手prompt](PUBLIC_ASSETS_AUTHOR_PROMPT.md) | 已復用 |
| #349 設施／互動點 | PR353已合dev95402dcaf6adff4b39a799c930af58c536273b6a，push postCI40307050558五成功；原正式設施詳情／tooltip／真水藥指派、第二真GPT薄適配。見[FACILITY_PUBLIC_HANDOFF](FACILITY_PUBLIC_HANDOFF.md) | 已復用 |
| [#350 武學卡／動作](https://github.com/lalagrass/earth-ascension/issues/350) | PR354已合dev67b49e3a078ea491432a9ff22de48400019fc57e，push postCI40309733677五成功；三真核心武學來源／缺項、正式兩skin原第一式共用映射，原公式不改。見[工作包](MARTIAL_PUBLIC_HANDOFF.md) | 已復用 |
| [#351 近期事件／整合](https://github.com/lalagrass/earth-ascension/issues/351) | PR355已合dev ef823ac277f48d9426cc3806f74468126a9cf91d，push postCI40312921799五success；原事件唯讀來源／遮罩／120快取24近期與同入口累積流程。見[工作包](EVENT_PUBLIC_HANDOFF.md) | #346有限序列已完成；證據復用，不重開原包 |

#343經典角色圖持續是研究候選，未定第三方權利與正式角色對應；#339完整素材庫等母願景不因有限包關聯而全部關閉。缺資料用unknown/hidden/unsupported，不以0補缺或拿別角冒充。保留單一正式生活入口、原長路與速度／命令／D45／D53；無存檔升版、手機、付費／CDN／LFS／新repo或整庫搬遷。當前正式dev與獨立原作者分支的最新功能不可混稱已同步。


## 母願景已交／未交

#340已由#345/#350交有限人物卡、行動與武學來源呈現，#351補真事件銜接；新天賦效果／新增經典角色與三原作者分支全面採用未交。#339只交#348有限本地pin／manifest與主角舊圖裁切，完整圖庫／女孩正式圖與第三方權利仍未交。#181/#315/#318只復用本序列已證薄接線，不當全面遷移或全角色動畫完成。#120只交唯讀原事件，完整canonical causes[]、保存升版與生成敘事未交且未授權。任何母願景不因本有限PR全部關閉；固定來源與更新步驟見[能力表／版本指南](EVENT_PUBLIC_HANDOFF.md#三版能力與固定來源)。


## #356 新批准的有限序列（2026-10-26）

擁有人明確要求公版補修後接續開發；[#356](https://github.com/lalagrass/earth-ascension/issues/356)只授下列三包，一主筆一主PR、grass非作者review／#67正常鎖head squash／dev＋必要postCI後才派下一包，結束休息。前序#346已完成；不把本輪候選倒寫為已合成果。讀[正式包](PUBLIC_M2_HANDOFF.md)與[作者接手prompt](PUBLIC_M2_AUTHOR_PROMPT.md)。

| 包 | 狀態／範圍 | 下一條件 |
|---|---|---|
| #357 PUBLIC-FIX-01 | PR360已合dev2937dd017f8b5e6dea0a05e1ae120bd25499dc15，push postCI40319800609五success；GPT原可見性／scene事件遮罩、茶真活動來源、每人物details／焦點保留 | 已接受，沿原證據復用 |
| #358 RESOURCE-VIEW-01 | PR361已合dev5e7f36682272ef44190bc0d908030213e4ab8ca0，push postCI40323071547五success；原水／藥／木五欄逐項來源、facility incoming誤名修正、真茶resv/avail與第二GPT薄證明。見[工作包](RESOURCE_PUBLIC_HANDOFF.md) | 已接受，沿原證據復用 |
| #359 INTENT-VIEW-01 | 本PR作者候選：原工作／唯一pending／停工／恢復／叫回與原護院整理政策、共用原命令／最新人物payload重核、第二真GPT原stop/resume與能力缺項。見[工作包](INTENT_PUBLIC_HANDOFF.md)／[補修prompt](INTENT_PUBLIC_AUTHOR_PROMPT.md) | grass非作者review／dev／postCI後才done；本輪最後包，完成及必要補修後休息 |

再後的RelationView、建造／床位、人格／天賦效果、完整圖庫與小地圖／編輯器仍候選，原#337作者邊界保持。採#356既有開源設計參考、沿Pixi＋DOM薄投影，不搬第三方引擎或原作資產。手機／新增保存升版仍最後，Mac只真人；各包復用未變證據，不新建永久循環或排程。


## #356 三包累計收據與停止線（#359候選）

#357／PR360已合dev2937dd017f8b5e6dea0a05e1ae120bd25499dc15、postCI40319800609五success；#358／PR361已合dev5e7f36682272ef44190bc0d908030213e4ab8ca0、postCI40323071547五success。#359本PR交原工作／自主設定共用視圖、原命令重核與第二真核心能力／缺項，尚待grass非作者review／dev／必要postCI，不將候選寫成已合。[正式包](INTENT_PUBLIC_HANDOFF.md)／[作者補修prompt](INTENT_PUBLIC_AUTHOR_PROMPT.md)保存直接證據與限制；最終接受SHA／postCI以#359與#356完成留言回填，不再新增文件gate。

本輪只沿BL-U01／U02、G05／A01–A04已存在資料抽取呈現；沒有新queue、AI、共同閾值、物流／自主規則、保存升版或手機。Grok本包只有來源能力對照，未假稱已完成IntentView接線；GPT與正式版的休息、pending、政策差異保持。#359與必要同PR補修完成後作者／grass休息，不自行接關係／社交、建造床位、人格天賦、完整圖庫／女孩圖、小地圖／編輯器等新backlog；原母願景與#337作者邊界不變。


## #365 有限序列：介面外觀 → 場景導覽（2026-10-26）

前序 #356 已完成：#359／PR362 合 dev `7dda0fbf7b966c4016114de2ab3d4192faf8abbc`、postCI40327857984 五 success；#363／PR364 公開簡介合 dev `bb251ab78e4bc0579e3e750afd0cc7fe2a9c6dd5`、postCI40335155271 五 success。以上取代上方當時候選快照，原證據復用。

| 包 | 狀態／範圍 | 下一條件 |
|---|---|---|
| [#366 UI-PRESENTATION-01](https://github.com/lalagrass/earth-ascension/issues/366) | PR369 已合 dev `6f959f534e9a00994f1cea7c230b4110e60db8c6`，postCI40340938923 五成功；紙墨 tokens／狀態focus與原 showcase。見[handoff](UI_PRESENTATION01_HANDOFF.md) | 已接受，未變證據復用 |
| [#367 SCENE-NAV-01](https://github.com/lalagrass/earth-ascension/issues/367) | 本 PR 作者候選：原snapshot/camera小地圖、可見人物/已知點/視窗框，原選取跟隨定位；第二真GPT原尺度、可見性/epoch/pick清理。公開實際route未提供即明示缺項。見[handoff／prompt／能力表](SCENE_NAV01_HANDOFF.md) | grass非作者review／#67／dev＋必要postCI後才done；本序列最後包，完成總收據後休息 |

借 Unciv 外觀分層／單元件預覽概念；沿現有 DOM/Pixi，無新框架或皮膚產品。#337 公開關係未穩定、建造床位 #315/#321、人格天賦 #340/#106、完整素材庫 #339／女孩圖及編輯器仍原 backlog；Grok 的有限立繪第二包保持原指派，#366 不改素材。三原作者分支不假稱自動更新。Cloud 工程／Mac 真人、同一正式入口、原世界數值／長路速度／D45／D53 保持，新增保存與手機最後。#366→#367 完成及必要補修後停止，不啟永久循環。


### #365 累計與目前交付（2026-10-27）

#366／PR369 已接受及 postCI 完成；其後 #368／PR370 Grok 有限立繪合 dev `3079a03de5c2e8c79af64b0962ae3da75f274466`、postCI40412033087 五成功，原圖與作者保持。#367 現為本作者交付候選，未冒稱合入；[場景導覽 handoff](SCENE_NAV01_HANDOFF.md)保存 A–D、三版缺項、來源與清理。最終接受SHA／postCI由grass在#367/#365回填，不新增文件gate。

已提取簡潔小地圖，不等於完整世界地圖／探索記憶／路徑編輯器；關係、建造、人格、完整圖庫與其他玩法依原議程。#367及必要同PR補修完成後停止，不代啟新包；保存升版、手機最後。


## #375 PUBLIC-RELEASE-01（2026-10-28 新批准獨立包）

#365 已由 #367／PR371 完成，接受 dev `00f4dbe26be5765a9622957b7c6a636ab5039f96`、postCI40500543161 五成功；上方候選是當時作者快照，完成以GitHub總收據為準。#375 是新批准的中央發布／契約與升級流程，不重開前序。

本PR作者候選 `public-kit@1.0.0`：薄DOM/data入口、optional Pixi入口、可重跑必要runtime閉包/hash與明選素材pack，adapter/host與開發core分開；相容來源遮罩及optional觀察/位置持有/region原點helper、SemVer政策/changelog/00f4dbe遷移、中央真固定GPT試點。見[整包handoff／migration／prompt](PUBLIC_KIT_RELEASE_HANDOFF.md)與[API／版本／發布流程](../public-kit/README.md)。尚待grass非作者review／#67／dev/postCI，以新接受SHA收據封存首次整包，**不稱00f4dbe已發布1.0.0**。

#372～#374各自仍固定00f4dbe，不新增#375前置、不改scope/DoD、不代啟或進原作者分支/box。版本/素材pin/save分開，不npm/全局release/根依賴CI/權限/新玩法；保存升版、手機最後。這包及必要同PR補修、發布收據完成後休息，不接新backlog或巡檢。
