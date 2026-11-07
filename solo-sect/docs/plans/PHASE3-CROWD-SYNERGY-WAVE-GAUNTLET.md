# Phase 3 設計與實作交接規格書：群戰無雙割草、雙劍合璧／陣法合擊 × 闖關波次與人格演繹（Crowd Mow-Down, Partner/Formation Synergy & Wave Gauntlet Micro-Stage）

> **目標分支**：`codex/solo-sect-grok`（`solo-sect/` 目錄）  
> **前置基礎**：Phase 1（人體工學與生活／套路微距窗 `59af2e06`）＋ Phase 2（硬核接招拆招與單挑／鎖角微距特寫 `f6302233`）  
> **核心定位**：完成玩家期望的第三階段武俠浪漫與戰術深度——**「實力差距過大時走過倒一片／一劍刺瞎眾敵雙目、與小龍女雙劍合璧或同門真武七截陣／背靠背借樹卡位、塔防式一波波迎戰魔教與獸潮闖關進度、以及 16 型人格（MBTI）驅動的自動戰鬥演繹（如重情護侶捨身擋刀、孤狼看破、人來瘋群戰）」**，並維持 100% 零模擬污染（Zero Simulation Contamination）。

---

## 一、 設計目標與玩家體驗（4 大核心群戰與羈絆場景）

1. **場景 A：實力輾壓「走過倒一片」與令狐沖式「一劍盡奪敵目」（Mow-Down & Blind-All-Eyes Sweep — `crowdMode`）**
   * **觸發條件**：計算主角與圍攻敵群的綜合戰力比 `powerGapRatio`。
     * **`'walkPastKnockdown'`（錯身輕拂・走過倒一片）**：當 `powerGapRatio >= 2.2`（或 `view.mowDown === true`，如大成／化境高手面對普通山賊、山鼠、嘍囉），高手不需擺開架勢苦戰，輕輕錯身拂袖走過，敵群便東倒西歪震飛一地。
     * **`'blindAllEyes'`（一劍破盡・盡奪敵目）**：當 `powerGapRatio >= 1.8` 且圍攻敵人數 `>= 2`，且主角修習獨孤九劍／葵花／辟邪或 `view.blindAllEyes === true` 時，重現小說中令狐沖於破廟一劍刺瞎十五名蒙面人雙目的名場面——微距視窗中一道銀白劍芒瞬間串連場上所有敵人的眼部破綻準星，群敵齊齊掩目後仰！
     * **`'whirlwindSweep'`（橫掃千軍・以一敵眾）**：當面對 `2+` 名敵人且 `1.35 <= powerGapRatio < 2.2` 時，展現一人獨戰群雄的扇形氣勁橫掃。
2. **場景 B：伴侶雙劍合璧、真武七截陣與背靠背／借樹卡位（Partner & Formation Synergy — `synergyMode`）**
   * **觸發條件**：讀取同場並肩作戰的伴侶／同門（`allies(s, d)`、`s.gen?.couples`、`backToBackPartner(s, d)`、`coverFor(d)`）：
     * **`'twinSwordsCouple'`（雙劍合璧・神鵰俠侶／玉女素心）**：當主角與場上同伴為伴侶（`s.gen?.couples`）、或同修《玉女心經》／《全真劍法》、或 `partner.xia === 'xiaolongnv'` / `'yangguo'`（或 `view.synergyMode === 'twinSwordsCouple'`）時觸發。微距視窗同時繪製主角與伴侶並肩出劍，雙劍交織出陰陽雙色劍虹（「`☯ 雙劍合璧・玉女素心！`」），合力倍率 `synergyBonus = 1.35`。
     * **`'zhenwuArray'`（真武七截陣・同門陣法合擊）**：當同場參戰同門 `>= 3` 人（即 `alliesCount >= 2`）、或武當／門派陣法啟動（或 `view.synergyMode === 'zhenwuArray'`）時觸發。微距視窗地面浮現北斗／八卦金陣圖騰，同門殘影協同夾擊（「`⚔ 真武七截陣・天罡合擊！`」），圍攻負荷減半 `effectiveLoadL = loadL * 0.5`，合力倍率 `synergyBonus = 1.5`。
     * **`'backToBack'`（背靠背守望）**：當 `backToBackPartner(s, d)` 成立（或 `view.synergyMode === 'backToBack'`），兩名弟子背靠背站立，將敵方同時可進攻槽位由 4 壓縮至 2（「`🛡 背靠背禦敵・死角封鎖`」）。
     * **`'terrainCover'`（借樹／山門一夫當關）**：當 `coverFor(d)` 成立（或 `view.cover` 指定 `'guardTree' | 'gate' | 'hallWall'`），微距視窗左側／身側繪製古松樹幹或山門石柱掩體，將多敵鎖角威脅阻擋於掩體之外（「`🌲 借樹卡位・一夫當關`」）。
