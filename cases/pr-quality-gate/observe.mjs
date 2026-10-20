/** Fictional, sanitized observability reference, independent of production n8n. */
export function classifyTransportFailure(response={}) {
 const code=Number(response.statusCode??response.error?.statusCode??0);
 const msg=String(response.error?.message??response.message??'').slice(0,500).toLowerCase();
 const net=String(response.error?.code??response.code??'').toLowerCase();
 if(code===429||/rate.?limit|too many requests/.test(msg))return 'rate_limit';
 if(code===401||/bad credentials|unauthorized/.test(msg))return 'authentication';
 if(code===403||/forbidden|permission denied/.test(msg))return 'permission';
 if(code===404||/not found/.test(msg))return 'not_found';
 if(code===408||code===504||/timeout|timed out|etimedout/.test(msg+net))return 'timeout';
 if(code>=500&&code<600)return 'server_error';
 if(/econnreset|econnrefused|enotfound|eai_again/.test(msg+net))return 'network';
 return response.error||code>=400?'api_error':null;
}
/** Emits only summaries, never response bodies or raw messages. */
export function summarizeObservability(probes,verdict) {
 const sources=probes.map(({source,required,skipped,executed,response})=>{
  if(skipped)return {source,required,state:'skipped',category:null};
  if(!executed)return {source,required,state:'missing',category:'execution_missing'};
  const category=classifyTransportFailure(response);
  return {source,required,state:category?'error':'ok',category};
 });
 const apiErrorCount=sources.filter(x=>x.state==='error').length;
 const requiredFailures=sources.filter(x=>x.required&&['error','missing'].includes(x.state));
 return {status:verdict,health:requiredFailures.length?'indisponivel':apiErrorCount?'degradado':'ok',
 apiErrorCount,reviewRequired:verdict==='PENDENTE'||requiredFailures.length>0,sources};
}
