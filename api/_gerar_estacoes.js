'use strict';
const consulta=require('./_consulta.js');
const Estacoes=require('./_estacoes.js');
const {calcularCiclos}=require('./_ciclos.js');
const {obterContextoBibliografico}=require('./_biblioteca.js');
const {avaliarEditorial}=require('./_editorial.js');
const {SYSTEM}=require('./_geracao_sistema.js');
async function gerarEstacoes({fase,contexto,mapa,orientacaoRevisao}){
 const {teste,dossier,dadosCiclos}=contexto||{};
 const invalid=consulta.validarEntrada(teste);if(invalid||!['f','d'].includes(fase)||dossier?.areas?.length!==12)throw new Error('O contexto da leitura está incompleto.');
 const estudo=Estacoes.calcular(teste,dossier,dadosCiclos);if(!estudo)throw new Error('A edição das estações não foi definida.');
 const fontes=await obterContextoBibliografico(fase,teste,Estacoes.dadosPara(fase,estudo));if(!fontes)throw new Error('A biblioteca do método está indisponível.');
 const calculos={ciclos:calcularCiclos(dadosCiclos.nascimento,dadosCiclos.referencia),arcano_pessoal:consulta.arcanoPessoal(dadosCiclos.nascimento),estacoes:Estacoes.dadosPara(fase,estudo)};
 const leitura=mapa.resultado;
 const prompt=consulta.buildPromptConsulta(fase,teste,dossier,calculos,leitura)+Estacoes.instrucao(fase,estudo,leitura)+fontes
  +(orientacaoRevisao?'\nREVISÃO NECESSÁRIA DA TENTATIVA ANTERIOR: '+orientacaoRevisao+' Respeite os limites de caracteres e palavras de cada campo.':'');
 const response=await fetch('https://api.anthropic.com/v1/messages',{
  method:'POST',headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
  body:JSON.stringify({model:process.env.ANTHROPIC_MODEL||'claude-sonnet-5-5',max_tokens:fase==='d'?8000:6000,system:SYSTEM+'\nFrases curtas e linguagem fácil. Evite jornada, travada e expressões grandiosas. Respeite os limites de cada caixa.',messages:[{role:'user',content:prompt}],output_config:{effort:'medium',format:{type:'json_schema',schema:Estacoes.esquema(fase,consulta.schemas[fase],estudo)}}}),signal:AbortSignal.timeout(45000)
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.stop_reason==='max_tokens'){const e=new Error('A resposta da IA ficou indisponível ou incompleta.');e.name='FalhaIA';e.providerCode=data?.error?.type||data.stop_reason||'incompleta';throw e;}
 let parte=Estacoes.normalizar(JSON.parse((data.content||[]).filter(t=>t.type==='text').map(t=>t.text).join('')),fase,estudo);
 const error=consulta.validarParte(parte,fase)||Estacoes.validar(parte,fase,estudo,leitura);
 if(error){const e=new Error(error);e.name='RevisaoEstacoes';throw e;}
 if(avaliarEditorial(parte,fase,teste).length){const e=new Error('O texto precisa responder à questão sem frases genéricas.');e.name='RevisaoEstacoes';throw e;}
 parte={...Estacoes.anexar(parte,fase,estudo),versao_consulta:2};
 if(fase==='f'){parte.metodo_mensal=calculos.ciclos.metodo;parte.referencia_mensal=calculos.ciclos.referencia;}
 if(fase==='d'){
  const {renderConsulta}=require('./_consulta_pdf.js');
  try{await renderConsulta({...mapa,resultado:{...leitura,...parte}},{});}catch(_){const e=new Error('As caixas precisam de textos menores para caber nas 20 páginas.');e.name='RevisaoEstacoes';throw e;}
 }
 return parte;
}
module.exports={gerarEstacoes};
