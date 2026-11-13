# 武俠小鎮 W0–W9 — 總驗收（FINAL）

實際主筆：Grok（由 Grok Bot 代送）。分支 `town/wuxia`，最後一步 tag `wuxia-w9`（`0c926157`）。規格：#551（總綱）、#548／#549（共用約定）、#552–#561（W0–W9）、#562（補充）。

## 小鎮能看到什麼

山腳下的一座水彩古鎮（茶館、藥鋪、鐵匠鋪、井、河、竹林、武館），六位鎮民——林嫂、老韓、何郎中、石虎、阿青、周教頭——照十二時辰過日子：挑水、做飯、開店、聽書、睡覺，用古風口吻閒聊（LLM 只決定說什麼，失敗或超預算改模板句）。破舊的武館會因為鎮民的心念重開：阿青聽多了說書想學武、周教頭被激起重開武館；木人樁、石鎖、梅花樁上練出技能，切磋分出勝負，輸了想變強，敬重夠了就拜師、武館掛匾、門規約束弟子。外地俠客、山賊、行商帶來江湖事件，傳聞在鎮民之間口耳相傳、越傳越走樣，每晚寫進「山腳鎮誌」。玩家可以「以外地少年／少女進鎮」，點井挑水、點木人樁練功、向周教頭請教、切磋、拜師；離開 30 實分鐘角色就交給規則代管，單人時還能暫停。所有規則都是確定性的：同 seed 同 input 得到同一個狀態 hash，任何一局都能匯出 journal 離線重播。

## 離線驗收清單（乾淨 clone、無 Docker、無 LLM）

需求：Node 22 以上（CI 用 22；本次驗證用 Node 24.22.1、npm 11.21.1）、git。不需要 Docker、Convex 部署、LLM 或任何金鑰。截圖（`wuxia:shot`）另外需要本機 Chrome，不在清單裡。

```bash
git clone --branch town/wuxia --single-branch https://github.com/lalagrass/earth-ascension.git
cd earth-ascension/wuxia-town
npm ci
npm run wuxia:check        # 單元測試 230 個＋第 1–18 項（W0–W9 全部驗收的判定），約 10–19 分鐘
```

`wuxia:check` 已經包含各步驟的驗收判定。想逐步看報告，可以照下表跑（每行都在 `wuxia-town/` 下）：

| 步 | 指令 | 預期 |
|---|---|---|
| W0 | `npm run wuxia:headless -- --seed 7 --minutes 30` | `hash 47c2308e3633c9a3…`（seed 8：`465ea673a203ffc9…`，不同） |
| W0 | `npm run wuxia:replay -- docs/wuxia/fixtures/w0-live.jsonl` | `MATCH`（`001cdcf7…`） |
| W1 | `npm run wuxia:skin-diff -- --seed 7 --minutes 30` | A 關＝W0 `331a11aa…`；B 只差地圖相關欄位 |
| W2 | `npm run wuxia:folk-diff -- --seed 7 --minutes 30` | A 關＝W1 `8f7fe0dc…` |
| W2 | `npm run wuxia:replay -- docs/wuxia/fixtures/w02-live.jsonl` | `MATCH`（`2d0952eb…`） |
| W3 | `npm run wuxia:life-diff -- --seed 7 --days 3` | A 關＝W2 `dadeb8a8…`；B 開 3 日 `4bc77029…` 作息全過 |
| W3 | `npm run wuxia:headless -- --seed 7 --days 3 --out /tmp/life.json && npm run wuxia:day-report -- /tmp/life.json --day 2` | 第 2 日時間表 |
| W4 | `npm run wuxia:dojo-diff` | A 關＝W3 `35c860ff…` |
| W4 | `npm run wuxia:headless -- --seed 7 --days 30 --off w06-spar --out /tmp/d30off.json && npm run wuxia:skill-report -- /tmp/d30off.json` | 阿青第 30 日拳腳 120–180（164）。**要加 `--off w06-spar`**：W6 起預設世界有切磋，阿青長到 195（W6 的刻意改變，check 第 13 項同樣用 `--off w06-spar`） |
| W5 | `npm run wuxia:headless -- --seed 7 --days 14 --out /tmp/on.json && npm run wuxia:mind-report -- /tmp/on.json --who 阿青,周教頭` | 心念與「因為」 |
| W6 | `npm run wuxia:spar-sim -- --a 周教頭 --b 阿青 --n 200 --seed 7` | 周教頭勝 200（100%）`PASS` |
| W6 | `npm run wuxia:headless -- --seed 7 --days 30 --out /tmp/s.json && npm run wuxia:spar-report -- /tmp/s.json` | `787f9193…`，4 條 `PASS` |
| W7 | `npm run wuxia:headless -- --seed 7 --days 45 --out /tmp/b.json && npm run wuxia:bond-report -- /tmp/b.json --day 45` | `d9f5c567…`，第 24 日阿青拜周教頭為師 |
| W8 | `for s in 7 8 9; do npm run wuxia:headless -- --seed $s --days 60 --out /tmp/j$s.json; done && npm run wuxia:jianghu-report -- /tmp/j7.json /tmp/j8.json /tmp/j9.json && npm run wuxia:chronicle -- /tmp/j7.json` | seed 7／8／9：`f041b866…`／`768a1f29…`／`e088c628…`，5 條 `PASS`，60 日鎮誌。**要三個 seed 一起判定**：「4 種事件各至少一次」是三個 seed 合計（seed 7 單獨沒有山賊，會 `FAIL`） |
| W9 | `npm run wuxia:player-script -- --script docs/wuxia/fixtures/w09-script.json --seed 7 --out /tmp/p.json --journal /tmp/p.jsonl` | `ae10e2a0…`；第 1／2／5／10 日的操作都 `OK` |
| W9 | `npm run wuxia:replay -- /tmp/p.jsonl` | `MATCH` |

