// Executa uma atualização administrativa previamente autorizada para um único mapa.
// Cada job tem token próprio, validade curta, cópia anterior e limite de tentativas.
'use strict';
const {gerarEstacoes}=require('./_gerar_estacoes.js');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({erro:'Método não permitido.'});
 const {job,token,fase}=req.body||{};
 if(typeof job!=='string'||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(job)||typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)||!['f','d'].includes(fase))return res.status(401).json({erro:'Trabalho não autorizado.'});
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_ANON_KEY;
 if(!base||!key||!process.env.ANTHROPIC_API_KEY)return res.status(503).json({erro:'Serviço indisponível.'});
 async function rpc(acao,parte={}){
  const r=await fetch(base+'/rest/v1/rpc/guardiao_processar_estacoes_salvas',{
   method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},
   body:JSON.stringify({p_acao:acao,p_job:job,p_token:token,p_fase:fase,p_payload:parte}),signal:AbortSignal.timeout(6000)
  });
  if(!r.ok){const e=new Error('Falha no trabalho');e.name=[401,403].includes(r.status)?'NaoAutorizado':'FalhaRpc';throw e;}return r.json();
 }
 let reserved=false;
 try{
  const gate=await rpc('iniciar');
  if(['pronta','concluido'].includes(gate.estado))return res.status(200).json({ok:true,estado:gate.estado,reutilizada:true});
  if(gate.estado!=='reservada')return res.status(409).json({erro:'A etapa não está disponível.',estado:gate.estado});
  reserved=true;
  const parte=await gerarEstacoes({fase,contexto:gate.contexto,mapa:gate.mapa,orientacaoRevisao:gate.orientacao_revisao});
  const done=await rpc('concluir',parte);if(!['pronta','concluido'].includes(done.estado))throw Error('Publicação pendente');
  reserved=false;return res.status(200).json({ok:true,estado:done.estado});
 }catch(e){
  if(reserved)try{await rpc('liberar',{erro:e.name==='RevisaoEstacoes'?e.message:'A etapa não foi concluída.'});}catch(_){}
  if(e.name==='NaoAutorizado')return res.status(401).json({erro:'Trabalho não autorizado.'});
  console.error('Atualização das estações:',fase,e.name,e.providerCode||'');
  return res.status(503).json({erro:'A etapa não foi publicada. A leitura anterior está preservada.',codigo:e.name==='RevisaoEstacoes'?'revisao':e.name==='FalhaIA'?'ia':'temporario'});
 }
};
