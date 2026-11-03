'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {consultasBibliograficas,obterContextoBibliografico}=require('../api/_biblioteca.js');
const {entrada,complementares,partes}=require('./consulta-fixture.js');
const teste={versao_consulta:2,guardiao_principal:{nome:'Perfeccionismo'},potencial_principal:{nome:'Expressão'},contexto_atual:entrada,contextos_complementares:complementares,respostas:[{pergunta:'Como você reage?',resposta:'Adio a publicação por medo de errar.'}]};
test('busca muda com o pedido e com as alternativas e mantém a base do método',()=>{
 const original=structuredClone(teste),a=consultasBibliograficas('d',teste);
 const viagem={...teste,contexto_atual:{questao:'Quero viajar sem depender da aprovação do meu pai.',desejo:'Decidir a viagem com os recursos que tenho.'},respostas:[{resposta:'Tenho dificuldade de descansar.'}]};
 const b=consultasBibliograficas('d',viagem);
 assert.notDeepEqual(a,b);
 assert.ok(a.some(x=>x.p_categoria==='metodo'&&x.p_consulta.includes('Perfeccionismo')));
 assert.ok(b.some(x=>x.p_consulta.includes('autonomia')));
 assert.ok(b.some(x=>x.p_consulta.includes('descanso')));
 assert.ok(a.some(x=>x.p_categoria===null));
 assert.ok(a.every(x=>x.p_consulta.length<=180));assert.deepEqual(teste,original);
 assert.deepEqual(consultasBibliograficas('inexistente',teste),[]);
});
test('trechos privados entram na geração, sem misturar duas passagens da mesma página',async()=>{
 const original=global.fetch,old={...process.env};
 Object.assign(process.env,{SUPABASE_URL:'https://db.invalid',SUPABASE_ANON_KEY:'public-test',BIBLIOTECA_RPC_SECRET:'private-test-only'});
 const calls=[];
 global.fetch=async(url,options)=>{const q=JSON.parse(options.body);calls.push(q);assert.ok(url.endsWith('/biblioteca_buscar_contexto'));
  return new Response(JSON.stringify(q.p_categoria==='metodo'?[
   {trecho_id:1,titulo:'Códigos Guardiões',autor:'Thiago Cervi',categoria:'metodo',pagina:9,ordem:0,trecho:'A proteção preserva um recurso e pode ganhar outra resposta.'},
   {trecho_id:2,titulo:'Códigos Guardiões',autor:'Thiago Cervi',categoria:'metodo',pagina:9,ordem:1,trecho:'Uma segunda passagem da mesma página explica o gesto possível.'}
  ]:[{trecho_id:3,titulo:'Obra de apoio',categoria:'ciclos',pagina:30,ordem:0,trecho:'Os ciclos são usados como uma referência simbólica.'}]));
 };
 try{
  const context=await obterContextoBibliografico('d',teste);
  assert.ok(context.includes('Códigos Guardiões — Thiago Cervi'));
  assert.ok(context.includes('Uma segunda passagem'));assert.ok(context.includes('Obra de apoio'));
  assert.equal((context.match(/A proteção preserva/g)||[]).length,1);
  assert.ok(!context.includes('private-test-only'));
  assert.ok(calls.some(x=>x.p_consulta.includes('Perfeccionismo')));
  const handler=require('../api/gerar.js');let prompt,closed;
  Object.assign(process.env,{ANTHROPIC_API_KEY:'test-key'});
  const libraryFetch=global.fetch;
  global.fetch=async(url,opt={})=>{
   if(url.includes('/biblioteca_buscar_contexto'))return libraryFetch(url,opt);
   if(url.endsWith('/auth/v1/user'))return new Response(JSON.stringify({id:'test-user',email:'example@example.invalid'}));
   if(url.endsWith('/tem_acesso_guardiao'))return new Response('true');
   if(url.endsWith('/recuperar_assinatura_guardiao'))return new Response('null');
   if(url.endsWith('/iniciar_fase_guardiao'))return new Response(JSON.stringify({estado:'reservada'}));
   if(url.endsWith('/concluir_fase_guardiao')){closed=JSON.parse(opt.body);return new Response('true');}
   if(url.includes('api.anthropic.com')){prompt=JSON.parse(opt.body).messages[0].content;return new Response(JSON.stringify({content:[{type:'text',text:JSON.stringify(partes().d)}],stop_reason:'end_turn'}));}
   throw Error('URL inesperada');
  };
  let status=200;const res={setHeader(){},status(n){status=n;return this;},json(v){this.value=v;}};
  await handler({method:'POST',headers:{authorization:'Bearer fake-test'},body:{fase:'d',teste,dossier:{areas:Array(12).fill({}),numerologia:{}},dadosCiclos:{nascimento:'1990-05-15',referencia:'2026-11-02'}}},res);
  assert.equal(status,200);assert.ok(prompt.includes(context));assert.deepEqual(closed.p_parte.sintese_respostas,partes().d.sintese_respostas);
 }finally{global.fetch=original;process.env=old;}
});
test('uma falha parcial conserva a consulta válida; ausência da base impede texto sem referência',async()=>{
 const original=global.fetch,old={...process.env};Object.assign(process.env,{SUPABASE_URL:'https://db.invalid',SUPABASE_ANON_KEY:'public',BIBLIOTECA_RPC_SECRET:'secret-test'});
 try{
  global.fetch=async(url,opt)=>JSON.parse(opt.body).p_consulta.includes('Perfeccionismo')?new Response(JSON.stringify([{trecho_id:1,titulo:'Códigos Guardiões',categoria:'metodo',pagina:9,trecho:'Passagem disponível.'}])):new Response('[]',{status:503});
  assert.ok((await obterContextoBibliografico('d',teste)).includes('Passagem disponível.'));
  global.fetch=async()=>new Response('[]');await assert.rejects(()=>obterContextoBibliografico('d',teste),{name:'BibliotecaIndisponivel'});
 }finally{global.fetch=original;process.env=old;}
});
