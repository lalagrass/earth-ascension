# 遊戲PR review／dev合併責任移交grass：規劃

2026-10-25台北，總控[#334](https://github.com/lalagrass/earth-ascension/issues/334)。[生活M1清單](LIFE_M1_EXECUTION_PLAN.md)／[接棒協定](GROK_GRASS_HANDOFF_PROTOCOL.md)／[grass提示詞](LIFE_M1_GRASS_PROMPT.md)。擁有人授權的是整理移交方案；**本文件未使grass取得merge責任，現行CONTRIBUTING的Earth唯一queue仍有效**。不改GitHub App／repo可見性／保護或授新憑證，不把工具有merge能力當角色已授權。

## 建議權責邊界

| 角色 | 切換後的建議責任 |
|---|---|
| Grok Bot | 已批准白名單遊戲工程主筆、原PR補修與必要證據；不自審自合 |
| 既有grass | 遊戲PO／單一Cloud review及純遊戲PR dev squash整合，核head/base／當前merge／必要CI／postCI，不實作所審程式、不授新產品數值 |
| Earth PO | Earth／小說及混合、根CI／依賴／共用契約／權限PR，維護共用#67序列；切換後不再同時合grass負責的同一遊戲PR |
| 擁有人 | 批准本切換、新產品／數值／資料語義取捨、付費／main發布與白名單變更 |

純遊戲＝diff全部位於sect-chronicle/，且issue／改動均屬已批准遊戲範圍。根CONTRIBUTING／AGENTS、.github、跨產品／共用依賴／merge權限／分支保護等不由grass自行審合；即使檔案在遊戲目錄，若改整合權限／產品決策，也不能用路徑繞過擁有人。main不在移交範圍。共用帳號仍寫實際主筆／reviewer，COMMENT不冒充平台獨立approval。

## 單一dev序列，不能兩個owner競合

保留#67為共同整合紀錄。每次只有一個active merge工作，明列owner、PR、鎖定head、當時dev／merge結果與CI；Earth處理其他產品時grass等待，grass處理遊戲票時Earth不並行執行另一dev merge。必要CI等待留狀態，不用短輪詢或重送票。只協調整合時機，不讓Earth再做同一套產品review。

#67紀錄是協作規約，不是GitHub原子鎖或已啟用Merge Queue；不宣稱本案新增硬性分支保護。合併前再核head/base，若dev／head前進則核差異與當前CI覆蓋，不把先前綠燈當新結果。merge後核實唯一parent／tree與遠端dev、實際push CI。真正規則沿GitHub現有保護，不能admin／force／跳gate；沒有可證明的序列／CI就先記待整合。

## 切換步驟與生效判準

1. 擁有人明確批准切換角色／純遊戲範圍／M1白名單，指定生效點。規劃PR被Earth合併不等於此批准。
2. 準備**正式權限PR**：同步根CONTRIBUTING／AGENTS、SG AGENTS／CLOUD_PO_HANDOFF、相關遊戲prompt及環境啟動規則中的Earth-only限制，明記已批例外；由現任Earth queue審合dev／postCI，不能只改一份提示詞與根契約衝突。本規劃不直接修改這些有效權限。
3. grass回覆接手收據：真Cloud位置／repo、最新dev、可讀PR／checks、可用寫COMMENT與merge工具及權限缺口。只能驗正常已授動作，不造測試merge／空PR或複製Mac token。工具與權限若不足，紀錄缺口，不聲稱已具備合併能力。
4. #67發布唯一切換紀錄：effective_after_sha、範圍、grass owner、原Earth game-merge停用、未結票由誰完成。當時若#333仍未合，只有確認無另一active票後才可明確轉由grass；否則原Earth照常收尾，不用規劃卡住#330。
5. 首個符合範圍且非作者已審合格的真PR，由grass鎖expected_head_sha、squash到dev，核merge／postCI成功後回填。不能為證明接手而放寬分支規則，第一個合法整合才是實際能力驗證。

切換未完成時，雙prompt都只能沿現行Earth路徑；Grok330與grass原D49 review繼續，不等此計畫或重做已驗。若M1先完成，不製造新PR測移交，責任可留待下一個已批准遊戲包正式切換。

## 出錯與返還

head／CI／衝突或不符合純遊戲範圍時，不合。postCI失敗停後包，保留證據，原批准範圍另fix／revert PR；不得rewrite dev。grass若額度／工具不足，先交未完成與接手點；**不自動讓Earth和grass同時接管**。擁有人或依已批協定在#67先停用grass merge、明確返還Earth後才由Earth執行，現有作者與工作不被重置。

本計畫未建立GitHub Merge Queue、CODEOWNERS、workflow／webhook／runner，也沒有新secret／付費／本機服務。Cloud預設、必要CI與證據復用／單一試玩版、Mac真人、保存升版與手機末位保持。