3. **場景 C：16 型人格（MBTI）自主戰鬥靈魂與「重情捨身護侶」（MBTI Combat Persona — `mbtiPersona`）**
   * **觸發條件**：由弟子的 `d.mbti` 或 `d.personality` 推導四維戰鬥性格（`E/I`, `S/N`, `T/F`, `J/P`）：
     * **E 型（人來瘋 `crowdSurge`）vs. I 型（孤狼 `loneWolfFocus`）**：E 型在群戰或有同伴並肩時戰意高昂；I 型在獨自對敵時心如止水、看破率提升。
     * **S 型（實感硬橋 `solidStance`）vs. N 型（直覺頓悟 `intuitiveFlash`）**：S 型穩紮穩打；N 型在交鋒中靈光一閃看破變招。
     * **T 型（冷酷鎖弱 `tacticalCull`）vs. F 型（重情護侶 `bondGuardian`）**：T 型優先鎖定殘血最弱敵人；F 型在伴侶／同門受傷（`partner.hp / (partner.max || 100) < 0.6` 或 `view.partnerHurt === true`）時，自動觸發**「捨身擋刀（`guardianShield: true`）」**——在微距視窗中橫身躍至伴侶身前擋下致命一擊（「`❤️ 捨身護侶・寸步不讓！`」）。
     * **J 型（嚴謹章法 `methodicalArray`）vs. P 型（無招隨性 `freestyleFlow`）**：J 型章法森嚴；P 型隨性變招。
4. **場景 D：塔防式闖關與迎戰魔教／獸潮波次橫幅（Wave Gauntlet Progression — `waveGauntlet`）**
   * **觸發條件**：讀取 `s.hunt`（山門守點狩獵／獸潮波次）、`s.siege27` / `s.crusade27`（魔教／六大派連波圍山與討伐）、`s.exp`（巡山闖關連續破敵）或 `view.waveGauntlet`。
   * **微距演繹**：在微距視窗頂部／右上角渲染闖關波次進度徽章（例如 `🏯 迎戰魔教・第 2/4 波・連破 8 敵` 或 `🔥 守山獸潮・第 3/3 波`），並在畫布右側同框渲染 2～3 名錯落逼近的敵群剪影，讓玩家直觀感受「從只能打贏一兩個山賊，到攜手小龍女一路闖關橫掃魔教群敵」的成長爽感。

---

## 二、 架構原則與檔案邊界

> [!IMPORTANT]
> **零模擬污染鐵律（Zero Simulation Contamination）**  
> 1. 所有新增之群戰、合擊、人格與波次遙測函式（`crowdSynergyFrame` 與擴充後的 `ergonomicFrame`）必須是**純讀取函式（Read-Only Pure Projection）**，嚴禁呼叫 `s.rng()` 或改寫 `d` / `s` 內的任何模擬屬性。  
> 2. 既有 Phase 1、Phase 2 單測、`smoke`、`quick` 與 `docs-links.test.mjs` 必須 100% 通過。  
> 3. **不新增額外 `.mjs` 模組檔案**（保持 `docs/architecture/MODULES.md` 的 19 模組契約不變）。

### 修改與新增檔案清單
1. `solo-sect/src/growth-playback.mjs`（修改：新增並匯出 `crowdSynergyFrame(d, s, view)`，並掛載於 `ergonomicFrame(...).crowdDetail` 與 `synergy` 別名）
2. `solo-sect/src/paper-doll.mjs`（修改：支援 `'walkPastKnockdown'` 瀟灑負手／拂袖姿態、`'guardianShield'` 橫臂護侶姿態）
3. `solo-sect/src/pose-render.mjs`（修改：`renderMicroStage` 支援雙人並肩／雙劍合璧同伴繪製、右側多敵群像與倒地／刺目特效、真武七截陣地面陣圖、掩體樹木／門柱、波次闖關進度徽章與 MBTI 戰意銘牌）
4. `solo-sect/src/main.mjs`（修改：`drawMicroStage` 整合群戰割草、雙劍合璧與波次闖關狀態至 `#micro-caption`）
5. `solo-sect/test/unit/growth/phase3-crowd-synergy.test.mjs`（新增：驗證場景 A/B/C/D、Canvas 繪圖指令與零模擬污染）
6. `solo-sect/docs/README.md`（修改：索引本規格書）

