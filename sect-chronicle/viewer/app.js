/*
 * SG-RT-02V：把控制器與畫面接到瀏覽器。只處理 DOM 事件、requestAnimationFrame 與分頁可見性。
 * 選取人物只改 ui，不碰世界；render 只讀 controller 給的世界。
 */
(function () {
  'use strict';
  const ns = window.SectChronicle;
  const Controller = ns.ViewerController;
  const View = ns.ViewerView;
  const deps = { Rules: ns.Rules, StoryData: ns.StoryData };
  const ctl = Controller.createController(ns.Realtime);
  const ui = { selected: null };
  const $ = (id) => document.getElementById(id);
  const dom = {
    hud: $('hud'), map: $('map'), people: $('people'), detail: $('detail'),
    stock: $('stock'), settings: $('settings'), events: $('events'), error: $('error'),
  };
  let drawn = null; // 上次畫面的依據；相同就不重畫

  function prepare() {
    const seed = $('seed').value;
    const r = ctl.prepare(seed);
    $('seed-error').textContent = r.ok ? '' : `${r.code}：${r.reason}`;
    $('start').disabled = !r.ok;
    $('setup-settings').innerHTML = r.ok ? View.renderSettings(View.describe(ctl.world, deps)) : '';
    return r.ok;
  }

  function draw(force) {
    const s = ctl.snapshot();
    if (!s.world || s.mode === 'setup') return;
    const key = `${s.world.revision}|${s.mode}|${s.speed}|${s.autoPaused}|${ui.selected}|${s.error ? s.error.code : ''}`;
    if (!force && key === drawn) return;
    drawn = key;
    View.render(dom, View.describe(s.world, deps), s, ui);
    for (const b of document.querySelectorAll('[data-speed]')) {
      b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === s.speed));
    }
    $('toggle').disabled = s.mode === 'error';
  }

  function loop(now) {
    ctl.frame(now);
    draw(false);
    window.requestAnimationFrame(loop);
  }

  function start() {
    if (!prepare()) return;
    ctl.start();
    $('setup').hidden = true;
    $('viewer').hidden = false;
    draw(true);
  }

  $('seed').addEventListener('input', prepare);
  $('setup-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    start();
  });
  $('toggle').addEventListener('click', () => {
    ctl.toggle();
    draw(true);
  });
  for (const b of document.querySelectorAll('[data-speed]')) {
    b.addEventListener('click', () => {
      ctl.setSpeed(Number(b.dataset.speed));
      draw(true);
    });
  }
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-person]');
    if (!el) return;
    ui.selected = ui.selected === el.dataset.person ? null : el.dataset.person;
    draw(true);
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.target instanceof HTMLInputElement) return;
    if (ctl.mode === 'setup') return;
    if (ev.key === ' ') {
      ev.preventDefault();
      ctl.toggle();
    } else if (ev.key === '1' || ev.key === '2' || ev.key === '4') {
      ctl.setSpeed(Number(ev.key));
    } else {
      return;
    }
    draw(true);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      ctl.hide();
      draw(true);
    }
  });

  // 給瀏覽器驗證讀狀態用；只讀，不提供推進或改世界的入口。
  Object.defineProperty(window, 'sectViewer', {
    value: Object.freeze({
      snapshot: () => {
        const s = ctl.snapshot();
        return {
          mode: s.mode, seed: s.seed, speed: s.speed, autoPaused: s.autoPaused, error: s.error, totals: s.totals, lastStep: s.lastStep,
          tick: s.world ? s.world.clock.tick : null,
          hash: s.world ? ns.Realtime.hashWorld(s.world) : null,
          rngState: s.world ? s.world.rngState.slice() : null,
        };
      },
    }),
  });

  prepare();
  $('seed').focus();
  window.requestAnimationFrame(loop);
})();
