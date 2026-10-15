/* Recuperação manual de respostas originais. Sem chamadas ao Claude. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const cfg=window.APP_CONFIG||{};
const quiz=()=>window.GuardiaoQuestionario;
let client=null,selected=null,profile=null,submitting=false;
const message=(text,isError=false)=>{
 const e=$('manualStatus');if(e){e.textContent=String(text||'');e.style.color=isError?'#A93124':'#351A14';}
};
const assert=(r)=>{if(r.error)throw r.error;return r.data};
function textEl(tag,txt){
 const el=document.createElement(tag);
 el.textContent=String(txt||'');
 return el;
}
const qid=i=>'recoverQuestion'+i;
function setField(id,value){$(id).value=value==null?'':String(value);}
async function requireAdmin(){
 if(!client)client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
 const user=assert(await client.auth.getUser());
 if(!user?.user)throw Error('Sua sessão expirou. Entre novamente.');
 if(assert(await client.rpc('is_guardiao_admin'))!==true)throw Error('Acesso exclusivo do administrador.');
 return user.user;
}
function hide(){
 $('manualSection').hidden=true;
 selected=null;profile=null;
}
async function start(c){
 message('');
 if(!c||!c.user_id||c.tem_mapa)throw Error('Este caso não está disponível para recuperação manual.');
 if(c.etapas_prontas!==5)throw Error('Faltam etapas concluídas da leitura.');
 if(!quiz()?.questions?.length||typeof quiz()?.score!=='function')
  throw Error('O motor original do questionário não carregou. Atualize a página.');
 await requireAdmin();
 const r=await client.from('perfis').select('nome,nascimento,objetivo,hora,uf,cidade,lat,lon,tz,dst').eq('id',c.user_id).maybeSingle();
 if(r.error)throw r.error;
 selected=c;profile=r.data||{};
 setField('manualName',profile.nome);
 setField('manualBirth',profile.nascimento);
 setField('manualGoal',profile.objetivo);
 setField('manualTime',profile.hora);
 setField('manualUF',profile.uf);
 setField('manualCity',profile.cidade);
 $('manualClient').textContent=(c.nome||'Cliente')+' · '+c.email+' · '+quiz().questions.length+' perguntas originais';
 const host=$('manualQuestions');
 host.replaceChildren();
 quiz().questions.forEach((question,index)=>{
  const box=document.createElement('div');box.className='manualQ';
  const label=document.createElement('label');
  const txt=textEl('div',(index+1)+'. '+String(question?.[0]||'Pergunta'));
  label.append(txt);
  const select=document.createElement('select');select.id=qid(index);
  select.required=true;
  const initial=document.createElement('option');initial.value='';initial.textContent='Selecione a resposta efetivamente dada';select.append(initial);
  const options=Array.isArray(question?.[2])?question[2]:[];
  options.forEach((option,j)=>{
    const o=document.createElement('option');o.value=String(j);o.textContent=String(option[0]||'Alternativa '+(j+1));select.append(o);
  });
  const skipped=document.createElement('option');skipped.value='skip';skipped.textContent='Ela não respondeu esta pergunta';select.append(skipped);
  label.append(select);box.append(label);host.append(box);
 });
 $('manualSection').hidden=false;
 $('manualSection').scrollIntoView({behavior:'smooth',block:'start'});
 message('As interpretações já existem. Preencha somente as respostas originais confirmadas pela cliente.');
}
function collected(){
 const data={},questions=quiz().questions;
 for(let i=0;i<questions.length;i++){
  const value=$(qid(i)).value;
  if(value==='')throw Error('Escolha a resposta da pergunta '+(i+1)+'.');
  if(value==='skip')continue;
  const pos=Number(value);
  if(!Number.isInteger(pos)||pos<0||pos>=questions[i][2].length)throw Error('Alternativa inválida na pergunta '+(i+1));
  data[i]=pos;
 }
 if(Object.keys(data).length<8)throw Error('Há poucas respostas preenchidas para reconstruir as pontuações.');
 return data;
}
async function createReport(mapId,personName,email){
 const session=assert(await client.auth.getSession())?.session;
 if(!session?.access_token)throw Error('Entre novamente na conta administrativa.');
 const response=await fetch('/api/relatorio?id='+encodeURIComponent(mapId),{
   headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'
 });
 if(!response.ok){
   const j=await response.json().catch(()=>({}));
   throw Error(j.erro||'Erro ao montar o PDF.');
 }
 const blob=await response.blob();
 if(blob.size<1000||!blob.type.toLowerCase().includes('pdf'))throw Error('O PDF retornou vazio ou inválido.');
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 const safe=String(personName||email.split('@')[0]).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_-]+/g,'_').slice(0,60);
 a.href=url;a.download='Mapa_do_Guardiao_'+safe+'.pdf';
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),45000);
}
async function save(event){
 event.preventDefault();
 if(submitting||!selected)return;
 submitting=true;
 const btn=$('manualSubmit');btn.disabled=true;
 try{
  await requireAdmin();
  const Q=quiz(),respostas=collected(),scores=Q.score(respostas);
  const guardian=Q.guardians?.[scores.rg?.[0]]?.[0],wound=Q.wounds?.[scores.rw?.[0]]?.[0]||null;
  const potential=Q.potentials?.[scores.rp?.[0]]?.[0];
  if(!guardian||!potential)throw Error('Não foi possível calcular os resultados principais.');
  const nome=$('manualName').value.trim(),nascimento=$('manualBirth').value,objetivo=$('manualGoal').value.trim();
  if(nome.length<2||objetivo.length<5||!/^\d{4}-\d{2}-\d{2}$/.test(nascimento))
    throw Error('Nome, nascimento ou objetivo estão incompletos.');
  const work={
    nome,nascimento,objetivo,guardiao:guardian,ferida:wound,potencial:potential,
    hora:$('manualTime').value||null,uf:$('manualUF').value.trim().toUpperCase()||profile?.uf||null,
    cidade:$('manualCity').value.trim()||profile?.cidade||null,
    lat:profile?.lat??null,lon:profile?.lon??null,tz:profile?.tz??null,dst:!!profile?.dst
  };
  const previous=Array.isArray(Q.questions)?Q.questions:[];
  const teste={
   guardiao_principal:{nome:guardian},
   ferida_principal:wound?{nome:wound}:null,
   potencial_principal:{nome:potential},
   objetivo_da_pessoa:objetivo,
   respostas:previous.map((q,i)=>({
      pergunta:String(q[0]||''),
      resposta:respostas[i]===undefined?'Pergunta não respondida':String(q[2][respostas[i]][0]||'')
   }))
  };
  const confirmation='Os resultados calculados com as respostas digitadas são:\nGuardião: '+guardian+'\nFerida: '+(wound||'Não informada')+'\nPotencial: '+potential+
    '\n\nATENÇÃO: confirme que as alternativas foram informadas pela pessoa e correspondem às respostas originais. Isso não reescreve as cinco interpretações existentes. Salvar e gerar o PDF?';
  if(!window.confirm(confirmation))return;
  message('Registrando as respostas confirmadas e os resultados do teste…');
  assert(await client.rpc('guardiao_admin_salvar_questionario',{
    p_user_id:selected.user_id,p_respostas:respostas,p_scores:scores,p_perfil:work,p_teste:teste
  }));
  message('Questionário salvo no histórico. Reunindo as cinco interpretações existentes…');
  const id=assert(await client.rpc('guardiao_admin_finalizar',{p_user_id:selected.user_id}));
  if(!/^[a-f0-9-]{36}$/i.test(String(id)))throw Error('O banco não retornou um mapa válido.');
  message('Mapa recuperado! Preparando o PDF sem gerar nova leitura…');
  await createReport(id,nome,selected.email);
  message('PDF preparado. O mapa também está salvo na conta da pessoa. Recarregue o painel para verificar e registrar a entrega.');
  $('manualQuestions').replaceChildren();
  $('manualSubmit').disabled=true;
 }catch(e){message('Não foi possível concluir: '+String(e?.message||e).slice(0,350),true);}
 finally{submitting=false;if($('manualSubmit').disabled&&$('manualQuestions').children.length)btn.disabled=false;}
}
window.startManual=start;
$('manualForm').addEventListener('submit',save);
$('closeManual').addEventListener('click',hide);
$('cancelManual').addEventListener('click',hide);
})();