---

## 三、 詳細規格設計

### 3.1 `solo-sect/src/growth-playback.mjs`：新增 `crowdSynergyFrame(d, s = {}, view = {})`

在 `growth-playback.mjs` 中匯入 `allies`, `backToBackPartner`, `coverFor`（自 `./tactics.mjs`），並定義與匯出 `crowdSynergyFrame(d, s = {}, view = {})`：

```js
export function crowdSynergyFrame(d, s = {}, view = {})
```

#### 回傳結構契約（Return Schema）
`crowdSynergyFrame(d, s, view)` 必須回傳包含以下欄位的純物件（且 `ergonomicFrame(d, s, view)` 必須將其掛載於 `ergo.crowdDetail` 與 `ergo.synergy`，同時將關鍵欄位合併進 `ergo.combatDetail`）：

1. **實力差距與群攻割草（Power Gap & Crowd Mow-Down）**
   * `selfPower`: 主角戰力估算值 `(d?.skills?.strength || 10) + (d?.skills?.agility || 10) + (topTier(d).t >= 0 ? (topTier(d).t + 1) * 22 : 0) + (qiPow(d) || 0)`（可由 `view.selfPower` 覆寫）。
   * `avgFoePower`: 圍攻敵群平均戰力估算（若無敵人則為 `selfPower`；每個敵人依 `(foe?.skills?.strength || 10) + (foe?.skills?.agility || 10) + (foe?.arts ? (topTier(foe).t + 1) * 20 : (foe?.k === 'rat' ? 8 : foe?.k === 'bandit' ? 18 : 25))` 計算；可由 `view.avgFoePower` 覆寫）。
   * `powerGapRatio`: `view.powerGapRatio ?? (avgFoePower > 0 ? selfPower / avgFoePower : 1)`。
   * `multiFoeCount`: 當前圍攻敵人數 `Math.max(duel.angleLockCount || 0, duel.allOpponents?.length || 0, view.multiFoeCount || 0)`。
   * `crowdMode`: `'none' | 'walkPastKnockdown' | 'blindAllEyes' | 'whirlwindSweep'`
     * 若 `view.crowdMode` 有指定則優先使用；
     * 若無敵人（`!duel.opponent && multiFoeCount === 0`）➔ `'none'`；
     * 若 `(view.blindAllEyes === true) || (multiFoeCount >= 2 && powerGapRatio >= 1.8 && (duel.zjEffect === 'dugu' || duel.zjEffect === 'kuihua'))` ➔ `'blindAllEyes'`（令狐沖一劍盡奪敵目）；
     * 若 `(view.mowDown === true) || (powerGapRatio >= 2.2)` ➔ `'walkPastKnockdown'`（高手錯身走過倒一片）；
     * 若 `multiFoeCount >= 2 && powerGapRatio >= 1.35` ➔ `'whirlwindSweep'`（橫掃群敵）；
     * 否則 `'none'`。
   * `knockedDownCount`: 當 `crowdMode === 'walkPastKnockdown'` 或 `'blindAllEyes'` 時，為 `Math.max(1, multiFoeCount || 3)`；否則 `0`。

