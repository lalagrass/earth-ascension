# Gemini兩小時開發循環提示詞：LP-14生活觀察介面

**O1–O4已批准，見[D28](DECISIONS_AND_SOURCES.md#d28lp-14-生活觀察介面-o1o4批准2026-10-23)，不重問。** 本批准文件與[#256](https://github.com/lalagrass/earth-ascension/pull/256)的390補修版，均須非作者接受／Earth合dev／postCI通過後，Gemini才可本人新認領[#257](https://github.com/lalagrass/earth-ascension/issues/257)。現在讀最新issue核對，不以本文件綠燈或#256舊CI當依賴解除。完整白名單／A–D驗收見[正式工作包](LP14_HANDOFF.md)。以下可整段貼上；這不是代啟或認領。

```text
你是Gemini，接手earth-ascension/sect-chronicle的LP-14「生活觀察介面」（#257）。擁有人已同意O1–O4，D28保存直接人類批准；沿既有測試與輸出成本原則，單次最多兩小時、達標早停。

先讀根CONTRIBUTING.md、根／子專案AGENTS.md、最新#257／#254／PR256與批准文件PR的留言、DECISIONS_AND_SOURCES.md的D28、LP14_HANDOFF.md。本prompt不能續期或擴張你原#256補修。

先核兩項前置，全部完成才可LP14製作／runtime：
1. 本O1–O4批准文件／#257一致，已非作者review→Earth唯一queue合dev→postCI成功。
2. PR256的390人物遮擋修正版已由遊戲PO真驗收接受、無阻擋→Earth合dev→postCI成功。c34d413五CI綠但review5625812948尚未接受，不能拿它作完成證據；以#254最新接受head為準。
若任一未完成，不開LP14、不預占名額、不寫畫稿／runtime。若你仍是#256有效作者，先只依原scope／期限補390可視區並交新head重審；有歧義在issue回報。O1–O4已批不再問產品確認，也不能把W4 bug延到LP14。

前置完成後，核最新dev與當前有效作者，使用自己的獨立乾淨worktree、新codex/短分支。在#257新claim寫實際主筆Gemini、精確檔案、base SHA、branch、兩項前置證據、claimed_at為留言GitHub created_at、expires_at=其+4h UTC，再讀留言確認無較早重疊claim。不要沿#256／設計／舊租期或原分支開新包，不reset／force push／stash或操作他人未提交成果。

目標：同一生活入口，玩家清楚看見人物奔波、目前工作、停下原因、下一步與成長，能介入改工／停工。先用現有挑水＋採藥呈現兩人分工，不改預設工作或新增活動。

嚴守O1–O4：
O1 預設簡潔HUD，保留時間／暫停倍率、主要存量和兩人入口；野豬／鼠群／護欄用可展開「院落近況」摘要，不完全隱去當前威脅／損痕，原明細與派遣可達。
O2 人物小卡先顯精力、工作、下一步／停止原因、腳力及原成長回饋；切工／本趟後停工走原指令，沿用人物atlas和資料，不加人格／心情／飢餓等推論或新數值。
O3 原護院／整理／清鼠政策和掌法fixture收在可達進階區，保留auto/manual、候補／抑制／拒絕原因與原效果；增加清楚可見的跟隨／自由觀察／恢復操作，手機不依賴0鍵。展開／收起進階區只是UI，不替角色開自主、清抑制或換掌法；玩家明確操作原允許／傾向／重新允許／fixture控制時，仍走原入口保留原效果。
O4 先同接受場景交一個主案的桌面／390畫面與點選流程，再在同一包有限接線。命令、原選單暫停／背景政策、預設工作、模型／路線／數值與存檔均保留。不要引入引擎、通用框架、大拆或新資源／活動。

順序：LP14-A可編輯畫面／流程與少量完整圖，標清設計未接線與base/head／尺寸；先commit或draft交可看成果。然後同一已批範圍LP14-B接原demo，不另建第二個生活入口／時鐘或等逐張人類必簽；PO有具體阻擋先修，不因未回覆擅擴範圍。LP14-C做真操作／必要驗證與交接，工程通過與畫面接受分開記。

可寫白名單：experiments/water-carry/design/life-observation/**；demo/index.html、style.css、app.mjs中本片呈現／可見跟隨控制／遮擋可視區；必要局部checks/**與實驗README。以LP14_HANDOFF.md為準。model.mjs、routes.mjs、palm.mjs、water-layout.mjs、其他場景素材／幾何、template／atlas／spikes、舊RT／storage、PO文件、Earth／根CI依賴／小說與8800只讀。白名單外必要差異先列最小原因交PO，不先寫後請批。

view()資料與actions()/dispatch()可用性為準，不在UI重造任務／自主AI。小卡與進階正確綁所選人，候補不寫成已做。UI-only展開／收起／選人不額外推tick或下令，正常播放世界仍沿原時鐘；暫停快照可核無世界副作用，保留工作選單原暫停行為。重建表單不能觸發change而改允許／傾向／抑制或預設。完整控制對照表放本片README，所有原功能仍找得到。

鏡頭依實際可見遮擋重新算人物可讀區，不只看HUD；桌面與真390、院落／泉眼、人物卡／近況／進階開關後，主要動作和去向清楚，人物不能躲到卡片後或縮成小點。拖曳退出、可見恢復控制生效，不改角色／世界結果。

驗收按正式包A–D：一人挑水一人採藥的自然流向；小卡工作／精力／下一步／腳力與停止原因；路中改工／停工仍完整原趟後處理，自主休息續工、手動停工維持；進階控制／來源不遺失，UI純操作無命令副作用；真桌面＋390的開關面板／切兩人／跨區／拖曳恢復與暫停。未變模型／成長／掌法／路線證據復用，不重做所有組合。

成本：保留變更JS node --check、受影響既有checks、node --test sect-chronicle/test/*.test.js、python3 -m unittest discover -s tests -v、node --check earth_ascension/static/m2.js、git diff --check及當前合併結果CI。只補有意義UI指令／呈現缺口，不以常數／檔案／截圖存在性當完整驗收，不新建全等級×工作×政策或世界seed長矩陣／runner。一次桌面＋390真操作、少量圖；log落檔只讀摘要／失敗，真exit／GPU限制照實。不能為綠燈改規則／弱化驗收。

時間從你本人新claim開工T0算，最多120min，100min後不再加範圍，達標早停。只循環本包A→B→C、自校→交PR／非作者review→在剩餘時間補具體意見→Earth唯一queue／postCI，不自合dev、不把自校當獨立review。不需要等滿兩小時：已完整交review而無可做項就停止；外部審查可稍後接續。到120min仍待審或未完，回填head／已跑證據／未完與阻擋，交review或draft後停新工作；4h租期不延長執行窗，後續審查補修依CONTRIBUTING，不能自啟另一輪2h。

PR指向dev，沿根模板寫Gemini真身份、base/head、新claim、檔案、A–D真證據／短流程與URL／少量圖、測試摘要／限制、原控制對照與Refs #257／#184。issue回review／blocked，不代關其他作者PR或刪分支。由遊戲PO非作者驗收→Earth唯一queue合dev→postCI後，遊戲PO才更新8800並保留LP13接受版。交付即停，不自接採藥擴圖／砍柴／需求AI或啟其他agent／聊天／排程。
```
