(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./consulta-entrada.js'),require('./consulta-estacoes.js'));
 else root.GuardiaoConsulta=factory(root.GuardiaoEntrada,root.GuardiaoEstacoes);
})(typeof globalThis!=='undefined'?globalThis:this,function(Entrada,Estacoes){
 'use strict';

 const areas=[['identidade','Identidade e corpo'],['dinheiro','Dinheiro e valores'],['comunicacao','Comunicação e estudos'],['familia','Casa e família'],['criatividade','Criatividade e prazer'],['rotina','Trabalho diário e saúde'],['relacionamentos','Relacionamentos'],['intimidade','Crises e intimidade'],['proposito','Propósito e expansão'],['carreira','Carreira e reconhecimento'],['coletivos','Amigos e coletivos'],['interioridade','Espiritualidade e interioridade']];
 const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
 const promessa={inicio:'O seu lugar de potência é onde',destaque:'a sua energia rende mais e custa menos.'};
 const clean=v=>typeof v==='string'?v.trim():'';
 const card=(label,body,props={})=>({label,body:clean(body),tone:'outline',...props});
 const field=(label,text)=>({label,text});

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
  const r=map.resultado||map.gt?.res||{};
  if(r.versao_consulta!==2)throw new Error('Esta leitura usa o formato anterior.');
  if(!Array.isArray(r.tabela_consulta)||r.tabela_consulta.length<3||r.meses?.length!==12)
   throw new Error('A leitura de consulta rápida ainda está incompleta.');

  const input=Entrada.contexto(r.entrada_consulta||map.respostas?._consulta||map.gt?.ans?._consulta);
  const nome=trecho(clean(r.dados_pessoa?.nome||profile.nome||map.name).split(/\s+/)[0],42);
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
+      card('Mapa natal',r.bases_leitura?.natal),
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

 return {areas,paginas};
});
