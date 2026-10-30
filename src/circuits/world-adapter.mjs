import {assertWorldInterface,TARGET_SENSOR_WIDTHS} from './world-interface.mjs';
import {SLOT_PORTS,compileWorldBrain,loadoutPolicy} from './world-brain.mjs';
import {Brain} from './circuit.mjs';
const q=v=>Math.max(0,Math.min(63,Math.round(v/4))),pct=(v,max)=>Math.max(0,Math.min(63,Math.round(v/Math.max(1,max)*63)));
const installed=new WeakMap();
// Hooks are scoped by Game identity. Unregistered native games execute original code unchanged.
export function installWorldAdapter(w){
 if(installed.has(w))return installed.get(w);
 const sessions=new WeakMap(),decide=w.EmberParty.decide,skillAI=w.EmberSkillbook.ai,action=w.EmberSkillbook.action;
 w.EmberParty.decide=function(g,a,dt){const s=sessions.get(g),c=s?.circuitsActive?s.controllers.get(a.characterId):null;return c?s.decide(g,a,c):decide(g,a,dt);};
 w.EmberSkillbook.ai=function(g,a,dt,input){const s=sessions.get(g);return s?.circuitsActive&&s.controllers.has(a.characterId)?input:skillAI(g,a,dt,input);};
 // Native companion action() drops dx/dy for named skills. Carry the selected
 // dash slot's direction into the existing native cast API, only for our inputs.
 w.EmberSkillbook.action=function(g,a,kind){
  const s=sessions.get(g),c=s?.circuitsActive?s.controllers.get(a.characterId):null,id=kind?.startsWith('skill:')?kind.slice(6):null;
  return c&&c.input.skillId===id&&w.EmberSkillbook.byId[id]?.effect==='dash'?w.EmberSkillbook.cast(g,a,id,c.input.dx||0,c.input.dy||0):action(g,a,kind);
 };
 const api={attach(g,session){sessions.set(g,session);},detach(g){sessions.delete(g);}};installed.set(w,api);return api;
}
// Navigation proposes reachable geometry only; circuit outputs choose the intent.
function navigationPoint(w,g,a,target,reach,projectile,danger,c,key,extraAllowed=()=>true){
 if(!target)return null;const C=w.EmberChapter,room=g.navigationRoom||g.room,leader=a===g.player;
 const allowed=p=>C.walkable(room,p.x,p.y)&&!danger(p)&&(leader||C.distance(p,g.player)<210)&&extraAllowed(p);
 const cached=c?.navigation?.[key];
 if(cached&&cached.room===g.room&&cached.id===(target.id??target.characterId)&&g.time<cached.until&&C.distance(target,cached.target)<20&&(!cached.point||allowed(cached.point)))return cached.point;
 const points=[],side=a.x<target.x?-1:1,spread=projectile?10:16;
 for(const radius of [reach,reach*.7,reach*.45])for(const sign of [side,-side])for(const dy of [0,spread,-spread]){
  const p={x:target.x+radius*sign,y:target.y+dy};if(allowed(p)&&C.lineFree(room,p,target,1))points.push(p);
 }
 const score=p=>C.distance(a,p)+Math.abs(C.distance(p,target)-reach)*2+g.actors.reduce((v,f)=>v+(f===a?0:Math.max(0,22-C.distance(p,f))*3),0);
 points.sort((a,b)=>score(a)-score(b));let point=points.find(p=>C.lineFree(room,a,p,1));
 if(!point)point=points.slice(0,2).find(p=>C.pathfind(room,a,p).length);
 if(c){c.navigation??={};c.navigation[key]={room:g.room,id:target.id??target.characterId,until:g.time+.5,target:{x:target.x,y:target.y},point:point||null};}
 return point||null;
}
// Geometry only: offer a walkable point with more clearance from every visible enemy.
// The circuit decides whether retreat is needed; never teleport or change actor stats.
function leaderRetreatPoint(w,g,a,enemies,danger){
 if(!enemies.length)return null;
 const C=w.EmberChapter,room=g.navigationRoom||g.room,clearance=p=>Math.min(...enemies.map(e=>C.distance(p,e))),current=clearance(a);
 if(current>=140)return null;
 const points=[];
 for(const radius of [40,75,110])for(let i=0;i<12;i++){
  const p={x:a.x+Math.cos(i*Math.PI/6)*radius,y:a.y+Math.sin(i*Math.PI/6)*radius};
  if(C.walkable(room,p.x,p.y)&&!danger(p)&&clearance(p)>current+6&&C.lineFree(room,a,p,1))points.push(p);
 }
 points.sort((p,q)=>(clearance(q)*3-C.distance(a,q))-(clearance(p)*3-C.distance(a,p)));
 return points[0]||null;
}
// Offer a safe NEXT waypoint, not a straight-line shortcut through a wall or
// enemy pack. The native pathfinder still owns movement; the NAND recovery
// output decides whether to use this geometric proposal.
export function recoveryAttackPoint(w,g,a,target,cfg,enemies,danger,c=null){
 if(!target||!cfg?.projectile)return null;
 const C=w.EmberChapter,room=g.navigationRoom||g.room;
 const clearance=p=>enemies.length?Math.min(...enemies.map(e=>C.distance(p,e))):Infinity;
 const minimum=Math.min(110,clearance(a));
 const segmentSafe=(from,to)=>{
  if(!C.lineFree(room,from,to))return false;
  const steps=Math.max(1,Math.ceil(C.distance(from,to)/8));
  for(let i=0;i<=steps;i++){const p={x:from.x+(to.x-from.x)*i/steps,y:from.y+(to.y-from.y)*i/steps};if(danger(p)||clearance(p)<minimum-.1)return false;}
  return true;
 };
 const cached=c?.recoveryRoute;
 if(cached&&cached.room===g.room&&cached.target===target.id&&cached.skill===cfg.range&&g.time<cached.until&&C.distance(target,cached.targetPoint)<16){
  if(!cached.path)return null;
  while(cached.path.length>1&&C.distance(a,cached.path[0])<7)cached.path.shift();
  if(C.distance(a,cached.path[0])>4&&segmentSafe(a,cached.path[0])&&clearance(cached.end)>=142&&!danger(cached.end))return cached.path[0];
 }
 const points=[];
 for(const radius of [...new Set([Math.max(142,cfg.range-12),142])])for(let i=0;i<24;i++){
  const p={x:target.x+Math.cos(i*Math.PI/12)*radius,y:target.y+Math.sin(i*Math.PI/12)*radius};
  if(C.walkable(room,p.x,p.y)&&clearance(p)>=142&&!danger(p)&&executionRange(w,g,{...a,...p},target,cfg))points.push(p);
 }
 points.sort((p,q)=>C.distance(a,p)-C.distance(a,q));
 let chosen=null,end=null;
 // Bound expensive searches; negative results are cached for half a second.
 for(const p of points.slice(0,8)){
  const path=C.pathfind(room,a,p);if(!path.length)continue;
  let from=a,valid=true;
  for(const to of path){if(!segmentSafe(from,to)){valid=false;break;}from=to;}
  if(!valid)continue;
  while(path.length>1&&C.distance(a,path[0])<7)path.shift();
  if(C.distance(a,path[0])<=4)continue;
  chosen=path.map(p=>({x:p.x,y:p.y}));end=p;break;
 }
 if(c)c.recoveryRoute={room:g.room,target:target.id,skill:cfg.range,targetPoint:{x:target.x,y:target.y},until:g.time+.5,path:chosen,end};
 return chosen?.[0]||null;
}
// A discovered, unclaimed supply is an optional expedition objective. Approach
// and interact through ordinary inputs; never grant inventory in the adapter.
export function supplyWaypoint(w,g,a,enemies,danger,c=null){
 const C=w.EmberChapter,room=g.navigationRoom||g.room,p=g.room.supply;
 if(a!==g.player||!p||g.roomId===0||g.supplies.has(g.roomId)||(a.potions>=5&&a.energyPotions>=5)||!g.isExplored(p.x,p.y)||C.distance(a,p)>360)return null;
 const safe=point=>!danger(point)&&enemies.every(e=>C.distance(point,e)>110);
 if(!safe(a)||!safe(p))return null;
 const cached=c?.supplyRoute;
 let path;
 if(cached&&cached.room===g.room&&g.time<cached.until){path=cached.path;if(!path)return null;}
 else{
  path=C.pathfind(room,a,p).map(p=>({x:p.x,y:p.y}));
  if(!path.length)path=null;
  if(c)c.supplyRoute={room:g.room,until:g.time+.5,path};
 }
 if(!path)return null;
 while(path.length>1&&C.distance(a,path[0])<7)path.shift();
 let from=a;
 for(const to of path){
  if(!C.lineFree(room,from,to))return null;
  const steps=Math.max(1,Math.ceil(C.distance(from,to)/8));
  for(let i=0;i<=steps;i++)if(!safe({x:from.x+(to.x-from.x)*i/steps,y:from.y+(to.y-from.y)*i/steps}))return null;
  from=to;
 }
 return path[0];
}
// Read-only execution footprint: native attacks auto-face their own target (or
// nearest enemy), not the circuit's movement target. Never mutate actor.target.
export function executionRange(w,g,a,target,cfg){
 if(!target)return false;
 const aim=g.enemies.find(e=>e.id===a.target&&e.hp>0&&!e.summoning)||g.nearest(a,cfg.range+40);
 const face=aim&&Math.abs(aim.x-a.x)>4?(aim.x>=a.x?1:-1):a.face;
 // targetInRange assumes auto-facing the target supplied to it. Reject when
 // that assumption differs from the engine, except truly radial footprints.
 if((!cfg.radial||cfg.impactOffset)&&!cfg.turret&&Math.abs(target.x-a.x)>4&&Math.sign(target.x-a.x)!==face)return false;
 return w.EmberSkillbook.targetInRange(g,{...a,comboStep:nextCombo(g,a,cfg.kind)},target,cfg);
}
function nextCombo(g,a,kind){return kind==='jab'?(g.time<a.comboUntil?(a.comboStep+1)%3:0):a.comboStep;}
function skillConfig(w,g,a,skill){return w.EmberSkillbook.configuration(a,skill,nextCombo(g,a,skill.kind));}
function dangerZones(g){return [...g.hazards.filter(z=>z.age<z.delay+.2),...g.enemies.filter(e=>e.hp>0&&!e.summoning&&e.cast).flatMap(e=>e.cast.zones||[])];}
function commandSignature(g){return `${g.command}:${g.commandPoint?.x}:${g.commandPoint?.y}`;}
function cachedInputValid(w,g,a,c){
 const danger=dangerZones(g).some(z=>w.EmberChapter.zoneContains(z,a,10));
 if(+danger!==c.sensors?.wDanger||c.commandSignature!==commandSignature(g))return false;
 // A held skill key must not queue another attack after the first cast. Re-read
 // readiness and footprint at native frame rate, like native Skillbook.ai.
 const skill=w.EmberSkillbook.byId[c.input.skillId];
 if(skill){
  if(w.EmberSkillbook.reason(g,a,skill)||a.hurt>0||a.recover>0||!g.canCancel(skill.kind,a))return false;
  const cfg=skillConfig(w,g,a,skill);
  if((!cfg.support||cfg.zoneType==='damage')&&!executionRange(w,g,a,g.enemies.find(e=>e.id===c.target),cfg))return false;
 }
 if(c.input.guard&&a.attack>0)return false;
 return true;
}
// Pickup is native proximity (18 units); portals auto-trigger inside 15 units.
// Approach the reachable pickup fringe, never route through a live portal first.
export function lootGoal(w,g,a,c=null){
 const drops=g.renderLoot||[];if(!drops.length||g.enemies.some(e=>e.hp>0&&!e.summoning)||g.hazards.some(z=>z.age<z.delay+.2))return null;
 const C=w.EmberChapter,room=g.navigationRoom||g.room;
 const portals=g.activePortals||((room.portals||[]).filter((p,i)=>g.portalFlags?.[i]));
 const key=portals.map(p=>`${p.x},${p.y}`).join('|'),cache=c?.lootRoute;
 const segmentSafe=(from,to)=>C.lineFree(room,from,to)&&portals.every(p=>{
  const dx=to.x-from.x,dy=to.y-from.y,len=dx*dx+dy*dy,t=len?Math.max(0,Math.min(1,((p.x-from.x)*dx+(p.y-from.y)*dy)/len)):0;
  return Math.hypot(from.x+t*dx-p.x,from.y+t*dy-p.y)>=15.6;
 });
 const next=route=>{
  while(route.path.length>1&&C.distance(a,route.path[0])<1)route.path.shift();
  const p=route.path[0];return p&&segmentSafe(a,p)?{...p,kind:'loot',label:route.label}:null;
 };
 if(cache&&cache.room===g.room&&cache.key===key&&g.time<cache.until&&drops.some(d=>d.id===cache.id&&d.x===cache.x&&d.y===cache.y)){
  const point=next(cache);if(point)return point;
 }
 const sorted=[...drops].sort((x,y)=>C.distance(a,x)-C.distance(a,y));
 for(const d of sorted.slice(0,4)){
  // Holding within pickup range lets newly dropped items finish their native fall animation.
  if(C.distance(a,d)<=17.5&&C.lineFree(room,a,d,1)&&segmentSafe(a,a))return {x:a.x,y:a.y,kind:'loot',label:d.appearance?.name||'战利品'};
  const points=[{x:d.x,y:d.y}],angle=Math.atan2(a.y-d.y,a.x-d.x);
  for(const r of [12,16.5])for(let i=0;i<24;i++)points.push({x:d.x+Math.cos(angle+i*Math.PI/12)*r,y:d.y+Math.sin(angle+i*Math.PI/12)*r});
  const candidates=points.filter(p=>C.walkable(room,p.x,p.y)&&C.lineFree(room,p,d,1)&&portals.every(q=>C.distance(p,q)>=15.6)).sort((p,q)=>C.distance(a,p)-C.distance(a,q));
  let path=null;
  const direct=candidates.find(p=>segmentSafe(a,p));if(direct)path=[direct];
  // Only bounded native path searches. All cached waypoints are rechecked before use.
  if(!path)for(const p of candidates.slice(0,4)){
   const route=C.pathfind(room,a,p);let from=a;if(route.length&&route.every(to=>{const ok=segmentSafe(from,to);from=to;return ok;})){path=route;break;}
  }
  // A straight route may cross a portal while the drop lies behind it. Build a
  // small visibility graph around nearby portals, using native walkability.
  if(!path&&candidates.length&&portals.length){
   const relevant=portals.filter(p=>C.distance(p,a)+C.distance(p,d)<C.distance(a,d)+100).slice(0,4);
   const nodes=[{x:a.x,y:a.y},...candidates.slice(0,6)];const ends=nodes.length;
   for(const p of relevant)for(let i=0;i<16;i++){const n={x:p.x+Math.cos(i*Math.PI/8)*22,y:p.y+Math.sin(i*Math.PI/8)*22};if(C.walkable(room,n.x,n.y))nodes.push(n);}
   const costs=nodes.map(()=>Infinity),prev=[],done=new Set();costs[0]=0;
   for(let count=0;count<nodes.length;count++){
    let index=-1;for(let i=0;i<nodes.length;i++)if(!done.has(i)&&(index<0||costs[i]<costs[index]))index=i;
    if(index<0||!Number.isFinite(costs[index]))break;
    if(index>0&&index<ends){path=[];for(let i=index;i>0;i=prev[i])path.unshift(nodes[i]);break;}
    done.add(index);for(let j=1;j<nodes.length;j++)if(!done.has(j)){const cost=costs[index]+C.distance(nodes[index],nodes[j]);if(cost<costs[j]&&segmentSafe(nodes[index],nodes[j])){costs[j]=cost;prev[j]=index;}}
   }
  }
  if(path){const route={room:g.room,key,id:d.id,x:d.x,y:d.y,until:g.time+.5,path,label:d.appearance?.name||'战利品'};if(c)c.lootRoute=route;return next(route);}
 }
 if(c)c.lootRoute=null;return null;
}
// Native interaction() gives nearby downed companions priority over objectives.
// When revival is unavailable, walk to another legal side of the objective;
// the engine still decides whether interaction is possible and completes it.
export function objectiveApproach(w,g,a,goal,interaction,c=null){
 const C=w.EmberChapter,object=g.room.object;
 const center=Array.isArray(object)?{x:object[0],y:object[1]}:object;
 if(a!==g.player||!goal||!center||g.roomId<2||C.distance(goal,center)>1||g.enemies.some(e=>e.hp>0))return goal;
 const down=g.allies.filter(f=>f.hp<=0),key=JSON.stringify([g.roomId,center.x,center.y,...down.map(f=>[f.characterId,f.x,f.y])]);
 const cached=c?.objectiveRoute;
 if(interaction?.kind==='revive'&&!interaction.blocked){if(c)c.objectiveRoute=null;return goal;}
 if(cached?.room===g.room&&cached.key===key&&(cached.point||g.time<cached.retryAt))return cached.point?{...goal,...cached.point}:goal;
 if(interaction?.kind!=='revive'||!interaction.blocked)return goal;
 const room=g.navigationRoom||g.room,radius=g.roomId<=5?46:35,points=[];
 for(const r of [0,12,24,32,radius-2])for(let i=0;i<(r?16:1);i++){
  const p={x:center.x+Math.cos(i*Math.PI/8)*r,y:center.y+Math.sin(i*Math.PI/8)*r};
  if(C.distance(p,center)<radius-1&&down.every(f=>C.distance(p,f)>=39)&&C.walkable(room,p.x,p.y))points.push(p);
 }
 points.sort((p,q)=>C.distance(a,p)-C.distance(a,q));
 let point=points.find(p=>C.lineFree(room,a,p))||null;
 if(!point)point=points.slice(0,2).find(p=>C.pathfind(room,a,p).length)||null;
 if(c)c.objectiveRoute={room:g.room,key,point,retryAt:g.time+1};
 return point?{...goal,...point}:goal;
}
export function observeWorld(w,g,a,slots,c=null){
 const C=w.EmberChapter,book=w.EmberSkillbook,leader=a===g.player,room=g.navigationRoom||g.room;
 const living=g.enemies.filter(e=>e.hp>0&&!e.summoning),friends=g.actors.filter(f=>f.hp>0);
 const slot=Math.max(0,g.allies.indexOf(a)),hold=!leader&&g.command==='hold',home=hold?(g.commandPoint||g.player):{x:g.player.x-g.player.face*(28+slot*20),y:g.player.y+(slot%2?-20:20)};
 const candidates=living.filter(e=>C.distance(a,e)<=480&&(leader||C.distance(g.player,e)<260)&&( !hold||C.distance(e,home)<120)).sort((x,y)=>C.distance(a,x)-C.distance(a,y)||x.id-y.id).slice(0,8);
 const selection=Object.fromEntries(Object.keys(TARGET_SENSOR_WIDTHS).map(k=>[k,0]));for(let i=0;i<8;i++){
  const e=candidates[i],p='e'+i;selection[p+'Valid']=+(!!e&&!(c?.rejected?.get(e.id)>g.time));if(!e)continue;
  Object.assign(selection,{[p+'Distance']:q(C.distance(a,e)),[p+'Low']:+(e.hp<e.maxHp*.4),[p+'Cast']:+!!e.cast,[p+'Frozen']:+(e.frozen>0),[p+'Caster']:+['caster','mage','shaman'].includes(e.type),[p+'Crowd']:+(living.filter(other=>other!==e&&C.distance(e,other)<85).length>=2),[p+'Threat']:+friends.some(f=>f!==a&&[4,6,7].includes(f.characterId)&&C.distance(f,e)<85),[p+'Focus']:+(e.id===(g.focus||g.player.target)),[p+'Current']:+(e.id===c?.target)});
 }
 const picked=c?.targetBrain?.run(selection),pick=picked?Array.from({length:8},(_,i)=>i).find(i=>picked['wPick'+i]):0,target=candidates[pick]||null;
 if(c){c.targetSensors=selection;c.targetOutputs=picked;c.candidates=candidates.map(e=>e.id);for(const [id,until]of c.rejected)if(until<=g.time)c.rejected.delete(id);}
 const dx=target?target.x-a.x:0,dy=target?target.y-a.y:0;
 const zones=dangerZones(g);
 const danger=point=>zones.some(z=>C.zoneContains(z,point,10));
 const supply=leader?supplyWaypoint(w,g,a,living,danger,c):null;

 const loot=leader?lootGoal(w,g,a,c):null;
 const interaction=leader&&!loot?g.interaction():null;
 const goal=leader?(g.roomId===0?null:loot||objectiveApproach(w,g,a,g.guide(),interaction,c)):C.walkable(room,home.x,home.y)?home:g.player;
 const canInteract=!!interaction&&!interaction.blocked&&['rescue','cache','beacon','finish','chapterSeal','supply','revive','groundLoot','loot'].includes(interaction.kind)&&(interaction.kind!=='supply'||g.player.potions<5||g.player.energyPotions<5);
 const sensors={wCanPotion:+(leader&&a.potions>0&&a.bottleCd<=0),wCanEnergyPotion:+(leader&&a.energyPotions>0&&a.bottleCd<=0),wFacingRight:+(a.face>0),wLeader:+leader,wGoal:+!!goal,wInteract:+canInteract,wInstantInteraction:+(interaction?.duration===0),wDistance:q(Math.hypot(dx,dy)),wHp:pct(a.hp,a.maxHp),wEnergy:pct(a.energy,a.maxEnergy),wGuard:pct(a.guard,100),wStunned:+(a.hurt>0||a.recover>0||a.hp<=0),wBusy:+(a.attack>0||a.dodge>0),wConfirmed:+!!a.strike?.confirmed,wx:q(Math.abs(dx)),wy:q(Math.abs(dy)),wRight:+(dx>=0),wDown:+(dy>=0),wTarget:+!!target,wDanger:+danger(a),wLine:+!!(target&&C.lineFree(room,a,target,1)),wAllyLow:+friends.some(f=>f.hp<f.maxHp*.7),wFollowX:q(Math.abs((goal?.x??a.x)-a.x)),wFollowY:q(Math.abs((goal?.y??a.y)-a.y)),wFollowRight:+((goal?.x??a.x)>=a.x),wFollowDown:+((goal?.y??a.y)>=a.y),wLeash:+(!leader&&!hold&&C.distance(a,g.player)>200),wElite:+(!!target&&['boss','brute'].includes(target.type))};
 Object.assign(sensors,{wCommandFollow:+(!leader&&g.command==='follow'),wCommandHold:+hold,wAtHome:+(C.distance(a,home)<=25),wTargetGuarding:+!!target?.guarding,wTargetFrozen:+(target?.frozen>0),wTargetInterruptible:+!!target?.cast?.interruptible,wCrowd:target?Math.min(63,living.filter(e=>C.distance(e,target)<65).length):0});
 Object.assign(sensors,{wSupplyPosition:+!!supply,wSupplyNear:+(canInteract&&interaction?.kind==='supply'),wLeaderHp:pct(g.player.hp,g.player.maxHp),wNearestThreat:living.length?q(Math.min(...living.map(e=>C.distance(a,e)))):63});
 let anyAttackRange=false,rangedCfg=null,patient=null,supportCfg=null,leaderSupportCfg=null;
 const facing=!!target&&(Math.abs(dx)<=4||Math.sign(dx)===a.face);
 for(let i=0;i<22;i++){
  sensors['wEnergyAfter'+i]=0;
  const skill=book.byId[slots[i]],cfg=skill?skillConfig(w,g,a,skill):null;
  sensors['wReady'+i]=+(!!skill&&a.hp>0&&a.recover<=0&&a.hurt<=0&&(skill.effect==='guard'?a.skillLoadout.includes(skill.id)&&book.unlocked(g,a.characterId,skill)&&a.guard>0&&a.attack<=0&&a.dodge<=0:!book.reason(g,a,skill)&&(skill.effect==='dash'?a.dodge<=0&&g.canCancel(skill.kind,a):g.canCancel(skill.kind,a))));
  let range=false,eligible=[],active=false;
  if(skill){
   sensors['wEnergyAfter'+i]=q(Math.max(0,a.energy-(skill.effect==='guard'?0:skill.cost)));
   if(skill.effect==='guard'||skill.effect==='dash'||cfg.manaRestore){range=true;}
   else if(cfg.heal||cfg.zoneType==='heal'||cfg.shield||cfg.focus){
    eligible=friends.filter(f=>(!cfg.selfOnly||f===a)&&C.distance(a,f)<cfg.range&&C.lineFree(room,a,f,1));range=eligible.length>0;
    if(cfg.zoneType==='heal')active=!!a.skillZones?.some(z=>z.room===g.room&&z.type==='heal'&&z.age<z.ticks);
    if(cfg.shield)active=eligible.length>0&&eligible.every(f=>(f.protection||0)>=.3);
    if(cfg.focus)active=(a.skillFocus||0)>=.2;
    if((cfg.heal||cfg.zoneType==='heal')&&!cfg.selfOnly&&sensors['wReady'+i]){
     if(!leader&&g.player.hp>0&&!eligible.includes(g.player)&&(!leaderSupportCfg||cfg.range>leaderSupportCfg.range))leaderSupportCfg=cfg;
     const f=friends.filter(f=>C.distance(f,g.player)<200).sort((x,y)=>x.hp/x.maxHp-y.hp/y.maxHp)[0];
     if(f&&f.hp<f.maxHp*.7&&!eligible.includes(f)){patient=f;supportCfg=cfg;}
    }
   }else{const reachable=executionRange(w,g,a,target,cfg);anyAttackRange||=reachable&&(skill.effect==='weapon'||sensors['wReady'+i]);range=reachable;if(cfg.turret)active=(a.turret?.life||0)>1;}
  }
  if(leader&&cfg?.projectile&&!cfg.heal&&!cfg.turret&&sensors['wReady'+i]&&(!rangedCfg||cfg.range>rangedCfg.range))rangedCfg=cfg;
  sensors['wRange'+i]=+range;sensors['wHasPatient'+i]=+(eligible.length>0);sensors['wPatientHp'+i]=eligible.length?Math.min(...eligible.map(f=>pct(f.hp,f.maxHp))):63;sensors['wEffectActive'+i]=+active;sensors['wLeaderInRange'+i]=+eligible.includes(g.player);
 }
 const basic=book.byId[slots.find(id=>book.byId[id]?.effect==='weapon')],baseCfg=basic?book.configuration(a,basic):null;
 const requested=c?.brain.graph.navigation?.reach||48,reach=Math.max(14,Math.min(requested,(baseCfg?.range||64)-12));
 const attack=navigationPoint(w,g,a,target,reach,!!baseCfg?.projectile,danger,c,'attack');
 const safeAttack=leader&&target&&rangedCfg&&!anyAttackRange?recoveryAttackPoint(w,g,a,target,rangedCfg,living,danger,c):null;
 const retreat=leader?leaderRetreatPoint(w,g,a,living,danger):navigationPoint(w,g,a,target,Math.min(180,Math.max(requested,C.distance(a,target||a)+40)),true,danger,c,'retreat');
 const support=navigationPoint(w,g,a,patient,Math.max(20,Math.min(85,(supportCfg?.range||100)-10)),true,danger,c,'support');
 const supportLeader=leaderSupportCfg?navigationPoint(w,g,a,g.player,Math.max(20,Math.min(85,leaderSupportCfg.range-10)),true,danger,c,'supportLeader'):null;
 const safe=[];if(sensors.wDanger)for(const radius of [32,55,90,130,180])for(let i=0;i<12;i++){const p={x:a.x+Math.cos(i*Math.PI/6)*radius,y:a.y+Math.sin(i*Math.PI/6)*radius};if(C.walkable(room,p.x,p.y)&&C.lineFree(room,a,p,1)&&!danger(p))safe.push(p);}
 // Shortest safe route first; do not spend the warning window running farther.
 safe.sort((p,q)=>C.distance(a,p)-C.distance(a,q)||(leader&&living.length?Math.min(...living.map(e=>C.distance(q,e)))-Math.min(...living.map(e=>C.distance(p,e))):C.distance(p,g.player)-C.distance(q,g.player)));
 Object.assign(sensors,{wSafeLeft:+safe.some(p=>p.x<a.x-1),wSafeRight:+safe.some(p=>p.x>a.x+1),wSafeUp:+safe.some(p=>p.y<a.y-1),wSafeDown:+safe.some(p=>p.y>a.y+1)});
 Object.assign(sensors,{wSafeAttackPosition:+!!safeAttack,wRetreatNeeded:+(!!target&&!!baseCfg?.projectile&&C.distance(a,target)<Math.max(48,reach*.65)),wAttackPosition:+!!attack,wRetreatPosition:+(!!retreat&&(leader||C.distance(retreat,target||a)>C.distance(a,target||a)+8)&&C.distance(a,retreat)>5),wLeaderSupportPosition:+!!supportLeader,wSupportPosition:+!!support,wEvadePosition:+!!safe[0],wNeedSupport:+!!patient,wApproachNeeded:+!anyAttackRange,wNoRoute:+(!!target&&!attack&&!anyAttackRange),wFaceTarget:+facing});
 const threat=zones.find(z=>C.zoneContains(z,a,10));
 return {sensors,target,goal,interaction,threat,points:{supply,attack,safeAttack,retreat,support,supportLeader,evade:safe[0]||null}};
}
export class WorldSession{
 constructor(w,g,controllers,slots){for(const c of controllers.values())assertWorldInterface(c.brain.graph,'world-combat');this.w=w;this.g=g;this.controllers=controllers;this.slots=slots;this.frames=0;this.adapter=installWorldAdapter(w);this.adapter.attach(g,this);this.trace=[];this.loot=[];}
 get circuitsActive(){return this.g.status==='playing'&&this.g.roomId>0&&!this.g.trial&&this.g.room?.map!=='town';}
 resumeTownPlayer(){
  if(this.g.roomId!==0||this.g.status!=='victory')return false;
  // Explicit player's continue button, using the native start entry; no automatic re-entry.
  this.g.start();this.syncControlBoundary();return true;
 }
 syncControlBoundary(){
  const active=this.circuitsActive;
  if(active!==this.wasActive){for(const c of this.controllers.values()){c.input={};c.outputs={};c.sensors={};c.goal=null;c.interaction=null;c.target=null;c.lastInteract=false;c.nextTime=this.g.time;c.navigation=null;c.recoveryRoute=null;c.supplyRoute=null;c.objectiveRoute=null;c.rejected?.clear();}this.wasActive=active;}
 }
 decide(g,a,c){
  if(!this.circuitsActive)return {};
  if(g.time+1e-8<c.nextTime&&cachedInputValid(this.w,g,a,c))return c.input;
  c.nextTime=g.time+.1;c.commandSignature=commandSignature(g);
  if(c.autoLoadout&&c.nativeSignature!==a.skillLoadout.join('|')){const slots=a.skillLoadout.slice(0,22);this.slots.set(a.characterId,slots);c.brain=new Brain(compileWorldBrain({...c.baseConfig,...loadoutPolicy(this.w,a,slots)}),c.boards);c.nativeSignature=a.skillLoadout.join('|');}
  const {sensors,target,goal,interaction,points,threat}=observeWorld(this.w,g,a,this.slots.get(a.characterId)||[],c);c.sensors=sensors;c.goal=goal;c.interaction=interaction;c.target=target?.id??null;
  const out=c.brain.run(sensors);c.outputs=out;
  const dx=(out.wMoveRight?1:0)-(out.wMoveLeft?1:0),dy=(out.wMoveDown?1:0)-(out.wMoveUp?1:0),input={dx,dy};
  {
   input.moveTo=out.wEvade?points.evade:out.wRetreat?points.retreat:out.wSupply?points.supply:out.wSupportLeader?points.supportLeader:out.wSupport?points.support:out.wApproach?points.attack:out.wSafeApproach?points.safeAttack:out.wFollow?goal:null;
   if(!input.moveTo&&(dx||dy)){const p={x:a.x+dx*6,y:a.y+dy*6};if(this.w.EmberChapter.walkable(g.navigationRoom||g.room,p.x,p.y))input.moveTo=p;}
   if(out.wReject&&target)c.rejected.set(target.id,g.time+1);
  }
  if(input.moveTo)input.moveTo={x:input.moveTo.x,y:input.moveTo.y};
  if(a===g.player){
   g.setMove(input.moveTo?.x??a.x,input.moveTo?.y??a.y);
   input.dx=0;input.dy=0;
  }
  const interact=out.wInteract;input.interact=!!interact;input.interactPressed=!!out.wInteractPress||!!interact&&!c.lastInteract;c.lastInteract=!!interact;
  const slot=SLOT_PORTS.findIndex(port=>out[port]);const id=this.slots.get(a.characterId)?.[slot],skill=this.w.EmberSkillbook.byId[id];
  if(skill){
   if(skill.effect==='guard'){
    // Native held guard, not a latched skill cast: release it when escaping.
    input.guard=true;input.moveTo=null;input.dx=Math.sign((threat?.sourceX??threat?.x??target?.x??a.x)-a.x);input.dy=0;
   }else if(skill.effect==='dash'){
    // Preserve both the exact skill slot and its direction for both actor roles.
    input.action='skill:'+id;input.skillId=id;input.dx=(points.evade?.x??a.x)-a.x;input.dy=(points.evade?.y??a.y)-a.y;
   }else{input.action='skill:'+id;input.skillId=id;}
  }
  input.heal=!!out.wPotion;input.energyPotion=!!out.wEnergyPotion;
  c.input=input;return input;
 }
 tick(input={}){
  this.syncControlBoundary();
  const c=this.controllers.get(this.g.leaderId),p=this.g.player;
  let request=input;
  if(c&&this.circuitsActive&&!this.g.transition&&!this.g.entrance)request=this.decide(this.g,p,c);
  // Main actor keyboard route stays native; teammates use native go()/stepCompanion().
  this.g.tick(1/60,request);this.frames++;this.syncControlBoundary();
  // This isolated lab never persists save/drop events, sends rewards, or touches wallet state.
  for(const event of this.g.events){if(['equipmentDrop','clearLoot','complete','portalArrival'].includes(event.type)){this.trace.push({time:this.g.time,...event});this.trace=this.trace.slice(-20);}}
  this.g.events.length=0;
 }
 dispose(){this.adapter.detach(this.g);}
}