### 乾淨 clone 實測（2026-11-14 00:14–01:0x，Asia/Taipei，`/workspace/wuxia-final-verify`，`0c926157`）

- `git clone --branch town/wuxia --single-branch`：22 秒；`npm ci`：12 秒，EXIT 0。
- `npm run wuxia:check`：**EXIT 0**，單元測試 26 個檔案 230 個全過，第 1–18 項 66 行 `ok`、0 行 `FAIL`；跟 W9 開發目錄的輸出逐行相同（排序後 `diff` 無差異）。耗時 1141 秒（這台機器同時在跑別的工作；W9 開發時同一個 commit 是 617 秒，CI 約 12.5–15 分鐘）。
- 逐步清單的實際輸出（節錄）：

```
### w0-headless7
$ npm run -s wuxia:headless -- --seed 7 --minutes 30
exit 0 (3s)
clock 第 2 日 午初（遊戲分鐘 1799）
hash 47c2308e3633c9a35df9993d67fe6ed78ac6c7532c5ec804a87f837052c4b7cf

### w0-headless8
$ npm run -s wuxia:headless -- --seed 8 --minutes 30
exit 0 (4s)
clock 第 2 日 午初（遊戲分鐘 1799）
hash 465ea673a203ffc99b54e71b0dcab4077d005d16478fe5d1a83f4e3561f7545b

### w0-replay
$ npm run -s wuxia:replay -- docs/wuxia/fixtures/w0-live.jsonl
exit 0 (2s)
hash 001cdcf7bebb42a45d850f727c97ae1734dfaacd73d4b20a31876ab2c4fc9489
expected 001cdcf7bebb42a45d850f727c97ae1734dfaacd73d4b20a31876ab2c4fc9489
MATCH

### w1-skindiff
$ npm run -s wuxia:skin-diff -- --seed 7 --minutes 30
exit 0 (6s)
A ok   w01-skin 關＝W0 設定（enabled=[]） hash 331a11aa71fd164039bf6e7a59857d3dc66ebe8081fb4416b2e73bdd26c0367d
B ok   同一張地圖（gentle）開／關只差：開 hash d0db8565a9762957149a292a08cc308ae28b4a31de86ffbbc1006b07777350ed

### w2-folkdiff
$ npm run -s wuxia:folk-diff -- --seed 7 --minutes 30
exit 0 (11s)
A ok   w02-folk 關＝W1 設定（enabled=["w01-skin"]，5 人） hash 8f7fe0dc071b59240f5d86981e5043ad4d2ef93c50b5ab5d452ab63e8d9b1a2b
C 預設（開，6 人） hash dadeb8a8380997085715890489042f8d89346e75f6214e9ed77109e7f7b777d4

### w2-replay
$ npm run -s wuxia:replay -- docs/wuxia/fixtures/w02-live.jsonl
exit 0 (2s)
hash 2d0952eb100770eea4cb060bdb83cd170e996b476f428f111526f7fff6eb1308
expected 2d0952eb100770eea4cb060bdb83cd170e996b476f428f111526f7fff6eb1308
MATCH

### w3-lifediff
$ npm run -s wuxia:life-diff -- --seed 7 --days 3
exit 0 (26s)
A ok   w03-life 關＝W2 世界（enabled=["w01-skin","w02-folk"]） 30 分 hash dadeb8a8380997085715890489042f8d89346e75f6214e9ed77109e7f7b777d4
B ok   開：3 日 hash 4bc77029e423be2d377d12a2cab10ed5fc06ebcb28185258cf3ec07c5075d644
C ok   關：3 日 hash 42e9d2dbc088591248f2b520fa21a40c69f1347e42b669302d53c559d04a911e，沒有作息規律

### w3-dayreport
$ npm run -s wuxia:headless -- --seed 7 --days 3 --out /tmp/fv/life.json && npm run -s wuxia:day-report -- /tmp/fv/life.json --day 2
exit 0 (10s)
clock 第 4 日 卯正（遊戲分鐘 4320）
hash 4bc77029e423be2d377d12a2cab10ed5fc06ebcb28185258cf3ec07c5075d644
# 第 2 日時間表（seed 7，w03-life 開，hash 4bc77029e423be2d…）

### w4-dojodiff
$ npm run -s wuxia:dojo-diff
exit 0 (6s)
A ok   w04-dojo 關＝W3 世界（enabled=["w01-skin","w02-folk","w03-life"]，沒有武館物件與技能狀態） 30 分 hash 35c860ffc3af21caae503f3aa4fe4fb58529e0a41778f7f31e24dfd5cf85df9b

### w4-skill
$ npm run -s wuxia:headless -- --seed 7 --days 30 --out /tmp/fv/d30.json && npm run -s wuxia:skill-report -- /tmp/fv/d30.json
exit 1 (190s)
clock 第 31 日 卯正（遊戲分鐘 43200）
hash 787f9193a57b1db67e549f6b003f161969fdfc33718cd79f5bd3bb40d3684f77
# 技能報告（seed 7，30 日，hash 787f9193a57b1db6…）
FAIL 阿青第 30 日拳腳在 120–180：195（顯示 19.5，入門）

### w5-mind
$ npm run -s wuxia:headless -- --seed 7 --days 14 --out /tmp/fv/on.json && npm run -s wuxia:mind-report -- /tmp/fv/on.json --who 阿青,周教頭
exit 0 (67s)
clock 第 15 日 卯正（遊戲分鐘 20160）
hash c2ec4a99d18ddc6c59b3c7218496fa0f5b1ae07a6ed3abce6d48d38e6fbdc6fd
# 心念報告（seed 7，14 次寅正評估，hash c2ec4a99d18ddc6c…）

### w6-sparsim
$ npm run -s wuxia:spar-sim -- --a 周教頭 --b 阿青 --n 200 --seed 7
exit 0 (0s)

### w6-sparreport
$ npm run -s wuxia:spar-report -- /tmp/fv/d30.json
exit 0 (0s)
# 切磋報告（seed 7，30 日，hash 787f9193a57b1db6…）

### w7-bond
$ npm run -s wuxia:headless -- --seed 7 --days 45 --out /tmp/fv/b.json && npm run -s wuxia:bond-report -- /tmp/fv/b.json --day 45
exit 0 (345s)
clock 第 46 日 卯正（遊戲分鐘 64800）
hash d9f5c56786c8914f7b692b8692f183a6f434ea12f528822e97046dd0a827f8e2
# 關係與拜師報告（seed 7，45 日，hash d9f5c56786c8914f…）

```

