// Synthetic skill descriptions and observations. Not a captured player or game engine.
import fs from 'node:fs';
import {Brain} from '../src/circuits/circuit.mjs';
import {compileWorldBrain, loadoutPolicy} from '../src/circuits/world-brain.mjs';
export const catalog=JSON.parse(fs.readFileSync(new URL('../data/reference-boards.json',import.meta.url)));
export const skills={
  strike:{id:'strike',kind:'jab',effect:'weapon',tier:0},
  heal:{id:'heal',kind:'spell',effect:'selfHeal',tier:1},
  dodge:{id:'dodge',kind:'dash',effect:'dash',tier:1}
};
export const host={EmberSkillbook:{byId:skills,configuration:(_actor,s)=>s.id==='heal'?{heal:28,selfOnly:true}:s.id==='dodge'?{dash:true}:{}}};
export function makeBrain(slots=['strike','heal','dodge'],config={}){
 const padded=Array.from({length:22},(_,i)=>slots[i]);
 return new Brain(compileWorldBrain({preset:'assault',...loadoutPolicy(host,{},padded),...config}),catalog.boards);
}
export const safeSensors=()=>({wHp:63,wEnergy:63,wLeader:0,wTarget:1,wNearestThreat:30,wLeaderHp:63,wReady0:1,wReady1:1,wReady2:1,wRange0:1,wRange1:1,wRange2:1});
export function selected(output,slots){return slots.filter((_,i)=>output['wSkill'+i]);}
