# M1 研究、資料與授權紀錄

查閱日：2026-10-17。M1 沒有下載、複製或嵌入下列第三方程式碼、問卷題目、遊戲素材或統計資料。城市人口、職業比例與價格均為虛構參數，尚未校準真實地區與年份。

| 來源 | 可借鑑機制與 M1 決策 | 授權與限制 |
|---|---|---|
| [Mesa](https://github.com/mesa/mesa) | Agent based model、排程與資料收集；M1 以 100 人小規模月度流程自行實作，避免增加依賴 | Repository 標示 Apache-2.0；未複製程式碼。 |
| [Generative Agents 論文](https://arxiv.org/abs/2304.03442) 與 [原型](https://github.com/joonspk-research/generative_agents) | 記憶、反思與規劃的分層概念；M1 僅存重要記憶與可檢視的規則決策 | 原型 repository 標示 Apache-2.0；其執行依賴 API key 與較重環境，不納入 M1。 |
| [IPIP 官方](https://ipip.ori.org/) | Big Five 作為「開放、盡責、外向、親和、穩定」的啟發 | 官方說明題目及量表屬 public domain；本專案的 16 題為原創情境題，並非經驗證心理測驗。 |
| Schwartz Basic Human Values | 價值觀與人格分開的建模方向；M1 僅有探索、安全、關懷三個遊戲偏好 | 未使用原量表或題目；量表再利用權利尚未審核。 |
| [Our World in Data 使用說明](https://ourworldindata.org/faqs) | 未來人口、教育、職業背景校準入口 | 自製資料通常 CC BY；第三方資料依原提供者授權。OWID Grapher 程式碼不能直接自由再利用。M1 未匯入資料。 |
| [World Bank Open Data 使用條款](https://data.worldbank.org/summary-terms-of-use) | 未來總體人口與經濟校準入口 | 開放資料通常 CC BY 4.0，仍須確認每個資料集附加條款、年份與地理適用性。M1 未匯入資料。 |

待後續核實：Mesa-LLM 的具體版本與授權；Dwarf Fortress、RimWorld、Wildermyth、Crusader Kings III、Cultivation World Simulator、WorldSim 的機制可作產品研究，但其程式、文字與美術素材未取得再利用授權，M1 完全不納入。這些作品的長期演化、角色記錄與組織競爭值得日後比較；M1 不建立大型戰爭、跨世代或 3D 地圖。

## 規則與假設

靈氣在五區有 0–1 濃度，逐月自然生成及波動；人物研究受悟性、感知與濃度影響，研究花費資源。世界知識達門檻後才允許不成熟的修習，且有健康代價。這是可驗證的虛構遊戲規則，並非真實物理或醫學主張。地區間流動、擴散與知識傳播仍未建模。
