/**
 * Validação editorial do Mapa do Guardião.
 *
 * Roda DEPOIS do JSON do Claude e ANTES de salvar a etapa.
 * Impede frases que desqualificam a entrega sem eliminar cautela responsável.
 * Nunca modifica uma leitura, nem atribui fatos biográficos ao cliente.
 */
'use strict';

const normalizar = value => String(value == null ? '' : value)
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/\s+/g,' ').trim();

const frasesDefensivas = [
  { tipo:'disclaimer de diagnostico ou previsao', re:/\b(?:nao (?:e|se trata de|constitui) (?:um[ao]? )?|nem (?:um[ao]? )?)(?:diagnostico|previsao|veredito|sentenca|laudo)\b/ },
  { tipo:'disclaimer de substituicao', re:/\b(?:nao substitui|nao serve como substituto|nao pretende substituir)\s+(?:(?:o|a|um|uma|seu|sua)\s+)?(?:acompanhamento|tratamento|terapia|consulta|atendimento|avaliacao|diagnostico|profissional|medicacao|psicologo|medico)\b/ },
  { tipo:'autorreferência ao produto', re:/\b(?:este|esse|o seu) (?:mapa|relatorio|material|documento) (?:foi escrito|foi feito|e um espelho|e uma lente|e um convite|nao pretende|nao e)\b/ },
  { tipo:'apresentacao generica', re:/\b(?:esse|este) mapa (?:nasceu|existe|chegou) para (?:voce|te)\b|\b(?:este|esse) mapa (?:reune|foi criado a partir d[ao]) (?:o que voce|suas respostas)\b/ },
  { tipo:'hipotese autorreferente', re:/\b(?:sao apenas hipoteses|sao hipoteses|feito de hipoteses|um conjunto de hipoteses)\b/ },
  { tipo:'metafora generica que substitui interpretacao', re:/\be (?:apenas |somente )?um espelho(?: de hipoteses| para voce)?\b/ },
  { tipo:'prefacio explicando como o mapa foi produzido', re:/\b(?:este|esse|o seu) (?:mapa|relatorio) (?:foi (?:criado|preparado|construido|elaborado) (?:a partir|com base|usando)|se baseia nas suas respostas)\b/ },
  { tipo:'responsabilidade transferida ao leitor', re:/\b(?:veja o que ressoa|fique com o que ressoa|deixe de lado o que nao serve|descarte o que nao fizer sentido|aproveite apenas o que fizer sentido)\b/ }
];

