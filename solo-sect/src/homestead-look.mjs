// Purely cosmetic: no simulation, resources, activity or position rules live here.
export const HOME_STYLES = Object.freeze({
 natural: Object.freeze({name:'原木',roof:['#68553a','#855c47'],trim:'#d0b685'}),
 moss: Object.freeze({name:'苔綠',roof:['#405e49','#405e49'],trim:'#a8b899'}),
 ochre: Object.freeze({name:'赭紅',roof:['#a34e37','#a34e37'],trim:'#e1b97b'}),
});
export const defaultHomeLook=()=>({style:'natural'});
export function validHomeLook(v){return !!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===1&&typeof v.style==='string'&&Object.hasOwn(HOME_STYLES,v.style);}
export function homeLook(s,preview){return s.mode==='solo'&&validHomeLook(preview??s.look)?(preview??s.look):defaultHomeLook();}
export function setHomeLook(s,v){if(s.mode!=='solo'||!s.fac.hut.stage||!validHomeLook(v))return false;s.look={...v};return true;}
