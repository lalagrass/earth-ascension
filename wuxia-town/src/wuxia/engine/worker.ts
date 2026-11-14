// 武俠小鎮 A1：瀏覽器的單機引擎 Web Worker。引擎本體是 core.ts（＝無頭模擬同一份 Session），
// 這裡只負責計時：每 16ms 呼叫 core.frame(實際經過毫秒)，把狀態送回畫面。不連任何後端、不打 LLM。
import { LocalCore } from './core';
import type { FromWorker, ToWorker } from './protocol';

const core = new LocalCore();
let ready = false;
let crashNext = false;
let last = performance.now(); // 只在計時用（倍速），不進引擎
const post = (m: FromWorker) => (self as unknown as Worker).postMessage(m);

function loop() {
  const t = performance.now();
  const dt = Math.min(250, t - last);
  last = t;
  if (ready) {
    try {
      if (crashNext) {
        crashNext = false;
        throw new Error('測試用：引擎在這一格當掉');
      }
      const out = core.frame(dt);
      for (const r of out.inputResults) post({ t: 'reply', id: r.token, value: r.value });
      if (out.view) post({ t: 'view', view: out.view, events: out.events });
      if (out.newDay !== undefined) post({ t: 'newDay', day: out.newDay });
    } catch (e) {
      ready = false;
      post({ t: 'error', message: (e as Error).stack ?? String(e) });
    }
  }
  setTimeout(loop, 16);
}

self.onmessage = (e: MessageEvent<ToWorker>) => {
  const m = e.data;
  try {
    switch (m.t) {
      case 'init': {
        const r = core.init(m.init);
        ready = r.ok;
        post({ t: 'reply', id: m.id, value: r });
        break;
      }
      case 'speed':
        core.setSpeed(m.speed);
        break;
      case 'autoSlow':
        core.autoSlow = m.on;
        break;
      case 'skip':
        core.skipTo(m.kind);
        break;
      case 'cancelSkip':
        core.cancelSkip();
        break;
      case 'input':
        core.input(m.name, m.args, m.id);
        break;
      case 'save':
        post({ t: 'reply', id: m.id, value: core.save(m.label) });
        break;
      case 'hash':
        post({ t: 'reply', id: m.id, value: { hash: core.hash(), steps: core.session.k, gameMinute: core.session.gameMinute(), skipping: core.skipping } });
        break;
      case 'advance': {
        const out = core.advance(m.steps);
        if (out.view) post({ t: 'view', view: out.view, events: out.events });
        post({ t: 'reply', id: m.id, value: { hash: core.hash(), steps: core.session.k, gameMinute: core.session.gameMinute(), skipping: core.skipping } });
        break;
      }
      case 'resend':
        core.resendDescriptions();
        break;
      case 'crashForTest':
        crashNext = true;
        break;
    }
  } catch (err) {
    post({ t: 'error', message: (err as Error).stack ?? String(err) });
  }
};
loop();
