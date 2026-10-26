// M29 explicit appearance binding: actorId -> design rule -> pinned local asset. Appearance never changes identity, rights or rules.
import{pin}from'../assets/shared/pin-gpt-local.mjs';import{portraitFor,resolveAsset}from'../assets/shared/resolve.mjs';
// The pinned hero idle-0 crop fits only the self-created leader (no canonical look); classic templates and everyone else keep the text fallback.
export function appearanceFor(w,id){const p=w.people[id];if(!p)return null;if(id==='leader'&&w.template!=='custom')return{availability:'unsupported',url:null,crop:null,label:'經典範本掌門沒有核准的外觀，使用文字替代'};if(!['leader','child'].includes(id))return{availability:'unsupported',url:null,crop:null,label:'尚無此角色正式立繪'};
 const a=portraitFor(pin,'gpt',id);return{availability:a.availability,url:a.url,crop:a.crop,dimensions:a.dimensions||null,label:a.label,assetId:a.portraitAssetId,version:a.version||null,source:a.source||null};}
export const SCENERY=[{assetId:'scene.bamboo',at:[1640,1000]},{assetId:'scene.boulder.large',at:[900,1480]},{assetId:'scene.boulder.small',at:[860,1500]}].map(s=>({...s,asset:resolveAsset(pin,s.assetId)}));
