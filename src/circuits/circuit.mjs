import {WORLD_SENSOR_WIDTHS,TARGET_SENSOR_WIDTHS,WORLD_SENSOR_REFS,TARGET_SENSOR_REFS,WORLD_MOVE_PORTS,WORLD_CONTROL_PORTS,WORLD_SKILL_PORTS,WORLD_TARGET_PORTS,assertWorldInterface} from './world-interface.mjs';
export {WORLD_SENSOR_REFS,TARGET_SENSOR_REFS,WORLD_MOVE_PORTS,WORLD_CONTROL_PORTS,WORLD_SKILL_PORTS} from './world-interface.mjs';
// NAND/LATCH interpreter. The host stores bits; only gates compute their next values.
export const bitArray=(n,w)=>Array.from({length:w},(_,i)=>(n>>>i)&1);
export const numberOf=bits=>bits.reduce((v,b,i)=>v+b*2**i,0);
export function validateBoard(b){
 if(!Number.isInteger(b.nIn)||b.nIn<0||b.nIn>64||!Number.isInteger(b.nOut)||b.nOut<1||b.nOut>64||!Array.isArray(b.ops)||b.ops.length>4800||b.ops.length<b.nOut)throw Error('Invalid board dimensions');
 let latch=0;const size=2+b.nIn+b.ops.length;
 for(let k=0;k<b.ops.length;k++){
  const [op,...refs]=b.ops[k],arity=op===0?2:op===1?1:0;
  if(!arity||refs.length!==arity||refs.some(r=>!Number.isInteger(r)||r<0||r>=(op===0?2+b.nIn+k:size)))throw Error(`Invalid gate ${k}`);
  latch+=op===1;
 }
 if(latch!==b.nState)throw Error('LATCH count mismatch');
 return b;
}
export class Circuit{
 constructor(board){this.b=validateBoard(board);this.w=new Uint8Array(2+board.nIn+board.ops.length);this.state=new Uint8Array(board.nState);this.next=new Uint8Array(board.nState);}
 reset(){this.state.fill(0);this.w.fill(0);this.w[1]=1;}
 run(input){
  const b=this.b,w=this.w;
  if(input.length!==b.nIn||input.some(v=>v!==0&&v!==1))throw Error('Invalid input pins');
  w[0]=0;w[1]=1;w.set(input,2);let latch=0;
  for(let k=0;k<b.ops.length;k++){const [op,a,c]=b.ops[k];w[2+b.nIn+k]=op===0?1-(w[a]&w[c]):this.state[latch++];}
  latch=0;for(const [op,d] of b.ops)if(op===1)this.next[latch++]=w[d];
  this.state.set(this.next);
  return w.subarray(w.length-b.nOut);
 }
}
export function verifyVectors(board,vectors,cycles){
 const c=new Circuit(board),inputBytes=Math.ceil(board.nIn/8),outputBytes=Math.ceil(board.nOut/8);
 let passed=0;
 for(const v of vectors){
  c.reset();const bytes=Uint8Array.from(v.input.replace(/^0x/,'').match(/../g)||[],x=>parseInt(x,16)),expected=v.expectedOut.replace(/^0x/,'').toLowerCase();let got='';
  if(bytes.length!==inputBytes*cycles)throw Error('Invalid vector length');
  for(let tick=0;tick<cycles;tick++){
   const pins=Array.from({length:board.nIn},(_,i)=>(bytes[tick*inputBytes+(i>>3)]>>(i&7))&1),out=c.run(pins);
   for(let byte=0;byte<outputBytes;byte++)got+=numberOf(Array.from(out.subarray(byte*8,byte*8+8))).toString(16).padStart(2,'0');
  }
  if(got!==expected)return {passed,total:vectors.length,pass:false,index:v.index,got,expected};
  passed++;
 }
 return {pass:true,passed,total:vectors.length};
}
export const SENSOR_WIDTHS={distance:6,hp:6,energy:6,guard:6,height:6,right:1,above:1,below:1,grounded:1,threat:1,projectile:1,busy:1,stunned:1,act:6,age:6,confirmed:1,smallCooldown:6,dashCooldown:6};
// Generic evaluator serves independent interfaces; World never falls back to arena pins.
Object.assign(SENSOR_WIDTHS,WORLD_SENSOR_WIDTHS,TARGET_SENSOR_WIDTHS);
export const PORTS=['left','right','jump','down','light','heavy','skill','block','ranged','dash','small','super','up'];
export const SENSOR_REFS=Object.entries(SENSOR_WIDTHS).flatMap(([k,n])=>Array.from({length:n},(_,i)=>`s.${k}.${i}`));
export function portsForGraph(graph){return graph.profile==='world-target'?WORLD_TARGET_PORTS:graph.profile==='world-combat'?[...WORLD_MOVE_PORTS,...WORLD_CONTROL_PORTS,...WORLD_SKILL_PORTS]:PORTS;}
export function validateGraph(graph,catalog){
 if(graph?.profile?.startsWith('world-'))assertWorldInterface(graph);
 // World has 20 equipped skills plus innate attack/guard; full legal loadouts exceed the arena-era cap.
 const maxModules=graph?.profile==='world-combat'?2048:1024;
 if(graph?.version!==1||!Array.isArray(graph.nodes)||graph.nodes.length<1||graph.nodes.length>maxModules||!graph.outputs||typeof graph.outputs!=='object')throw Error('Invalid brain / 1–'+maxModules+' modules required');
 const nodes=new Map(),resolved=new Set(['0','1',...(graph.profile==='world-combat'?WORLD_SENSOR_REFS:graph.profile==='world-target'?TARGET_SENSOR_REFS:SENSOR_REFS)]),order=[],todo=[...graph.nodes];
 for(const n of todo){
  const b=catalog.get(n.taskId);
  if(!/^[a-zA-Z][\w-]{0,47}$/.test(n.id)||nodes.has(n.id)||!b||!Array.isArray(n.inputs)||n.inputs.length!==b.nIn)throw Error(`Invalid module: ${n.id}`);
  nodes.set(n.id,n);
 }
 if(todo.reduce((sum,n)=>sum+catalog.get(n.taskId).ops.length,0)>50000)throw Error('Brain exceeds 50,000 gates');
 while(todo.length){
  const index=todo.findIndex(n=>n.inputs.every(r=>resolved.has(r)));
  if(index<0)throw Error('Unconnected pin or external feedback loop. Use LATCH for memory.');
  const [n]=todo.splice(index,1);order.push(n);
  for(let i=0;i<catalog.get(n.taskId).nOut;i++)resolved.add(`${n.id}.${i}`);
 }
 for(const p of portsForGraph(graph))if(!resolved.has(graph.outputs[p]??'0'))throw Error(`Invalid action wire: ${p}`);
 return order;
}
let boardExecutions=0;
export const circuitExecutions=()=>boardExecutions;
export class Brain{
 constructor(graph,boards){
  this.graph=structuredClone(graph);this.sensorWidths=graph.profile==='world-combat'?WORLD_SENSOR_WIDTHS:graph.profile==='world-target'?TARGET_SENSOR_WIDTHS:SENSOR_WIDTHS;this.catalog=new Map(boards.map(b=>[b.taskId,b]));
  this.order=validateGraph(this.graph,this.catalog);
  this.modules=this.order.map(n=>({node:n,circuit:new Circuit(this.catalog.get(n.taskId)),inputs:new Uint8Array(n.inputs.length)}));
  this.values=new Map([['0',0],['1',1]]);this.ticks=0;this.totalGates=0;
  this.gates=this.modules.reduce((a,m)=>a+m.circuit.b.ops.length,0);
  this.latches=this.modules.reduce((a,m)=>a+m.circuit.b.nState,0);
 }
 reset(){this.modules.forEach(m=>{m.circuit.reset();m.inputs.fill(0);});this.ticks=0;this.totalGates=0;this.values.clear();this.values.set('0',0);this.values.set('1',1);}
 run(sensors){
  for(const [name,width]of Object.entries(this.sensorWidths))for(let i=0;i<width;i++)this.values.set(`s.${name}.${i}`,((sensors[name]||0)>>>i)&1);
  for(const m of this.modules){
   m.node.inputs.forEach((r,i)=>m.inputs[i]=this.values.get(r));
   const out=m.circuit.run(m.inputs);out.forEach((v,i)=>this.values.set(`${m.node.id}.${i}`,v));
  }
  const actions={};for(const p of portsForGraph(this.graph))actions[p]=this.values.get(this.graph.outputs[p]??'0');
  this.ticks++;this.totalGates+=this.gates;boardExecutions+=this.modules.length;return actions;
 }
}