2. **伴侶雙劍合璧、陣法合擊與地形掩體（Partner, Formation & Cover Synergy）**
   * `allyList`: 同場友軍陣列（`view.allies || (s && d ? allies(s, d) : [])`）。
   * `partner`: 協同作戰夥伴物件（優先取 `view.partner`；否則檢查 `s?.gen?.couples` 中與 `d.id` 配對且在場的伴侶；或同修 `yunv` 的在場同門；或 `backToBackPartner(s, d)`；或 `allyList[0]`；若無則 `null`）。
   * `cover`: 當前地形掩體物件（`view.cover ? (typeof view.cover === 'object' ? view.cover : { id: String(view.cover), kind: String(view.cover).includes('Tree') || view.cover === 'tree' ? 'tree' : 'gate', slots: 1 }) : (d ? coverFor(d) : null)`）。
   * `synergyMode`: `'none' | 'twinSwordsCouple' | 'zhenwuArray' | 'backToBack' | 'terrainCover'`
     * 優先讀 `view.synergyMode`；
     * 若有 `partner` 且滿足伴侶／雙劍條件（`Boolean(view.isCouple || (s?.gen?.couples || []).some((c) => c.includes(d?.id) && c.includes(partner?.id)) || (d?.arts?.yunv && partner?.arts?.yunv) || partner?.xia === 'xiaolongnv' || d?.xia === 'xiaolongnv')`）➔ `'twinSwordsCouple'`；
     * 若 `allyList.length >= 2 || Boolean(view.formation)`（3 人以上同門結陣）➔ `'zhenwuArray'`；
     * 若 `Boolean(partner && (view.backToBack || backToBackPartner(s, d)))` ➔ `'backToBack'`；
     * 若 `Boolean(cover)` ➔ `'terrainCover'`；
     * 否則 `'none'`。
   * `combinedArtName`:
     * `'twinSwordsCouple'` ➔ `'雙劍合璧・玉女素心'`
     * `'zhenwuArray'` ➔ `'真武七截陣・天罡合擊'`
     * `'backToBack'` ➔ `'背靠背・守望相助'`
     * `'terrainCover'` ➔ `'借勢卡位・一夫當關'`
     * `'none'` ➔ `null`
   * `synergyBonus`: `'twinSwordsCouple'` 為 `1.35`，`'zhenwuArray'` 為 `1.5`，`'backToBack'` 為 `1.2`，`'terrainCover'` 為 `1.15`，其餘 `1.0`。
   * `effectiveLoadL`: 經陣法／掩體／背靠背減免後的實際圍攻負荷：
     * `'zhenwuArray'` ➔ `duel.loadL * 0.5`
     * `'backToBack'` ➔ `duel.loadL * 0.6`
     * `'terrainCover'` ➔ `Math.min(duel.loadL, 0.35)`
     * `'twinSwordsCouple'` ➔ `duel.loadL * 0.65`
     * 其餘 ➔ `duel.loadL`

3. **16 型人格（MBTI）自主戰鬥演繹（MBTI Combat Persona）**
   * `mbtiCode`: 4 字母字串（優先取 `view.mbti || d?.mbti`，否則依 `d?.personality || []` 推導：含 `'social'/'bold'/'playful'` 為 `E` 否則 `I`；含 `'clever'/'free'/'nimble'` 為 `N` 否則 `S`；含 `'kind'/'gentle'/'chi'/'brave'` 為 `F` 否則 `T`；含 `'diligent'/'rigid'/'honest'/'stubborn'` 為 `J` 否則 `P`）。
   * `guardianShield`: 布林值。當 `mbtiCode.includes('F')`（或含 `'brave'/'chi'/'kind'`）且有 `partner` 且（`view.partnerHurt === true || (partner.hp != null && (partner.hp / (partner.max || 100)) < 0.6)`）時為 `true`（觸發重情護侶・捨身擋刀）。
   * `personaStyle`: `'bondGuardian' | 'crowdSurge' | 'loneWolfFocus' | 'intuitiveFlash' | 'tacticalCull' | 'solidStance'`
     * 若 `guardianShield` 為 `true` ➔ `'bondGuardian'`；
     * 若 `mbtiCode.startsWith('E') && (multiFoeCount >= 2 || partner)` ➔ `'crowdSurge'`（人來瘋・群戰亢奮）；
     * 若 `mbtiCode.startsWith('I') && !partner && multiFoeCount <= 1` ➔ `'loneWolfFocus'`（孤狼靜心・看破倍增）；
     * 若 `mbtiCode.includes('N')` ➔ `'intuitiveFlash'`（直覺頓悟・靈光破招）；
     * 若 `mbtiCode.includes('T')` ➔ `'tacticalCull'`（冷酷計算・專鎖弱點）；
     * 否則 `'solidStance'`（實感苦練・穩紮硬橋）。
   * `personaLabel`: 對應中文銘牌（`'捨身護侶'` / `'人來瘋・戰意高昂'` / `'孤狼・心如止水'` / `'頓悟・靈光破招'` / `'冷靜・專攻弱點'` / `'沉穩・硬橋硬馬'`）。

