'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Entrada=require('../consulta-entrada.js');
const {paginas}=require('../consulta-modelo.js');
const {AREA_KEYS,schemas,validarEntrada,validarParte}=require('../api/_consulta.js');
const {renderConsulta}=require('../api/_consulta_pdf.js');
const {entrada,complementares,partes,mapa}=require('./consulta-fixture.js');
test('entrada mantém as palavras e calcula AP-22 com data válida',()=>{
 assert.deepEqual(Entrada.contexto(entrada),entrada);
 assert.deepEqual(Entrada.validar(entrada),[]);
 assert.equal(Entrada.arcanoPessoal('1990-05-15').numero,3);
 assert.equal(Entrada.arcanoPessoal('1990-02-31'),null);
 assert.equal(validarEntrada({contexto_atual:{questao:'Oi'}})!==null,true);
 assert.equal(Object.keys(schemas.c.properties.areas_vida.properties).length,12);
});
test('modelo tem 20 páginas, 12 áreas, seis cenas e contexto próprio de cada cliente',()=>{
 const a=mapa(),b=mapa();b.resultado.entrada_consulta.questao='Quero renegociar uma responsabilidade na empresa da família.';
 const pa=paginas(a),pb=paginas(b);
 assert.equal(pa.length,20);assert.equal(pb.length,20);
 assert.equal(pa[0].blocks[0].label,a.resultado.lugar_potencia.titulo);
 assert.equal(pa[0].promessa.destaque,'a sua energia rende mais e custa menos.');
 const antiga=mapa();delete antiga.resultado.lugar_potencia;assert.equal(paginas(antiga)[0].blocks[0].label,antiga.potencial);
 assert.equal(pa[2].blocks[0].body,a.resultado.sintese_respostas.questao);
 assert.equal(pa[2].blocks[0].original,entrada.questao);
 assert.equal(pa[2].title,'Síntese das suas respostas');
 assert.equal(pa[2].intro,a.resultado.objetivo.leitura);
 assert.ok(!JSON.stringify(pa).includes('Consulte a área ligada à sua pergunta'));
 assert.notEqual(pa[2].blocks[0].original,pb[2].blocks[0].original);
 assert.equal(pa.slice(6,12).reduce((s,x)=>s+x.blocks.length,0),12);
 assert.equal(pa[14].table.rows.length+pa[15].table.rows.length,6);
 assert.equal(pa[12].table.rows.length,6);assert.equal(pa[13].table.rows.length,6);
 const monthRows=pa.filter(p=>p.table?.headers[0]==='Mês').flatMap(p=>p.table.rows);
 assert.equal(monthRows.length,12);assert.equal(new Set(monthRows.map(row=>row[0])).size,12);
 assert.ok(!JSON.stringify(pa).includes('Cinco minutos antes da leitura'));
 assert.ok(!JSON.stringify(pa).includes('Primeiro minuto'));
 for(const row of pa[1].table.rows)assert.ok(row[1]>=3&&row[1]<=20);
 assert.equal(pa[18].table.rows.length,7);
});
test('PDF real tem 20 páginas e mantém a questão e a fonte serifada',async()=>{
 const pdf=await renderConsulta(mapa(),{nome:'Outro nome no perfil'});
 fs.mkdirSync('qa',{recursive:true});fs.writeFileSync('qa/consulta-servidor.pdf',pdf);
 assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
 const raw=pdf.toString('latin1');
 assert.equal((raw.match(/\/Type \/Page\b/g)||[]).length,20);
 assert.match(raw,/InstrumentSerif/);assert.match(raw,/Figtree/);
});
test('gerador envia todo contexto, mantém autorização e grava a versão nova',async()=>{
 const handler=require('../api/gerar.js');
 const originalFetch=global.fetch,oldEnv={...process.env};
 Object.assign(process.env,{SUPABASE_URL:'https://test.invalid',SUPABASE_ANON_KEY:'public-test',ANTHROPIC_API_KEY:'test-key'});delete process.env.BIBLIOTECA_RPC_SECRET;
 const source=partes();let saved,calls=0,lastPayload,allowed=true,override=null,released=0;
 global.fetch=async(url,options={})=>{
  if(url.endsWith('/auth/v1/user'))return new Response(JSON.stringify({id:'u1',email:'ana@example.invalid'}));
  if(url.endsWith('/tem_acesso_guardiao'))return new Response(JSON.stringify(allowed));
  if(url.endsWith('/recuperar_assinatura_guardiao'))return new Response('null');
  if(url.endsWith('/iniciar_fase_guardiao'))return new Response(JSON.stringify({estado:'reservada'}));
  if(url.endsWith('/concluir_fase_guardiao')){saved=JSON.parse(options.body);return new Response('true');}
  if(url.endsWith('/liberar_fase_guardiao')){released++;return new Response('true');}
  if(url.includes('api.anthropic.com')){calls++;lastPayload=JSON.parse(options.body);const fields=lastPayload.output_config.format.schema.properties;return new Response(JSON.stringify({content:[{type:'text',text:JSON.stringify(override||(fields.lugar_potencia?source.b:fields.meses?source.f:fields.objetivo?source.d:source.c))}],stop_reason:'end_turn'}));}
  throw new Error('Unexpected URL '+url);
 };
 const body={fase:'c',teste:{versao_consulta:2,contexto_atual:entrada,contextos_complementares:complementares,objetivo_da_pessoa:entrada.questao,respostas:[{pergunta:'Exemplo',resposta:'Minha resposta exata'}]},dossier:{areas:AREA_KEYS.map((k,i)=>({casa:i+1,area:k})),mapa_natal:{posicoes:{Sol:'Touro'}},numerologia:{numero_natal:3}},dadosCiclos:{nascimento:'1990-05-15',referencia:'2026-11-02'}};
 const run=async b=>{let status=200,value;const res={setHeader(){},status(n){status=n;return this;},json(v){value=v;return this;}};await handler({method:'POST',headers:{authorization:'Bearer fake-token'},body:b},res);return {status,value};};
 try{
  let result=await run(body);assert.equal(result.status,200);assert.equal(saved.p_parte.versao_consulta,2);assert.equal(Object.keys(saved.p_parte.areas_vida).length,12);
  for(const text of Object.values(entrada))assert.ok(lastPayload.messages[0].content.includes(text));
  assert.ok(lastPayload.messages[0].content.includes('Minha resposta exata'));
  assert.equal(Object.keys(lastPayload.output_config.format.schema.properties.areas_vida.properties).length,12);
  for(const item of Object.values(complementares))assert.ok(lastPayload.messages[0].content.includes(item.resposta));
  result=await run({...body,fase:'b'});assert.equal(result.status,200);assert.deepEqual(saved.p_parte.lugar_potencia,source.b.lugar_potencia);assert.deepEqual(saved.p_parte.contextos_complementares,complementares);
  result=await run({...body,fase:'f'});assert.equal(result.status,200);assert.equal(saved.p_parte.meses.length,12);assert.deepEqual(saved.p_parte.contextos_complementares,complementares);assert.ok(lastPayload.messages[0].content.includes('Ajuste as ações mensais ao ritmo'));
  const leituraGerada={...source.a,...source.b,...source.c,...source.e,...source.f,nota_interna:'NAO_ENVIAR_ESSE_CAMPO'};
  result=await run({...body,fase:'d',leituraGerada});assert.equal(result.status,200);assert.deepEqual(saved.p_parte.objetivo,source.d.objetivo);assert.deepEqual(saved.p_parte.sintese_respostas,source.d.sintese_respostas);
  for(const row of source.e.tabela_consulta)assert.ok(lastPayload.messages[0].content.includes(row.situacao));
  assert.ok(lastPayload.messages[0].content.includes(source.c.areas_vida.carreira.texto));
  assert.ok(lastPayload.messages[0].content.includes(source.f.meses[11].titulo));
  assert.ok(!lastPayload.messages[0].content.includes('NAO_ENVIAR_ESSE_CAMPO'));
  const previousSave=saved;
  override={...source.d,objetivo:{leitura:'Consulte a área ligada à sua pergunta e escolha uma aplicação possível.',proximo_passo:'Observe sua vida e escolha um passo que faça sentido para você.'}};
  result=await run({...body,fase:'d'});assert.equal(result.status,502);assert.equal(saved,previousSave,'Uma resposta genérica não deve ser gravada.');assert.equal(released,1,'A reserva deve ser liberada para permitir tentar novamente.');override=null;
  result=await run({...body,teste:{...body.teste,contextos_complementares:{ritmo:{resposta:'Outra resposta'}}}});assert.equal(result.status,400);
  allowed=false;const before=calls;result=await run(body);assert.equal(result.status,403);assert.equal(calls,before);
  result=await run({...body,teste:{...body.teste,contexto_atual:{}}});assert.equal(result.status,400);
  assert.ok(validarParte({areas_vida:{}},'c'));
  assert.ok(validarParte({tabela_consulta:[]},'e'));
 }finally{global.fetch=originalFetch;process.env=oldEnv;}
});

test('perguntas complementares preservam rascunhos antigos e só aceitam escolhas previstas',()=>{
 const C=require('../consulta-contexto.js');
 assert.equal(C.versaoRascunho({ans:{}}),1);
 assert.equal(C.versaoRascunho({ans:{0:0,1:2},flowVersion:2}),0);
 assert.equal(C.versaoRascunho({ans:{0:0},contextoVersion:1}),1);
 assert.equal(C.validar(complementares).length,0);
 assert.equal(C.validar({ritmo:{resposta:'Diagnóstico inventado'}}).length,3);
});
