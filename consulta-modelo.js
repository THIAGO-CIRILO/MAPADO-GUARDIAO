(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./consulta-entrada.js'),require('./consulta-estacoes.js'));
 else root.GuardiaoConsulta=factory(root.GuardiaoEntrada,root.GuardiaoEstacoes);
})(typeof globalThis!=='undefined'?globalThis:this,function(Entrada,Estacoes){
 'use strict';

 const areas=[['identidade','Identidade e corpo'],['dinheiro','Dinheiro e valores'],['comunicacao','Comunicação e estudos'],['familia','Casa e família'],['criatividade','Criatividade e prazer'],['rotina','Trabalho diário e saúde'],['relacionamentos','Relacionamentos'],['intimidade','Crises e intimidade'],['proposito','Propósito e expansão'],['carreira','Carreira e reconhecimento'],['coletivos','Amigos e coletivos'],['interioridade','Espiritualidade e interioridade']];
 const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
 const signos=['Áries','Touro','Gêmeos','Câncer','Leão','Virgem','Libra','Escorpião','Sagitário','Capricórnio','Aquário','Peixes'];
 const promessa={inicio:'O seu lugar de potência é onde',destaque:'a sua energia rende mais e custa menos.'};
 const meditacao='https://mapado-guardiao.vercel.app/meditacao';
 const paginasDoPDF=12;
 const atalhosPDF=[
  {label:'Tabela e plano de 72h',page:2},{label:'Estação atual e meses',page:3},
  {label:'Suas respostas',page:6},{label:'As 12 áreas',page:8},
  {label:'Mais situações',page:10},{label:'Prática e sete dias',page:11}
 ];
 const clean=v=>typeof v==='string'?v.trim():'';
 const card=(label,body,props={})=>({label,body:clean(body),tone:'outline',...props});
 const field=(label,text)=>({label,text});
 const resultado=map=>map.resultado||map.gt?.res||{};
 const contexto=(r,map)=>Entrada.contexto(r.entrada_consulta||map.respostas?._consulta||map.gt?.ans?._consulta);
 const primeiroNome=(r,map,profile)=>trecho(clean(r.dados_pessoa?.nome||profile.nome||map.name).split(/\s+/)[0],42);

 // A leitura salva pode ter sido escrita para páginas maiores. Preserve a
 // primeira frase inteira quando precisar de um trecho para a consulta rápida.
 function trecho(value,max){
  const text=clean(value).replace(/\s+/g,' ');
  if(text.length<=max)return text;
  const window=text.slice(0,max);
  const sentence=window.match(/^.*[.!?](?=\s|$)/u)?.[0];
  return sentence&&sentence.length>=max*.45
   ?sentence
   :(window.slice(0,-1).replace(/\s+\S*$/u,'').trimEnd()+'…');
 }

 function nascimento(r){
  const bases=r.bases_leitura||{};
  const cards=[
   card('O que seu mapa natal acrescenta',trecho(bases.natal,280),{fullWidth:true}),
   card('Seu ciclo pessoal',trecho(bases.numerologia,200)),
   card('Seu arcano pessoal',trecho(bases.arcano,200))
  ];
  return cards.filter(c=>c.body);
 }

 function situacoes(rows,short=false){
  const keys=['situacao','reconhecer','honrar','atualizar'];
  return {
   headers:['Situação','Reconhecer','Honrar','Atualizar'],
   rows:rows.map(row=>keys.map(k=>short?trecho(row[k],k==='atualizar'?165:140):clean(row[k]))),
   widths:[.24,.24,.24,.28],
   stackOnMobile:true
  };
 }

 function paginas(map,profile={}){
  const r=resultado(map);
  if(r.versao_consulta!==2)throw new Error('Esta leitura usa o formato anterior.');
  if(!Array.isArray(r.tabela_consulta)||r.tabela_consulta.length<3||r.meses?.length!==12)
   throw new Error('A leitura de consulta rápida ainda está incompleta.');

  const input=contexto(r,map);
  const nome=primeiroNome(r,map,profile);
  const guardiao=clean(map.guardiao)||'O seu padrão de proteção';
  const g=r.guardiao||{},p=r.potencial||{},pl=r.plano||{};
  const est=r.versao_estacoes===1&&Estacoes.obter(r.estacao_alma?.estacao)?r.estacao_alma:null;
  const lugar=r.lugar_potencia||{};
  const h72=clean(pl.h72)||clean(r.objetivo?.proximo_passo)||clean(lugar.gesto);
  const frase=clean(r.frase_nova);
  const respostas=Entrada.campos.map(c=>card(c.titulo,r.sintese_respostas?.[c.key]||input[c.key],{
   original:r.sintese_respostas?.[c.key]?input[c.key]:null
  })).filter(c=>c.body);
  const passos=pl.dias?.map((text,i)=>field('Dia '+(i+1),text))||[];

  const pages=[
   {
    title:'Mapa do Guardião',
    section:[profile.exemplo?'Exemplo fictício':'Sua leitura',nome].filter(Boolean).join(' · '),
    intro:trecho(input.questao,350),cover:true,columns:2,
    blocks:[
     card('A resposta para sua questão',trecho(r.objetivo?.leitura||r.integrada||r.abertura,650),{
      tone:'soft',fullWidth:true,
      fields:[field('Por onde começar',trecho(r.objetivo?.proximo_passo,250))].filter(f=>f.text)
     }),
     card(guardiao,trecho(g.leitura,210),{
      eyebrow:'Seu Guardião',
      fields:[field('O que tenta proteger',trecho(g.beneficio,165)),field('O custo hoje',trecho(g.preco,165))].filter(f=>f.text)
     }),
     card(trecho(lugar.titulo||map.potencial||'Seu potencial em uso',85),trecho(lugar.leitura||p.leitura,280),{
      kind:'potencia',eyebrow:'Seu lugar de potência',tone:'soft',promise:promessa
     })
    ],
    details:respostas.length?[{title:'Como a leitura interpretou suas respostas',blocks:respostas}]:[]
   },
   {
    title:'Na hora em que acontecer',section:'RECONHECER · HONRAR · ATUALIZAR',
    intro:'Procure a situação mais parecida com a sua. Em Atualizar, você encontra uma resposta para testar.',
    blocks:[card('Seu plano para as próximas 72 horas',trecho(h72,450),{tone:'soft'})].filter(c=>c.body),
    table:situacoes(r.tabela_consulta.slice(0,3),true),
    details:[
     {title:'Todas as situações da sua leitura',table:situacoes(r.tabela_consulta)},
     {title:'Prática de cinco minutos e ações para sete dias',blocks:[
      card('Prática depois da leitura',pl.min5),
      card('Uma frase para experimentar',frase),
      card('Sete dias',null,{fields:passos})
     ].filter(c=>c.body||c.fields?.length)}
    ].filter(d=>d.table||d.blocks.length)
   },
   {
    title:est?'Sua Estação da Alma':'O que seu mapa acrescenta',
    section:'SEU MOMENTO DE VIDA',estacao:est?.estacao,columns:2,
    blocks:[
     ...(est?[card(trecho(est.titulo,70),trecho(est.leitura,300),{
      kind:'estacao',estacao:est.estacao,fullWidth:true,
      fields:[
       field('Por que esta estação',trecho(est.porque,210)),
       field('Sua fase de vida',trecho(est.fase_vida,180)),
       field('Um movimento para agora',trecho(est.gesto,150))
      ].filter(f=>f.text)
     })]:[]),
     ...nascimento(r)
    ],
    details:[
     {title:'Como o mapa de nascimento ajudou na leitura',blocks:[
      card('Mapa natal',r.bases_leitura?.natal),
      card('Numerologia e fases da vida',r.bases_leitura?.numerologia),
      card('Arcano pessoal',r.bases_leitura?.arcano),
      card('O que muda ao longo do ano',est?.ao_longo_do_ano)
     ].filter(c=>c.body)},
     {title:'Consultar as 12 áreas do seu mapa',blocks:areas.map(([key,label])=>card(label,r.areas_vida?.[key]?.texto,{
      estacao:r.estacoes_areas?.[key]?.estacao,
      fields:[
       field('O que a estação destaca',clean(r.estacoes_areas?.[key]?.leitura)),
       field('Um passo possível',clean(r.areas_vida?.[key]?.gesto))
      ].filter(f=>f.text)
     })).filter(c=>c.body)}
    ].filter(d=>d.blocks.length)
   }
  ];

  for(let start=0;start<12;start+=6){
   const months=r.meses.slice(start,start+6);
   const cards=months.map(m=>card(meses[m.mes-1]+' · '+m.ano,trecho(m.titulo,70),{
    kind:'mes',
    estacao:m.estacao,
    fields:[field('Foco',trecho(m.potencial,130)),field('O que fazer',trecho(m.passo,130))].filter(f=>f.text)
   }));
   pages.push({
    title:'Seus próximos meses',section:start?'MESES 7 A 12':'MESES 1 A 6',columns:2,months:true,
    intro:start?'':'Em cada mês, você encontra um foco e uma ação ligada à questão que trouxe.',
    legend:start===0&&cards.some(c=>Estacoes.obter(c.estacao)),blocks:cards,
    details:months.some(m=>m.cuidado||m.porque)?[{
     title:'Cuidados e contexto de cada mês',
     blocks:months.map((m,i)=>card(cards[i].label,null,{
      estacao:m.estacao,
      fields:[field('Por que esta estação',clean(m.porque)),field('Um cuidado',clean(m.cuidado))].filter(f=>f.text)
     })).filter(c=>c.fields.length)
    }]:[]
   });
  }
  return pages;
 }

 function tabelaPDF(rows){
  const table=situacoes(rows);
  const limits=[165,165,145,220];
  return {...table,widths:[.23,.235,.205,.33],
   rows:table.rows.map(row=>row.map((text,i)=>trecho(text,limits[i])))};
 }

 function casasDoEstudo(r){
  const natal=r.estudo_estacoes?.natal;
  const asc=natal?.Ascendente?.longitude;
  const solar=!Number.isFinite(asc);
  const base=solar?natal?.Sol?.longitude:asc;
  if(!Number.isFinite(base)||base<0||base>=360)return [];
  return areas.map((_,i)=>(solar?'Casa solar ':'Casa ')+(i+1)+' · '+signos[(Math.floor(base/30)+i)%12]);
 }

 function paginasPDF(map,profile={}){
  const r=resultado(map);
  const [capa,acao,estacao,...mensais]=paginas(map,profile);
  const input=contexto(r,map);
  const g=r.guardiao||{},p=r.potencial||{},pl=r.plano||{};
  const nome=primeiroNome(r,map,profile);
  const guardiao=clean(map.guardiao).replace(/^Guardi(?:ão|ã) (?:da|do|de) /iu,'')||'Seu padrão de proteção';
  const potencial=clean(map.potencial);
  const nomeArcano=clean(r.arcano_pessoal?.nome);
  const setenio=r.estudo_estacoes?.ciclos_atual?.faixa_setenio;
  const casas=casasDoEstudo(r);
  const rows=r.tabela_consulta;
  const apoio=trecho(r.lugar_potencia?.gesto||p.primeiro_gesto,200);
  const respostaLabels=['A pergunta','A cena','A reação','O receio','O que você quer'];
  const respostas=Entrada.campos.map((c,i)=>{
   const interpretacao=clean(r.sintese_respostas?.[c.key]);
   return card(respostaLabels[i],trecho(interpretacao||input[c.key],300),{
    original:interpretacao?trecho(input[c.key],215):'',fullWidth:true
   });
  }).filter(c=>c.body||c.original);

  capa.section='Sua pergunta de agora';
  capa.blocks[1].label=trecho(guardiao,72);
  capa.blocks[1].kind='headline';
  capa.blocks[2].fields=apoio?[field(potencial?'Potencial em uso · '+trecho(potencial,55):'Um gesto para experimentar',apoio)]:[];
  capa.nav=atalhosPDF;
  capa.audio=true;

  acao.table=tabelaPDF(rows.slice(0,3));
  acao.after=[card('Se a situação não aparecer em três dias',
   'Pense na última vez em que aconteceu e escreva a resposta que daria hoje. Deixe a frase à mão para a próxima vez.')];

  if(estacao.estacao){
   const box=estacao.blocks[0];
   if(Array.isArray(setenio)&&setenio.length===2&&setenio.every(Number.isInteger)){
    box.fields=box.fields.map(f=>f.label==='Sua fase de vida'?
     field('Seu setênio · dos '+setenio[0]+' aos '+setenio[1]+' anos',f.text):f);
   }
   estacao.note='As estações são lidas de forma simbólica para a situação que você trouxe.';
  }
  estacao.blocks=estacao.blocks.map(b=>b.label==='Seu arcano pessoal'&&nomeArcano?
   {...b,label:'Arcano pessoal · '+trecho(nomeArcano,65)}:b);

  mensais.forEach((page,i)=>{
   page.blocks=page.blocks.map((b,j)=>{
    const cuidado=trecho(r.meses[i*6+j]?.cuidado,108);
    const fields=b.fields.map(f=>field(f.label,trecho(f.text,112)));
    if(cuidado)fields.push(field('Um cuidado',cuidado));
    return {...b,fields};
   });
   if(i===0)page.intro='Cada caixa tem um foco, uma ação e um cuidado para o mês.';
  });

  const areasPDF=areas.map(([key,label],i)=>{
   const leitura=r.areas_vida?.[key];
   const passo=trecho(leitura?.gesto,120);
   return card(label,trecho(leitura?.texto,255),{
    kind:'area',eyebrow:casas[i],fields:passo?[field('Experimente',passo)]:[]
   });
  }).filter(b=>b.body||b.fields.length);
  const pratica=clean(pl.min5);
  const linhas=pratica.split(/\r?\n/u).map(t=>t.trim()).filter(Boolean);
  const orientacoes=linhas.length===1?pratica.split(/(?<=[.!?])\s+(?=[A-ZÁÂÃÉÊÍÓÔÕÚÇ])/u):linhas;
  const passos=orientacoes.length===5?orientacoes.map((text,i)=>card(
   'Min '+(i+1),trecho(text.replace(/^\d[.)-]\s*/u,''),190),{kind:'step'}
  )):[];
  const dias=Array.isArray(pl.dias)?pl.dias.slice(0,7).map((text,i)=>card('Dia '+(i+1),trecho(text,190),{kind:'step'})).filter(b=>b.body):[];
  const frase=trecho(r.frase_nova,240);
  const consulta=rows[0];
  const aprendizado=trecho(r.ano?.aprende?.leitura,220);

  const paginasExtras=[
   {
    title:'O que suas respostas mostram',section:'AS SUAS PALAVRAS E A LEITURA',
    intro:'Cada resposta ajuda a entender uma parte da situação que você quer mudar.',blocks:respostas,compact:true
   },
   {
    title:'Como seu Guardião entra em ação',section:'O QUE O TESTE ACRESCENTA',columns:2,
    blocks:[
     card('O que se repete',trecho(g.leitura,440),{eyebrow:guardiao,kind:'headline'}),
     card('O que tenta proteger',trecho(g.beneficio,265),{
      fields:[field('O custo hoje',trecho(g.preco,265))].filter(f=>f.text)
     }),
     card(potencial?'Potencial em uso · '+trecho(potencial,55):'O recurso que você pode usar',
      trecho(p.leitura||r.lugar_potencia?.leitura,440),{
       fullWidth:true,fields:[
        field('Como fica na prática',trecho(p.quando_livre,145)),
        field('Seu jeito de aprender',aprendizado),
        field('Qual passo cabe agora',apoio)
       ].filter(f=>f.text)
      }),
     card('Uma frase para experimentar',frase,{
      tone:'soft',fullWidth:true,
      fields:[field('Conversa com seu Guardião',trecho(r.conversa,460))].filter(f=>f.text)
     })
    ].filter(b=>b.body||b.fields?.length)
   },
   {
    title:'Sua rotina e seus recursos',section:'AS 12 ÁREAS DO SEU MAPA',columns:2,compact:true,blocks:areasPDF.slice(0,6)
   },
   {
    title:'Seus acordos e suas escolhas',section:'AS 12 ÁREAS DO SEU MAPA',columns:2,compact:true,blocks:areasPDF.slice(6)
   },
   {
    title:'Se a situação mudar de rumo',section:'RECONHECER · HONRAR · ATUALIZAR',blocks:[],
    intro:'Estas situações mostram outras formas de responder quando o padrão aparecer.',
    table:rows.length>3?tabelaPDF(rows.slice(3,6)):null,
    after:[card('Se o padrão reaparecer',
     'Repare em que momento você foi para a resposta de sempre. Retome a menor versão do passo que escolheu e anote o que aconteceu de fato.',
     {tone:'soft'})]
   },
   {
    title:'Cinco minutos para preparar sua resposta',section:'UMA PRÁTICA DEPOIS DA LEITURA',
    intro:'Escolha uma situação concreta e reserve cinco minutos para preparar o que você quer fazer.',audio:true,
    blocks:[
     ...passos,
     ...(!passos.length&&pratica?[card('Sua prática de cinco minutos',trecho(pratica,630))]:[]),
     card('Uma situação para testar',trecho(consulta?.situacao,165),{
      tone:'soft',fields:[field('Uma resposta possível',trecho(consulta?.atualizar,220))].filter(f=>f.text)
     })
    ].filter(b=>b.body||b.fields?.length)
   },
   {
    title:'Sete dias para experimentar',section:'PARA LEVAR A LEITURA À PRÁTICA',
    intro:'Use uma situação por vez. Se ela aparecer em outro dia, faça o passo que couber naquele momento.',
    blocks:dias,
    after:[card('Como conferir o que mudou',trecho(r.pergunta,170)||
     'Anote o que você fez, o que aconteceu e qual resposta quer repetir.',{tone:'soft'})]
   }
  ];

  return [capa,acao,estacao,...mensais,...paginasExtras].map(page=>({
   ...page,nome,exemplo:profile.exemplo===true
  }));
 }

 return {areas,meditacao,paginas,paginasPDF,paginasDoPDF};
});
