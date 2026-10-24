import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const ROOT='/workspace/ea309/sect-chronicle', PORT=8931, URL=`http://127.0.0.1:${PORT}/experiments/water-carry/demo/index.html`;
const procs=[]; const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let ws, id=0; const pend=new Map(); const errs=[];
const send=(method,params={})=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params}));});
const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true});return r.result?.result?.value;};
const shot=async n=>{const r=await send('Page.captureScreenshot',{format:'png'});writeFileSync(`/tmp/s309/${n}.png`,Buffer.from(r.result.data,'base64'));console.log('shot',n);};
const click=sel=>ev(`(()=>{const b=document.querySelector(${JSON.stringify(sel)});if(!b)return 'missing';if(b.disabled)return 'disabled';b.click();return 'ok'})()`);
try{
 procs.push(spawn('python3',['-m','http.server',String(PORT),'--bind','127.0.0.1'],{cwd:ROOT,stdio:'ignore'}));
 procs.push(spawn('google-chrome',['--headless=new','--no-sandbox','--remote-debugging-port=9333','--window-size=1440,900','--user-data-dir=/tmp/s309/prof','about:blank'],{stdio:'ignore'}));
 await sleep(2500);
 const tabs=await (await fetch('http://127.0.0.1:9333/json')).json();
 ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise(r=>ws.onopen=r);
 ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id&&pend.has(d.id)){pend.get(d.id)(d);pend.delete(d.id);}
  if(d.method==='Runtime.exceptionThrown')errs.push(d.params.exceptionDetails.exception?.description||d.params.exceptionDetails.text);
  if(d.method==='Runtime.consoleAPICalled'&&d.params.type==='error')errs.push(d.params.args.map(a=>a.value||a.description).join(' '));};
 await send('Runtime.enable'); await send('Page.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:URL}); await sleep(6000);
 console.log('snap',await ev(`JSON.stringify((({tick,herbs,vat,mode})=>({tick,herbs,vat,mode}))(window.demo.snapshot()))`));
 await shot('01-overview');
 console.log('cmds',await ev(`(()=>{document.querySelector('[data-person=cousin]')?.click();return [...document.querySelectorAll('[data-cmd]')].map(b=>b.dataset.cmd+(b.disabled?'(x)':'')).join(',')})()`));
 console.log('herb',await click('[data-cmd="work:herb"]'));
 await click('[data-speed="4"]');
 for(let i=0;i<60;i++){await sleep(1000);const h=await ev('window.demo.snapshot().herbs');if(h>=1)break;}
 console.log('herbs',await ev('window.demo.snapshot().herbs'));
 await ev(`document.querySelector('[data-person=hero]').click()`);
 await sleep(800); await shot('02-work-life');
 console.log('tea',await click('[data-cmd=tea]'));
 for(let i=0;i<40;i++){await sleep(500);const m=await ev('window.demo.snapshot().mode');if(m==='brew'||m==='sip')break;}
 console.log('mode',await ev('window.demo.snapshot().mode'));
 await click('[data-view=yard]'); await sleep(700); await shot('03-tea-brew');
 for(let i=0;i<40;i++){await sleep(500);if(await ev('window.demo.snapshot().mode')==='sip')break;}
 await shot('04-tea-sip');
 const t0=await ev('window.demo.snapshot().tick');
 await click('#play'); await sleep(300);
 const pre=await ev('window.demo.snapshot().tick');
 console.log('tab',await click('[data-tab=martial]')); await sleep(600); await shot('05-martial');
 console.log('tab back',await click('[data-tab=life]'));
 console.log('ticks',t0,pre,await ev('window.demo.snapshot().tick'),'playing',await ev('window.demo.snapshot().playing'));
 await click('[data-cmd=toggleEvents]'); await sleep(400); await shot('06-life-events');
 await click('#play');console.log('errors',JSON.stringify(errs));
}finally{try{ws?.close()}catch{} for(const p of procs){try{p.kill('SIGKILL')}catch{}}}
process.exit(0);
