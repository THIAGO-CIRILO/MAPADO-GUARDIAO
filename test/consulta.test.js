'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Entrada=require('../consulta-entrada.js');
const {paginas}=require('../consulta-modelo.js');
const {AREA_KEYS,schemas,validarEntrada,validarParte}=require('../api/_consulta.js');
const {renderConsulta}=require('../api/_consulta_pdf.js');
const {entrada,partes,mapa}=require('./consulta-fixture.js');
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
 assert.equal(pa[2].blocks[0].body,entrada.questao);
 assert.notEqual(pa[2].blocks[0].body,pb[2].blocks[0].body);
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
 const source=partes();let saved,calls=0,lastPayload,allowed=true;
 global.fetch=async(url,options={})=>{
  if(url.endsWith('/auth/v1/user'))return new Response(JSON.stringify({id:'u1',email:'ana@example.invalid'}));
  if(url.endsWith('/tem_acesso_guardiao'))return new Response(JSON.stringify(allowed));
  if(url.endsWith('/recuperar_assinatura_guardiao'))return new Response('null');
  if(url.endsWith('/iniciar_fase_guardiao'))return new Response(JSON.stringify({estado:'reservada'}));
  if(url.endsWith('/concluir_fase_guardiao')){saved=JSON.parse(options.body);return new Response('true');}
  if(url.endsWith('/liberar_fase_guardiao'))return new Response('true');
  if(url.includes('api.anthropic.com')){calls++;lastPayload=JSON.parse(options.body);return new Response(JSON.stringify({content:[{type:'text',text:JSON.stringify(source.c)}],stop_reason:'end_turn'}));}
  throw new Error('Unexpected URL '+url);
 };
 const body={fase:'c',teste:{versao_consulta:2,contexto_atual:entrada,objetivo_da_pessoa:entrada.questao,respostas:[{pergunta:'Exemplo',resposta:'Minha resposta exata'}]},dossier:{areas:AREA_KEYS.map((k,i)=>({casa:i+1,area:k})),mapa_natal:{posicoes:{Sol:'Touro'}},numerologia:{numero_natal:3}},dadosCiclos:{nascimento:'1990-05-15',referencia:'2026-11-02'}};
 const run=async b=>{let status=200,value;const res={setHeader(){},status(n){status=n;return this;},json(v){value=v;return this;}};await handler({method:'POST',headers:{authorization:'Bearer fake-token'},body:b},res);return {status,value};};
 try{
  let result=await run(body);assert.equal(result.status,200);assert.equal(saved.p_parte.versao_consulta,2);assert.equal(Object.keys(saved.p_parte.areas_vida).length,12);
  for(const text of Object.values(entrada))assert.ok(lastPayload.messages[0].content.includes(text));
  assert.ok(lastPayload.messages[0].content.includes('Minha resposta exata'));
  assert.equal(Object.keys(lastPayload.output_config.format.schema.properties.areas_vida.properties).length,12);
  allowed=false;const before=calls;result=await run(body);assert.equal(result.status,403);assert.equal(calls,before);
  result=await run({...body,teste:{...body.teste,contexto_atual:{}}});assert.equal(result.status,400);
  assert.ok(validarParte({areas_vida:{}},'c'));
  assert.ok(validarParte({tabela_consulta:[]},'e'));
 }finally{global.fetch=originalFetch;process.env=oldEnv;}
});
