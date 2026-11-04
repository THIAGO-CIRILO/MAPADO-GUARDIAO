'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {longitude,angulos,calcularTransitos,nascimentoUTC}=require('../api/_transitos.js');
const Estacoes=require('../api/_estacoes.js');
const {exemplo}=require('./estacoes-fixture.js');
const {paginas}=require('../consulta-modelo.js');
const {renderConsulta}=require('../api/_consulta_pdf.js');
const vm=require('node:vm'),path=require('node:path');
test('posições e Ascendente concordam com referência independente JPL/Skyfield',()=>{
 const delta=(a,b)=>Math.abs((a-b+540)%360-180);
 for(const r of require('./astro-referencia.json').dados){
  const date=new Date(r.date);
  for(const [body,expected] of Object.entries(r.positions))assert.ok(delta(longitude(body,date),expected)<.02,body+' '+r.date);
  assert.ok(delta(angulos(date,r.latitude,r.longitude).Asc,r.ascendente)<.02,'Ascendente '+r.date);
 }
});
test('trânsitos respeitam nascimento, hora/fuso, intervalos e mudança de setênio',()=>{
 assert.equal(nascimentoUTC('1990-05-15',{hora:'10:00',tz:-3,dst:true}).date.toISOString(),'1990-05-15T12:00:00.000Z');
 const known=calcularTransitos('1990-05-15','2026-11-04',{hora:'10:00',tz:-3,lat:-23.5505,lon:-46.6333});
 const unknown=calcularTransitos('1990-05-15','2026-11-04',{});
 assert.equal(known.meses.length,12);assert.ok(known.natal.Lua&&known.natal.Ascendente);
 assert.ok(!unknown.natal.Lua&&!unknown.natal.Ascendente&&!unknown.natal['Meio do Céu']);
 assert.ok(unknown.transitos.every(t=>!['Lua','Ascendente','Meio do Céu'].includes(t.natal)));
 assert.equal(calcularTransitos('1990-05-15','2026-11-04',{hora:'10:00',tz:-3,lat:null,lon:null}).natal.Ascendente,undefined);
 for(const m of known.meses)for(const t of m.transitos){const ref=known.transitos.find(x=>x.id===t.id);assert.ok(ref);assert.ok(t.de<=t.ate&&t.de>=known.inicio&&t.ate<=known.fim);assert.ok(t.orbe_minimo<=ref.orbe_limite);}
 const transition=calcularTransitos('1991-12-15','2026-11-04',{}).meses.find(m=>m.mes===12);
 assert.deepEqual(transition.transicao_setenio,{data:'2026-12-15',novo_setenio:6});
 known.meses[0].transitos.length=0;assert.ok(calcularTransitos('1990-05-15','2026-11-04',{hora:'10:00',tz:-3,lat:-23.5505,lon:-46.6333}).meses[0].transitos.length);
 assert.throws(()=>calcularTransitos('1990-02-31','2026-11-04',{}));
});
test('estações só aceitam referências calculadas para o mês e preservam a classificação atual',()=>{
 const x=exemplo();assert.equal(Estacoes.validar(x.f,'f',x.estudo),null);assert.equal(Estacoes.validar(x.d,'d',x.estudo,x.mapa.resultado),null);
 const wrong=structuredClone(x.f);wrong.meses[0].base_ids=['eclipse-inventado','num-2026-11'];assert.ok(Estacoes.validar(wrong,'f',x.estudo));
 const wrongMonth=structuredClone(x.f);wrongMonth.meses[0].base_ids=[x.estudo.meses[2].base_numerologica,x.estudo.meses[2].base_setenio];assert.ok(Estacoes.validar(wrongMonth,'f',x.estudo));
 const wrongSeason=structuredClone(x.d);wrongSeason.estacao_alma.estacao='primavera';assert.ok(Estacoes.validar(wrongSeason,'d',x.estudo,x.mapa.resultado));
 const noArea=structuredClone(x.d);delete noArea.estacoes_areas.rotina;assert.ok(Estacoes.validar(noArea,'d',x.estudo,x.mapa.resultado));
 assert.equal(Estacoes.calcular({versao_consulta:2},x.dossier,x.dadosCiclos),null);
});
test('PDF mantém 20 páginas com estações em caixas e cores iguais às do calendário',async()=>{
 const x=exemplo(),p=paginas(x.mapa),s=require('../consulta-estacoes.js');
 assert.equal(p.length,20);assert.equal(p[5].title,'Sua Estação da Alma');assert.equal(p[5].blocks[0].estacao,'outono');
 assert.ok(p[1].legend);assert.equal(p[12].blocks.length,4);assert.equal(p[13].blocks.length,4);assert.equal(p[14].blocks.length,4);assert.equal(p[12].columns,2);
 assert.deepEqual([...p[12].blocks,...p[13].blocks,...p[14].blocks].map(b=>b.estacao),x.mapa.resultado.meses.map(m=>m.estacao));
 assert.equal(p[18].table.rows.length,7);assert.ok(p[18].blocks.some(b=>b.body===x.mapa.resultado.plano.min5));
 assert.ok(p.slice(6,12).every(pg=>pg.blocks.every(b=>s.obter(b.estacao)&&b.fields.length===2)));
 const b=await renderConsulta(x.mapa,{});assert.equal((b.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,20);
 fs.mkdirSync('qa',{recursive:true});fs.writeFileSync('qa/consulta-estacoes.pdf',b);
});
test('textos longos continuam inteiros e o PDF alternativo também fecha em 20 páginas',async()=>{
 const x=exemplo(),r=x.mapa.resultado;
 const cap=(words,chars)=>('Você pode conferir uma condição concreta antes de assumir outra responsabilidade. '.repeat(20)).split(/\s+/).slice(0,words).join(' ').slice(0,chars).replace(/\s+\S*$/,'')+'.';
 for(const [k,v] of Object.entries({leitura:[50,359],porque:[35,259],fase_vida:[30,219],questao:[35,259],gesto:[20,149],ao_longo_do_ano:[35,259]}))r.estacao_alma[k]=cap(...v);
 for(const [k,v] of Object.entries({natal:[45,329],numerologia:[35,249],arcano:[35,249]}))r.bases_leitura[k]=cap(...v);
 const before=structuredClone(x.mapa),b=await renderConsulta(x.mapa,{});assert.equal((b.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,20);assert.deepEqual(x.mapa,before);
 fs.writeFileSync('qa/consulta-estacoes-limites.pdf',b);
 let output;const JsPDF=require('jspdf').jsPDF;
 const context={window:{jspdf:{jsPDF:function(o){const d=new JsPDF(o);d.save=()=>output=Buffer.from(d.output('arraybuffer'));return d;}},GuardiaoConsulta:require('../consulta-modelo.js'),GuardiaoPdfLayout:require('../consulta-pdf-layout.js')},fetch:async u=>({ok:true,arrayBuffer:async()=>{const bytes=fs.readFileSync(path.join(__dirname,'../assets',u));return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);}}),btoa:s=>Buffer.from(s,'binary').toString('base64'),Uint8Array};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../consulta-pdf-browser.js'),'utf8'),context);
 await context.window.GuardiaoPdfConsulta.download({...exemplo().mapa,name:'Ana Exemplo'},null,{});
 assert.ok(output);assert.equal((output.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,20);fs.writeFileSync('qa/consulta-estacoes-navegador.pdf',output);
});