4. **闖關波次進度（Wave Gauntlet Telemetry）**
   * `waveGauntlet`: `{ active: boolean, kind: 'none' | 'demonSiege' | 'huntWave' | 'expeditionGauntlet' | 'crowdBout', wave: number, totalWaves: number, defeatedCount: number, bannerText: string }`
     * 若 `view.waveGauntlet` 提供則合併使用；
     * 若 `s?.siege27 || s?.crusade27 || view.waveKind === 'demonSiege'`：
       * `active = true`, `kind = 'demonSiege'`, `wave = s?.siege27?.wave || view.wave || 1`, `totalWaves = s?.siege27?.totalWaves || view.totalWaves || 4`, `defeatedCount = s?.siege27?.kills || view.defeatedCount || 0`, `bannerText = '🏯 迎戰魔教・第 ' + wave + '/' + totalWaves + ' 波'`
     * 否則若 `s?.hunt`：
       * `active = true`, `kind = 'huntWave'`, `wave = (s.hunt.wave || 0) + 1`, `totalWaves = s.hunt.waves || 3`, `defeatedCount = s.hunt.kills || 0`, `bannerText = '🔥 守山迎戰・第 ' + wave + '/' + totalWaves + ' 波（擊退 ' + defeatedCount + '）'`
     * 否則若 `s?.exp`：
       * `active = true`, `kind = 'expeditionGauntlet'`, `wave = (s.exp.fights || 0) + 1`, `totalWaves = Math.max(wave, 5)`, `defeatedCount = Object.values(s.exp.kills || {}).reduce((a, b) => a + b, 0)`, `bannerText = '⛰ 巡山闖關・第 ' + wave + ' 陣（連破 ' + defeatedCount + ' 敵）'`
     * 否則若 `multiFoeCount >= 2`：
       * `active = true`, `kind = 'crowdBout'`, `wave = 1`, `totalWaves = 1`, `defeatedCount = view.defeatedCount || 0`, `bannerText = '⚔ 獨戰群雄・以一敵 ' + multiFoeCount`
     * 否則：`{ active: false, kind: 'none', wave: 0, totalWaves: 0, defeatedCount: 0, bannerText: '' }`。

---

### 3.2 `solo-sect/src/pose-render.mjs` & `paper-doll.mjs`：微距舞台群戰與合擊視覺演繹

在 `renderMicroStage(g, s, focalActor, customView)` 中讀取 `synergy = ergo.crowdDetail || ergo.synergy`：

1. **地形掩體繪製（`synergy.synergyMode === 'terrainCover'`）**：
   * 在主角身側（`x = focalActorX + 22, y = groundY`）繪製蒼勁古松樹幹與樹冠或山門石柱，並標註 `'🌲 借樹卡位・一夫當關'`。
2. **伴侶雙劍合璧／背靠背／真武七截陣同門繪製（`synergy.partner` 或 `synergy.synergyMode !== 'none'`）**：
   * 當 `synergy.partner` 存在時，在主角身側（`partnerX = focalActorX - 32`）繪製同伴角色（呼叫 `drawPoseActor`）；
   * 若 `synergy.synergyMode === 'twinSwordsCouple'`：自兩人向對手繪製交織的銀白與淡藍雙螺旋劍氣弧（`quadraticCurveTo`），並標註 `'☯ 雙劍合璧・玉女素心！'`。
   * 若 `synergy.synergyMode === 'zhenwuArray'`：在地面（`x = focalActorX, y = groundY - 6`）繪製金色八卦／北斗七星陣法橢圓光環與陣紋連線，並標註 `'⚔ 真武七截陣・天罡合擊！'`。
   * 若 `synergy.synergyMode === 'backToBack'`：同伴背向繪製（`scale(-scale, scale)`），標註 `'🛡 背靠背禦敵・死角封鎖'`。
   * 若 `synergy.guardianShield === true`（F 型重情護侶捨身擋刀）：主角向前跨步至 `focalActorX + 18` 橫臂擋在同伴身前，身前展開赤金護盾弧，標註 `'❤️ 捨身護侶・寸步不讓！'`。
