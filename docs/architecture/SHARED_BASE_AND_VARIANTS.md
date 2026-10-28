# 公版與三個獨立遊戲版本：架構盤點與調整建議（ADR 草案）

狀態：**提案**，等擁有人與 PO 評估。索引 [#380](https://github.com/lalagrass/earth-ascension/issues/380)。本文只寫盤點、比較與建議遷移順序；不改任何程式、CI、分支或其他作者的工作，也不要求 #372–#374、#378 改 scope。

盤點時間 2026-10-28（UTC）。所有數字以下列遠端 SHA 量測，可用第 6 節指令重算。

| 版本 | 分支 | 量測 head | 與 dev 的 merge-base | 領先 dev／落後 dev |
|---|---|---|---|---|
| 公版（dev） | `dev` | `e1b6a7b` | — | — |
| GPT | `codex/solo-sect-gpt` | `c42ad7f` | `148cfbb` | 175 ／ 17 |
| Grok | `codex/solo-sect-grok` | `6760f21` | `fb84766` | 90 ／ 18 |
| Gemini | `plan/sect-life-architecture-redesign` | `0864388` | `148cfbb` | 28 ／ 17 |

## 1. 現況：實際上是怎麼共用的

dev 想做「公版」給三版用，目前已有 `public-kit@1.0.0`（#375）、`scene-shared/`、`character-card/`、各種 `*-view/` 與 `assets/shared/`。實際的程式碼流向是：

```text
            （手動複製固定 SHA 的原始碼）
  GPT 分支 ──────────────────────────────┐
  Grok 分支 ─────────────────────────────┤──► dev: scene-shared/sources/{gpt,grok,gemini}/  (1.3 MB 凍結 core)
  Gemini 分支 ───────────────────────────┘    dev: scene-shared/adapters/{gpt,grok,gemini}.mjs
                                              dev: character-card/{gpt,grok,gemini}.mjs
                                                      │
                                                      ▼
                                              public-kit / *-view / assets/shared
                                                      │
            （手動複製固定 SHA 的公版檔）              │
  GPT 分支 ◄── solo-sect-gpt/vendor/public/{6f959f5,ef823ac,00f4dbe}/...
  Grok、Gemini：尚未取用（#373、#374 未開工）
```

具體觀察：

1. **依賴方向反了。** 共用套件裡放著三個消費者的 adapter（`scene-shared/adapters/gpt.mjs` 直接 `import` `../sources/gpt/solo-sect-gpt/src/world.mjs`），還放了三份凍結的原生 core。結果是：任何一版改了自己的 core，公版就要另開 PR 重新匯出快照、改 adapter，才算「支援」。dev 驗證 GPT 用的 core `6cbd3e6` 已落後 GPT 分支 102 個 commit。
2. **取用方式是手工複製多個版本並混用。** GPT 的 `ui.mjs` 同時 import `vendor/public/6f959f5/…`、`ef823ac/…`、`00f4dbe/…` 三個公版快照，另有一份與 dev 不同步的 `assets/shared/resolve.mjs`（差 20 行）。沒有鎖檔說明「這一版用的是 public-kit 哪個版本」，`public-kit` 的 receipt 機制目前只在 dev 中央 harness 使用。
3. **Gemini 與 dev 正式版改同一批檔。** Gemini 直接在 `sect-chronicle/experiments/water-carry/demo/` 上開發（`model.mjs` +1889 行、`style.css` +2362 行），而那正是 dev 的正式遊戲入口。`git merge-tree` 顯示 Gemini 與 dev 在 `app.mjs`、`index.html`、`model.mjs`、`routes.mjs`、`style.css` 五檔衝突；GPT（`solo-sect-gpt/`）與 Grok（`solo-sect/`）各在自己目錄，與 dev 可乾淨合併。
4. **dev 同時是「共用套件」和「第四個遊戲」。** 正式入口 `sect-chronicle/index.html` 跑的是 Gemini 衍生的挑水生活版，公版元件也放在同一個 `sect-chronicle/` 底下，兩者的版本、review 權責與 CI 混在一起。
5. **證據檔讓 repo 變得很重。** clone 後 `.git` 約 2.0 GB（pack 1.95 GB）。GPT 分支工作樹 1.9 GB，其中 `solo-sect-gpt/evidence/` 有 2854 個檔、約 1.69 GB；dev 工作樹 225 MB，其中 `experiments/` 下截圖與證據約 128 MB。每個新的 Cloud session、每位 AI 作者都要先付這個成本。
6. **長期分支沒有回到主幹的路。** 三版都沒有指向 dev 的 PR（#377 是 review-only，base 為 `codex/372-gpt-review-base`）。共享 workflow 只跑 `sect-chronicle/test/*.test.js` 與 Earth 測試，`solo-sect-gpt/test/`、`solo-sect/test/` 不在其中。公版改壞某一版，要等該版下次手動同步才發現。

結論：現在的「公版」比較像**由 dev 去追三個版本並各寫一份對接**，而不是**三個版本各自依賴一個穩定的公版**。這會讓 dev 的工作量隨三版的進度線性成長，也是「dev 進展慢」的原因之一。

## 2. 開源專案常見做法

| 做法 | 例子 | 對我們的意義 |
|---|---|---|
| 引擎／核心與遊戲分離，核心不認識任何特定遊戲 | Luanti（Minetest）引擎＋多個 game；Godot／Bevy 的 plugin；0 A.D. 的 engine＋mod | 公版只定義資料契約與 renderer，不 import 任何一版的 core |
| 官方內容也走同一套介面（dogfooding） | Factorio 的 `base` 本身就是一個 mod；RimWorld `Core` 用與 mod 相同的 Defs | dev 的挑水生活版應是公版的「第一個消費者」，和三版地位相同 |
| Ports and adapters（hexagonal） | Alistair Cockburn 的 hexagonal architecture | 公版定義 port（契約），adapter 放在各版自己的 repo 目錄，由該版作者維護 |
| Monorepo＋workspace 套件，單一主幹 | npm／pnpm workspaces、Turborepo、Nx、Babel、React 的 `packages/` | 共用碼放 `packages/`，各遊戲放各自目錄；同一 commit 可同時看到套件和所有消費者 |
| 主幹開發，避免長期分支 | trunk-based development | 長期分支越久越難合；改成各自目錄＋短 PR，可以保留「各寫各的」又不用交接 |
| 消費者驅動的契約測試 | Pact 的 consumer-driven contracts | 各版提交「我會送出的 public payload」樣本，公版 CI 對所有樣本跑，改壞立刻知道 |
| 版本化取用＋鎖檔 | SemVer、Changesets、Go `vendor/` + `go.mod`、`package-lock.json` | 每版只鎖一個 `public-kit` 版本，升級是該版自己的小 PR |
| 大型二進位不進主樹 | GitHub 建議 repo 小於 1 GB、強烈建議小於 5 GB；Git LFS；CI artifacts／Releases | 截圖與錄影改放 CI artifact 或 Release，repo 只留摘要 JSON 與少量縮圖 |

參考：
- Factorio base mod／mod API：https://wiki.factorio.com/Tutorial:Modding_tutorial
- Hexagonal architecture：https://alistair.cockburn.us/hexagonal-architecture/
- npm workspaces：https://docs.npmjs.com/cli/using-npm/workspaces
- Trunk-based development：https://trunkbaseddevelopment.com/
- Pact consumer-driven contracts：https://docs.pact.io/
- GitHub repository limits：https://docs.github.com/en/repositories/creating-and-managing-repositories/repository-limits
- Git LFS：https://git-lfs.com/
- Changesets：https://changesets.dev/ （#375 已引用）

只採用概念；本提案不安裝 npm 套件管理、不引入建置工具。現有 ESM＋相對路徑的做法可以直接沿用。

## 3. 建議的目標結構

```text
dev（唯一主幹）
├── packages/
│   └── public-kit/            # 現在的 public-kit、*-view、scene-shared 的 renderer/contract、assets/shared 解析器
│       ├── contracts/         # 資料契約（v1）＋ JSON 樣本驗證器
│       └── releases/          # 1.0.0.json …（沿用 #375 的 manifest 與 receipt）
├── contracts/consumers/       # 各版提交的 public payload 樣本（小 JSON），公版 CI 對全部跑
│   ├── dev-life/  gpt/  grok/  gemini/
├── sect-chronicle/            # dev 公版參考遊戲（挑水生活版），是 public-kit 的消費者之一
│   └── adapters/public-kit.mjs
└── （選項 B 才有）games/gpt/  games/grok/  games/gemini/

各遊戲（不論在分支或在 games/ 目錄）
├── adapters/public-kit.mjs    # 自己的 core → public payload，由該版作者維護
├── vendor/public-kit@1.0.0/   # 由工具複製「一個」版本，不手改
└── public-kit.lock.json       # 版本、source SHA、manifest hash（沿用 #375 receipt 欄位）
```

依賴只有一個方向：**遊戲 → adapter → public-kit 契約**。public-kit 不 import 任何遊戲；dev 不再保存任何一版的凍結 core。

## 4. 提案拆分（每項一張 issue）

| # | 提案 | 需要誰決定 | 會改什麼 | 不改什麼 |
|---|---|---|---|---|
| P1（[#382](https://github.com/lalagrass/earth-ascension/issues/382)） | 依賴方向：adapter 與凍結 core 移回各版，dev 只留契約＋自己的 adapter | PO 排程 | 新的 adapter 由各版維護；dev 的 `scene-shared/sources/` 與三份 adapter 在三版各自取用後退場（保留歷史 SHA 可查） | 公版 v1 契約語義、renderer、正式入口玩法 |
| P2（[#383](https://github.com/lalagrass/earth-ascension/issues/383)） | 單一取用機制：`public-kit.lock.json`＋`vendor` 同步工具，每版只鎖一個版本 | PO 排程 | 新增一支 `tools/vendor.mjs`（讀 `releases/*.json`、照 hash 複製、寫鎖檔）；GPT 現有三個 SHA 的混用在下一次自己升級時收斂 | 不強迫任何一版立即升級；#372–#374 照原 `00f4dbe` 收尾 |
| P3（[#384](https://github.com/lalagrass/earth-ascension/issues/384)） | 消費者契約測試：各版提交 payload 樣本，dev CI 對全部驗 | Earth（共用 CI 主筆） | `contracts/consumers/*/` 小 JSON＋一個 node test；公版改動若讓任一版樣本失效就紅 | 不把三版完整測試搬進 dev CI |
| P4（[#381](https://github.com/lalagrass/earth-ascension/issues/381)） | 證據與大檔不進主樹 | 擁有人（政策）＋Earth | 新證據的截圖／錄影改放 CI artifact 或 Release；repo 只留摘要與少量縮圖；CI 加檔案大小預算檢查 | 不重寫既有歷史、不刪他人分支 |
| P5（[#385](https://github.com/lalagrass/earth-ascension/issues/385)） | 分支模型：長期獨立分支 vs 主幹上各自目錄；以及 Gemini 與 dev 正式版的同檔衝突 | **擁有人** | 見下節選項 | 不合併三版玩法、不換 dev 的引擎 |

建議順序：P4（止血，越晚越重）→ P1＋P2（同一批，先讓 dev 的正式版自己當第一個消費者示範）→ P3 → P5（看前四項效果再決定）。P1–P3 都可以在不碰三版分支的前提下，先在 dev 完成「dev 正式版作為消費者」的示範。

## 5. P5 的選項（擁有人決定）

| 選項 | 做法 | 好處 | 代價 |
|---|---|---|---|
| A. 維持獨立分支，只改取用方式 | 三版照現在各自在分支開發，靠 P1–P3 的鎖檔與契約樣本對接 | 交接成本最低，不打斷三位作者 | 三版測試仍不在共享 CI；分支持續變大、和 dev 漸行漸遠 |
| **B. 主幹上各自目錄（推薦，分階段）** | 每版一個目錄（GPT、Grok 已是 `solo-sect-gpt/`、`solo-sect/`），作者在自己目錄開短 PR 回 dev；以目錄劃分所有權，review 只看該目錄＋契約樣本 | 同一 commit 看得到公版與所有消費者；公版改壞誰立刻在 CI 看到；不再需要凍結快照 | 需要先做 P4（否則 GPT 1.7 GB 證據會進 dev）；需訂各目錄的 review／合併權責 |
| C. 公版拆獨立 repo，三版各自 repo | public-kit 用 tag／release 發布 | 邊界最清楚 | 權限、clone、跨 repo 協調成本最高；現階段太重 |

Gemini 的特殊情況：它直接改 dev 正式入口的同一批檔。不論選 A 或 B，都建議二擇一：(1) Gemini 把自己的版本搬到獨立目錄（如 `sect-chronicle/life/` 已有一部分），正式入口留給 dev；或 (2) 明確定義 dev 正式版就是 Gemini 線，由同一條線維護，不再雙頭改。目前兩邊同時改，五個檔已衝突。

## 6. 重算本文數字

```sh
git fetch origin dev codex/solo-sect-gpt codex/solo-sect-grok plan/sect-life-architecture-redesign
for b in codex/solo-sect-gpt codex/solo-sect-grok plan/sect-life-architecture-redesign; do
  mb=$(git merge-base origin/$b origin/dev)
  echo "$b ahead $(git rev-list --count $mb..origin/$b) behind $(git rev-list --count $mb..origin/dev)"
  git merge-tree --write-tree --name-only origin/dev origin/$b | sed -n '2,10p'
done
git ls-tree -r -l origin/codex/solo-sect-gpt solo-sect-gpt/evidence | awk '{s+=$4} END {print s/1e6 " MB"}'
git rev-list --count 6cbd3e6fccb8bc376e95e2f406ce6cead2a30fdc..origin/codex/solo-sect-gpt
git count-objects -vH
```

## 7. 與既有文件的關係

- [PORTFOLIO_BOUNDARIES](PORTFOLIO_BOUNDARIES.md)：Earth／遊戲／小說的產品邊界不變；本文只處理遊戲內「公版與三版」的共用方式。
- [sect-chronicle/docs/ARCHITECTURE.md](../../sect-chronicle/docs/ARCHITECTURE.md)：單一遊戲內部分層不變。
- `sect-chronicle/public-kit/README.md`（#375）：版本、receipt、相容規則全部沿用；本文的鎖檔只是把 receipt 放到消費端。
- #339（共用素材庫）：素材的版本化取用與 P2 同一機制，可共用鎖檔格式。
- #378（dev 公版有限開發）：本提案不改其 A／B／C 範圍；若採納，建議在 #378 完成後再排 P1。
