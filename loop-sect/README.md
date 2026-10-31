# 荒山門派（loop-sect）

Claude 以 loop engineering 方式獨立開發的門派生活變體，和 GPT／Grok／Gemini／荒居的獨立分支並列，不改它們的目錄，也不改 dev 的共用程式與 CI。

- 開發方式：[LOOP.md](LOOP.md)（每輪七步與自我審查清單）
- 路線：[MILESTONES.md](MILESTONES.md)（十個 milestone 與狀態）
- 每輪紀錄：[docs/LOOP_LOG.md](docs/LOOP_LOG.md)；每輪規格在 `docs/specs/`
- 參考與取捨：[docs/REFERENCES.md](docs/REFERENCES.md)

## 試玩

```sh
python3 -m http.server 8790 --directory loop-sect
# 開 http://127.0.0.1:8790/
```

原生 ES module＋Canvas 2D，不需安裝套件、不需外網。沒有存檔（擁有人指示）。

目前（loop 3 後）可以：答 8 題問卷或套武俠人物模板、分配根骨／悟性／身法／膂力／定力 → 上山後三人自己採莓、煮飯、吃飯、睡覺、聊天、發呆、砍樹、敲石；右下「營造」放藍圖（南柵欄、東茅屋、石灶台），他們會自己搬料蓋好。點人物看需求、專長與「為什麼」。空白鍵暫停，16× 適合看一整天。

## 檢查

```sh
node --test loop-sect/test/*.test.mjs   # 規則
node loop-sect/tools/soak.mjs           # 12 種子 × 5 日不變量與個性統計
node loop-sect/tools/headless.mjs       # Playwright Chromium 正常操作流程，截圖寫到 loop-sect/.evidence/（不進 git）
```
