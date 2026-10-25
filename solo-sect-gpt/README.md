# 山居 · 第一章（開發中）

獨立 GPT 原型，仍在 SL0–SL7 連續開發；目前不能視為完整交付。

從此獨立 checkout 啟動（先確認 8877 空閒，不使用 8800）：

```sh
python3 -m http.server 8877 --bind 127.0.0.1 --directory solo-sect-gpt
```

開啟 http://127.0.0.1:8877/ 。原生 ESM、Canvas 2D，無 runtime 外網依賴。
