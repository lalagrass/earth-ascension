// Node-only release tooling; not part of the browser runtime or a publishing API.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {PUBLIC_KIT_VERSION,LEGACY_SOURCE_SHA,DATA_CONTRACTS} from '../version.mjs';
import {createConsumerReceipt} from '../receipt.mjs';
import {pin as gpt} from '../../assets/shared/pins/gpt.mjs';
import {pin as gemini} from '../../assets/shared/pins/gemini.mjs';
import {pin as grok} from '../../assets/shared/pins/grok.mjs';
export const root=fileURLToPath(new URL('../../',import.meta.url));
const manifestPath=`public-kit/releases/${PUBLIC_KIT_VERSION}.json`,digest=v=>createHash('sha256').update(v).digest('hex');
const pixi='experiments/water-carry/demo/vendor/pixi.min.mjs';
export const entries=['public-kit/index.mjs','public-kit/style.css'];
const pins={gpt,gemini,grok};
const safe=p=>typeof p==='string'&&!p.startsWith('/')&&!p.split('/').some(s=>s==='..'||!s)&&!/[?#\\]/.test(p);
export function dependencies(text,file) {
 if(file===pixi)return []; // Exact checked self-contained vendor bundle, license listed separately.
 const specs=[];
 if(file.endsWith('.css'))for(const m of text.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']/g))specs.push(m[1]);
 else {
  for(const m of text.matchAll(/(?:import|export)\s+(?:[^;]*?\sfrom\s*)?["']([^"']+)["']/g))specs.push(m[1]);
  for(const m of text.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g))specs.push(m[1]);
  if(/\bimport\(\s*[^\s"']/.test(text))throw Error(`Non-literal dynamic dependency: ${file}`);
 }
 return [...new Set(specs.map(s=>{if(!s.startsWith('.'))throw Error(`External dependency must be declared: ${file}: ${s}`);const p=path.posix.normalize(path.posix.join(path.posix.dirname(file),s));if(!safe(p))throw Error(`Dependency escapes kit: ${file}`);return p;}))].sort();
}
export async function closure(starts,read=p=>readFile(path.join(root,p))) {
 const found=new Map();
 async function visit(file) {
  if(found.has(file))return;
  if(!safe(file)||/(?:^|\/)(sources|checks|evidence|harness)(?:\/|$)/.test(file)||file.startsWith('experiments/')&&file!==pixi)throw Error(`Forbidden runtime dependency: ${file}`);
  const bytes=await read(file),imports=dependencies(bytes.toString(),file),record={path:file,bytes:bytes.length,sha256:digest(bytes),imports};found.set(file,record);
  for(const dep of imports)await visit(dep);
 }
 for(const p of starts)await visit(p);
 return [...found.values()].sort((a,b)=>a.path.localeCompare(b.path,'en'));
}
export async function buildManifest() {
 const runtime=await closure(entries),scene=await closure(['public-kit/scene.mjs']);
 const assetPacks={};
 for(const [id,pin] of Object.entries(pins)) {
  if(digest(JSON.stringify(pin.manifest))!==pin.expectedSha256)throw Error(`Changed asset pin: ${id}`);
  const pinPath=`assets/shared/pins/${id}.mjs`,source=await readFile(path.join(root,pinPath),'utf8');
  const manifestFile=dependencies(source,pinPath).find(p=>p.includes('/manifests/'));
  const files=[pinPath,manifestFile,'assets/shared/resolve.mjs'];
  for(const a of pin.manifest.assets.filter(a=>a.availability==='known')) {
   const p=a.path.replace(/^sect-chronicle\//,'');files.push(p);
   if(digest(await readFile(path.join(root,p)))!==a.sha256)throw Error(`Asset bytes changed: ${p}`);
   if(a.recipe.metadataPath){const m=a.recipe.metadataPath.replace(/^sect-chronicle\//,'');files.push(m);if(digest(await readFile(path.join(root,m)))!==a.recipe.metadataSha256)throw Error(`Atlas metadata changed: ${m}`);}
  }
  assetPacks[id]={pinPath,version:pin.manifest.version,manifestSha256:pin.expectedSha256,coreSha:pin.manifest.coreCommit,
   files:await Promise.all([...new Set(files)].sort().map(async p=>{const b=await readFile(path.join(root,p));return {path:p,sha256:digest(b),bytes:b.length};}))};
 }
 const adapters=['character-card/gpt.mjs','character-card/gemini.mjs','character-card/grok.mjs','character-card/portrait.mjs','character-card/profiles.mjs','martial-view/official.mjs','facility-view/official.mjs','facility-view/gpt.mjs','resource-view/official.mjs','resource-view/gpt.mjs','resource-view/grok.mjs','intent-view/official.mjs','intent-view/gpt.mjs','event-view/adapters.mjs','navigation-view/official.mjs','scene-shared/adapters/gpt.mjs','scene-shared/adapters/gemini.mjs','scene-shared/adapters/grok.mjs'];
 const payload={formatVersion:1,package:`public-kit@${PUBLIC_KIT_VERSION}`,legacyBase:LEGACY_SOURCE_SHA,contracts:DATA_CONTRACTS,
  publication:{receipt:'New reviewed PR head / accepted SHA in #375; legacyBase is not this release',sourceSha:'Supply exact new checkout SHA in consumer receipt; no self-referential SHA in content manifest'},
  runtime:{entries,files:runtime},optionalScene:{entries:['public-kit/scene.mjs'],files:scene,dependency:{name:'pixi.js',version:'8.14.0',path:pixi,license:'MIT',licensePath:'experiments/water-carry/demo/vendor/LICENSE'}},
  assetPacks,adapterExamples:await Promise.all(adapters.map(async p=>({path:p,sha256:digest(await readFile(path.join(root,p))),scope:'Reference only; core/host imports are NOT runtime dependencies'}))),
  developmentOnly:{hosts:['scene-shared/harness/','public-fix/checks/'],checks:['public-kit/checks/','test/'],evidence:['public-kit/evidence/'],fixedCoreManifests:['scene-shared/sources/gpt/manifest.json','scene-shared/sources/gemini/manifest.json','scene-shared/sources/grok/manifest.json']}};
 // License bytes are part of the optional dependency closure, not a runtime import.
 const license=await readFile(path.join(root,payload.optionalScene.dependency.licensePath));
 payload.optionalScene.license={path:payload.optionalScene.dependency.licensePath,sha256:digest(license),bytes:license.length};
 return {...payload,contentSha256:digest(JSON.stringify(payload))};
}
export async function checkManifest(manifest,read=p=>readFile(path.join(root,p))) {
 if(manifest.formatVersion!==1||manifest.package!==`public-kit@${PUBLIC_KIT_VERSION}`)throw Error('Unsupported package/manifest version');
 const {contentSha256,...payload}=manifest;if(digest(JSON.stringify(payload))!==contentSha256)throw Error('Release manifest summary mismatch');
 for(const group of [manifest.runtime,manifest.optionalScene]) {
  const actual=await closure(group.entries,read);if(JSON.stringify(actual)!==JSON.stringify(group.files))throw Error('Runtime dependency closure/hash mismatch');
 }
 for(const f of [manifest.optionalScene.license,...manifest.adapterExamples,...Object.values(manifest.assetPacks).flatMap(p=>p.files)])if(!safe(f.path)||digest(await read(f.path))!==f.sha256)throw Error(`Missing/changed selected content: ${f.path}`);
 return {package:manifest.package,contentSha256,runtimeFiles:manifest.runtime.files.length,optionalSceneFiles:manifest.optionalScene.files.length};
}
export async function receiptAt(sourceSha,asset,adapterId,coreSha) {
 if(sourceSha===LEGACY_SOURCE_SHA)throw Error('Legacy source is not public-kit@1.0.0');
 if(!/^[a-f0-9]{40}$/.test(sourceSha||'')||!/^[a-f0-9]{40}$/.test(coreSha||'')||!adapterId)throw Error('Full source SHA required');
 const fromGit=p=>execFileSync('git',['show',`${sourceSha}:sect-chronicle/${p}`],{cwd:root,maxBuffer:32*1024*1024});
 const bytes=fromGit(manifestPath),manifest=JSON.parse(bytes);
 await checkManifest(manifest,async p=>fromGit(p));
 const pin=manifest.assetPacks[asset];if(!pin)throw Error('Choose an explicit known asset pack');
 return createConsumerReceipt({sourceSha,manifestSha256:digest(bytes),assetPin:{path:pin.pinPath,version:pin.version,manifestSha256:pin.manifestSha256},adapter:{id:adapterId,sourceSha,coreSha}});
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
 const [action,...args]=process.argv.slice(2);
 if(action==='build'){if(args[0]!=='--candidate')throw Error('Only explicit candidate builds are allowed; never rewrite accepted content');const m=await buildManifest();await writeFile(path.join(root,manifestPath),JSON.stringify(m,null,2)+'\n');console.log(JSON.stringify(await checkManifest(m)));}
 else if(action==='verify'){const m=JSON.parse(await readFile(path.join(root,manifestPath)));console.log(JSON.stringify(await checkManifest(m)));}
 else if(action==='receipt')console.log(JSON.stringify(await receiptAt(args[0],args[1],args[2],args[3]),null,2));
 else throw Error('Usage: release.mjs build --candidate | verify | receipt FULL_NEW_SHA gpt|gemini|grok ADAPTER_ID FULL_CORE_SHA');
}
