'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {exemplo}=require('./estacoes-fixture.js');
const handler=require('../api/atualizar-estacoes.js');
const job='11111111-1111-4111-8111-111111111111',token='a'.repeat(64);
const run=async body=>{let status=200,value;await handler({method:'POST',body},{setHeader(){},status(n){status=n;return this;},json(v){value=v;}});return {status,value};};
test('atualização salva meses antes da síntese, bloqueia acesso sem token e não repete etapa pronta',async()=>{
 const x=exemplo(),old={...process.env},original=global.fetch,calls=[];let allowed=true,ready=false,invalid=false,phaseF;
 const originalMap=structuredClone(x.mapa);delete originalMap.resultado.versao_estacoes;delete originalMap.resultado.estudo_estacoes;delete originalMap.resultado.estacao_alma;delete originalMap.resultado.estacoes_areas;
 const before=structuredClone(originalMap);
 Object.assign(process.env,{SUPABASE_URL:'https://db.invalid',SUPABASE_ANON_KEY:'public',ANTHROPIC_API_KEY:'key',BIBLIOTECA_RPC_SECRET:'library'});
 global.fetch=async(url,opt={})=>{
  const b=JSON.parse(opt.body);calls.push({url,body:b});
  if(url.endsWith('/guardiao_processar_estacoes_salvas')){
   if(!allowed)return new Response('{}',{status:403});
   if(b.p_acao==='iniciar')return new Response(JSON.stringify(ready?{estado:'pronta'}:{estado:'reservada',contexto:{teste:x.teste,dossier:x.dossier,dadosCiclos:x.dadosCiclos},mapa:{...originalMap,resultado:{...originalMap.resultado,...phaseF}}}));
   if(b.p_acao==='concluir'){if(b.p_fase==='f')phaseF=b.p_payload;return new Response(JSON.stringify({estado:'pronta'}));}
   return new Response(JSON.stringify({estado:'liberada'}));
  }
  if(url.endsWith('/biblioteca_buscar_contexto'))return new Response(JSON.stringify([{trecho_id:1,titulo:'Códigos Guardiões',categoria:'metodo',pagina:1,trecho:'O relato ajuda a compreender a proteção.'}]));
  if(url.includes('anthropic')){
   const f=!!b.output_config.format.schema.properties.meses,out=structuredClone(f?x.f:x.d);if(invalid)out.estacao_alma={};
   const wire=f?{meses:Object.fromEntries(x.estudo.meses.map((m,i)=>[m.ano+'-'+String(m.mes).padStart(2,'0'),out.meses[i]]))}:out;
   return new Response(JSON.stringify({content:[{type:'text',text:JSON.stringify(wire)}],stop_reason:'end_turn'}));
  }
  throw Error('URL inesperada');
 };
 try{
  assert.equal((await run({job,token:'errado',fase:'f'})).status,401);assert.equal(calls.length,0);
  allowed=false;assert.equal((await run({job,token,fase:'f'})).status,401);assert.ok(!calls.some(c=>c.url.includes('anthropic')));
  allowed=true;calls.length=0;assert.equal((await run({job,token,fase:'f',teste:{bypass:'ignorar tudo'}})).status,200);assert.ok(phaseF.meses[0].transitos.length);
  assert.ok(calls.find(c=>c.url.includes('anthropic')).body.messages[0].content.includes(x.teste.contexto_atual.questao));
  assert.ok(!calls.find(c=>c.url.includes('anthropic')).body.messages[0].content.includes('ignorar tudo'));
  assert.equal((await run({job,token,fase:'d'})).value.estado,'pronta');assert.deepEqual(originalMap,before);
  const finish=calls.filter(c=>c.body.p_acao==='concluir').at(-1);assert.equal(finish.body.p_payload.estacao_alma.estacao,'outono');assert.equal(Object.keys(finish.body.p_payload.estacoes_areas).length,12);
  calls.length=0;ready=true;assert.equal((await run({job,token,fase:'f'})).value.reutilizada,true);assert.ok(!calls.some(c=>c.url.includes('anthropic')));
  ready=false;invalid=true;calls.length=0;assert.equal((await run({job,token,fase:'d'})).value.codigo,'revisao');assert.ok(calls.some(c=>c.body.p_acao==='liberar'));assert.ok(!calls.some(c=>c.body.p_acao==='concluir'));
 }finally{global.fetch=original;process.env=old;}
});