- `w4-skill` 那一行照 W4 原指令（沒加 `--off w06-spar`）跑，得到 `FAIL … 195`：這是 W6 起預設世界有切磋的**刻意改變**（W6.md 記錄，check 第 13 項改用 `--off w06-spar`，結果 164 通過）。上表已改成加 `--off w06-spar` 的指令。
- 同一個乾淨 clone 補跑的其餘幾行（01:0x–01:3x）：

```
### W4（加 --off w06-spar）
exit 0 (155s)
hash d44d64d3edb58aa124e7aa9836d104975a8f63796853973935d9e1f06891c8bc
PASS 阿青第 30 日拳腳在 120–180：164（顯示 16.4，入門）
PASS 周教頭在場時增長明顯較高（同等級折算每分鐘 在場÷不在 ≥ 1.3）：1.49（在場 4017 分、不在 123 分；依日子 21 天 0.0360/分 vs 3 天 0.0364/分）

### W8：seed 7／8／9 各 60 日 → jianghu-report
seed 7（60 日，hash f041b866dbb66279…）
  第 11–11 日 #3 說書新段子：說「周教頭把破武館重新開了，門下已有兩個徒弟」，1 人聽；來因 #2
  第 12–13 日 #4 外地俠客路過：杜青崖 住 2 日，切磋 2 場；來因 #2
  第 21–21 日 #8 說書新段子：說「外地俠客杜青崖到武館討教，鬥了十回合敗給周教頭」，0 人聽；來因 #4
  第 23–23 日 #9 小比：coach-open 1 場，頭籌 周教頭；來因 -
  第 29–30 日 #11 外地俠客路過：柳行舟 住 2 日，切磋 1 場；來因 #2 #7
  第 37–37 日 #15 說書新段子：說「武館掛上「老槐拳館」的匾，門下已有一個徒弟，周教頭寶刀未老」，1 人聽；來因 #8
  第 44–47 日 #17 外地俠客路過：韋石峰 住 4 日，切磋 4 場；來因 #7 #8
  第 53–53 日 #21 說書新段子：說「外地俠客韋石峰到武館討教，鬥了四十四回合敗給周教頭」，1 人聽；來因 #15
  第 57–57 日 #23 小比：coach-disciple 1 場，頭籌 周教頭；來因 -
  導演擲骰 61 次（有候選 25、加倍 1、平靜期 24、事件進行中 5）；傳聞 20 則、傳 134 手、走樣 14 手、出鎮 19 則
seed 8（60 日，hash 768a1f29bc4009ec…）
  第  8–8 日 #2 山賊擾鎮：2 名山賊，被 周教頭 打跑；來因 #1
  第 14–16 日 #6 外地俠客路過：韋石峰 住 3 日，切磋 3 場；來因 #2
  第 23–23 日 #10 說書新段子：說「外地俠客韋石峰到武館討教，鬥了十回合敗給周教頭」，1 人聽；來因 #7
  第 27–30 日 #12 外地俠客路過：秦晚舟 住 4 日，切磋 3 場；來因 #2 #9
  第 37–37 日 #16 說書新段子：說「外地俠客秦晚舟到武館討教，鬥了八回合敗給周教頭」，0 人聽；來因 #13
  第 38–38 日 #17 小比：coach-disciple 1 場，頭籌 周教頭；來因 -
  第 50–50 日 #20 說書新段子：說「武館辦小比，周教頭親自下場考較，門下一個徒弟都不是對手」，1 人聽；來因 #16
  第 52–55 日 #22 外地俠客路過：柳行舟 住 4 日，切磋 3 場；來因 #16
  導演擲骰 61 次（有候選 23、加倍 2、平靜期 25、事件進行中 8）；傳聞 22 則、傳 149 手、走樣 8 手、出鎮 21 則
seed 9（60 日，hash e088c6287d6e842d…）
  第  8–8 日 #2 山賊擾鎮：3 名山賊，被 周教頭 打跑；來因 #1
  第 16–17 日 #8 外地俠客路過：秦晚舟 住 2 日，切磋 2 場；來因 #2
  第 25–25 日 #11 說書新段子：說「外地俠客秦晚舟到武館討教，鬥了十三回合敗給周教頭」，1 人聽；來因 #7
  第 26–26 日 #13 小比：coach-disciple 1 場，頭籌 周教頭；來因 -
  第 33–33 日 #15 說書新段子：說「武館辦小比，周教頭親自下場考較，門下一個徒弟都不是對手」，1 人聽；來因 #10
  第 38–39 日 #17 外地俠客路過：方遠山 住 2 日，切磋 1 場；來因 #9 #10
  第 50–50 日 #21 小比：coach-disciple 1 場，頭籌 周教頭；來因 -
  導演擲骰 61 次（有候選 26、加倍 1、平靜期 25、事件進行中 5）；傳聞 20 則、傳 127 手、走樣 14 手、出鎮 19 則

來因：
  seed 7 第 12 日 外地俠客路過 ← #2「周教頭把破武館重新開了」
  seed 7 第 29 日 外地俠客路過 ← #2「周教頭把破武館重新開了」、#7「武館辦小比，周教頭親自下場考較，沒人接得住」
  seed 7 第 44 日 外地俠客路過 ← #7「武館辦小比，周教頭親自下場考較，沒人接得住」、#8「武館掛上「老槐拳館」的匾，門下已有一個徒弟，周教頭寶刀未老」
  seed 8 第 8 日 山賊擾鎮 ← #1「藥鋪新進了五箱藥材」
  seed 8 第 14 日 外地俠客路過 ← #2「周教頭把破武館重新開了」
  seed 8 第 27 日 外地俠客路過 ← #2「周教頭把破武館重新開了」、#9「武館掛上「青石武館」的匾，門下已有一個徒弟，周教頭寶刀未老」
  seed 8 第 52 日 外地俠客路過 ← #16「武館辦小比，周教頭親自下場考較，門下一個徒弟都不是對手」
  seed 9 第 8 日 山賊擾鎮 ← #1「藥鋪新進了四箱藥材」
  seed 9 第 16 日 外地俠客路過 ← #2「周教頭把破武館重新開了」
  seed 9 第 38 日 外地俠客路過 ← #9「武館掛上「山腳拳館」的匾，門下已有一個徒弟，周教頭寶刀未老」、#10「武館辦小比，周教頭親自下場考較，門下一個徒弟都不是對手」

PASS 4 種事件合計各至少一次：xiake×8、bandit×2、xiaobi×5、story×9
PASS 俠客／山賊都有來因（出鎮傳聞）：10 次都有
PASS 大事件後 5 日平靜：沒有違反
PASS 連續 10 日無事機率 ×2：擲骰機率只有 0.3／0.6 兩種
PASS 傳聞路徑可追溯：每則傳聞的每一手都追得到來源
exit 0

### W8：chronicle /tmp/j7.json（前 6 行）
山腳鎮誌（seed 7，60 日，hash f041b866dbb66279…）

第三日。藥鋪進了五箱藥材。
第五日。行商路過茶館，沒聽到什麼新鮮事。
第七日。周教頭重開了破武館。
第十日。藥鋪進了四箱藥材。行商路過茶館，把「藥鋪新進了十箱藥材」「周教頭把破武館重新開了」的消息帶出了鎮。
第十一日。老韓在茶館說了新段子「周教頭把破武館重新開了，門下已有兩個徒弟」，一人聽了。
第十三日。外地俠客杜青崖路過山腳鎮，住了兩日，到武館討教兩回敗給周教頭。

### W9：player-script ＋ replay
exit 0 (142s)
OK   第 1 日 06:30 join - → 第 1 日 06:30 加入
OK   第 1 日 08:00 activity well/draw_water → 第 1 日 08:30 走去井挑水（試 2 次） {"started":"第 1 日 09:04","finished":"第 1 日 09:34","minutes":30}
OK   第 1 日 19:00 talk 林嫂 → 第 1 日 19:00 邀請送出（c:17） {"participating":"第 1 日 19:23","ended":"第 1 日 19:40","playerLines":2,"aiLines":2}
NO   第 2 日 08:00 activity dummies/hit_dummy → 第 2 日 08:00 武館還沒重開
OK   第 2 日 08:10 goto dojo → 第 2 日 08:31 ok
OK   第 2 日 09:30 activity dojo-gate/gaze_dojo → 第 2 日 09:30 走去武館門口在武館外張望 {"started":"第 2 日 09:34","finished":"第 2 日 09:54","minutes":20}
OK   第 3 日 12:00 pause - → 第 3 日 12:00 暫停 {"pausedSteps":600,"pausedAt":"第 3 日 12:00","resumedAt":"第 3 日 12:00","resumeNote":"繼續（暫停了 600 實秒）","clockFrozen":true}
OK   第 3 日 19:00 talk 老韓 → 第 3 日 19:00 邀請送出（c:160） {"participating":"第 3 日 19:59","ended":"第 3 日 20:08","playerLines":2,"aiLines":1}
OK   第 5 日 09:00 ask 周教頭 → 第 5 日 10:00 周教頭答應指點（拳腳高 610）（試 3 次）
OK   第 10 日 07:00 apprentice 周教頭 → 第 10 日 07:00 去向周教頭拜師（師父的決定在跪拜後）
OK   第 12 日 07:30 activity dummies/hit_dummy → 第 12 日 07:30 走去木人樁打樁 {"started":"第 12 日 08:07","finished":"第 12 日 09:02","minutes":55}
OK   第 12 日 09:00 spar 周教頭 → 第 12 日 09:00 周教頭答應切磋
玩家 player-1（manual）技能 {"fist":17,"power":15,"stance":10,"stamina":20}；師父 周教頭；記憶 26 筆；代管／接手 6 次
clock 第 13 日 卯正
hash ae10e2a0dc73b793f78c7be72df20d1d556b372a874228805dde7fafa99c78b7
```

