import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {Circuit,Brain,verifyVectors} from '../src/circuits/circuit.mjs';
import {compileTargetBrain} from '../src/circuits/world-target-brain.mjs';
import {catalog,makeBrain,safeSensors,selected} from '../examples/fixture.mjs';

for(const b of catalog.boards)test(`FabX #${b.taskId}: netlist bytes, SHA-256 and 256 recorded official vectors`,()=>{
 const bytes=Buffer.from(b.netlist.slice(2),'hex');
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),b.sha256);
 const decoded=[];for(let p=0;p<bytes.length;){const op=bytes[p++],n=op===0?2:op===1?1:0;assert(n);const row=[op];for(let j=0;j<n;j++,p+=3)row.push(bytes.readUIntBE(p,3));decoded.push(row);}
 assert.deepEqual(decoded,b.ops);
 const v=JSON.parse(fs.readFileSync(new URL(`../data/vectors/${b.taskId}.json`,import.meta.url)));
 assert.equal(v.root,b.root);assert.equal(v.vectors.length,256);assert.deepEqual(verifyVectors(b,v.vectors,b.cycles),{pass:true,passed:256,total:256});
});
test('real gates change requested actions when health and danger change',()=>{
 for(const [change,want] of [[{},'strike'],[{wHp:20},'heal'],[{wDanger:1,wEvadePosition:1},'dodge']]){
  const b=makeBrain();b.reset();assert.deepEqual(selected(b.run({...safeSensors(),...change}),['strike','heal','dodge']),[want]);
 }
});
test('reordering equipped skills preserves semantic heal choice',()=>{
 for(const slots of [['strike','heal','dodge'],['dodge','strike','heal']]){
  const b=makeBrain(slots);b.reset();assert.deepEqual(selected(b.run({...safeSensors(),wHp:20}),slots),['heal']);
 }
});
test('unready healing cannot be requested, and a stunned character requests no skill',()=>{
 const b=makeBrain();b.reset();assert.equal(b.run({...safeSensors(),wHp:20,wReady1:0}).wSkill1,0);
 assert.deepEqual(selected(b.run({...safeSensors(),wStunned:1}),['strike','heal','dodge']),[]);
});
test('survival memory uses separate LATCH state per character',()=>{
 const a=makeBrain(),b=makeBrain();a.reset();b.reset();
 assert.equal(a.run({...safeSensors(),wLeader:1,wHp:20}).wSurvive,1);
 assert.equal(a.run({...safeSensors(),wLeader:1,wHp:31}).wSurvive,1);
 assert.equal(b.run({...safeSensors(),wLeader:1,wHp:31}).wSurvive,0);
 assert.equal(a.run({...safeSensors(),wLeader:1,wHp:50}).wSurvive,0);
});
test('target comparator network can select nearest or weak target',()=>{
 const s={e0Valid:1,e0Distance:8,e1Valid:1,e1Distance:40,e1Low:1};
 const a=new Brain(compileTargetBrain(0,'nearest'),catalog.boards),b=new Brain(compileTargetBrain(0,'weakest'),catalog.boards);
 assert.equal(a.run(s).wPick0,1);assert.equal(b.run(s).wPick1,1);
});
test('invalid gate references and external graph feedback are rejected',()=>{
 assert.throws(()=>new Circuit({...catalog.boards[0],ops:[[0,999999,0]]}));
 const b=makeBrain(),g=structuredClone(b.graph);g.nodes[0].inputs[0]=`${g.nodes[0].id}.0`;
 assert.throws(()=>new Brain(g,catalog.boards),/feedback/);
});