3. **多敵同框與無雙割草／一劍奪目特效（`multiFoeCount >= 2` & `crowdMode`）**：
   * 當 `multiFoeCount >= 2` 時，除主對手 `oppX = 250` 外，在 `x = 282`、`x = 312` 額外繪製 1～2 名錯落的敵群剪影，直觀呈現「一次打三個、五個」的群戰場面。
   * 當 `crowdMode === 'walkPastKnockdown'`（錯身輕拂・走過倒一片）：
     * 敵人剪影旋轉傾倒（`g.rotate(0.65)`），主角身後拉出一道瀟灑金白拂袖殘風線，標註 `'🍃 錯身輕拂・走過倒一片！'`。
   * 當 `crowdMode === 'blindAllEyes'`（令狐沖一劍刺瞎眾敵雙目）：
     * 在所有敵人頭部高度（`y = groundY - 95`）繪製紅芒雙目準星，並用一條閃電般的銀白折線一次串穿所有敵人的眼睛準星，標註 `'🗡 一劍破盡・盡奪敵目！'`。
   * 當 `crowdMode === 'whirlwindSweep'`（橫掃千軍）：
     * 繪製大範圍半圓扇形破空斬擊弧，標註 `'🌪 橫掃千軍・群戰破圍！'`。
4. **頂部闖關波次橫幅與 MBTI 人格銘牌**：
   * 當 `synergy.waveGauntlet?.active` 為 `true` 時，在右上角（`x = 205, y = 16`）繪製闖關波次橫幅文字 `synergy.waveGauntlet.bannerText`。
   * 當處於交鋒狀態時，在底部儀表板或標題副標旁顯示 MBTI 戰鬥人格銘牌 `【${synergy.mbtiCode}・${synergy.personaLabel}】`。

---

## 四、 驗收與自動化測試要求（Verification Plan）

實作完成後必須新增 `solo-sect/test/unit/growth/phase3-crowd-synergy.test.mjs`，涵蓋以下斷言：

1. **場景 A（實力輾壓走過倒一片 & 令狐沖一劍盡奪敵目）**：
   * 高手對弱敵（`powerGapRatio >= 2.2`）觸發 `crowdMode === 'walkPastKnockdown'`、`knockedDownCount >= 1`，且 Canvas 繪製 `'錯身輕拂・走過倒一片'`。
   * 獨孤九劍／葵花高手面對多敵（`multiFoeCount >= 3`, `powerGapRatio >= 1.8`）觸發 `crowdMode === 'blindAllEyes'`，且 Canvas 繪製串連敵目準星與 `'一劍破盡・盡奪敵目'`。
2. **場景 B（雙劍合璧、真武七截陣、背靠背與借樹卡位）**：
   * 與小龍女／伴侶同修玉女心經並肩時，`synergyMode === 'twinSwordsCouple'`、`combinedArtName === '雙劍合璧・玉女素心'`、`synergyBonus === 1.35`，且 Canvas 繪製雙劍合璧特效。
   * 3 名以上同門結陣時，`synergyMode === 'zhenwuArray'`、`synergyBonus === 1.5`、`effectiveLoadL === loadL * 0.5`。
   * 背靠背與借樹掩體時，分別觸發 `'backToBack'` 與 `'terrainCover'` 並降低 `effectiveLoadL`。
3. **場景 C（16 型人格 MBTI 戰鬥演繹與 F 型重情捨身護侶）**：
   * 驗證 `E/I/S/N/T/F/J/P` 推導之 `mbtiCode` 與 `personaStyle`（E 型群戰 `'crowdSurge'`、I 型單挑 `'loneWolfFocus'`）。
   * 當 F 型主角的伴侶受傷（`partner.hp = 35`）時，觸發 `guardianShield === true`、`personaStyle === 'bondGuardian'`，且 Canvas 繪製 `'捨身護侶・寸步不讓'`。
4. **場景 D（塔防式闖關波次橫幅）**：
   * 驗證魔教圍山（`siege27`）、山門狩獵獸潮（`hunt`）、巡山闖關（`exp`）與群戰（`crowdBout`）正確產生 `waveGauntlet.bannerText` 並繪製於 `#micro-stage`。
5. **零模擬污染（Zero Simulation Contamination）**：連續呼叫 `crowdSynergyFrame`、`ergonomicFrame` 與 `renderMicroStage` 前後，`JSON.stringify(state)` 與 `state.rng` 完全不變。
6. **全套既有測試通過**：
   * `node --test solo-sect/test/unit/growth/phase1-micro-stage.test.mjs solo-sect/test/unit/growth/phase2-combat-exchange.test.mjs solo-sect/test/unit/growth/phase3-crowd-synergy.test.mjs solo-sect/test/unit/interface/docs-links.test.mjs`
   * `bash solo-sect/test/run.sh smoke`
   * `bash solo-sect/test/run.sh quick`
   * `git diff --check`
