// headless 流程：每個 milestone 加自己的玩家操作與斷言。只用正常 UI 操作，遙測只讀。
const snap = (page) => page.evaluate(() => window.__sect.snapshot());
const wait = (page, ms) => page.waitForTimeout(ms);

async function clickPerson(page, idx) {
  const s = await snap(page);
  const p = s.people[idx];
  const pt = await page.evaluate(([x, y]) => window.__sect.tileToClient(x, y), [p.x, p.y]);
  await page.mouse.click(pt.x, pt.y);
  return p;
}

export const flows = [
  {
    name: 'm1-create',
    async run(page, expect, { shot }) {
      // 問卷：每題選第一個選項。
      const n = await page.locator('#quiz li').count();
      for (let i = 0; i < n; i++) await page.click(`[data-q="${i}"][data-a="0"]`);
      const type = await page.textContent('#type');
      expect('A3 問卷得出類型', /^[EI][NS][FT][PJ]$/.test(type), type);
      // 配點：根骨 +1 會超過總和被擋，先減悟性再加根骨。
      await page.click('[aria-label="根骨加一"]');
      expect('A4 超過總和不能加', (await page.textContent('[data-attr="gen"]')) === '5');
      await page.click('[aria-label="悟性減一"]');
      await page.click('[aria-label="根骨加一"]');
      expect('A4 配點可調', (await page.textContent('[data-attr="gen"]')) === '6');
      await page.fill('#name', '測試者');
      await shot('start');
      await page.click('#begin');
      await page.click('[data-speed="4"]');
      const a = await snap(page);
      expect('A8 三人上山', a.people.length === 3, String(a.people.length));
      await wait(page, 2500);
      const b = await snap(page);
      expect('A8 時間有走', b.tick > a.tick + 100, `${a.tick}→${b.tick}`);
      const moved = b.people.filter((p, i) => Math.hypot(p.x - a.people[i].x, p.y - a.people[i].y) > 0.5).length;
      expect('A8 人物在動', moved >= 2, `${moved}/3 移動`);
      await page.click('[data-speed="0"]');
      const target = await clickPerson(page, 1);
      await wait(page, 300);
      const name = await page.getAttribute('[data-panel-name]', 'data-panel-name');
      expect('A8 點人物出人物卡', name === target.name, `${name} vs ${target.name}`);
      await page.click('[data-tab="why"]');
      const rows = await page.locator('#panel .why tr').count();
      expect('A8 人物卡有理由', rows >= 1, `${rows} 行`);
      const me = (await snap(page)).people[0];
      expect('主角用玩家的名字與配點', me.name === '測試者' && me.attrs.gen === 6 && me.attrs.wu === 4);
      await shot('game');
    },
  },
  {
    name: 'm1-template',
    async run(page, expect) {
      await page.click('[data-template="huangrong"]');
      expect('模板帶入類型', (await page.textContent('#type')) === 'ENTP');
      await page.click('#begin');
      const s = await snap(page);
      expect('模板主角天賦', s.people[0].attrs.wu === 10 && s.people[0].template === 'huangrong');
      expect('同住者不重複模板', s.people.slice(1).every((p) => p.template !== 'huangrong'));
    },
  },
  {
    name: 'm1-narrow',
    viewport: { width: 390, height: 844 },
    async run(page, expect, { shot }) {
      await page.click('[data-template="guojing"]');
      await page.click('#begin');
      const w = await page.evaluate(() => document.documentElement.scrollWidth);
      expect('窄螢幕無橫向捲動', w <= 390, `scrollWidth ${w}`);
      await shot('narrow');
    },
  },
  {
    name: 'm2-life',
    async run(page, expect, { shot }) {
      await page.click('[data-template="linghu"]');
      await page.click('#begin');
      await page.click('[data-speed="16"]');
      // 跑到第三日清晨（約兩個遊戲日）。
      await page.waitForFunction(() => window.__sect.snapshot().tick > 1440 * 2, null, { timeout: 30000 });
      await page.click('[data-speed="0"]');
      const s = await snap(page);
      const c = s.counts;
      for (const k of ['eat', 'sleep', 'chat', 'cook', 'forage']) expect(`A9 兩日內發生過 ${k}`, (c[k] || 0) > 0, String(c[k] || 0));
      expect('A9 存糧有數', Number.isInteger(s.stock.raw) && Number.isInteger(s.stock.meal), JSON.stringify(s.stock));
      await page.click('[data-person="p1"]');
      await wait(page, 300);
      expect('A9 人物卡四條需求', (await page.locator('#panel [data-need]').count()) === 4);
      await page.click('[data-tab="why"]');
      const why = await page.textContent('#panel .why');
      expect('A9 理由含需求或活計因子', /需求|活計|個性/.test(why), why.slice(0, 80));
      await shot('life');
    },
  },
  {
    name: 'm3-build',
    async run(page, expect, { shot }) {
      await page.click('[data-template="qiaofeng"]');
      await page.click('#begin');
      await page.click('[data-blueprint="hut-e"]');
      await page.click('[data-blueprint="hearth2"]');
      await page.click('[data-blueprint="fence-s"]');
      let s = await snap(page);
      expect('A9 放藍圖後出現工地', s.sites.length === 3, String(s.sites.length));
      await page.click('[data-cancel="fence-s"]');
      s = await snap(page);
      expect('A9 取消工地', s.sites.length === 2 && !s.sites.some((x) => x.bp === 'fence-s'));
      await page.click('[data-person="p1"]');
      await page.click('[data-focus="build"]');
      s = await snap(page);
      expect('A9 指定專長', s.people[1].focus === 'build');
      await page.click('[data-speed="16"]');
      await page.waitForFunction(() => window.__sect.snapshot().built.length >= 1, null, { timeout: 60000 });
      await page.click('[data-speed="0"]');
      await shot('progress');
      await page.click('[data-speed="16"]');
      await page.waitForFunction(() => window.__sect.snapshot().built.length >= 2, null, { timeout: 90000 });
      await page.click('[data-speed="0"]');
      s = await snap(page);
      expect('A9 兩處都完工', s.built.includes('hut-e') && s.built.includes('hearth2'), s.built.join(','));
      expect('A9 茅屋牆在地圖上', s.map[15][39] === '#' && s.map[19][41] === '_');
      expect('A9 營造面板顯示已完工', (await page.locator('#build .done').count()) === 2);
      expect('A9 木石有在動', s.ledger.woodCut > 0 && s.ledger.stoneCut > 0, JSON.stringify(s.ledger));
      await shot('built');
    },
  },
  {
    name: 'm4-skills',
    async run(page, expect, { shot }) {
      await page.click('[data-template="guojing"]');
      await page.click('#begin');
      await page.click('[data-person="p0"]');
      await page.click('[data-focus="wood"]');
      await page.click('[data-speed="16"]');
      await page.waitForFunction(() => window.__sect.snapshot().people[0].skills.chop > 0, null, { timeout: 60000 });
      await page.click('[data-speed="0"]');
      await page.click('[data-tab="skills"]');
      await wait(page, 300);
      expect('A7 人物卡六項技能', (await page.locator('#panel [data-skill]').count()) === 6);
      const t = await page.textContent('#panel [data-skill="chop"]');
      expect('A7 伐木有熟練與效果文字', /伐木/.test(t) && /一趟多扛/.test(t), t);
      await shot('skills');
    },
  },
  {
    name: 'm5-social',
    async run(page, expect, { shot }) {
      await page.click('[data-template="linghu"]');
      await page.click('#begin');
      await page.click('[data-speed="16"]');
      await page.waitForFunction(() => Object.values(window.__sect.snapshot().aff).some((v) => v > 0), null, { timeout: 60000 });
      await page.click('[data-speed="0"]');
      await page.click('[data-person="p0"]');
      await page.click('[data-tab="social"]');
      await wait(page, 300);
      expect('A8 人際區列出另外兩人', (await page.locator('#panel [data-rel]').count()) === 2);
      const t = await page.textContent('#panel');
      expect('A8 顯示階段與雙向好感', /(陌生|相識|朋友|知己)/.test(t) && /我→他/.test(t));
      await shot('social');
    },
  },
  {
    name: 'm6-martial',
    async run(page, expect, { shot }) {
      await page.click('[data-template="longnv"]');
      await page.click('#begin');
      await page.click('[data-person="p0"]');
      await page.click('[data-focus="martial"]');
      await page.click('[data-speed="4"]');
      await page.waitForFunction(() => window.__sect.snapshot().people.some((p) => p.act === 'do' && p.task.kind === 'drill'), null, { timeout: 60000 });
      await page.click('[data-speed="0"]');
      const s = await snap(page);
      const d = s.people.find((p) => p.act === 'do' && p.task.kind === 'drill');
      expect('A9 有人站在木樁旁練功', [[36, 23], [32, 28]].some(([x, y]) => Math.round(d.x) === x && Math.round(d.y) === y), `${d.name} @${d.x},${d.y}`);
      expect('A9 頭上顯示練哪一招', /長拳|開山掌|流雲手|破岳勢|飛燕腿|太初拳/.test(d.actLabel), d.actLabel);
      await page.click(`[data-person="${d.id}"]`);
      await page.click('[data-tab="martial"]');
      await wait(page, 300);
      expect('A8 武學分頁列出會的招與熟練', (await page.locator('#panel [data-move]').count()) >= 1);
      const t = await page.textContent('#panel [data-section="martial"]');
      expect('A8 武學分頁有武力與下一招', /武力/.test(t) && /(下一招|快開竅)/.test(t), t.slice(0, 80));
      expect('A8 其他分頁收起來', await page.locator('#panel [data-section="skills"]').isHidden());
      await shot('drill');
      await page.click('[data-speed="16"]');
      await page.waitForFunction(() => window.__sect.snapshot().people[0].moves.changquan > 3, null, { timeout: 60000 });
      await page.click('[data-speed="0"]');
      const s2 = await snap(page);
      expect('A9 練完熟練上升', s2.people[0].moves.changquan > 3, String(s2.people[0].moves.changquan));
    },
  },
  {
    name: 'm7-raid',
    async run(page, expect, { shot }) {
      await page.click('[data-template="qiaofeng"]');
      await page.click('#begin');
      await page.click('[data-blueprint="fence-s"]');
      await page.click('[data-person="p0"]');
      expect('A10 專長有守衛', (await page.locator('[data-focus="guard"]').count()) === 1);
      await page.click('[data-focus="guard"]');
      await page.click('[data-speed="16"]');
      // M9 起巢穴守衛一開局就在地圖上，只看來侵擾的敵人。
      await page.waitForFunction(() => window.__sect.snapshot().enemies.some((e) => !e.nest), null, { timeout: 90000 });
      await page.click('[data-speed="1"]');
      let s = await snap(page);
      const e = s.enemies.find((x) => !x.nest);
      expect('A10 侵擾時地圖上有敵人與血量', e && e.hp > 0 && e.hpMax > 0, JSON.stringify(e && { kind: e.kind, hp: e.hp, mode: e.mode }));
      expect('A10 紀事寫出敵人來了', /來了/.test(await page.textContent('#events')));
      await page.waitForFunction(() => window.__sect.snapshot().people.some((p) => p.task?.kind === 'fight' && p.act === 'do'), null, { timeout: 60000 });
      await page.click('[data-speed="0"]');
      s = await snap(page);
      const f = s.people.find((p) => p.task?.kind === 'fight' && p.act === 'do');
      expect('A10 有人迎戰', /迎戰/.test(f.actLabel), f.actLabel);
      await shot('fight');
    },
  },
  {
    name: 'm8-recruit',
    async run(page, expect, { shot }) {
      await page.click('[data-template="huangrong"]');
      await page.fill('#seed', '2');
      await page.click('#begin');
      await page.click('[data-speed="16"]');
      await page.waitForFunction(() => window.__sect.snapshot().people.some((p) => p.guest), null, { timeout: 120000 });
      await page.click('[data-speed="0"]');
      await wait(page, 400);
      const s = await snap(page);
      const g = s.people.find((p) => p.guest);
      expect('A10 訪客出現在名冊', (await page.locator(`#roster [data-person="${g.id}"]`).count()) === 1);
      expect('A10 名冊標出客', /客/.test(await page.textContent(`#roster [data-person="${g.id}"]`)));
      await page.click(`#roster [data-person="${g.id}"]`);
      await wait(page, 300);
      const t = await page.textContent('#panel [data-identity]');
      expect('A10 人物卡寫來訪與去留考量', /來訪中/.test(t) && /(想留下|還在猶豫)/.test(t), t);
      expect('A10 紀事寫來訪', /上山來訪/.test(await page.textContent('#events')));
      await shot('guest');
    },
  },
  {
    name: 'm9-expedition',
    async run(page, expect, { shot }) {
      await page.click('[data-template="qiaofeng"]');
      await page.fill('#seed', '4');
      await page.click('#begin');
      expect('A9 面板列出兩處巢穴', (await page.locator('#expedition [data-nest-row]').count()) === 2);
      await page.click('[data-speed="16"]');
      // 第 3 日 9 時後、按鈕可以按時暫停。
      await page.waitForFunction(() => window.__sect.snapshot().tick >= 2 * 1440 + 540 && !document.querySelector('[data-nest="den"]')?.disabled, null, { timeout: 180000 });
      await page.click('[data-speed="0"]');
      await wait(page, 300);
      const row = await page.textContent('#expedition [data-nest-row="den"]');
      expect('A9 面板寫出會去的人', /會去：/.test(row), row);
      await shot('panel');
      await page.click('[data-nest="den"]');
      await wait(page, 300);
      const a = await snap(page);
      expect('A9 按下後組隊出發', a.expedition?.nest === 'den' && a.expedition.members.length >= 2, JSON.stringify(a.expedition));
      expect('A9 紀事寫出發', /出發討伐野豬窩/.test(await page.textContent('#events')));
      await page.click('[data-speed="4"]');
      await wait(page, 1500);
      await page.click('[data-speed="0"]');
      await wait(page, 300);
      const b = await snap(page);
      const ph = await page.getAttribute('#expedition [data-exp-phase]', 'data-exp-phase').catch(() => null);
      expect('A9 面板顯示階段', ph === (b.expedition?.phase ?? null) && !!ph, `${ph} / ${b.expedition?.phase}`);
      const m = b.people.find((p) => p.id === a.expedition.members[0]);
      const m0 = a.people.find((p) => p.id === m.id);
      expect('A9 隊員往巢走', Math.hypot(m.x - 58, m.y - 36) < Math.hypot(m0.x - 58, m0.y - 36), `${m0.x.toFixed(1)},${m0.y.toFixed(1)}→${m.x.toFixed(1)},${m.y.toFixed(1)}`);
      await shot('march');
      await page.setViewportSize({ width: 390, height: 844 });
      await wait(page, 300);
      await shot('narrow');
    },
  },
  {
    name: 'm10-chronicle',
    async run(page, expect, { shot }) {
      await page.click('[data-template="qiaofeng"]');
      await page.fill('#seed', '4');
      await page.click('#begin');
      await page.click('[data-speed="16"]');
      // 跑到第 2 日傍晚：有完工、侵擾、時間帳超過半天。
      await page.waitForFunction(() => window.__sect.snapshot().tick >= 1440 + 17 * 60, null, { timeout: 180000 });
      await page.click('[data-speed="1"]');
      const sel = await page.evaluate(() => window.__sect.selected());
      // 三十個畫面取樣：頭頂字框兩兩不重疊，被選中者的行動字有畫。
      let overlaps = 0, missingSel = 0, frames = 0;
      for (let i = 0; i < 30; i++) {
        await wait(page, 120);
        const L = await page.evaluate(() => window.__sect.labels());
        frames++;
        for (let a = 0; a < L.length; a++) for (let b = a + 1; b < L.length; b++) {
          const p = L[a], q = L[b];
          if (p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h) overlaps++;
        }
        if (!L.some((b) => b.kind === 'act-selected')) missingSel++;
      }
      expect('A9 頭頂字不重疊', overlaps === 0, `${overlaps} 處／${frames} 張`);
      expect('A9 被選中者的行動字都有畫', missingSel === 0, `${missingSel}/${frames} 張漏畫`);
      await page.click('[data-speed="0"]');
      await page.click(`#roster [data-person="${sel}"]`);
      await page.click('[data-tab="story"]');
      await wait(page, 400);
      const habits = await page.textContent('#panel [data-habits]');
      expect('A9 生平寫出習性', /同門/.test(habits), habits);
      expect('A9 生平有八類時間', (await page.locator('#panel [data-life]').count()) === 8);
      const story = await page.textContent('#panel [data-story]');
      expect('A9 生平有自己的紀事', /第\d日/.test(story), story.slice(0, 80));
      await page.click('[data-events-group="war"]');
      await wait(page, 200);
      const kinds = await page.$$eval('#events [data-kind]', (ns) => ns.map((n) => n.dataset.kind));
      expect('A9 紀事分類可切換', kinds.length > 0 && kinds.every((k) => ['raid', 'stolen', 'breach', 'repel', 'calm', 'guard', 'exp', 'cleared', 'repair'].includes(k)), kinds.join(','));
      const stats = await page.textContent('[data-stats]');
      expect('A9 統計表有數字', /在山上2 日/.test(stats) && /煮好／吃掉的飯\d+／\d+/.test(stats), stats.slice(0, 80));
      await shot('story');
      await page.setViewportSize({ width: 390, height: 844 });
      await wait(page, 300);
      await shot('narrow');
    },
  },
  {
    name: 'm12-garden',
    async run(page, expect, { shot }) {
      await page.click('[data-template="qiaofeng"]');
      await page.fill('#seed', '4');
      await page.click('#begin');
      expect('A8 營造面板有菜園', (await page.locator('[data-blueprint="garden"]').count()) === 1);
      expect('A8 擴建在西宿舍前按不下去', /要先蓋好西宿舍/.test(await page.textContent('#build')));
      await page.click('[data-blueprint="garden"]');
      await page.click('[data-speed="16"]');
      await page.waitForFunction(() => window.__sect.snapshot().plots.some((g) => g.stage === 'growing'), null, { timeout: 180000 });
      await page.waitForFunction(() => window.__sect.snapshot().plots.some((g) => g.stage === 'ripe'), null, { timeout: 180000 });
      await page.click('[data-speed="0"]');
      const s = await snap(page);
      expect('A8 菜畦有長著與熟了', s.plots.some((g) => g.stage === 'ripe') && s.plots.length === 6, s.plots.map((g) => g.stage).join(','));
      await shot('plots');
    },
  },
  {
    // M13 外功場與招式演出：四門圖例兩兩分得開；地圖上出招的形狀跟招式一致；外功場完工後看得到。
    name: 'm13-forms',
    async run(page, expect, { shot }) {
      await page.click('[data-template="qiaofeng"]');
      await page.fill('#seed', '4');
      await page.click('#begin');
      expect('A8 營造面板有外功場', (await page.locator('[data-blueprint="yard"]').count()) === 1);
      await page.click('[data-person="p0"]');
      await page.click('[data-tab="martial"]');
      const px = await page.evaluate(() => [...document.querySelectorAll('[data-form-legend] canvas')].map((c) => [c.dataset.form, [...c.getContext('2d').getImageData(0, 0, c.width, c.height).data]]));
      expect('A5 圖例有四門', px.length === 4, px.map((x) => x[0]).join());
      let minDiff = 1;
      for (let i = 0; i < px.length; i++) for (let j = i + 1; j < px.length; j++) {
        const a = px[i][1], b = px[j][1];
        let d = 0;
        for (let k = 0; k < a.length; k += 4) if (Math.abs(a[k] - b[k]) + Math.abs(a[k + 1] - b[k + 1]) + Math.abs(a[k + 2] - b[k + 2]) > 60) d++;
        minDiff = Math.min(minDiff, d / (a.length / 4));
      }
      expect('A5 四門兩兩像素差 ≥ 10%', minDiff >= 0.1, `最小 ${(100 * minDiff).toFixed(1)}%`);
      expect('A5 會的招旁邊有小圖', (await page.locator('[data-form-preview="fist"]').count()) >= 1);
      await shot('legend');
      await page.click('[data-blueprint="yard"]');
      await page.click('[data-speed="16"]');
      await page.waitForFunction(() => window.__sect.snapshot().people.some((p) => p.strike && p.strike.kind === 'drill' && window.__sect.snapshot().tick - p.strike.at < 4), null, { timeout: 120000 });
      await page.click('[data-speed="0"]');
      const s = await snap(page);
      const forms = { changquan: 'fist', kaishan: 'palm', liuyun: 'hand', poyue: 'palm', feiyan: 'kick', taichu: 'fist' };
      const bad = s.people.filter((p) => p.strike && forms[p.strike.move] !== p.strike.form);
      expect('A5 地圖上出招形狀跟招式一致', bad.length === 0 && s.people.some((p) => p.strike), s.people.filter((p) => p.strike).map((p) => `${p.name}:${p.strike.move}/${p.strike.form}`).join(' '));
      await shot('drill');
      await page.click('[data-speed="16"]');
      await page.waitForFunction(() => window.__sect.snapshot().built.includes('yard'), null, { timeout: 240000 });
      await page.click('[data-speed="0"]');
      const t = await snap(page);
      expect('A8 外功場完工：夯土格', t.map[22][44] === 'w');
      const boxes = await page.evaluate(() => window.__sect.labels());
      let overlap = 0;
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlap++;
      }
      expect('A8 畫面不疊字', overlap === 0, `${overlap} 對`);
      await shot('yard');
    },
  },
  {
    // M14 守點（暫停中，藍圖可用）：南柵欄前按不下去；完工後畫兩座木台；侵擾時有人站上台。
    name: 'm14-posts',
    async run(page, expect, { shot }) {
      await page.click('[data-template="qiaofeng"]');
      await page.fill('#seed', '4');
      await page.click('#begin');
      expect('A8 營造面板有哨位', (await page.locator('[data-blueprint="posts"]').count()) === 1);
      expect('A8 南柵欄前按不下去', await page.locator('[data-blueprint="posts"]').isDisabled() && /要先蓋好南柵欄/.test(await page.textContent('#build')));
      await page.click('[data-blueprint="fence-s"]');
      await page.click('[data-speed="16"]');
      await page.waitForFunction(() => window.__sect.snapshot().built.includes('fence-s'), null, { timeout: 240000 });
      await page.click('[data-blueprint="posts"]');
      await page.waitForFunction(() => window.__sect.snapshot().built.includes('posts'), null, { timeout: 240000 });
      await page.waitForFunction(() => window.__sect.snapshot().people.some((p) => p.task?.kind === 'watch' && p.act === 'do'), null, { timeout: 240000 });
      await page.click('[data-speed="0"]');
      const s = await snap(page);
      const w = s.people.find((p) => p.task?.kind === 'watch' && p.act === 'do');
      expect('A8 侵擾時有人站在哨位上', !!w && [[26, 29], [33, 29]].some(([x, y]) => Math.abs(w.x - x) < 0.01 && Math.abs(w.y - y) < 0.01), w ? `${w.name} ${w.x},${w.y}` : '');
      const boxes = await page.evaluate(() => window.__sect.labels());
      let overlap = 0;
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlap++;
      }
      expect('A8 畫面不疊字', overlap === 0, `${overlap} 對`);
      await shot('posts');
    },
  },
  {
    // M15 演武：沒有外功場時按鈕停用並寫原因；蓋好後按下，人走到外功場、看得到木人、紀事出現成績。
    name: 'm15-trial',
    async run(page, expect, { shot }) {
      await page.click('[data-template="qiaofeng"]');
      await page.fill('#seed', '4');
      await page.click('#begin');
      await page.click('[data-person="p0"]');
      await page.click('[data-tab="martial"]');
      expect('A7 沒有外功場時停用', await page.locator('[data-trial]').isDisabled());
      expect('A7 寫出原因', /還沒有外功場/.test(await page.textContent('[data-trial-why]')));
      await page.click('[data-blueprint="yard"]');
      await page.click('[data-speed="16"]');
      await page.waitForFunction(() => window.__sect.snapshot().built.includes('yard'), null, { timeout: 240000 });
      await page.waitForFunction(() => { const b = document.querySelector('[data-trial]'); return b && !b.disabled; }, null, { timeout: 240000 });
      await page.click('[data-speed="0"]');
      await page.click('[data-trial]');
      const s0 = await snap(page);
      expect('A7 按下後去外功場', s0.people[0].task?.kind === 'trial', s0.people[0].actLabel);
      await page.click('[data-speed="4"]');
      await page.waitForFunction(() => { const p = window.__sect.snapshot().people[0]; return p.task?.kind === 'trial' && p.act === 'do' && p.task.trial.wave >= 2; }, null, { timeout: 120000 });
      await page.click('[data-speed="0"]');
      const s = await snap(page);
      const p = s.people[0];
      expect('A7 在外功場中間開打', Math.round(p.x) === 43 && Math.round(p.y) === 23, `${p.x},${p.y}`);
      expect('A7 頭上寫第幾波', /演武第 \d 波/.test(p.actLabel), p.actLabel);
      // 木人畫在人左右：那幾格的像素應該有木人的顏色。等兩個畫面，免得取到暫停前的那一幀（loop 18：機器忙時偶爾 0/2）。
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const wood = await page.evaluate(() => {
        const c = document.querySelector('#view'), g = c.getContext('2d');
        const p = window.__sect.snapshot().people[0];
        let n = 0;
        for (const m of p.task.trial.men) {
          if (m.hp <= 0) continue;
          const cx = Math.round((p.x + m.dx) * 20 + 10), cy = Math.round((p.y + m.dy) * 20 + 10);
          const d = g.getImageData(cx - 2, cy - 6, 4, 12).data;
          for (let k = 0; k < d.length; k += 4) if (Math.abs(d[k] - 0x8a) < 12 && Math.abs(d[k + 1] - 0x6a) < 12 && Math.abs(d[k + 2] - 0x44) < 12) { n++; break; }
        }
        return { n, up: p.task.trial.men.filter((m) => m.hp > 0).length };
      });
      expect('A7 看得到木人', wood.up > 0 && wood.n === wood.up, `${wood.n}/${wood.up}`);
      const boxes = await page.evaluate(() => window.__sect.labels());
      let overlap = 0;
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlap++;
      }
      expect('A7 畫面不疊字', overlap === 0, `${overlap} 對`);
      await shot('trial');
      await page.click('[data-speed="4"]');
      await page.waitForFunction(() => window.__sect.snapshot().events.some((e) => e.kind === 'trial'), null, { timeout: 120000 });
      await page.click('[data-speed="0"]');
      expect('A7 紀事出現成績', /演武：.+撐過 \d 波（第一波 \d+ 刻）/.test(await page.textContent('#events')));
      await page.click('[data-tab="martial"]');
      expect('A7 人物卡記最好成績', /最好：撐過 \d 波/.test(await page.textContent('[data-trial-best]')));
      await shot('trial-done');
    },
  },
  {
    // M16 藥園（暫停中：受傷關著，藥園可蓋）：營造面板有藥園、寫試做中；完工後灶邊記藥草、畫出藥畦。
    name: 'm16-herbs',
    async run(page, expect, { shot }) {
      await page.click('[data-template="qiaofeng"]');
      await page.fill('#seed', '4');
      await page.click('#begin');
      expect('A8 營造面板有藥園', (await page.locator('[data-blueprint="herbs"]').count()) === 1);
      expect('A8 寫試做中', /藥園[\s\S]*試做中/.test(await page.textContent('#build')));
      await page.click('[data-person="p0"]');
      expect('A8 人物卡有傷勢', (await page.locator('[data-hurt]').count()) === 1 && /無傷/.test(await page.textContent('[data-hurt]')));
      await page.click('[data-blueprint="herbs"]');
      await page.click('[data-speed="16"]');
      await page.waitForFunction(() => window.__sect.snapshot().built.includes('herbs'), null, { timeout: 240000 });
      await page.click('[data-speed="0"]');
      const s = await snap(page);
      expect('A8 兩畦藥畦', s.plots.filter((g) => g.herb).length === 2 && s.map[27][44] === 'g' && s.map[27][45] === 'g');
      const boxes = await page.evaluate(() => window.__sect.labels());
      let overlap = 0;
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlap++;
      }
      expect('A8 畫面不疊字', overlap === 0, `${overlap} 對`);
      await shot('herbs');
    },
  },
  {
    // M18 值日（暫停中、預設關）：紀事簿可以打開，名冊與人物卡看得到值日，可以指定。
    name: 'm18-duty',
    async run(page, expect, { shot }) {
      await page.click('[data-template="qiaofeng"]');
      await page.fill('#seed', '4');
      await page.click('#begin');
      expect('A8 預設關、寫試做中', /值日：關（試做中）/.test(await page.textContent('[data-duty-toggle]')));
      expect('A8 關時人物卡沒有值日列', (await page.locator('[data-duty-row]').count()) === 0);
      await page.click('[data-duty-toggle]');
      const text = await page.textContent('[data-duty-text]');
      expect('A8 打開後寫出三職', /伙房 .+、採集 .+、柴火 .+/.test(text), text);
      await page.waitForFunction(() => /·(伙房|採集|柴火)/.test(document.querySelector('#roster').textContent), null, { timeout: 5000 });
      expect('A8 名冊看得到值日', /·伙房/.test(await page.textContent('#roster')));
      await page.click('[data-person="p0"]');
      expect('A8 人物卡有值日列', (await page.locator('[data-duty-row]').count()) === 1);
      await page.click('[data-duty="wood"]');
      const h = await page.textContent('[data-section="life"]');
      expect('A8 指定柴火後寫出', /值日：柴火/.test(h));
      expect('A8 紀事寫出指定的人', new RegExp(`柴火 ${await page.getAttribute('[data-panel-name]', 'data-panel-name')}`).test(await page.textContent('[data-duty-text]')));
      await shot('duty');
    },
  },
];
