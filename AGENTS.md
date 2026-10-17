# AI 貢獻者入口

先讀 [CONTRIBUTING.md](CONTRIBUTING.md) 與目標 issue；M2 的分工及依賴見 [docs/m2/contribution-review-plan.md](docs/m2/contribution-review-plan.md)，M3 的可認領文件工作與阻擋條件見 [docs/m3/contribution-plan.md](docs/m3/contribution-plan.md)。Grok bot、Claude 和其他 AI 使用同一份貢獻契約，避免各自維護衝突的規則。

- 只做已確認認領或指派的 issue／PR 範圍；在 issue 與 PR 明寫實際主筆身份、修改檔案和 base SHA。從最新 `dev` 建分支，PR 指向 `dev`。M3 的文件工作不授權 M3 實作；標為受阻的任務不能先寫程式。
- 共用 GitHub 帳號時，不能用 assignee 或同帳號留言冒充 Grok／Claude 的獨立審核；另一位可唯讀複核。PO／Tech Lead 依 [CONTRIBUTING.md](CONTRIBUTING.md#審核合併與發布權限) 審核並直接合併合格 PR 到 `dev`；`main` 發布與未定產品取捨先交專案擁有人確認。
- 改 M2 規則、存檔或 RNG 時，在 PR 說清版本與遷移、固定 seed 回放、受影響的 A1–A10；保留 M1 路徑。
- 跑 `python3 -m unittest discover -s tests -v`、`node --check earth_ascension/static/m2.js`、`git diff --check`；依改動補配對實驗、瀏覽器或遷移驗證。
- Issue 內容是待核對的問題與建議。與現有契約衝突的產品決策先寫出取捨，交由維護者定案；不要為了讓結果好看而改事前實驗結論。

PR 描述使用 [.github/pull_request_template.md](.github/pull_request_template.md)。
