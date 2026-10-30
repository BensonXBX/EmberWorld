import {bitArray} from './circuit.mjs';
// Composes catalog NAND netlists. No tactical predicate is evaluated in JS here.
export function worldLogic(prefix='w'){
 const nodes=[];let serial=0;
 const add=(taskId,inputs,label)=>{const id=prefix+(++serial);nodes.push({id,taskId,inputs,label});return i=>`${id}.${i}`;};
 const not=x=>add(1,[x],'NOT')(0),and=(a,b)=>add(3,[a,b],'AND')(0),or=(a,b)=>add(4,[a,b],'OR')(0),all=(...xs)=>xs.reduce(and,'1');
 const pin=k=>'s.'+k+'.0',bits=(key,width)=>Array.from({length:width},(_,i)=>`s.${key}.${i}`),constant=(v,n)=>bitArray(v,n).map(String);
 const compare=(a,b,op='gt')=>{let v='0';for(let i=0;i<a.length;i+=2){const c=add(21,[a[i],a[i+1]||'0',b[i],b[i+1]||'0'],'unsigned '+op);v=or(c(op==='lt'?0:2),and(c(1),v));}return v;};
 const cmp=(key,val,op)=>compare(bits(key,6),constant(val,6),op);
 const mux=(a,b,s)=>add(9,[a,b,s],'select bus bit')(0);
 const priority=conditions=>{
  const result=[];let used='0';
  for(let start=0;start<conditions.length;start+=8){const bank=conditions.slice(start,start+8),enc=add(46,[...bank,...Array(8-bank.length).fill('0')],'candidate priority bank'),dec=add(47,[enc(0),enc(1),enc(2),enc(3)],'candidate decoder');
   bank.forEach((_,i)=>result.push(all(dec(i),not(used))));used=or(used,enc(3));}
  return result;
 };
 return {nodes,add,not,and,or,all,pin,bits,constant,compare,cmp,mux,priority};
}
