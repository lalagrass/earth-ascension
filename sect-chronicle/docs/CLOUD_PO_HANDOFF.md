# 遊戲PO／review雲端交接

[D48批准](DECISIONS_AND_SOURCES.md#d48遊戲po與review預設雲端執行2026-10-25)／[環境設定](CLOUD_REVIEW_ENVIRONMENT.md)／[給Dot提示詞](DOT_GAME_PO_PROMPT.md)。本文件使repo與GitHub成為可接手依據，不要求搬完整本機聊天／tmp目錄或遠端讀Mac。

既有Dot名稱是**grass**；本次只配置它可使用的Cloud環境及遊戲PO交接，不建立第二個Dot、不搬動grass其他現有任務。

## 分工與權限

| 角色 | 責任 | 邊界 |
| --- | --- | --- |
| Dot／雲端遊戲PO | 讀最新決策／issue，維護遊戲backlog／工作包，集中產品與PR審查，交ready結果給Earth | 預設Cloud，不執行dev/main merge、發布main、變更未批准數值或另派人重做已認領包 |
| 必要雲端review任務 | 非作者審受影響diff／圖稿／必要直接反例，回同一PR | 一包一次集中結論，不多開平行reviewers／長矩陣；同帳號不冒充獨立平台approval，寫實際主筆／審查者 |
| Earth PO唯一queue | 核當前head/base、合併結果與必要CI，合格squash→dev、確認postCI | 唯一合併權保留，遊戲PO不代合；復用產品驗收證據，不再重跑同一套遊戲 |
| Grok | 原HOME01唯一工程主筆，按D47整包一PR | 現claim／範圍／base／期限不因PO移轉重設，不被要求等環境或補交重複證據 |
| 使用者／Mac | 真人試玩、提出體驗與產品取捨 | 自行開試玩／按需同步接受版；無預設agent本機測試、服務、瀏覽器或輪詢 |

Earth PO的執行位置與合併權是兩件事：本次不另設第二個雲端queue owner。既有Earth聊天是同一唯一角色的交接入口，可先透過GitHub接收ready記錄；環境可用後相關工作預設雲端。若目前API權限／環境有缺口，回報具體缺口，不自動把review／渲染轉回Mac。這輪一次性的環境設定與文件審合準備，不當作繼續常駐本機review的例外。

## 目前已批准與進度（接手時再核最新issue）

- repo `lalagrass/earth-ascension`，日常base／PR target＝dev，預設GitHub branch main不是目前開發真相。CONTRIBUTING合併權與根AGENTS照舊；遊戲入口sect-chronicle/AGENTS。
- **D47／HOME01 #309**：[正式包](HOME01_HANDOFF.md)／[Grok提示詞](HOME01_GROK_PROMPT.md)，PR325已合dev7ea5ac38、postCI40111287245五成功。I1完整S0、I2 D45補給／茶與生活／武學面板、I3 A保權威幾何／全水彩適配、I4必要局部設施站位／控制整理，一Grok一PR做到完成。
- Grok已交[HOME01 PR326](https://github.com/lalagrass/earth-ascension/pull/326)，初交head17f851c1f98346e25d67cbf2397ac357a197335d，待雲端PO依A–D集中review；作者自校不是PO接受，不自動合併／部署。
- Grok原有效認領：[6386685609](https://github.com/lalagrass/earth-ascension/issues/309#issuecomment-6386685609)，branch `codex/home01-s0-tea-grok`、自有box `/workspace/ea309`、base7ea5ac38。此處是進度快照，開工／push／接手時讀最新認領與4h規則，不拿本文件時間當自動續期／失效。
- SCENE04／PR323最終f38e601已接受／合dev ec6b2744，主殿與動線兩P2已解；#182／184為素材母單。勿照D1舊候選取水點，採用時以HOME01真權威幾何與最終plan語義為準，不重開出圖包。
- 最近正式試玩接受版TRAIN01／PR308 merge abbee504、postCI40101025656；Mac唯一`http://127.0.0.1:8800/experiments/water-carry/demo/`。雲端無法把自己的localhost當使用者Mac的8800，也不能因看不到而重建另一正式版本。
- 後續排序只讀[VISIBLE_DELIVERY_PLAN](VISIBLE_DELIVERY_PLAN.md)／[FUTURE_BACKLOG](FUTURE_BACKLOG.md)。#314–321新核心／新入口／新保存／全N人只是提案，未採用；手機與新增保存升版遷移仍最後。

## 雲端接手與集中review

1. 先核本任務Work in＝Cloud、選定earth-ascension已發布環境；回報當前repo／dev SHA、權限與現作者狀態。不以hostname／單一自設環境變數當已遠端的證明，不自動調本機工具補缺。
2. 以GitHub issue／PR、repo正式文件和CI為共同紀錄；所有有效作者、head/base、claim、阻擋／已驗／下一步可追。不依賴本機聊天ID、絕對worktree、/tmp接受部署或localStorage作必要輸入。
3. 收Grok完整HOME01 PR後，鎖實際head、對當時dev與A–D集中看整包；作者可信的受影響證據能回答就復用。純文件不開遊戲；靜態圖在雲端看；只有UI真缺口才一個雲端預覽／headless流程。不要在Mac開瀏覽器／server、全seed／角色倍率／保存或手機矩陣。
4. 同一回合列完整阻擋，附最小重現／圖與範圍；原作者同PR集中補修，新head只看差異與連帶風險。一般美化／架構建議排backlog，不新增HOME01 DoD或拿環境移轉當工程gate。
5. 通過後在原PR／#67留ready：實際作者／審查者、head/base、A–D結論／必要證據、目前CI、未變證據來源、未解風險與清理。交Earth唯一queue，不自己跑merge命令、不將同帳號COMMENT冒稱平台獨立approval。Earth復用結論，核當前merge／CI／postCI。
6. 工程合dev／postCI後，只交**最新接受SHA、CI與真人試玩同步說明**。Mac試玩更新由使用者發起；雲端PO不自動SSH、調用Mac、本機部署或新增常駐服務。仍只有一個正式接受版本，不新增備份入口／版本選單。已存在的Mac服務／用戶頁／Grok工作不擅自關閉。

需要給Earth的資訊以GitHub #67／PR為持久交接，不依賴跨本機聊天工具。私訊另一聊天仍須依使用者授權與工具能力；Dot接手不等於可任意跨聊天發訊。這次人類授權整理交接，不包含新增固定排程／永久agent循環；後續定期追蹤要明確指定觸發與通知策略。

## 最小接手回報

```text
角色／位置：遊戲PO＋review，Cloud；Earth PO唯一merge，Mac只真人試玩
環境／repo／最新dev：…
目前實作者／issue／branch／head／claim：…（核最新GitHub）
已批准下一交付／待審／阻擋：…
這次審查／復用證據／必要差異驗證：…
權限缺口：…；無缺口則不新增要求
清理：自建預覽頁／服務／程序已關；未用Mac／未部署／未代合
```

只有意圖／scope新改變、交付、真阻擋或需產品取捨才通知，不為無變化打卡。不要替Grok預占後包、強停HOME01、重設租期或要求重新開始；4h是可憑具體進度續的認領窗口，不是開發總限時。
