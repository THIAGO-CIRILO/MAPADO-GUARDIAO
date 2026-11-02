'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM,VirtualConsole}=require('jsdom');
const {entrada,partes,mapa}=require('./consulta-fixture.js');
const {compatibilidade,AREA_KEYS}=require('../api/_consulta.js');
const ROOT=path.resolve(__dirname,'..');
const waitFor=async fn=>{for(let i=0;i<300;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('A atualização não chegou à tela esperada.');};

function legacyFlow({deepLink=false,failOnce=false,failPhase='c',pending=null}={}){
 const errors=[],calls=[],actions=[];
 const old=mapa();delete old.resultado.versao_consulta;delete old.resultado.entrada_consulta;
 old.respostas=Object.fromEntries(Array.from({length:10},(_,i)=>[i,0]));old.created_at='2026-10-12T12:00:00Z';
 const original=structuredClone(old.resultado);
 const user={id:old.user_id,email:'ana@example.invalid'};
 const profile={id:user.id,nome:'Ana Exemplo',nascimento:'1990-05-15',hora:'10:00',cidade:'São Paulo',uf:'SP',lat:-23.5505,lon:-46.6333,tz:-3,objetivo:'Meu objetivo anterior.'};
 let frozen=pending,failed=false,finished=false;
 const signature='a'.repeat(64);
 const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',e=>errors.push(String(e)));
 const dom=new JSDOM(fs.readFileSync(path.join(ROOT,'public/index.html'),'utf8'),{url:'https://teste.invalid/'+(deepLink?'?atualizar=1':''),runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
 const w=dom.window;w.scrollTo=()=>{};w.matchMedia=()=>({matches:false,addListener(){},addEventListener(){}});w.HTMLMediaElement.prototype.pause=function(){};
 const db={auth:{getSession:async()=>({data:{session:{user,access_token:'mock-session'}}}),onAuthStateChange(){},signOut:async()=>({})},rpc:async(name,data)=>{
  actions.push({name,data:structuredClone(data)});
  if(name==='guardiao_atualizar_consulta'){
   assert.equal(data.p_mapa_id,old.id);
   if(data.p_acao==='referencia')return {data:{estado:'disponivel',referencia:frozen?.dadosCiclos.referencia||null,assinatura:frozen?signature:null,contexto:frozen}};
   if(data.p_acao==='finalizar'){
    assert.equal(data.p_assinatura,signature);assert.deepEqual(old.resultado,original,'A leitura antiga deve ficar intacta até finalizar.');
    const next=mapa().resultado;next.entrada_consulta=structuredClone(frozen.teste.contexto_atual);old.resultado=next;finished=true;
    return {data:{estado:'concluido',mapa_id:old.id},error:null};
   }
   throw Error('Ação inesperada '+data.p_acao);
  }
  assert.ok(!['guardiao_salvar_questionario','iniciar_fase_guardiao','finalizar_mapa_guardiao_recuperado'].includes(name),'A atualização não deve usar a reserva antiga.');
  return {data:name==='tem_acesso_guardiao'?true:name==='guardiao_consultar_reinicio'?0:null,error:null};
 },from(table){return {select(){return this;},eq(){return this;},order:async()=>({data:[{id:old.id,created_at:old.created_at,guardiao:old.guardiao,potencial:old.potencial}]}),maybeSingle:async()=>({data:structuredClone(table==='perfis'?profile:old)}),upsert:async()=>{throw Error('A atualização não deve gravar o perfil pelo navegador.');},insert:async()=>{throw Error('A atualização não deve criar outro mapa.');}};}};
 w.APP_CONFIG={SUPABASE_URL:'https://db.invalid',SUPABASE_ANON_KEY:'public-mock'};w.supabase={createClient:()=>db};
 w.fetch=async(url,opt={})=>{
  if(url==='/api/gerar'){
   const body=JSON.parse(opt.body);calls.push(body);assert.equal(body.atualizarMapaId,old.id);
   if(!frozen)frozen=structuredClone({teste:body.teste,dossier:body.dossier,dadosCiclos:body.dadosCiclos});
   assert.deepEqual(body.teste,frozen.teste);assert.deepEqual(body.dossier,frozen.dossier);
   if(failOnce&&body.fase===failPhase&&!failed){failed=true;return new Response(JSON.stringify({erro:'Falha temporária simulada.',fase:failPhase}),{status:503});}
   const raw=partes()[body.fase],parte={...compatibilidade(raw,body.fase),versao_consulta:2};
   if(body.fase==='f')parte.meses=mapa().resultado.meses;
   return new Response(JSON.stringify({ok:true,parte,assinatura_atualizacao:signature}));
  }
  if(url==='/cidades.json')return new Response('{}');
  throw Error('Fetch inesperado '+url);
 };
 const ctx=dom.getInternalVMContext();
 for(const tag of w.document.querySelectorAll('script')){
  const src=tag.getAttribute('src');
  if(src){const local=src.split('?')[0];if(local.startsWith('/')&&local!=='/config.js'){const f=path.join(ROOT,'public',local);if(fs.existsSync(f))new vm.Script(fs.readFileSync(f,'utf8'),{filename:local}).runInContext(ctx);}}
  else if(tag.textContent.trim())new vm.Script(tag.textContent,{filename:'built-inline.js'}).runInContext(ctx);
 }
 old.scores=vm.runInContext('gtScore(Object.fromEntries(Array.from({length:10},(_,i)=>[i,0])))',ctx);
 const $=id=>w.document.getElementById(id);
 const click=id=>{assert.ok($(id),'Falta o controle '+id);$(id).click();};
 const type=(id,value)=>{assert.ok($(id),'Falta o campo '+id);$(id).value=value;$(id).dispatchEvent(new w.Event('input',{bubbles:true}));};
 return {dom,w,$,click,type,calls,actions,errors,old,original,get finished(){return finished;},get frozen(){return frozen;}};
}

function responderApoios(f){for(const c of require('../consulta-contexto.js').campos){const opt=f.w.document.querySelector('[data-apoio="'+c.key+'"][data-escolha="0"]');assert.ok(opt,'Falta a pergunta sobre '+c.key);opt.click();f.click('wzNext');}}

test('leitura antiga recebe os campos novos, mantém o mesmo mapa e oferece meditação antes das 20 páginas',async()=>{
 const f=legacyFlow({failOnce:true});
 try{
  await waitFor(()=>f.$('wzUpgrade'));assert.match(f.$('wzPdf29').textContent,/PDF anterior/);f.click('wzUpgrade');await waitFor(()=>f.$('wzContext'));
  for(const [key,value] of Object.entries(entrada)){assert.equal(f.$('wzContext').dataset.field,key);f.type('wzContext',value);f.click('wzNext');}
  responderApoios(f);
  assert.ok(f.$('wzGoal'),'Não deve repetir nascimento nem as dez alternativas salvas.');
  f.$('wzAceite').checked=true;f.click('wzGo');
  await waitFor(()=>f.$('wzRetry'));
  assert.deepEqual(f.old.resultado,f.original);assert.equal(f.finished,false);
  assert.equal(f.actions.filter(x=>x.data?.p_acao==='finalizar').length,0);
  f.click('wzRetry');
  await waitFor(()=>f.finished&&f.$('wzOpenReading')&&!f.$('wzOpenReading').disabled);
  assert.ok(f.$('wzMeditation'));assert.equal(f.w.document.querySelectorAll('.consulta-page').length,0);
  assert.equal(f.old.id,mapa().id);assert.equal(f.old.resultado.versao_consulta,2);
  assert.equal(f.calls.filter(x=>x.fase==='a').length,1,'A etapa concluída deve ser reutilizada.');
  for(const body of f.calls){assert.deepEqual(body.teste.contexto_atual,entrada);assert.equal(body.teste.respostas.length,10);assert.equal(body.dossier.areas.length,12);assert.equal(body.dadosCiclos.nascimento,'1990-05-15');}
  f.click('wzOpenReading');assert.equal(f.w.document.querySelectorAll('.consulta-page').length,20);assert.match(f.$('wzPdf29').textContent,/20 páginas/);assert.ok(!f.$('wzUpgrade'));
  assert.deepEqual(f.errors,[]);
 }finally{f.dom.window.close();}
});

test('falha na síntese retoma só a etapa final e aproveita o mapa já preparado',async()=>{
 const f=legacyFlow({failOnce:true,failPhase:'d'});
 try{
  await waitFor(()=>f.$('wzUpgrade'));f.click('wzUpgrade');await waitFor(()=>f.$('wzContext'));
  for(const value of Object.values(entrada)){f.type('wzContext',value);f.click('wzNext');}responderApoios(f);
  f.$('wzAceite').checked=true;f.click('wzGo');await waitFor(()=>f.$('wzRetry'));
  assert.deepEqual(f.old.resultado,f.original);
  assert.equal(f.calls.at(-1).fase,'d');
  const snapshot=structuredClone(f.calls.at(-1).leituraGerada);
  assert.equal(Object.keys(snapshot.areas_vida).length,12);assert.equal(snapshot.tabela_consulta.length,6);assert.equal(snapshot.meses.length,12);
  f.click('wzRetry');await waitFor(()=>f.finished);
  for(const fase of ['a','b','c','e','f'])assert.equal(f.calls.filter(x=>x.fase===fase).length,1);
  assert.equal(f.calls.filter(x=>x.fase==='d').length,2);
  assert.deepEqual(f.calls.at(-1).leituraGerada,snapshot);
 }finally{f.dom.window.close();}
});

test('link de atualização abre a primeira pergunta depois do login',async()=>{
 const f=legacyFlow({deepLink:true});try{await waitFor(()=>f.$('wzContext'));assert.equal(f.$('wzContext').dataset.field,'questao');assert.equal(f.$('wzContext').value,'Meu objetivo anterior.');assert.deepEqual(f.errors,[]);}finally{f.dom.window.close();}
});

test('outro navegador retoma as respostas enviadas sem pedir outro questionário',async()=>{
 let pending;const first=legacyFlow({failOnce:true});
 try{await waitFor(()=>first.$('wzUpgrade'));first.click('wzUpgrade');await waitFor(()=>first.$('wzContext'));for(const value of Object.values(entrada)){first.type('wzContext',value);first.click('wzNext');}responderApoios(first);first.$('wzAceite').checked=true;first.click('wzGo');await waitFor(()=>first.$('wzRetry'));pending=structuredClone(first.frozen);}finally{first.dom.window.close();}
 const second=legacyFlow({deepLink:true,pending});
 try{await waitFor(()=>second.$('wzGoal'));assert.equal(second.$('wzGoal').value,entrada.questao);assert.equal(second.$('wzGoal').readOnly,true);assert.ok(!second.$('wzContext'));second.$('wzAceite').checked=true;second.click('wzGo');await waitFor(()=>second.finished);assert.deepEqual(second.old.resultado.entrada_consulta,entrada);assert.deepEqual(second.errors,[]);}finally{second.dom.window.close();}
});

test('API de atualização usa reserva própria, rejeita outro dono e não chama a IA para etapa pronta',async()=>{
 const handler=require('../api/gerar.js'),originalFetch=global.fetch,oldEnv={...process.env};
 Object.assign(process.env,{SUPABASE_URL:'https://test.invalid',SUPABASE_ANON_KEY:'public-test',ANTHROPIC_API_KEY:'test-key'});delete process.env.BIBLIOTECA_RPC_SECRET;
 const requests=[];let gate='reservada',aiCalls=0;
 global.fetch=async(url,opt={})=>{
  if(url.endsWith('/auth/v1/user'))return new Response(JSON.stringify({id:'u1',email:'ana@example.invalid'}));
  if(url.endsWith('/tem_acesso_guardiao'))return new Response('true');
  if(url.endsWith('/guardiao_atualizar_consulta')){
   const p=JSON.parse(opt.body);requests.push(p);
   return new Response(JSON.stringify(p.p_acao==='iniciar'?{estado:gate,...(gate==='pronta'?{parte:{...partes().c,versao_consulta:2}}:{})}:{ok:true}));
  }
  if(url.includes('api.anthropic.com')){aiCalls++;return new Response(JSON.stringify({content:[{type:'text',text:JSON.stringify(partes().c)}],stop_reason:'end_turn'}));}
  throw Error('Reserva antiga ou URL inesperada '+url);
 };
 const body={fase:'c',atualizarMapaId:mapa().id,teste:{versao_consulta:2,contexto_atual:entrada,respostas:[]},dossier:{areas:AREA_KEYS.map((area,i)=>({area,casa:i+1}))},dadosCiclos:{nascimento:'1990-05-15',referencia:'2026-11-02'}};
 const run=async b=>{let status=200,value;const res={setHeader(){},status(n){status=n;return this;},json(v){value=v;return this;}};await handler({method:'POST',headers:{authorization:'Bearer fake-token'},body:b},res);return {status,value};};
 try{
  let r=await run(body);assert.equal(r.status,200);assert.match(r.value.assinatura_atualizacao,/^[a-f0-9]{64}$/);assert.equal(requests[0].p_acao,'iniciar');assert.deepEqual(requests[0].p_payload.teste.contexto_atual,entrada);assert.equal(requests[1].p_acao,'concluir');assert.equal(requests[1].p_payload.versao_consulta,2);
  gate='nao_encontrado';r=await run(body);assert.equal(r.status,404);assert.equal(aiCalls,1);
  gate='pronta';r=await run(body);assert.equal(r.status,200);assert.equal(r.value.reutilizada,true);assert.equal(aiCalls,1);
  r=await run({...body,atualizarMapaId:'not-a-uuid'});assert.equal(r.status,400);
 }finally{global.fetch=originalFetch;process.env=oldEnv;}
});
