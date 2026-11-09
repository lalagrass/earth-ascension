<!-- 暫存快照：原文照錄，未改寫 -->
> 來源：https://claude.ai/artifact/4edkMktfF2pQWAMvmCeSaR  
> 原始日期：2026-11-05　快照時間：2026-11-09
> 匯出時內嵌圖表／元件無法轉成 Markdown，以「[embedded content: …]」佔位；完整呈現請看來源連結。

# 山門紀設計總審與後續 milestone

Nov 5, 2026 · @Yuying Chen

## 結論

戰鬥規則這半個月進步很多，但從 11 月 3 日到現在，連續五輪（N9–N31）都在做武學與戰鬥。門派生活、人際、擴建這三根支柱一直沒有動。另外，成長已經有六套互相疊加的系統，白身草案會再加第七套。

建議的順序：

1. **第七輪照現在的 #435 做**，它是後面所有東西的地基。
2. **第八、九輪做白身與羅漢拳**，沿用 #441 已經開好的 issue。差別是手熟、眼熟要成為**所有人、所有武學**共用的成長底層，而不只是白身開局的選項。這樣可以把六套成長收成一套。
3. **第十輪回到門派生活**：威脅的節奏、結伴與喊人、討伐上地圖、巡山的敵人搬上地圖。
4. **第十一輪做人際與擴建**，接回 P3、P5。

## 審視發現

