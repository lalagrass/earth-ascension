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
      await page.waitForFunction(() => window.__sect.snapshot().enemies.length > 0, null, { timeout: 90000 });
      await page.click('[data-speed="1"]');
      let s = await snap(page);
      const e = s.enemies[0];
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
];
