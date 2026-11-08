# 時間與尺度基準（第二十六輪）

## 三種時鐘

| 時鐘 | 定義 | 例子與跨時鐘換算 |
|---|---|---|
| 動作秒 | `s.t`、`dt`、招式前搖、走路和活動 `dur` 都用遊戲內秒；一日 `DAY = 600` 秒。固定步長，不用真實牆鐘時間。 | `speedOf` 的 px/s 乘 `dt` 得畫素；`stepWorkCondition` 的工作秒數除以 `DAY × workdayShare` 得一份工作負荷。 |
| 生理日 | 餓、睡、傷、心情及時令以一個 `DAY` 或日序計。這是完整生活循環，不讓人體因年曆壓縮而每 28 日就經歷一整年的飢餓。 | `HUNGER_PER_SECOND × DAY` 是每日飢餓；傷期日數乘 `DAY` 變為 `s.t` 上的到期秒。 |
| 成長年 | 年齡、懷孕和長期體能適應共用 `DAYS_PER_YEAR = 28`；一季 `SEASON_DAYS = 7`，四季為一年。這是刻意壓縮的年曆。 | `FAMILY.yearDays` 指向同一常數；現實訓練適應的 42／7 日各乘 `28 / 365.2425`，得到 3.2198／0.5366 遊戲日的長期／短期時間常數。 |

借 RimWorld 的 60 日年、15 日季：日常需求仍以一個生活日表達，年歲刻意加速。這裡不借其日長或技能數值；選 28 日年是本遊戲已定的年曆。Banister 體能／疲勞時間常數是以現實日量測，現在先換為年分再落到本遊戲的成長日。`FITNESS_SCALE` 和 `SORE_AT` 都依新 τ 重新推導，不另設成長上限。相同日均負荷的理論穩態比例接近原值，但接近穩態所需的遊戲日會縮短；30／90 日 C 報告另列，不為 C 調參。

## 地圖與水瀑

R1 **量測／推導**：既有 `RING.step = 24 px` 的近戰滑步視為約 0.6 m 的一小步，得到 `METERS_PER_PIXEL = 0.6 / 24 = 0.025 m/px`。這讓 `data.mjs` 的 1600×900 主地圖代表約 40×22.5 m 的門派及近山俯視範圍。既有普通腳程 `BASE_SPEED = 55 px/s` 因而為 1.375 m/s；不必改動既有平路耗時。帶身法、負重等加成後，仍先按同一 px/s 走，再換米／秒展示。`METERS_PER_ZHANG = 3` 是整丈高度的近似換算，原三崖 3／7／15 丈約為 9／21／45 m。`world.mjs` 的 6400×4800 巡山世界圖另以 `PX = 2.4` 將抽象巡山距離投影到畫面，角色在那張圖不按 `speedOf` 的 px/s 逐格走；該圖只是遠行示意，不能用主地圖的公尺比例反推山腳到深谷路程。

`cliffSlopeFactor` 先把節點水平畫素換公尺，把崖高差丈換公尺，再以 `水平 / √(水平²＋高度差²)` 折算沿坡速度。這會改變上崖行程與日程；舊的「24 px 當一丈」只是暫時抽象步幅，現已撤掉。崖點畫在同一俯視地圖，實際崖壁的立面高度只進坡度與攀登判斷，不當成畫布垂直畫素。

R1 **推導**：同一股水在更高落差下，忽略空氣阻力的衝擊速度與 `√(2gh)` 成正比；普通練體參照低崖 3 丈，瀑下 7 丈，因此飛瀑練體負荷乘 `√(7/3)`，約 1.528。水流量、接觸截面未知，所以這只是同水量的相對負荷模型，不假稱精確衝擊力；沿既有 `stepWorkCondition` 的負重比、疲勞和痠痛機制結算，不額外給經驗倍率，也不沿用先前沒有尺度的 1.4。

## 24d 的體能平衡點

同一人日均刺激 `q`、營養 `n` 時，體能日增約 `q n`，日衰減因子 `exp(-1/τ)`；穩態 `F* = q n / (1 - exp(-1/τ))`。體能技能靠 `base + (cap-base) × (1-exp(-F/FITNESS_SCALE))` 靠近個人上限。`FITNESS_SCALE = 1 / (1-exp(-1/τ)) / 2`，故 `F*/FITNESS_SCALE = 2 q n`，**壓縮時間常數不改相同日常負荷下的平衡比例**。24d 觀測的力量約 13.2–13.4、未到 14，是低日均負荷所致，不再靠變短的時間常數自動跨過原本不應存在的新卷體能門檻；25-0 已移除那三本卷的新 `skill` 前提。這輪改的是接近平衡點所需日數，並保留入門卷的平均體能慢讀規則。

## 時間常數逐列盤點

下表由 `node tools/time-constant-inventory.mjs --write` 從 `src/*.mjs` 的具名時間欄位、常數和 `DAY` 數值運算產生；`--check` 供 A 類測試阻止漏列。來源鍵含檔案、行號、欄位；一行有多個具名欄位會分列。時鐘是靜態分類，事件等待雖用 `DAY` 表示仍屬日曆／生理日，前搖和動畫 `wind` 則是動作秒。新增跨時鐘使用時須同時更新本節上方的語義。

