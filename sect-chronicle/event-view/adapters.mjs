import { gptJournalVisible } from '../scene-shared/adapters/gpt-visibility.mjs';
import { eventView } from './contract.mjs';
// Provenance pins only: loading this presentation never imports another engine.
export const GPT_SHA = '6cbd3e6fccb8bc376e95e2f406ce6cead2a30fdc';
export const GROK_SHA = '6760f21c342cbf72fc9fb4baf0aec8655abd0dd2';
export const GEMINI_SHA = 'bae43412dced2a2f0d9d82008d5cdf8b3acfb8f9';
export const OFFICIAL_EVENT_SHA = '67b49e3a078ea491432a9ff22de48400019fc57e';
const jobs = { water: ['挑水','vat'], herb: ['採藥','rack'], wood: ['砍柴',null] };
const values = (e, keys) => Object.fromEntries(keys.filter(k => e[k] != null && ['string','number','boolean'].includes(typeof e[k])).map(k => [k,e[k]]));
// An append stream retains one offset; native rings retain at most their native
// window of references. IDs count original records at each original timestamp.
// No raw history is copied and no core record is removed or modified.
function reader() {
  let streams = new Map();
  return {
    reset() { streams = new Map(); },
    read(name, records, { ring = false, reverse = false, time = e => e.tick } = {}) {
      let s = streams.get(name);
      if (!s) { s = { offset: 0, previous: new Set(), tick: null, ordinal: 0, sequence: 0 }; streams.set(name,s); }
      const ordered = reverse ? [...records].reverse() : records;
      const added = ring ? ordered.filter(e => !s.previous.has(e)) : ordered.slice(s.offset);
      s.offset = records.length;
      if (ring) s.previous = new Set(records);
      return added.map(record => {
        const tick = time(record);
        if (tick !== s.tick) { s.tick = tick; s.ordinal = 0; }
        return { record, sequence: ++s.sequence, adapterId: `${name}:${tick}:${++s.ordinal}` };
      });
    },
  };
}
function officialProjection(e, stream) {
  const job = jobs[e.job], kind = e.kind;
  const training = stream === 'train01' || kind?.startsWith('palm:');
  const category = training ? 'martial' : job || ['trip','start','switch'].includes(kind) ? 'work' : 'life';
  let action = training ? 'basic-palm:first' : e.job || (stream === 'tea' ? 'tea' : stream === 'home02' ? 'home02' : kind);
  let facility = job?.[1] || null;
  const label = ({ trip:`完成一趟${job?.[0] || '工作'}`, start:`開始${job?.[0] || '工作'}`, switch:`改派${job?.[0] || '工作'}`, rest:'停工', recall:'玩家叫回', resume:'恢復自主', 'palm:skill':'掌法熟練變化', 'palm:hit':'原核心命中', 'palm:miss':'原核心未命中', 'unit':'完成練掌單位', adept:'練掌達熟練', 'goal:on':'已接受練掌目標', 'goal:off':'練掌目標取消', 'unit:drop':'未完成單位捨棄', go:'走去練功樁' })[kind] || kind;
  return { kind, actors: [e.person, e.with].filter(Boolean), facility, action, category,
    result: { text: e.text || label, ...values(e,['job','trips','level','grew','skill','units','steps','downs','vat','rest','src']) },
    // Event-local evidence only: never consult current person state or a neighbor.
    reason: e.why || (kind === 'note' ? e.text : null) };
}
export function createOfficialEventAdapter({ getModel, fixed = false }) {
  const source = fixed ? `gemini:${GEMINI_SHA}` : `dev:${OFFICIAL_EVENT_SHA}:gemini-derived`;
  const r = reader(); let model = null, tick = -1, epoch = 0;
  const reset = () => { r.reset(); model = getModel(); tick = -1; epoch++; };
  return { reset, snapshot() {
    const m = getModel();
    if (m !== model || m.state.tick < tick) reset();
    tick = m.state.tick;
    const streams = [['log',m.state.log,false], ['tea',m.tea?.state.events || [],true], ['home02',m.home02?.state.events || [],true], ['train01',m.train01?.state.log || [],true], ['life02',m.life02?.state.log || [],true]];
    const events = streams.flatMap(([stream,records,ring]) => r.read(stream,records,{ring}).map(({record:e,adapterId,sequence}) => eventView({ ...officialProjection(e,stream), sequence, id:`${source}:${epoch}:${adapterId}`, source,stream,tick:e.tick,unit:'60Hz tick（1/60 遊戲秒）' })));
    events.sort((a,b) => a.tick-b.tick); // Stable ties have no causal meaning.
    return { source,epoch,events };
  } };
}
export function createGrokEventAdapter({ getState }) {
  const source = `grok:${GROK_SHA}`, r = reader(); let state = null, tick = -1, epoch = 0;
  const reset = () => { r.reset(); state = getState(); tick = -1; epoch++; };
  return { reset, snapshot() {
    const s = getState(); if (s !== state || s.t < tick) reset(); tick=s.t;
    const events=r.read('log',s.log,{ring:true,reverse:true,time:e=>e.t}).map(({record:e,adapterId,sequence}) => eventView({sequence,id:`${source}:${epoch}:${adapterId}`,source,stream:'log',tick:e.t,unit:'原生整秒（floor(t)）',kind:'log',actors:e.who?[e.who]:[],result:e.msg,
      // Native public log carries no structured facility/action/cause.
      category:'life',reason:null,visibility:e.visibility==='hidden'?'hidden':'known'}));
    return {source,epoch,events};
  } };
}
export function createGPTEventAdapter({ getWorld }) {
  const source=`gpt:${GPT_SHA}`,r=reader();let world=null,tick=-1,epoch=0;
  const reset=()=>{r.reset();world=getWorld();tick=-1;epoch++;};
  return {reset,snapshot(){
    const w=getWorld();if(w!==world||w.tick<tick)reset();tick=w.tick;
    const events=r.read('journal',w.journal,{ring:true}).map(({record:e,sequence})=>{
      // The native journal is not a historical visibility journal. Conservatively
      // mask wild/cave/departed/missing actors, even if one can be seen now.
      const visible=gptJournalVisible(w,e);
      const martial=!!(e.art||e.move), supported=['activity-complete','growth','harvest','building-complete','returned','temporary-return','temporary-blocked','culture-cancelled','command'].includes(e.type);
      return eventView({sequence,id:`${source}:${epoch}:${e.id}`,source,stream:'journal',tick:e.tick,unit:'20Hz tick（1/20 遊戲秒）',kind:e.type,actors:e.actors,facility:e.facility||null,
        action:e.art||e.move||e.kind||null,category:martial?'martial':e.type==='activity-complete'||e.type==='harvest'?'work':'life',
        result:supported?{type:e.type,...values(e,['kind','units','art','U','F','I','item','n','stage','returnTo'])}:null,
        reason:supported?e.reason||null:null,visibility:visible?'known':'hidden'});
    });return{source,epoch,events};
  }};
}