九個問題，對照[北極星五個支柱](https://github.com/lalagrass/earth-ascension/blob/codex/solo-sect-grok/sect-chronicle/docs/vision/NORTH_STAR.md)與 `ad4e650` 的程式。依影響大小排序。

| # | 問題 | 證據 | 支柱 |
| --- | --- | --- | --- |
| 1 | 連續五輪只做戰鬥，生活、人際、擴建停住 | N9–N31 共 23 個 milestone 全是武學或戰鬥；ROADMAP 寫「玩法版本仍是 v3.3 的生活模擬（loop 210）」 | P1、P3、P5 |
| 2 | 一直沒有人試玩（擁有人 11/5 決定以開發為主，不設關卡） | #401 的 N5「擁有人試玩」從 11/3 起標記「等試玩」；後面六輪都只靠 bot12 的數字判斷好不好玩 | 全部 |
| 3 | 成長有六套疊在一起 | 技能分數、武學五階、內功十重、歸真星數、名功曲線與分路、三層成長；白身草案的手熟、眼熟會是第七套 | P2、P4 |
| 4 | 「同圖武學」只做到一半 | 地圖上只有鼠、野豬、山賊三種敵人；巡山的 21 種敵人（狼、熊、蟒、白猿……）、會武、江湖挑戰、圍山都還是算期望值 | P2、P4 |
| 5 | 守山沒有「緊張—喘息」的節奏 | 第六輪後日常山賊 64 戰全勝；威脅只看點數，沒有來犯的週期設計 | P4 |
| 6 | 第一個對手不合理 | 開局練拳打老鼠；白身草案已指出老鼠應該是環境問題，野狗才是合理的第一個對手 | P4 |
| 7 | 寫死的機率夾值與沒來由的常數 | 9 處機率上下限、公式裡的裸數字、約 195 張沒寫意思的調校表（已開 #440） | 全部 |
| 8 | 程式名稱看不懂 | 226 個名稱帶著輪次編號（`temper29`、`styleDmg24`、`v28n`）；`arts.mjs` 1393 行。「動到哪整理哪」的規矩沒有真的執行 | 維護 |
| 9 | 金庸名稱的版權 | DESIGN.md 寫「公開發行前一定要先解決」；自己玩不急，只記一筆 | 發行 |

第 3 項最值得趁現在處理。第七輪的「比時間」已經讓武學的強弱可以用前搖與反應秒數說清楚。白身的手熟、眼熟又正好是「前搖」與「反應」怎麼變短。所以武學火候可以改成「這門功夫把前搖下限拉低多少」，手熟就是沿著這個下限往下走。六套成長可以慢慢收進這個底層，而不是再開第七套。

## 別人怎麼做

每個問題都有現成的做法可以借。白身草案已經查過的來源（Kenshi、Absolver、浪漫沙加、Dwarf Fortress、魔多之影……）不重複列，見 [#441](https://github.com/lalagrass/earth-ascension/issues/441)。

| 問題 | 來源 | 借什麼 |
| --- | --- | --- |
| 1 只做戰鬥 | [北極星](https://github.com/lalagrass/earth-ascension/blob/codex/solo-sect-grok/sect-chronicle/docs/vision/NORTH_STAR.md)自己的規矩 | 每個包開頭標明推進哪個支柱；連續兩輪同一支柱，第三輪就換 |
| 2 沒人試玩 | 本專案過去的 RT-05 試玩紀錄 | 不採用。擁有人 11/5 決定不設試玩關卡，繼續靠 bot12 與 review；想玩時隨時可以玩，感受可以寫進 `docs/reports/playtest/` |
| 3 成長六套 | [Cataclysm DDA 的武學資料格式](https://docs.cataclysmdda.org/MARTIALART_JSON.html)（開源） | 每門武學只是「一組招＋每招的解鎖技能門檻與觸發條件」，底層技能只有一套。它的 `dodge_counter`、`block_counter` 就是「閃開或擋住後自動反擊」的招，正好對應進身閃與悟招 |
| 4 同圖只做一半 | 世紀帝國、魔獸爭霸三（第四輪已引）；RimWorld 的遠征地圖 | 近的路段直接在主地圖打；遠的路段開一張同規則的小地圖，而不是抽象算分 |
| 5 沒有節奏 | [RimWorld 的 Cassandra 說書人](https://rimworldwiki.com/wiki/Cassandra) | 大威脅按「一段來犯期、一段喘息期」輪替，兩次大威脅之間至少隔一段時間，強度隨時間慢慢上升。本作按週或季換算 |
| 6 第一個對手 | 白身草案的 FAO、Wikivoyage、Mount & Blade 來源 | 野狗做第一個對手，老鼠改成有條件的鼠患 |
| 7 魔術數字 | LPMud 的比例公式、[Mythras](https://mythras.pages.dev/Rules/7---Combat) 沒有必中必失 | 已排進 #440 |
| 8 名稱看不懂 | [Martin Fowler 《重構》](https://refactoring.com/catalog/renameVariable.html)的「經過就整理」 | 每輪只改本輪碰到的名稱；在 PR 列一張「舊名→新名」表 |
| 9 版權 | — | 發行前再處理，現在不排 |

## 後續路線

五輪。每輪仍是「一個 PR、一次 review」。

&#91;embedded content: 第七到第十一輪 · 五個 PR\]

## 每一輪的 milestone

所有 issue 已經開好（2026-11-05，擁有人說「規劃的部分先做完」）。下面四件事照建議定案，你 review 時仍可以改。

| 輪 | 索引 | Milestone |
| --- | --- | --- |
| 7 | [#435](https://github.com/lalagrass/earth-ascension/issues/435) | N27 比時間 #436、N28 群戰 #437、N29 心性 #438、N30 數值修正 #439、N31 魔術數字 #440 |
| 8 | [#441](https://github.com/lalagrass/earth-ascension/issues/441) | N32 白身開局 #442、N33 手熟與眼熟（所有人共用）#443、N34 選招 #444、N35 悟招 #445、N36 找幫手 #446、N37 拳拳到肉 #448、N38 白身等級 #449 |
| 9 | [#441](https://github.com/lalagrass/earth-ascension/issues/441) | N40 羅漢十八手 #450、N41 一生專練 #451、N42 成長收斂 #452 |
| 10 | [#454](https://github.com/lalagrass/earth-ascension/issues/454) | N43 來犯節奏 #455、N44 結伴與合擊 #456、N45 討伐與巡山上地圖 #457 |
| 11 | [#458](https://github.com/lalagrass/earth-ascension/issues/458) | N39 鼠患 #459、N46 師兄弟人際 #460、N47 一處處擴建 #461、N48 練功套路動畫 #462 |

每一輪都加一條規矩：改到的程式，把帶輪次編號的名稱改成看得懂的名稱，並在 PR 列一張「舊名→新名」表。不另開重構輪。

## 要你決定的事

四件事已照建議定案（11/5），寫進各 issue；你 review 時仍可以改。

1. **手熟、眼熟的範圍**。建議套用到所有人、所有武學；白身開局仍是主角的一個開局選項。理由是這樣才能把六套成長收成一套。代價是舊開局的平衡會動，第九輪要重校一次。
2. **#441 的七個預設**。建議全部接受，只改第 2 條：結伴、合擊、陣法、討伐上地圖放第十輪，練功套路動畫放第十一輪。
3. **鼠患移到第十一輪**。建議移，因為它是粮倉與生活的事，不是戰鬥。
4. **金庸名稱的版權**。建議現在不排，等你想發行時再處理。

## 來源

- [RimWorld 的 Cassandra 說書人](https://rimworldwiki.com/wiki/Cassandra)：來犯期與喘息期輪替，強度隨時間上升
- [Cataclysm DDA 武學資料格式](https://docs.cataclysmdda.org/MARTIALART_JSON.html)：招的解鎖門檻、閃開與擋住後的反擊招
- [Mythras 戰鬥規則](https://mythras.pages.dev/Rules/7---Combat)：沒有必中必失、差距換效果
- [ARMA《Striking and Counterstriking》](https://thearma.org/essays/striking-and-counterstriking.html)：同一個節拍裡攻守一體
- [Martin Fowler《重構》的改名](https://refactoring.com/catalog/renameVariable.html)
- [白身演化武學草案](https://claude.ai/artifact/HWsYq2q3tKT5QLNjThVv4N) 與 [#441](https://github.com/lalagrass/earth-ascension/issues/441)：草案自己的參考總表
- [北極星五個支柱](https://github.com/lalagrass/earth-ascension/blob/codex/solo-sect-grok/sect-chronicle/docs/vision/NORTH_STAR.md)
