/*
 * #142 研究原型：2.5D 斜視生活場景（原生 Canvas，零依賴）。
 *
 * 世界只透過 Realtime.createWorld／advanceTicks／dispatch 推進與下令，名字與狀態文字沿用 viewer/view.js 的 describe。
 * 畫面、補間、浮字、自動暫停選單都只讀世界，不寫世界、不讀 RNG。
 * 這是給擁有人看方向的原型，不是 RT-04 的正式介面：沒有存讀，也不處理詢問事件與目標／政策編輯。
 */
(function () {
  'use strict';
  const ns = window.SectChronicle;
  const R = ns.Realtime;
  const Rules = ns.Rules;
  const Prog = ns.Progression;
  const View = ns.ViewerView;
  const deps = { Rules, StoryData: ns.StoryData };

  // ---------- 時間（和正式控制器同一套換算：1× 每秒 4 tick，背景自動暫停，不追趕） ----------
  const MS_PER_TICK = 250;
  const MAX_FRAME_MS = 250;
  const sim = { world: null, mode: 'paused', speed: 1, carry: 0, last: null, seq: 0, error: null, started: false };

  function newWorld(seed) {
    const made = R.createWorld(seed);
    if (!made.ok) throw new Error(`${made.code}：${made.reason}`);
    sim.world = made.state;
    sim.mode = 'paused';
    sim.carry = 0;
    sim.last = null;
    sim.error = null;
  }

  function step(now) {
    if (sim.mode !== 'playing') {
      sim.last = null;
      return;
    }
    if (sim.last === null) {
      sim.last = now;
      return;
    }
    sim.carry += Math.min(now - sim.last, MAX_FRAME_MS) * sim.speed;
    sim.last = now;
    let n = Math.floor(sim.carry / MS_PER_TICK);
    sim.carry -= n * MS_PER_TICK;
    while (n > 0) {
      const before = sim.world;
      const r = R.advanceTicks(sim.world, n);
      if (!r.ok) {
        fail(`${r.code}：${r.reason}`);
        return;
      }
      sim.world = r.state;
      feedback(before, r.state, r.events);
      n -= r.advancedTicks;
      if (r.stopReason === 'error') {
        fail(`${r.error.code}：${r.error.reason}`);
        return;
      }
      if (r.advancedTicks === 0) return;
    }
  }

  function fail(text) {
    sim.mode = 'error';
    sim.error = text;
    toast(`世界停止：${text}`, 'bad');
  }

  function setMode(next) {
    if (sim.mode === 'error') return;
    sim.mode = next;
    sim.last = null;
    sim.carry = 0;
    sim.started = sim.started || next === 'playing';
    ui.autoPausedForMenu = false;
    refreshTop();
  }

  // ---------- 正式下令 ----------
  function send(type, payload, okText) {
    const cmd = { id: `proto-${Date.now().toString(36)}-${(sim.seq += 1)}`, expectedRevision: sim.world.revision, type, payload };
    const r = R.dispatch(sim.world, cmd);
    if (!r.ok) {
      toast(`沒有接受：${r.code}：${r.reason}`, 'bad');
      return false;
    }
    sim.world = r.state;
    toast(okText, 'ok');
    pulse(payload.discipleId, '令', '#c99a2e');
    return true;
  }

  // ---------- 畫面狀態 ----------
  const ui = {
    selected: null,
    hover: null,
    menu: null, // { target, sx, sy }
    autoPausedForMenu: false,
    pauseOnMenu: true,
    layout: 'a',
    cam: { x: 0, y: 0, zoom: 1, fitted: false },
    floaters: [],
    shownPos: {}, // 畫面上的位置（補間），不是世界位置
    model: null,
    modelRev: -1,
  };

  const $ = (id) => document.getElementById(id);
  const canvas = $('scene');
  const ctx = canvas.getContext('2d');
  canvas.tabIndex = 0;

  function model() {
    if (ui.modelRev !== sim.world.revision || ui.modelTick !== sim.world.clock.tick) {
      ui.model = View.describe(sim.world, deps);
      ui.modelRev = sim.world.revision;
      ui.modelTick = sim.world.clock.tick;
    }
    return ui.model;
  }

  // ---------- 斜視投影 ----------
  const TW = 96;
  const TH = 48;
  const SLAB = 10;
  const GATE = { r: Rules.VILLAGE_GATE.r, c: Rules.VILLAGE_GATE.c };
  const DOJO = { r: Rules.DOJO.r, c: Rules.DOJO.c };
  const iso = (r, c) => ({ x: (c - r) * TW / 2, y: (c + r) * TH / 2 });

  function fit() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const pts = [];
    for (let r = 0; r < 5; r += 1) for (let c = -1; c < 5; c += 1) pts.push(iso(r, c));
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const bw = Math.max(...xs) - Math.min(...xs) + TW * 1.4;
    const bh = Math.max(...ys) - Math.min(...ys) + TH * 3.2;
    const reserve = ui.layout === 'a' ? 110 : 20; // A 底部有人物列
    ui.cam.zoom = Math.max(0.45, Math.min(1.8, Math.min(w / bw, (h - reserve) / bh)));
    ui.cam.x = (Math.max(...xs) + Math.min(...xs)) / 2;
    ui.cam.y = (Math.max(...ys) + Math.min(...ys)) / 2 - TH * 0.6;
    ui.cam.oy = -reserve / 2;
    ui.cam.fitted = true;
  }

  function toScreen(p) {
    const z = ui.cam.zoom;
    return { x: (p.x - ui.cam.x) * z + canvas.clientWidth / 2, y: (p.y - ui.cam.y) * z + canvas.clientHeight / 2 + (ui.cam.oy || 0) };
  }
  function toWorld(sx, sy) {
    const z = ui.cam.zoom;
    return { x: (sx - canvas.clientWidth / 2) / z + ui.cam.x, y: (sy - canvas.clientHeight / 2 - (ui.cam.oy || 0)) / z + ui.cam.y };
  }
  function tileAt(sx, sy) {
    const p = toWorld(sx, sy);
    const c = (p.x / (TW / 2) + p.y / (TH / 2)) / 2;
    const r = (p.y / (TH / 2) - p.x / (TW / 2)) / 2;
    const rr = Math.round(r);
    const cc = Math.round(c);
    if (rr === GATE.r && cc === GATE.c) return { kind: 'gate', r: rr, c: cc };
    if (rr >= 0 && rr < 5 && cc >= 0 && cc < 5) return { kind: 'tile', r: rr, c: cc, id: `t-${rr}-${cc}` };
    return null;
  }

  // ---------- 角色外觀（示意） ----------
  const ROLE_COLORS = { master: '#6b4c9a', protagonist: '#2f6db5', apprentice: '#2c8c7d' };
  const APPRENTICE_COLORS = ['#2c8c7d', '#c0672c'];
  function colorOf(d) {
    if (d.role !== 'apprentice') return ROLE_COLORS[d.role];
    const m = /(\d+)$/.exec(d.id);
    return APPRENTICE_COLORS[m ? (Number(m[1]) - 1) % 2 : 0];
  }
  const GLYPH = {
    'gather-material': '礦', 'gather-herb': '草', cultivate: '修', rest: '休', 'tune-mind': '心',
    build: '建', brew: '丹', aid: '援', breakthrough: '破', support: '護',
  };

  function activityOf(world, d) {
    return d.activityId ? world.activities.find((a) => a.id === d.activityId) : null;
  }

  // 畫面位置：旅行中依 stepTicks 在兩格之間補間；其他時候就是世界位置。只用來畫，不回寫。
  function targetPos(world, d) {
    const a = activityOf(world, d);
    if (a && a.status === 'traveling' && !a.partnerWait && a.pathIndex < a.path.length) {
      const next = a.path[a.pathIndex];
      const f = a.stepTicks / Rules.STEP_TICKS;
      return { r: d.pos.r + (next.r - d.pos.r) * f, c: d.pos.c + (next.c - d.pos.c) * f };
    }
    return { r: d.pos.r, c: d.pos.c };
  }

  function facilitiesByTile(m) {
    const out = {};
    for (const f of m.facilities) out[f.tileId] = f;
    return out;
  }

  // ---------- 繪圖 ----------
  function diamond(cx, cy, z) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - TH / 2 * z);
    ctx.lineTo(cx + TW / 2 * z, cy);
    ctx.lineTo(cx, cy + TH / 2 * z);
    ctx.lineTo(cx - TW / 2 * z, cy);
    ctx.closePath();
  }

  function slab(cx, cy, z, top, side) {
    const t = SLAB * z;
    ctx.fillStyle = side;
    ctx.beginPath();
    ctx.moveTo(cx - TW / 2 * z, cy);
    ctx.lineTo(cx, cy + TH / 2 * z);
    ctx.lineTo(cx + TW / 2 * z, cy);
    ctx.lineTo(cx + TW / 2 * z, cy + t);
    ctx.lineTo(cx, cy + TH / 2 * z + t);
    ctx.lineTo(cx - TW / 2 * z, cy + t);
    ctx.closePath();
    ctx.fill();
    diamond(cx, cy, z);
    ctx.fillStyle = top;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.18)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function box(cx, cy, z, w, h, wall, wallDark, roof) {
    // 以地塊中心為底，畫一個斜視方塊（w 為地塊寬度比例）
    const hw = TW / 2 * z * w;
    const hh = TH / 2 * z * w;
    const H = h * z;
    ctx.fillStyle = wallDark;
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy); ctx.lineTo(cx, cy + hh); ctx.lineTo(cx, cy + hh - H); ctx.lineTo(cx - hw, cy - H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = wall;
    ctx.beginPath();
    ctx.moveTo(cx + hw, cy); ctx.lineTo(cx, cy + hh); ctx.lineTo(cx, cy + hh - H); ctx.lineTo(cx + hw, cy - H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh - H); ctx.lineTo(cx + hw, cy - H); ctx.lineTo(cx, cy + hh - H); ctx.lineTo(cx - hw, cy - H); ctx.closePath(); ctx.fill();
    return { top: cy - hh - H };
  }

  function roofPyramid(cx, cy, z, w, h, base, color, dark) {
    const hw = TW / 2 * z * w;
    const hh = TH / 2 * z * w;
    const top = cy - base * z - h * z;
    const by = cy - base * z;
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.moveTo(cx - hw, by); ctx.lineTo(cx, by + hh); ctx.lineTo(cx, top); ctx.closePath(); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(cx + hw, by); ctx.lineTo(cx, by + hh); ctx.lineTo(cx, top); ctx.closePath(); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(cx - hw, by); ctx.lineTo(cx, by - hh); ctx.lineTo(cx + hw, by); ctx.lineTo(cx, top); ctx.closePath(); ctx.fill();
    return top;
  }

  function label(text, x, y, z, opts) {
    const o = opts || {};
    ctx.font = `${o.bold ? '700 ' : ''}${Math.round((o.size || 12) * Math.max(z, 0.7))}px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 8;
    const h = (o.size || 12) * Math.max(z, 0.7) + 4;
    ctx.fillStyle = o.bg || 'rgba(255,250,240,.88)';
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.fillStyle = o.color || '#2c2418';
    ctx.fillText(text, x, y + 0.5);
  }

  function drawTile(world, t, z, now, facs) {
    const p = toScreen(iso(t.row, t.col));
    const phase = Rules.phaseAtEq(Math.floor(world.clock.tick / Rules.TICKS_PER_SLOT));
    const hovered = ui.hover && ui.hover.kind === 'tile' && ui.hover.r === t.row && ui.hover.c === t.col;
    const isDojo = t.row === DOJO.r && t.col === DOJO.c;
    if (t.terrain === 'material') slab(p.x, p.y, z, '#9aa1a6', '#6d7378');
    else if (t.terrain === 'herb') slab(p.x, p.y, z, phase.herbYield > 0 ? '#5f9f4e' : '#8f7a52', '#4a6b38');
    else slab(p.x, p.y, z, isDojo ? '#cdb98d' : '#93bf6b', isDojo ? '#9c8a62' : '#6c9450');
    if (hovered) {
      diamond(p.x, p.y, z);
      ctx.fillStyle = 'rgba(255,240,180,.35)';
      ctx.fill();
    }
    if (t.terrain === 'material') {
      for (const [dx, dy, s] of [[-14, -2, 1], [8, -6, 0.8], [2, 6, 0.9]]) {
        const x = p.x + dx * z;
        const y = p.y + dy * z;
        ctx.fillStyle = '#cfe6f5';
        ctx.beginPath(); ctx.moveTo(x, y - 14 * s * z); ctx.lineTo(x + 5 * s * z, y); ctx.lineTo(x - 5 * s * z, y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#86b3d1';
        ctx.beginPath(); ctx.moveTo(x, y - 14 * s * z); ctx.lineTo(x + 5 * s * z, y); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
      }
    } else if (t.terrain === 'herb') {
      const grown = phase.herbYield > 0;
      for (const [dx, dy] of [[-16, 0], [-4, -8], [10, -2], [2, 7], [16, 4]]) {
        const x = p.x + dx * z;
        const y = p.y + dy * z;
        const sway = Math.sin(now / 600 + dx) * 1.5 * z;
        ctx.strokeStyle = grown ? '#2f6b2a' : '#6b5a3a';
        ctx.lineWidth = 2 * z;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sway, y - (grown ? 12 : 5) * z); ctx.stroke();
        if (grown) {
          ctx.fillStyle = '#e8d36a';
          ctx.beginPath(); ctx.arc(x + sway, y - 12 * z, 2.2 * z, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    if (!facs[t.id] && !isDojo && t.terrain !== 'build') {
      label(t.terrain === 'material' ? '靈材點' : (phase.herbYield > 0 ? '靈草點' : '靈草點（未生）'), p.x, p.y + TH * 0.32 * z, z, { size: 10 });
    }
  }

  function drawGate(z, now) {
    const p = toScreen(iso(GATE.r, GATE.c));
    slab(p.x, p.y, z, '#c9a56e', '#9a7c4e');
    const hovered = ui.hover && ui.hover.kind === 'gate';
    if (hovered) { diamond(p.x, p.y, z); ctx.fillStyle = 'rgba(255,240,180,.35)'; ctx.fill(); }
    // 牌坊
    ctx.fillStyle = '#9b2d20';
    ctx.fillRect(p.x - 22 * z, p.y - 38 * z, 4 * z, 38 * z);
    ctx.fillRect(p.x + 18 * z, p.y - 38 * z, 4 * z, 38 * z);
    ctx.fillStyle = '#2c2418';
    ctx.fillRect(p.x - 28 * z, p.y - 44 * z, 56 * z, 6 * z);
    ctx.fillStyle = '#9b2d20';
    ctx.fillRect(p.x - 24 * z, p.y - 34 * z, 48 * z, 3 * z);
    label('村口', p.x, p.y + TH * 0.3 * z, z, { size: 10 });
    void now;
  }

  function drawDojo(z, now) {
    const p = toScreen(iso(DOJO.r, DOJO.c));
    box(p.x, p.y, z, 0.72, 26, '#e7d6ae', '#bba77a', '#d8c79c');
    const top = roofPyramid(p.x, p.y, z, 0.86, 18, 26, '#5b4a7a', '#45385e');
    ctx.fillStyle = '#2c2418';
    ctx.fillRect(p.x + 8 * z, p.y - 8 * z, 8 * z, 14 * z);
    label('道館', p.x, top - 8 * z, z, { bold: true });
    void now;
    return { x: p.x, y: p.y, top };
  }

  function drawFacility(world, f, z, now) {
    const t = world.tiles.find((x) => x.id === f.tileId);
    const p = toScreen(iso(t.row, t.col));
    let top;
    if (!f.done) {
      ctx.setLineDash([4 * z, 3 * z]);
      ctx.strokeStyle = '#f4ecd8';
      ctx.lineWidth = 1.5 * z;
      const hw = TW / 2 * z * 0.6;
      const hh = TH / 2 * z * 0.6;
      const H = 24 * z;
      ctx.beginPath();
      ctx.moveTo(p.x - hw, p.y); ctx.lineTo(p.x, p.y + hh); ctx.lineTo(p.x + hw, p.y);
      ctx.lineTo(p.x + hw, p.y - H); ctx.lineTo(p.x, p.y - hh - H); ctx.lineTo(p.x - hw, p.y - H); ctx.closePath();
      ctx.moveTo(p.x, p.y + hh); ctx.lineTo(p.x, p.y + hh - H);
      ctx.stroke();
      ctx.setLineDash([]);
      const pct = Math.floor((f.progress.done / f.progress.total) * 100);
      top = p.y - hh - H;
      label(`${f.label} 建造中 ${pct}%`, p.x, top - 8 * z, z, { size: 11, bg: 'rgba(60,40,20,.8)', color: '#ffe9b0' });
      return { top };
    }
    if (f.type === 'spiritTerrace') {
      box(p.x, p.y, z, 0.66, 8, '#c8ccd2', '#9aa0a8', '#e2e6ea');
      const glow = 0.6 + 0.4 * Math.sin(now / 400);
      const g = ctx.createRadialGradient(p.x, p.y - 26 * z, 1, p.x, p.y - 26 * z, 16 * z);
      g.addColorStop(0, `rgba(170,230,255,${glow})`);
      g.addColorStop(1, 'rgba(170,230,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y - 26 * z, 16 * z, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e6f8ff';
      ctx.beginPath(); ctx.arc(p.x, p.y - 26 * z, 5 * z, 0, Math.PI * 2); ctx.fill();
      top = p.y - 44 * z;
    } else if (f.type === 'alchemyRoom') {
      const b = box(p.x, p.y, z, 0.62, 22, '#c98a64', '#9c6343', '#7a3d2a');
      ctx.fillStyle = '#5a3a2a';
      ctx.fillRect(p.x + 8 * z, b.top - 8 * z, 6 * z, 14 * z);
      const brewing = world.activities.some((a) => a.kind === 'brew' && a.status === 'working');
      if (brewing) {
        for (let i = 0; i < 3; i += 1) {
          const k = ((now / 900) + i / 3) % 1;
          ctx.fillStyle = `rgba(235,235,235,${0.6 * (1 - k)})`;
          ctx.beginPath(); ctx.arc(p.x + 11 * z + k * 6 * z, b.top - 10 * z - k * 22 * z, (3 + k * 5) * z, 0, Math.PI * 2); ctx.fill();
        }
      }
      top = b.top - 10 * z;
    } else {
      box(p.x, p.y, z, 0.62, 20, '#efe2c4', '#c2b28e', '#d9c9a5');
      top = roofPyramid(p.x, p.y, z, 0.74, 14, 20, '#4f7d4a', '#3c6038');
    }
    label(f.label, p.x, top - 8 * z, z, { size: 11 });
    return { top };
  }

  function drawPerson(world, d, person, sp, z, now, opts) {
    const a = activityOf(world, d);
    const traveling = a && a.status === 'traveling' && !a.partnerWait;
    const bob = traveling ? Math.abs(Math.sin(now / 120)) * 3 * z : 0;
    const x = sp.x;
    const y = sp.y - bob;
    const col = colorOf(d);
    if (opts && opts.ghost) {
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = '#ffe28a';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.ellipse(x, y - 14 * z, 8 * z, 14 * z, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y - 32 * z, 6 * z, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath(); ctx.ellipse(sp.x, sp.y, 10 * z, 4 * z, 0, 0, Math.PI * 2); ctx.fill();
    if (ui.selected === d.id) {
      ctx.strokeStyle = '#ffd34d';
      ctx.lineWidth = 2.5 * z;
      ctx.beginPath(); ctx.ellipse(sp.x, sp.y, 14 * z, 6 * z, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // 修行／突破的氣
    if (a && a.status === 'working' && (a.kind === 'cultivate' || a.kind === 'breakthrough' || a.kind === 'tune-mind')) {
      const k = 0.5 + 0.5 * Math.sin(now / 300);
      ctx.strokeStyle = a.kind === 'tune-mind' ? `rgba(120,180,255,${0.3 + 0.4 * k})` : `rgba(200,150,255,${0.3 + 0.4 * k})`;
      ctx.lineWidth = 2 * z;
      ctx.beginPath(); ctx.ellipse(x, y - 16 * z, (14 + 3 * k) * z, (20 + 3 * k) * z, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // 身體（道袍）與頭
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x - 8 * z, y); ctx.lineTo(x + 8 * z, y); ctx.lineTo(x + 5 * z, y - 24 * z); ctx.lineTo(x - 5 * z, y - 24 * z); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.fillRect(x - 1 * z, y - 24 * z, 2 * z, 24 * z);
    ctx.fillStyle = '#f1d2b6';
    ctx.beginPath(); ctx.arc(x, y - 30 * z, 6 * z, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2c2418';
    ctx.beginPath(); ctx.arc(x, y - 32 * z, 6 * z, Math.PI, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y - 38 * z, 2.5 * z, 0, Math.PI * 2); ctx.fill();
    // 工作動作：採集與建造時手上揮動
    if (a && a.status === 'working' && ['gather-material', 'gather-herb', 'build', 'aid'].includes(a.kind)) {
      const sw = Math.sin(now / 160) * 0.8;
      ctx.strokeStyle = '#5a4630';
      ctx.lineWidth = 2 * z;
      ctx.beginPath(); ctx.moveTo(x + 5 * z, y - 18 * z); ctx.lineTo(x + 5 * z + Math.cos(sw) * 12 * z, y - 18 * z + Math.sin(sw) * 12 * z); ctx.stroke();
    }
    if (a && a.status === 'working' && a.kind === 'rest') {
      const k = (now / 1500) % 1;
      ctx.fillStyle = `rgba(255,255,255,${1 - k})`;
      ctx.font = `${Math.round(11 * z)}px sans-serif`;
      ctx.fillText('z', x + 10 * z + k * 6 * z, y - 40 * z - k * 12 * z);
    }
    // 狀態泡泡：字是在做什麼，外圈是本單位進度；金框是玩家下的令
    const st = person.status;
    let glyph = '…';
    let ring = null;
    if (a) {
      glyph = traveling ? '走' : (GLYPH[a.kind] || '？');
      if (a.status === 'working') ring = (a.workTicks % Rules.TICKS_PER_SLOT) / Rules.TICKS_PER_SLOT;
      else if (traveling) ring = a.path.length ? a.pathIndex / a.path.length : 0;
      if (a.partnerWait) glyph = '候';
    } else if (st.kind === 'wait') glyph = '等';
    const bx = x;
    const by = y - 54 * z;
    const manual = a && a.origin === 'manual';
    ctx.fillStyle = '#fffaf0';
    ctx.beginPath(); ctx.arc(bx, by, 10 * z, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = (manual ? 3 : 1.5) * z;
    ctx.strokeStyle = manual ? '#c99a2e' : 'rgba(0,0,0,.35)';
    ctx.stroke();
    if (ring !== null) {
      ctx.strokeStyle = traveling ? '#4f84c4' : '#3f7d3a';
      ctx.lineWidth = 3 * z;
      ctx.beginPath(); ctx.arc(bx, by, 13 * z, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ring); ctx.stroke();
    }
    ctx.fillStyle = '#2c2418';
    ctx.font = `700 ${Math.round(11 * Math.max(z, 0.7))}px "Noto Sans TC", "PingFang TC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, bx, by + 0.5);
    label(person.short, x, sp.y + 10 * z, z, { size: 10, bg: col, color: '#fff' });
  }

  function drawPath(world, d, z) {
    const a = activityOf(world, d);
    if (!a || a.status !== 'traveling' || a.pathIndex >= a.path.length) return;
    const pts = [targetPos(world, d), ...a.path.slice(a.pathIndex)];
    ctx.save();
    ctx.setLineDash([6 * z, 5 * z]);
    ctx.strokeStyle = 'rgba(255,226,138,.9)';
    ctx.lineWidth = 3 * z;
    ctx.beginPath();
    pts.forEach((q, i) => {
      const s = toScreen(iso(q.r, q.c));
      if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    const end = toScreen(iso(a.dest.r, a.dest.c));
    ctx.fillStyle = '#ffe28a';
    ctx.beginPath(); ctx.arc(end.x, end.y, 5 * z, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  const hit = { people: [], buildings: [] };

  function render(now) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      if (!ui.userCam) fit();
    }
    if (!ui.cam.fitted) fit();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const world = sim.world;
    const m = model();
    const z = ui.cam.zoom;
    const facs = facilitiesByTile(m);

    // 地面：由後往前
    const ground = [{ kind: 'gate', r: GATE.r, c: GATE.c }, ...world.tiles.map((t) => ({ kind: 'tile', t, r: t.row, c: t.col }))]
      .sort((a, b) => (a.r + a.c) - (b.r + b.c) || a.c - b.c);
    for (const g of ground) {
      if (g.kind === 'gate') drawGate(z, now);
      else drawTile(world, g.t, z, now, facs);
    }
    if (ui.selected) {
      const d = world.disciples.find((x) => x.id === ui.selected);
      if (d) drawPath(world, d, z);
    }

    // 立體物件：建築與人物一起依腳底深度排序，前面的蓋住後面的
    const items = [];
    items.push({ depth: DOJO.r + DOJO.c, kind: 'dojo' });
    for (const f of m.facilities) {
      const t = world.tiles.find((x) => x.id === f.tileId);
      items.push({ depth: t.row + t.col, kind: 'facility', f, r: t.row, c: t.col });
    }
    const joined = world.disciples.filter((d) => d.joinTick <= world.clock.tick);
    const byTile = {};
    for (const d of joined) {
      const tp = targetPos(world, d);
      const key = `${Math.round(tp.r)},${Math.round(tp.c)}`;
      (byTile[key] = byTile[key] || []).push(d.id);
    }
    const OFFS = [[0.22, 0.22], [0.22, -0.18], [-0.12, 0.3], [0.35, 0.02]];
    const FRONT = [[0.5, -0.05], [-0.05, 0.5], [0.48, 0.48], [0.5, 0.22]]; // 有建築的格子，人站在前緣
    for (const d of joined) {
      const want = targetPos(world, d);
      const key = `${Math.round(want.r)},${Math.round(want.c)}`;
      const idx = byTile[key].indexOf(d.id);
      const shown = ui.shownPos[d.id] || { r: want.r, c: want.c };
      shown.r += (want.r - shown.r) * 0.25;
      shown.c += (want.c - shown.c) * 0.25;
      ui.shownPos[d.id] = shown;
      const rr = Math.round(want.r);
      const cc = Math.round(want.c);
      const built = (rr === DOJO.r && cc === DOJO.c) || m.facilities.some((f) => f.tileId === `t-${rr}-${cc}`);
      const o = (built ? FRONT : OFFS)[idx % OFFS.length];
      const sp = toScreen(iso(shown.r + o[0], shown.c + o[1]));
      items.push({ depth: shown.r + o[0] + shown.c + o[1] + 0.05, kind: 'person', d, sp });
    }
    items.sort((a, b) => a.depth - b.depth);
    hit.people = [];
    hit.buildings = [];
    for (const it of items) {
      if (it.kind === 'dojo') {
        const r = drawDojo(z, now);
        hit.buildings.push({ r: DOJO.r, c: DOJO.c, x0: r.x - TW / 2 * z * 0.8, x1: r.x + TW / 2 * z * 0.8, y0: r.top - 14 * z, y1: r.y + 6 * z, depth: it.depth });
      } else if (it.kind === 'facility') {
        const r = drawFacility(world, it.f, z, now);
        const p = toScreen(iso(it.r, it.c));
        hit.buildings.push({ r: it.r, c: it.c, x0: p.x - TW / 2 * z * 0.7, x1: p.x + TW / 2 * z * 0.7, y0: r.top - 10 * z, y1: p.y + 6 * z, depth: it.depth });
      } else {
        const person = m.people.find((p) => p.id === it.d.id);
        drawPerson(world, it.d, person, it.sp, z, now);
        hit.people.push({ id: it.d.id, x0: it.sp.x - 14 * z, x1: it.sp.x + 14 * z, y0: it.sp.y - 66 * z, y1: it.sp.y + 16 * z, depth: it.depth, sp: it.sp });
      }
    }
    // 被建築擋住時，選取中與滑鼠下的人畫虛線輪廓，仍點得到
    for (const id of new Set([ui.selected, ui.hover && ui.hover.kind === 'person' ? ui.hover.id : null])) {
      const hp = hit.people.find((p) => p.id === id);
      if (!hp) continue;
      const covered = hit.buildings.some((b) => b.depth > hp.depth && hp.sp.x > b.x0 && hp.sp.x < b.x1 && hp.sp.y - 20 * z > b.y0 && hp.sp.y - 20 * z < b.y1);
      if (covered) {
        const d = world.disciples.find((x) => x.id === id);
        drawPerson(world, d, null, hp.sp, z, now, { ghost: true });
      }
    }
    drawFloaters(now, z);
  }

  // ---------- 回饋：浮字、資源閃動、橫幅 ----------
  function personScreen(id) {
    const hp = hit.people.find((p) => p.id === id);
    return hp ? { x: hp.sp.x, y: hp.sp.y - 70 * ui.cam.zoom } : null;
  }
  function pulse(id, text, color) {
    ui.floaters.push({ id, text, color: color || '#fff', born: performance.now() });
  }
  function drawFloaters(now, z) {
    ui.floaters = ui.floaters.filter((f) => now - f.born < 1800);
    const perId = {};
    for (const f of ui.floaters) {
      const at = f.id ? personScreen(f.id) : null;
      if (!at) continue;
      const k = (now - f.born) / 1800;
      const stack = (perId[f.id] = (perId[f.id] || 0) + 1) - 1;
      ctx.globalAlpha = 1 - k * k;
      label(f.text, at.x, at.y - k * 26 * z - stack * 18 * z, z, { size: 12, bold: true, bg: 'rgba(30,20,10,.75)', color: f.color });
      ctx.globalAlpha = 1;
    }
  }

  const FALLBACK_WHY = {
    insufficient_resource: '資源不足', no_seat: '沒有空位', participant_busy: '參與者忙碌', facility_missing: '設施未建',
    facility_not_ready: '設施未完工', cultivation_full: '修為已滿', breakthrough_done: '已突破過',
  };
  const STAT_NAMES = { stamina: '體力', mind: '心境', cultivation: '修為', injury: '傷勢' };
  const RES_NAMES = { spiritMaterial: '靈材', spiritHerb: '靈草', spiritStone: '靈石', reputation: '聲望' };
  function feedback(before, after, events) {
    for (const e of events) {
      if (e.type === 'unitCompleted') {
        const parts = [];
        for (const k of ['cultivation', 'stamina', 'mind', 'injury']) {
          const dlt = e.after[k] - e.before[k];
          if (dlt) parts.push(`${STAT_NAMES[k]}${dlt > 0 ? '+' : ''}${dlt}`);
        }
        const act = after.activities.find((a) => a.id === e.activityId);
        const name = Rules.ACTIONS[e.kind] ? Rules.ACTIONS[e.kind].label : (e.kind === 'build' ? '建造' : e.kind);
        pulse(e.discipleId, `${name}完成${act && act.units > 1 ? ` ${e.unit}/${act.units}` : ''}`, '#ffe9b0');
        if (parts.length) pulse(e.discipleId, parts.slice(0, 2).join(' '), '#d6f5c9');
      } else if (e.type === 'activityDeparted') {
        const act = after.activities.find((a) => a.id === e.activityId);
        if (act && act.fallback) {
          const from = Rules.ACTIONS[act.fallback.from] ? Rules.ACTIONS[act.fallback.from].label : (act.fallback.from === 'build' ? '建造' : act.fallback.from);
          const why = FALLBACK_WHY[act.fallback.reason] || act.fallback.reason;
          pulse(e.discipleId, `${from}改成休養：${why}`, '#ffc2a8');
          if (act.origin === 'manual') toast(`你下的「${from}」沒辦法開工（${why}），這次先改成休養；做完回到自主。`, 'bad');
        }
      } else if (e.type === 'manualInvalid') {
        toast(`你下的令失效了：${e.reason}；回到自主。`, 'bad');
      } else if (e.type === 'activityDone' && e.kind === 'build') {
        const act = after.activities.find((a) => a.id === e.activityId);
        banner(`${Rules.FACILITIES[act.target.facilityType].label} 完工`);
      } else if (e.type === 'breakthroughResolved') {
        const ok = e.outcome && e.outcome.result === 'success';
        banner(ok ? '突破成功！' : '突破失敗，傷勢加重');
      } else if (e.type === 'candidateAccepted') {
        banner('新弟子入門');
      } else if (e.type === 'phaseNotice') {
        const p = Rules.SPIRIT_PHASES.find((x) => x.id === e.phaseId);
        banner(`靈氣轉為「${p ? p.label : e.phaseId}」`);
      } else if (e.type === 'activityDone' && e.kind === 'aid') {
        banner('援村完成，村民送來謝禮');
      }
    }
    const res = $('resources');
    for (const k of Object.keys(RES_NAMES)) {
      const dlt = after.resources[k] - before.resources[k];
      if (!dlt) continue;
      const chip = res.querySelector(`[data-res="${k}"]`);
      if (chip) {
        chip.classList.remove('up', 'down');
        void chip.offsetWidth;
        chip.classList.add(dlt > 0 ? 'up' : 'down');
        setTimeout(() => chip.classList.remove('up', 'down'), 900);
      }
    }
  }

  let bannerTimer = null;
  function banner(text) {
    const b = $('banner');
    b.textContent = text;
    b.hidden = false;
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { b.hidden = true; }, 2200);
  }
  let toastTimer = null;
  function toast(text, kind) {
    const t = $('toast');
    t.textContent = text;
    t.className = `toast ${kind || ''}`;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 3800);
  }

  // ---------- 地點能做什麼（只列正式 orderActivity 支援的種類；驗證交給 dispatch） ----------
  function placeName(target) {
    if (target.kind === 'gate') return '村口';
    if (target.r === DOJO.r && target.c === DOJO.c) return '道館';
    const f = facilitiesByTile(model())[target.id];
    const t = sim.world.tiles.find((x) => x.id === target.id);
    if (f) return `${f.label}${f.done ? '' : '（建造中）'}`;
    return `${Rules.TERRAIN[t.terrain].label} ${target.id}`;
  }

  function costText(cost) {
    const parts = Object.keys(cost).filter((k) => cost[k]).map((k) => `${RES_NAMES[k] || k} ${cost[k]}`);
    return parts.length ? parts.join('、') : '不花資源';
  }
  function enough(cost) {
    return Object.keys(cost).every((k) => (sim.world.resources[k] || 0) >= cost[k]);
  }

  function actionsFor(target) {
    const world = sim.world;
    const m = model();
    const d = world.disciples.find((x) => x.id === ui.selected);
    const slotEq = Math.floor(world.clock.tick / Rules.TICKS_PER_SLOT);
    const phase = Rules.phaseAtEq(slotEq);
    const pid = world.protagonistId;
    const out = [];
    const order = (kind, tgt, units, extra) => Object.assign({ discipleId: pid, kind, target: tgt, units }, extra || {});
    const info = [];
    if (target.kind === 'gate') {
      const done = world.story.rescues.some((x) => x.id === Rules.AID_ID);
      const open = Rules.aidAvailableEq(slotEq);
      info.push(done ? '村民的柵欄已經修好了。' : (open ? '村民在求援：修柵欄。' : '目前沒有人求援（第 4 天起）。'));
      for (const id of Object.keys(Rules.AID_OPTIONS)) {
        const o = Rules.AID_OPTIONS[id];
        out.push({
          main: `援村：${o.label}`,
          why: `${costText(o.cost)}；謝禮 ${costText(o.reward)}`,
          disabled: done ? '援村已完成' : (!open ? '第 4 天（初兆）起才有人求援' : null),
          warn: !enough(o.cost) ? '材料現在不夠，出發時會改成休養' : null,
          payload: order('aid', { optionId: id }, 1),
        });
      }
    } else if (target.r === DOJO.r && target.c === DOJO.c) {
      info.push('宗門的道館：修行、休養、調心與突破都在這裡（有聚靈台或居所時，引擎可能安排去那裡）。');
      out.push({ main: '修行 1 單位', why: '修為上升，耗體力與心境', payload: order('cultivate', {}, 1) });
      out.push({ main: '修行 3 單位', why: '連續修行，中途可取消', payload: order('cultivate', {}, 3) });
      out.push({ main: '休養 1 單位', why: '恢復體力', payload: order('rest', {}, 1) });
      out.push({ main: '調心 1 單位', why: '恢復心境', payload: order('tune-mind', {}, 1) });
      const prot = world.disciples.find((x) => x.id === pid);
      const e = Prog.eligibility(prot);
      const master = world.masterId;
      const pills = world.inventory['breakthrough-pill'];
      out.push({
        main: '突破：用丹，師父護法',
        why: `凝氣丹 ${pills} 顆；成敗只擲一次`,
        disabled: e.ok ? (pills < 1 ? '沒有凝氣丹' : null) : e.reason.replace(prot.id, '主角'),
        payload: order('breakthrough', {}, 1, { usePill: true, supporterId: master }),
      });
      out.push({
        main: '突破：不用丹，無人護法',
        why: '成功率較低',
        disabled: e.ok ? null : e.reason.replace(prot.id, '主角'),
        payload: order('breakthrough', {}, 1, { usePill: false, supporterId: null }),
      });
    } else {
      const t = world.tiles.find((x) => x.id === target.id);
      const f = facilitiesByTile(m)[t.id];
      const el = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' }[t.element];
      if (t.terrain === 'material') {
        info.push(`靈材點（${el}）。兩個工作位。`);
        for (const n of [1, 3]) out.push({ main: `採集靈材 ${n} 單位`, why: `每單位耗體力 ${Rules.ACTIONS['gather-material'].staminaCost}`, payload: order('gather-material', { tileId: t.id }, n) });
      } else if (t.terrain === 'herb') {
        info.push(phase.herbYield > 0 ? `靈草點（${el}）。兩個工作位。` : '靈草還沒長出來：第 4 天（初兆）起才能採。');
        for (const n of [1, 3]) {
          out.push({
            main: `採集靈草 ${n} 單位`, why: `每單位耗體力 ${Rules.ACTIONS['gather-herb'].staminaCost}`,
            disabled: phase.herbYield > 0 ? null : '靈草尚未長出（第 4 天起）',
            payload: order('gather-herb', { tileId: t.id }, n),
          });
        }
      } else if (f && !f.done) {
        info.push(`${f.label}建造中：${Math.floor((f.progress.done / f.progress.total) * 100)}%。一次只能一人施工。`);
      } else if (f) {
        if (f.type === 'alchemyRoom') {
          const rc = Rules.RECIPES['breakthrough-pill'];
          info.push('丹房：可以煉凝氣丹。');
          out.push({ main: `煉丹：${rc.label}`, why: `${costText(rc.cost)}，${rc.durationSlots} 單位`, warn: !enough(rc.cost) ? '材料現在不夠，出發時會改成休養' : null, payload: order('brew', { recipeId: 'breakthrough-pill' }, rc.durationSlots) });
        } else if (f.type === 'spiritTerrace') {
          info.push('聚靈台：修行效率較好，一個座位。座位由引擎分配，滿了會回道館。');
          out.push({ main: '修行 1 單位', why: '引擎優先安排到聚靈台', payload: order('cultivate', {}, 1) });
        } else {
          info.push('居所：休養的地方，兩個床位。');
          out.push({ main: '休養 1 單位', why: '引擎優先安排到居所', payload: order('rest', {}, 1) });
        }
      } else {
        info.push(`空地（${el}）。可以蓋設施；五行相生相剋會影響效率。`);
        for (const type of Object.keys(Rules.FACILITIES)) {
          const fd = Rules.FACILITIES[type];
          const place = Rules.evaluateFacilityPlacement(world.tiles, t.id, type);
          const exists = m.facilities.some((x) => x.type === type);
          out.push({
            main: `建造${fd.label}`,
            why: `${costText(fd.cost)}，${fd.durationSlots} 單位；此地效率 ×${(place.ok ? place.multiplierBp / 10000 : 1).toFixed(2)}`,
            disabled: exists ? '已有一座或正在建造' : (place.ok ? null : place.reason),
            warn: !enough(fd.cost) ? '靈材現在不夠，出發時會改成休養' : null,
            payload: order('build', { facilityType: type, tileId: t.id }, fd.durationSlots),
          });
        }
      }
    }
    let who = null;
    if (d && d.id !== pid) {
      who = `${m.people.find((p) => p.id === d.id).name} 依宗門目標自主行動；手動指令只給主角（正式規則）。下面是主角能在這裡做的事。`;
    } else if (!d) {
      who = '沒有選人物；下面是主角能在這裡做的事。';
    }
    return { title: placeName(target), info, who, actions: out };
  }

  // ---------- DOM：上方列、人物、選單、抽屜 ----------
  const SLOT_NAMES = ['早', '午', '晚'];
  function refreshTop() {
    const m = model();
    const t = sim.world.clock.tick;
    const inDay = t % Rules.TICKS_PER_DAY;
    $('clock').innerHTML = `<span class="day">第 ${m.clock.day} 天・${SLOT_NAMES[m.clock.slotOfDay - 1]}</span>　靈氣：${esc(m.clock.phase)}　<small>tick ${t}</small>`
      + `<span class="daybar" aria-hidden="true"><span style="width:${(inDay / Rules.TICKS_PER_DAY) * 100}%"></span></span>`;
    const tg = $('toggle');
    tg.textContent = sim.mode === 'playing' ? '❚❚ 暫停' : (sim.mode === 'error' ? '已停止' : (sim.started ? '▶ 繼續' : '▶ 開始'));
    tg.disabled = sim.mode === 'error';
    for (const b of document.querySelectorAll('[data-speed]')) b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === sim.speed));
    const res = $('resources');
    const vals = { ...sim.world.resources };
    if (!res.firstChild) {
      res.innerHTML = Object.keys(RES_NAMES).map((k) => `<span class="chip" data-res="${k}"></span>`).join('') + '<span class="chip" data-res="pill"></span>';
    }
    for (const k of Object.keys(RES_NAMES)) res.querySelector(`[data-res="${k}"]`).textContent = `${RES_NAMES[k]} ${vals[k]}`;
    res.querySelector('[data-res="pill"]').textContent = `凝氣丹 ${sim.world.inventory['breakthrough-pill']}`;
  }

  function esc(v) {
    return String(v).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }
  const bar = (v, cls) => `<span class="bar ${cls}" title="${cls}"><span style="width:${Math.max(0, Math.min(100, v))}%"></span></span>`;

  function doingText(world, p) {
    const s = p.status;
    if (!p.joined) return s.text;
    if (s.kind === 'activity') {
      let txt = s.text;
      if (s.fallback) txt += `（${s.fallback}）`;
      return txt;
    }
    return s.text;
  }

  // 播放中每 tick 都會變的文字只改節點內容，不重建按鈕：重建會吃掉點擊，也會讓鍵盤焦點跳走。
  function setHtml(el, html) {
    if (el._html !== html) {
      el._html = html;
      el.innerHTML = html;
    }
  }
  function setText(el, text) {
    if (el.textContent !== text) el.textContent = text;
  }

  let rosterKey = '';
  function refreshRoster() {
    const world = sim.world;
    const m = model();
    const joined = m.people.filter((p) => p.joined);
    const key = `${joined.map((p) => p.id).join(',')}|${ui.layout}`;
    const box = $('roster');
    if (key !== rosterKey) {
      rosterKey = key;
      box.innerHTML = joined.map((p) => {
        const d = world.disciples.find((x) => x.id === p.id);
        return `<button type="button" class="person" data-person="${esc(p.id)}" aria-pressed="false">
          <span class="avatar" style="background:${colorOf(d)}">${esc(p.short)}</span>
          <span class="pname">${esc(p.name)} <span class="glyph"></span><span class="manual"></span></span>
          <span class="pdoing"></span>
          <span class="bars">${bar(0, 'stamina')}${bar(0, 'mind')}${bar(0, 'cult')}</span>
        </button>`;
      }).join('');
    }
    for (const p of joined) {
      const card = box.querySelector(`[data-person="${p.id}"]`);
      if (!card) continue;
      const d = world.disciples.find((x) => x.id === p.id);
      const a = activityOf(world, d);
      const glyph = a ? (a.status === 'traveling' && !a.partnerWait ? '走' : GLYPH[a.kind]) : (p.status.kind === 'wait' ? '等' : '…');
      card.setAttribute('aria-pressed', String(ui.selected === p.id));
      setText(card.querySelector('.glyph'), `［${glyph}］`);
      setText(card.querySelector('.manual'), a && a.origin === 'manual' ? '玩家令' : '');
      setText(card.querySelector('.pdoing'), doingText(world, p));
      const spans = card.querySelectorAll('.bars .bar span');
      [p.stamina, p.mind, p.cultivation].forEach((v, i) => { spans[i].style.width = `${Math.max(0, Math.min(100, v))}%`; });
    }
  }

  function refreshDrawer() {
    const world = sim.world;
    const m = model();
    const p = m.people.find((x) => x.id === ui.selected);
    const d = p ? world.disciples.find((x) => x.id === p.id) : null;
    setHtml($('detail'), p ? `<h4>${esc(p.name)}</h4>
      <dl class="kv">
        <dt>正在</dt><dd>${esc(doingText(world, p))}</dd>
        <dt>體力</dt><dd>${p.stamina}</dd><dt>心境</dt><dd>${p.mind}</dd><dt>修為</dt><dd>${p.cultivation}</dd><dt>傷勢</dt><dd>${p.injury}</dd>
        <dt>根骨／悟性／巧手</dt><dd>${p.attributes.rootBone}／${p.attributes.comprehension}／${p.attributes.craft}</dd>
        <dt>手動指令</dt><dd>${p.manualOrder ? esc(p.manualOrder) : '無'}</dd>
      </dl>` : '<h4>沒有選人物</h4>');
    setHtml($('detail-actions'), d && d.id === world.protagonistId && d.manualOrder ? '<button type="button" id="cancel-order">取消主角的手動指令</button>' : '');
    const places = [{ kind: 'tile', r: DOJO.r, c: DOJO.c, id: `t-${DOJO.r}-${DOJO.c}` }, { kind: 'gate', r: GATE.r, c: GATE.c }];
    for (const t of world.tiles) {
      if (t.row === DOJO.r && t.col === DOJO.c) continue;
      places.push({ kind: 'tile', r: t.row, c: t.col, id: t.id });
    }
    setHtml($('places'), `<h4>地點（鍵盤也能用）</h4><div class="grid">${places.map((q) => `<button type="button" data-place="${q.kind}:${q.r}:${q.c}">${esc(placeName(q))}</button>`).join('')}</div>`);
    setHtml($('goals'), `<h4>宗門目標（唯讀；改目標屬 RT-04）</h4><ol>${m.goals.map((g) => `<li>${esc(g.text)}</li>`).join('')}</ol>
      <h4>政策（唯讀）</h4><p>${m.policy.map((x) => `${esc(x.name)}：${esc(x.text)}`).join('、')}</p>`);
    setHtml($('events'), `<h4>最近事件</h4><ol reversed>${m.events.slice(0, 30).map((e) => `<li>[第 ${Math.floor(e.tick / Rules.TICKS_PER_DAY) + 1} 天] ${esc(e.text)}</li>`).join('')}</ol>`);
  }

  function openMenu(target, sx, sy) {
    if (sim.mode === 'playing' && ui.pauseOnMenu) {
      setMode('paused');
      ui.autoPausedForMenu = true;
    }
    ui.menu = { target, sx, sy };
    renderMenu();
  }
  function closeMenu(resume) {
    const was = ui.autoPausedForMenu;
    ui.menu = null;
    const el = $('menu');
    el.hidden = true;
    el.innerHTML = '';
    if (resume && was) setMode('playing');
    ui.autoPausedForMenu = false;
  }

  function renderMenu() {
    const el = $('menu');
    if (!ui.menu) return;
    const spec = actionsFor(ui.menu.target);
    const isProt = !ui.selected || ui.selected === sim.world.protagonistId;
    el.innerHTML = `<button type="button" class="close" aria-label="關閉" data-close>×</button>
      <h3>${esc(spec.title)}</h3>
      <p class="sub">${spec.info.map(esc).join(' ')}</p>
      ${spec.who ? `<p class="who">${esc(spec.who)}</p>` : ''}
      ${ui.autoPausedForMenu ? '<p class="sub">（已自動暫停；下令或關閉後繼續）</p>' : ''}
      <ul>${spec.actions.length ? spec.actions.map((a, i) => `<li><button type="button" data-act="${i}" class="${a.warn ? 'warn' : ''}" ${a.disabled || !isProt ? 'disabled' : ''}>
        <span class="main">${esc(a.main)}</span>
        <span class="why">${esc(a.disabled || (a.warn ? `${a.why}；${a.warn}` : a.why))}</span>
      </button></li>`).join('') : '<li class="sub">這裡現在沒有可下的令。</li>'}</ul>`;
    el.hidden = false;
    el._spec = spec;
    if (ui.layout === 'a') {
      el.classList.add('floating');
      const wrap = $('scene-wrap');
      if (el.parentElement !== wrap) wrap.appendChild(el);
      const W = wrap.clientWidth;
      const H = wrap.clientHeight;
      const mw = 270;
      // 放在點擊處旁邊，不蓋住被點的地點；右邊放不下就放左邊
      const gap = 70 * ui.cam.zoom;
      let left = ui.menu.sx + gap;
      if (left + mw > W - 8) left = ui.menu.sx - gap - mw;
      left = Math.max(8, Math.min(W - mw - 8, left));
      el.style.left = `${left}px`;
      el.style.top = `${Math.max(8, Math.min(H - el.offsetHeight - 8, ui.menu.sy - 40))}px`;
    } else {
      el.classList.remove('floating');
      el.style.left = '';
      el.style.top = '';
      const dock = $('dock');
      if (el.parentElement !== dock) dock.insertBefore(el, dock.firstChild);
    }
    const first = el.querySelector('[data-act]:not(:disabled)') || el.querySelector('[data-close]');
    if (first && ui.menu.keyboard) first.focus();
  }

  // ---------- 輸入 ----------
  function pick(sx, sy) {
    const z = ui.cam.zoom;
    void z;
    const ppl = hit.people.filter((p) => sx >= p.x0 && sx <= p.x1 && sy >= p.y0 && sy <= p.y1).sort((a, b) => b.depth - a.depth);
    if (ppl.length) return { kind: 'person', id: ppl[0].id };
    const bld = hit.buildings.filter((b) => sx >= b.x0 && sx <= b.x1 && sy >= b.y0 && sy <= b.y1).sort((a, b) => b.depth - a.depth);
    if (bld.length) return bld[0].r === GATE.r && bld[0].c === GATE.c ? { kind: 'gate', r: GATE.r, c: GATE.c } : { kind: 'tile', r: bld[0].r, c: bld[0].c, id: `t-${bld[0].r}-${bld[0].c}` };
    return tileAt(sx, sy);
  }

  let drag = null;
  canvas.addEventListener('pointerdown', (ev) => {
    drag = { x: ev.clientX, y: ev.clientY, cx: ui.cam.x, cy: ui.cam.y, moved: false };
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener('pointermove', (ev) => {
    const rect = canvas.getBoundingClientRect();
    if (drag) {
      const dx = ev.clientX - drag.x;
      const dy = ev.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
      if (drag.moved) {
        ui.cam.x = drag.cx - dx / ui.cam.zoom;
        ui.cam.y = drag.cy - dy / ui.cam.zoom;
        ui.userCam = true;
      }
    }
    ui.hover = pick(ev.clientX - rect.left, ev.clientY - rect.top);
    canvas.style.cursor = ui.hover ? 'pointer' : 'default';
  });
  canvas.addEventListener('pointerup', (ev) => {
    const d = drag;
    drag = null;
    if (d && d.moved) return;
    const rect = canvas.getBoundingClientRect();
    const sx = ev.clientX - rect.left;
    const sy = ev.clientY - rect.top;
    const target = pick(sx, sy);
    if (!target) {
      closeMenu(true);
      return;
    }
    if (target.kind === 'person') {
      ui.selected = target.id;
      closeMenu(true);
      return;
    }
    openMenu(target, sx, sy);
  });
  canvas.addEventListener('pointerleave', () => { ui.hover = null; });
  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    ui.cam.zoom = Math.max(0.45, Math.min(2.4, ui.cam.zoom * (ev.deltaY < 0 ? 1.1 : 0.9)));
    ui.userCam = true;
    if (ui.menu) closeMenu(false);
  }, { passive: false });

  document.addEventListener('click', (ev) => {
    const person = ev.target.closest('[data-person]');
    if (person) {
      ui.selected = person.dataset.person;
      return;
    }
    const sp = ev.target.closest('[data-speed]');
    if (sp) { sim.speed = Number(sp.dataset.speed); refreshTop(); return; }
    const lay = ev.target.closest('[data-layout]');
    if (lay) { setLayout(lay.dataset.layout); return; }
    if (ev.target.closest('[data-close]')) { closeMenu(true); return; }
    const place = ev.target.closest('[data-place]');
    if (place) {
      const [kind, r, c] = place.dataset.place.split(':');
      const target = kind === 'gate' ? { kind, r: Number(r), c: Number(c) } : { kind, r: Number(r), c: Number(c), id: `t-${r}-${c}` };
      const s = toScreen(iso(target.r, target.c));
      openMenu(target, s.x, s.y);
      ui.menu.keyboard = true;
      renderMenu();
      return;
    }
    if (ev.target.id === 'cancel-order') {
      send('cancelManualOrder', { discipleId: sim.world.protagonistId }, '已取消主角的手動指令；之後回到自主');
      return;
    }
    const act = ev.target.closest('[data-act]');
    if (act) {
      const spec = $('menu')._spec;
      const a = spec.actions[Number(act.dataset.act)];
      const ok = send('orderActivity', a.payload, `已下令：主角${a.main}。目前這一步結束後開始，自主不會覆寫，做完回到自主。`);
      if (ok) {
        ui.selected = sim.world.protagonistId;
        closeMenu(true);
      }
    }
  });
  $('toggle').addEventListener('click', () => {
    if (sim.mode === 'playing') setMode('paused'); else if (sim.mode === 'paused') setMode('playing');
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.target instanceof HTMLInputElement) return;
    const joined = sim.world.disciples.filter((d) => d.joinTick <= sim.world.clock.tick).map((d) => d.id);
    if (ev.key === ' ' && !(ev.target instanceof HTMLButtonElement)) {
      ev.preventDefault();
      $('toggle').click();
    } else if (ev.key === '1' || ev.key === '2' || ev.key === '4') {
      sim.speed = Number(ev.key);
      refreshTop();
    } else if (ev.key === '[' || ev.key === ']') {
      const i = joined.indexOf(ui.selected);
      ui.selected = joined[(i + (ev.key === ']' ? 1 : joined.length - 1)) % joined.length];
    } else if (ev.key === 'Escape') {
      closeMenu(true);
    } else if (ev.target === canvas && ev.key.startsWith('Arrow')) {
      ev.preventDefault();
      const s = 30 / ui.cam.zoom;
      if (ev.key === 'ArrowLeft') ui.cam.x -= s;
      if (ev.key === 'ArrowRight') ui.cam.x += s;
      if (ev.key === 'ArrowUp') ui.cam.y -= s;
      if (ev.key === 'ArrowDown') ui.cam.y += s;
      ui.userCam = true;
    } else if (ev.target === canvas && (ev.key === '+' || ev.key === '=' || ev.key === '-')) {
      ui.cam.zoom = Math.max(0.45, Math.min(2.4, ui.cam.zoom * (ev.key === '-' ? 0.9 : 1.1)));
      ui.userCam = true;
    } else if (ev.key === '0' && ev.target === canvas) {
      ui.userCam = false;
      fit();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && sim.mode === 'playing') {
      setMode('paused');
      toast('分頁在背景時自動暫停，回來後按繼續', '');
    }
  });
  window.addEventListener('resize', () => { if (!ui.userCam) fit(); if (ui.menu) renderMenu(); });

  function setLayout(which) {
    ui.layout = which;
    document.body.className = `layout-${which}`;
    for (const b of document.querySelectorAll('[data-layout]')) b.setAttribute('aria-pressed', String(b.dataset.layout === which));
    $('drawer').open = which === 'b';
    rosterKey = '';
    ui.userCam = false;
    if (ui.menu) renderMenu();
    requestAnimationFrame(fit);
  }

  function hint() {
    const h = $('hint');
    let text;
    if (!sim.started) text = '按「開始」或空白鍵讓時間走。宗門的人會自己安排工作。';
    else if (ui.menu) text = '選一個操作，或按 Esc／點空白處關閉。';
    else if (ui.selected === sim.world.protagonistId) text = '點場景裡的地點（礦點、草點、空地、道館、村口），看主角能在那裡做什麼。';
    else text = '這位依宗門目標自主行動。點主角（藍衣）可以下令；拖曳平移、滾輪縮放、0 重設視角。';
    if (h.textContent !== text) h.textContent = text;
  }

  // ---------- 主迴圈 ----------
  const perf = { renderMs: [], stepMs: [] };
  const keep = (arr, v) => { arr.push(v); if (arr.length > 240) arr.shift(); };
  function loop(now) {
    const t0 = performance.now();
    step(now);
    const t1 = performance.now();
    render(now);
    keep(perf.stepMs, t1 - t0);
    keep(perf.renderMs, performance.now() - t1);
    refreshTop();
    refreshRoster();
    refreshDrawer();
    hint();
    requestAnimationFrame(loop);
  }

  // 只讀狀態，給截圖與驗證用
  Object.defineProperty(window, 'protoState', {
    value: () => ({
      tick: sim.world.clock.tick, mode: sim.mode, revision: sim.world.revision, hash: R.hashWorld(sim.world),
      selected: ui.selected, layout: ui.layout, menu: ui.menu ? placeName(ui.menu.target) : null,
    }),
  });
  // 最近 240 幀的推進與繪圖耗時（ms），只讀
  Object.defineProperty(window, 'protoPerf', {
    value: () => {
      const stat = (a) => { const v = [...a].sort((x, y) => x - y); return { n: v.length, avg: v.reduce((x, y) => x + y, 0) / (v.length || 1), p95: v[Math.floor(v.length * 0.95)] || 0 }; };
      return { render: stat(perf.renderMs), step: stat(perf.stepMs) };
    },
  });
  // 地塊在畫面上的座標（只算畫面，不碰世界），給截圖腳本點擊用
  Object.defineProperty(window, 'protoScreenOf', { value: (r, c) => toScreen(iso(r, c)) });

  const params = new URLSearchParams(location.search);
  newWorld(params.get('seed') || 'rt-dev-000');
  ui.selected = sim.world.protagonistId;
  if (params.get('layout') === 'b') setLayout('b'); else setLayout('a');
  refreshTop();
  requestAnimationFrame(loop);
})();
