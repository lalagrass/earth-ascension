// N35 招式資料；與實戰熟練邏輯分離，避免 data/practice 的模組循環。
import {BODY_MOVES} from './starter-combat.mjs';
export const TECHNIQUES=[
 {id:'disarm',name:'奪械',reason:'空手接到兵器起手的空檔',base:'bodyGrab',parents:['guard','push','grapple'],conditions:['hands','opponentWeapon','opponentWind'],difficulty:72,effects:['interrupt','disarm']},
 {id:'flankStrike',name:'側身打肋',reason:'閃過衝撞後看見側肋',base:'bodyKick',parents:['leg','staff'],conditions:['afterDodge','opponentCharge'],difficulty:72,effects:['armorBypass','interrupt']},
 {id:'staffSweep',name:'掃',reason:'被多人圍住時橫掃空隙',base:'toolStaff',parents:['staff'],conditions:['surrounded'],difficulty:72,effects:['area'],area:65},
 {id:'bodyThrow',name:'摔',reason:'抓住對手失衡的瞬間',base:'bodyPush',parents:['push','grapple'],conditions:['hands','opponentUnbalanced'],difficulty:72,effects:['knockdown']},
 {id:'dustCast',name:'撒土',reason:'敗勢中被逼到角落仍要脫身',base:'toolStone',parents:['pickup','stone','guard'],conditions:['hands','losing','cornered'],difficulty:96,effects:['blind','dishonor'],medium:'irritant',noTool:true},
 {id:'stoneOpening',name:'擲石開場',reason:'對手逼近時先出手試探',base:'toolStone',parents:['stone'],conditions:['approaching'],difficulty:48,effects:['interrupt','lure']},
];
export const TECHNIQUE_MOVES=TECHNIQUES.map(row=>{const base=BODY_MOVES.find(m=>m.id===row.base);return {...base,id:row.id,name:row.name,technique:true,medium:row.medium||base.medium,aoe:row.area||0,aoeCenter:row.area?'actor':undefined,...(row.noTool?{tool:null,consumable:false}:{}),effectWords:row.effects};});
