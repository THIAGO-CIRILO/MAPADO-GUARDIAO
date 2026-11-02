'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const {entrada,partes,mapa}=require('./consulta-fixture.js');
const {compatibilidade}=require('../api/_consulta.js');
const ROOT=path.resolve(__dirname,'..');
const waitFor=async fn=>{for(let i=0;i<300;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('O fluxo não chegou à tela esperada.');};
test('questionário completo salva contexto, mostra meditação e reabre as 20 páginas',async()=>{
 const errors=[],calls=[],backups=[],saved=[];let profile;
 const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',e=>errors.push(e));
 const dom=new JSDOM(fs.readFileSync(path.join(ROOT,'public/index.html'),'utf8'),{url:'https://teste.invalid/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
 const w=dom.window;w.scrollTo=()=>{};w.matchMedia=()=>({matches:false,addListener(){},addEventListener(){}});w.HTMLMediaElement.prototype.pause=function(){};
 const user={id:'22222222-2222-4222-8222-222222222222',email:'ana@example.invalid'};
 const db={auth:{getSession:async()=>({data:{session:{user,access_token:'mock-session'}}}),onAuthStateChange(){},signOut:async()=>({})},rpc:async(name,data)=>{if(name==='guardiao_salvar_questionario')backups.push(structuredClone(data));return {data:name==='tem_acesso_guardiao'?true:name==='guardiao_consultar_reinicio'?0:null,error:null};},from(table){
  return {select(){return this;},eq(k,v){this.key=k;this.value=v;return this;},order:async()=>({data:saved.map(x=>({id:x.id,created_at:x.created_at,guardiao:x.guardiao,potencial:x.potencial}))}),maybeSingle:async()=>({data:table==='perfis'?profile:saved[0]}),upsert:async data=>{profile=structuredClone(data);return {error:null};},insert:async data=>{saved.push({...structuredClone(data),id:'11111111-1111-4111-8111-111111111111',created_at:'2026-11-02T12:00:00Z'});return {error:null};}};
 }};
 w.APP_CONFIG={SUPABASE_URL:'https://db.invalid',SUPABASE_ANON_KEY:'public-mock'};w.supabase={createClient:()=>db};
 w.fetch=async(url,opt={})=>{
  if(url==='/api/gerar'){
   const body=JSON.parse(opt.body);calls.push(body);
   const raw=partes()[body.fase];const parte={...compatibilidade(raw,body.fase),versao_consulta:2};
   if(body.fase==='f')parte.meses=mapa().resultado.meses;
   return new Response(JSON.stringify({ok:true,parte}));
  }
  if(url==='/cidades.json')return new Response('{}');
  throw Error('Fetch inesperado: '+url);
 };
 const ctx=dom.getInternalVMContext();
 try{
  for(const tag of w.document.querySelectorAll('script')){
   const src=tag.getAttribute('src');
   if(src){const local=src.split('?')[0];if(local.startsWith('/')&&!['/config.js'].includes(local)){const f=path.join(ROOT,'public',local);if(fs.existsSync(f))new vm.Script(fs.readFileSync(f,'utf8'),{filename:local}).runInContext(ctx);}}
   else if(tag.textContent.trim())new vm.Script(tag.textContent,{filename:'built-inline.js'}).runInContext(ctx);
  }
  const $=id=>w.document.getElementById(id);
  const click=id=>{assert.ok($(id),'Falta o controle '+id);$(id).click();};
  const type=(id,value)=>{assert.ok($(id),'Falta o campo '+id);$(id).value=value;$(id).dispatchEvent(new w.Event('input',{bubbles:true}));};
  await waitFor(()=>$('wzContext'));
  for(const [key,value] of Object.entries(entrada)){assert.equal($('wzContext').dataset.field,key);type('wzContext',value);click('wzNext');}
  type('wzName','Ana Exemplo');type('wzBirth','1990-05-15');click('wzNext');
  type('wzTime','10:00');click('wzManual');type('wzLat','-23.5505');type('wzLon','-46.6333');type('wzTz','-3');click('wzNext');
  for(let i=0;i<10;i++){const opt=w.document.querySelector('[data-opt="0"]');assert.ok(opt,'Falta a pergunta '+i);opt.click();click('wzNext');}
  assert.equal($('wzGoal').value,entrada.questao);$('wzAceite').checked=true;click('wzGo');
  await waitFor(()=>saved.length===1&&$('wzOpenReading')&&!$('wzOpenReading').disabled);
  assert.ok($('wzMeditation'));assert.equal(w.document.querySelectorAll('.consulta-page').length,0);
  assert.equal(calls.length,6);assert.equal(backups.length,1);
  assert.deepEqual(backups[0].p_respostas._consulta,{versao:2,...entrada});
  for(const req of calls){assert.deepEqual(req.teste.contexto_atual,entrada);assert.equal(req.dossier.areas.length,12);assert.equal(req.teste.respostas.length,10);assert.ok(req.dossier.mapa_natal.posicoes.Sol);}
  click('wzOpenReading');assert.equal(w.document.querySelectorAll('.consulta-page').length,20);
  assert.ok(w.document.body.textContent.includes(entrada.cena));
  profile.objetivo='Objetivo diferente no perfil';
  await w.wzOpenMap(saved[0].id,false);
  assert.equal(w.document.querySelectorAll('.consulta-page').length,20);
  assert.ok(w.document.body.textContent.includes(entrada.questao));
  assert.ok(!errors.length,errors.join('\n'));
 }finally{w.close();}
});
test('PDF alternativo do navegador também fecha em 20 páginas',async()=>{
 const jsPDF=require('jspdf').jsPDF;let output;
 const context={window:{jspdf:{jsPDF:function(opts){const doc=new jsPDF(opts);doc.save=()=>{output=Buffer.from(doc.output('arraybuffer'));};return doc;}},GuardiaoConsulta:require('../consulta-modelo.js'),GuardiaoPdfLayout:require('../consulta-pdf-layout.js')},fetch:async url=>({ok:true,arrayBuffer:async()=>{const b=fs.readFileSync(path.join(ROOT,'assets',url));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}}),btoa:s=>Buffer.from(s,'binary').toString('base64'),Uint8Array};
 vm.runInNewContext(fs.readFileSync(path.join(ROOT,'consulta-pdf-browser.js'),'utf8'),context);
 const m=mapa();await context.window.GuardiaoPdfConsulta.download({name:'Ana Exemplo',gt:{res:m.resultado,ans:m.respostas}},null,{});
 assert.ok(output);fs.writeFileSync(path.join(ROOT,'qa/consulta-navegador.pdf'),output);
 assert.equal((output.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,20);
});