<!-- TIME CONSTANT INVENTORY START -->
| 來源：行：常數 | 時鐘 | 原式（該行） |
|---|---|---|
| src/arts.mjs:417:ttl:1 | 動作秒 | ttl: 1.0, |
| src/arts.mjs:418:maxTtl:1 | 動作秒 | maxTtl: 1.0, |
| src/arts.mjs:675:brewEvery:1 | 工作次數 | export const SPEC = { k: 0.4, ref: 40, zhenMit: 0.25, zhenSlow: 0.2, zhenScout: 0.15, poisonT: 6, poisonDps: 2, poisonWeak: 0.15, healMax: 0.5, brewEvery: 3, expHeal: 5, |
| src/arts.mjs:716:cd:1 | 動作秒 | base: { qiScale: 0.15, dmg: 1, cd: 1 }, |
| src/arts.mjs:717:cd:1 | 動作秒 | lian: { qiScale: 0.40, dmg: 0.90, cd: 1 }, |
| src/arts.mjs:718:cd:1 | 動作秒 | da: { qiScale: 0.08, dmg: 1.12, cd: 0.92 }, |
| src/arts.mjs:834:cd:1 | 動作秒 | export const AFFIX24 = { tier: 2, list: [{ id: 'xun', name: '迅', cd: 0.94 }, { id: 'jin', name: '勁', dmg: 1.06 }, { id: 'mian', name: '綿', dmg: 1.03, cd: 0.97 }] }; |
| src/arts.mjs:834:cd:2 | 動作秒 | export const AFFIX24 = { tier: 2, list: [{ id: 'xun', name: '迅', cd: 0.94 }, { id: 'jin', name: '勁', dmg: 1.06 }, { id: 'mian', name: '綿', dmg: 1.03, cd: 0.97 }] }; |
| src/arts.mjs:1184:windIn:1 | 動作秒 | windIn: 0.5, windHua: 0.2,                 /* 前搖佔冷卻：入門 0.5、化境 0.2，中間照火候線性 */ |
| src/arts.mjs:1184:windHua:2 | 動作秒 | windIn: 0.5, windHua: 0.2,                 /* 前搖佔冷卻：入門 0.5、化境 0.2，中間照火候線性 */ |
| src/arts.mjs:1185:monWind:1 | 動作秒 | monWind: 0.45,                             /* 鼠、野豬的前搖佔牠的冷卻 */ |
| src/arts.mjs:1186:regenDelay:1 | 動作秒 | post: { d: 100, rat: 30, boar: 70, bandit: 60, def: 50 }, regenDelay: 2.5, regen: 12, |
| src/arts.mjs:1186:regen:2 | 動作秒 | post: { d: 100, rat: 30, boar: 70, bandit: 60, def: 50 }, regenDelay: 2.5, regen: 12, |
| src/arts.mjs:1190:reaction:1 | 動作秒 | time: { reaction: 0.36, insight: 30, tier: 0.6, agility: 50, depthHalf: 10, wuHalf: 10, strike: 0.55, strikeTier: 0.4, step: 0.26, guard: 0.1, jitter: 0.25, fret: 0.6, counterForce: 0.5, parryRecover: 0.2, hitRecover: 0. |
| src/arts.mjs:1247:windSpeed:1 | 動作秒 | speed: 20, tierSpeed: 5, quickSpeed: 18, windSpeed: 5, minWind: 0.1, windSpeedMax: 18, |
| src/arts.mjs:1247:minWind:2 | 動作秒 | speed: 20, tierSpeed: 5, quickSpeed: 18, windSpeed: 5, minWind: 0.1, windSpeedMax: 18, |
| src/arts.mjs:1247:windSpeedMax:3 | 動作秒 | speed: 20, tierSpeed: 5, quickSpeed: 18, windSpeed: 5, minWind: 0.1, windSpeedMax: 18, |
| src/arts.mjs:1280:ttl:1 | 動作秒 | if (s) { (s.fx \|\|= []).push({ kind: 'clash', word: '斷', color: '#ffb05a', pos: [...(def.pos \|\| [0, 0])], ttl: 0.8 }); s.breakN = (s.breakN \|\| 0) + 1; } |
| src/arts.mjs:1391:ttl:1 | 動作秒 | if (s) (s.fx \|\|= []).push({ kind: 'dash', from, to: [...def.pos], ttl: 0.35, color: '#cfe0f5' }); |
| src/arts.mjs:1483:windowBase:1 | 動作秒 | export const WITCH = { windowBase: 0.05, windowGain: 0.2, agilityHalf: 80, strain: 0.7, wu: 3, r: 80, k: 0.3, dur: 1, cool: 4, crossAgi: 40, crossGap: 0.3, crossP: 0.3, crossDrop: 25 }; |
| src/arts.mjs:1483:windowGain:2 | 動作秒 | export const WITCH = { windowBase: 0.05, windowGain: 0.2, agilityHalf: 80, strain: 0.7, wu: 3, r: 80, k: 0.3, dur: 1, cool: 4, crossAgi: 40, crossGap: 0.3, crossP: 0.3, crossDrop: 25 }; |
| src/arts.mjs:1483:dur:3 | 動作秒 | export const WITCH = { windowBase: 0.05, windowGain: 0.2, agilityHalf: 80, strain: 0.7, wu: 3, r: 80, k: 0.3, dur: 1, cool: 4, crossAgi: 40, crossGap: 0.3, crossP: 0.3, crossDrop: 25 }; |
| src/arts.mjs:1483:cool:4 | 動作秒 | export const WITCH = { windowBase: 0.05, windowGain: 0.2, agilityHalf: 80, strain: 0.7, wu: 3, r: 80, k: 0.3, dur: 1, cool: 4, crossAgi: 40, crossGap: 0.3, crossP: 0.3, crossDrop: 25 }; |
| src/arts.mjs:1483:crossGap:5 | 動作秒 | export const WITCH = { windowBase: 0.05, windowGain: 0.2, agilityHalf: 80, strain: 0.7, wu: 3, r: 80, k: 0.3, dur: 1, cool: 4, crossAgi: 40, crossGap: 0.3, crossP: 0.3, crossDrop: 25 }; |
| src/arts.mjs:1509:cool:1 | 動作秒 | dugu: { char: '破', rule: '觀破即截', reach: 70, drop: 40, cool: 2, insight: 30 }, |
| src/arts.mjs:1510:wind:1 | 動作秒 | taiji: { char: '圓', rule: '圓轉卸力', r: 60, wind: 1.5, cool: 3 }, |
| src/arts.mjs:1510:cool:2 | 動作秒 | taiji: { char: '圓', rule: '圓轉卸力', r: 60, wind: 1.5, cool: 3 }, |
| src/arts.mjs:1511:wind:1 | 動作秒 | taijiSword: { char: '圓', rule: '圓轉卸力', r: 60, wind: 1.5, cool: 3 }, |
| src/arts.mjs:1511:cool:2 | 動作秒 | taijiSword: { char: '圓', rule: '圓轉卸力', r: 60, wind: 1.5, cool: 3 }, |
| src/arts.mjs:1513:regen:1 | 動作秒 | jiuyang: { char: '陽', rule: '挨打自震', need: 3, shock: 30, regen: 3, cap: 0.7 }, |
| src/arts.mjs:1530:ttl:1 | 動作秒 | (s.fx \|\|= []).push({ kind: 'stamp', char: z.char, pos: [...(d.pos \|\| [0, 0])], ttl: 1.4 }); |
| src/arts.mjs:1546:ttl:1 | 動作秒 | (s.fx \|\|= []).push({ kind: 'cut', from: [...d.pos], to: [...m.pos], ttl: 0.5 }); zjMark(s, d, 'dugu'); zjCount(s, 'duguCut'); |
| src/arts.mjs:1555:days:1 | 生理日 | export const PART = { days: 3, hand: 1.3, where: ['eye', 'hand', 'body'], name: { eye: '目', hand: '手', body: '身' }, what: { eye: '看不清來招', hand: '出手慢了半拍', body: '內息回不上來' } }; |
| src/arts.mjs:1580:nameGap:1 | 動作秒 | export const FLAIR = { nameGap: 2, nameTtl: 1.2, dash: { tier: 3, minRange: 50, add: 30 }, hua: 4, readK: 0.5 }; |
| src/arts.mjs:1580:nameTtl:2 | 動作秒 | export const FLAIR = { nameGap: 2, nameTtl: 1.2, dash: { tier: 3, minRange: 50, add: 30 }, hua: 4, readK: 0.5 }; |
| src/audio.mjs:15:delay:1 | 動作秒 | breakthrough: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5, { type: 'sine', vol: 0.18, delay: i * 0.09 })); noise(0.8, { vol: 0.08, freq: 3000, delay: 0.3 }); }, |
| src/audio.mjs:17:delay:1 | 動作秒 | unlock: () => { tone(880, 0.15, { vol: 0.15 }); tone(1320, 0.25, { vol: 0.12, delay: 0.1 }); }, |
| src/audio.mjs:25:delay:1 | 動作秒 | const bird = setInterval(() => { if (!muted && Math.random() < 0.5) { tone(2400, 0.08, { vol: 0.05, slide: 600 }); tone(2800, 0.08, { vol: 0.05, slide: -500, delay: 0.12 }); } }, 7000); |
| src/bonds.mjs:41:dur:1 | 生理日 | export const PASS = { minTier: 3, gain: 0, apprBonus: 0, aff: 6, dur: 20, base: 60, pairDays: 2, sat: 0.3, perDay: 2, why: '傳功' }; /* 舊活動只供舊任務讀取，不再直接給熟練 */ |
| src/bonds.mjs:41:pairDays:2 | 生理日 | export const PASS = { minTier: 3, gain: 0, apprBonus: 0, aff: 6, dur: 20, base: 60, pairDays: 2, sat: 0.3, perDay: 2, why: '傳功' }; /* 舊活動只供舊任務讀取，不再直接給熟練 */ |
| src/bonds.mjs:41:perDay:3 | 生理日 | export const PASS = { minTier: 3, gain: 0, apprBonus: 0, aff: 6, dur: 20, base: 60, pairDays: 2, sat: 0.3, perDay: 2, why: '傳功' }; /* 舊活動只供舊任務讀取，不再直接給熟練 */ |
| src/bonds.mjs:79:session:1 | 生理日 | export const TEACH_ART = { aff: 60, mul: 1.4, minTier: 3, normalTier: 2, session: DAY / 2 }; |
| src/combat-space.mjs:2:physical scale:1 | 地圖尺度 | export const RING = { engage: 44 /* 佔了近戰位的獸，對手滑步走開也會追上去，不趁機溜下山 */, slots: 4, outer: 50, win: 1.2, step: 24, leash: 40 }; |
| src/contact.mjs:5:recoveryDelay:1 | 動作秒 | export const BODY_MECHANICS={mass:70,averageAdultSkill:10,balance:100,balanceRecovery:12,recoveryDelay:2.5,openSeconds:BODY_TIMING.reaction+BODY_TIMING.recovery+BODY_TIMING.step,painLimit:100,painRecovery:1}; |
| src/contact.mjs:39:ttl:1 | 動作秒 | if(force>0)(s.fx??=[]).push({kind:'contact',at:s.t,ttl:1,force,nearby,attacker:a.uid\|\|a.id\|\|a.k,defender:t.uid\|\|t.id\|\|t.k,from:[...(a.pos\|\|[0,0])],to:[...(t.pos\|\|[0,0])]}); |
| src/data.mjs:78:day:1 | 生理日 | guojing: { day: 2, title: '洪七公聞香而來', text: '一個背酒葫蘆的老叫化在門口嗅了嗅：「好香！誰燒的菜？」', opts: [['請他吃一頓，好好招待', { xia: 5, qing: 5 }, 'hong'], ['門派窮，請他離開', { sect: 5, xia: -5 }, null]] }, |
| src/data.mjs:79:day:1 | 生理日 | weixiaobao: { day: 2, title: '天地會來人', text: '一個自稱天地會的漢子塞給你一塊令牌：「香主，總舵主有請。」', opts: [['收下令牌，兩頭都賺', { free: 5, fame: 5 }, 'tdh'], ['裝傻推掉', { free: 3 }, null]] }, |
| src/data.mjs:80:day:1 | 生理日 | linghuchong: { day: 2, title: '思過崖的老人', text: '後山崖洞裡似乎有人。洞壁刻著五嶽劍法和破法。', opts: [['進洞看個究竟', { wu: 5, free: 5 }, 'feng'], ['不去，喝酒', { free: 5 }, null]] }, |
| src/data.mjs:81:day:1 | 生理日 | yuebuqun: { day: 2, title: '林平之上山投靠', text: '福威鏢局的少鏢頭林平之跪在門口，身上帶著家傳劍譜的傳聞。', opts: [['收他入門（君子之風）', { fame: 5, xia: 5 }, 'lin'], ['不收，免惹麻煩', { sect: 5, xia: -5 }, null]] }, |
| src/data.mjs:82:day:1 | 生理日 | zhangwuji: { day: 2, title: '明教殘部求救', text: '幾個明教弟子帶著傷來求醫：「六大派正在圍剿光明頂……」', opts: [['收留醫治', { qing: 5, xia: 5 }, 'mj'], ['正派會不滿，婉拒', { sect: 5, qing: -5 }, null]] }, |
| src/data.mjs:83:day:1 | 生理日 | axing: { day: 2, title: '豬籠城寨的包租婆', text: '你想冒充斧頭幫去收保護費，迎面撞上叼著菸的包租婆。', opts: [['硬著頭皮詐她', { fame: 5, xia: -5 }, 'zhulong'], ['腳底抹油', { free: 5 }, null]] }, |
| src/data.mjs:194:dur:1 | 動作秒 | rest:   { name: '歇息', dur: 10, pose: 'sit', need: { energy: 'rate' } }, |
| src/data.mjs:195:dur:1 | 動作秒 | eat:    { name: '用飯', dur: 5, pose: 'sit', use: { food: 1 }, need: { hunger: 60 } }, |
| src/data.mjs:196:dur:1 | 動作秒 | farm:   { name: '種菜', dur: 8, pose: 'crouch', energy: -8, skill: { farming: 6 } }, |
| src/data.mjs:197:dur:1 | 動作秒 | cook:   { name: '煮飯', dur: 0, pose: 'sit', energy: -3, skill: { cooking: 6 } }, |
| src/data.mjs:198:dur:1 | 動作秒 | forage: { name: '採藥', dur: 8, pose: 'pick', energy: -6, skill: { herbal: 6 }, carry: { herb: 1 } }, |
| src/data.mjs:199:dur:1 | 動作秒 | cliffForage1: { name: '低崖採靈草', dur: 8, pose: 'pick', energy: -6, skill: { herbal: 6 }, carry: { herb: 2, beeJelly: 1 } }, |
| src/data.mjs:200:dur:1 | 動作秒 | cliffTrain: { name: '試劍崖練功', dur: 10, pose: 'stand', energy: -10, skill: { style: 5 } }, |
| src/data.mjs:201:dur:1 | 動作秒 | cliffWater: { name: '寒潭挑靈泉', dur: 8, pose: 'carry', energy: -7, skill: { strength: 4 }, carry: { coldWater: 1 } }, |
| src/data.mjs:202:dur:1 | 動作秒 | waterfallTrain: { name: '飛瀑練體', dur: 10, pose: 'stand', energy: -10, skill: { style: 5 } }, |
| src/data.mjs:203:dur:1 | 動作秒 | cliffComprehend: { name: '絕頂參悟石刻', dur: 12, pose: 'sit', energy: -8 }, |
| src/data.mjs:204:dur:1 | 動作秒 | quarry: { name: '採石', dur: 10, pose: 'chop', energy: -9, skill: { strength: 6 }, carry: { stone: 1 } }, |
| src/data.mjs:205:dur:1 | 動作秒 | chop:   { name: '砍柴', dur: 8, pose: 'chop', energy: -8, skill: { strength: 5 }, carry: { wood: 1 } }, |
| src/data.mjs:206:dur:1 | 動作秒 | train:  { name: '練功', dur: 10, pose: 'stand', energy: -10, skill: { style: 5 } }, |
| src/data.mjs:207:dur:1 | 動作秒 | meditate: { name: '打坐衝關', dur: 12, pose: 'sit', energy: -8 }, |
| src/data.mjs:208:dur:1 | 動作秒 | spar:   { name: '切磋', dur: 8, pose: 'stand', energy: -10, skill: { style: 4 } }, |
| src/data.mjs:209:dur:1 | 動作秒 | learn:  { name: '聽師父講武', dur: 8, pose: 'sit', energy: -2, skill: { palm: 3 }, social: 10 }, |
| src/data.mjs:210:dur:1 | 動作秒 | build:  { name: '施工', dur: 6, pose: 'carry', energy: -6, skill: { strength: 2 } }, |
| src/data.mjs:211:dur:1 | 動作秒 | chat:   { name: '聊天', dur: 6, pose: 'sit', social: 35, fun: 20 }, |
| src/data.mjs:212:dur:1 | 動作秒 | encourage: { name: '鼓勵同門', dur: 6, pose: 'stand', social: 20 }, |
| src/data.mjs:213:dur:1 | 動作秒 | leisure: { name: '閒坐看雲', dur: 8, pose: 'sit', fun: 45, energy: 3 }, |
| src/data.mjs:214:dur:1 | 動作秒 | deliver: { name: '送回院倉', dur: 0, pose: 'carry' }, |
| src/data.mjs:215:dur:1 | 動作秒 | defend: { name: '守柵迎敵', dur: 6, pose: 'stand', energy: -8, skill: { style: 1 } }, |
| src/data.mjs:216:dur:1 | 動作秒 | foray: { name: '後山出獵', dur: 0, pose: 'walk' }, |
| src/data.mjs:217:dur:1 | 動作秒 | patrol: { name: '巡山練招', dur: 0, pose: 'walk' }, |
| src/data.mjs:218:dur:1 | 動作秒 | repair: { name: '修柵', dur: 8, pose: 'chop', energy: -6, skill: { strength: 2 } }, |
| src/data.mjs:225:cd:1 | 動作秒 | { id: 'fist', skill: 'palm', name: '基礎拳', req: 0, range: 34, cd: 1.0, dmg: 4, aoe: 0, color: '#8a6a4a' }, |
| src/data.mjs:226:cd:1 | 動作秒 | { id: 'push', skill: 'palm', name: '推山掌', req: 25, range: 60, cd: 1.6, dmg: 8, aoe: 0, color: '#b0482e' }, |
| src/data.mjs:227:cd:1 | 動作秒 | { id: 'wave', skill: 'palm', name: '迴風掌', req: 60, range: 80, cd: 3.0, dmg: 7, aoe: 70, color: '#3d6b8a' }, |
| src/data.mjs:228:cd:1 | 動作秒 | { id: 'kick', skill: 'leg', name: '掃堂腿', req: 20, range: 40, cd: 1.4, dmg: 6, aoe: 40, color: '#6b8a3d' }, |
| src/data.mjs:229:cd:1 | 動作秒 | { id: 'whirl', skill: 'leg', name: '旋風腿', req: 50, range: 55, cd: 2.4, dmg: 9, aoe: 60, color: '#8a3d7a' }, |
| src/data.mjs:230:cd:1 | 動作秒 | { id: 'storm', skill: 'palm', name: '風雷掌腿', req: 999, range: 90, cd: 3.4, dmg: 14, aoe: 90, color: '#c9a227' }, |
| src/data.mjs:232:cd:1 | 動作秒 | { id: 'fist2', skill: 'palm', name: '連環拳', req: 999, range: 36, cd: 0.8, dmg: 5, aoe: 0, color: '#9a7a5a' }, |
| src/data.mjs:233:cd:1 | 動作秒 | { id: 'fist3', skill: 'palm', name: '崩拳', req: 999, range: 38, cd: 1.6, dmg: 9, aoe: 30, color: '#7a5a3a' }, |
| src/data.mjs:234:cd:1 | 動作秒 | { id: 'push2', skill: 'palm', name: '排雲推手', req: 999, range: 70, cd: 1.8, dmg: 10, aoe: 0, color: '#c0583e' }, |
| src/data.mjs:235:cd:1 | 動作秒 | { id: 'push3', skill: 'palm', name: '開山掌', req: 999, range: 64, cd: 2.4, dmg: 13, aoe: 50, color: '#a0381e' }, |
| src/data.mjs:236:cd:1 | 動作秒 | { id: 'wave2', skill: 'palm', name: '回風拂柳', req: 999, range: 84, cd: 2.8, dmg: 8, aoe: 80, color: '#4d7b9a' }, |
| src/data.mjs:237:cd:1 | 動作秒 | { id: 'wave3', skill: 'palm', name: '狂風捲', req: 999, range: 90, cd: 3.6, dmg: 10, aoe: 100, color: '#2d5b7a' }, |
| src/data.mjs:238:cd:1 | 動作秒 | { id: 'kick2', skill: 'leg', name: '掃葉腿', req: 999, range: 44, cd: 1.5, dmg: 7, aoe: 50, color: '#7b9a4d' }, |
| src/data.mjs:239:cd:1 | 動作秒 | { id: 'kick3', skill: 'leg', name: '鐵掃帚', req: 999, range: 46, cd: 2.0, dmg: 10, aoe: 60, color: '#5b7a2d' }, |
| src/data.mjs:240:cd:1 | 動作秒 | { id: 'whirl2', skill: 'leg', name: '連環旋踢', req: 999, range: 58, cd: 2.4, dmg: 10, aoe: 65, color: '#9a4d8a' }, |
| src/data.mjs:241:cd:1 | 動作秒 | { id: 'whirl3', skill: 'leg', name: '龍捲腿', req: 999, range: 62, cd: 3.0, dmg: 13, aoe: 80, color: '#7a2d6a' }, |
| src/data.mjs:242:cd:1 | 動作秒 | { id: 'storm2', skill: 'palm', name: '風捲雷鳴', req: 999, range: 95, cd: 3.4, dmg: 16, aoe: 95, color: '#d9b237' }, |
| src/data.mjs:243:cd:1 | 動作秒 | { id: 'storm3', skill: 'palm', name: '雷動九天', req: 999, range: 100, cd: 4.0, dmg: 20, aoe: 110, color: '#e9c247' }, |
| src/data.mjs:268:BASE_SPEED:1 | 動作秒 | export const BASE_SPEED = 55; |
| src/data.mjs:271:DAY:1 | 生理日 | export const DAY = 600; |
| src/data.mjs:272:PHASES:1 | 生理日 | export const PHASES = [[0, 'dawn', '晨'], [0.2, 'day', '日'], [0.65, 'dusk', '暮'], [0.8, 'night', '夜']]; |
| src/data.mjs:282:PLOT_GROW:1 | 動作秒 | export const PLOT_GROW = 90; |
| src/data.mjs:286:regen:1 | 動作秒 | export const ECO = { dog: { start: 5, max: 8, regen: 90 }, rat: { start: 6, max: 8, regen: 50 }, boar: { start: 2, max: 3, regen: 150 } }; |
| src/data.mjs:286:regen:2 | 動作秒 | export const ECO = { dog: { start: 5, max: 8, regen: 90 }, rat: { start: 6, max: 8, regen: 50 }, boar: { start: 2, max: 3, regen: 150 } }; |
| src/data.mjs:286:regen:3 | 動作秒 | export const ECO = { dog: { start: 5, max: 8, regen: 90 }, rat: { start: 6, max: 8, regen: 50 }, boar: { start: 2, max: 3, regen: 150 } }; |
| src/data.mjs:299:RAID_EVERY:1 | 動作秒 | export const RAID_EVERY = 160; |
| src/data.mjs:300:WAVE_GAP:1 | 動作秒 | export const HUNT_WAVES = 3, WAVE_GAP = 6; |
| src/data.mjs:310:age:1 | 成長年 | { id: 'guojing', name: '郭靖', adult: false, age: 13, child: { since: 0, parents: [] }, youngHero: true, sprite: 'cousin', style: 'leg', skills: { leg: 8, palm: 2, strength: 14, farming: 4, herbal: 2, agility: 8, cooking:  |
| src/data.mjs:331:ttl:1 | 動作秒 | recordSect: { text: '本門巡山走出新紀錄', v: 5, ttl: 600, tag: 'good' }, |
| src/data.mjs:332:ttl:1 | 動作秒 | recordSelf: { text: '巡山走得比上次更遠', v: 4, ttl: 500, tag: 'good' }, |
| src/data.mjs:333:ttl:1 | 動作秒 | likeFood:  { text: '今天的菜正合胃口', v: 4, ttl: 300, tag: 'good' }, |
| src/data.mjs:334:ttl:1 | 動作秒 | likeDrink: { text: '喝到愛喝的', v: 3, ttl: 300, tag: 'good' }, |
| src/data.mjs:335:ttl:1 | 動作秒 | forcedStyle:{ text: '被巡山令逼著照別人的路子走', v: -6, ttl: 400, tag: 'bad' }, |
| src/data.mjs:336:ttl:1 | 動作秒 | quarrel:   { text: '巡山時跟人吵了一架', v: -5, ttl: 300, tag: 'social' }, |
| src/data.mjs:337:ttl:1 | 動作秒 | xiaJoin:   { text: '名俠入門，門派有了底氣', v: 6, ttl: 600, tag: 'good' }, |
| src/data.mjs:338:ttl:1 | 動作秒 | xiaTaught: { text: '得名師親傳絕學', v: 15, ttl: 900, tag: 'good' }, |
| src/data.mjs:339:ttl:1 | 動作秒 | jealous:   { text: '首徒的劍比我快……（嫉）', v: -10, ttl: 900, tag: 'bad' }, |
| src/data.mjs:340:ttl:1 | 動作秒 | bixieShock:{ text: '掌門變了個人，陰陽怪氣', v: -8, ttl: 1800, tag: 'bad' }, |
| src/data.mjs:341:ttl:1 | 動作秒 | zixiaUp:   { text: '紫霞神功又進一層', v: 8, ttl: 600, tag: 'good' }, |
| src/data.mjs:342:ttl:1 | 動作秒 | duguGot:   { text: '劍隨意走，無招勝有招', v: 12, ttl: 900, tag: 'good' }, |
| src/data.mjs:343:ttl:1 | 動作秒 | aspDone:   { text: '志向得償', v: 12, ttl: 900, tag: 'good' }, |
| src/data.mjs:344:ttl:1 | 動作秒 | expHurt:   { text: '巡山掛了彩', v: -8, ttl: 400, tag: 'fight' }, |
| src/data.mjs:345:ttl:1 | 動作秒 | raidHurt:  { text: '守山門被山賊打成重傷', v: -10, ttl: 500, tag: 'fight' }, |
| src/data.mjs:346:ttl:1 | 動作秒 | rageSpent: { text: '剛才被纏得惱羞，氣息未平', v: -4, ttl: 300, tag: 'fight' }, |
| src/data.mjs:347:ttl:1 | 動作秒 | btFail:    { text: '衝關失敗，氣血翻湧', v: -5, ttl: 300, tag: 'bad' }, |
| src/data.mjs:348:ttl:1 | 動作秒 | btWin:     { text: '衝破瓶頸！', v: 18, ttl: 500, tag: 'good' }, |
| src/data.mjs:349:ttl:1 | 動作秒 | learned:   { text: '學會了新招', v: 15, ttl: 400, tag: 'good' }, |
| src/data.mjs:350:ttl:1 | 動作秒 | goodChat:  { text: '和人聊得開心', v: 6, ttl: 150, tag: 'social' }, |
| src/data.mjs:351:ttl:1 | 動作秒 | epiphany:  { text: '豁然開朗，悟了一門功夫', v: 10, ttl: 300, tag: 'good' }, |
| src/data.mjs:352:ttl:1 | 動作秒 | admire:    { text: '仰慕對方的功夫', v: 4, ttl: 200, tag: 'social' }, |
| src/data.mjs:353:ttl:1 | 動作秒 | bedSleep:  { text: '睡在床上', v: 5, ttl: 300, tag: 'good' }, |
| src/data.mjs:354:ttl:1 | 動作秒 | floorSleep:{ text: '睡破地鋪', v: -5, ttl: 300, tag: 'bad' }, |
| src/data.mjs:355:ttl:1 | 動作秒 | hallMeal:  { text: '在膳房吃了熱飯', v: 6, ttl: 200, tag: 'food' }, |
| src/data.mjs:356:ttl:1 | 動作秒 | mealPair:  { text: '和要好的人一起吃飯', v: 4, ttl: 200, tag: 'social' }, |
| src/data.mjs:357:ttl:1 | 動作秒 | fedBy:     { text: '忙到一半有人送飯來', v: 6, ttl: 300, tag: 'good' }, |
| src/data.mjs:358:ttl:1 | 動作秒 | sheltered: { text: '柵破時躲進屋裡，嚇得不輕', v: -3, ttl: 200, tag: 'bad' }, |
| src/data.mjs:359:ttl:1 | 動作秒 | hurt:      { text: '狩獵受傷', v: -12, ttl: 400, tag: 'fight' }, |
| src/data.mjs:360:ttl:1 | 動作秒 | wonHunt:   { text: '守住了後山', v: 8, ttl: 300, tag: 'good' }, |
| src/data.mjs:361:ttl:1 | 動作秒 | cropLost:  { text: '菜被野豬拱了', v: -5, ttl: 200, tag: 'bad' }, |
| src/data.mjs:362:ttl:1 | 動作秒 | cropLostLite: { text: '聽說菜被野豬拱了', v: -2, ttl: 200, tag: 'bad' }, /* loop47 cropcare：不種菜的人只聽說 */ |
| src/data.mjs:363:ttl:1 | 動作秒 | encouraged:{ text: '被同門鼓勵', v: 12, ttl: 300, tag: 'social' }, |
| src/data.mjs:364:ttl:1 | 動作秒 | helped:    { text: '幫人打了氣', v: 4, ttl: 200, tag: 'good' }, |
| src/data.mjs:365:ttl:1 | 動作秒 | badChat:   { text: '話不投機', v: -4, ttl: 150, tag: 'social' }, |
| src/data.mjs:366:ttl:1 | 動作秒 | newLook:   { text: '門派有了新氣象', v: 8, ttl: 600, tag: 'good' }, |
| src/data.mjs:367:ttl:1 | 動作秒 | wellFed:   { text: '存糧充足，心裡踏實', v: 4, ttl: 300, tag: 'food' }, |
| src/data.mjs:368:ttl:1 | 動作秒 | idled:     { text: '偷得浮生半日閒', v: 5, ttl: 200, tag: 'good' }, |
| src/data.mjs:369:ttl:1 | 動作秒 | paid:      { text: '領了工錢', v: 4, ttl: 300, tag: 'good' }, |
| src/data.mjs:370:ttl:1 | 動作秒 | unpaid:    { text: '工錢沒著落', v: -10, ttl: 600, tag: 'bad' }, |
| src/data.mjs:371:ttl:1 | 動作秒 | invited:   { text: '被邀入門', v: 15, ttl: 600, tag: 'good' }, |
| src/data.mjs:372:ttl:1 | 動作秒 | quotaMet:  { text: '日課做完了', v: 4, ttl: 300, tag: 'good' }, |
| src/data.mjs:373:ttl:1 | 動作秒 | quotaMiss: { text: '日課沒做完', v: -6, ttl: 400, tag: 'bad' }, |
| src/data.mjs:374:ttl:1 | 動作秒 | promoted:  { text: '升入內門', v: 18, ttl: 800, tag: 'good' }, |
| src/data.mjs:375:ttl:1 | 動作秒 | trialFail: { text: '入內門考核沒過', v: -8, ttl: 400, tag: 'bad' }, |
| src/data.mjs:376:ttl:1 | 動作秒 | headDisc:  { text: '成了首徒', v: 15, ttl: 800, tag: 'good' }, |
| src/data.mjs:377:ttl:1 | 動作秒 | workedWith:{ text: '和人一起幹活', v: 3, ttl: 200, tag: 'social' }, |
| src/data.mjs:388:SEASON_DAYS:1 | 生理日 | export const SEASON_DAYS = 7; |
| src/data.mjs:403:REVEAL_AT:1 | 動作秒 | export const REVEAL_AT = [0, 300, 900]; |
| src/data.mjs:444:cooldown:1 | 動作秒 | export const PROMOTE = { rootMin: 3, contrib: 6, pass: 30, cooldown: 1 }; |
| src/data.mjs:489:cd:1 | 動作秒 | { id: 'hb1', skill: 'palm', name: '寒冰掌勁', req: 0, range: 50, cd: 1.6, dmg: 18, aoe: 0, color: '#9fd8f0' }, { id: 'hb2', skill: 'palm', name: '冰封千里', req: 0, range: 50, cd: 2.6, dmg: 22, aoe: 50, color: '#c8f0ff' }, |
| src/data.mjs:489:cd:2 | 動作秒 | { id: 'hb1', skill: 'palm', name: '寒冰掌勁', req: 0, range: 50, cd: 1.6, dmg: 18, aoe: 0, color: '#9fd8f0' }, { id: 'hb2', skill: 'palm', name: '冰封千里', req: 0, range: 50, cd: 2.6, dmg: 22, aoe: 50, color: '#c8f0ff' }, |
| src/data.mjs:490:cd:1 | 動作秒 | { id: 'lf1', skill: 'palm', name: '流風', req: 0, range: 58, cd: 0.9, dmg: 11, aoe: 0, color: '#d8e8f8' }, { id: 'lf2', skill: 'palm', name: '迴雪', req: 0, range: 58, cd: 1.3, dmg: 15, aoe: 30, color: '#f0f8ff' }, |
| src/data.mjs:490:cd:2 | 動作秒 | { id: 'lf1', skill: 'palm', name: '流風', req: 0, range: 58, cd: 0.9, dmg: 11, aoe: 0, color: '#d8e8f8' }, { id: 'lf2', skill: 'palm', name: '迴雪', req: 0, range: 58, cd: 1.3, dmg: 15, aoe: 30, color: '#f0f8ff' }, |
| src/data.mjs:491:cd:1 | 動作秒 | { id: 'fg1', skill: 'palm', name: '腐骨', req: 0, range: 44, cd: 1.3, dmg: 15, aoe: 0, color: '#6a8a3a' }, { id: 'fg2', skill: 'palm', name: '抽髓', req: 0, range: 44, cd: 2.0, dmg: 20, aoe: 0, color: '#4a6a2a' }, |
| src/data.mjs:491:cd:2 | 動作秒 | { id: 'fg1', skill: 'palm', name: '腐骨', req: 0, range: 44, cd: 1.3, dmg: 15, aoe: 0, color: '#6a8a3a' }, { id: 'fg2', skill: 'palm', name: '抽髓', req: 0, range: 44, cd: 2.0, dmg: 20, aoe: 0, color: '#4a6a2a' }, |
| src/data.mjs:492:cd:1 | 動作秒 | { id: 'qkb1', skill: 'palm', name: '霸刀斬', req: 0, range: 54, cd: 1.8, dmg: 20, aoe: 30, color: '#c86a3a' }, { id: 'qkb2', skill: 'palm', name: '乾坤一擲', req: 0, range: 60, cd: 2.8, dmg: 26, aoe: 60, color: '#e88a4a' }, |
| src/data.mjs:492:cd:2 | 動作秒 | { id: 'qkb1', skill: 'palm', name: '霸刀斬', req: 0, range: 54, cd: 1.8, dmg: 20, aoe: 30, color: '#c86a3a' }, { id: 'qkb2', skill: 'palm', name: '乾坤一擲', req: 0, range: 60, cd: 2.8, dmg: 26, aoe: 60, color: '#e88a4a' }, |
| src/data.mjs:543:cd:1 | 動作秒 | { id: 'em1', skill: 'palm', name: '金頂佛光', req: 0, range: 46, cd: 1.0, dmg: 7, aoe: 0, color: '#c8a8c8' }, { id: 'em2', skill: 'palm', name: '峨眉刺', req: 0, range: 50, cd: 1.4, dmg: 10, aoe: 0, color: '#b898b8' }, |
| src/data.mjs:543:cd:2 | 動作秒 | { id: 'em1', skill: 'palm', name: '金頂佛光', req: 0, range: 46, cd: 1.0, dmg: 7, aoe: 0, color: '#c8a8c8' }, { id: 'em2', skill: 'palm', name: '峨眉刺', req: 0, range: 50, cd: 1.4, dmg: 10, aoe: 0, color: '#b898b8' }, |
| src/data.mjs:544:cd:1 | 動作秒 | { id: 'hf1', skill: 'palm', name: '回風', req: 0, range: 58, cd: 1.1, dmg: 13, aoe: 0, color: '#d8c8e8' }, { id: 'hf2', skill: 'palm', name: '拂柳', req: 0, range: 62, cd: 1.8, dmg: 19, aoe: 40, color: '#c8b8d8' }, |
| src/data.mjs:544:cd:2 | 動作秒 | { id: 'hf1', skill: 'palm', name: '回風', req: 0, range: 58, cd: 1.1, dmg: 13, aoe: 0, color: '#d8c8e8' }, { id: 'hf2', skill: 'palm', name: '拂柳', req: 0, range: 62, cd: 1.8, dmg: 19, aoe: 40, color: '#c8b8d8' }, |
| src/data.mjs:545:cd:1 | 動作秒 | { id: 'jd1', skill: 'palm', name: '綿掌', req: 0, range: 40, cd: 1.3, dmg: 11, aoe: 0, color: '#d8b8c8' }, { id: 'jd2', skill: 'palm', name: '金頂迎風', req: 0, range: 46, cd: 1.9, dmg: 14, aoe: 30, color: '#c8a8b8' }, |
| src/data.mjs:545:cd:2 | 動作秒 | { id: 'jd1', skill: 'palm', name: '綿掌', req: 0, range: 40, cd: 1.3, dmg: 11, aoe: 0, color: '#d8b8c8' }, { id: 'jd2', skill: 'palm', name: '金頂迎風', req: 0, range: 46, cd: 1.9, dmg: 14, aoe: 30, color: '#c8a8b8' }, |
| src/data.mjs:546:cd:1 | 動作秒 | { id: 'tg1', skill: 'palm', name: '點穴', req: 0, range: 40, cd: 1.1, dmg: 10, aoe: 0, color: '#a898c8' }, { id: 'tg2', skill: 'palm', name: '天罡封脈', req: 0, range: 44, cd: 1.7, dmg: 13, aoe: 0, color: '#9888b8' }, |
| src/data.mjs:546:cd:2 | 動作秒 | { id: 'tg1', skill: 'palm', name: '點穴', req: 0, range: 40, cd: 1.1, dmg: 10, aoe: 0, color: '#a898c8' }, { id: 'tg2', skill: 'palm', name: '天罡封脈', req: 0, range: 44, cd: 1.7, dmg: 13, aoe: 0, color: '#9888b8' }, |
| src/data.mjs:547:cd:1 | 動作秒 | { id: 'jy1', skill: 'palm', name: '白骨爪', req: 0, range: 40, cd: 1.2, dmg: 18, aoe: 0, color: '#d8d8c0' }, { id: 'jy2', skill: 'palm', name: '九陰神爪', req: 0, range: 44, cd: 2.0, dmg: 26, aoe: 0, color: '#c8c8a8' }, |
| src/data.mjs:547:cd:2 | 動作秒 | { id: 'jy1', skill: 'palm', name: '白骨爪', req: 0, range: 40, cd: 1.2, dmg: 18, aoe: 0, color: '#d8d8c0' }, { id: 'jy2', skill: 'palm', name: '九陰神爪', req: 0, range: 44, cd: 2.0, dmg: 26, aoe: 0, color: '#c8c8a8' }, |
| src/data.mjs:548:cd:1 | 動作秒 | { id: 'wd1', skill: 'palm', name: '長拳', req: 0, range: 34, cd: 1.0, dmg: 6, aoe: 0, color: '#8aa0b8' }, { id: 'wd2', skill: 'palm', name: '真武沖拳', req: 0, range: 38, cd: 1.5, dmg: 9, aoe: 0, color: '#7a90a8' }, |
| src/data.mjs:548:cd:2 | 動作秒 | { id: 'wd1', skill: 'palm', name: '長拳', req: 0, range: 34, cd: 1.0, dmg: 6, aoe: 0, color: '#8aa0b8' }, { id: 'wd2', skill: 'palm', name: '真武沖拳', req: 0, range: 38, cd: 1.5, dmg: 9, aoe: 0, color: '#7a90a8' }, |
| src/data.mjs:549:cd:1 | 動作秒 | { id: 'ry1', skill: 'palm', name: '柔雲', req: 0, range: 54, cd: 1.4, dmg: 11, aoe: 0, color: '#c8d8e8' }, { id: 'ry2', skill: 'palm', name: '雲出岫', req: 0, range: 56, cd: 2.0, dmg: 14, aoe: 40, color: '#b8c8d8' }, |
| src/data.mjs:549:cd:2 | 動作秒 | { id: 'ry1', skill: 'palm', name: '柔雲', req: 0, range: 54, cd: 1.4, dmg: 11, aoe: 0, color: '#c8d8e8' }, { id: 'ry2', skill: 'palm', name: '雲出岫', req: 0, range: 56, cd: 2.0, dmg: 14, aoe: 40, color: '#b8c8d8' }, |
| src/data.mjs:550:cd:1 | 動作秒 | { id: 'tjs1', skill: 'palm', name: '三環套月', req: 0, range: 58, cd: 1.1, dmg: 13, aoe: 0, color: '#e0e0e0' }, { id: 'tjs2', skill: 'palm', name: '太極劍圈', req: 0, range: 62, cd: 1.9, dmg: 19, aoe: 50, color: '#d0d0d0' }, |
| src/data.mjs:550:cd:2 | 動作秒 | { id: 'tjs1', skill: 'palm', name: '三環套月', req: 0, range: 58, cd: 1.1, dmg: 13, aoe: 0, color: '#e0e0e0' }, { id: 'tjs2', skill: 'palm', name: '太極劍圈', req: 0, range: 62, cd: 1.9, dmg: 19, aoe: 50, color: '#d0d0d0' }, |
| src/data.mjs:551:cd:1 | 動作秒 | { id: 'ly1', skill: 'palm', name: '落英', req: 0, range: 48, cd: 1.3, dmg: 11, aoe: 0, color: '#e8a8b8' }, { id: 'ly2', skill: 'palm', name: '繽紛', req: 0, range: 52, cd: 1.9, dmg: 14, aoe: 40, color: '#d898a8' }, |
| src/data.mjs:551:cd:2 | 動作秒 | { id: 'ly1', skill: 'palm', name: '落英', req: 0, range: 48, cd: 1.3, dmg: 11, aoe: 0, color: '#e8a8b8' }, { id: 'ly2', skill: 'palm', name: '繽紛', req: 0, range: 52, cd: 1.9, dmg: 14, aoe: 40, color: '#d898a8' }, |
| src/data.mjs:552:cd:1 | 動作秒 | { id: 'lh1', skill: 'palm', name: '蘭花拂穴', req: 0, range: 42, cd: 1.0, dmg: 13, aoe: 0, color: '#c8a8d8' }, { id: 'lh2', skill: 'palm', name: '拈花', req: 0, range: 46, cd: 1.7, dmg: 19, aoe: 0, color: '#b898c8' }, |
| src/data.mjs:552:cd:2 | 動作秒 | { id: 'lh1', skill: 'palm', name: '蘭花拂穴', req: 0, range: 42, cd: 1.0, dmg: 13, aoe: 0, color: '#c8a8d8' }, { id: 'lh2', skill: 'palm', name: '拈花', req: 0, range: 46, cd: 1.7, dmg: 19, aoe: 0, color: '#b898c8' }, |
| src/data.mjs:553:cd:1 | 動作秒 | { id: 'yx1', skill: 'palm', name: '簫中劍', req: 0, range: 56, cd: 1.1, dmg: 13, aoe: 0, color: '#a8d8c8' }, { id: 'yx2', skill: 'palm', name: '碧海潮生', req: 0, range: 62, cd: 1.9, dmg: 19, aoe: 50, color: '#98c8b8' }, |
| src/data.mjs:553:cd:2 | 動作秒 | { id: 'yx1', skill: 'palm', name: '簫中劍', req: 0, range: 56, cd: 1.1, dmg: 13, aoe: 0, color: '#a8d8c8' }, { id: 'yx2', skill: 'palm', name: '碧海潮生', req: 0, range: 62, cd: 1.9, dmg: 19, aoe: 50, color: '#98c8b8' }, |
| src/data.mjs:554:cd:1 | 動作秒 | { id: 'tl1', skill: 'palm', name: '天羅', req: 0, range: 44, cd: 1.1, dmg: 10, aoe: 0, color: '#a8b8d0' }, { id: 'tl2', skill: 'palm', name: '地網', req: 0, range: 50, cd: 1.7, dmg: 13, aoe: 50, color: '#98a8c0' }, |
| src/data.mjs:554:cd:2 | 動作秒 | { id: 'tl1', skill: 'palm', name: '天羅', req: 0, range: 44, cd: 1.1, dmg: 10, aoe: 0, color: '#a8b8d0' }, { id: 'tl2', skill: 'palm', name: '地網', req: 0, range: 50, cd: 1.7, dmg: 13, aoe: 50, color: '#98a8c0' }, |
| src/data.mjs:555:cd:1 | 動作秒 | { id: 'ys1', skill: 'palm', name: '素心', req: 0, range: 56, cd: 1.0, dmg: 13, aoe: 0, color: '#e0e8f8' }, { id: 'ys2', skill: 'palm', name: '玉女投梭', req: 0, range: 60, cd: 1.8, dmg: 19, aoe: 30, color: '#d0d8f0' }, |
| src/data.mjs:555:cd:2 | 動作秒 | { id: 'ys1', skill: 'palm', name: '素心', req: 0, range: 56, cd: 1.0, dmg: 13, aoe: 0, color: '#e0e8f8' }, { id: 'ys2', skill: 'palm', name: '玉女投梭', req: 0, range: 60, cd: 1.8, dmg: 19, aoe: 30, color: '#d0d8f0' }, |
| src/data.mjs:556:cd:1 | 動作秒 | { id: 'cs1', skill: 'palm', name: '抽髓', req: 0, range: 40, cd: 1.3, dmg: 11, aoe: 0, color: '#6a9a4a' }, { id: 'cs2', skill: 'palm', name: '腐屍毒掌', req: 0, range: 44, cd: 1.9, dmg: 14, aoe: 30, color: '#5a8a3a' }, |
| src/data.mjs:556:cd:2 | 動作秒 | { id: 'cs1', skill: 'palm', name: '抽髓', req: 0, range: 40, cd: 1.3, dmg: 11, aoe: 0, color: '#6a9a4a' }, { id: 'cs2', skill: 'palm', name: '腐屍毒掌', req: 0, range: 44, cd: 1.9, dmg: 14, aoe: 30, color: '#5a8a3a' }, |
| src/data.mjs:557:cd:1 | 動作秒 | { id: 'sy1', skill: 'palm', name: '蜈蚣爪', req: 0, range: 40, cd: 1.0, dmg: 13, aoe: 0, color: '#7a8a3a' }, { id: 'sy2', skill: 'palm', name: '三陰絕戶', req: 0, range: 44, cd: 1.7, dmg: 19, aoe: 0, color: '#6a7a2a' }, |
| src/data.mjs:557:cd:2 | 動作秒 | { id: 'sy1', skill: 'palm', name: '蜈蚣爪', req: 0, range: 40, cd: 1.0, dmg: 13, aoe: 0, color: '#7a8a3a' }, { id: 'sy2', skill: 'palm', name: '三陰絕戶', req: 0, range: 44, cd: 1.7, dmg: 19, aoe: 0, color: '#6a7a2a' }, |
| src/data.mjs:558:cd:1 | 動作秒 | { id: 'bh1', skill: 'palm', name: '錯拳', req: 0, range: 38, cd: 1.2, dmg: 11, aoe: 0, color: '#5a9a6a' }, { id: 'bh2', skill: 'palm', name: '百花齊放', req: 0, range: 42, cd: 1.9, dmg: 14, aoe: 30, color: '#4a8a5a' }, |
| src/data.mjs:558:cd:2 | 動作秒 | { id: 'bh1', skill: 'palm', name: '錯拳', req: 0, range: 38, cd: 1.2, dmg: 11, aoe: 0, color: '#5a9a6a' }, { id: 'bh2', skill: 'palm', name: '百花齊放', req: 0, range: 42, cd: 1.9, dmg: 14, aoe: 30, color: '#4a8a5a' }, |
| src/data.mjs:559:cd:1 | 動作秒 | { id: 'yl1', skill: 'palm', name: '雲龍', req: 0, range: 54, cd: 1.3, dmg: 11, aoe: 0, color: '#7aba8a' }, { id: 'yl2', skill: 'palm', name: '龍騰', req: 0, range: 58, cd: 1.9, dmg: 14, aoe: 40, color: '#6aaa7a' }, |
| src/data.mjs:559:cd:2 | 動作秒 | { id: 'yl1', skill: 'palm', name: '雲龍', req: 0, range: 54, cd: 1.3, dmg: 11, aoe: 0, color: '#7aba8a' }, { id: 'yl2', skill: 'palm', name: '龍騰', req: 0, range: 58, cd: 1.9, dmg: 14, aoe: 40, color: '#6aaa7a' }, |
| src/data.mjs:560:cd:1 | 動作秒 | { id: 'lp1', skill: 'palm', name: '蓮花', req: 0, range: 42, cd: 1.3, dmg: 11, aoe: 0, color: '#c8a070' }, { id: 'lp2', skill: 'palm', name: '步步生蓮', req: 0, range: 46, cd: 1.9, dmg: 14, aoe: 30, color: '#b89060' }, |
| src/data.mjs:560:cd:2 | 動作秒 | { id: 'lp1', skill: 'palm', name: '蓮花', req: 0, range: 42, cd: 1.3, dmg: 11, aoe: 0, color: '#c8a070' }, { id: 'lp2', skill: 'palm', name: '步步生蓮', req: 0, range: 46, cd: 1.9, dmg: 14, aoe: 30, color: '#b89060' }, |
| src/data.mjs:561:cd:1 | 動作秒 | { id: 'fm1', skill: 'palm', name: '瘋魔', req: 0, range: 48, cd: 1.2, dmg: 11, aoe: 0, color: '#a08050' }, { id: 'fm2', skill: 'palm', name: '群魔亂舞', req: 0, range: 52, cd: 1.9, dmg: 14, aoe: 40, color: '#907040' }, |
| src/data.mjs:561:cd:2 | 動作秒 | { id: 'fm1', skill: 'palm', name: '瘋魔', req: 0, range: 48, cd: 1.2, dmg: 11, aoe: 0, color: '#a08050' }, { id: 'fm2', skill: 'palm', name: '群魔亂舞', req: 0, range: 52, cd: 1.9, dmg: 14, aoe: 40, color: '#907040' }, |
| src/data.mjs:562:cd:1 | 動作秒 | { id: 'yz1', skill: 'palm', name: '鷹爪', req: 0, range: 40, cd: 1.2, dmg: 11, aoe: 0, color: '#c86a4a' }, { id: 'yz2', skill: 'palm', name: '擒拿', req: 0, range: 44, cd: 1.8, dmg: 14, aoe: 0, color: '#b85a3a' }, |
| src/data.mjs:562:cd:2 | 動作秒 | { id: 'yz1', skill: 'palm', name: '鷹爪', req: 0, range: 40, cd: 1.2, dmg: 11, aoe: 0, color: '#c86a4a' }, { id: 'yz2', skill: 'palm', name: '擒拿', req: 0, range: 44, cd: 1.8, dmg: 14, aoe: 0, color: '#b85a3a' }, |
| src/data.mjs:563:cd:1 | 動作秒 | { id: 'qs1', skill: 'palm', name: '七傷', req: 0, range: 40, cd: 1.2, dmg: 18, aoe: 0, color: '#d84a2a' }, { id: 'qs2', skill: 'palm', name: '一拳七勁', req: 0, range: 44, cd: 2.0, dmg: 26, aoe: 0, color: '#c83a1a' }, |
| src/data.mjs:563:cd:2 | 動作秒 | { id: 'qs1', skill: 'palm', name: '七傷', req: 0, range: 40, cd: 1.2, dmg: 18, aoe: 0, color: '#d84a2a' }, { id: 'qs2', skill: 'palm', name: '一拳七勁', req: 0, range: 44, cd: 2.0, dmg: 26, aoe: 0, color: '#c83a1a' }, |
| src/data.mjs:564:cd:1 | 動作秒 | { id: 'ps1', skill: 'palm', name: '劈石', req: 0, range: 36, cd: 1.0, dmg: 7, aoe: 0, color: '#8a9ab8' }, { id: 'ps2', skill: 'palm', name: '破玉', req: 0, range: 40, cd: 1.4, dmg: 10, aoe: 0, color: '#7a8aa8' }, |
| src/data.mjs:564:cd:2 | 動作秒 | { id: 'ps1', skill: 'palm', name: '劈石', req: 0, range: 36, cd: 1.0, dmg: 7, aoe: 0, color: '#8a9ab8' }, { id: 'ps2', skill: 'palm', name: '破玉', req: 0, range: 40, cd: 1.4, dmg: 10, aoe: 0, color: '#7a8aa8' }, |
| src/data.mjs:565:cd:1 | 動作秒 | { id: 'hy1', skill: 'palm', name: '混元一氣', req: 0, range: 42, cd: 1.3, dmg: 11, aoe: 0, color: '#9aa8d0' }, { id: 'hy2', skill: 'palm', name: '氣貫長虹', req: 0, range: 46, cd: 1.9, dmg: 14, aoe: 30, color: '#8a98c0' }, |
| src/data.mjs:565:cd:2 | 動作秒 | { id: 'hy1', skill: 'palm', name: '混元一氣', req: 0, range: 42, cd: 1.3, dmg: 11, aoe: 0, color: '#9aa8d0' }, { id: 'hy2', skill: 'palm', name: '氣貫長虹', req: 0, range: 46, cd: 1.9, dmg: 14, aoe: 30, color: '#8a98c0' }, |
| src/data.mjs:566:cd:1 | 動作秒 | { id: 'kf1', skill: 'palm', name: '狂風', req: 0, range: 54, cd: 0.7, dmg: 10, aoe: 0, color: '#c8d0d8' }, { id: 'kf2', skill: 'palm', name: '快劍連環', req: 0, range: 58, cd: 1.2, dmg: 15, aoe: 30, color: '#b8c0c8' }, |
| src/data.mjs:566:cd:2 | 動作秒 | { id: 'kf1', skill: 'palm', name: '狂風', req: 0, range: 54, cd: 0.7, dmg: 10, aoe: 0, color: '#c8d0d8' }, { id: 'kf2', skill: 'palm', name: '快劍連環', req: 0, range: 58, cd: 1.2, dmg: 15, aoe: 30, color: '#b8c0c8' }, |
| src/data.mjs:567:cd:1 | 動作秒 | { id: 'mp1', skill: 'palm', name: '綿掌', req: 0, range: 40, cd: 1.3, dmg: 11, aoe: 0, color: '#9ab0c8' }, { id: 'mp2', skill: 'palm', name: '綿裡藏針', req: 0, range: 44, cd: 1.9, dmg: 14, aoe: 30, color: '#8aa0b8' }, |
| src/data.mjs:567:cd:2 | 動作秒 | { id: 'mp1', skill: 'palm', name: '綿掌', req: 0, range: 40, cd: 1.3, dmg: 11, aoe: 0, color: '#9ab0c8' }, { id: 'mp2', skill: 'palm', name: '綿裡藏針', req: 0, range: 44, cd: 1.9, dmg: 14, aoe: 30, color: '#8aa0b8' }, |
| src/data.mjs:568:cd:1 | 動作秒 | { id: 'bh3', skill: 'palm', name: '百花錯落', req: 0, range: 48, cd: 1.5, dmg: 20, aoe: 40, color: '#3a7a4a' }, |
| src/data.mjs:569:cd:1 | 動作秒 | { id: 'yl3', skill: 'palm', name: '雲龍三折', req: 0, range: 62, cd: 1.6, dmg: 22, aoe: 40, color: '#5a9a6a' }, |
| src/data.mjs:602:cd:1 | 動作秒 | { id: 'n6wl1', skill: 'palm', name: '劍掌起手', req: 0, range: 52, cd: 1.2, dmg: 12, aoe: 0, color: '#9a8ac8' }, { id: 'n6wl2', skill: 'palm', name: '五環', req: 0, range: 56, cd: 1.6, dmg: 14, aoe: 30, color: '#8a7ab8' }, { i |
| src/data.mjs:602:cd:2 | 動作秒 | { id: 'n6wl1', skill: 'palm', name: '劍掌起手', req: 0, range: 52, cd: 1.2, dmg: 12, aoe: 0, color: '#9a8ac8' }, { id: 'n6wl2', skill: 'palm', name: '五環', req: 0, range: 56, cd: 1.6, dmg: 14, aoe: 30, color: '#8a7ab8' }, { i |
| src/data.mjs:602:cd:3 | 動作秒 | { id: 'n6wl1', skill: 'palm', name: '劍掌起手', req: 0, range: 52, cd: 1.2, dmg: 12, aoe: 0, color: '#9a8ac8' }, { id: 'n6wl2', skill: 'palm', name: '五環', req: 0, range: 56, cd: 1.6, dmg: 14, aoe: 30, color: '#8a7ab8' }, { i |
| src/data.mjs:603:cd:1 | 動作秒 | { id: 'n6yw1', skill: 'palm', name: '養吾式', req: 0, range: 58, cd: 1.3, dmg: 11, aoe: 0, color: '#a8c0d8' }, { id: 'n6yw2', skill: 'palm', name: '劍意', req: 0, range: 60, cd: 1.7, dmg: 13, aoe: 0, color: '#98b0c8' }, { id: |
| src/data.mjs:603:cd:2 | 動作秒 | { id: 'n6yw1', skill: 'palm', name: '養吾式', req: 0, range: 58, cd: 1.3, dmg: 11, aoe: 0, color: '#a8c0d8' }, { id: 'n6yw2', skill: 'palm', name: '劍意', req: 0, range: 60, cd: 1.7, dmg: 13, aoe: 0, color: '#98b0c8' }, { id: |
| src/data.mjs:603:cd:3 | 動作秒 | { id: 'n6yw1', skill: 'palm', name: '養吾式', req: 0, range: 58, cd: 1.3, dmg: 11, aoe: 0, color: '#a8c0d8' }, { id: 'n6yw2', skill: 'palm', name: '劍意', req: 0, range: 60, cd: 1.7, dmg: 13, aoe: 0, color: '#98b0c8' }, { id: |
| src/data.mjs:604:cd:1 | 動作秒 | { id: 'n6ty1', skill: 'palm', name: '一峰', req: 0, range: 56, cd: 1.4, dmg: 12, aoe: 0, color: '#8aa0c0' }, { id: 'n6ty2', skill: 'palm', name: '二峰', req: 0, range: 60, cd: 1.8, dmg: 15, aoe: 30, color: '#7a90b0' }, { id: |
| src/data.mjs:604:cd:2 | 動作秒 | { id: 'n6ty1', skill: 'palm', name: '一峰', req: 0, range: 56, cd: 1.4, dmg: 12, aoe: 0, color: '#8aa0c0' }, { id: 'n6ty2', skill: 'palm', name: '二峰', req: 0, range: 60, cd: 1.8, dmg: 15, aoe: 30, color: '#7a90b0' }, { id: |
| src/data.mjs:604:cd:3 | 動作秒 | { id: 'n6ty1', skill: 'palm', name: '一峰', req: 0, range: 56, cd: 1.4, dmg: 12, aoe: 0, color: '#8aa0c0' }, { id: 'n6ty2', skill: 'palm', name: '二峰', req: 0, range: 60, cd: 1.8, dmg: 15, aoe: 30, color: '#7a90b0' }, { id: |
| src/data.mjs:605:cd:1 | 動作秒 | { id: 'n6tc1', skill: 'palm', name: '雲手', req: 0, range: 40, cd: 1.1, dmg: 10, aoe: 0, color: '#c8d0d8' }, { id: 'n6tc2', skill: 'palm', name: '拈爪', req: 0, range: 42, cd: 1.5, dmg: 12, aoe: 0, color: '#b8c0c8' }, { id:  |
| src/data.mjs:605:cd:2 | 動作秒 | { id: 'n6tc1', skill: 'palm', name: '雲手', req: 0, range: 40, cd: 1.1, dmg: 10, aoe: 0, color: '#c8d0d8' }, { id: 'n6tc2', skill: 'palm', name: '拈爪', req: 0, range: 42, cd: 1.5, dmg: 12, aoe: 0, color: '#b8c0c8' }, { id:  |
| src/data.mjs:605:cd:3 | 動作秒 | { id: 'n6tc1', skill: 'palm', name: '雲手', req: 0, range: 40, cd: 1.1, dmg: 10, aoe: 0, color: '#c8d0d8' }, { id: 'n6tc2', skill: 'palm', name: '拈爪', req: 0, range: 42, cd: 1.5, dmg: 12, aoe: 0, color: '#b8c0c8' }, { id:  |
| src/data.mjs:606:cd:1 | 動作秒 | { id: 'n6xd1', skill: 'palm', name: '玄虛', req: 0, range: 50, cd: 1.4, dmg: 11, aoe: 0, color: '#b0b8c8' }, { id: 'n6xd2', skill: 'palm', name: '刀圈', req: 0, range: 54, cd: 1.8, dmg: 14, aoe: 30, color: '#a0a8b8' }, { id: |
| src/data.mjs:606:cd:2 | 動作秒 | { id: 'n6xd1', skill: 'palm', name: '玄虛', req: 0, range: 50, cd: 1.4, dmg: 11, aoe: 0, color: '#b0b8c8' }, { id: 'n6xd2', skill: 'palm', name: '刀圈', req: 0, range: 54, cd: 1.8, dmg: 14, aoe: 30, color: '#a0a8b8' }, { id: |
| src/data.mjs:606:cd:3 | 動作秒 | { id: 'n6xd1', skill: 'palm', name: '玄虛', req: 0, range: 50, cd: 1.4, dmg: 11, aoe: 0, color: '#b0b8c8' }, { id: 'n6xd2', skill: 'palm', name: '刀圈', req: 0, range: 54, cd: 1.8, dmg: 14, aoe: 30, color: '#a0a8b8' }, { id: |
| src/data.mjs:607:cd:1 | 動作秒 | { id: 'n6yh1', skill: 'palm', name: '雁行', req: 0, range: 50, cd: 1.3, dmg: 11, aoe: 0, color: '#c8a8d0' }, { id: 'n6yh2', skill: 'palm', name: '斜飛', req: 0, range: 54, cd: 1.9, dmg: 14, aoe: 30, color: '#b898c0' }, |
| src/data.mjs:607:cd:2 | 動作秒 | { id: 'n6yh1', skill: 'palm', name: '雁行', req: 0, range: 50, cd: 1.3, dmg: 11, aoe: 0, color: '#c8a8d0' }, { id: 'n6yh2', skill: 'palm', name: '斜飛', req: 0, range: 54, cd: 1.9, dmg: 14, aoe: 30, color: '#b898c0' }, |
| src/data.mjs:608:cd:1 | 動作秒 | { id: 'n6js1', skill: 'palm', name: '截手', req: 0, range: 40, cd: 1.1, dmg: 10, aoe: 0, color: '#b8a0c8' }, { id: 'n6js2', skill: 'palm', name: '封脈', req: 0, range: 42, cd: 1.5, dmg: 12, aoe: 0, color: '#a890b8' }, { id:  |
| src/data.mjs:608:cd:2 | 動作秒 | { id: 'n6js1', skill: 'palm', name: '截手', req: 0, range: 40, cd: 1.1, dmg: 10, aoe: 0, color: '#b8a0c8' }, { id: 'n6js2', skill: 'palm', name: '封脈', req: 0, range: 42, cd: 1.5, dmg: 12, aoe: 0, color: '#a890b8' }, { id:  |
| src/data.mjs:608:cd:3 | 動作秒 | { id: 'n6js1', skill: 'palm', name: '截手', req: 0, range: 40, cd: 1.1, dmg: 10, aoe: 0, color: '#b8a0c8' }, { id: 'n6js2', skill: 'palm', name: '封脈', req: 0, range: 42, cd: 1.5, dmg: 12, aoe: 0, color: '#a890b8' }, { id:  |
| src/data.mjs:609:cd:1 | 動作秒 | { id: 'n6tz1', skill: 'palm', name: '彈指', req: 0, range: 46, cd: 1.0, dmg: 9, aoe: 0, color: '#e0a0b0' }, { id: 'n6tz2', skill: 'palm', name: '一指', req: 0, range: 48, cd: 1.4, dmg: 12, aoe: 0, color: '#d090a0' }, { id: ' |
| src/data.mjs:609:cd:2 | 動作秒 | { id: 'n6tz1', skill: 'palm', name: '彈指', req: 0, range: 46, cd: 1.0, dmg: 9, aoe: 0, color: '#e0a0b0' }, { id: 'n6tz2', skill: 'palm', name: '一指', req: 0, range: 48, cd: 1.4, dmg: 12, aoe: 0, color: '#d090a0' }, { id: ' |
| src/data.mjs:609:cd:3 | 動作秒 | { id: 'n6tz1', skill: 'palm', name: '彈指', req: 0, range: 46, cd: 1.0, dmg: 9, aoe: 0, color: '#e0a0b0' }, { id: 'n6tz2', skill: 'palm', name: '一指', req: 0, range: 48, cd: 1.4, dmg: 12, aoe: 0, color: '#d090a0' }, { id: ' |
| src/data.mjs:610:cd:1 | 動作秒 | { id: 'n6mn1', skill: 'palm', name: '睇盼', req: 0, range: 36, cd: 1.2, dmg: 10, aoe: 0, color: '#e0b0c0' }, { id: 'n6mn2', skill: 'palm', name: '折花', req: 0, range: 40, cd: 1.8, dmg: 13, aoe: 0, color: '#d0a0b0' }, |
| src/data.mjs:610:cd:2 | 動作秒 | { id: 'n6mn1', skill: 'palm', name: '睇盼', req: 0, range: 36, cd: 1.2, dmg: 10, aoe: 0, color: '#e0b0c0' }, { id: 'n6mn2', skill: 'palm', name: '折花', req: 0, range: 40, cd: 1.8, dmg: 13, aoe: 0, color: '#d0a0b0' }, |
| src/data.mjs:611:cd:1 | 動作秒 | { id: 'n6yj1', skill: 'palm', name: '玉女劍', req: 0, range: 54, cd: 1.2, dmg: 11, aoe: 0, color: '#d0d8f0' }, { id: 'n6yj2', skill: 'palm', name: '穿花', req: 0, range: 58, cd: 1.6, dmg: 13, aoe: 0, color: '#c0c8e0' }, { id: |
| src/data.mjs:611:cd:2 | 動作秒 | { id: 'n6yj1', skill: 'palm', name: '玉女劍', req: 0, range: 54, cd: 1.2, dmg: 11, aoe: 0, color: '#d0d8f0' }, { id: 'n6yj2', skill: 'palm', name: '穿花', req: 0, range: 58, cd: 1.6, dmg: 13, aoe: 0, color: '#c0c8e0' }, { id: |
| src/data.mjs:611:cd:3 | 動作秒 | { id: 'n6yj1', skill: 'palm', name: '玉女劍', req: 0, range: 54, cd: 1.2, dmg: 11, aoe: 0, color: '#d0d8f0' }, { id: 'n6yj2', skill: 'palm', name: '穿花', req: 0, range: 58, cd: 1.6, dmg: 13, aoe: 0, color: '#c0c8e0' }, { id: |
| src/data.mjs:612:cd:1 | 動作秒 | { id: 'n6ch1', skill: 'palm', name: '長恨', req: 0, range: 48, cd: 1.4, dmg: 11, aoe: 0, color: '#a0a8c0' }, { id: 'n6ch2', skill: 'palm', name: '抽鞭', req: 0, range: 54, cd: 1.9, dmg: 14, aoe: 30, color: '#9098b0' }, |
| src/data.mjs:612:cd:2 | 動作秒 | { id: 'n6ch1', skill: 'palm', name: '長恨', req: 0, range: 48, cd: 1.4, dmg: 11, aoe: 0, color: '#a0a8c0' }, { id: 'n6ch2', skill: 'palm', name: '抽鞭', req: 0, range: 54, cd: 1.9, dmg: 14, aoe: 30, color: '#9098b0' }, |
| src/data.mjs:613:cd:1 | 動作秒 | { id: 'n6qm1', skill: 'palm', name: '銀針', req: 0, range: 36, cd: 1.0, dmg: 8, aoe: 0, color: '#c0c8d0' }, { id: 'n6qm2', skill: 'palm', name: '千滅', req: 0, range: 40, cd: 1.5, dmg: 11, aoe: 0, color: '#b0b8c0' }, |
| src/data.mjs:613:cd:2 | 動作秒 | { id: 'n6qm1', skill: 'palm', name: '銀針', req: 0, range: 36, cd: 1.0, dmg: 8, aoe: 0, color: '#c0c8d0' }, { id: 'n6qm2', skill: 'palm', name: '千滅', req: 0, range: 40, cd: 1.5, dmg: 11, aoe: 0, color: '#b0b8c0' }, |
| src/data.mjs:614:cd:1 | 動作秒 | { id: 'n6qf1', skill: 'palm', name: '驅蜂', req: 0, range: 40, cd: 1.2, dmg: 9, aoe: 30, color: '#c0a060' }, { id: 'n6qf2', skill: 'palm', name: '蜂擁', req: 0, range: 48, cd: 1.6, dmg: 12, aoe: 40, color: '#b09050' }, |
| src/data.mjs:614:cd:2 | 動作秒 | { id: 'n6qf1', skill: 'palm', name: '驅蜂', req: 0, range: 40, cd: 1.2, dmg: 9, aoe: 30, color: '#c0a060' }, { id: 'n6qf2', skill: 'palm', name: '蜂擁', req: 0, range: 48, cd: 1.6, dmg: 12, aoe: 40, color: '#b09050' }, |
| src/data.mjs:615:cd:1 | 動作秒 | { id: 'n6ts1', skill: 'leg', name: '杖掃', req: 0, range: 56, cd: 1.5, dmg: 11, aoe: 40, color: '#6a8a4a' }, { id: 'n6ts2', skill: 'leg', name: '點杖', req: 0, range: 64, cd: 2.0, dmg: 14, aoe: 0, color: '#5a7a3a' }, |
| src/data.mjs:615:cd:2 | 動作秒 | { id: 'n6ts1', skill: 'leg', name: '杖掃', req: 0, range: 56, cd: 1.5, dmg: 11, aoe: 40, color: '#6a8a4a' }, { id: 'n6ts2', skill: 'leg', name: '點杖', req: 0, range: 64, cd: 2.0, dmg: 14, aoe: 0, color: '#5a7a3a' }, |
| src/data.mjs:616:cd:1 | 動作秒 | { id: 'n6zx1', skill: 'palm', name: '摘星', req: 0, range: 40, cd: 1.1, dmg: 10, aoe: 0, color: '#7a9a5a' }, { id: 'n6zx2', skill: 'palm', name: '拿雲', req: 0, range: 44, cd: 1.6, dmg: 13, aoe: 0, color: '#6a8a4a' }, |
| src/data.mjs:616:cd:2 | 動作秒 | { id: 'n6zx1', skill: 'palm', name: '摘星', req: 0, range: 40, cd: 1.1, dmg: 10, aoe: 0, color: '#7a9a5a' }, { id: 'n6zx2', skill: 'palm', name: '拿雲', req: 0, range: 44, cd: 1.6, dmg: 13, aoe: 0, color: '#6a8a4a' }, |
| src/data.mjs:617:cd:1 | 動作秒 | { id: 'n6mt1', skill: 'palm', name: '冥天', req: 0, range: 42, cd: 1.3, dmg: 12, aoe: 0, color: '#5a6a3a' }, { id: 'n6mt2', skill: 'palm', name: '九式起', req: 0, range: 46, cd: 1.7, dmg: 14, aoe: 0, color: '#4a5a2a' }, { id: |
| src/data.mjs:617:cd:2 | 動作秒 | { id: 'n6mt1', skill: 'palm', name: '冥天', req: 0, range: 42, cd: 1.3, dmg: 12, aoe: 0, color: '#5a6a3a' }, { id: 'n6mt2', skill: 'palm', name: '九式起', req: 0, range: 46, cd: 1.7, dmg: 14, aoe: 0, color: '#4a5a2a' }, { id: |
| src/data.mjs:617:cd:3 | 動作秒 | { id: 'n6mt1', skill: 'palm', name: '冥天', req: 0, range: 42, cd: 1.3, dmg: 12, aoe: 0, color: '#5a6a3a' }, { id: 'n6mt2', skill: 'palm', name: '九式起', req: 0, range: 46, cd: 1.7, dmg: 14, aoe: 0, color: '#4a5a2a' }, { id: |
| src/data.mjs:618:cd:1 | 動作秒 | { id: 'n6ld1', skill: 'palm', name: '六合', req: 0, range: 50, cd: 1.4, dmg: 12, aoe: 0, color: '#a08050' }, { id: 'n6ld2', skill: 'palm', name: '合刀', req: 0, range: 56, cd: 1.9, dmg: 15, aoe: 30, color: '#907040' }, |
| src/data.mjs:618:cd:2 | 動作秒 | { id: 'n6ld1', skill: 'palm', name: '六合', req: 0, range: 50, cd: 1.4, dmg: 12, aoe: 0, color: '#a08050' }, { id: 'n6ld2', skill: 'palm', name: '合刀', req: 0, range: 56, cd: 1.9, dmg: 15, aoe: 30, color: '#907040' }, |
| src/data.mjs:619:cd:1 | 動作秒 | { id: 'n6sx1', skill: 'palm', name: '蛇行', req: 0, range: 38, cd: 1.2, dmg: 10, aoe: 0, color: '#8a9a60' }, { id: 'n6sx2', skill: 'palm', name: '刁拿', req: 0, range: 42, cd: 1.7, dmg: 13, aoe: 0, color: '#7a8a50' }, |
| src/data.mjs:619:cd:2 | 動作秒 | { id: 'n6sx1', skill: 'palm', name: '蛇行', req: 0, range: 38, cd: 1.2, dmg: 10, aoe: 0, color: '#8a9a60' }, { id: 'n6sx2', skill: 'palm', name: '刁拿', req: 0, range: 42, cd: 1.7, dmg: 13, aoe: 0, color: '#7a8a50' }, |
| src/data.mjs:620:cd:1 | 動作秒 | { id: 'n6sl1', skill: 'palm', name: '令擊', req: 0, range: 48, cd: 1.3, dmg: 12, aoe: 0, color: '#d07040' }, { id: 'n6sl2', skill: 'palm', name: '令火', req: 0, range: 52, cd: 1.7, dmg: 15, aoe: 30, color: '#c06030' }, { id: |
| src/data.mjs:620:cd:2 | 動作秒 | { id: 'n6sl1', skill: 'palm', name: '令擊', req: 0, range: 48, cd: 1.3, dmg: 12, aoe: 0, color: '#d07040' }, { id: 'n6sl2', skill: 'palm', name: '令火', req: 0, range: 52, cd: 1.7, dmg: 15, aoe: 30, color: '#c06030' }, { id: |
| src/data.mjs:620:cd:3 | 動作秒 | { id: 'n6sl1', skill: 'palm', name: '令擊', req: 0, range: 48, cd: 1.3, dmg: 12, aoe: 0, color: '#d07040' }, { id: 'n6sl2', skill: 'palm', name: '令火', req: 0, range: 52, cd: 1.7, dmg: 15, aoe: 30, color: '#c06030' }, { id: |
| src/data.mjs:621:cd:1 | 動作秒 | { id: 'n6ly1', skill: 'palm', name: '烈焰', req: 0, range: 48, cd: 1.3, dmg: 12, aoe: 30, color: '#e06030' }, { id: 'n6ly2', skill: 'palm', name: '刀焰', req: 0, range: 54, cd: 1.8, dmg: 16, aoe: 40, color: '#d05020' }, |
| src/data.mjs:621:cd:2 | 動作秒 | { id: 'n6ly1', skill: 'palm', name: '烈焰', req: 0, range: 48, cd: 1.3, dmg: 12, aoe: 30, color: '#e06030' }, { id: 'n6ly2', skill: 'palm', name: '刀焰', req: 0, range: 54, cd: 1.8, dmg: 16, aoe: 40, color: '#d05020' }, |
| src/data.mjs:622:cd:1 | 動作秒 | { id: 'n6hm1', skill: 'palm', name: '寒綿', req: 0, range: 40, cd: 1.4, dmg: 11, aoe: 0, color: '#a0c0d0' }, { id: 'n6hm2', skill: 'palm', name: '冰意', req: 0, range: 46, cd: 1.9, dmg: 14, aoe: 0, color: '#90b0c0' }, |
| src/data.mjs:622:cd:2 | 動作秒 | { id: 'n6hm1', skill: 'palm', name: '寒綿', req: 0, range: 40, cd: 1.4, dmg: 11, aoe: 0, color: '#a0c0d0' }, { id: 'n6hm2', skill: 'palm', name: '冰意', req: 0, range: 46, cd: 1.9, dmg: 14, aoe: 0, color: '#90b0c0' }, |
| src/data.mjs:623:cd:1 | 動作秒 | { id: 'n6fh1', skill: 'palm', name: '飛花', req: 0, range: 42, cd: 1.0, dmg: 8, aoe: 0, color: '#d0a080' }, { id: 'n6fh2', skill: 'palm', name: '摘葉', req: 0, range: 48, cd: 1.4, dmg: 11, aoe: 30, color: '#c09070' }, |
| src/data.mjs:623:cd:2 | 動作秒 | { id: 'n6fh1', skill: 'palm', name: '飛花', req: 0, range: 42, cd: 1.0, dmg: 8, aoe: 0, color: '#d0a080' }, { id: 'n6fh2', skill: 'palm', name: '摘葉', req: 0, range: 48, cd: 1.4, dmg: 11, aoe: 30, color: '#c09070' }, |
| src/data.mjs:632:cd:1 | 動作秒 | { id: 'bs1', skill: 'palm', name: '刺劍式', req: 0, range: 44, cd: 1.0, dmg: 6, aoe: 0, color: '#9fb4c8' }, { id: 'bs2', skill: 'palm', name: '撩劍式', req: 0, range: 48, cd: 1.4, dmg: 9, aoe: 0, color: '#8fa4b8' }, |
| src/data.mjs:632:cd:2 | 動作秒 | { id: 'bs1', skill: 'palm', name: '刺劍式', req: 0, range: 44, cd: 1.0, dmg: 6, aoe: 0, color: '#9fb4c8' }, { id: 'bs2', skill: 'palm', name: '撩劍式', req: 0, range: 48, cd: 1.4, dmg: 9, aoe: 0, color: '#8fa4b8' }, |
| src/data.mjs:633:cd:1 | 動作秒 | { id: 'hs1', skill: 'palm', name: '白虹貫日', req: 0, range: 60, cd: 1.5, dmg: 12, aoe: 0, color: '#c8d8e8' }, { id: 'hs2', skill: 'palm', name: '蒼松迎客', req: 0, range: 56, cd: 2.0, dmg: 14, aoe: 40, color: '#6a8a6a' }, |
| src/data.mjs:633:cd:2 | 動作秒 | { id: 'hs1', skill: 'palm', name: '白虹貫日', req: 0, range: 60, cd: 1.5, dmg: 12, aoe: 0, color: '#c8d8e8' }, { id: 'hs2', skill: 'palm', name: '蒼松迎客', req: 0, range: 56, cd: 2.0, dmg: 14, aoe: 40, color: '#6a8a6a' }, |
| src/data.mjs:634:cd:1 | 動作秒 | { id: 'sx1', skill: 'palm', name: '三仙連環', req: 0, range: 58, cd: 1.0, dmg: 13, aoe: 0, color: '#b0a0d0' }, { id: 'sx2', skill: 'palm', name: '奪命三連', req: 0, range: 64, cd: 1.8, dmg: 20, aoe: 50, color: '#9080c0' }, |
| src/data.mjs:634:cd:2 | 動作秒 | { id: 'sx1', skill: 'palm', name: '三仙連環', req: 0, range: 58, cd: 1.0, dmg: 13, aoe: 0, color: '#b0a0d0' }, { id: 'sx2', skill: 'palm', name: '奪命三連', req: 0, range: 64, cd: 1.8, dmg: 20, aoe: 50, color: '#9080c0' }, |
| src/data.mjs:635:cd:1 | 動作秒 | { id: 'wh1', skill: 'palm', name: '猛虎下山', req: 0, range: 50, cd: 1.6, dmg: 12, aoe: 30, color: '#c07030' }, { id: 'wh2', skill: 'palm', name: '斷門一刀', req: 0, range: 56, cd: 2.2, dmg: 17, aoe: 50, color: '#a05020' }, |
| src/data.mjs:635:cd:2 | 動作秒 | { id: 'wh1', skill: 'palm', name: '猛虎下山', req: 0, range: 50, cd: 1.6, dmg: 12, aoe: 30, color: '#c07030' }, { id: 'wh2', skill: 'palm', name: '斷門一刀', req: 0, range: 56, cd: 2.2, dmg: 17, aoe: 50, color: '#a05020' }, |
| src/data.mjs:636:cd:1 | 動作秒 | { id: 'sl1', skill: 'leg', name: '橫掃千軍', req: 0, range: 60, cd: 1.8, dmg: 11, aoe: 60, color: '#b09040' }, { id: 'sl2', skill: 'leg', name: '韋陀獻杵', req: 0, range: 66, cd: 2.4, dmg: 15, aoe: 70, color: '#907020' }, |
| src/data.mjs:636:cd:2 | 動作秒 | { id: 'sl1', skill: 'leg', name: '橫掃千軍', req: 0, range: 60, cd: 1.8, dmg: 11, aoe: 60, color: '#b09040' }, { id: 'sl2', skill: 'leg', name: '韋陀獻杵', req: 0, range: 66, cd: 2.4, dmg: 15, aoe: 70, color: '#907020' }, |
| src/data.mjs:637:cd:1 | 動作秒 | { id: 'tn1', skill: 'palm', name: '錯骨', req: 0, range: 36, cd: 1.1, dmg: 9, aoe: 0, color: '#8a6aa0' }, { id: 'tn2', skill: 'palm', name: '分筋', req: 0, range: 38, cd: 1.6, dmg: 12, aoe: 0, color: '#7a5a90' }, |
| src/data.mjs:637:cd:2 | 動作秒 | { id: 'tn1', skill: 'palm', name: '錯骨', req: 0, range: 36, cd: 1.1, dmg: 9, aoe: 0, color: '#8a6aa0' }, { id: 'tn2', skill: 'palm', name: '分筋', req: 0, range: 38, cd: 1.6, dmg: 12, aoe: 0, color: '#7a5a90' }, |
| src/data.mjs:644:cd:1 | 動作秒 | export const PERKS = { small: { name: '熟極而流', cd: 0.9 }, full: { name: '圓轉如意', dmg: 1.15 } }; |
| src/data.mjs:646:cd:1 | 動作秒 | fist: [{ id: 'gang', name: '沉猛', dmg: 1.2, cd: 1.1, color: '#c0392b' }, { id: 'ling', name: '迅捷', dmg: 0.95, cd: 0.8, color: '#2e86c1' }], |
| src/data.mjs:646:cd:2 | 動作秒 | fist: [{ id: 'gang', name: '沉猛', dmg: 1.2, cd: 1.1, color: '#c0392b' }, { id: 'ling', name: '迅捷', dmg: 0.95, cd: 0.8, color: '#2e86c1' }], |
| src/data.mjs:647:cd:1 | 動作秒 | palm: [{ id: 'gang', name: '剛猛', dmg: 1.2, cd: 1.1, color: '#c0392b' }, { id: 'ling', name: '輕靈', dmg: 0.95, cd: 0.8, color: '#2e86c1' }], |
| src/data.mjs:647:cd:2 | 動作秒 | palm: [{ id: 'gang', name: '剛猛', dmg: 1.2, cd: 1.1, color: '#c0392b' }, { id: 'ling', name: '輕靈', dmg: 0.95, cd: 0.8, color: '#2e86c1' }], |
| src/data.mjs:648:cd:1 | 動作秒 | leg: [{ id: 'gang', name: '重腿', dmg: 1.2, cd: 1.1, color: '#c0392b' }, { id: 'ling', name: '飛腿', dmg: 0.95, cd: 0.8, color: '#2e86c1' }], |
| src/data.mjs:648:cd:2 | 動作秒 | leg: [{ id: 'gang', name: '重腿', dmg: 1.2, cd: 1.1, color: '#c0392b' }, { id: 'ling', name: '飛腿', dmg: 0.95, cd: 0.8, color: '#2e86c1' }], |
| src/data.mjs:652:cooldown:1 | 生理日 | export const BREAK = { caps: [54.9, 99.9], moodMin: 45, energyMin: 40, base: 0.35, cooldown: DAY, rechoose: DAY / 2 }; |
| src/data.mjs:654:perDay:1 | 生理日 | export const RUST = { after: 2 * DAY, perDay: 0.15, max: 0.6, shake: 0.05 }; |
| src/data.mjs:660:cd:1 | 動作秒 | dog: { name: '野狗', kind: '獸', weapon: '利齒', hp: 14, dmg: 3, cd: 1.2, flee: 0.5, loot: {}, home: { sprite: 'dog', speed: 65 } }, |
| src/data.mjs:661:cd:1 | 動作秒 | rat:    { name: '山鼠',     kind: '獸', weapon: '利齒', hp: 10,  dmg: 2,  cd: 1.0, flee: 0.5,  loot: {} }, |
| src/data.mjs:662:cd:1 | 動作秒 | hare:   { name: '野兔',     kind: '獸', weapon: '牙爪', hp: 8,   dmg: 1,  cd: 1.2, flee: 0.6,  loot: { food: 1 } }, |
| src/data.mjs:663:cd:1 | 動作秒 | boar:   { name: '野豬',     kind: '獸', weapon: '獠牙', hp: 40,  dmg: 6,  cd: 1.3, flee: 0.1,  loot: { food: 3, hide: 1 } }, |
| src/data.mjs:664:cd:1 | 動作秒 | boars:  { name: '野豬群',   kind: '獸', weapon: '獠牙', hp: 110,  dmg: 11,  cd: 1.1, flee: 0.15, loot: { food: 5, hide: 2 } }, |
| src/data.mjs:665:cd:1 | 動作秒 | wolf:   { name: '狼',       kind: '獸', weapon: '牙爪', hp: 60,  dmg: 10,  cd: 0.9, flee: 0.2,  loot: { hide: 1 } }, |
| src/data.mjs:666:cd:1 | 動作秒 | snake:  { name: '毒蛇',     kind: '獸', weapon: '毒牙', hp: 25,  dmg: 12, cd: 1.5, flee: 0.35, loot: { herb: 2 } }, |
| src/data.mjs:667:cd:1 | 動作秒 | bandit: { name: '山賊嘍囉', kind: '人', weapon: '刀',   hp: 120,  dmg: 14,  cd: 1.2, flee: 0.3,  loot: { coin: 3, page1: 0.15 } }, |
| src/data.mjs:668:cd:1 | 動作秒 | archer: { name: '獵戶暗箭', kind: '人', weapon: '暗器', hp: 75,  dmg: 17, cd: 1.5, flee: 0.45, loot: { coin: 2, page1: 0.1 } }, |
| src/data.mjs:669:cd:1 | 動作秒 | bear:   { name: '黑熊',     kind: '獸', weapon: '熊掌', hp: 420, dmg: 28, cd: 1.6, flee: 0.05, loot: { food: 6, gall: 1 } }, |
| src/data.mjs:670:cd:1 | 動作秒 | chief:  { name: '山賊頭目', kind: '人', weapon: '刀／鞭', hp: 360, dmg: 24, cd: 1.1, flee: 0.2, practiceTier: 3, loot: { coin: 12, page2: 0.35 } }, |
| src/data.mjs:672:cd:1 | 動作秒 | vulture:{ name: '禿鷲',     kind: '獸', weapon: '鐵喙', hp: 120, dmg: 12, cd: 1.0, flee: 0.4,  loot: { hide: 1 } }, |
| src/data.mjs:673:cd:1 | 動作秒 | ape:    { name: '崖猿',     kind: '獸', weapon: '巨臂', hp: 200, dmg: 15, cd: 1.3, flee: 0.2,  loot: { food: 4, herb: 1 } }, |
| src/data.mjs:674:cd:1 | 動作秒 | bat:    { name: '洞蝠群',   kind: '獸', weapon: '利齒', hp: 150, dmg: 11, cd: 0.8, flee: 0.3,  loot: { herb: 1, page1: 0.2 } }, |
| src/data.mjs:675:cd:1 | 動作秒 | python: { name: '巨蟒',     kind: '獸', weapon: '纏絞', hp: 320, dmg: 18, cd: 1.6, flee: 0.1,  loot: { gall: 1, page1: 0.3 } }, |
| src/data.mjs:676:cd:1 | 動作秒 | hermit: { name: '瘋癲劍客', kind: '人', weapon: '劍',   hp: 300, dmg: 20, cd: 1.0, flee: 0.25, loot: { coin: 10, page2: 0.3 } }, |
| src/data.mjs:677:cd:1 | 動作秒 | whiteape:{ name: '白猿',    kind: '獸', weapon: '巨臂', hp: 480, dmg: 22, cd: 1.2, flee: 0,    loot: { food: 8, page2: 0.5 } }, |
| src/data.mjs:678:cd:1 | 動作秒 | pythonking:{ name: '古洞蟒王', kind: '獸', weapon: '纏絞', hp: 260, dmg: 22, cd: 1.5, flee: 0, loot: { gall: 2, page2: 0.7 } }, |
| src/data.mjs:679:cd:1 | 動作秒 | swordtomb:{ name: '劍塚守者', kind: '人', weapon: '玄鐵重劍', hp: 600, dmg: 24, cd: 1.3, flee: 0, loot: { coin: 30, page2: 1 } }, |
| src/data.mjs:680:cd:1 | 動作秒 | peakguard:{ name: '無名高手', kind: '人', weapon: '？', hp: 560, dmg: 22, cd: 1.2, flee: 0, loot: { coin: 20, page2: 1 } }, |
| src/data.mjs:689:every:1 | 巡山距離 | { id: 'foot',   name: '山腳', from: 0,   to: 100, every: 20, roster: [['hare', 3], ['boar', 1]],               find: { food: 0.5 } }, |
| src/data.mjs:690:every:1 | 巡山距離 | { id: 'wood',   name: '林地', from: 100, to: 250, every: 25, roster: [['boars', 1], ['wolf', 2], ['snake', 2]], find: { herb: 0.5, wood: 0.5 } }, |
| src/data.mjs:691:every:1 | 巡山距離 | { id: 'slope',  name: '山腰', from: 250, to: 450, every: 30, roster: [['bandit', 3], ['archer', 2]],            find: { coin: 0.5 } }, |
| src/data.mjs:692:every:1 | 巡山距離 | { id: 'gorge',  name: '深谷', from: 450, to: 700, every: 35, roster: [['bear', 1], ['chief', 1]],               find: { herb: 0.5, tiemu: 0.25 } }, |
| src/data.mjs:693:every:1 | 巡山距離 | { id: 'cliff',  name: '斷崖', from: 700, to: 950, every: 40, roster: [['vulture', 2], ['ape', 2]], find: { herb: 0.5, tiemu: 0.35 }, scale: 1.25 }, |
| src/data.mjs:694:every:1 | 巡山距離 | { id: 'cave',   name: '古洞', from: 950, to: 1250, every: 45, roster: [['bat', 3], ['python', 1]], find: { page1: 0.3, lingshi: 0.3 }, scale: 1.25 ** 2 }, |
| src/data.mjs:695:every:1 | 巡山距離 | { id: 'peak',   name: '無名絕頂', from: 1250, to: 1600, every: 50, roster: [['hermit', 2], ['ape', 1]], find: { coin: 1, page2: 0.1, lingshi: 0.4 }, scale: 1.25 ** 3 }, |
| src/data.mjs:704:cool:1 | 動作秒 | export const EXP = { maxTeam: 4, thr: [0.3, 0.5, 0.7], thrDefault: 0.5, moodMin: 30, walk: 5, back: 12, gateBail: 0.25, supplyHeal: 35, supplyPer: 2, supplyMax: 6, campCarry: 2, sta: 100, staStep: 0.05, staFight: 1.5, pa |
| src/data.mjs:704:coolFast:2 | 動作秒 | export const EXP = { maxTeam: 4, thr: [0.3, 0.5, 0.7], thrDefault: 0.5, moodMin: 30, walk: 5, back: 12, gateBail: 0.25, supplyHeal: 35, supplyPer: 2, supplyMax: 6, campCarry: 2, sta: 100, staStep: 0.05, staFight: 1.5, pa |
| src/data.mjs:708:day:1 | 生理日 | { id: 'trial', day: 1, name: '黃昏試煉：首個小成', guide: '師父：「天黑前，木樁場有頭餓瘋的野豬闖進來，讓主角試試身手。」' }, |
| src/data.mjs:709:day:1 | 生理日 | { id: 'firstExp', day: 2, name: '第一次巡山', guide: '師父：「後山不太平。挑一到四人去巡山，看看能走多遠——傷到一半就回來。」（下方「巡山遠征」）' }, |
| src/data.mjs:710:day:1 | 生理日 | { id: 'firstBuild', day: 3, name: '第一次動工', guide: '師父：「巡山帶回的木料夠了就動工吧，膳房或工寮都行。」（上方「建造」）' }, |
| src/data.mjs:720:cd:1 | 動作秒 | ENEMIES.wolfking = { name: '狼王', kind: '獸', weapon: '牙爪', hp: 170, dmg: 14, cd: 1.0, flee: 0, loot: { hide: 2 }, detect: 60, speed: 45 }; |
| src/data.mjs:721:cd:1 | 動作秒 | ENEMIES.post = { name: '山賊哨卡', kind: '人', weapon: '刀槍', hp: 300, dmg: 18, cd: 1.1, flee: 0, loot: { coin: 6, page1: 0.4 }, detect: 70, speed: 20 }; |
| src/data.mjs:736:cd:1 | 動作秒 | MOVES.push({ id: 'rulai', skill: 'palm', name: '如來神掌', req: 999, range: 120, cd: 4.0, dmg: 24, aoe: 120, color: '#f2c14e' }); |
| src/data.mjs:742:cd:1 | 動作秒 | MOVES.push({ id: 'jianlong', skill: 'palm', name: '見龍在田', req: 0, range: 50, cd: 1.0, dmg: 14, aoe: 0, color: '#e8b33a', fx: 'dragon' }); |
| src/data.mjs:743:cd:1 | 動作秒 | MOVES.push({ id: 'feilong', skill: 'palm', name: '飛龍在天', req: 0, range: 70, cd: 1.4, dmg: 20, aoe: 80, color: '#f0c040', fx: 'dragon' }); |
| src/data.mjs:744:cd:1 | 動作秒 | MOVES.push({ id: 'kanglong', skill: 'palm', name: '亢龍有悔', req: 0, range: 90, cd: 1.6, dmg: 30, aoe: 100, color: '#ffd24a', fx: 'dragon' }); |
| src/data.mjs:745:cd:1 | 動作秒 | MOVES.push({ id: 'banzi', skill: 'leg', name: '絆字訣', req: 0, range: 40, cd: 0.7, dmg: 9, aoe: 0, color: '#3fae5a', fx: 'staff' }); |
| src/data.mjs:746:cd:1 | 動作秒 | MOVES.push({ id: 'chuozi', skill: 'leg', name: '戳字訣', req: 0, range: 50, cd: 0.9, dmg: 14, aoe: 0, color: '#2f9e6a', fx: 'staff' }); |
| src/data.mjs:747:cd:1 | 動作秒 | MOVES.push({ id: 'wugou', skill: 'leg', name: '天下無狗', req: 0, range: 80, cd: 1.6, dmg: 26, aoe: 90, color: '#5fd38a', fx: 'staff' }); |
| src/data.mjs:753:cd:1 | 動作秒 | MOVES.push({ id: 'qm1', skill: 'palm', name: '落英陣步', req: 0, range: 50, cd: 1.0, dmg: 10, aoe: 0, color: '#d98fb0' }); |
| src/data.mjs:754:cd:1 | 動作秒 | MOVES.push({ id: 'qm2', skill: 'palm', name: '五轉迷陣', req: 0, range: 70, cd: 1.6, dmg: 14, aoe: 70, color: '#e0a0c0' }); |
| src/data.mjs:755:cd:1 | 動作秒 | MOVES.push({ id: 'xx1', skill: 'palm', name: '抽髓掌', req: 0, range: 40, cd: 0.9, dmg: 10, aoe: 0, color: '#5a9a3a' }); |
| src/data.mjs:756:cd:1 | 動作秒 | MOVES.push({ id: 'xx2', skill: 'palm', name: '腐屍毒', req: 0, range: 60, cd: 1.5, dmg: 12, aoe: 50, color: '#6aaa2a' }); |
| src/data.mjs:769:cd:1 | 動作秒 | MOVES.push({ id: 'bx1', skill: 'palm', name: '流星飛墮', req: 0, range: 60, cd: 0.45, dmg: 9, aoe: 0, color: '#c03060', fx: 'bixie' }); |
| src/data.mjs:770:cd:1 | 動作秒 | MOVES.push({ id: 'bx2', skill: 'palm', name: '群邪辟易', req: 0, range: 60, cd: 0.6, dmg: 13, aoe: 60, color: '#d04070', fx: 'bixie' }); |
| src/data.mjs:771:cd:1 | 動作秒 | MOVES.push({ id: 'bx3', skill: 'palm', name: '鍾馗抉目', req: 0, range: 70, cd: 0.7, dmg: 18, aoe: 0, color: '#e05080', fx: 'bixie' }); |
| src/data.mjs:785:cd:1 | 動作秒 | { id: 'dg9', name: '狂風卷地', foes: ['peakguard'], need: 100, dmg: 40, cd: 1.1, wide: true }, |
| src/data.mjs:788:cleanDays:1 | 生理日 | export const HS = { zxNeed: 240, carvPer: 1, carvInsight: 6, cleanDays: 7, zxMoodMin: 60, zxDingMin: 4, zxPow: 0.03, zxGuard: 0.03, bixieDayPow: 0.04, bixieCap: 0.6, songEvery: 4, fengNights: 3, softP: 0.05, duguHeal: 1, |
| src/data.mjs:788:bixieDayPow:2 | 生理日 | export const HS = { zxNeed: 240, carvPer: 1, carvInsight: 6, cleanDays: 7, zxMoodMin: 60, zxDingMin: 4, zxPow: 0.03, zxGuard: 0.03, bixieDayPow: 0.04, bixieCap: 0.6, songEvery: 4, fengNights: 3, softP: 0.05, duguHeal: 1, |
| src/data.mjs:788:songEvery:3 | 生理日 | export const HS = { zxNeed: 240, carvPer: 1, carvInsight: 6, cleanDays: 7, zxMoodMin: 60, zxDingMin: 4, zxPow: 0.03, zxGuard: 0.03, bixieDayPow: 0.04, bixieCap: 0.6, songEvery: 4, fengNights: 3, softP: 0.05, duguHeal: 1, |
| src/data.mjs:788:secondWind:4 | 生理日 | export const HS = { zxNeed: 240, carvPer: 1, carvInsight: 6, cleanDays: 7, zxMoodMin: 60, zxDingMin: 4, zxPow: 0.03, zxGuard: 0.03, bixieDayPow: 0.04, bixieCap: 0.6, songEvery: 4, fengNights: 3, softP: 0.05, duguHeal: 1, |
| src/data.mjs:788:windHp:5 | 生理日 | export const HS = { zxNeed: 240, carvPer: 1, carvInsight: 6, cleanDays: 7, zxMoodMin: 60, zxDingMin: 4, zxPow: 0.03, zxGuard: 0.03, bixieDayPow: 0.04, bixieCap: 0.6, songEvery: 4, fengNights: 3, softP: 0.05, duguHeal: 1, |
| src/data.mjs:823:comedyDays:1 | 生理日 | comedyWeek: 2, comedyDays: 7, |
| src/data.mjs:900:dur:1 | 動作秒 | study:   { name: '藏經閣研讀', dur: 10, energy: -4, skill: { style: 3 }, gen: { base: 40, why: '去藏經閣翻殘頁', cond: 'always' }, eff: { pageXP: 1 } }, |
| src/data.mjs:901:dur:1 | 生理日 | worship: { name: '祠堂上香', dur: 6, energy: -1, gen: { base: 46, why: '給祖師爺上炷香', cond: 'always', perDay: 3 }, eff: { mood: 6, rep: 0.3 } }, |
| src/data.mjs:901:perDay:2 | 生理日 | worship: { name: '祠堂上香', dur: 6, energy: -1, gen: { base: 46, why: '給祖師爺上炷香', cond: 'always', perDay: 3 }, eff: { mood: 6, rep: 0.3 } }, |
| src/data.mjs:902:dur:1 | 動作秒 | brew:    { name: '丹房煉藥', dur: 12, energy: -6, skill: { herbal: 5 }, gen: { base: 34, why: '藥材夠了，煉療傷丹', cond: 'herb2' }, eff: { use: { herb: 2 }, res: { pill: 1 } } }, |
| src/data.mjs:903:dur:1 | 動作秒 | heal:    { name: '醫館治傷', dur: 8, gen: { base: 115, why: '傷得不輕，去醫館', cond: 'injured', layer: 'need' }, eff: { use: { pill: 1 }, hp: 45, alt: { use: { herb: 1 }, hp: 25, alt: { hp: 12 } } } }, |
| src/data.mjs:904:dur:1 | 生理日 | host:    { name: '客房待客', dur: 8, social: 20, gen: { base: 36, why: '打掃客房、陪客人說話', cond: 'always', perDay: 2 }, eff: { rep: 0.5, mood: 3 } }, |
| src/data.mjs:904:perDay:2 | 生理日 | host:    { name: '客房待客', dur: 8, social: 20, gen: { base: 36, why: '打掃客房、陪客人說話', cond: 'always', perDay: 2 }, eff: { rep: 0.5, mood: 3 } }, |
| src/data.mjs:905:dur:1 | 動作秒 | water:   { name: '挑水', dur: 8, energy: -7, skill: { strength: 4 }, carry: { water: 2 }, gen: { base: 50, why: '水缸見底，去挑水', cond: 'water' } }, |
| src/data.mjs:906:dur:1 | 生理日 | bell:    { name: '敲晨鐘', dur: 4, energy: -1, gen: { base: 90, why: '天亮了，去敲晨鐘', cond: 'bell', perDay: 1 }, eff: { allMood: 3 } }, |
| src/data.mjs:906:perDay:2 | 生理日 | bell:    { name: '敲晨鐘', dur: 4, energy: -1, gen: { base: 90, why: '天亮了，去敲晨鐘', cond: 'bell', perDay: 1 }, eff: { allMood: 3 } }, |
| src/data.mjs:907:dur:1 | 生理日 | watch:   { name: '護山哨瞭望', dur: 10, energy: -5, skill: { agility: 3 }, gen: { base: 40, why: '上哨崗守獸道', cond: 'always', perDay: 4 }, eff: { watch: 1 } }, |
| src/data.mjs:907:perDay:2 | 生理日 | watch:   { name: '護山哨瞭望', dur: 10, energy: -5, skill: { agility: 3 }, gen: { base: 40, why: '上哨崗守獸道', cond: 'always', perDay: 4 }, eff: { watch: 1 } }, |
| src/data.mjs:908:dur:1 | 動作秒 | sig:     { name: '鎮派功課', dur: 8, gen: { base: 48, why: '鎮派建築的功課', cond: 'always' } }, |
| src/data.mjs:918:dur:1 | 生理日 | gaibang:   { name: '沿村乞討', dur: 10, energy: -6, perDay: 3, why: '打狗棒堂：沿村討口飯', eff: { res: { food: 2 } } }, |
| src/data.mjs:918:perDay:2 | 生理日 | gaibang:   { name: '沿村乞討', dur: 10, energy: -6, perDay: 3, why: '打狗棒堂：沿村討口飯', eff: { res: { food: 2 } } }, |
| src/data.mjs:919:dur:1 | 生理日 | qizong:    { name: '思過崖面壁', dur: 12, energy: -3, perDay: 2, why: '思過崖：面壁思過', eff: { wexin: 1, mood: 2 } }, |
| src/data.mjs:919:perDay:2 | 生理日 | qizong:    { name: '思過崖面壁', dur: 12, energy: -3, perDay: 2, why: '思過崖：面壁思過', eff: { wexin: 1, mood: 2 } }, |
| src/data.mjs:920:dur:1 | 生理日 | jianzong:  { name: '酒窖品酒', dur: 6, fun: 35, perDay: 3, why: '酒窖：喝兩口好酒', eff: { mood: 5 } }, |
| src/data.mjs:920:perDay:2 | 生理日 | jianzong:  { name: '酒窖品酒', dur: 6, fun: 35, perDay: 3, why: '酒窖：喝兩口好酒', eff: { mood: 5 } }, |
| src/data.mjs:921:dur:1 | 生理日 | mingjiao:  { name: '護聖火', dur: 10, energy: -8, skill: { style: 5 }, perDay: 4, why: '聖火壇：守火練功', eff: {} }, |
| src/data.mjs:921:perDay:2 | 生理日 | mingjiao:  { name: '護聖火', dur: 10, energy: -8, skill: { style: 5 }, perDay: 4, why: '聖火壇：守火練功', eff: {} }, |
| src/data.mjs:922:dur:1 | 生理日 | tiandihui: { name: '拜香堂收會費', dur: 8, energy: -3, perDay: 3, why: '香堂：拜香收會費', eff: { res: { coin: 2 } } }, |
| src/data.mjs:922:perDay:2 | 生理日 | tiandihui: { name: '拜香堂收會費', dur: 8, energy: -3, perDay: 3, why: '香堂：拜香收會費', eff: { res: { coin: 2 } } }, |
| src/data.mjs:923:dur:1 | 生理日 | zhulong:   { name: '大雜院收租', dur: 8, energy: -4, perDay: 2, why: '大雜院：挨家收租', eff: { res: { coin: 1, food: 1 } } }, |
| src/data.mjs:923:perDay:2 | 生理日 | zhulong:   { name: '大雜院收租', dur: 8, energy: -4, perDay: 2, why: '大雜院：挨家收租', eff: { res: { coin: 1, food: 1 } } }, |
| src/data.mjs:924:dur:1 | 生理日 | wuming:    { name: '祖師堂祭祖', dur: 6, energy: -1, perDay: 2, why: '祖師堂：祭拜開山祖師', eff: { rep: 0.5, mood: 3 } }, |
| src/data.mjs:924:perDay:2 | 生理日 | wuming:    { name: '祖師堂祭祖', dur: 6, energy: -1, perDay: 2, why: '祖師堂：祭拜開山祖師', eff: { rep: 0.5, mood: 3 } }, |
| src/economy.mjs:11:every:1 | 生理日 | export const UPKEEP = { every: 5, graceDay: 10, wageC: 9, exp: 1.5, cap: 400, w: { head: 1.5, inner: 1, outer: 0.25 }, |
| src/economy.mjs:11:graceDay:2 | 生理日 | export const UPKEEP = { every: 5, graceDay: 10, wageC: 9, exp: 1.5, cap: 400, w: { head: 1.5, inner: 1, outer: 0.25 }, |
| src/economy.mjs:45:every:1 | 生理日 | export const MARKET = { every: 5, stock: { herb: 12, weapon: 2 }, price: { herb: 5, weapon: 80 }, herbBundle: 3, rise: 1.25, pill: { price: 14, fall: 0.85, max: 6 }, weaponMul: 1.08, |
| src/economy.mjs:74:lsDay:1 | 生理日 | export const MOUNTAIN_MARKET = { lsDay: 12, lsPrice: 28, lsMin: 1, lsMax: 2, buyBudget: 15, producerFacilities: ['veg', 'herb', 'alchemy'] }; |
| src/economy.mjs:97:every:1 | 生理日 | export const PILL_AGE = { keep: 10, every: 5, rate: 0.1 }; |
| src/economy.mjs:101:dur:1 | 生理日 | export const SCHOOL = { cost: 20, rise: 1.2, dur: DAY, poolMax: 2 }; |
| src/economy.mjs:163:fitnessTau:1 | 成長年 | fitnessTau: growthDaysFromRealDays(42), |
| src/economy.mjs:164:fatigueTau:1 | 成長年 | fatigueTau: growthDaysFromRealDays(7), |
| src/economy.mjs:165:workdayShare:1 | 生理日 | workdayShare: 1 / 3, |
| src/economy.mjs:283:banditDelay:1 | 動作秒 | banditDelay: 2, |
| src/economy.mjs:293:banditDelay:1 | 動作秒 | export const peaceDelay = (s) => (peaceful(s) ? PEACE.banditDelay : 0); |
| src/exp-map-combat.mjs:10:maxSeconds:1 | 動作秒 | export const EXP_BOUT = { maxSeconds: 90, halfWidth: 150, halfHeight: 100, fleeAt: .35 }; |
| src/exp-map-combat.mjs:28:cool:1 | 動作秒 | pos: [entry[0] + i * RING.step / 2, entry[1] + i * RING.step / 2], cool: 0, energy: 100, weapon: foeKey === 'archer' ? 'arrow' : foeKey === 'bandit' ? 'blade' : null, |
| src/family.mjs:12:yearDays:1 | 成長年 | yearDays: DAYS_PER_YEAR, |
| src/family.mjs:13:adultAge:1 | 成長年 | adultAge: 14, |
| src/family.mjs:14:gestationYears:1 | 成長年 | gestationYears: 0.75, |
| src/family.mjs:15:conceiveYear:1 | 成長年 | conceiveYear: 0.85, |
| src/family.mjs:16:knownYears:1 | 成長年 | knownYears: 1 / 13, |
| src/family.mjs:17:motherMaxAge:1 | 成長年 | motherMaxAge: 40, |
| src/family.mjs:20:babyAge:1 | 成長年 | babyAge: 3, |
| src/family.mjs:70:age:1 | 成長年 | const d = { ...JSON.parse(JSON.stringify(mother)), id, name, adult: false, birthDay: s.day, child: { since: s.t, born: s.day, parents: ps.map((p) => p.id) }, age: 0, fem: rnd() < FAMILY.girlShare, sprite: 'cousin', role: |
| src/growth-adapter.mjs:10:today:1 | 生理日 | if (!art \|\| !d.arts?.[id]) return { art: null, tier: -1, title: '白身・初學', progress: 0, left: null, today: 0, firstLine: '白身・初學｜先練出第一門功夫' }; |
| src/growth-playback.mjs:40:formSeconds:1 | 動作秒 | return {move,wind,pause,formSeconds:4*wind+pause, |
| src/hero.mjs:43:cool:1 | 動作秒 | role: 'inner', duties: [...CHORE_ACTS], prio: 'normal', chore: 0, choreDebt: 0, contrib: 0, task: null, order: null, reason: '開局同門', carry: null, cool: 0, walked: 0, face: 1, anim: null, |
| src/hero.mjs:78:days:1 | 生理日 | export const GUOJING_EARLY = { days: 20, art: 'xianglong', mul: 1.35 }; |
| src/hero.mjs:84:DAY literal:1 | 生理日 | if (H.personality.includes('indecisive')) ch.delay = DAY * 0.5; |
| src/jianghu.mjs:18:gambleDay:1 | 生理日 | export const jhInit = () => ({ cards: {}, comedy: [], comedyOn: true, diao: 0, armLost: false, honey: 0, zbt: null, dfbb: 0, hy: 0, hidden: 0, gambleDay: -1, gambleSum: 0, poison: null, arcs: {}, residue: {} }); |
| src/jianghu.mjs:54:DAY literal:1 | 生理日 | huagu: [(s) => { resSet(s, 'herb', Math.max(0, (s.res.herb \|\| 0) - 2)); log(s, '解藥到手——其實他只是想要藥材。'); }, (s) => { const d = fighters(s)[0]; mood(d, -10); s.jh.poison = { id: d?.id, until: s.t + 3 * DAY }; }], |
| src/jianghu.mjs:87:cool:1 | 生理日 | export const VILLAIN = { cool: 8, more: 2 }; |
| src/jianghu.mjs:200:DAY literal:1 | 生理日 | if (yg && J.diao < JH.diaoFeeds && s.t - (s.xia?.joinT?.yangguo ?? s.t) > DAY * 0.5 && !J.cards['diao' + J.diao]) { J.cards['diao' + J.diao] = true; card(s, 'diao', true); return; } |
| src/jianghu.mjs:219:DAY literal:1 | 生理日 | if (comedyOk(s) && s.day !== J.comedyDay && s.t % DAY > DAY * 0.5) { J.comedyDay = s.day; const pool = [J.hai && 'paicuo', J.hai && 'huagu', J.hai && 'zhabo', present(s, 'baozupo') && 'bao', s.day >= 2 && 'beggar'].filte |
| src/jianghu.mjs:225:cool:1 | 生理日 | export const JHEV = { master: { p: 0.12, after: 4, cool: 6, xp: 8, mood: 5, teach: 0.3 }, letter: { p: 0.08, after: 8, cool: 9, base: 75, grow: 30, win: { rep: 6, mood: 6, coin: 10, xp: 5 }, lose: { rep: 2, mood: 8 }, re |
| src/jianghu.mjs:225:cool:2 | 生理日 | export const JHEV = { master: { p: 0.12, after: 4, cool: 6, xp: 8, mood: 5, teach: 0.3 }, letter: { p: 0.08, after: 8, cool: 9, base: 75, grow: 30, win: { rep: 6, mood: 6, coin: 10, xp: 5 }, lose: { rep: 2, mood: 8 }, re |
| src/practice.mjs:8:reactionShape:1 | 動作秒 | export const PRACTICE = Object.freeze({ halfUses: 50, alpha: Math.log(2) / Math.log(51), bodyScale: 10, reactionFloor: .2, reactionSpan: .4, eyeHalf: 3, ordinaryWu: 3, reactionShape: 2, codexUnit: 1, eventLimit: EVENT_LI |
| src/recruitment.mjs:7:day:1 | 生理日 | export const recruitmentInit = (basePeople = 0) => ({ policy: 'casual', basePeople, cap: null, departures: 0, away: [], returned: {}, workBooked: { day: 0, slots: [] } }); |
| src/sect.mjs:19:startAge:1 | 成長年 | export const GEN = { lineMul: 1.2, lineTier: 2, heirShare: 0.5, suhuiMax: 3, startAge: 22 }; |
| src/sect.mjs:20:day:1 | 生理日 | export const genInit = () => ({ n: 1, couples: [], kids: [], lineage: [], retired: [], suhui: 0, day: -1, kidN: 0 }); |
| src/sect.mjs:29:everyDays:1 | 生理日 | export const MARRY = { cap: 5, everyDays: 5, rel: 90, cost: 100 }; |
| src/sect.mjs:74:startAge:1 | 成長年 | for (const d of s.ds) { d.age ??= d.adult ? GEN.startAge : 10; if (d.master) refreshLine(s, d); } |
| src/sect.mjs:82:keptDay:1 | 生理日 | const o = { id, name: B.name, plaque: B.plaque, color: B.color, flag: B.flag, bias: { ...B.bias }, tree: [...B.tree], ban: [...B.ban], rules: [...B.rules], rivals: [...B.rivals], rep: 0, fac: false, viol: {}, violN: 0, l |
| src/sect.mjs:82:day:2 | 生理日 | const o = { id, name: B.name, plaque: B.plaque, color: B.color, flag: B.flag, bias: { ...B.bias }, tree: [...B.tree], ban: [...B.ban], rules: [...B.rules], rivals: [...B.rivals], rep: 0, fac: false, viol: {}, violN: 0, l |
| src/sect.mjs:208:DAY literal:1 | 生理日 | if (!broke && s.t - S.lastViolT >= 7 * DAY && s.day - S.keptDay >= 7) { S.keptDay = s.day; S.rep += SECT_K.keepWeek; log(s, '【門規】七日無違，${S.name}門風整肅（門派聲望 +${SECT_K.keepWeek}）。'); } |
| src/sect.mjs:291:days:1 | 生理日 | export const BISAI24 = { days: [10, 20], minN: 2, champMood: 15, champXp: 25, allXp: 10, newXp: 10 }; |
| src/sim.mjs:76:day:1 | 生理日 | v: SAVE_VERSION, rules: RULES_VERSION, seed, t: 0, xia: xiaInit(), hs: hsInit(), jh: jhInit(), routine: { ...ROUTINE_DEFAULT }, socialThoughts: [], forayPolicy: 'allow', forayStats: { starts: 0, patrols: 0, hurt: 0, disc |
| src/sim.mjs:76:day:2 | 生理日 | v: SAVE_VERSION, rules: RULES_VERSION, seed, t: 0, xia: xiaInit(), hs: hsInit(), jh: jhInit(), routine: { ...ROUTINE_DEFAULT }, socialThoughts: [], forayPolicy: 'allow', forayStats: { starts: 0, patrols: 0, hurt: 0, disc |
| src/sim.mjs:88:livedDays:1 | 生理日 | s.hermitage = { active: true, stage: 0, founded: false, livedDays: 0, opening: typeof heroSpec?.opening === 'string' ? heroSpec.opening : heroSpec?.partner \|\| 'custom' }; |
| src/sim.mjs:131:cool:1 | 動作秒 | role: 'inner', duties: [...CHORE_ACTS], prio: 'normal', chore: 0, choreDebt: 0, contrib: 0, task: null, order: null, reason: at === 'gate' ? '慕名上山' : '剛到道館', carry: null, cool: 0, walked: 0, face: 1, anim: null, |
| src/sim.mjs:625:ttl:1 | 動作秒 | if (t.act === 'spar' && t.partner && Math.floor(t.timer / 1.2) !== Math.floor((t.timer - dt) / 1.2)) { const p = byId(s, t.partner); const mv = MOVES.find((m) => m.id === d.moves[d.moves.length - 1]); s.fx.push({ kind: ' |
| src/sim.mjs:664:ttl:1 | 動作秒 | if (t.act === 'meditate') { const b = btReady(d, s.t); if (!b) for (let i = 0; i < (facStage(s, t.fac).medEase \|\| 1); i++) easeWexin(s, d); const r = b && resolveBreak(d, b, s.t, rand(s) - ngBreak(d)); /* loop105 內力衝關： |
| src/sim.mjs:708:wait:1 | 生理日 | export const TEACH_JOIN = { node: 'yard', wait: DAY / 8 }; |
| src/sim.mjs:713:wait:1 | 動作秒 | reserve(s, m, b.key); m.task = { act: 'teach', node: TEACH_JOIN.node, phase: 'go', partner: p.id, wait: 0, resv: [b.key], spot: b.spot, spotKind: b.spotKind }; goto(m, TEACH_JOIN.node, b.xy); m.reason = '到外功場傳授${p.name}' |
| src/sim.mjs:731:gap:1 | 動作秒 | s.hunt = { wave: 0, waves, gap: 0, t: 0, kills: 0, escaped: 0, hits: {}, team: team.map((d) => d.id), post: s.post, perWave: [] }; |
| src/sim.mjs:763:DAY literal:1 | 生理日 | if (on.trip) { tgt.tripUntil = s.t + 2.5; tgt.cool = Math.max(tgt.cool \|\| 0, on.trip); } |
| src/sim.mjs:764:DAY literal:1 | 生理日 | if (on.disturb) { tgt.tripUntil = s.t + 2.5; tgt.cool = Math.max(tgt.cool \|\| 0, on.disturb); } |
| src/sim.mjs:774:ttl:1 | 動作秒 | function clashFx(s, who, key) { const w = CLASH_WORD[key]; if (!w \|\| !who?.pos) return; s.fx.push({ kind: 'clash', word: w[0], color: w[1], pos: [...who.pos], ttl: 0.8 }); (s.clashN ??= {})[key] = (s.clashN[key] \|\| 0 |
| src/sim.mjs:791:ttl:1 | 動作秒 | zjMark(s, foe, zjHas(foe, 'taiji') ? 'taiji' : 'taijiSword'); s.zjN.shift = (s.zjN.shift \|\| 0) + 1; s.fx.push({ kind: 'dash', from: [...foe.pos], to: [...back.pos], ttl: 0.4, color: '#d8d8d8' }); |
| src/sim.mjs:801:ttl:1 | 動作秒 | s.fx.push({ kind: 'bite', pos: [...foe.pos], ttl: 0.4 }); |
| src/sim.mjs:816:ttl:1 | 動作秒 | s.fx.push({ kind: 'dash', from: [...d.pos], to: [nx, ny], ttl: 0.35, color: '#cfe0f5' }); d.pos = [nx, ny]; |
| src/sim.mjs:830:ttl:1 | 動作秒 | { const tier = visTier(d, mv.id), a = artOfMove(mv.id), va = a && variantOf(d, a.id, s.t); s.fx.push({ kind: 'move', mfx: mv.fx, zx: (d.zixia \|\| 0) >= 5, name: mv.name, color: mv.color, from: [...d.pos], to: [...tgt.po |
| src/sim.mjs:846:cool:1 | 動作秒 | while (h.queue.length && h.queue[0].t <= h.wt) { const q = h.queue.shift(), M = MONSTERS[q.k]; const S0 = SOURCES[q.src] \|\| SOURCES.den; s.mons.push(restoreSurvivor(s,q.k,{ uid: '${q.k}${s.rngN++}', k: q.k, hp: M.hp, m |
| src/sim.mjs:963:cool:1 | 動作秒 | s.mons.push(restoreSurvivor(s,'boar',{ uid: 'raid${s.rngN++}', k: 'boar', hp: MONSTERS.boar.hp, max: MONSTERS.boar.hp, pos: [...SOURCES.den.pos], src: 'den', path: route('den', 'veg').slice(1), raid: 'go', cool: 0 })); |
| src/sim.mjs:1132:cool:1 | 動作秒 | s.mons.push({ uid: 'firstDog', k: 'dog', trial: true, hp: MONSTERS.dog.hp, max: MONSTERS.dog.hp, pos: [...SOURCES.den.pos], src: 'den', path: MON_PATH.slice(1), cool: 0 }); log(s, '黃昏，一隻野狗從獸穴口沿山路走向木樁場。師父：「別轉身跑，站穩看看牠。」'); |
| src/social-thoughts.mjs:9:days:1 | 生理日 | surrounded: { opinion: 5, days: 30, where: '山門', text: '{actor}和{target}被圍時一起撐了過來' }, |
| src/social-thoughts.mjs:10:days:1 | 生理日 | sparLoss: { opinion: 2, days: 12, where: '外功場', text: '{target}切磋輸給了{actor}，記住了這一招' }, |
| src/social-thoughts.mjs:11:days:1 | 生理日 | rageHeld: { opinion: 6, days: 30, where: '山門', text: '{actor}在{target}惱羞時拉住了他' }, |
| src/social.mjs:39:admireGap:1 | 動作秒 | admireGap: 20, |
| src/social.mjs:71:askGap:1 | 動作秒 | askGap: 20, |
| src/starter-combat.mjs:2:reaction:1 | 動作秒 | export const BODY_TIMING = { reaction: 0.6, simple: 0.2, step: 0.3, guard: 0, recovery: 0.55, bodyMass: 70, forceSkill: 0.2 }; |
| src/starter-combat.mjs:21:wind:1 | 動作秒 | boar: { body:{balance:70},injuryAnger:true,escapeSource:'habitat',hands:0,mass: 120, armor: 32, force: 40, speed: 18, moves: [{id:'survivorFeint',name:'假衝',wind:.5,force:40,range:80,feint:true,requiresSurvived:true,once: |
| src/starter-combat.mjs:25:wind:1 | 動作秒 | archer: { body:{balance:45},escapeSource:'gate',hands:2,mass: 70, armor: 4, force:18,speed:25,moves:[{id:'archerArrow',name:'搭箭射',family:'shoot',type:'stone',wind:1.2,force:22,range:140,minDistance:45},{id:'archerKnife', |
| src/threat.mjs:33:gap:1 | 動作秒 | export const WAVE = { p: { liukou: 0.8, hanfei: 1, yexi: 0.5 }, k: 1.8, gap: 60 }; |
| src/threat.mjs:137:hitEvery:1 | 動作秒 | export const BAND = { from: 'gate', speed: 38, hitEvery: 2, fenceDmg: { k: 0.04, min: 3 }, dps: { base: 1, per: 30 }, defendScore: 500, hpMin: 40, energyMin: 20 }; |
| src/threat.mjs:146:gap:1 | 巡山距離 | export const BAND_MEMBER = { pts: 40, min: 2, max: 8, ring: 4, gap: 16, outer: 64 }; |
| src/threat.mjs:163:bandCadence:1 | 動作秒 | const bandCadence = 2.5; |
| src/threat.mjs:164:cd:1 | 動作秒 | export const BAND_CLASH = { agi: [20, 30, 45, 55] /* 山賊的身法（輪流），#425 輕功交錯用 */, cd: 1.5, monCd: bandCadence, |
| src/threat.mjs:179:ttl:1 | 動作秒 | m.state = 'down'; m.downT = s.t; m.path = nodePath(FENCE.node, BAND.from).slice(1); (s.fx \|\|= []).push({ kind: 'clash', word: '退', color: '#c9b37a', pos: [...(m.pos \|\| b.pos)], ttl: 1 }); |
| src/threat.mjs:194:ttl:1 | 動作秒 | if (r.kind === 'hit') { breakWindup(s, d, m, w.mv, w.wind, r.contact); bandHit(s, b, m, w.dmg * (r.heavy ? CLASH.heavy : 1) * r.contact.damageFactor, d); } else (s.fx \|\|= []).push({ kind: 'clash', word: r.kind === 'dod |
| src/threat.mjs:212:ttl:1 | 動作秒 | (s.fx \|\|= []).push({ kind: 'cross', pos: [(m.pos[0] + d.pos[0]) / 2, (m.pos[1] + d.pos[1]) / 2], ttl: 0.6 }); if (b.cross === 1) log(s, '【輕功交錯】${d.name}和一名山賊同時突進，擦身而過，火花一閃，兩人都退了半步'); continue; } |
| src/threat.mjs:220:ttl:1 | 動作秒 | d.hp = Math.max(1, d.hp - incoming); (s.fx \|\|= []).push({ kind: 'bite', pos: [...d.pos], ttl: 0.4 }); partHit(s, d, r, { attack: m, rnd: () => R(s) }); } |
| src/threat.mjs:277:dayK:1 | 生理日 | w: { coin: 1, food: 1, pill: 8, herb: 1 }, div: 2, dayK: 30, dayMax: 2, cap: 900, |
| src/threat.mjs:277:dayMax:2 | 生理日 | w: { coin: 1, food: 1, pill: 8, herb: 1 }, div: 2, dayK: 30, dayMax: 2, cap: 900, |
| src/threat.mjs:280:hurtCool:1 | 動作秒 | logAfter: 30, logK: 0.2, hurtCool: 2, |
| src/threat.mjs:281:wait:1 | 生理日 | demand: { base: 20, k: 0.6, coinMax: 0.35, min: 10 }, wait: DAY / 2, hurtCost: 80, hurtHp: 15, winHurt: 0.4, steal: { coin: 0.15, food: 0.2 }, rep: 3 }; |
| src/threat.mjs:308:lastBigDay:1 | 生理日 | export function T(s) { return (s.threat ??= { next: Number.MAX_SAFE_INTEGER, n: 0, paid: 0, fought: 0, won: 0, homeHurt: 0, deaths: 0, pending: null, rng: 0, hist: [], adapt: 1, rhythmCycle: null, rhythmStrikes: 0, lastB |
| src/threat.mjs:390:peaceGap:1 | 生理日 | export const BOSS = { after: 3, k: 1.4, min: 8, peaceMul: 0.4, peaceGap: 3, valor: 10 }; |
| src/threat.mjs:485:dur:1 | 動作秒 | export const SHELTER = { hpLow: 50, qiLow: 25, dur: 4 }; |
| src/threat.mjs:523:dur:1 | 生理日 | export const LAIR = { after: 3, team: 2, supply: 2, dur: DAY / 2, k: 1.0, peaceDays: 10, minHp: 60, cool: 5 }; |
| src/threat.mjs:523:peaceDays:2 | 生理日 | export const LAIR = { after: 3, team: 2, supply: 2, dur: DAY / 2, k: 1.0, peaceDays: 10, minHp: 60, cool: 5 }; |
| src/threat.mjs:523:cool:3 | 生理日 | export const LAIR = { after: 3, team: 2, supply: 2, dur: DAY / 2, k: 1.0, peaceDays: 10, minHp: 60, cool: 5 }; |
| src/threat.mjs:632:day:1 | 生理日 | export const CRU27 = { day: 12, rep: 15, cool: 8, foodMax: 8, dur: DAY / 2, minHp: 60, minTeam: 2, E: [400, 600, 780, 1000], dayK: 20, autoDays: [13, 14, 22, 23], autoFood: 14, autoSpare: 2, autoP: 0.5, |
| src/threat.mjs:632:cool:2 | 生理日 | export const CRU27 = { day: 12, rep: 15, cool: 8, foodMax: 8, dur: DAY / 2, minHp: 60, minTeam: 2, E: [400, 600, 780, 1000], dayK: 20, autoDays: [13, 14, 22, 23], autoFood: 14, autoSpare: 2, autoP: 0.5, |
| src/threat.mjs:632:dur:3 | 生理日 | export const CRU27 = { day: 12, rep: 15, cool: 8, foodMax: 8, dur: DAY / 2, minHp: 60, minTeam: 2, E: [400, 600, 780, 1000], dayK: 20, autoDays: [13, 14, 22, 23], autoFood: 14, autoSpare: 2, autoP: 0.5, |
| src/threat.mjs:632:dayK:4 | 生理日 | export const CRU27 = { day: 12, rep: 15, cool: 8, foodMax: 8, dur: DAY / 2, minHp: 60, minTeam: 2, E: [400, 600, 780, 1000], dayK: 20, autoDays: [13, 14, 22, 23], autoFood: 14, autoSpare: 2, autoP: 0.5, |
| src/threat.mjs:632:autoDays:5 | 生理日 | export const CRU27 = { day: 12, rep: 15, cool: 8, foodMax: 8, dur: DAY / 2, minHp: 60, minTeam: 2, E: [400, 600, 780, 1000], dayK: 20, autoDays: [13, 14, 22, 23], autoFood: 14, autoSpare: 2, autoP: 0.5, |
| src/time-scale.mjs:4:physical scale:1 | 地圖尺度 | export const METERS_PER_PIXEL = 0.025; |
| src/time-scale.mjs:6:physical scale:1 | 地圖尺度 | export const METERS_PER_ZHANG = 3; |
| src/time-scale.mjs:7:physical scale:1 | 地圖尺度 | export const pixelsToMeters = pixels => pixels * METERS_PER_PIXEL; |
| src/time-scale.mjs:8:physical scale:1 | 地圖尺度 | export const zhangToMeters = zhang => zhang * METERS_PER_ZHANG; |
| src/time-scale.mjs:14:DAYS_PER_YEAR:1 | 成長年 | export const DAYS_PER_YEAR = 28; |
| src/time-scale.mjs:16:REAL_DAYS_PER_YEAR:1 | 成長年 | export const REAL_DAYS_PER_YEAR = 365.2425; |
| src/util.mjs:10:BUBBLE_TTL:1 | 動作秒 | export const BUBBLE_TTL = 8; |
| src/world.mjs:23:projection scale:1 | 示意距離 | export const PX = 2.4; |
| src/world.mjs:55:decay:1 | 生理日 | export const ECO2 = { immig: 1, immigNoDen: 0.5, br: 2, kill: 0.02, killMax: 0.3, decay: 0.85, denAt: 4, denDays: 5, denCut: 0.5 }; |
| src/world.mjs:55:denDays:2 | 生理日 | export const ECO2 = { immig: 1, immigNoDen: 0.5, br: 2, kill: 0.02, killMax: 0.3, decay: 0.85, denAt: 4, denDays: 5, denCut: 0.5 }; |
| src/world.mjs:57:DAYS:1 | 生理日 | const DAYS = DAY; |
| src/world.mjs:188:every:1 | 動作秒 | export const AUTO = { keys: 3, prefix: 'solo-sect-auto-', every: 60 }; |
| src/world.mjs:223:every:1 | 巡山距離 | return { id: 'end' + k, name: '絕頂之上・第${k}重', from, to: from + ENDLESS.len, every: 50, roster: ENDLESS.roster, find: ENDLESS.find, scale: (L.scale \|\| 1) * ENDLESS.mul ** k, gate: ENDLESS.gate, gateName: '第${k}重無名高手', en |
| src/world.mjs:256:seconds:1 | 動作秒 | const mv=pick?.move;if(!mv)return {mv:null,dps:0,seconds:0}; |
| src/world.mjs:297:perDay:1 | 生理日 | export const A9 = { minHp: 70, dps: 80, perDay: 5, idleCap: 20, mood: 10, diverse: 6, keep: 25, bond: 20 }; |
| src/world.mjs:301:DAY literal:1 | 生理日 | const base = (d) => { const idle = Math.min(A9.idleCap, ((s.t - (d.lastExp ?? -DAY * 9)) / DAY) * A9.perDay), m = Math.max(0, (60 - d.mood) / 60) * A9.mood; return { sp: (dpsOf(s, d) / top) * A9.dps, idle, m }; }; |
| src/world.mjs:554:coolFast:1 | 動作秒 | const cool = EXP.cool * (fast ? EXP.coolFast : 1); for (const d of team) d.restUntil = s.t + cool; |
| src/wuxia.mjs:26:DAY literal:1 | 生理日 | need: (s) => present(s, 'guojing') && s.t - (s.xia.joinT.guojing ?? (s.hero?.id === 'guojing' ? 0 : s.t)) >= DAY * 0.5, why: '郭靖在門中半天以上（下山採買時遇上）' }, |
| src/wuxia.mjs:84:DAY literal:1 | 生理日 | if ((X.declined[k] \|\| -1e9) > s.t - 3 * DAY \|\| !XIA[k].need(s) \|\| !rumorForVisitor(s, [XIA[k].motive \|\| 'teaching'])) continue; |
| src/wuxia.mjs:146:gap:1 | 生理日 | export const TEACH = { stages: 3, gap: DAY / 2, stay: 4 * DAY }; |
| src/wuxia.mjs:146:stay:2 | 生理日 | export const TEACH = { stages: 3, gap: DAY / 2, stay: 4 * DAY }; |
| src/wuxia.mjs:160:ttl:1 | 動作秒 | s.fx?.push({ kind: 'dragon', pos: [...(st.pos \|\| [800, 450])], ttl: 2.2 }); |
| src/wuxia.mjs:192:lastCarvDay:1 | 生理日 | export const hsInit = () => ({ zx: 0, cave: false, carv: 0, lastCarvDay: -1, bixie: 0, bixieT: null, songN: 0, songLast: 0, siguo: false, feng: null, fengLeft: false, fengTries: 0, jealous: false, lhc: 'stay', cards: {}, |
| src/wuxia.mjs:235:ttl:1 | 動作秒 | s.fx?.push({ kind: 'zixia', pos: [...(d.pos \|\| [800, 450])], ttl: 2.0 }); log(s, '【紫霞神功 第 ${d.zixia} 層】${d.name}閉關衝關，紫氣自頂門升起${d.zixia >= 5 ? '，劍刃隱隱泛紫' : ''}。'); |
| src/wuxia.mjs:280:ttl:1 | 動作秒 | s.fx?.push({ kind: 'dugu', pos: [...(d.pos \|\| [800, 450])], ttl: 1.6 }); |
<!-- TIME CONSTANT INVENTORY END -->
