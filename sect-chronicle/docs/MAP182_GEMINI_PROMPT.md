# Gemini接手提示詞：#182圖像設計與PR248補修

## 本設計補修提示詞已完成，勿再啟動（2026-10-23）

PR250設計已接受並合dev dff6f310／postCI39906919235五SUCCESS；下方只保留D25交接沿革。下一個已批准實裝片是[#254](https://github.com/lalagrass/earth-ascension/issues/254)的[LP13長挑水路工作包](LP13_HANDOFF.md)／[新Gemini提示詞](LP13_GEMINI_PROMPT.md)，**W1–W4依D27已批准；本批准PR255非作者審合dev／postCI後，Gemini本人新claim，不重問四項**。不延用設計claim／branch，不重做舊四項補修、不把PR250綠燈當接線授權。

擁有人明確將Grok額度不足後的改圖一併交Gemini，完整 [工作包](MAP182_HANDOFF.md)以D25更新優先。以下可貼給同一位Gemini；沒有代啟作者，也未授遊戲接線。

```text
你是Sect Chronicle／earth-ascension #182設計與改圖接手主筆Gemini。擁有人直接要求：「grok 額度暫時不夠，把改圖一起交給gemini接手」。你承接剩餘圖像設計、必要改圖與PR248四項P2；保留Grok已交成果／真實原作者與review。長通勤／看人物奔波、自由延伸生活功能點與未來巡山構想的D24方向不變；新增點標現有／景觀／候選。這次只完成設計補修，遊戲整合／新玩法仍待擁有人看稿確認範圍，不因同一作者接手就順便實作。

從repo根讀AGENTS.md、CONTRIBUTING.md、sect-chronicle/AGENTS.md、sect-chronicle/docs/DECISIONS_AND_SOURCES.md的D25及D24、sect-chronicle/docs/MAP182_HANDOFF.md與sect-chronicle/docs/MAP182_GEMINI_PROMPT.md。讀 https://github.com/lalagrass/earth-ascension/issues/182 最新改派／claim、PR248 https://github.com/lalagrass/earth-ascension/pull/248 全部審查，特別review5623213224與四項補修6355924304。D25交接文件須非作者接受、Earth合dev及postCI通過後再本人新claim；不要誤用舊Grok prompt或冒稱原作者自行released。

你的#241／PR244原補修scope與期限維持2026-10-23T04:30:30Z（以最新有效留言為準，不因這次改派自動續期）。建議先把休閒自主清鼠返院P2修好送review，再於等待時接本圖像包；圖修不等244合併。兩包兩PR、不同checkout，不把圖或新功能塞入244；到期須按原契約續期／重新認領，不沿用過期名額。

美術專用worktree已存在 /Users/chenyuying/workspace/earth-ascension-grok-art184，名稱保留即可供你接手。先唯讀確認無新有效作者與未提交內容；不reset／force push／stash他人內容，不改 /Users/chenyuying/workspace/earth-ascension-gemini-241。原Grok codex/map182-dojo-design at d56acd335710f7edb7348025b9f9198a39cbc1d8 與codex/art184-grok-build都保留，不往原248加提交。確認乾淨後fetch最新origin/dev，在美術worktree從origin/dev新建未占用codex/map182-gemini-fixes或另一codex短分支；按當時dev SHA認領這一個包，GitHub created_at起4h，寫真實Gemini／工具、來源Grok、精確白名單、base/head與接續PR安排，重讀確認最早有效claim再動手。4h是作者租期不是填滿時間；有進度才續期、quota不足released、完成PR回review，不沿原Grok或舊兩小時窗口。

沿用來源是公開PR248 head d56acd335710f7edb7348025b9f9198a39cbc1d8（原base5b797722a6daab7eb8ed83507c44c303324926d1）。先核原commit只含design/map182/**，可用git cherry-pick -x沿用並保留來源；若最新dev已有成果先核差異，不重複套入。衝突只處理自己白名單，不順手改契約。建立新的接續PR指向dev，Refs #182並明示continues #248／原Grok來源；原248保留review，不自行關閉，交PO於新PR完整交付後標唯一有效PR。不要把Grok素材改署為自己原創。

只寫 sect-chronicle/experiments/water-carry/design/map182/**（圖／SVG／JSON／自有README／來源與播放器）；不改demo、checks、共享實驗README、atlas／template／spikes、其他PO文件、root依賴CI／Earth或8800，不改模型、路線、速度、精力、成長、收益或掌法。現有圖／分鏡／影片只是概念，不可直接裁進atlas或稱遊戲已擴圖。

四項必修，局部處理即可：
1. source/plan.svg後畫圖例框x48–668/y48–298遮掉遠村(260,190)、山門(520,150)、巡山石堆(500,210)及文字。移圖例到空白／圖外，核一張完整圖，確保三點與巡山虛線終點可見。保留分類，不加巡山玩法。
2. README與SVG的107是214/scale2透明幀框，不是人物可見身高。現hero/cousin idle-0 alpha bbox分別(11,14,169,187)/(11,14,169,183)，可見高度86.5／84.5場景單位，腳底anchorPx(90,184)／scale2。核當時真來源，明分透明框／非透明bbox／腳底，補一個代表幀在建議鏡頭與景物的真尺度示意；不跑全幀矩陣或重做atlas。概念新人物另標候選尺度，不假裝已工程鎖定。
3. motion/index.html固定1100+48 padding、缺viewport，不適合390。補最小viewport、流動寬度及窄畫面四格排法；一次390真點播放→暫停時間穩定→續播→有限10.041667秒終點穩定→重播，少量圖／真結果。不能拿phone.html的靜態390圖代播放器操作。桌面原中停0.095189／續播／結束／重播證據可復用，只驗受影響部分，不建新引擎或通用播放器框架。
4. source/prompts.md目前只有做法摘要，補可取得的實際prompt／edit instruction原文、對應輸入圖路徑、真實工具／可取得設定版本。找不回原文要明寫未保存與限制，不能倒寫推測成Grok真實提示；必要局部改圖可用你實際可用工具並保存新prompt／輸入／來源。不要為補紀錄重生全部圖，也不要把補寫摘要稱完整可重製。若仍缺來源需列未交，由PO判定，不假稱四項全解。

原全景、溪橋近景與四格可保留；必要改圖與剩餘設計自由一併由你接手。不要在修四項時重畫全部、擴到新玩法或偷偷改1709.1路長／速度／精力來抵銷通勤代價。需要進一步場景／人物美化可列非阻擋候選與少量圖，先完成必修，主角概念／帽飾不等已定canon。

驗證沿測試與輸出成本原則：原四條JSON路長／固定等級紙上耗時、原美術與未變遊戲證據可復用；只核圖例／尺度、來源與受影響390真操作，必要XML／自有JS syntax、git diff --check、python3 -m unittest discover -s tests -v、node --check earth_ascension/static/m2.js及適用CI保留，SG快驗沿現有CI。不重跑世界seed／長RT／存讀RNG、全cast全動作或鏡像單測。完整log留檔，回命令／真exit摘要、失敗、少量圖與GPU／工具限制；沒有工具或找不回來源就照實，不假造測試／歷史prompt，不自開付費服務。

完成即停，提交接續PR／回#182 review，寫真作者Gemini、原Grok來源、claim期限、base/head／精確檔案、四項逐條證據／復用與未驗限制，交遊戲PO非作者review→Earth唯一queue鎖head squash dev→postCI。你不合dev/main、不刪原分支或代啟其他agent／排程，不啟停8800；預覽用確認空埠。圖稿合併後仍先讓擁有人看，另定Gemini實裝工作包與認領。
```
