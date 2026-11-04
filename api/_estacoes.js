'use strict';
const {chaves}=require('../consulta-estacoes.js');
const {AREA_KEYS}=require('./_consulta.js');
const {calcularTransitos}=require('./_transitos.js');
const T={type:'string'},season={type:'string',enum:chaves};
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const list=items=>({type:'array',items});
const refs=list(T);
function esquema(fase,base){
 if(fase==='f')return obj({meses:list(obj({titulo:T,potencial:T,cuidado:T,passo:T,estacao:season,porque:T,base_ids:refs}))});
 if(fase==='d')return obj({...base.properties,estacao_alma:obj({estacao:season,titulo:T,leitura:T,porque:T,fase_vida:T,questao:T,gesto:T,ao_longo_do_ano:T,base_ids:refs}),estacoes_areas:obj(Object.fromEntries(AREA_KEYS.map(k=>[k,obj({estacao:season,leitura:T,base_ids:refs})]))) });
 return base;
}
function calcular(teste,dossier,dadosCiclos){
 if(teste?.versao_consulta!==2||teste?.versao_estacoes!==1)return null;
 return calcularTransitos(dadosCiclos?.nascimento||dossier?.pessoa?.nascimento_iso,dadosCiclos?.referencia,dossier?.pessoa||{});
}
function dadosPara(fase,estudo){
 if(!estudo)return null;
 if(['d','f'].includes(fase))return estudo;
 const ids=new Set(estudo.meses[0].transitos.map(t=>t.id));
 return {...estudo,transitos:estudo.transitos.filter(t=>ids.has(t.id)),meses:[estudo.meses[0]]};
}
function instrucao(fase,estudo,leitura){
 if(!estudo)return '';
 const common=[
  'ESTAÇÕES DA ALMA: inverno = recompor e preparar; primavera = começar e experimentar; verao = dar presença e sustentar; outono = selecionar e concluir. São nomes simbólicos do Método Campo Guardião, distintos das estações climáticas. A interpretação combina o conjunto dos trânsitos calculados, a fase de sete anos e a numerologia com a questão, o desejo e as respostas do teste. Não associe automaticamente um planeta a uma estação, nem classifique apenas pela idade ou pelo cansaço. Considere sinais em direções diferentes e explique o critério.',
  'Os cálculos do servidor prevalecem sobre posições aproximadas do navegador. Use somente aspectos e intervalos presentes no estudo. Um intervalo é a janela em que o aspecto ficou dentro do orbe definido; não promete um acontecimento. As aproximações são diárias, não datas exatas de acontecimentos. Não invente eclipse, retrogradação, retorno ou aspecto. Sem hora confiável, Lua e ângulos estão ausentes: não os acrescente.',
  'Escreva em linguagem fácil. No texto para a pessoa, traduza os aspectos em temas concretos. Evite listas de planetas e termos técnicos. Explique o que a leitura esclarece e proponha uma escolha pequena. Uma estação não ordena parar a vida, adiar tudo nem determina dinheiro, doenças ou relacionamentos.',
  'ESTUDO CALCULADO E REFERÊNCIAS VÁLIDAS:\n'+JSON.stringify(dadosPara(fase,estudo))
 ];
 if(fase==='f')common.push(
  'Para cada um dos 12 meses, retorne estacao (inverno, primavera, verao ou outono) e porque: de 10 a 18 palavras e até 140 caracteres, ligado ao relato. Titulo 3 a 5 palavras; potencial 10 a 14 palavras (até 115 caracteres); cuidado 8 a 12 palavras (até 100 caracteres); passo 8 a 12 palavras (até 100 caracteres). Todos os campos terão caixas próprias. Não repita os mesmos conselhos nos 12 meses.',
  'base_ids: use pelo menos uma referência de trânsito daquele mês e uma referência numérica ou de setênio do mesmo mês. Se o mês não tem trânsito selecionado, use as referências numérica e de setênio. Os IDs ficam nos bastidores. Cada mês pode manter a estação anterior; mude a classificação apenas quando o estudo e o contexto sustentarem essa mudança. Não force as quatro estações a aparecer e não siga estações do calendário.'
 );
 if(fase==='d')common.push(
  'Preencha estacao_alma. estacao deve coincidir com a estação do primeiro mês da leitura já preparada: '+String(leitura?.meses?.[0]?.estacao||'a definir com base no estudo')+'. titulo: 3 a 7 palavras (até 65 caracteres). leitura: 35 a 50 palavras (até 360 caracteres). porque: 25 a 35 palavras (até 260 caracteres), explicando a combinação de referências e não uma causa comprovada. fase_vida: 20 a 30 palavras (até 220 caracteres), ligando setênio e ciclo pessoal à questão sem impor destino por idade. questao: 25 a 35 palavras (até 260 caracteres), resposta direta ao pedido. gesto: 12 a 20 palavras (até 150 caracteres). ao_longo_do_ano: 25 a 35 palavras (até 260 caracteres), usando as mudanças de estação realmente presentes nos 12 meses. base_ids deve incluir um trânsito atual, a referência de setênio atual e a referência numérica atual. Sem trânsito atual, use as duas últimas. Não exponha os IDs no texto.',
  'Preencha estacoes_areas para as 12 áreas. Cada estacao é uma leitura simbólica daquela área no momento atual e pode diferir da estação predominante. leitura: 12 a 22 palavras e até 160 caracteres. Retome o que a área esclarece no pedido, sem inventar fatos. base_ids deve conter area-CHAVE_DA_AREA e outra referência calculada aplicável. Respostas sem relato nessa área são possibilidades concretas, nunca biografia inventada.'
 );
 if(fase==='b')common.push('Para caber nas caixas da edição com estações, bases_leitura.natal até 45 palavras e 330 caracteres; numerologia até 35 palavras e 250 caracteres; arcano até 35 palavras e 250 caracteres.');
 return '\n\n'+common.join('\n\n');
}
function validar(parte,fase,estudo,leitura){
 if(!estudo)return null;
 const validSeason=x=>chaves.includes(x);
 const text=(s,min,max,words)=>typeof s==='string'&&s.trim().length>=min&&s.length<=max&&s.trim().split(/\s+/).length<=words;
 const all=new Set(estudo.meses.flatMap(m=>[m.base_numerologica,m.base_setenio,...m.transitos.map(t=>t.id)]));
 for(const k of AREA_KEYS)all.add('area-'+k);
 const current=estudo.meses[0];
 const validRefs=(xs,allowed)=>Array.isArray(xs)&&xs.length>=2&&xs.length<=8&&xs.every(x=>typeof x==='string'&&allowed.has(x));
 if(fase==='f'){
  if(!Array.isArray(parte?.meses)||parte.meses.length!==12)return 'A leitura das estações dos meses veio incompleta.';
  for(let i=0;i<12;i++){
   const p=parte.meses[i],m=estudo.meses[i],allowed=new Set([m.base_numerologica,m.base_setenio,...m.transitos.map(t=>t.id)]);
   if(!validSeason(p?.estacao)||!text(p.porque,20,140,18)||!text(p.titulo,6,65,7)||!text(p.potencial,15,115,16)||!text(p.cuidado,15,100,14)||!text(p.passo,15,100,14))return 'Uma caixa mensal precisa de ajuste de tamanho ou estação.';
   if(!validRefs(p.base_ids,allowed)||!p.base_ids.some(x=>x===m.base_numerologica||x===m.base_setenio)||m.transitos.length&&!p.base_ids.some(x=>m.transitos.some(t=>t.id===x)))return 'Um mês citou uma referência que não foi calculada para ele.';
  }
 }
 if(fase==='d'){
  const p=parte?.estacao_alma;
  if(!p||!validSeason(p.estacao)||leitura?.meses?.[0]?.estacao&&p.estacao!==leitura.meses[0].estacao)return 'A estação atual ficou diferente da leitura mensal.';
  for(const [k,min,max,words] of [['titulo',5,65,7],['leitura',35,360,50],['porque',35,260,35],['fase_vida',35,220,30],['questao',35,260,35],['gesto',20,150,20],['ao_longo_do_ano',35,260,35]])if(!text(p[k],min,max,words))return 'Uma caixa da Estação da Alma precisa de ajuste de tamanho.';
  if(!validRefs(p.base_ids,all)||!p.base_ids.includes(current.base_numerologica)||!p.base_ids.includes(current.base_setenio)||current.transitos.length&&!p.base_ids.some(x=>current.transitos.some(t=>t.id===x)))return 'A Estação da Alma precisa citar as referências atuais do estudo.';
  for(const k of AREA_KEYS){const a=parte.estacoes_areas?.[k];if(!a||!validSeason(a.estacao)||!text(a.leitura,20,160,22)||!validRefs(a.base_ids,all)||!a.base_ids.includes('area-'+k))return 'A estação de uma área veio incompleta ou sem referência válida.';}
 }
 return null;
}
function anexar(parte,fase,estudo){
 if(!estudo)return parte;
 if(fase==='f')return {...parte,versao_estacoes:1,meses:parte.meses.map((m,i)=>({...estudo.meses[i],...m}))};
 if(fase==='d')return {...parte,versao_estacoes:1,estudo_estacoes:estudo};
 return parte;
}
module.exports={calcular,dadosPara,instrucao,esquema,validar,anexar};
