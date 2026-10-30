// Appearance has no resource/stat/position effect. New autonomous games retain
// explicit player ownership and stop an unfinished automatic appearance choice.
export const HOME_STYLES = Object.freeze({
 natural: Object.freeze({name:'原木',roof:['#68553a','#855c47'],trim:'#d0b685'}),
 moss: Object.freeze({name:'苔綠',roof:['#405e49','#405e49'],trim:'#a8b899'}),
 ochre: Object.freeze({name:'赭紅',roof:['#a34e37','#a34e37'],trim:'#e1b97b'}),
});
export const defaultHomeLook=()=>({style:'natural',name:''});
export function normalizeHomeName(value){
 if(typeof value!=='string'||/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(value))return null;
 const name=value.normalize('NFC').trim();
 return Array.from(name).length<=12&&(!name||/^[\p{L}\p{N}][\p{L}\p{M}\p{N} ·・－-]*$/u.test(name))?name:null;
}
export function validHomeLook(v){return !!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===2&&Object.hasOwn(v,'style')&&Object.hasOwn(v,'name')&&typeof v.name==='string'&&normalizeHomeName(v.name)===v.name&&typeof v.style==='string'&&Object.hasOwn(HOME_STYLES,v.style);}
export function homeLook(s,preview){return s.mode==='solo'&&validHomeLook(preview??s.look)?(preview??s.look):defaultHomeLook();}
export function setHomeLook(s,v){if(s.mode!=='solo'||!s.fac.hut.stage||!validHomeLook(v))return false;s.look={...v};if(s.autonomy){s.autonomy.lookOwnership='player';if(s.person.task?.act==='settle')s.person.task=null;}return true;}