- 第一次照 W8 原指令只給 seed 7 跑 jianghu-report，得到 `FAIL 4 種事件合計各至少一次：xiake×3、bandit×0、…`（其他 4 條 PASS）；這一條是三個 seed 合計的判定（W8.md 也是三個 seed 一起跑），上表已改成三個 seed。

## 每步 tag、最終 hash、代表截圖

「世界 hash」＝seed 7、30 引擎分鐘、只開到該步元素的世界狀態 hash，用最終程式碼重算（各 diff 工具的 A 項：把後面的元素關掉＝前一步的世界），跟各步 Wn.md 記錄的值相同。

| 步 | tag → commit | 世界 hash（seed 7，30 分） | 驗收紀錄 | 代表截圖 |
|---|---|---|---|---|
| W0 確定性地基 #552 | `wuxia-w0` → `d841aa72` | `331a11aa71fd1640…` | [W0.md](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/W0.md) | [軌跡圖 seed 7](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/w0-trace-seed7.png) |
| W1 換皮成山腳古鎮 #553 | `wuxia-w1` → `a51e5baa` | `8f7fe0dc071b5924…` | [W1.md](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/W1.md) | [全景 1400](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/w01/w01-seed7-g0000-1400x820.png)、[手機 390](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/w01/w01-seed7-g0000-390w.png) |
| W2 鎮民身分與古風口吻 #554 | `wuxia-w2` → `ee26f69b` | `dadeb8a838009708…` | [W2.md](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/W2.md) | [近景](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/w02/w02-seed7-closeup-g0360-1400x820.png) |
| W3 一天的生活 #555 | `wuxia-w3` → `4699de27` | `35c860ffc3af21ca…` | [W3.md](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/W3.md) | [茶館](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/w03/w03-seed7-teahouse-g2195-1400x820.png)、[手機](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/w03/w03-seed7-g1770-390w.png) |
| W4 武館開張 #556 | `wuxia-w4` → `213f8be2` | `4b038f412afb978c…` | [W4.md](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/W4.md) | [第 1 日 vs 第 30 日](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/w04/w04-seed7-d01-vs-d30.png)、[技能曲線](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/w04/skill-curve.png) |
| W5 心念 #557 | `wuxia-w5` → `96abb9d7` | `1b1c24e646d72d0a…` | [W5.md](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/W5.md) | [教頭指點](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/w05/w05-seed7-coach-d07-0930-1400x820.png) |
| W6 同地圖切磋 #558 | `wuxia-w6` → `1775844e` | `a883231678c107f2…` | [W6.md](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/W6.md) | [切磋 GIF](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/w06/w06-spar.gif)、[擊中](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/w06/w06-spar-hit.png) |
| W7 人際三軸與拜師 #559 | `wuxia-w7` → `73a6452d` | `f7871ab03e5c7bc1…` | [W7.md](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/W7.md) | [關係分頁](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/w07/w07-seed7-bond-d24-1200-1400x820.png)、[掛匾](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/w07/w07-seed7-plaque-d24-0700-1400x820.png) |
| W8 江湖事件與鎮誌 #560 | `wuxia-w8` → `12d1dd06` | `47c2308e3633c9a3…` | [W8.md](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/W8.md) | [俠客到武館](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/w08/w08-seed7-xiake-d12-1040-1400x820.png)、[山賊](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/w08/w08-seed8-bandit-d08-1020-1400x820.png)、[第 60 日鎮誌](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/w08/w08-seed7-d60-2200-1400x820.png) |
| W9 玩家角色 #561 | `wuxia-w9` → `0c926157` | 沒有玩家：`47c2308e3633c9a3…`（＝W8）；player-script 12 日：`ae10e2a0dc73b793…` | [W9.md](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/W9.md) | [點物件（手機）](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/w09/w09-object-d01-0820-390w.png)、[點人物（手機）](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/w09/w09-person-d05-0920-390w.png) |

