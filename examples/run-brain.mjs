import {makeBrain,safeSensors,selected} from './fixture.mjs';
import {moduleRequirements} from '../src/circuits/world-demo-model.mjs';
import {Brain} from '../src/circuits/circuit.mjs';
import {compileTargetBrain} from '../src/circuits/world-target-brain.mjs';
import {catalog} from './fixture.mjs';
const slots=['strike','heal','dodge'];
for(const [scenario,change] of [['safe target',{}],['low HP',{wHp:20}],['incoming danger',{wDanger:1,wEvadePosition:1}]]){
 const brain=makeBrain(slots);brain.reset();const output=brain.run({...safeSensors(),...change});
 console.log(JSON.stringify({scenario,selectedSkill:selected(output,slots),evade:!!output.wEvade,modules:brain.modules.length,nand:brain.gates-brain.latches,latches:brain.latches}));
}
const brain=makeBrain(slots),targetBrain=new Brain(compileTargetBrain(0),catalog.boards);
console.log(JSON.stringify({type:'module-instances-not-NFTs',requirements:moduleRequirements([{brain,targetBrain}])}));
