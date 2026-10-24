# D51：grass純遊戲PR review／dev合併正式移交

擁有人2026-10-25台北已明確批准M1完成線及本移交，總控[#334](https://github.com/lalagrass/earth-ascension/issues/334)。這取代D50的「只規劃／待批准」，不授新玩法。權限根據[CONTRIBUTING](../../CONTRIBUTING.md#d51純遊戲-pr-的-grass-權限與正式切換)；實際操作生效由Earth在[#67](https://github.com/lalagrass/earth-ascension/issues/67)公布，不能僅因這份文件合併就假報cutover。

## 角色與範圍

| 角色 | 責任 |
|---|---|
| Grok Bot | 白名單遊戲包主筆、同PR補修與必要證據；不自審自合 |
| 既有grass | Cloud遊戲PO、單一集中review；切換生效後整合非本人主筆的合格純遊戲PR到dev並核postCI |
| Earth PO | 正式權限PR、Earth／小說、混合、根CI／共用依賴／契約／整合權限；維護#67共用序列，切換後不再同時合grass的遊戲票 |
| 擁有人 | 新產品／數值／重大資料語義、白名單變更、付費及main發布；本M1與角色批准不重問 |

純遊戲＝**完整diff全部位於sect-chronicle/且issue／改動屬已批准遊戲範圍**。根檔、.github、跨產品／共用依賴、整合權限／分支保護仍Earth；遊戲路徑不能繞過這些邊界。grass若主筆文件，交Earth或其他合法非作者review流程，不能自審自合。共用帳號留具名COMMENT，不能冒充平台獨立approval。main不在移交範圍。

## 正式切換與接手收據

1. 人類批准已取得（D51），不用再問M1或純遊戲角色。此次正式權限PR由現任Earth核完整diff／一致性／必要CI，正常squash→dev，核實際push postCI。
2. 更新**既有**私人earth-ascension Cloud環境Start skill的Earth-only限制，保留repo／工具安裝／網路／secret／Only me與不自啟服務。實際保存發布後回讀內容、名稱與發布狀態；repo文件不代替環境發布，也不新建Dot／環境。當前已存在Cloud task也要讀新契約並明確接收新指示，不假設環境發布會重寫它的既有上下文。
3. 既有grass回收據：真Cloud位置／所選環境、最新dev、可讀PR/checks、可用COMMENT／正常鎖head squash工具與具體缺口；在#67正式任務收據即可驗COMMENT。憑證用正式既有連接，不拷Mac token；不為測權限造空PR或試合。首個合格真PR才是merge能力實證，未驗者照實標明。
4. **Earth在#67公布唯一cutover**：effective_after_sha（正式權限接受SHA）、postCI／環境發布與收據來源、grass純遊戲owner／範圍、Earth停同範圍merge、未結票owner、生效UTC時間。發布前仍Earth唯一merge。#333目前只有Cloud ready queue，Earth已確認未啟active merge票；正式切換時再核最新狀態，尚未合且無另一active票可明交grass。若已被Earth接下或收尾，不重做／搶合。

## 共用dev串行與精簡整合

#67同時只有一個active dev merge，票記owner／PR／鎖定head／當時dev／CI；Earth處理別產品時grass等，grass整合遊戲時Earth不並行merge。#67是協作規約，不是原子鎖或已部署GitHub Merge Queue；競合時先協調票歸屬，不嘗試賽跑。

review結論／真圖／未變測試能回答就復用，不再交Earth重跑產品驗收。真正合併者核完整diff、head/base、實際merge父SHA／tree與當前必要CI；無關MD前進不要求作者重跑全遊戲，但不能拿舊綠燈代替當前合併CI。鎖expected_head_sha正常squash到dev；有新head/base就核差異，禁止force/admin/跳gate/刪作者分支。merge後確認遠端dev／接受SHA與該push必要postCI，成功才done。

## 停止、失敗與返還

本次M1剩餘工程只330／PR333，D49 A–D不加碼。Cloud已對b86657324c82c2d470baeac39c0d74ea552d56a5交[ready6388542820](https://github.com/lalagrass/earth-ascension/pull/333#issuecomment-6388542820)，只核最新差異與整合；全部done後沿接受SHA交摘要、清理休息，不掃其他OPEN／加M2／排程。

head／CI／scope不符不合，postCI失敗停後包，原scope交fix／revert PR，不rewrite dev。grass工具／額度不夠時，#67明記停用grass merge與未完成票，再明確返還Earth後才接管，**不能兩個owner同時生效**。由已批准協定處理同範圍返還，不重問既有產品授權；新範圍仍擁有人決定。保存升版、手機末位、Cloud／Mac真人、單一正式版及既有玩法／資料保持。

本次不改App授權、保護、workflow、secret或repo可見性，不建runner／callback／付費服務。Grok手動人工接棒方式見[協定](GROK_GRASS_HANDOFF_PROTOCOL.md)。