完整 hash：W0 `331a11aa71fd164039bf6e7a59857d3dc66ebe8081fb4416b2e73bdd26c0367d`、W1 `8f7fe0dc071b59240f5d86981e5043ad4d2ef93c50b5ab5d452ab63e8d9b1a2b`、W2 `dadeb8a8380997085715890489042f8d89346e75f6214e9ed77109e7f7b777d4`、W3 `35c860ffc3af21caae503f3aa4fe4fb58529e0a41778f7f31e24dfd5cf85df9b`、W4 `4b038f412afb978c59b5f9c397369e4f67b0f155dc7c141d1df2b8c2928f7dc2`、W5 `1b1c24e646d72d0ad42ca66eea4edf2834cffc64030991952d4ec75c26103a5c`、W6 `a883231678c107f2fb099ae3b13ddc9ff359e5cb90b62c729ac25d73d10d1449`、W7 `f7871ab03e5c7bc1c2d415ed29fb3d54a29aea6184f77d43bd6cdd1421eb7023`、W8／W9（無玩家）`47c2308e3633c9a35df9993d67fe6ed78ac6c7532c5ec804a87f837052c4b7cf`、W9 player-script `ae10e2a0dc73b793f78c7be72df20d1d556b372a874228805dde7fafa99c78b7`。長天數（seed 7，最終預設設定）：3 日 `4bc77029e423be2d…`、30 日 `787f9193a57b1db6…`、45 日 `d9f5c56786c8914f…`、60 日 `f041b866dbb66279…`。

