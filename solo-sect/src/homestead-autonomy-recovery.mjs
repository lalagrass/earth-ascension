import{at,restRate}from'./homestead-living.mjs';
export function recoveryChoice(s){
 const a=s.autonomy,p=s.person;if(!a||a.deferred.includes('herbs')||p.energy<23||p.energy>55||p.careDay===s.day||s.stock.herbs<1||!at(p,[445,345]))return null;
 if((a.goal==='herbs'||s.fac.herbGarden.stage>0)&&!a.herbHarvests&&s.herbPlot.state==='empty'&&s.stock.herbs<=1)return null;
 const sleepTime=120/75+(85-p.energy)/restRate(s,{pos:[440,225]});
 return sleepTime>3.25?{act:'selfCare',reason:`身邊有可用草藥，虛構調養3秒可恢復45精力；這次走回床上約${sleepTime.toFixed(1)}秒。不是每日必做，也不消耗唯一插穗。`}:null;
}
