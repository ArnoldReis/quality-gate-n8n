import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyTransportFailure as failure,summarizeObservability as observe} from './observe.mjs';
test('rate limit',()=>assert.equal(failure({statusCode:429}),'rate_limit'));
test('permission denied',()=>assert.equal(failure({statusCode:403}),'permission'));
test('timeout',()=>assert.equal(failure({error:{code:'ETIMEDOUT'}}),'timeout'));
test('server failure',()=>assert.equal(failure({statusCode:503}),'server_error'));
test('successful response',()=>assert.equal(failure({statusCode:200}),null));
test('skipped optional scan',()=>assert.equal(observe([{source:'scanner',required:false,skipped:true}], 'APROVADO').apiErrorCount,0));
test('mandatory call missing',()=>{
 const x=observe([{source:'ci',required:true,executed:false}],'PENDENTE');
 assert.equal(x.health,'indisponivel');assert.equal(x.reviewRequired,true);
});
test('optional failure degrades status without blocking gate',()=>{
 const x=observe([{source:'ci',required:true,executed:true,response:{}},{source:'scanner',required:false,executed:true,response:{statusCode:429}}],'APROVADO');
 assert.equal(x.health,'degradado');assert.equal(x.reviewRequired,false);
});
test('secret from response is never stored',()=>{
 const x=observe([{source:'ci',required:true,executed:true,response:{error:{message:'Bearer SAMPLE_SECRET'}}}],'PENDENTE');
 assert.ok(!JSON.stringify(x).includes('SAMPLE_SECRET'));
});