function textoDaLeitura(obj, caminho='', saida=[]) {
  if(typeof obj === 'string') {
    saida.push({ caminho, conteudo:obj });
  }else if(Array.isArray(obj)){
    obj.forEach((v,i)=>textoDaLeitura(v,caminho+'['+i+']',saida));
  }else if(obj && typeof obj==='object'){
    for(const [k,v] of Object.entries(obj)) textoDaLeitura(v,caminho?caminho+'.'+k:k,saida);
  }
  return saida;
}
function nomeTeste(o){
  if(typeof o === 'string')return o.trim();
  if(o && typeof o === 'object')return String(o.nome||'').trim();
  return '';
}
const termosGerais=new Set(('quero queria gostaria conseguir consigo preciso precisa pessoa pessoas questao pergunta problema resultado desejo resposta respostas agora hoje momento vida forma jeito sobre quando antes depois ainda mesmo mesma mais muito tenho tinha fazer feito dizer decidir entender saber posso pode para como isso esse essa este esta voce minha minhas meus meu seus suas nosso nossa alguma algum tambem estou estamos sentir sente medo mudar mudanca passo possivel escolher escolha observar preparar apenas porque pela pelo pelas pelos entre cada outro outra outros outras').split(' '));
function termosEspecificos(value){
  return new Set((normalizar(value).match(/[a-z]{4,}/g)||[])
    .filter(t=>!termosGerais.has(t)).map(t=>t.slice(0,6)));
}
function textosSemelhantes(a,b){
  const tokens=s=>new Set(normalizar(s).match(/[a-z]{3,}/g)||[]);
  const x=tokens(a),y=tokens(b);
  if(x.size<8||y.size<8)return false;
  const iguais=[...x].filter(t=>y.has(t)).length;
  return iguais/(x.size+y.size-iguais)>=.9;
}
function avaliarPersonalizacao(parte,fase,teste){
  if(teste?.versao_consulta!==2)return [];
  const avisos=[];
  for(const {caminho,conteudo} of textoDaLeitura(parte)){
    if(/\b(?:consulte a area ligada a sua pergunta|escolha uma aplicacao possivel|relacione isso a sua vida)\b/.test(normalizar(conteudo)))
      avisos.push({campo:caminho,problema:'orientacao generica no lugar da interpretacao da questao'});
  }
  if(fase==='d'){
    const input=teste.contexto_atual||{};
    const referencias=termosEspecificos(String(input.questao||'')+' '+String(input.desejo||''));
    const resposta=termosEspecificos(String(parte?.objetivo?.leitura||'')+' '+String(parte?.objetivo?.proximo_passo||''));
    // É um limite conservador: o texto deve retomar ao menos um detalhe do pedido.
    // Isso detecta uma resposta totalmente alheia; não substitui revisão semântica.
    if(referencias.size>=4&&![...referencias].some(t=>resposta.has(t)))
      avisos.push({campo:'objetivo',problema:'resposta sem detalhe especifico da questao ou do desejo'});
    const sintese=parte?.sintese_respostas;
    if(sintese&&typeof sintese==='object'){
      for(const [key,texto] of Object.entries(sintese)){
        if(normalizar(texto)===normalizar(input[key]))
          avisos.push({campo:'sintese_respostas.'+key,problema:'sintese apenas copia a resposta original'});
        if(Object.entries(sintese).some(([outra,outro])=>outra!==key&&textosSemelhantes(texto,outro)))
          avisos.push({campo:'sintese_respostas.'+key,problema:'sintese repete a mesma resposta para perguntas diferentes'});
      }
    }
  }
  if(fase==='c'){
    const areas=Object.entries(parte?.areas_vida||{});
    for(const campo of ['texto','gesto']){
      const repetido=areas.find(([,v])=>areas.filter(([,outro])=>textosSemelhantes(v?.[campo],outro?.[campo])).length>=4);
      if(repetido)avisos.push({campo:'areas_vida.'+campo,problema:'quatro ou mais areas repetem a mesma interpretacao ou acao'});
    }
  }
  return avisos;
}
function avaliarEditorial(parte, fase, teste={}) {
  const avisos=avaliarPersonalizacao(parte,fase,teste);
  const fields=textoDaLeitura(parte);
  for(const {caminho,conteudo} of fields){
    const txt=normalizar(conteudo);
    if(!txt)continue;
    for(const {tipo,re} of frasesDefensivas){
      if(re.test(txt)){
        avisos.push({campo:caminho,problema:tipo});
        break;
      }
    }
  }
  // Evita que uma mesma frase extensa apareça em diversos capítulos do mapa.
  const jaVistas=new Map();
  for(const {caminho,conteudo} of fields){
    for(const sentence of normalizar(conteudo).split(/[.!?]+\s+/)){
      const normalized=sentence.replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
      if(normalized.length<120)continue;
      const anterior=jaVistas.get(normalized);
      if(anterior && anterior!==caminho){
        avisos.push({campo:caminho,problema:'frase extensa identica repetida em '+anterior});
        break;
      }
      jaVistas.set(normalized,caminho);
    }
  }
  if(fase==='a'){
    const abertura=String(parte?.abertura||'').trim();
    const normalized=normalizar(abertura);
    if(!abertura || abertura.length<350){
      avisos.push({campo:'abertura',problema:'abertura sem profundidade suficiente'});
    }else{
      const guardiao=normalizar(nomeTeste(teste?.guardiao_principal));
      const potencial=normalizar(nomeTeste(teste?.potencial_principal));
      // A carta deve tocar ao menos uma descoberta daquele questionário.
      if(guardiao && potencial && !normalized.includes(guardiao) && !normalized.includes(potencial)){
        avisos.push({campo:'abertura',problema:'abertura sem referencias concretas aos resultados do teste'});
      }
    }
  }
  return avisos;
}
module.exports = { avaliarEditorial, avaliarPersonalizacao, normalizar };
