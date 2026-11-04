'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {exemplo}=require('./estacoes-fixture.js');
test('geração usa efemérides, busca os trânsitos nos livros e salva mês e estação com as referências',async()=>{
 const old={...process.env},original=global.fetch,x=exemplo(),calls=[];let saved,release=0,invalid=false;
 Object.assign(process.env,{SUPABASE_URL:'https://db.invalid',SUPABASE_ANON_KEY:'public',ANTHROPIC_API_KEY:'key',BIBLIOTECA_RPC_SECRET:'secret',VERCEL_ENV:'production'});
 global.fetch=async(url,opt={})=>{
  const b=opt.body?JSON.parse(opt.body):{};calls.push({url,body:b});
  if(url.endsWith('/auth/v1/user'))return new Response(JSON.stringify({id:'user-test',email:'example@example.invalid'}));
  if(url.endsWith('/tem_acesso_guardiao'))return new Response('true');
  if(url.endsWith('/recuperar_assinatura_guardiao'))return new Response('null');
  if(url.endsWith('/iniciar_fase_guardiao'))return new Response(JSON.stringify({estado:'reservada'}));
  if(url.endsWith('/concluir_fase_guardiao')){saved=b;return new Response('true');}
  if(url.endsWith('/liberar_fase_guardiao')){release++;return new Response('true');}
  if(url.endsWith('/biblioteca_buscar_contexto'))return new Response(JSON.stringify([{trecho_id:1,titulo:'Códigos Guardiões',autor:'Thiago Cervi',categoria:'metodo',pagina:1,trecho:'Interpretar a proteção junto do contexto da pessoa.'}]));
  if(url.includes('api.anthropic.com')){
   const f=b.output_config.format.schema.properties.meses;const out=structuredClone(f?x.f:x.d);
   if(invalid&&f)out.meses[0].base_ids=['transito-inventado','num-2026-11'];
   const wire=f?{meses:Object.fromEntries(x.estudo.meses.map((m,i)=>[m.ano+'-'+String(m.mes).padStart(2,'0'),out.meses[i]]))}:out;
   return new Response(JSON.stringify({content:[{type:'text',text:JSON.stringify(wire)}],stop_reason:'end_turn'}));
  }
  throw Error('URL inesperada');
 };
 const handler=require('../api/gerar.js');
 const run=async fase=>{let status=200,value;await handler({method:'POST',headers:{authorization:'Bearer test'},body:{fase,teste:x.teste,dossier:x.dossier,dadosCiclos:x.dadosCiclos,...(fase==='d'?{leituraGerada:x.mapa.resultado}:{})}},{setHeader(){},status(n){status=n;return this;},json(v){value=v;}});return {status,value};};
 try{
  assert.equal((await run('f')).status,200);assert.equal(saved.p_parte.versao_estacoes,1);assert.equal(saved.p_parte.meses.length,12);assert.equal(saved.p_parte.meses[0].mes,11);assert.equal(saved.p_parte.meses[0].estacao,'outono');assert.ok(saved.p_parte.meses[0].transitos.length);
  const llm=calls.find(c=>c.url.includes('anthropic')).body;
  assert.ok(llm.messages[0].content.includes('Astronomy Engine 2.1.19'));assert.ok(llm.messages[0].content.includes(x.estudo.transitos[0].id));
  assert.ok(calls.some(c=>c.url.endsWith('/biblioteca_buscar_contexto')&&/Júpiter|Saturno/.test(c.body.p_consulta)));
  const month=llm.output_config.format.schema.properties.meses.properties['2026-11'];
  assert.ok(month.properties.estacao.enum.includes('inverno'));assert.ok(month.properties.base_ids.items.enum.includes('num-2026-11'));assert.ok(!month.properties.base_ids.items.enum.includes('num-2026-12'));
  assert.equal((await run('d')).status,200);assert.equal(saved.p_parte.estacao_alma.estacao,'outono');assert.equal(saved.p_parte.estudo_estacoes.versao,1);assert.equal(Object.keys(saved.p_parte.estacoes_areas).length,12);
  const prior=saved;invalid=true;assert.equal((await run('f')).status,502);assert.equal(saved,prior);assert.equal(release,1);
 }finally{global.fetch=original;process.env=old;}
});
