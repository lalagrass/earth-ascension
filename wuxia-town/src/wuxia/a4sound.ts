// 武俠小鎮 A4（#576 第 5 節，選配）：短音效用 WebAudio 當場合成（沒有音檔、不用外部素材）。瀏覽器不支援或使用者關掉就不響。
let ctx: AudioContext | undefined;
let muted = false;
export function setMuted(m: boolean) {
  muted = m;
}
export function isMuted() {
  return muted;
}
/** 依序響幾個音（頻率 Hz，每個 ms 毫秒），像敲木魚／磬 */
export function chime(freqs: number[], ms = 180, gain = 0.08) {
  if (muted || typeof window === 'undefined') return;
  try {
    const AC = (window as any).AudioContext ?? (window as any).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC() as AudioContext;
    const c = ctx!;
    let t = c.currentTime;
    for (const f of freqs) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000 + 0.25);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + ms / 1000 + 0.3);
      t += ms / 1000;
    }
  } catch {
    /* 沒有聲音也能玩 */
  }
}
export const SOUND = {
  fate: () => chime([523, 659], 120, 0.05),
  goal: () => chime([392, 523, 659, 784], 200, 0.08),
  settle: () => chime([262, 392, 523], 320, 0.08),
};
