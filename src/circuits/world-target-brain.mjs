import {WORLD_INTERFACE} from './world-interface.mjs';
import {worldLogic} from './world-logic.mjs';
export function compileTargetBrain(hero=0,preference="role"){
 const {nodes,not,and,or,pin,bits,compare,mux,constant}=worldLogic('t');
 const scores=Array.from({length:8},(_,i)=>{
  const p=k=>pin('e'+i+k),fav=hero===0?p('Frozen'):hero===1?and(p('Cast'),not(p('Frozen'))):hero===2?or(p('Caster'),p('Low')):hero===5?p('Threat'):[3,4,6].includes(hero)?p('Crowd'):'0';
  const distance=bits('e'+i+'Distance',6).map(not);
  if(preference==='nearest')return [p('Current'),'0','0',...distance,p('Valid')];
  if(preference==='weakest')return [p('Current'),...distance,'0',p('Low'),p('Valid')];
  if(preference==='caster')return [p('Current'),...distance,'0',p('Caster'),p('Valid')];
  return [p('Current'),...distance,fav,p('Focus'),p('Valid')];
 });
 let best=scores[0],index=constant(0,4);
 for(let i=1;i<8;i++){const win=compare(scores[i],best);best=best.map((b,k)=>mux(b,scores[i][k],win));index=index.map((b,k)=>mux(b,constant(i,4)[k],win));}
 const outputs={};for(let i=0;i<8;i++){let selected=pin('e'+i+'Valid');constant(i,4).forEach((b,k)=>selected=and(selected,b==='1'?index[k]:not(index[k])));outputs['wPick'+i]=selected;}
 return {version:1,interface:WORLD_INTERFACE,profile:'world-target',name:'World · target selection · '+hero,nodes,outputs};
}
