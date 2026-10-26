// M16 situational tips: read-only; a tip is ticked only by what the player really did.
export function guideTips(w){const ordered=!!w.opsPlan&&w.commands.some(c=>c.type==='build'&&c.result?.ok&&c.tick>=w.opsPlan.adoptedAt),site=Object.values(w.facilities).some(f=>f.active)||ordered,bond=w.mentorPlan?.bonds.find(b=>b.status==='active'&&(b.events['mentor.direction-set']&&b.direction?.state!=='unreachable'||b.directionHistory?.some(h=>h.events['mentor.direction-set']))),pack=w.contentState?.packs.some(p=>p.id==='advanced'),studied=Object.values(w.people).some(p=>p.contentMoves?.some(m=>m.startsWith('advanced.'))),drill=w.jointDrill?.history.length>0;
 return[{id:'ops',title:'先看這段時間該修屋、備糧還是修行',text:'經營頁採用經營簿，看方針卡「此刻」一行；再到建設頁下令一處工地，修屋才有用（工地完工後仍記為已做到）。',done:!!w.opsPlan&&site,tab:'ops'},
  {id:'disciple',title:'帶一名普通同門成為弟子',text:'先真的指點、交談，再在人物頁師徒分組提出拜師；弟子本人答應後，向他提出練功方向。',done:!!bond,tab:'people'},
  {id:'move',title:'學一招看得出差別的招式',text:'內容頁預覽並安裝「進階三式」，選一位前置已足的門人到靜室研讀，再設為交手偏好、切磋試試。',done:!!pack&&studied,tab:'content'},
  {id:'drill',title:'一起守住外功場前線',text:'遠征頁採用聯合演練，替最多三人選前攔或守線，開始後看回顧裡誰做了什麼。守線的人要先在附近。',done:drill,tab:'travel'}];}
