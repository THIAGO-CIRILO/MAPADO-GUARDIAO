// Executor de jobs administrativos previamente autorizados no banco privado.
// Não cria jobs, não aceita dados de clientes do navegador e não expõe a chave da IA.
'use strict';
const {obterContextoBibliografico}=require('./_biblioteca.js');
const consulta=require('./_consulta.js');
const {calcularCiclos}=require('./_ciclos.js');
const {avaliarEditorial}=require('./_editorial.js');
const {SYSTEM}=require('./_geracao_sistema.js');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({erro:'Método não permitido.'});
 const {job,token}=req.body||{};
 if(typeof job!=='string'||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(job)||typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))
  return res.status(401).json({erro:'Trabalho não autorizado.'});
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_ANON_KEY,claude=process.env.ANTHROPIC_API_KEY;
 if(!base||!key||!claude)return res.status(503).json({erro:'Serviço indisponível.'});
 const rpc=async(acao,resultado={})=>{
  const r=await fetch(base+'/rest/v1/rpc/guardiao_processar_sintese_salva',{
   method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},
   body:JSON.stringify({p_acao:acao,p_job:job,p_token:token,p_resultado:resultado}),signal:AbortSignal.timeout(6000)
  });
  if(!r.ok){const e=new Error('Trabalho não autorizado');e.name=r.status===401||r.status===403?'NaoAutorizado':'FalhaRpc';throw e;}
  return r.json();
 };
 let reserved=false;
 try{
  const gate=await rpc('iniciar');
  if(gate.estado==='concluido')return res.status(200).json({ok:true,reutilizada:true});
  if(gate.estado!=='reservada')return res.status(409).json({erro:'O trabalho não está disponível para atualização.',estado:gate.estado});
  reserved=true;
  const {teste,dossier,dadosCiclos}=gate.contexto||{};
  if(consulta.validarEntrada(teste)||!dossier||dossier.areas?.length!==12)throw Error('Dados incompletos');
  const fontes=await obterContextoBibliografico('d',teste);
  if(!fontes)throw Error('Base do método indisponível');
  const calculos={ciclos:calcularCiclos(dadosCiclos?.nascimento,dadosCiclos?.referencia),arcano_pessoal:consulta.arcanoPessoal(dadosCiclos?.nascimento)};
  const r=await fetch('https://api.anthropic.com/v1/messages',{
   method:'POST',headers:{'Content-Type':'application/json','x-api-key':claude,'anthropic-version':'2023-06-01'},
   body:JSON.stringify({model:process.env.ANTHROPIC_MODEL||'claude-sonnet-5-5',max_tokens:4500,
    system:SYSTEM+'\nEdição de consulta rápida. Respeite os limites de palavras de cada campo.',
    messages:[{role:'user',content:consulta.buildPromptConsulta('d',teste,dossier,calculos,gate.mapa.resultado)+fontes
     +'\nResponda diretamente à questão e ao desejo. A leitura preparada não cria fatos novos. Não troque o desejo por conseguir aprovação de outra pessoa.'}],
    output_config:{effort:'medium',format:{type:'json_schema',schema:consulta.schemas.d}}}),signal:AbortSignal.timeout(45000)
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok||data.stop_reason==='max_tokens'){const e=new Error('Falha na IA');e.name='FalhaIA';throw e;}
  const parte=JSON.parse((data.content||[]).filter(x=>x.type==='text').map(x=>x.text).join(''));
  if(consulta.validarParte(parte,'d')||avaliarEditorial(parte,'d',teste).length){const e=new Error('Revisão pendente');e.name='RevisaoPendente';throw e;}
  const patch={objetivo:parte.objetivo,sintese_respostas:parte.sintese_respostas};
  const finished=await rpc('concluir',patch);
  if(finished.estado!=='concluido')throw Error('Publicação pendente');
  reserved=false;return res.status(200).json({ok:true});
 }catch(e){
  if(reserved)try{await rpc('liberar');}catch(_){}
  if(e?.name==='NaoAutorizado')return res.status(401).json({erro:'Trabalho não autorizado.'});
  console.error('Atualização de síntese:',e?.name||'Erro');
  return res.status(503).json({erro:'A síntese não foi atualizada. O mapa anterior está preservado.',codigo:e?.name==='RevisaoPendente'?'revisao':e?.name==='FalhaIA'?'ia':'temporario'});
 }
};