## 用 Docker＋雲端 LLM 實際跑起來玩

（這次開發的機器沒有 Docker，也沒有雲端金鑰，以下照上游 README 與本專案設定整理，**還沒有實跑過**，見 D1。）

```bash
cd wuxia-town
docker compose up --build -d                       # 前端 5173、Convex 後端 3210、dashboard 6791
docker compose exec backend ./generate_admin_key.sh
# 寫進 wuxia-town/.env.local（不要 commit）：
#   CONVEX_SELF_HOSTED_URL="http://127.0.0.1:3210"
#   CONVEX_SELF_HOSTED_ADMIN_KEY="<上一步印出的 key>"
npx convex env set OPENAI_API_KEY '<你的金鑰>'       # D1：建議 gpt-4o-mini
npx convex env set LLM_DAILY_TOKEN_CAP 2500000      # D2：每日 token 上限，超過改模板句（不設＝不限）
npx convex dev --run init --until-success          # 第一次：部署函式並建立預設世界（＝npm run predev）
npm run dev:backend                                 # 之後：持續同步函式、看 log
# 瀏覽器開 http://localhost:5173 ，按「以外地少年進鎮」或「以外地少女進鎮」
```

| 環境變數／設定 | 用途 |
|---|---|
| `OPENAI_API_KEY`（或 `TOGETHER_API_KEY`、`OLLAMA_HOST`） | LLM 端點；`LLM_PROVIDER` 可強制指定。用 OpenAI 時把 `data/wuxia/world.config.json` 的 `embeddingDimension` 改成 1536（預設 1024＝Ollama `mxbai-embed-large`），要在建世界前改 |
| `LLM_DAILY_TOKEN_CAP` | 每日 token 上限（UTC 日），超過時對話改模板句（D2 建議 2500000；畫面提示還沒做，W0-7） |
| `WUXIA_KEEP_ALIVE=1` | 沒有瀏覽器時世界不會 5 分鐘自己停（長時間實跑用；設定檔 `keepAlive` 也可以） |
| `data/wuxia/world.config.json` | seed、元素開關（`w01-skin`…`w09-player`），建世界時凍結進世界狀態 |

