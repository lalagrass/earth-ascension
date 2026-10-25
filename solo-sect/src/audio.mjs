// v0.98 最小音效：全部用 WebAudio 即時合成，不含任何外部音檔
let ctx = null, master = null, amb = null, muted = typeof localStorage !== 'undefined' && globalThis.localStorage?.getItem?.('solo-sect-mute') === '1', lastHit = 0;
function ac() { if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ctx.destination); } if (ctx.state === 'suspended') ctx.resume(); return ctx; }
function tone(f, dur, { type = 'sine', vol = 0.3, slide = 0, delay = 0 } = {}) {
  const c = ac(), t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, { vol = 0.3, freq = 800, delay = 0 } = {}) {
  const c = ac(), t = c.currentTime + delay, b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = b; f.type = 'bandpass'; f.frequency.value = freq; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(master); s.start(t);
}
export const SFX = {
  click: () => tone(660, 0.06, { type: 'triangle', vol: 0.15 }),
  hit: () => { const n = performance.now(); if (n - lastHit < 120) return; lastHit = n; noise(0.12, { vol: 0.35, freq: 500 }); tone(140, 0.12, { type: 'square', vol: 0.08, slide: -60 }); },
  breakthrough: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5, { type: 'sine', vol: 0.18, delay: i * 0.09 })); noise(0.8, { vol: 0.08, freq: 3000, delay: 0.3 }); },
  record: () => { [392, 523, 659, 784, 659, 784].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.2, delay: i * 0.12 })); },
  unlock: () => { tone(880, 0.15, { vol: 0.15 }); tone(1320, 0.25, { vol: 0.12, delay: 0.1 }); },
  chapter: () => { [262, 330, 392, 523, 392, 523, 659].forEach((f, i) => tone(f, 0.45, { type: 'triangle', vol: 0.2, delay: i * 0.16 })); },
};
// 環境音：濾波噪音當風聲＋偶爾鳥鳴
export function ambient(on = true) {
  if (!on) { if (amb) { amb.stop(); amb = null; } return; } if (amb) return; const c = ac();
  const b = c.createBuffer(1, c.sampleRate * 4, c.sampleRate), d = b.getChannelData(0); let last = 0; for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3; }
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = b; s.loop = true; f.type = 'lowpass'; f.frequency.value = 400; g.gain.value = 0.25; s.connect(f); f.connect(g); g.connect(master); s.start();
  const bird = setInterval(() => { if (!muted && Math.random() < 0.5) { tone(2400, 0.08, { vol: 0.05, slide: 600 }); tone(2800, 0.08, { vol: 0.05, slide: -500, delay: 0.12 }); } }, 7000);
  amb = { stop: () => { s.stop(); clearInterval(bird); } };
}
export function setMute(v) { muted = v; localStorage.setItem('solo-sect-mute', v ? '1' : '0'); if (master) master.gain.value = v ? 0 : 0.5; }
export const isMuted = () => muted;
// 從模擬狀態推出這一幀要播的音效（純函式，方便測）
export function cuesFrom(prev, s) {
  const out = []; if (s.fx.some((f) => f.kind === 'move' && f.ttl > 0.55)) out.push('hit');
  const k = prev.logTop ? s.log.indexOf(prev.logTop) : 0, msgs = s.log.slice(0, k < 0 ? s.log.length : k).map((l) => l.msg);
  if (msgs.some((m) => /衝關成功|踏入|覺醒/.test(m))) out.push('breakthrough');
  if (msgs.some((m) => /新紀錄/.test(m))) out.push('record');
  if (msgs.some((m) => /【新面板】/.test(m))) out.push('unlock');
  if (msgs.some((m) => /【第一章/.test(m))) out.push('chapter');
  prev.logTop = s.log[0]; return out;
}
