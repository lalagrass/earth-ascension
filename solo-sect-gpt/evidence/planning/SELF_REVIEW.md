# 規劃作者自校

2026-10-25（Asia/Taipei）；實際主筆 GPT／Codex。分支 `codex/solo-sect-gpt`；base dev `148cfbbb27e43475c66744d53c2451125a9111a0`，接手 `563623278263e1355bf6d0125f28a1cef324c0f8`。這是規劃自校，不是獨立審查、runtime驗收或真人平衡回饋。

## 已核對

- [PRODUCT_PLAN](../../docs/PRODUCT_PLAN.md)、[SCENE_ATLAS](../../docs/SCENE_ATLAS.md)、[MILESTONES](../../docs/MILESTONES.md)、[DECISIONS](../../docs/DECISIONS.md)涵蓋BRIEF的生活／建設／識人／招募／家庭／自主主角／武學深廣／演武／真遠征／分歧／保存／結尾，列了有限內容數量、延後和可見出口。
- 固定三來源SHA存在且以git show／本checkout唯讀檢查；沒有切換／清理原checkout、整包合併來源、聯絡其他agent或發Github留言。Grok193測試／7UI僅引用作者紀錄；Gemini模型驗證與實際canvas接線沒有混稱。
- 已檢視SCENE04三張clean圖片，核plan.json建築／門／站位／水系／出圖口；[原幾何稽核](scene04-audit.txt)以視覺box重疊提醒，不誤認為實際碰撞bug。
- [設計靜態稽核](layout-check.txt)：新圖10地塊footprint互不相疊、路線中心線取樣未進solid interior、SVG XML可解析、本地MD連結存在、家園／遠征接縫一致。工具是離線設計檢查，不是尋路器。
- 初稿餐敘與外功地塊重疊，已移外功區；撤退線改走餐敘西側；調整遠征長標籤避免裁切；步行數值以最終JSON重算。沒有用修改門檻掩蓋測試失敗。
- 三階段都由同一幾何輸出，站位圖標表示成熟預留，早期功能依建設啟用。補寫小女孩、住床遷移、未知保存版本與自然獸／演武分離邊界。
- 外部7項研究頁面及3個repo license直接查核，來源／異議／年代與失敗取用記於DECISIONS。無外部程式或素材複製，沒有聲稱開源等於角色IP已授權。

## 畫面操作

以Codex內建瀏覽器開僅127.0.0.1:8876的設計頁。實際點S0、S1、S2與疊圖、關閉路線／站位、開啟放大橫捲；畫面顯示相應caption與地塊狀態。檢視遠征SVG，林緣、營地、側路、窄橋、洞口標籤未裁切。窄預覽窗字較小，已提供放大橫捲與獨立SVG。

- [S2配置畫面](viewer-S2.png)
- [S0與成熟外框疊圖](viewer-S0-overlay.png)
- [S1關閉路線／站位](viewer-S1-layers.png)
- [遠征圖預覽](expedition-preview.png)

這些是設計檢視器證據，不是遊戲玩家流程。沒有為本輪開發runtime或用debug把人物推到結尾。

## 基本檢查與適用性

| 檢查 | 實際結果 |
|---|---|
| `python3 -m unittest discover -s tests -v` | Python3.14.8，53測試PASS，11.946s；[完整輸出](root-unittest.log) |
| `node --check earth_ascension/static/m2.js` | Node24.13.0，exit0；[輸出](m2-syntax.log)為空即無語法診斷 |
| `git diff --check` | 提交前檢查，結果另記[檢查摘要](checks-summary.txt) |
| `/usr/bin/python3 solo-sect-gpt/maps/design/check_layout.py` | [輸出](layout-check.txt)；Homebrew Python的expat動態庫失敗，改用系統Python解析，不修使用者環境 |
| HTML內嵌JS `node --check` | 僅設計切圖／圖層控制，結果記[檢查摘要](checks-summary.txt) |
| SG快驗／完整RT／固定seed遊戲矩陣 | 未跑：本次沒有修改遊戲程式、規則、RNG或保存；文件不另跑世界seed。根基本檢查依契約保留 |
| Grok/Gemini測試、真人試玩 | 未跑；不重新背書其全部FEATURES，也不宣稱本版好玩／平衡通過 |

未驗：人物半徑掃掠、門／屋內床側實際路徑、排隊死鎖、多人戰鬥、視線遮擋、時間與數值平衡、所有新素材錨點與效能。已明列後續spec與開發驗收，不是假裝規劃必須等待外部批准。

預覽驗證結束已關閉本次分頁與8876臨時伺服器；未碰8800。

本次沒有真正阻塞決策。規劃成果先獨立commit，ready標記以第二commit引用該成果；交接後不自行啟動spec或繼續占寫入權。
