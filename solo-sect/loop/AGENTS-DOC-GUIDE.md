# solo-sect AI 代理人文件與落檔協議（Agent Documentation Guide）

> **適用對象**：參與 `solo-sect` 自主循環開發的 Grok Bot、Gemini、Claude 與其他 AI 代理人。

---

## 核心規則：禁止在專案根目錄新增未經授權的 `.md` 檔案

為了維護乾淨、專業的開源結構，所有 AI 代理人在完成功能實作、測試跑測或架構反思時，必須遵守以下落檔路徑：

### 1. 跑測與平衡報告（Balance & Benchmark Reports）
* **落檔路徑**：`solo-sect/docs/reports/balance/BALANCE-v<version>.md`
* **範例**：`docs/reports/balance/BALANCE-v211.md`
* **嚴禁**：直接在 `solo-sect/` 根目錄建立 `BALANCE-*.md`。

### 2. 架構與數值決策（Decisions & Rules）
* **落檔路徑**：`solo-sect/docs/decisions/DECISIONS.md`
* **操作方式**：
  * 在檔案末尾追加，格式為：
    ```markdown
    <編號>. **<主題>**：<決定與數值>。〔loop<號碼>｜理由／反例〕
    ```
  * 保持編號嚴格連續自增（例如接續 255、256...）。
  * **不要**在 `loop/` 下建立分散的決策檔案。

### 3. 日常開發日誌（Loop Logs & Retros）
* **落檔路徑**：`solo-sect/loop/LOG.md`
* **操作方式**：
  * 每次 Loop 交付維持追加至 `loop/LOG.md` 末尾，包含：該 Loop 的主題、修改檔案、Seed 測試數據、Retro 反思。

### 4. 規則與常青規格修改
* 若本次 Loop 有修改核心公式或規則（如造詣計算、內勁飽和、作息門檻）：
  * 除了修改代碼外，同步更新 `docs/systems/` 或 `docs/architecture/` 對應文件中的文字說明，保持文件與代碼同步（Living Docs）。

---

## 快速查核清單（Commit 前檢查）
- [ ] `git status` 中，`solo-sect/` 根目錄沒有新增任何 `.md` 檔。
- [ ] 平衡與測試報告已放至 `docs/reports/`。
- [ ] 決策已追加至 `docs/decisions/DECISIONS.md`。
- [ ] 執行 `node --test test/*.test.mjs` 全數 PASS。
