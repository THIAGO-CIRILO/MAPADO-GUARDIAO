'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {focoDaLeitura,buildPromptConsulta,validarParte}=require('../api/_consulta.js');
const {avaliarPersonalizacao,avaliarEditorial}=require('../api/_editorial.js');
const {paginas}=require('../consulta-modelo.js');
const {renderConsulta}=require('../api/_consulta_pdf.js');
const {entrada,complementares,partes,mapa}=require('./consulta-fixture.js');

test('desejo mantém seu sentido e não é substituído por receio ou apoio de conversa',()=>{
 const viagem={questao:'Quero organizar uma viagem sem depender da aprovação do meu pai.',cena:'Meu pai discorda da viagem, mas eu consigo pagar as despesas.',reacao:'Adio a reserva e fico ensaiando como convencer meu pai.',receio:'Receio magoá-lo e acabar dependendo dele financeiramente.',desejo:'Quero decidir sobre a viagem com os recursos que já tenho.'};
 const teste={versao_consulta:2,contexto_atual:viagem,contextos_complementares:complementares};
 const foco=focoDaLeitura(teste);
 assert.equal(foco.questao_a_responder,viagem.questao);
 assert.equal(foco.resultado_desejado,viagem.desejo);
 assert.equal(foco.o_que_tem_receio_de_perder,viagem.receio);
 assert.deepEqual(foco.condicoes_do_momento,complementares);
 const trabalho=focoDaLeitura({...teste,contexto_atual:entrada});
 assert.equal(trabalho.resultado_desejado,entrada.desejo);
 assert.notEqual(trabalho.resultado_desejado,foco.resultado_desejado);
 const prompt=buildPromptConsulta('d',teste,{areas:[]},{});
 for(const texto of Object.values(viagem))assert.ok(prompt.includes(texto));
 assert.ok(prompt.includes('respondendo DIRETAMENTE à questão'));
});

test('resposta central de uma leitura já salva aparece sem alterar as cinco respostas',()=>{
 const m=mapa();delete m.resultado.sintese_respostas;const original=structuredClone(m);
 const pages=paginas(m);
 assert.equal(pages[2].intro,m.resultado.objetivo.leitura);
 assert.deepEqual(pages[2].blocks.map(b=>b.body),Object.values(entrada));
 assert.ok(pages.slice(6,12).every(p=>p.intro===''));
 assert.deepEqual(m,original,'A mudança de apresentação não pode reescrever o mapa salvo.');
 delete m.resultado.objetivo;
 assert.equal(paginas(m)[2].intro,m.resultado.integrada);
});

test('síntese responde a cada campo e mantém o original separado da interpretação',()=>{
 const m=mapa(),page=paginas(m)[2];
 assert.equal(page.title,'Síntese das suas respostas');
 assert.equal(page.blocks.length,6);
 for(const [i,key] of Object.keys(entrada).entries()){
  assert.equal(page.blocks[i].body,m.resultado.sintese_respostas[key]);
  assert.equal(page.blocks[i].original,entrada[key]);
  assert.notEqual(page.blocks[i].body,entrada[key]);
 }
 assert.equal(page.blocks[5].body,m.resultado.objetivo.proximo_passo);
 const d=partes().d;assert.equal(validarParte(d,'d'),null);
 delete d.sintese_respostas.receio;assert.ok(validarParte(d,'d'));
 const copiada=partes().d;copiada.sintese_respostas.reacao=entrada.reacao;
 assert.ok(avaliarPersonalizacao(copiada,'d',{versao_consulta:2,contexto_atual:entrada}).some(a=>a.problema.includes('copia')));
});

test('revisão detecta resposta alheia ao pedido e reprodução do mesmo conselho entre áreas',()=>{
 const teste={versao_consulta:2,contexto_atual:entrada};
 const src=partes();
 assert.deepEqual(avaliarEditorial(src.d,'d',teste),[],'Uma comparação concreta não deve ser bloqueada como aviso sobre o produto.');
 const disclaimer=structuredClone(src.d);disclaimer.objetivo.leitura+=' Este mapa não substitui acompanhamento psicológico.';
 assert.ok(avaliarEditorial(disclaimer,'d',teste).some(a=>a.problema==='disclaimer de substituicao'));
 assert.deepEqual(avaliarPersonalizacao(src.d,'d',teste),[]);
 const alheia={objetivo:{leitura:'O momento favorece a expressão criativa e a busca de inspiração artística. Faça desenhos livres para descobrir novas cores.',proximo_passo:'Separe seus materiais e pinte uma imagem que represente alegria.'}};
 assert.ok(avaliarPersonalizacao(alheia,'d',teste).some(a=>a.campo==='objetivo'));
 assert.deepEqual(avaliarPersonalizacao(src.c,'c',teste),[]);
 const copiada=structuredClone(src.c),keys=Object.keys(copiada.areas_vida);
 for(const key of keys.slice(1,4))copiada.areas_vida[key]={...copiada.areas_vida[keys[0]]};
 assert.ok(avaliarPersonalizacao(copiada,'c',teste).some(a=>a.campo==='areas_vida.texto'));
 assert.ok(avaliarPersonalizacao(copiada,'c',teste).some(a=>a.campo==='areas_vida.gesto'));
 assert.deepEqual(avaliarPersonalizacao(copiada,'c',{}),[],'A reserva antiga mantém suas regras anteriores.');
});

test('resposta destacada cabe no PDF mesmo com os cinco campos no tamanho máximo',async()=>{
 const Entrada=require('../consulta-entrada.js'),m=mapa();
 delete m.resultado.sintese_respostas;
 for(const c of Entrada.campos)m.resultado.entrada_consulta[c.key]=('Texto de exemplo para conferir a preservação da resposta e o espaço disponível. '.repeat(30)).slice(0,c.max);
 m.resultado.objetivo.leitura=Array.from({length:75},()=> 'clareza').join(' ')+'.';
 const pdf=await renderConsulta(m,{});
 assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,20);
 fs.mkdirSync('qa',{recursive:true});fs.writeFileSync('qa/consulta-respostas-maximas.pdf',pdf);
});

test('as cinco interpretações e o próximo passo cabem no PDF sem imprimir os relatos longos de novo',async()=>{
 const Entrada=require('../consulta-entrada.js'),m=mapa();
 for(const c of Entrada.campos){
  m.resultado.entrada_consulta[c.key]='Resposta original longa. '.repeat(50).slice(0,c.max);
  m.resultado.sintese_respostas[c.key]=('responsabilidade '.repeat(45)).slice(0,375).trim();
 }
 m.resultado.objetivo.leitura=Array.from({length:75},()=> 'clareza').join(' ')+'.';
 m.resultado.objetivo.proximo_passo=Array.from({length:25},()=> 'critério').join(' ')+'.';
 assert.equal(validarParte(m.resultado,'d'),null);
 const pdf=await renderConsulta(m,{});
 assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,20);
 fs.mkdirSync('qa',{recursive:true});fs.writeFileSync('qa/consulta-sintese-maxima.pdf',pdf);
});
