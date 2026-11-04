(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();else root.GuardiaoEstacoes=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const paletas={
  inverno:{nome:'Inverno',verbo:'Recompor e preparar',accent:'#466175',fundo:'#EDF2F5',borda:'#C6D4DC'},
  primavera:{nome:'Primavera',verbo:'Começar e experimentar',accent:'#466541',fundo:'#EFF4EB',borda:'#CEDBC4'},
  verao:{nome:'Verão',verbo:'Dar presença e sustentar',accent:'#84580F',fundo:'#FBF2DC',borda:'#E8D5A6'},
  outono:{nome:'Outono',verbo:'Selecionar e concluir',accent:'#984B2C',fundo:'#F8EBE2',borda:'#E4C9B7'}
 };
 function chave(value){const s=typeof value==='string'?value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim():'';return Object.hasOwn(paletas,s)?s:null;}
 const obter=value=>paletas[chave(value)]||null;
 return {paletas,chave,obter,chaves:Object.keys(paletas)};
});
