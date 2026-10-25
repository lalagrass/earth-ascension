import {VERSION} from './data.mjs';
import {invariants} from './state.mjs';
export const PREFIX='solo-sect-gpt.chapter1.v1.';
export function canonical(value){if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';}
export async function hash(value){const bytes=new TextEncoder().encode(canonical(value)),sum=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(sum)].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function encode(world){return JSON.stringify({format:'solo-sect-gpt',...VERSION,savedAt:new Date().toISOString(),payload:world,checksum:await hash(world)});}
export async function decode(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>8*1024*1024)throw Error('檔案超過8MiB或格式不符');
 const x=JSON.parse(text,(key,v)=>{if(['__proto__','constructor','prototype'].includes(key))throw Error('不允許的欄位');if(typeof v==='number'&&!Number.isFinite(v))throw Error('非有限數');return v;});
 if(x.format!=='solo-sect-gpt')throw Error('非本遊戲存檔');for(const k of Object.keys(VERSION))if(x[k]!==VERSION[k])throw Error('不支援的版本：'+k);
 if(!x.payload||x.checksum!==await hash(x.payload))throw Error('校驗碼不符，原存檔已保留');
 const w=x.payload;for(const k of Object.keys(VERSION))if(w[k]!==VERSION[k])throw Error('內容版本不符');
 if(!Number.isSafeInteger(w.tick)||w.tick<0||!Number.isSafeInteger(w.nextId)||w.nextId<1||!w.people?.leader)throw Error('世界欄位不合法');
 const e=invariants(w);if(e.length)throw Error('存檔事實不合法：'+e.slice(0,3).join('、'));
 for(const p of Object.values(w.people)){if(!w.inventories[p.bag])throw Error('缺人物包裹');if(p.bed&&!Object.keys(w.people).length)throw Error('床引用失效');}
 for(const r of Object.values(w.reservations)){const a=w.activities[r.activity];if(!a||a.actor!==r.actor||!w.people[r.actor]||!Number.isSafeInteger(r.n)||r.n<1)throw Error('預約失效');}
 return w;
}
export async function safeWrite(storage,key,world){const text=await encode(world),temp=PREFIX+'pending';
 try{storage.setItem(temp,text);const check=storage.getItem(temp);if(check!==text)throw Error('暫存重讀失敗');await decode(check);storage.setItem(key,text);storage.removeItem(temp);}catch(e){try{storage.removeItem(temp);}catch{}throw Error('保存失敗：'+e.message);}return text;}