實跑後匯出 journal 重播：畫面右側「匯出 journal」按鈕（W9），或 `npx tsx tools/wuxia/journal.ts export --out /tmp/live.jsonl`，再 `npm run wuxia:replay -- /tmp/live.jsonl`。長時間實測腳本：`MINUTES=15 OUT=/tmp/live bash tools/wuxia/live-run.sh`。

## 跟規格不同的地方（DEVIATIONS.md 摘要）

全文：[DEVIATIONS.md](https://github.com/lalagrass/earth-ascension/blob/wuxia-w9/wuxia-town/docs/wuxia/DEVIATIONS.md)，共 125 條（W0 13、W1 11、W2 15、W3 13、W4 10、W5 15、W6 11、W7 10、W8 14、W9 13）。最主要的幾類：

- **環境**：沒有 Docker（W0-4，改用 Convex CLI 本機後端，同一個開源 convex-backend）、沒有雲端金鑰（W0-5、W2-2、W9-10，實跑用本機 Ollama 小模型，雲端模型比較與 W9 的 15 分鐘 Docker 實跑待補）。
- **確定性與 journal**：`wuxiaSteps` 多記欄位、`wuxiaSnapshots`（W0-2）；元素開關在建世界時凍結（W0-8）；`w09-player` 等第一位玩家才啟用，沒有玩家的世界跟 W8 逐位元組相同（W9-1）。
- **美術**：地圖程式烘焙、自製水彩 tileset、自繪人物與外人（W1-1、W1-2、W1-9、W8-2）；上游美術音樂都不在 repo（W0-1）。
- **規則的數值與補充**：切磋勝率分母 600 → 1500（W6-2）、拜師增長判定方式（W7-9）、江湖事件的來因與節奏（W8-4、W8-13）、請教規則（W9-4）等，規格沒寫或互相矛盾的地方都選最接近原意、可回退的做法，回退方式寫在每一條。
- **刻意改變前一步結果**：W5 起武館重開日由心念決定、W6 起預設世界有切磋（阿青 30 日拳腳 164 → 195）、W8 起預設有江湖事件；每一次的 old → new 都記在該步 Wn.md，W4 的驗收改在對應元素關掉的世界判定。
- **CI**：check 分組平行（W8-14）、長跑共用（W9-11），判定與門檻都沒放寬。

## 待 owner 決定（D1–D11，皆已先做建議選項）

| # | 事項 | 建議（已實作） |
|---|---|---|
| D1 | 預設雲端模型 | `gpt-4o-mini`；owner 提供金鑰後把 `embeddingDimension` 改 1536，重錄 W0／W2 實跑與 W9 的 15 分鐘 Docker 實跑。目前維持上游預設（Ollama） |
| D2 | `LLM_DAILY_TOKEN_CAP` | `2500000`（約 10 小時開機量，gpt-4o-mini 約 US$0.45／天）；目前未設定 |
| D3 | `wuxia:shot --at` 時刻 | 驗收改成 `--at 0,360,840`（卯、午、戌）；兩組截圖都有 |
| D4 | 技能成長的 1 年目標 | 照公式只校準 30 日（1 年約 650，不是 450） |
| D5 | 「想學武」只給阿青？ | 維持：條件成立的人都會有，只有阿青因此多練 |
| D6 | 切磋勝率分母 | 1500（兩條驗收都過；代價是弱方較常爆冷） |
| D7 | 切磋要不要自然有人圍觀 | 先不動 |
| D8 | 拜師後增長怎麼量 | 相鄰窗（300／600／1200 分）＋全期同等級折算 |
| D9 | 外人要不要變成真的 AI Town 人物 | 維持外人（不聊天、不吃 LLM 額度） |
| D10 | 「請教」規則 | 維持：對方有空、需求 < 90、拳腳高 ≥ 50、親近 ≥ 0，教 30 分鐘 |
| D11 | 「匯出 journal」按鈕的公開查詢 | 公開查詢，w09-player 關閉時拒絕 |

每一項的選項與取捨見 DEVIATIONS.md「待 owner 決定」。

## CI 時間風險

`.github/workflows/wuxia-town.yml` 的 job 上限 20 分鐘（workflow 檔照約定不改）。`npm run wuxia:check` 在 CI 約 12.5–15 分鐘（W9 最後幾次：12m25s、14m34s、14m57s），但同時有多個 run 時出現過 19m20s（`ef0be734`），W8 收尾時是 19m35s。之後如果再加長天數檢查，或 GitHub runner 變慢，就可能超時被取消。可行的做法：(a) owner 把 `timeout-minutes` 調到 30（最簡單）；(b) 把長天數的 jianghu-diff C（60 日 `--no-rumor-out`）也改成共用；(c) 長天數檢查拆成第二個平行 job。這三種都不放寬判定。

另外：本 repo 原有的 `test` workflow（Python 單元測試）在 PR 上會跑 `git diff --check origin/dev...HEAD`；上游地圖編輯器 `src/editor/*` 的行尾空白讓它失敗過一次，已只刪行尾空白修正（`678cee29`，UPSTREAM.md 註記）。

## 沒做的（照規格不做或待補）

- Docker＋雲端 LLM 的實跑（W0 雲端模型比較、W2 雲端重錄、W9 15 分鐘玩家實跑）：等 D1 的金鑰。
- #561「不做」：多人公平性、任務系統。
