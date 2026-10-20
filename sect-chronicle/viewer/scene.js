/*
 * SG-RT-04：A 主場景的斜視 renderer（原生 Canvas 2D，零依賴）。從 #146 已審的研究原型移植繪圖、遮擋與點擊判定。
 *
 * 只讀世界與 View.describe 的結果：不持有世界、不推進、不讀 RNG、不寫世界。人物走路的補間、浮字與鏡頭都是畫面狀態。
 * 介面刻意收窄（draw／hitTest／screenOf／pulse／鏡頭），日後若改用 PixiJS 等套件只需換掉這個檔案。
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module && module.exports) {
    module.exports = factory();
  } else {
    const ns = root.SectChronicle || (root.SectChronicle = {});
    ns.ViewerScene = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TW = 96;
  const TH = 48;
  const SLAB = 10;
  const ZOOM_MIN = 0.45;
  const ZOOM_MAX = 2.4;
  const FLOAT_MS = 1800;
  const ROLE_COLORS = Object.freeze({ master: '#6b4c9a', protagonist: '#2f6db5', apprentice: '#2c8c7d' });
  const APPRENTICE_COLORS = Object.freeze(['#2c8c7d', '#c0672c']);
  const GLYPH = Object.freeze({
    'gather-material': '礦', 'gather-herb': '草', cultivate: '修', rest: '休', 'tune-mind': '心',
    build: '建', brew: '丹', aid: '援', breakthrough: '破', support: '護',
  });
  const TONES = Object.freeze({ done: '#ffe9b0', gain: '#d6f5c9', bad: '#ffc2a8', order: '#f3d27a' });
  const iso = (r, c) => ({ x: (c - r) * TW / 2, y: (c + r) * TH / 2 });

  function colorOf(d) {
    if (d.role !== 'apprentice') return ROLE_COLORS[d.role];
    const m = /(\d+)$/.exec(d.id);
    return APPRENTICE_COLORS[m ? (Number(m[1]) - 1) % 2 : 0];
  }

  function activityOf(world, d) {
    return d.activityId ? world.activities.find((a) => a.id === d.activityId) || null : null;
  }

  // 人物狀態泡泡的字：旅行是「走」，等同伴是「候」，等待是「等」。名冊也用同一套。
  function glyphOf(world, d, status) {
    const a = activityOf(world, d);
    if (a) {
      if (a.partnerWait) return '候';
      return a.status === 'traveling' ? '走' : (GLYPH[a.kind] || '？');
    }
    return status && status.kind === 'wait' ? '等' : '…';
  }

  function createScene(canvas, deps) {
    const Rules = deps.Rules;
    const ctx = canvas.getContext('2d');
    const GATE = { r: Rules.VILLAGE_GATE.r, c: Rules.VILLAGE_GATE.c };
    const DOJO = { r: Rules.DOJO.r, c: Rules.DOJO.c };
    const SIZE = Rules.MAP_SIZE;
    const cam = { x: 0, y: 0, zoom: 1, user: false, w: 0, h: 0 };
    let cur = { selected: null, hover: null };
    let hit = { people: [], buildings: [] };
    let floaters = [];
    const shownPos = {};

    function fit() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const pts = [];
      for (let r = 0; r < SIZE; r += 1) for (let c = -1; c < SIZE; c += 1) pts.push(iso(r, c));
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      const bw = Math.max(...xs) - Math.min(...xs) + TW * 1.4;
      const bh = Math.max(...ys) - Math.min(...ys) + TH * 3.2;
      cam.zoom = Math.max(ZOOM_MIN, Math.min(1.8, Math.min(w / bw, h / bh)));
      cam.x = (Math.max(...xs) + Math.min(...xs)) / 2;
      cam.y = (Math.max(...ys) + Math.min(...ys)) / 2 - TH * 0.6;
      cam.user = false;
    }

    function toScreen(p) {
      return { x: (p.x - cam.x) * cam.zoom + canvas.clientWidth / 2, y: (p.y - cam.y) * cam.zoom + canvas.clientHeight / 2 };
    }
    function toWorld(sx, sy) {
      return { x: (sx - canvas.clientWidth / 2) / cam.zoom + cam.x, y: (sy - canvas.clientHeight / 2) / cam.zoom + cam.y };
    }
    function tileAt(sx, sy) {
      const p = toWorld(sx, sy);
      const rr = Math.round((p.y / (TH / 2) - p.x / (TW / 2)) / 2);
      const cc = Math.round((p.x / (TW / 2) + p.y / (TH / 2)) / 2);
      if (rr === GATE.r && cc === GATE.c) return 'gate';
      if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE) return `t-${rr}-${cc}`;
      return null;
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
      const hovered = cur.hover === t.id;
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
      const hovered = cur.hover === 'gate';
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
      if (cur.selected === d.id) {
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
      const glyph = glyphOf(world, d, person.status);
      let ring = null;
      if (a && a.status === 'working') ring = (a.workTicks % Rules.TICKS_PER_SLOT) / Rules.TICKS_PER_SLOT;
      else if (traveling) ring = a.path.length ? a.pathIndex / a.path.length : 0;
      const bx = x;
      const by = y - 54 * z;
      const manual = (a && a.origin === 'manual') || !!d.manualOrder;
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


    function draw(world, m, ui, now) {
      cur = { selected: ui.selected || null, hover: ui.hover || null };
      const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr) || cam.w !== w || cam.h !== h) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        if (!cam.user || cam.w === 0) fit();
        cam.w = w;
        cam.h = h;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const z = cam.zoom;
      const facs = facilitiesByTile(m);

      // 地面：由後往前
      const ground = [{ kind: 'gate', r: GATE.r, c: GATE.c }, ...world.tiles.map((t) => ({ kind: 'tile', t, r: t.row, c: t.col }))]
        .sort((a, b) => (a.r + a.c) - (b.r + b.c) || a.c - b.c);
      for (const g of ground) {
        if (g.kind === 'gate') drawGate(z, now);
        else drawTile(world, g.t, z, now, facs);
      }
      if (cur.selected) {
        const d = world.disciples.find((x) => x.id === cur.selected);
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
      // 同格多人錯開站位；有建築的格子，人站在前緣
      const OFFS = [[0.22, 0.22], [0.22, -0.18], [-0.12, 0.3], [0.35, 0.02]];
      const FRONT = [[0.5, -0.05], [-0.05, 0.5], [0.48, 0.48], [0.5, 0.22]];
      for (const d of joined) {
        const want = targetPos(world, d);
        const key = `${Math.round(want.r)},${Math.round(want.c)}`;
        const idx = byTile[key].indexOf(d.id);
        const shown = shownPos[d.id] || { r: want.r, c: want.c };
        shown.r += (want.r - shown.r) * 0.25;
        shown.c += (want.c - shown.c) * 0.25;
        shownPos[d.id] = shown;
        const rr = Math.round(want.r);
        const cc = Math.round(want.c);
        const built = (rr === DOJO.r && cc === DOJO.c) || m.facilities.some((f) => f.tileId === `t-${rr}-${cc}`);
        const o = (built ? FRONT : OFFS)[idx % OFFS.length];
        const sp = toScreen(iso(shown.r + o[0], shown.c + o[1]));
        items.push({ depth: shown.r + o[0] + shown.c + o[1] + 0.05, kind: 'person', d, sp });
      }
      items.sort((a, b) => a.depth - b.depth);
      const next = { people: [], buildings: [] };
      for (const it of items) {
        if (it.kind === 'dojo') {
          const r = drawDojo(z, now);
          next.buildings.push({ r: DOJO.r, c: DOJO.c, x0: r.x - TW / 2 * z * 0.8, x1: r.x + TW / 2 * z * 0.8, y0: r.top - 14 * z, y1: r.y + 6 * z, depth: it.depth });
        } else if (it.kind === 'facility') {
          const r = drawFacility(world, it.f, z, now);
          const p = toScreen(iso(it.r, it.c));
          next.buildings.push({ r: it.r, c: it.c, x0: p.x - TW / 2 * z * 0.7, x1: p.x + TW / 2 * z * 0.7, y0: r.top - 10 * z, y1: p.y + 6 * z, depth: it.depth });
        } else {
          const person = m.people.find((p) => p.id === it.d.id);
          drawPerson(world, it.d, person, it.sp, z, now);
          next.people.push({ id: it.d.id, x0: it.sp.x - 14 * z, x1: it.sp.x + 14 * z, y0: it.sp.y - 66 * z, y1: it.sp.y + 16 * z, depth: it.depth, sp: it.sp });
        }
      }
      hit = next;
      // 被建築擋住時，選取中與滑鼠下的人畫虛線輪廓，仍點得到
      for (const id of new Set([cur.selected, ui.hoverPerson || null])) {
        const hp = hit.people.find((p) => p.id === id);
        if (!hp) continue;
        const covered = hit.buildings.some((b) => b.depth > hp.depth && hp.sp.x > b.x0 && hp.sp.x < b.x1 && hp.sp.y - 20 * z > b.y0 && hp.sp.y - 20 * z < b.y1);
        if (covered) drawPerson(world, world.disciples.find((x) => x.id === id), null, hp.sp, z, now, { ghost: true });
      }
      drawFloaters(now, z);
    }

    function personScreen(id) {
      const hp = hit.people.find((p) => p.id === id);
      return hp ? { x: hp.sp.x, y: hp.sp.y - 70 * cam.zoom } : null;
    }

    function pulse(id, text, tone) {
      floaters.push({ id, text, color: TONES[tone] || '#fff', born: null });
    }

    function drawFloaters(now, z) {
      for (const f of floaters) if (f.born === null) f.born = now;
      floaters = floaters.filter((f) => now - f.born < FLOAT_MS);
      const perId = {};
      for (const f of floaters) {
        const at = f.id ? personScreen(f.id) : null;
        if (!at) continue;
        const k = (now - f.born) / FLOAT_MS;
        const stack = (perId[f.id] = (perId[f.id] || 0) + 1) - 1;
        ctx.globalAlpha = 1 - k * k;
        label(f.text, at.x, at.y - k * 26 * z - stack * 18 * z, z, { size: 12, bold: true, bg: 'rgba(30,20,10,.75)', color: f.color });
        ctx.globalAlpha = 1;
      }
    }

    // 點擊判定：人物優先（前面的先），再來建築外框，最後是地塊菱形。
    function hitTest(sx, sy) {
      const ppl = hit.people.filter((p) => sx >= p.x0 && sx <= p.x1 && sy >= p.y0 && sy <= p.y1).sort((a, b) => b.depth - a.depth);
      if (ppl.length) return { kind: 'person', id: ppl[0].id };
      const bld = hit.buildings.filter((b) => sx >= b.x0 && sx <= b.x1 && sy >= b.y0 && sy <= b.y1).sort((a, b) => b.depth - a.depth);
      if (bld.length) return { kind: 'place', key: `t-${bld[0].r}-${bld[0].c}` };
      const key = tileAt(sx, sy);
      return key ? { kind: 'place', key } : null;
    }

    function screenOf(key) {
      if (key === 'gate') return toScreen(iso(GATE.r, GATE.c));
      const m = /^t-(\d+)-(\d+)$/.exec(key);
      return m ? toScreen(iso(Number(m[1]), Number(m[2]))) : null;
    }

    function pan(dx, dy) {
      cam.x -= dx / cam.zoom;
      cam.y -= dy / cam.zoom;
      cam.user = true;
    }
    function zoomBy(f) {
      cam.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, cam.zoom * f));
      cam.user = true;
    }

    return Object.freeze({ draw, hitTest, screenOf, personScreen, pulse, fit, pan, zoomBy, get zoom() { return cam.zoom; } });
  }

  return Object.freeze({ createScene, colorOf, glyphOf, GLYPH });
});
