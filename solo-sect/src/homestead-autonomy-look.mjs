import{validHomeLook}from'./homestead-look.mjs';
export const LOOK_OWNERS=['unclaimed','resident','player','preserved'];
export const RESIDENT_LOOKS={quiet:{style:'moss',name:'苔蔭小居'},sociable:{style:'ochre',name:'晴窗小屋'},diligent:{style:'natural',name:'勤耕小屋'}};
export function applyResidentLook(s){if(!s.autonomy||s.autonomy.lookOwnership!=='unclaimed'||!s.fac.hut.stage)return false;const look=RESIDENT_LOOKS[s.person.personality];if(!validHomeLook(look))return false;s.look={...look};s.autonomy.lookOwnership='resident';return true;}
