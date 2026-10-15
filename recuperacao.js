/* Central de recuperação do Mapa do Guardião.
   Controle administrativo no PostgreSQL (is_guardiao_admin + RPCs SECURITY DEFINER).
   Não recebe service_role nem Anthropic API key. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const cfg=window.APP_CONFIG||{};
let db=null,me=null,loading=false,items=[],selected=null;
const el=(tag,txt,cls)=>{
 const e=document.createElement(tag);
 if(txt!==undefined&&txt!==null)e.textContent=String(txt);
 if(cls)e.className=cls;
 return e;
};
function show(id,yes){$(id).hidden=!yes;}
function status(msg,error=false){const p=$('feedback');p.textContent=String(msg||'');p.className=error?'error':'';}
function errText(err){
 const text=String(err?.message||err||'Erro desconhecido');
 return text.slice(0,330);
}
function button(txt,handler,kind='ghost',disabled=false){
 const b=el('button',txt,kind+' small');b.type='button';b.disabled=disabled;
 if(handler)b.addEventListener('click',()=>handler().catch?.(e=>status(errText(e),true)));
 return b;
}
function pill(txt,kind){return el('span',txt,'status '+kind);}
function success(r){if(r.error)throw r.error;return r.data;}
function validUUID(id){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id));}
async function showLogin(){
 show('loading',false);show('panel',false);show('login',true);
}
async function auth(){
 show('loading',true);show('login',false);show('panel',false);
 try{
  if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY||!window.supabase)throw new Error('Supabase não configurado.');
  db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
  const session=success(await db.auth.getSession())?.session;
  if(!session){await showLogin();return;}
  me=session.user;
  const ok=success(await db.rpc('is_guardiao_admin'));
  if(ok!==true){await showLogin();$('loginFeedback').textContent='Esta conta não tem autorização para recuperar mapas.';return;}
  show('loading',false);show('panel',true);
  await load();
 }catch(e){await showLogin();$('loginFeedback').textContent=errText(e);}
}
async function login(event){
 event.preventDefault();$('loginFeedback').textContent='';
 const email=$('email').value.trim(),password=$('password').value;
 try{
  if(!db)throw new Error('Serviço de autenticação indisponível.');
  success(await db.auth.signInWithPassword({email,password}));
  $('password').value='';
  await auth();
 }catch(e){$('loginFeedback').textContent=errText(e);}
}
function statusFor(c){
 if(c.tem_mapa)return {label:'Mapa disponível',kind:'ok'};
 if(c.etapas_prontas===5 && c.tem_questionario)return {label:'Recuperável',kind:'ok'};
 if(c.etapas_prontas===5)return {label:'Aguardando questionário',kind:'wait'};
 return {label:'Leitura em andamento',kind:'warn'};
}
function statusPayment(c){
 if(c.pagamento==='ativo')return pill('Pagamento ativo','ok');
 if(c.pagamento==='pago_anteriormente')return pill('Compra registrada','wait');
 return pill('Pagamento não localizado','warn');
}
async function load(){
 if(loading)return;
 loading=true;
 status('Buscando os registros…');
 $('refresh').disabled=true;
 try{
  const q=$('search').value.trim();
  const rows=success(await db.rpc('guardiao_admin_casos',{p_busca:q}));
  if(!Array.isArray(rows))throw new Error('Lista de atendimentos inválida.');
  items=rows;
  $('count').textContent=String(rows.length);
  $('complete').textContent=String(rows.filter(x=>x.tem_mapa).length);
  $('blocked').textContent=String(rows.filter(x=>!x.tem_mapa).length);
  const body=$('cases');body.replaceChildren();
  if(!rows.length){
    const td=el('td','Nenhuma leitura encontrada.');td.colSpan=6;
    const tr=el('tr');tr.append(td);body.append(tr);
  }
  for(const c of rows){
   const tr=el('tr');
   const who=el('td');who.append(el('div',c.nome||'Nome ainda não salvo','itemName'),el('div',c.email,'small muted'));
   tr.append(who);
   const pay=el('td');pay.append(statusPayment(c));tr.append(pay);
   const phases=el('td');phases.append(el('strong',c.etapas_prontas+'/5'));
   phases.append(el('div',c.etapas_prontas===5?'Textos principais salvos':'Etapas faltantes: '+c.etapas_pendentes,'small muted'));tr.append(phases);
   const snap=el('td');snap.append(pill(c.tem_questionario?'Salvo':'Não armazenado',c.tem_questionario?'ok':'warn'));tr.append(snap);
   const st=el('td');const state=statusFor(c);st.append(pill(state.label,state.kind));
   if(c.ultima_entrega)st.append(el('div','Entrega registrada em '+new Date(c.ultima_entrega).toLocaleDateString('pt-BR'),'small muted'));tr.append(st);
   const ac=el('td'),action=el('div',null,'actions');
   action.append(button('Ver histórico',async()=>showDetails(c)));
   if(c.tem_mapa){
    action.append(button('Baixar PDF',async()=>downloadPdf(c.mapa_id,c),'dark'));
    action.append(button('Marcar entregue',async()=>registerDelivery(c)));
   }else if(c.tem_questionario&&c.etapas_prontas===5&&c.pagamento!=='não_localizado'){
    action.append(button('Gerar PDF manualmente',async()=>recover(c),'dark'));
   }else if(!c.tem_questionario&&c.etapas_prontas===5){
    action.append(button('Solicitar dados',async()=>copyRequest(c)));
   }
   ac.append(action);tr.append(ac);body.append(tr);
  }
  status(rows.length+' registro(s) encontrados. Nenhuma consulta desta página gera chamadas ao Claude.');
 }catch(e){status('Falha ao carregar os casos: '+errText(e),true);}
 finally{loading=false;$('refresh').disabled=false;}
}
async function showDetails(c){
 selected=c;
 show('detailSection',true);
 $('detailTitle').textContent=(c.nome||'Cliente')+' · '+c.email;
 $('detailSummary').textContent='Carregando o histórico…';
 $('answers').replaceChildren();
 try{
  const hist=success(await db.rpc('guardiao_admin_detalhes',{p_user_id:c.user_id}));
  if(!hist)throw new Error('Histórico não localizado.');
  const phases=Array.isArray(hist.etapas)?hist.etapas:[];
  $('detailSummary').textContent=
   'Interpretações: '+phases.map(p=>p.fase.toUpperCase()+' '+(p.estado==='pronta'?'pronta':p.estado)).join(' · ')
   +'. Questionário: '+(hist.questionario_disponivel?'salvo':'ainda não armazenado')+'.';
  const answers=$('answers');
  const profile=hist.perfil||{};
  if(profile.nome||profile.objetivo){
   const main=el('div',null,'qa');
   main.append(el('strong','Dados e objetivo informados'));
   main.append(el('span',[profile.nome,profile.nascimento,profile.objetivo].filter(Boolean).join(' · ')));
   answers.append(main);
  }
  const teste=hist.teste||{},qs=Array.isArray(teste.respostas)?teste.respostas:[];
  if(qs.length){
   for(const qa of qs.slice(0,80)){
    const box=el('div',null,'qa');
    box.append(el('strong',qa.pergunta||'Pergunta'));
    box.append(el('span',qa.resposta||'Não informado'));
    answers.append(box);
   }
  } else answers.append(el('p','As respostas individuais ainda não foram armazenadas no servidor. A pessoa poderá enviá-las pelo próprio questionário, se ainda estiverem no navegador.','muted'));
  const legend=el('div',null,'qa');
  legend.append(el('strong','Dados para diagramação'));
  legend.append(el('span','Guardião: '+(profile.guardiao||'não cadastrado')+' · Potencial: '+(profile.potencial||'não cadastrado')+' · Ferida: '+(profile.ferida||'não informada')));
  answers.append(legend);
 }catch(e){$('detailSummary').textContent='Não foi possível ler o histórico: '+errText(e);}
 $('detailSection').scrollIntoView({behavior:'smooth',block:'start'});
}
async function copyRequest(c){
 const msg='Olá! Sua leitura do Mapa do Guardião está salva, mas o questionário precisa ser sincronizado com a nossa equipe. Entre no site https://mapado-guardiao.vercel.app/ com o mesmo e-mail da compra e, se aparecer a tela de erro, toque em "Enviar dados ao suporte". Não precisa comprar de novo nem gerar uma nova leitura. Depois me avise.';
 try{
  if(navigator.clipboard?.writeText){
   await navigator.clipboard.writeText(msg);
   status('Mensagem de orientação copiada. Envie-a à pessoa pelo canal de atendimento.');
  }else{
   window.prompt('Copie esta orientação para enviar à cliente:',msg);
  }
 }catch(e){window.prompt('Copie esta orientação:',msg);}
}
async function recover(c){
 if(!c.tem_questionario||c.etapas_prontas!==5)return status('Não há material suficiente para uma recuperação segura.',true);
 if(!window.confirm('Recuperar e registrar o mapa de '+c.email+' usando APENAS as cinco etapas já salvas, sem chamar o Claude?'))return;
 status('Reunindo as etapas existentes e registrando o mapa…');
 try{
  const id=success(await db.rpc('guardiao_admin_finalizar',{p_user_id:c.user_id}));
  if(!validUUID(id))throw new Error('O sistema não retornou um mapa válido.');
  status('Mapa recuperado e salvo na conta da cliente. Preparando o PDF…');
  await load();
  await downloadPdf(id,c);
 }catch(e){status('A recuperação não foi concluída: '+errText(e),true);}
}
async function downloadPdf(id,c){
 if(!validUUID(id))return status('Mapa inválido ou ainda não salvo.',true);
 const {data,error}=await db.auth.getSession();
 if(error||!data?.session?.access_token)return status('Sua sessão expirou. Entre novamente.',true);
 status('Montando o PDF salvo, sem consumir créditos do Claude…');
 try{
  const resp=await fetch('/api/relatorio?id='+encodeURIComponent(id),{
   method:'GET',headers:{Authorization:'Bearer '+data.session.access_token},cache:'no-store'
  });
  if(!resp.ok){
   const j=await resp.json().catch(()=>({}));
   throw new Error(j.erro||'O servidor não conseguiu preparar o PDF.');
  }
  const blob=await resp.blob();
  if(blob.size<1000||!String(blob.type||'').toLowerCase().includes('pdf'))
    throw new Error('O arquivo gerado está vazio ou não é um PDF válido.');
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  const safe=String(c.nome||c.email.split('@')[0]).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,50);
  a.href=url;a.download='Mapa_do_Guardiao_'+safe+'.pdf';
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),45000);
  status('PDF preparado e disponibilizado para download. Se você enviar à pessoa, use depois "Marcar entregue" para registrar o atendimento.');
 }catch(e){status('Falha ao gerar PDF: '+errText(e),true);}
}
async function registerDelivery(c){
 if(!window.confirm('Você já enviou o PDF à pessoa? Esta ação registra somente uma entrega realizada por você.'))return;
 try{
  success(await db.rpc('guardiao_admin_registrar_entrega',{p_user_id:c.user_id,p_nota:'Entrega manual confirmada pelo administrador'}));
  status('Entrega registrada no histórico da conta.');
  await load();
 }catch(e){status('Não foi possível registrar a entrega: '+errText(e),true);}
}
function ready(){
 $('loginForm').addEventListener('submit',login);
 $('searchForm').addEventListener('submit',e=>{e.preventDefault();load()});
 $('refresh').addEventListener('click',load);
 $('logout').addEventListener('click',async()=>{if(db)await db.auth.signOut();me=null;items=[];await showLogin();});
 $('closeDetail').addEventListener('click',()=>show('detailSection',false));
 auth();
}
ready();
})();