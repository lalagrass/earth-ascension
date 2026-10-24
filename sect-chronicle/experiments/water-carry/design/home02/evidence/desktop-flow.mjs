// HOME-02 桌面單流程（CDP＋headless Chrome＋一個靜態服務，finally 全清）：砍柴→扛料修寢舍（前／中／後）→床牌→躺下→起身。
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const ROOT = process.env.ROOT || '/workspace/ea330/sect-chronicle', OUT = process.env.OUT || '/tmp/s330', PORT = 8931;
const URL = `http://127.0.0.1:${PORT}/experiments/water-carry/demo/index.html`;
const procs = []; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0; const pend = new Map(); const errs = [];
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); return r.result?.result?.value; };
const shot = async (n) => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.result.data, 'base64')); console.log('shot', n); };
const click = (sel) => ev(`(()=>{const b=document.querySelector(${JSON.stringify(sel)});if(!b)return 'missing';if(b.disabled)return 'disabled';b.click();return 'ok'})()`);
const snap = (expr) => ev(`(()=>{const s=window.demo.snapshot();return JSON.stringify(${expr})})()`);
const waitFor = async (expr, sec = 120) => { for (let i = 0; i < sec * 4; i++) { if (await ev(`(()=>{const s=window.demo.snapshot();return !!(${expr})})()`)) return true; await sleep(250); } return false; };
try {
  procs.push(spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' }));
  procs.push(spawn('google-chrome', ['--headless=new', '--no-sandbox', '--remote-debugging-port=9333', '--window-size=1440,900', `--user-data-dir=${OUT}/prof`, 'about:blank'], { stdio: 'ignore' }));
  await sleep(2500);
  const tabs = await (await fetch('http://127.0.0.1:9333/json')).json();
  ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); }
    if (d.method === 'Runtime.exceptionThrown') errs.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push(d.params.args.map((a) => a.value || a.description).join(' ')); };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: URL }); await sleep(6000);
  console.log('start', await snap('{tick:s.tick,h2:s.home02.site,wood:s.home02.wood}'));
  await click('[data-view=dorm]'); await sleep(900); await shot('01-dorm-broken');
  // 兩人都去砍柴
  for (const who of ['hero', 'cousin']) { await ev(`document.querySelector('[data-person=${who}]').click()`); await sleep(200); console.log('wood', who, await click('[data-cmd="work:wood"]')); }
  await click('[data-speed="4"]');
  await waitFor(`s.h2.hero.phase==='woodChop'`, 60); await click('[data-view=woods]'); await sleep(700); await shot('02-chop');
  await waitFor(`s.h2.hero.bundle||s.h2.cousin.bundle`, 60); await sleep(300); await shot('03-haul-wood');
  const okWood = await waitFor('s.home02.wood>=6', 240);
  console.log('wood>=6', okWood, await snap('s.home02.wood'));
  // 主角修寢舍、熟手繼續砍柴
  await ev(`document.querySelector('[data-person=hero]').click()`); await sleep(200);
  console.log('build', await click('[data-cmd=build]'));
  await click('[data-view=dorm]');
  await waitFor(`s.h2.hero.mode==='toSite'&&s.h2.hero.bundle`, 60); await sleep(400); await shot('04-carry-to-site');
  await waitFor(`s.h2.hero.mode==='build'&&s.home02.site.work>=6`, 120); await shot('05-dorm-building');
  console.log('done', await waitFor(`s.home02.site.stage==='done'`, 180), await snap('s.home02.site'));
  await sleep(600); await shot('06-dorm-done');
  // 床牌：把 bed-2 給熟手（不推 tick）
  await click('#play'); await sleep(300);
  const t0 = await ev('window.demo.snapshot().tick');
  console.log('assign', await click('[data-bed="bed-2"][data-owner="cousin"]'));
  const t1 = await ev('window.demo.snapshot().tick');
  console.log('assign ticks', t0, t1, await snap('s.home02.beds'));
  await shot('07-bed-card');
  await click('#play');
  // 主角停工→走去自己的床（認領 bed-1）躺下
  console.log('rest', await click('[data-cmd=restAfterTrip]'));
  console.log('lie', await waitFor(`s.h2.hero.mode==='seated'&&s.h2.hero.bed&&s.h2.hero.quilt`, 60), await snap('s.h2.hero'));
  await sleep(500); await shot('08-lie-down');
  console.log('getup cmd', await click('[data-cmd="work:water"]'));
  console.log('back', await waitFor(`s.h2.hero.mode==='back'`, 60)); await sleep(150); await shot('09-get-up');
  console.log('final', await snap('{beds:s.home02.beds,stage:s.home02.site.stage,wood:s.home02.wood}'));
  console.log('errors', JSON.stringify(errs));
} finally { try { ws?.close(); } catch {} for (const p of procs) { try { p.kill('SIGKILL'); } catch {} } }
process.exit(0);
