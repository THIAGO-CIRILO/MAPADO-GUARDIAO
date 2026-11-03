'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {entrada,partes,mapa}=require('./consulta-fixture.js');
const handler=require('../api/atualizar-sintese.js');
const job='11111111-1111-4111-8111-111111111111',token='a'.repeat(64);
const run=async body=>{let status=200,value;await handler({method:'POST',body},{setHeader(){},status(n){status=n;return this;},json(v){value=v;return this;}});return {status,value};};
test('atualização exige job autorizado e publica somente a síntese, preservando o mapa',async()=>{
 const old={...process.env},original=global.fetch,calls=[],m=mapa();delete m.resultado.sintese_respostas;
 const snapshot=structuredClone(m);let allowed=true,ready=false,override;
 Object.assign(process.env,{SUPABASE_URL:'https://db.invalid',SUPABASE_ANON_KEY:'public-test',ANTHROPIC_API_KEY:'test-key',BIBLIOTECA_RPC_SECRET:'library-test'});
 global.fetch=async(url,opt={})=>{
  const body=JSON.parse(opt.body);calls.push({url,body});
  if(url.endsWith('/guardiao_processar_sintese_salva')){
   if(!allowed)return new Response('{}',{status:403});
   if(body.p_acao==='iniciar')return new Response(JSON.stringify(ready?{estado:'concluido'}:{estado:'reservada',mapa:m,contexto:{teste:{versao_consulta:2,contexto_atual:entrada,guardiao_principal:{nome:'Perfeccionismo'},respostas:[{resposta:'Adio a publicação.'}]},dossier:{areas:Array(12).fill({})},dadosCiclos:{nascimento:'1990-05-15',referencia:'2026-11-02'}}}));
   return new Response(JSON.stringify({estado:body.p_acao==='concluir'?'concluido':'liberada'}));
  }
  if(url.endsWith('/biblioteca_buscar_contexto'))return new Response(JSON.stringify([{trecho_id:1,titulo:'Códigos Guardiões',autor:'Thiago Cervi',categoria:'metodo',pagina:9,trecho:'Exemplo de proteção e gesto concreto.'}]));
  if(url.includes('api.anthropic.com'))return new Response(JSON.stringify({content:[{type:'text',text:JSON.stringify(override||partes().d)}],stop_reason:'end_turn'}));
  throw Error('URL inesperada');
 };
 try{
  assert.equal((await run({job,token:'curto'})).status,401);assert.equal(calls.length,0);
  allowed=false;assert.equal((await run({job,token})).status,401);assert.ok(!calls.some(x=>x.url.includes('anthropic')));
  allowed=true;calls.length=0;assert.equal((await run({job,token})).status,200);
  const publish=calls.find(x=>x.body.p_acao==='concluir');assert.deepEqual(Object.keys(publish.body.p_resultado).sort(),['objetivo','sintese_respostas']);assert.deepEqual(m,snapshot);
  const payload=calls.find(x=>x.url.includes('anthropic')).body;assert.ok(payload.messages[0].content.includes('Códigos Guardiões'));
  for(const t of Object.values(entrada))assert.ok(payload.messages[0].content.includes(t));
  assert.ok(payload.messages[0].content.includes(m.resultado.areas_vida.carreira.texto));
  calls.length=0;ready=true;assert.equal((await run({job,token})).value.reutilizada,true);assert.ok(!calls.some(x=>x.url.includes('anthropic')));
  ready=false;calls.length=0;override={...partes().d,sintese_respostas:{}};assert.equal((await run({job,token})).status,503);
  assert.ok(calls.some(x=>x.body.p_acao==='liberar'));assert.ok(!calls.some(x=>x.body.p_acao==='concluir'));
 }finally{process.env=old;global.fetch=original;}
});
