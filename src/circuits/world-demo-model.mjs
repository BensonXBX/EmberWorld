import {WORLD_PRESETS,compileWorldBrain,makeController,loadoutPolicy} from './world-brain.mjs';
import {compileTargetBrain} from './world-target-brain.mjs';
export const DEMO_SETTINGS_KEY='emberworld.circuit-demo.settings.v1';
export function defaultSettings(id){const preset=[3,4,6,7].includes(id)?'ranged':id===5?'protect':'assault';return {enabled:true,preset,...WORLD_PRESETS[preset],target:'role',reserve:8,ultimate:'elite',leaderRetreat:40,leaderReturn:60};}
export function sanitizeSettings(value={}){
 const result={autoLeader:value.autoLeader===true,heroes:{}};
 for(let id=0;id<8;id++){
  const def=defaultSettings(id),raw=value.heroes?.[id]||{},r={...def};
  for(const [key,valid]of Object.entries({preset:['assault','ranged','protect'],target:['role','nearest','weakest','caster'],ultimate:['elite','always','never']}))if(valid.includes(raw[key]))r[key]=raw[key];
  for(const [key,min,max]of [['reach',16,200],['retreat',0,95],['reserve',0,80]])if(Number.isFinite(raw[key]))r[key]=Math.max(min,Math.min(max,Math.round(raw[key])));
  for(const key of ['leaderRetreat','leaderReturn'])if(Number.isFinite(raw[key]))r[key]=Math.round(raw[key]);r.leaderRetreat=Math.max(0,Math.min(90,r.leaderRetreat));r.leaderReturn=Math.max(r.leaderRetreat+5,Math.min(100,r.leaderReturn));
  for(const key of ['enabled','evade'])if(typeof raw[key]==='boolean')r[key]=raw[key];result.heroes[id]=r;
 }return result;
}
export function compileDemoController(w,actor,settings,boards){
 const cfg=settings.heroes[actor.characterId],slots=actor.skillLoadout.slice(0,22);
 const baseConfig={preset:cfg.preset,reach:cfg.reach,retreat:cfg.retreat,evade:cfg.evade,reserveBits:Math.round(cfg.reserve*.63),ultimate:cfg.ultimate,leaderRetreat:cfg.leaderRetreat,leaderReturn:cfg.leaderReturn};
 const c=makeController(compileWorldBrain({...baseConfig,...loadoutPolicy(w,actor,slots)}),boards,{hero:actor.characterId,targetGraph:compileTargetBrain(actor.characterId,cfg.target)});
 return Object.assign(c,{baseConfig,autoLoadout:true,nativeSignature:actor.skillLoadout.join('|'),boards});
}
export function moduleRequirements(controllers){
 const counts=new Map();
 for(const c of controllers)for(const brain of [c.brain,c.targetBrain])for(const n of brain.graph.nodes)counts.set(n.taskId,(counts.get(n.taskId)||0)+1);
 return [...counts].sort((a,b)=>a[0]-b[0]).map(([taskId,count])=>({taskId,count}));
}
export function controllerEnabled(settings,actor,leaderId){return settings.heroes[actor.characterId].enabled&&(actor.characterId!==leaderId||settings.autoLeader);}
