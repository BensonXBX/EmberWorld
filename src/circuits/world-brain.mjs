import {Brain,WORLD_MOVE_PORTS,WORLD_SKILL_PORTS,WORLD_CONTROL_PORTS} from './circuit.mjs';
import {worldLogic} from './world-logic.mjs';
import {compileTargetBrain} from './world-target-brain.mjs';
import {WORLD_INTERFACE,assertWorldInterface} from './world-interface.mjs';
export const SLOT_PORTS=WORLD_SKILL_PORTS;
export const WORLD_PRESETS={assault:{reach:36,retreat:0,evade:true},ranged:{reach:112,retreat:45,evade:true},protect:{reach:65,retreat:65,evade:true}};
export function skillPriority(skill){
 if(!skill)return 10000;
 const family=skill.effect==='selfHeal'||['heal','regen','garden','rescue','sanctuary'].includes(skill.effect)?0:skill.effect==='mana'?1:['guard','dash','shield','fortress'].includes(skill.effect)?2:skill.effect==='focus'?3:skill.effect==='weapon'?9:5;
 return family*100-(skill.tier||0)*3;
}
export function loadoutPolicy(w,a,slots){
 const skills=slots.map(id=>w.EmberSkillbook.byId[id]);
 return {skillPriorities:skills.map(skillPriority),skillRanged:skills.map(s=>!!s&&!!w.EmberSkillbook.configuration(a,s).projectile),skillModes:skills.map(s=>{if(!s)return 'disabled';const c=w.EmberSkillbook.configuration(a,s);return s.effect==='guard'?'guard':s.effect==='dash'?'dash':c.heal||c.zoneType==='heal'?(c.selfOnly?'selfheal':'heal'):c.manaRestore?'mana':c.focus?'focus':c.shield?'shield':c.turret?'turret':'offense';}),skillReserve:skills.map(s=>s&&s.kind!=='jab'&&!['selfHeal','mana','guard','dash','heal','regen','shield','rescue'].includes(s.effect)),skillUltimate:skills.map(s=>s?.kind==='super')};
}
export function compileWorldBrain(config={}){
 const cfg={leaderRetreat:40,leaderReturn:60,...WORLD_PRESETS[config.preset||'assault'],...config};
 if(!Number.isFinite(cfg.reach)||cfg.reach<16||cfg.reach>200||!Number.isFinite(cfg.retreat)||cfg.retreat<0||cfg.retreat>95)throw Error('Invalid world thresholds');
 const {nodes,add,not,and,or,all,pin,cmp,priority}=worldLogic();
 const leader=pin('wLeader'),target=pin('wTarget'),ready=not(pin('wStunned')),move=all(ready,not(pin('wBusy'))),danger=pin('wDanger'),safe=not(danger),low=cmp('wHp',Math.round(cfg.retreat*.63),'lt');
 const out=Object.fromEntries([...WORLD_MOVE_PORTS,...WORLD_CONTROL_PORTS,...SLOT_PORTS].map(p=>[p,'0']));
 if(!Number.isFinite(cfg.leaderRetreat)||!Number.isFinite(cfg.leaderReturn)||cfg.leaderRetreat<0||cfg.leaderRetreat>90||cfg.leaderReturn<cfg.leaderRetreat+5||cfg.leaderReturn>100)throw Error('Invalid leader thresholds');
 const critical=cmp('wHp',Math.ceil(cfg.leaderRetreat*.63),'lt'),recovered=not(cmp('wHp',Math.ceil(cfg.leaderReturn*.63),'lt'));
 const survivalMemory=add(29,[critical,recovered,or(not(leader),not(target))],'Leader survival · SR memory')(0);
 out.wSurvive=all(leader,target,not(recovered),or(critical,survivalMemory));
 out.wPotion=all(leader,pin('wCanPotion'),or(cmp('wHp',46,'lt'),out.wSurvive));
 out.wEnergyPotion=all(pin('wLeader'),pin('wCanEnergyPotion'),cmp('wEnergy',16,'lt'),not(out.wPotion));
 const followOrder=pin('wCommandFollow'),hold=pin('wCommandHold'),holdReturn=all(hold,not(pin('wAtHome'))),combat=all(not(followOrder),not(holdReturn));
 out.wEvade=all(danger,pin('wEvadePosition'),move,cfg.evade?'1':'0');
 out.wRetreat=all(combat,not(hold),target,or(or(all(not(leader),low),out.wSurvive),pin('wRetreatNeeded')),pin('wRetreatPosition'),safe,move,not(pin('wLeash')));
 out.wSupply=all(leader,pin('wSupplyPosition'),not(pin('wSupplyNear')),cmp('wNearestThreat',25,'gt'),safe,move,not(out.wRetreat),not(out.wEvade));
 out.wInteract=all(pin('wInteract'),or(not(target),all(pin('wSupplyNear'),cmp('wNearestThreat',25,'gt'))),safe,move,not(pin('wLeash')));
 out.wSupportLeader=all(combat,not(hold),not(leader),cmp('wLeaderHp',54,'lt'),pin('wLeaderSupportPosition'),safe,move,not(out.wRetreat));
 out.wSupport=all(combat,not(hold),pin('wNeedSupport'),pin('wSupportPosition'),safe,move,not(out.wRetreat),not(out.wSupportLeader),not(out.wSurvive));
 out.wApproach=all(combat,not(hold),target,pin('wApproachNeeded'),pin('wAttackPosition'),safe,move,not(out.wRetreat),not(out.wSupport),not(out.wSupportLeader),not(out.wSurvive),not(out.wSupply),not(out.wInteract),not(pin('wLeash')));
 out.wSafeApproach=all(combat,not(hold),leader,target,out.wSurvive,pin('wSafeAttackPosition'),pin('wApproachNeeded'),cmp('wHp',22,'gt'),cmp('wNearestThreat',25,'gt'),safe,move,not(out.wRetreat),not(out.wEvade),not(out.wSupply),not(out.wInteract));
 out.wFollow=all(or(or(not(target),pin('wLeash')),or(followOrder,holdReturn)),pin('wGoal'),not(out.wSupply),not(out.wInteract),not(out.wSupportLeader),safe,move);
 out.wReject=all(target,pin('wNoRoute'),move,safe);
 const stationary=all(move,target,not(out.wEvade),not(out.wRetreat),not(out.wSupport),not(out.wSupportLeader),not(out.wApproach),not(out.wSafeApproach),not(out.wFollow),not(out.wSupply),combat);
 out.wMoveRight=all(stationary,pin('wRight'),not(pin('wFacingRight')));
 out.wMoveLeft=all(stationary,not(pin('wRight')),pin('wFacingRight'));
 const order=Array.from({length:22},(_,i)=>i).sort((a,b)=>(cfg.skillPriorities?.[a]??(a===4?0:a===3?200:500))-(cfg.skillPriorities?.[b]??(b===4?0:b===3?200:500))||a-b);
 const pulse=not(add(30,[],'decision clock')(0));
 out.wInteractPress=all(out.wInteract,pin('wInstantInteraction'),pulse);
 const conditions=order.map(i=>{
  const mode=cfg.skillModes?.[i]||(i===4?'selfheal':i===3?'guard':'offense');let needed=target;
  if(mode==='selfheal')needed=or(cmp('wHp',44,'lt'),all(leader,cmp('wHp',54,'lt')));
  else if(mode==='heal')needed=all(pin('wHasPatient'+i),or(cmp('wPatientHp'+i,44,'lt'),all(pin('wLeaderInRange'+i),cmp('wLeaderHp',54,'lt'))),not(pin('wEffectActive'+i)));
  else if(mode==='mana')needed=cmp('wEnergy',28,'lt');
  else if(['shield','focus','turret'].includes(mode))needed=all(target,not(pin('wEffectActive'+i)));
  else if(mode==='guard')needed=all(not(out.wEvade),or(danger,all(out.wSurvive,not(pin('wRetreatPosition')),cmp('wNearestThreat',23,'lt'))));
  else if(mode==='dash')needed=all(danger,pin('wEvadePosition'),cfg.evade?'1':'0');
  const reserve=cfg.skillReserve?.[i]?not(cmp('wEnergyAfter'+i,cfg.reserveBits??5,'lt')):'1';
  const ultimate=cfg.skillUltimate?.[i]?(cfg.ultimate==='never'?'0':cfg.ultimate==='always'?'1':pin('wElite')):'1';
  const safeRanged=cfg.skillRanged?.[i]?all(cmp('wNearestThreat',25,'gt'),cmp('wHp',22,'gt')):'0';
  const attack=['offense','turret'].includes(mode)?all(safe,not(out.wSupply),not(out.wInteract),not(out.wRetreat),not(out.wSupport),not(out.wSupportLeader),or(not(out.wSurvive),safeRanged),pulse):'1';
  return all(['guard','dash'].includes(mode)?'1':all(safe,combat),pin('wReady'+i),pin('wRange'+i),ready,needed,reserve,ultimate,attack,['guard','dash'].includes(mode)?'1':not(pin('wLeash')));
 });
 const chosen=priority(conditions);order.forEach((slot,i)=>out[SLOT_PORTS[slot]]=chosen[i]);
 return {version:1,interface:WORLD_INTERFACE,profile:'world-combat',name:'World v143 · '+cfg.preset,navigation:{reach:cfg.reach,retreat:cfg.retreat},nodes,outputs:out};
}
export function makeController(graph,boards,{hero=0,targetGraph=null}={}){assertWorldInterface(graph,'world-combat');return {brain:new Brain(graph,boards),targetBrain:new Brain(targetGraph||compileTargetBrain(hero),boards),nextTime:-1,input:{},sensors:null,outputs:null,target:null,rejected:new Map(),navigation:null};}
