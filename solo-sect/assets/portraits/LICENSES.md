# N49 肖像來源與權利狀態

本輪由本倉 `dev` 固定提交 `e1b6a7bad0b6e0bd157a7bda2513ce55dfbf6258` 的 `sect-chronicle/assets/shared/portraits/1.1.0/` 複製下列肖像。每張的 SHA-256 與生成描述見 `PROMPTS.md`。來源資料的權利欄為 `repository-research-reuse; third-party-rights-unverified`：可在本倉研究與審查，但這不是第三方商用授權聲明。沒有聲稱這批肖像是 CC0 或其他開源圖像。

| 本輪檔案 | 來源檔案 | 權利狀態 |
|---|---|---|
| `axing.png` | `1.1.0/axing.png` | 上述研究再利用，第三方權利未核實 |
| `baozugong.png` | `1.1.0/baozugong.png` | 同上 |
| `baozupo.png` | `1.1.0/baozupo.png` | 同上 |
| `caifeng.png` | `1.1.0/caifeng.png` | 同上 |
| `dongfangbubai.png` | `1.1.0/dongfangbubai.png` | 同上 |
| `guojing.png` | `1.1.0/guojing.png` | 同上 |
| `huangrong.png` | `1.1.0/huangrong.png` | 同上 |
| `huoyunxieshen.png` | `1.1.0/huoyunxieshen.png` | 同上 |
| `kulijiang.png` | `1.1.0/kulijiang.png` | 同上 |
| `linghuchong.png` | `1.1.0/linghuchong.png` | 同上 |
| `xiaolongnv.png` | `1.1.0/xiaolongnv.png` | 同上 |
| `youzhagui.png` | `1.1.0/youzhagui.png` | 同上 |
| `zhoubotong.png` | `1.1.0/zhoubotong.png` | 同上 |

## N54 瘦身（2026-11-06）

`old/` 的 13 張重複備份已刪除，原圖仍在 git 歷史。全部 122 張 PNG（含 v2 候選與 post）由原始 HEAD 圖縮至長邊至多 512 px，Pillow LANCZOS、96 色量化與 PNG optimize；沒有放大，沒有更換來源或授權。上列來源 hash／PROMPTS.md 的 hash 指瘦身前來源，不是現有壓縮位元組。未列的既有肖像與生成候選／後製詳 PROMPTS.md 及 docs/reports/reviews/PORTRAIT-BACKLOG-2026-10-25.md。完整逐檔清冊在 ../LICENSES.md。
