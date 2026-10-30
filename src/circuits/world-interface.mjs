// World v143 input contract. Independent of the archived EMBER arena interface.
export const WORLD_INTERFACE='emberworld-v143-input-v1';
export const WORLD_SENSOR_WIDTHS={
 wDistance:6,wHp:6,wEnergy:6,wGuard:6,wBusy:1,wStunned:1,wConfirmed:1,
 wSupplyPosition:1,wSupplyNear:1,wFacingRight:1,wLeader:1,wGoal:1,wInteract:1,wx:6,wy:6,wRight:1,wDown:1,wTarget:1,wDanger:1,wLine:1,wAllyLow:1,
 wFollowX:6,wFollowY:6,wFollowRight:1,wFollowDown:1,wSafeLeft:1,wSafeRight:1,wSafeUp:1,wSafeDown:1,
 wSafeAttackPosition:1,wAttackPosition:1,wRetreatPosition:1,wEvadePosition:1,wSupportPosition:1,wApproachNeeded:1,wRetreatNeeded:1,wNeedSupport:1,wNoRoute:1,wLeash:1,wFaceTarget:1,wElite:1,wInstantInteraction:1,wCanPotion:1,wCanEnergyPotion:1,
 wLeaderHp:6,wNearestThreat:6,wLeaderSupportPosition:1,wTargetGuarding:1,wTargetFrozen:1,wTargetInterruptible:1,wCrowd:6,wCommandFollow:1,wCommandHold:1,wAtHome:1
};
for(let i=0;i<22;i++)Object.assign(WORLD_SENSOR_WIDTHS,{['wReady'+i]:1,['wRange'+i]:1,['wPatientHp'+i]:6,['wHasPatient'+i]:1,['wEffectActive'+i]:1,['wEnergyAfter'+i]:6,['wLeaderInRange'+i]:1});
export const TARGET_SENSOR_WIDTHS={};
for(let i=0;i<8;i++)Object.assign(TARGET_SENSOR_WIDTHS,{['e'+i+'Valid']:1,['e'+i+'Distance']:6,['e'+i+'Low']:1,['e'+i+'Cast']:1,['e'+i+'Frozen']:1,['e'+i+'Caster']:1,['e'+i+'Crowd']:1,['e'+i+'Threat']:1,['e'+i+'Focus']:1,['e'+i+'Current']:1});
const refs=widths=>Object.entries(widths).flatMap(([key,n])=>Array.from({length:n},(_,i)=>`s.${key}.${i}`));
export const WORLD_SENSOR_REFS=refs(WORLD_SENSOR_WIDTHS),TARGET_SENSOR_REFS=refs(TARGET_SENSOR_WIDTHS);
export const WORLD_MOVE_PORTS=['wMoveLeft','wMoveRight','wMoveUp','wMoveDown'];
export const WORLD_CONTROL_PORTS=['wSupply','wApproach','wSafeApproach','wRetreat','wEvade','wSupport','wSupportLeader','wSurvive','wFollow','wInteract','wInteractPress','wReject','wPotion','wEnergyPotion'];
export const WORLD_SKILL_PORTS=Array.from({length:22},(_,i)=>'wSkill'+i);
export const WORLD_TARGET_PORTS=Array.from({length:8},(_,i)=>'wPick'+i);
export function assertWorldInterface(graph,profile){
 if(graph?.interface!==WORLD_INTERFACE||!['world-combat','world-target'].includes(graph.profile)||profile&&graph.profile!==profile)throw Error('旧接口不可用于 World，请重新选择默认大脑 / World requires a current native-input brain');
 const allowed=graph.profile==='world-target'?WORLD_TARGET_PORTS:[...WORLD_MOVE_PORTS,...WORLD_CONTROL_PORTS,...WORLD_SKILL_PORTS];
 if(Object.keys(graph.outputs||{}).some(p=>!allowed.includes(p)))throw Error('World 不接受旧动作引脚 / Unsupported World output pin');
 return graph;
}
