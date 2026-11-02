(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();else root.GuardiaoContexto=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const campos=[
  {key:'ritmo',titulo:'Como você está ao olhar para essa questão hoje?',ajuda:'Pense no seu momento de agora. Isso ajuda a ajustar o ritmo das sugestões.',opcoes:['Consigo parar e olhar com calma.','Meus pensamentos aceleram e volto às mesmas dúvidas.','Estou com pouca disposição para mais uma tarefa.','Oscilo entre querer resolver tudo e adiar.','Prefiro não responder.']},
  {key:'apoio',titulo:'O que mais faz falta para o próximo passo?',ajuda:'Escolha o apoio mais necessário na situação que você contou.',opcoes:['Informação para entender o que fazer.','Uma conversa ou um acordo com outra pessoa.','Tempo ou condições práticas.','Apoio para sustentar uma escolha.','Prefiro não responder.']},
  {key:'passo',titulo:'Qual tamanho de passo cabe na sua realidade agora?',ajuda:'Uma etapa pequena também conta. Escolha o que você consegue experimentar.',opcoes:['Observar e registrar o que acontece.','Preparar uma pergunta ou uma conversa.','Experimentar uma ação pequena.','Tomar uma decisão com as informações que já tenho.','Prefiro não responder.']}
 ];
 function respostas(value){const raw=value&&typeof value==='object'?value:{};return Object.fromEntries(campos.map(c=>{const v=typeof raw[c.key]==='string'?raw[c.key]:raw[c.key]?.resposta;return [c.key,c.opcoes.includes(v)?v:''];}));}
 function contexto(value){const r=respostas(value);return Object.fromEntries(campos.filter(c=>r[c.key]).map(c=>[c.key,{pergunta:c.titulo,resposta:r[c.key]}]));}
 function validar(value){const r=respostas(value);return campos.filter(c=>!r[c.key]).map(c=>c.key);}
 function tema(i){return i===2?'Seus recursos':i===8?'Seu jeito de aprender':i===9?'Seu jeito de atuar':i===5?'Uma referência opcional':'Reações e escolhas';}
 function versaoRascunho(value,count=10){if(value?.contextoVersion===0||value?.contextoVersion===1)return value.contextoVersion;if(campos.some(c=>respostas(value?.contextosComplementares)[c.key]))return 1;return Array.from({length:count},(_,i)=>i).some(i=>value?.ans?.[i]!==undefined)?0:1;}
 return {campos,respostas,contexto,validar,tema,versaoRascunho};
});
