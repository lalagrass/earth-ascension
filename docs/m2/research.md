# M2 研究證據、推論與授權

查核日：2026-10-17。此表只借鑑機制；M2 不複製第三方程式、文字、素材或量表。研究對象的測試結果與本遊戲的 100 NPC×60 月並不等價。M1 已有的[研究與授權紀錄](../research.md)仍適用。

## 來源與設計取捨

| 原始來源及可核實證據 | 對 M2 的推論／設計選擇 | 授權與邊界 |
|---|---|---|
| [Mesa 3.5.1 官方 Agent Activation](https://mesa.readthedocs.io/v3.5.1/tutorials/2_agent_activation.html) 說明固定、隨機及同時兩階段 activation，並指出順序會影響結果。[Mesa 原始庫](https://github.com/mesa/mesa)標示 Apache-2.0。 | 共同快照能消除先後看到不同資訊的偏差；資源競爭仍需明確決勝。沿用現有小型引擎，自己實作 intent／resolve，暫不引入 Mesa 依賴。 | 借鑑架構，不複製程式。若未來引入 Mesa，需附其授權與 NOTICE。 |
| [Rao & Georgeff, *BDI Agents: From Theory to Practice*（ICMAS 1995）](https://cdn.aaai.org/ICMAS/1995/ICMAS95-042.pdf) 將 belief、desire、intention 對應資訊、動機與審議狀態，並討論實用化的簡化。 | M2 用「可知資訊／候選目標／承諾的目標及短計畫」作最小映射。將持續意圖與目標完成、不可行、重大事件或定期檢查後重規劃視為產品設計；比較 utility+commitment 與少數有限 plan template。 | 論文可閱讀引用，不授權複製其文字或程式；不導入形式邏輯框架。 |
| [Park 等，*Generative Agents* 原論文](https://arxiv.org/html/2304.03442v2) 展示記憶檢索、反思、規劃消融對受試評價有貢獻；25 人互動實驗僅兩個遊戲日；作者也指出記憶檢索失敗與虛構細節。[研究原型](https://github.com/joonspk-research/generative_agents)標示 Apache-2.0，運行需 API key。 | 只借事件→可檢索記憶→有限重規劃的觀念；反思若有，也只能是附 event IDs 的可修正詮釋，不能成為事實。該論文**不是** 60 月人格變化的有效性證據；M2 須自行消融驗收。 | 原型程式 Apache-2.0，但研究環境及資產可能另有權利；M2 不下載或複製任何部分，也不要求 API。 |
| [Dugan 等，*Life events sometimes alter the trajectory of personality development*](https://onlinelibrary.wiley.com/doi/full/10.1111/jopy.12837)，4904 人、47,814 次評估，研究發現多數單次事件估計效應小，重複經歷可能累積，也有少數較大轉折。 | 不用單次事件改寫整個人格；優先改關係信任及領域知識，再以有界、可追溯的多月規則更新人格／價值。每月幅度是遊戲假說，**不是**由該研究校準的心理公式。 | 僅引用論文結論，不使用量表內容、個體資料或文字素材。 |
| [RimWorld 官方介紹](https://rimworldgame.com/) 明示角色背景、需求、情緒與人際意見影響行為，AI storyteller 會控制投入世界的隨機事件。 | 借「狀態與關係使人物可讀」的產品經驗；不採為故事張力投放事件的 director，遵守 simulation first。 | 商業遊戲；無本專案可用的程式、文字、素材授權，僅引用公開機制描述。 |
| [Wildermyth 官方介紹](https://wildermyth.com/guide/) 描述角色歷史、人格、關係及玩家選擇帶來後果，是角色驅動的程序生成敘事。 | 借「轉折可由歷程追溯」的呈現方式；本產品由規則結果再生成歷程，不預設英雄或保證特殊事件。 | 商業遊戲；無程式／素材再利用授權，僅作設計比較。 |

## 三種策略的必要性與成本

| 策略 | 預期收益與驗證 | 代價／本輪決策 |
|---|---|---|
| M1 效用規則 | 零外部呼叫、易重播，能做 100 人月度循環；[M1 實驗](../../artifacts/experiments.md)已見偏好改變行動占比。 | 無持續計畫；字串記憶與即時結算難證明經歷因果。作固定對照，不當作 M2 完成。 |
| M2 輕量規則（建議正式基線） | 有限目標、事件記憶、定向關係、慢速人格、同步意圖及決策 trace，可用消融驗證增益。 | 增加資料／遷移與測試成本；以少量模板控制複雜度。先測 utility+commitment，再看 plan template 是否帶來增益。 |
| 少量 LLM（僅可選影子研究） | 或可改善少數難決策的候選策略／說明；必須以盲評與規則基線比較。 | 按 100 人×60 月估：每月全呼叫 6000 次；每季 2000 次；若僅 10% 事件觸發約 600 次。以每次 2000 input、300 output token 的**假設**估 10% 案例為 1.2M input + 0.18M output token，重試另計；不引用未核實價格。輸出可不穩定、可能編造資訊，模型 seed 不保證回放。M2 無付費呼叫，影子輸出不提交世界；若將來使用，需持久化通過驗證的 action ID／來源與版本才能重播。 |

研究不能替代[本專案驗收](acceptance.md)。結論是採輕量、可消融的模型；沒有可直接證明本專案人格「真實」的外部證據。
