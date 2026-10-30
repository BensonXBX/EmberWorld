import {WorldSession} from './world-adapter.mjs';
import {compileDemoController,sanitizeSettings} from './world-demo-model.mjs';
// A valid fractional foot position can see no node of the native 8-unit grid
// at a painted stair edge. Connect it to the existing grid through a nearby
// legal foot position, without changing ground, collision or movement speed.
export function navigationPath(G,room,start,target){
 const direct=G.pathfind(room,start,target);if(direct.length)return direct;
 if(!G.walkable(room,start.x,start.y)||!G.walkable(room,target.x,target.y))return [];
 const points=[],x0=Math.round(start.x),y0=Math.round(start.y);
 for(let dy=-24;dy<=24;dy++)for(let dx=-24;dx<=24;dx++){
  const p={x:x0+dx,y:y0+dy},d=G.distance(start,p);
  if(d<6||d>24||!G.walkable(room,p.x,p.y)||!G.lineFree(room,start,p))continue;
  points.push({p,d});
 }
 points.sort((a,b)=>a.d-b.d||G.distance(a.p,target)-G.distance(b.p,target));
 for(const {p}of points.slice(0,8)){
  const path=G.pathfind(room,p,target);if(!path.length)continue;
  let from=p;if(!path.every(to=>{const ok=G.lineFree(room,from,to);from=to;return ok;}))continue;
  return [p,...path];
 }
 return [];
}
export function createDecisionRuntime(w,boards){
 let scene=null,nav=null,session=null,game=null,controllers=new Map(),models={},routes=new Map();
 let settings=sanitizeSettings({autoLeader:true,heroes:Object.fromEntries([1,5,7].map(id=>[id,{preset:'ranged',reach:112,retreat:65,target:'caster',reserve:18,evade:true,ultimate:'elite'}]))});
 const byId={};
 const book={byId,configuration:(a,s)=>models[a.characterId]?.skills[s.id]?.config||{},reason:(g,a,s)=>models[a.characterId]?.skills[s.id]?.available?'':'Unavailable',unlocked:(g,id,s)=>!!models[id]?.skills[s.id]?.unlocked,forKind:(a,k)=>byId[k?.startsWith('skill:')?k.slice(6):models[a.characterId]?.kinds[k]||k],targetInRange:w.EmberDecisionRange.targetInRange,ai:(g,a,dt,input)=>input,action(){}};
 w.EmberChapter={...w.EmberDecisionGeometry};w.EmberSkillbook=book;w.EmberParty={decide(){return {};}};w.EmberFighting={...w.EmberDecisionFighting,supportsExtra:()=>false};w.EmberAdvancedSkills=w.EmberDecisionAdvancedSkills;w.EmberHeroes={};w.EmberProfessions={dodgeSkill:a=>models[a.characterId]?.dodge};
 function reset(){session?.dispose();session=null;game=null;scene=null;nav=null;controllers=new Map();routes.clear();}
 function decide(frame){
  const state=frame.state;if(frame.finished)return [];
  if(state.scene!==scene){reset();scene=state.scene;}
  if(frame.decision?.navigation){const n=frame.decision.navigation;nav={...n,groundMask:n.mask?Uint8Array.from(atob(n.mask),c=>c.charCodeAt(0)):null};delete nav.mask;}
  if(!nav)throw Error('DECISION_MAP_REQUIRED');models=frame.decision.actors;if(frame.decision.circuitSettings)settings=sanitizeSettings(frame.decision.circuitSettings);
  for(const row of Object.values(models))for(const s of Object.values(row.skills))byId[s.id]=s;
  if(!game){game={};session=new WorldSession(w,game,controllers,new Map());}
  const room=game.room?.scene===scene?game.room:{...state.room,...nav,scene};Object.assign(room,state.room);
  Object.assign(game,state,{room,navigationRoom:room,aiRules:frame.decision.rules,supplies:new Set(state.supplies),completed:new Set(state.completed),actors:state.actors.map(a=>({...a})),enemies:state.enemies});
  game.player=game.actors.find(a=>a.characterId===state.playerId);game.leaderId=state.playerId;game.allies=game.actors.filter(a=>a!==game.player);
  game.setMove=()=>{};game.canCancel=(kind,a=game.player)=>!!models[a.characterId]?.cancel[kind];game.nearest=(a,range=Infinity)=>game.enemies.filter(e=>e.hp>0&&!e.summoning&&Math.hypot(e.x-a.x,e.y-a.y)<range).sort((x,y)=>Math.hypot(x.x-a.x,x.y-a.y)-Math.hypot(y.x-a.x,y.y-a.y))[0]||null;
  game.guide=()=>state.guide;game.interaction=()=>state.interaction;game.isExplored=(x,y)=>(state.explored[state.roomId]||[]).includes(Math.floor(y/64)*Math.ceil(room.width/64)+Math.floor(x/64));
  // Native v143 non-combat formation (02.js: home offsets and 18-unit follow threshold).
  // Town remains manual for the leader; companion navigation still runs on this client.
  if(game.roomId===0){const G=w.EmberChapter,p=game.player;return game.actors.filter(a=>frame.mode==='circuit'||a!==p).map(a=>{let waypoint=null;if(a!==p&&a.hp>0&&!(a.recover>0)){const slot=Math.max(0,game.allies.indexOf(a)),home=game.command==='hold'?(game.commandPoint||p):{x:p.x-p.face*(28+slot*20),y:p.y+(slot%2?-20:20)};if(G.distance(a,home)>18){const goal=G.walkable(room,home.x,home.y)?home:p;if(G.lineFree(room,a,goal))waypoint=goal;else{let route=routes.get(a.characterId);if(!route||game.time>=route.until||G.distance(route.goal,goal)>20){route={goal:{...goal},until:game.time+.5,path:navigationPath(G,room,a,goal)};routes.set(a.characterId,route);}while(route.path.length&&G.distance(a,route.path[0])<4)route.path.shift();waypoint=route.path[0]||null;}}}return {id:a.characterId,input:{dx:0,dy:0,moveTo:waypoint?{x:waypoint.x,y:waypoint.y}:null}};});}
  session.syncControlBoundary();if(!session.circuitsActive)return [];
  const rows=[];
  for(const a of game.actors){if(frame.mode==='manual'&&a===game.player)continue;let input;
   {
    a.skillLoadout=['common-strike','common-guard',...a.skillLoadout].filter(id=>!byId[id]?.passive);
    const signature=a.skillLoadout.join('|')+JSON.stringify(a.skillRanks||{})+JSON.stringify(settings.heroes[a.characterId]);let c=controllers.get(a.characterId);
    if(!c||c.signature!==signature){c=compileDemoController(w,a,settings,boards);c.signature=signature;controllers.set(a.characterId,c);session.slots.set(a.characterId,a.skillLoadout);}
    input={...session.decide(game,a,c),targetId:c.target};
   }
   let waypoint=null;if(input.moveTo){const goal=input.moveTo,G=w.EmberChapter;if(G.lineFree(room,a,goal))waypoint=goal;else{let route=routes.get(a.characterId);if(!route||game.time>=route.until||Math.hypot(route.goal.x-goal.x,route.goal.y-goal.y)>28){route={goal:{...goal},until:game.time+.6,path:navigationPath(G,room,a,goal)};routes.set(a.characterId,route);}while(route.path.length&&(Math.hypot(a.x-route.path[0].x,a.y-route.path[0].y)<.5||(Math.hypot(a.x-route.path[0].x,a.y-route.path[0].y)<5&&route.path[1]&&G.lineFree(room,a,route.path[1]))))route.path.shift();waypoint=route.path[0];}}
   const length=Math.max(1,Math.hypot(input.dx||0,input.dy||0));const out={dx:(input.dx||0)/length,dy:(input.dy||0)/length,moveTo:waypoint?{x:waypoint.x,y:waypoint.y}:null};
   for(const key of ['attack','guard','dash','interact','interactPressed','heal','energyPotion'])if(input[key])out[key]=true;
   if(input.skillId)out.skillId=input.skillId;if(Number.isSafeInteger(input.targetId)&&input.targetId>=0)out.targetId=input.targetId;
   rows.push({id:a.characterId,input:out});
  }return rows;
 }
 return {decide,reset};
}
