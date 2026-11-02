(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.GuardiaoEntrada=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const campos=[
    {key:'questao',titulo:'Qual questão você quer entender agora?',ajuda:'Escolha a questão principal desta leitura. As outras áreas entram como apoio.',exemplo:'Quero mudar minha forma de trabalhar, mas tenho medo de perder minha autonomia.',max:350},
    {key:'cena',titulo:'Conte uma situação recente em que isso apareceu.',ajuda:'O que aconteceu? Quem estava envolvido? Conte só o que quiser compartilhar.',exemplo:'Recebi um convite para outra função, mas adiei a conversa sobre as condições.',max:700},
    {key:'reacao',titulo:'Nessa hora, o que passa na sua cabeça e o que você faz?',ajuda:'Pode escrever o pensamento e a reação com suas palavras.',exemplo:'Penso que posso perder a estabilidade. Procuro mais informações e deixo a resposta para depois.',max:700},
    {key:'receio',titulo:'O que você teme perder se responder de outro jeito?',ajuda:'Nomeie o que importa para você nessa situação.',exemplo:'Tenho medo de perder a renda que conquistei e voltar a depender da família.',max:500},
    {key:'desejo',titulo:'O que você gostaria de conseguir dizer, decidir ou fazer?',ajuda:'Um resultado possível para a situação de agora.',exemplo:'Quero conseguir conversar sobre as condições antes de decidir.',max:350}
  ];
  function limpar(value,max){return typeof value==='string'?value.replace(/\u0000/g,'').trim().slice(0,max):'';}
  function contexto(value){
    const x=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    return Object.fromEntries(campos.map(c=>[c.key,limpar(x[c.key],c.max)]));
  }
  function validar(value){
    const x=contexto(value);
    return campos.filter(c=>x[c.key].length<5).map(c=>c.key);
  }
  function novo(answers){return answers?._consulta?.versao===2;}
  const arcanos=['','O Mago','A Sacerdotisa','A Imperatriz','O Imperador','O Papa','Os Enamorados','O Carro','A Justiça','O Eremita','A Roda da Fortuna','A Força','O Enforcado','A Morte','A Temperança','O Diabo','A Torre','A Estrela','A Lua','O Sol','O Julgamento','O Mundo','O Louco'];
  function arcanoPessoal(date){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date||'')))return null;
    const d=new Date(date+'T12:00:00Z');
    if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==date)return null;
    let numero=String(date).replace(/\D/g,'').split('').reduce((s,n)=>s+Number(n),0);
    const soma=numero;
    while(numero>22)numero=String(numero).split('').reduce((s,n)=>s+Number(n),0);
    return {numero,nome:arcanos[numero],soma,metodo:'AP-22: soma dos algarismos da data, com nova soma enquanto o resultado exceder 22; Justiça 8, Força 11 e Louco 22.'};
  }
  return {campos,contexto,validar,novo,arcanoPessoal};
});
