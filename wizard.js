/* ===== MAPA DO GUARDIÃO · app em etapas, login (Supabase) e geração (servidor) ===== */
(() => {
const CFG = window.APP_CONFIG || {};
const ADMIN = (CFG.ADMIN_EMAIL || 'contato.energystudio@gmail.com').toLowerCase();
// Confirmation and password recovery must always return to the public site,
// even if a user starts registration from a localhost preview.
const AUTH_REDIRECT_URL = 'https://mapado-guardiao.vercel.app/';
let sb = null;
try { if (CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase) sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY); } catch (e) { sb = null; }
// download direto no navegador (o app original usava o recurso de download do Claude)
window.claude = { use: async n => n === 'downloads' ? { save: async ({ filename, data }) => { const a = document.createElement('a'); a.href = URL.createObjectURL(data); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); } } : null };

const D = gtDraft;
const W = { screen: 'boot', mode: 'signup', msg: '', err: '', user: null, maps: [], cities: null, busy: false, results: [], viewing: null };
const Entrada = window.GuardiaoEntrada;
const Contexto = window.GuardiaoContexto;
const apoioSteps=()=>D.contextoVersion===1?Contexto.campos.map(c=>'apoio_'+c.key):[];
const quizSteps=()=>['teste',...GT_Q.map((_,i)=>'q'+i)];
// Drafts already answered keep their original signature and generation format.
D.flowVersion = D.flowVersion || (GT_Q.some((_,i)=>D.ans[i]!==undefined) ? 1 : 2);
D.contextoVersion=Contexto.versaoRascunho(D,GT_Q.length);
let STEPS = [...(D.flowVersion===2 ? Entrada.campos.map(c=>'ctx_'+c.key) : []), 'dados1', 'dados2', ...quizSteps(), ...(D.flowVersion===2?apoioSteps():[]), 'obj'];
function intake(){return Entrada.contexto(D.ans?._consulta);}
function saveIntake(key,value){D.ans._consulta={versao:2,...intake(),[key]:String(value).slice(0,Entrada.campos.find(c=>c.key===key).max)};if(key==='questao')D.goal=value;gtSave();}
function newFirstStep(){return D.flowVersion===2?'ctx_questao':'dados1';}
function prepareReading(asAdmin=false){W.mapReady=true;const old=!!W.sourceMap&&W.sourceMap.resultado?.versao_consulta!==2;W.screen=old||asAdmin||W.preparedMaps?.has(W.activeMapId)?'result':'preparar';wz();window.scrollTo(0,0);}
function pauseMeditation(){const a=$('wzMeditation');if(a)a.pause();}
function upgradeSteps(){return [...Entrada.campos.map(c=>'ctx_'+c.key),...(!W.upgradeFrozen?apoioSteps():[]),'obj'];}
async function startUpgrade(){
  const m=W.sourceMap,f=W.sourceProfile||{};
  if(W.busy||!m||m.user_id!==W.user?.id||m.resultado?.versao_consulta===2)return;
  pauseMeditation();W.busy=true;
  let pending;
  try{
    const checkpoint=await sb.rpc('guardiao_atualizar_consulta',{p_acao:'referencia',p_mapa_id:m.id});
    if(checkpoint.error||!['disponivel','concluido'].includes(checkpoint.data?.estado))throw new Error('Atualização indisponível.');
    pending=checkpoint.data;
  }catch(e){W.busy=false;W.err='Não consegui abrir a atualização. Sua leitura anterior está preservada. Atualize a página e tente novamente.';W.screen='erro';return wz();}
  W.busy=false;
  if(pending.estado==='concluido')return openMap(m.id,false);
  const resume=D.upgradeMapId===m.id;
  if(!resume){
    D.ans={...m.respostas,_consulta:{versao:2,...Entrada.contexto({questao:f.objetivo||''})}};
    Object.assign(D,{name:f.nome||'',birth:f.nascimento||'',time:f.hora||'',uf:f.uf||'',city:f.cidade||'',lat:f.lat??'',lon:f.lon??'',tz:f.tz??-3,dst:!!f.dst,goal:f.objetivo||'',aceite:false,step:'ctx_questao'});
    D.contextoVersion=1;D.contextosComplementares={};W.assinaturaAtualizacao=null;W.partesGeradas={};W.assinaturaGeracao=null;
  }
  W.upgradeFrozen=!!pending.contexto?.teste?.contexto_atual;
  if(W.upgradeFrozen){D.ans._consulta={versao:2,...Entrada.contexto(pending.contexto.teste.contexto_atual)};D.goal=intake().questao;D.step='obj';W.assinaturaAtualizacao=pending.assinatura;}
  if(W.upgradeFrozen){D.contextosComplementares=Contexto.respostas(pending.contexto.teste.contextos_complementares);D.contextoVersion=Object.keys(pending.contexto.teste.contextos_complementares||{}).length?1:0;}
  D.flowVersion=2;D.upgradeMapId=m.id;STEPS=upgradeSteps();
  if(!STEPS.includes(D.step))D.step='ctx_questao';
  W.mapReady=false;W.err='';W.msg='';W.screen='step';gtSave();wz();window.scrollTo(0,0);
}


const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const isAdmin = () => W.user && (W.user.email || '').toLowerCase() === ADMIN;
const root = () => $('gtBody');
let bar = null;

function resetDraft(keepPerson) {
  W.upgradeFrozen=false;
  const keep = keepPerson ? { name: D.name, birth: D.birth, time: D.time, uf: D.uf, city: D.city, lat: D.lat, lon: D.lon, tz: D.tz, dst: D.dst, manual: D.manual } : {};
  Object.keys(D).forEach(k => delete D[k]);
  Object.assign(D, { ans: {}, name: '', birth: '', time: '', uf: '', city: '', lat: '', lon: '', tz: -3, dst: false, goal: '', aceite: false, pid: null, step: 'ctx_questao', flowVersion: 2, contextoVersion:1,contextosComplementares:{},manual: false }, keep);
  STEPS = [...Entrada.campos.map(c=>'ctx_'+c.key),'dados1','dados2',...quizSteps(),...apoioSteps(),'obj'];
  gtSave();
}
if (!D.step) { D.step = newFirstStep(); if (D.city === 'Ribeirão Preto, SP') { D.city = ''; D.lat = ''; D.lon = ''; } D.uf = D.uf || ''; D.tz = D.tz ?? -3; }
function syncLocal() {
  if (!W.user) return;
  if (db.gtUser !== W.user.id) { db.people = db.people.filter(x => !x.gt); db.gtUser = W.user.id; resetDraft(false); save(); }
}
async function loadMaps() {
  W.maps = [];
  if (!sb || !W.user) return;
  const { data } = await sb.from('mapas').select('id,created_at,guardiao,ferida,potencial').eq('user_id', W.user.id).order('created_at', { ascending: false });
  W.maps = data || [];
}
async function cities() {
  if (W.cities) return W.cities;
  try { W.cities = await (await fetch('/cidades.json')).json(); } catch (e) { W.cities = {}; }
  return W.cities;
}
const dotsHtml = cur => { const i = STEPS.indexOf(cur); return `<div class="wz-dots" role="img" aria-label="Etapa ${i + 1} de ${STEPS.length}">${STEPS.map((s, j) => `<i class="${j < i ? 'on' : j === i ? 'now' : ''}"></i>`).join('')}</div>`; };
const fdate = iso => { try { return new Date(iso).toLocaleDateString('pt-BR'); } catch (e) { return ''; } };

function drawBar() {
  if (!bar) { bar = document.createElement('div'); bar.className = 'wz-bar'; $('gt').insertBefore(bar, root()); }
  const inApp = !['boot', 'welcome', 'config'].includes(W.screen);
  bar.innerHTML = `<b>Mapa do Guardião</b><div class="btns">${isAdmin() ? '<a href="/admin"><button class="ghost" type="button">Painel admin</button></a>' : ''}${W.user && inApp ? '<button class="ghost" id="wzOut" type="button">Sair</button>' : ''}</div>`;
  bar.hidden = W.screen === 'boot';
}
function wz() {
  drawBar();
  const R = root(), s = W.screen;
  if (s === 'boot') { R.innerHTML = '<div class="wz"><div class="wz-load"><span class="gt-dot"></span><p class="wz-msg">Carregando…</p></div></div>'; return; }
  if (s === 'config') { R.innerHTML = '<div class="wz"><div class="wz-card"><h2>Falta configurar</h2><p class="lead">Preencha o arquivo <b>config.js</b> com o endereço e a chave pública do seu Supabase (veja o README) e publique de novo.</p></div></div>'; return; }
  if (s === 'welcome') {
    R.innerHTML = `<div class="wz"><div class="wz-card" style="padding:28px 20px;gap:18px"><span class="eyebrow">Campo Guardião</span><h1 style="font-size:2.3rem;line-height:1.05">Mapa do Guardião</h1><p class="wz-promise">O seu lugar de potência é onde <em>a sua energia rende mais e custa menos.</em></p><p class="wz-sub">Conte sua questão, responda às dez perguntas fixas e às três perguntas sobre o momento atual. O mapa reúne suas respostas, as 12 áreas da vida e um próximo passo possível.</p><div class="wz-nav"><button id="wzStart" type="button">${W.user ? (W.maps.length ? 'Entrar no meu mapa' : 'Começar') : 'Começar'}</button></div>${W.user ? '' : '<button class="wz-link" id="wzHave" type="button">Já tenho conta</button>'}<p class="gt-note">Em poucos minutos, você conhece seu Guardião, seus potenciais e os primeiros passos para agir de outro jeito.</p></div></div>`; return;
  }
  if (s === 'auth') {
    const m = W.mode;
    R.innerHTML = `<div class="wz"><div class="wz-card"><h2>${m === 'login' ? 'Entrar' : m === 'forgot' ? 'Recuperar senha' : 'Criar a sua conta'}</h2><p class="lead">${m === 'forgot' ? 'Digite o seu e-mail e enviaremos um link para criar uma nova senha.' : 'Assim o seu mapa fica salvo e você acessa pelo celular ou pelo computador.'}</p>
      ${m === 'forgot' ? '' : `<div class="wz-tabs" role="tablist"><button type="button" role="tab" id="wzTabS" aria-selected="${m === 'signup'}">Criar conta</button><button type="button" role="tab" id="wzTabL" aria-selected="${m === 'login'}">Já tenho conta</button></div>`}
      <label>E-mail<input id="wzEmail" type="email" autocomplete="email" inputmode="email" value="${esc(W.email || '')}"></label>
      ${m === 'forgot' ? '' : `<label>Senha${m === 'signup' ? ' (mínimo 6 caracteres)' : ''}<input id="wzPass" type="password" autocomplete="${m === 'login' ? 'current-password' : 'new-password'}"></label>`}
      <p class="wz-err" role="alert">${esc(W.err)}</p><p class="wz-msg">${esc(W.msg)}</p>
      <div class="wz-nav"><button class="ghost" id="wzBackW" type="button">Voltar</button><button id="wzAuth" type="button"${W.busy ? ' disabled' : ''}>${m === 'login' ? 'Entrar' : m === 'forgot' ? 'Enviar link' : 'Criar conta'}</button></div>
      ${m === 'login' ? '<button class="wz-link" id="wzForgot" type="button">Esqueci a minha senha</button>' : ''}</div></div>`; return;
  }
  if (s === 'aguardando') {
    R.innerHTML = `<div class="wz"><div class="wz-card"><h2>Estamos aguardando a confirmação do pagamento</h2><p class="lead">Sua conta está criada. Para liberar seu único Mapa do Guardião, o pagamento precisa estar aprovado na Kiwify usando o mesmo e-mail: <b>${esc(W.user?.email || '')}</b>.</p><p class="wz-msg">Após a confirmação, você poderá responder ao questionário uma vez e consultar seu mapa e PDF pelo painel.</p><div class="wz-nav"><button id="wzCheckPayment" type="button">Verificar meu acesso</button></div><p class="gt-note">Se comprou com outro e-mail, entre com a conta correspondente ou fale com o suporte.</p></div></div>`; return;
  }
  if (s === 'confirma') { R.innerHTML = `<div class="wz"><div class="wz-card"><h2>Confira o seu e-mail</h2><p class="lead">Enviamos um link para <b>${esc(W.email || '')}</b>. Clique nele para confirmar e depois volte aqui para entrar.</p><div class="wz-nav"><button id="wzToLogin" type="button">Já confirmei, entrar</button></div></div></div>`; return; }
  if (s === 'novasenha') { R.innerHTML = `<div class="wz"><div class="wz-card"><h2>Nova senha</h2><label>Nova senha (mínimo 6 caracteres)<input id="wzPass" type="password" autocomplete="new-password"></label><p class="wz-err" role="alert">${esc(W.err)}</p><div class="wz-nav"><button id="wzSetPass" type="button">Salvar senha</button></div></div></div>`; return; }
  if (s === 'lista') {
    R.innerHTML = `<div class="wz"><div class="wz-card"><h2>Meu Mapa do Guardião</h2><p class="lead">Seu mapa é único. Você pode consultá-lo e baixar o PDF sempre que quiser.</p><div class="wz-list">${W.maps.map(m => `<button type="button" data-map="${m.id}">Mapa de ${fdate(m.created_at)}<small>${esc(m.guardiao || '')} · ${esc(m.potencial || '')}</small></button>`).join('')}</div></div></div>`; return;
  }
  if (s === 'loading') { R.innerHTML = '<div class="wz"><div class="wz-load"><span class="gt-dot"></span><p class="wz-msg">Abrindo…</p></div></div>'; return; }
  if (s === 'sincronizar') {
    const total=Object.keys(Entrada.respostasMarcadas(D.ans,GT_Q.length)).length;
    const complete=total>=8 && String(D.name||'').trim().length>=2 &&
      /^\d{4}-\d{2}-\d{2}$/.test(D.birth||'') &&
      String(D.goal||'').trim().length>=5;
    R.innerHTML=`<div class="wz"><div class="wz-card"><span class="eyebrow">Suporte do Mapa do Guardião</span><h2>Recuperar meu questionário</h2><p class="lead">Você já fez a leitura. Esta tela envia somente os dados do questionário que estiverem salvos <b>neste navegador</b> para o suporte finalizar o PDF, sem refazer a interpretação e sem outra compra.</p><p class="wz-msg">Respostas encontradas: <b>${total}</b> · Conta: ${esc(W.user?.email||'')}</p><p class="wz-err" role="alert">${esc(W.err||'')}</p><p class="wz-msg" role="status">${esc(W.msg||'')}</p>${complete?'<button id="wzSyncNow" type="button">Enviar respostas ao suporte</button>':'<p class="wz-err">Não encontrei um questionário completo neste navegador. Abra este link no mesmo celular e navegador em que respondeu originalmente. Se não aparecer, procure o suporte.</p>'}<p class="gt-note">Os dados são enviados somente à sua conta no Campo Guardião. Não envie senha ou dados bancários.</p><div class="wz-nav"><button class="ghost" id="wzSyncBack" type="button">Voltar ao Mapa do Guardião</button></div></div></div>`;
    return;
  }
  if(s==='preparar'){
    R.innerHTML=`<div class="wz"><div class="wz-card"><span class="eyebrow">Antes da sua leitura</span><h2>Cinco minutos antes da leitura</h2><p>Encontre uma posição confortável. Ouça no seu ritmo. Você pode manter os olhos abertos, pausar ou interromper a prática.</p><audio id="wzMeditation" controls preload="metadata" aria-label="Meditação de preparação de cinco minutos" src="/audio/preparacao-5min.mp3?v=20261102-enviada-estereo"></audio><p id="wzAudioStatus" role="status"></p><a class="wz-link" href="/meditacao" target="_blank" rel="noopener">Abrir o áudio em outra aba</a><p class="wz-msg" id="wzLive" role="status" aria-live="polite">${W.mapReady?'Seu mapa está pronto. Abra quando quiser.':esc(W.live||'Montando seu mapa…')}</p><button id="wzOpenReading" type="button"${W.mapReady?'':' disabled'}>${W.mapReady?'Abrir meu mapa':'Preparando a leitura…'}</button><p class="wz-hint">Você também pode abrir o mapa sem ouvir agora e voltar à meditação depois.</p></div></div>`;
    $('wzMeditation').addEventListener('error',()=>{const st=$('wzAudioStatus');if(st)st.textContent='O áudio não carregou. Tente novamente ou abra a meditação em outra aba.';});return;
  }
  if (s === 'gerando') {
    R.innerHTML = `<div class="wz"><div class="wz-card wz-load"><span class="gt-dot"></span><h2>Montando o seu mapa</h2><p class="wz-msg" id="wzLive" role="status" aria-live="polite">${esc(W.live || 'Lendo as suas respostas…')}</p><p class="wz-msg">Isso pode levar alguns minutos. Mantenha esta página aberta.</p></div></div>`; return;
  }
  if (s === 'erro') { R.innerHTML = `<div class="wz"><div class="wz-card"><h2>Não deu certo desta vez</h2><p class="wz-err" role="alert">${esc(W.err)}</p>${W.msg ? '<p class="wz-msg" role="status">'+esc(W.msg)+'</p>' : ''}<div class="wz-nav"><button class="ghost" id="wzToObj" type="button">Voltar</button><button id="wzRetry" type="button">Tentar de novo</button></div><button class="wz-link" id="wzSendHistory" type="button">Enviar meus dados ao suporte</button><p class="gt-note">Se a leitura já foi gerada, o suporte poderá recuperá-la sem cobrar outra compra. Não envie senha ou dados bancários.</p></div></div>`; return; }
  if (s === 'result') {
    const p = db.people.find(x => x.id === D.pid && x.gt && x.gt.res); if (!p) { W.screen = 'welcome'; return wz(); }
    if(p.gt.res.versao_consulta===2)window.GuardiaoConsultaView.render({...p,guardiao:GT_G[p.gt.S.rg[0]][0],potencial:GT_P[p.gt.S.rp[0]][0]});else gtResult(p);
    if(p.gt.res.versao_consulta!==2&&W.sourceMap?.user_id===W.user?.id){
      root().insertAdjacentHTML('afterbegin',`<section class="wz-card" style="max-width:860px;margin:18px auto"><span class="eyebrow">Sua leitura está no formato anterior</span><h2>Atualizar para o mapa de 20 páginas</h2><p>Responda às cinco perguntas sobre sua questão atual. Vamos aproveitar seus dados de nascimento e as respostas do teste para gerar as 12 áreas e sua tabela de consulta.</p><p>Sua leitura anterior fica preservada. Esta atualização não exige outra compra.</p><button id="wzUpgrade" type="button">${D.upgradeMapId===W.activeMapId?'Continuar atualização':'Atualizar meu mapa · 20 páginas'}</button></section>`);
    }

    const extra = W.viewing ? '' : `<div class="btns" style="margin-top:12px"><button class="ghost" id="wzMine" type="button">Meus mapas</button></div>`;
    root().insertAdjacentHTML('beforeend', extra);
    if ($('gtRedo')) $('gtRedo').remove();
    // Duas saídas distintas: leitura completa imprimível e resumo fotográfico.
    if ($('gtPdf')) {
      $('gtPdf').id = 'wzPdf29';
      $('wzPdf29').textContent = p.gt.res.versao_consulta===2?'Baixar meu mapa · 20 páginas':'Baixar PDF anterior · 14 a 18 páginas';
      if(p.gt.res.versao_consulta!==2){
      const full = document.createElement('button');
      full.type='button';full.id='wzPrintFull';full.className='ghost';
      full.textContent='Guardar esta página · PDF / Imprimir';
      $('wzPdf29').parentNode.insertBefore(full,$('wzPdf29'));
      }
      const note=document.createElement('span');
      note.id='gtPrintSt';note.className='note';
      note.textContent=p.gt.res.versao_consulta===2?'O mapa está salvo na sua conta. Você pode consultar e baixar quando precisar.':'Os dois formatos usam a leitura já salva e não consomem novos créditos do Claude.';
      $('wzPdf29').parentNode.appendChild(note);
    }
    return;
  }
  // etapas
  const st = D.step;
  if(st.startsWith('ctx_')){
    const field=Entrada.campos.find(c=>'ctx_'+c.key===st);
    if(!field){D.step=newFirstStep();return wz();}
    const value=intake()[field.key];
    R.innerHTML=`<div class="wz">${dotsHtml(st)}<div class="wz-card"><span class="eyebrow">Sua questão atual</span><h2>${esc(field.titulo)}</h2><p class="wz-hint">${esc(field.ajuda)}</p><label>Sua resposta<textarea aria-label="${esc(field.titulo)}" id="wzContext"${W.upgradeFrozen?' readonly':''} data-field="${field.key}" maxlength="${field.max}" rows="5" placeholder="${esc(field.exemplo)}">${esc(value)}</textarea></label><span class="wz-field-count">Até ${field.max} caracteres. Escreva do seu jeito.</span><p class="wz-err" role="alert">${esc(W.err)}</p><div class="wz-nav"><button class="ghost" id="wzPrev" type="button">Voltar</button><button id="wzNext" type="button">Próximo</button></div></div></div>`;return;
  }
  if (st === 'dados1') {
    R.innerHTML = `<div class="wz">${dotsHtml(st)}<div class="wz-card"><h2>Vamos começar</h2>${W.resetNotice?'<p class="wz-msg" role="status">'+esc(W.resetNotice)+'</p>':''}<label>Seu nome completo<input id="wzName" maxlength="120" autocomplete="name" value="${esc(D.name)}"></label><label>Data de nascimento<input id="wzBirth" type="date" value="${esc(D.birth)}"></label><p class="wz-err" role="alert">${esc(W.err)}</p><div class="wz-nav"><button id="wzNext" type="button">Próximo</button></div></div></div>`; return;
  }
  if (st === 'dados2') {
    R.innerHTML = `<div class="wz">${dotsHtml(st)}<div class="wz-card"><h2>Onde e a que horas você nasceu?</h2><label>Hora de nascimento (se souber)<input id="wzTime" type="time" value="${esc(D.time)}"></label><p class="wz-hint">Sem a hora, a leitura usa casas solares e posições aproximadas. O Ascendente fica de fora.</p>
      ${D.manual ? `<div class="row2"><label>Latitude<input id="wzLat" inputmode="decimal" value="${esc(D.lat)}" placeholder="-21.17"></label><label>Longitude<input id="wzLon" inputmode="decimal" value="${esc(D.lon)}" placeholder="-47.81"></label></div><label>Fuso em relação a Greenwich<input id="wzTz" inputmode="decimal" value="${esc(D.tz)}" placeholder="-3"></label><button class="wz-link" id="wzList" type="button">Voltar para a lista de cidades</button>`
      : `<label>Estado<select id="wzUf"><option value="">Escolha o estado</option>${UFS.map(u => `<option${u === D.uf ? ' selected' : ''}>${u}</option>`).join('')}</select></label><label>Cidade<input id="wzCity" autocomplete="off" placeholder="Digite o nome da cidade" value="${esc(D.city)}"></label><ul class="wz-res" id="wzRes" hidden></ul><button class="wz-link" id="wzManual" type="button">Minha cidade não está na lista (ou nasci fora do Brasil)</button>`}
      <label class="check"><input id="wzDst" type="checkbox"${D.dst ? ' checked' : ''}> Nasci em época de horário de verão</label>
      <p class="wz-err" role="alert">${esc(W.err)}</p><div class="wz-nav"><button class="ghost" id="wzPrev" type="button">Voltar</button><button id="wzNext" type="button">Próximo</button></div></div></div>`; return;
  }
  if(st==='teste'){
    R.innerHTML=`<div class="wz">${dotsHtml(st)}<div class="wz-card"><span class="eyebrow">Além da sua questão</span><h2>Dez perguntas para completar a leitura</h2><p class="lead">Seu relato mostra a situação de agora. Estas perguntas acrescentam referências sobre como você reage, seus recursos e o seu jeito de aprender e atuar.</p><ul class="wz-test-topics"><li>Reações e escolhas que se repetem.</li><li>Recursos que você reconhece em si.</li><li>Como você aprende e prefere trabalhar.</li></ul><p class="wz-hint">Não há resposta certa. Escolha o que mais se aproxima de você. A pergunta sobre a infância pode ser pulada.</p><button id="wzQuizStart" type="button">Responder às 10 perguntas</button><button id="wzPrev" class="ghost" type="button">Voltar</button></div></div>`;return;
  }
  if(st.startsWith('apoio_')){
    const c=Contexto.campos.find(x=>'apoio_'+x.key===st),selected=Contexto.respostas(D.contextosComplementares)[c.key];
    R.innerHTML=`<div class="wz">${dotsHtml(st)}<div class="wz-card"><span class="eyebrow">Seu momento atual · ${Contexto.campos.indexOf(c)+1} de 3</span><h2>${esc(c.titulo)}</h2><p class="wz-hint">${esc(c.ajuda)}</p><div class="wz-opts">${c.opcoes.map((o,i)=>`<button class="wz-opt" type="button" data-apoio="${c.key}" data-escolha="${i}" aria-pressed="${selected===o}">${esc(o)}</button>`).join('')}</div><div class="wz-nav"><button id="wzPrev" class="ghost" type="button">Voltar</button><button id="wzNext" type="button"${selected?'':' disabled'}>Próximo</button></div></div></div>`;return;
  }
  const qm = /^q(\d+)$/.exec(st);
  if (qm) {
    const i = +qm[1], q = GT_Q[i];
    R.innerHTML = `<div class="wz">${dotsHtml(st)}<div class="wz-card"><span class="eyebrow">10 perguntas fixas · ${i + 1} de ${GT_Q.length}</span><p class="wz-question-topic">${esc(Contexto.tema(i))}</p><p class="wz-q">${esc(q[0])}</p>${q[1] ? `<p class="wz-hint">${esc(q[1])}</p>` : ''}<div class="wz-opts">${q[2].map((o, j) => `<button type="button" class="wz-opt" data-opt="${j}" aria-pressed="${D.ans[i] === j}">${esc(o[0])}</button>`).join('')}</div><div class="wz-nav"><button class="ghost" id="wzPrev" type="button">Voltar</button><button id="wzNext" type="button"${D.ans[i] === undefined ? ' disabled' : ''}>Próximo</button></div></div></div>`; return;
  }
  if (st === 'obj') {
    R.innerHTML = `<div class="wz">${dotsHtml(st)}<div class="wz-card"><h2>Confira sua questão antes de gerar</h2><p class="wz-input-summary">${Object.keys(Entrada.respostasMarcadas(D.ans,GT_Q.length)).length} de 10 perguntas fixas respondidas${D.contextoVersion===1?' · '+Object.keys(Contexto.contexto(D.contextosComplementares)).length+' de 3 respostas sobre o momento atual':''}</p><details class="wz-review"><summary>Conferir minhas respostas do teste</summary><ol>${GT_Q.map((q,i)=>`<li><b>${esc(q[0])}</b><span>${esc(q[2][D.ans[i]]?.[0]||'Não respondida nesta leitura.')}</span></li>`).join('')}</ol></details>${W.upgradeFrozen?'<p class="wz-msg">Suas respostas já estão salvas. Vamos retomar a atualização com elas e aproveitar as etapas concluídas.</p>':''}<label>Esta é a questão que vai orientar a leitura. Ajuste se precisar.<textarea id="wzGoal"${W.upgradeFrozen?' readonly':''} rows="4" maxlength="350" placeholder="Ex.: Quero cobrar o que meu trabalho vale, sem culpa.">${esc(D.goal)}</textarea></label>
      <label class="check" style="align-items:flex-start"><input id="wzAceite" type="checkbox"${D.aceite ? ' checked' : ''} style="margin-top:3px"> <span>Concordo em enviar as minhas respostas para gerar o mapa e que o terapeuta responsável tenha acesso a elas.</span></label>
      <details><summary class="wz-link">Como usamos os seus dados</summary><p class="wz-msg">Os dados informados (nome, nascimento, respostas do teste, situação relatada e objetivo) são usados apenas para gerar o seu mapa e ficam guardados para você consultar e para o acompanhamento com o terapeuta. O texto é gerado por inteligência artificial. Você pode pedir a exclusão dos seus dados a qualquer momento pelo contato do terapeuta.</p></details>
      <p class="wz-err" role="alert">${esc(W.err)}</p><div class="wz-nav"><button class="ghost" id="wzPrev" type="button">Voltar</button><button id="wzGo" type="button">Gerar o meu mapa</button></div></div></div>`;
  }
}
const go = st => { D.step = st; W.err = ''; gtSave(); wz(); window.scrollTo(0, 0); };
const stepNext = () => go(STEPS[Math.min(STEPS.length - 1, STEPS.indexOf(D.step) + 1)]);
const stepPrev = () => { const i = STEPS.indexOf(D.step); if (i <= 0) { W.screen = W.maps.length ? 'lista' : 'welcome'; W.err = ''; wz(); } else go(STEPS[i - 1]); };

function msgAuth(e) {
  const t = (e && e.message || '').toLowerCase();
  if (t.includes('invalid login')) return 'E-mail ou senha incorretos.';
  if (t.includes('already registered')) return 'Este e-mail já tem conta. Use "Já tenho conta".';
  if (t.includes('email not confirmed')) return 'Confirme o e-mail pelo link que enviamos e tente de novo.';
  if (t.includes('password')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (t.includes('rate') || t.includes('seconds')) return 'Muitas tentativas. Aguarde um instante e tente de novo.';
  return 'Não foi possível concluir. Confira os dados e tente de novo.';
}
async function liberarAcesso() {
  if (isAdmin()) return true;
  const { data, error } = await sb.rpc('tem_acesso_guardiao');
  if (error) { W.err = 'Não foi possível verificar o pagamento. Tente novamente em alguns instantes.'; W.screen = 'aguardando'; wz(); return false; }
  if (data !== true) { W.err = ''; W.screen = 'aguardando'; wz(); return false; }
  return true;
}
// A leitura pode ser reiniciada pelo administrador sem excluir a conta da cliente.
// Ao entrar, a pessoa recebe a revisão do servidor e limpa cópias locais antigas.
async function aplicarReinicioAdministrativo(){
  if(!sb || !W.user)return;
  const {data,error}=await sb.rpc('guardiao_consultar_reinicio');
  if(error)throw new Error('Não consegui conferir o estado do seu mapa. Atualize a página e tente novamente.');
  const revisao=Number(data||0);
  if(!Number.isSafeInteger(revisao)||revisao<0)
    throw new Error('Estado de reinício inválido; entre novamente.');
  const antiga=(db.gtResetUser===W.user.id)?Number(db.gtResetRevision||0):0;
  if(revisao>antiga){
    // Retira também o mapa e as respostas antigas do armazenamento neste navegador.
    db.people=db.people.filter(x=>!x.gt);
    db.cur=null;
    W.viewing=null;W.activeMapId=null;W.assinaturaGeracao=null;W.partesGeradas=null;
    resetDraft(false);
    W.resetNotice='Seu cadastro de leitura foi reiniciado pelo suporte. Você pode responder novamente usando esta mesma conta, sem pagar outra vez enquanto seu acesso estiver ativo.';
  }
  db.gtResetUser=W.user.id;
  db.gtResetRevision=revisao;
  save();
}
async function afterLogin() {
  syncLocal();
  try{
    await aplicarReinicioAdministrativo();
    W.resetError=false;
  }catch(err){
    W.err=String(err?.message||'Não consegui verificar o reinício da leitura.');
    W.msg='Nenhuma resposta foi alterada. Tente novamente.';
    W.resetError=true;
    W.screen='erro';return wz();
  }
  await loadMaps();
  if (new URLSearchParams(location.search).get('ver')) return;
  if (new URLSearchParams(location.search).get('sincronizar')==='1') {
    if(W.maps.length)return openMap(W.maps[0].id,false);
    if(!(await liberarAcesso()))return;
    W.screen='sincronizar';W.err='';W.msg='';return wz();
  }
  if (W.maps.length) return openMap(W.maps[0].id, false);
  if (!(await liberarAcesso())) return;
  W.screen = 'step'; D.step = D.step || newFirstStep(); wz();
}
async function doAuth() {
  const email = ($('wzEmail').value || '').trim(), m = W.mode; W.email = email; W.err = ''; W.msg = '';
  if (!/^\S+@\S+\.\S+$/.test(email)) { W.err = 'Digite um e-mail válido.'; return wz(); }
  const pass = $('wzPass') ? $('wzPass').value : '';
  if (m !== 'forgot' && pass.length < 6) { W.err = 'A senha precisa ter pelo menos 6 caracteres.'; return wz(); }
  W.busy = true; $('wzAuth').disabled = true;
  try {
    if (m === 'forgot') { const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: AUTH_REDIRECT_URL }); if (error) throw error; W.msg = 'Pronto! Se o e-mail existir, o link chegou na sua caixa de entrada.'; }
    else if (m === 'signup') {
      const { data, error } = await sb.auth.signUp({ email, password: pass, options: { emailRedirectTo: AUTH_REDIRECT_URL } }); if (error) throw error;
      if (data.session) { W.user = data.session.user; W.busy = false; return afterLogin(); }
      W.screen = 'confirma';
    } else {
      const { data, error } = await sb.auth.signInWithPassword({ email, password: pass }); if (error) throw error;
      W.user = data.user; W.busy = false; return afterLogin();
    }
  } catch (e) { W.err = msgAuth(e); }
  W.busy = false; wz();
}

/* ---- geração ---- */
function wzTeste(p, S) {
  const g1 = GT_G[S.rg[0]], po1 = GT_P[S.rp[0]];
  const g2 = S.rg[1] && Number(S.g[S.rg[1]]) > 0 ? GT_G[S.rg[1]] : null;
  const po2 = S.rp[1] && Number(S.p[S.rp[1]]) > 0 ? GT_P[S.rp[1]] : null;
  return {
    guardiao_principal: { nome: g1[0], apelido: g1[1], protege: g1[2], frase_interna: g1[3] }, guardiao_secundario: g2 ? { nome: g2[0], apelido: g2[1] } : null,
    ferida_principal: S.rw[0] ? { nome: GT_W[S.rw[0]][0], descricao: GT_W[S.rw[0]][1], jeito_de_se_defender: GT_W[S.rw[0]][2] } : 'a pessoa pulou a pergunta da infância; trate a ferida como hipótese leve e diga que ela pode confirmar ou não',
    ferida_secundaria: S.rw[1] && Number(S.w[S.rw[1]]) > 0 ? GT_W[S.rw[1]][0] : null,
    potencial_principal: { nome: po1[0], significa: po1[1] }, potencial_secundario: po2 ? { nome: po2[0], significa: po2[1] } : null,
    estilo_de_aprender: { principal: GT_L[S.rl[0]][0] + ': ' + GT_L[S.rl[0]][1], secundario: S.rl[1] && Number(S.l[S.rl[1]]) > 0 ? GT_L[S.rl[1]][0] : null },
    fonte_de_renda_preferida: { principal: GT_M[S.rm[0]][0] + ': ' + GT_M[S.rm[0]][1], secundaria: S.rm[1] && Number(S.m[S.rm[1]]) > 0 ? GT_M[S.rm[1]][0] : null },
    respostas: GT_Q.map((q, i) => ({ pergunta: q[0], resposta: q[2][D.ans[i]] ? q[2][D.ans[i]][0] : 'não respondeu' })),
    ...(D.flowVersion===2?{versao_consulta:2,contexto_atual:intake(),...(D.contextoVersion===1?{contextos_complementares:Contexto.contexto(D.contextosComplementares)}:{})}:{}),
    objetivo_da_pessoa: p.goal
  };
}

/* O questionário é salvo antes da primeira chamada ao Claude.
   Isso permite recuperação administrativa fiel em caso de erro após a interpretação.
   Não envia o conteúdo para terceiros: o RPC escreve em tabela privada, ligada à conta. */
async function guardarHistoricoGuardiao(options={}) {
  if(!sb||!W.user)throw new Error('Entre na sua conta para enviar os dados ao suporte.');
  if(!D.ans||Object.keys(Entrada.respostasMarcadas(D.ans,GT_Q.length)).length<8)
    throw new Error('O questionário não está completo neste navegador. Consulte o suporte para recuperar as respostas.');
  if(D.upgradeMapId)return true; // The server stores this upgrade before its first AI call.
  const S=options.S||gtScore(D.ans);
  const p={name:String(D.name||'').trim(),goal:String(D.goal||'').trim()};
  const g=GT_G[S.rg?.[0]],pot=GT_P[S.rp?.[0]],fer=S.rw?.[0]?GT_W[S.rw[0]]:null;
  if(!g||!pot)throw new Error('Pontuações principais não disponíveis.');
  const perfil={
    nome:p.name,nascimento:D.birth,hora:D.time||null,uf:D.uf||null,
    cidade:D.city||null,lat:D.lat===''?null:D.lat,
    lon:D.lon===''?null:D.lon,tz:D.tz===''?null:D.tz,
    dst:!!D.dst,objetivo:p.goal,
    guardiao:g[0],ferida:fer?.[0]||null,potencial:pot[0]
  };
  const teste=options.teste||wzTeste(p,S);
  const {error}=await sb.rpc('guardiao_salvar_questionario',{
    p_respostas:Entrada.respostasMarcadas(D.ans,GT_Q.length),p_scores:S,p_perfil:perfil,
    p_teste:teste,
    p_dossier:options.dossier||{},
    p_dados_ciclos:{nascimento:D.birth,referencia:options.referencia||iso(todayObj)}
  });
  if(error)throw new Error('Não foi possível salvar o questionário no suporte: '+error.message);
  return true;
}

async function gerar() {
  if (W.busy) return;
  W.busy = true;
  try { await loadMaps(); } catch (e) {}
  const upgrading=!!D.upgradeMapId;
  if (W.maps.length&&!upgrading) { W.busy = false; return openMap(W.maps[0].id, false); }
  const sess = (await sb.auth.getSession()).data.session;
  if (!sess) { W.busy = false; W.screen = 'auth'; W.mode = 'login'; W.err = 'Entre de novo para continuar.'; return wz(); }
  // O questionário é único: se uma geração foi iniciada anteriormente,
  // preservamos a mesma data de referência para recuperar a assinatura original.
  // Sem isso, os cálculos do dia seguinte geram outro hash e bloqueiam partes já pagas.
  let andamentoAnterior=null;
  try {
    const checkpoint=upgrading?await sb.rpc('guardiao_atualizar_consulta',{p_acao:'referencia',p_mapa_id:D.upgradeMapId}):await sb.rpc('referencia_geracao_guardiao');
    if(checkpoint.error)throw checkpoint.error;
    if(upgrading&&checkpoint.data?.estado==='concluido'){W.busy=false;const id=D.upgradeMapId;D.upgradeMapId=null;gtSave();return openMap(id,false);}
    if(upgrading&&!['disponivel'].includes(checkpoint.data?.estado))throw new Error('Não consegui abrir a atualização desta leitura.');
    andamentoAnterior=checkpoint.data;
    if(andamentoAnterior?.referencia && !/^\d{4}-\d{2}-\d{2}$/.test(andamentoAnterior.referencia))
      throw new Error('Data de recuperação inválida.');
  }catch(e){
    W.busy=false;
    W.err='Não consegui recuperar a leitura já iniciada. Nenhuma resposta foi apagada. Atualize a página e tente novamente.';
    W.screen='erro';return wz();
  }
  const dataFixa=andamentoAnterior?.referencia || iso(todayObj);
  // A retry on another day or browser uses the first submitted questionnaire.
  const frozen=upgrading?andamentoAnterior?.contexto:null;
  if(frozen?.teste?.contexto_atual){
    D.ans._consulta={versao:2,...Entrada.contexto(frozen.teste.contexto_atual)};
    D.goal=intake().questao;W.assinaturaAtualizacao=andamentoAnterior.assinatura;gtSave();
  }
  // Leituras que já tinham cinco fases concluídas ANTES da publicação do
  // calendário mensal devem poder ser finalizadas sem consumir créditos novos.
  const recuperacaoLegada=!!(andamentoAnterior?.etapas_prontas===5 &&
    andamentoAnterior?.etapas_registradas===5 &&
    andamentoAnterior.referencia<='2026-10-14');
  // Uma leitura antiga já paga e concluída NÃO deve chamar Claude de novo.
  // O PostgreSQL reúne as cinco partes originais e grava perfil/mapa numa
  // transação indivisível, verificando usuário, pagamento e integridade.
  if (recuperacaoLegada) {
    W.screen='gerando';
    W.live='Recuperando as cinco partes já concluídas do seu mapa…';
    wz();
    try {
      const S=gtScore(D.ans);
      await guardarHistoricoGuardiao({S,referencia:dataFixa});
      const perfil={
        nome:String(D.name||'').trim(),
        nascimento:String(D.birth||''),
        hora:D.time||null,
        uf:D.uf||null,
        cidade:D.city||null,
        lat:D.lat===''?null:D.lat,
        lon:D.lon===''?null:D.lon,
        tz:D.tz===''?null:D.tz,
        dst:!!D.dst,
        objetivo:String(D.goal||'').trim()
      };
      const {data:mapId,error:recoverError}=await sb.rpc(
        'finalizar_mapa_guardiao_recuperado',
        {p_respostas:Entrada.respostasMarcadas(D.ans,GT_Q.length),p_scores:S,p_perfil:perfil}
      );
      if (recoverError)throw recoverError;
      if (!mapId)throw new Error('O servidor não retornou a identificação do mapa recuperado.');
      await loadMaps();
      W.busy=false;
      return await openMap(mapId,false);
    }catch(e){
      console.error('Falha ao finalizar mapa recuperado:',e?.code||'indefinido',e?.message||'sem detalhe');
      W.busy=false;
      const detail=String(e?.message||'').slice(0,180);
      W.err='As cinco leituras estão salvas, mas não foi possível concluir o cadastro do mapa.'
        +(detail?' Detalhe: '+detail:'')
        +' Você não precisa comprar novamente nem gerar as leituras de novo.';
      W.screen='erro';
      return wz();
    }
  }
  const c = { uf: D.uf, nome: D.city };
  let p = db.people.find(x => x.id === D.pid && x.gt); if (!p) { p = { id: 'gt' + Date.now(), events: [], elem: {} }; db.people.push(p); }
  Object.assign(p, { name: D.name.trim(), birth: D.birth, goal: D.goal.trim(), time: D.time || '', dst: !!D.dst, city: D.city ? `${D.city}, ${D.uf}` : '', lat: parseFloat(D.lat), lon: parseFloat(D.lon), tz: parseFloat(D.tz) });
  p.gt = { ans: Object.assign({}, D.ans) }; D.pid = p.id; db.cur = p.id; refStr = dataFixa; gtSave();
  fillForm(); render();
  const S = gtScore(D.ans);let dossier = frozen?.dossier || buildDossier('atual');
  if (!dossier) { W.busy = false; W.err = 'Não consegui calcular os ciclos. Confira a data de nascimento.'; W.screen = 'erro'; return wz(); }
  if(D.flowVersion!==2)delete dossier.areas;
  else if(!frozen) {dossier.pessoa.nome=p.name;dossier.pessoa.cidade=p.city;dossier.pessoa.nascimento_iso=D.birth;dossier.pessoa.hora_informada=!!D.time;dossier.arcano_pessoal=Entrada.arcanoPessoal(D.birth);}
  delete dossier.modo; delete dossier.elementos_autoavaliacao;
  const teste = frozen?.teste || wzTeste(p, S);
  try { await guardarHistoricoGuardiao({S,teste,dossier,referencia:dataFixa}); }
  catch(err){
    W.busy=false;
    W.err='Não consegui salvar a cópia de segurança do questionário antes de gerar a leitura. '+String(err?.message||'').slice(0,220);
    W.msg='Nenhuma nova leitura foi solicitada ao Claude. Tente novamente.';
    W.screen='erro';return wz();
  }
  W.mapReady=false;W.screen='preparar'; W.live = 'Lendo as suas respostas…'; wz();
  const frases = ['Calculando os seus ciclos…', 'Cruzando o seu Guardião com o seu momento de vida…', 'Escrevendo o seu mapa…', 'Montando o plano de ação…', 'Revisando os últimos detalhes…'];
  let k = 0; const tm = setInterval(() => { W.live = frases[Math.min(k++, frases.length - 1)]; const l = $('wzLive'); if (l) l.textContent = W.live; }, 9000);
  const call = fase => fetch('/api/gerar', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sess.access_token }, body: JSON.stringify({ fase, teste, dossier, dadosCiclos: { nascimento: D.birth, referencia: dataFixa },...(upgrading?{atualizarMapaId:D.upgradeMapId}:{}) }) })
    .then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.erro || 'erro'), { status: r.status, j }); if(j.assinatura_atualizacao)W.assinaturaAtualizacao=j.assinatura_atualizacao;return j.parte; });
  try {
    // Reuse completed stages after an error. Limit concurrency to two API calls.
    const assinatura = JSON.stringify({ teste, dossier });
    if (W.assinaturaGeracao !== assinatura) {
      W.assinaturaGeracao = assinatura;
      W.partesGeradas = {};
    }
    const fases = recuperacaoLegada ? ['a', 'b', 'c', 'd', 'e'] : ['a', 'b', 'c', 'd', 'e', 'f'];
    const partes = new Array(fases.length);
    for (let i = 0; i < fases.length; i += 2) {
      const lote = fases.slice(i, i + 2);
      const estados = await Promise.allSettled(lote.map(async fase => {
        if (W.partesGeradas[fase]) return W.partesGeradas[fase];
        const parte = await call(fase);
        W.partesGeradas[fase] = parte;
        return parte;
      }));
      estados.forEach((estado, j) => {
        if (estado.status === 'fulfilled') partes[i + j] = estado.value;
      });
      const falha = estados.find(estado => estado.status === 'rejected');
      if (falha) throw falha.reason;
    }
    const res = Object.assign({}, ...partes);
    res.trabalhar = (res.trabalhar || []).slice(0, 4); if (res.plano && res.plano.dias) res.plano.dias = res.plano.dias.slice(0, 7);
    if (!gtOk(res)) throw Object.assign(new Error('incompleto'), { status: 0 });
    if(teste.versao_consulta===2&&res.areas_vida&&res.tabela_consulta?.length===6){
      res.versao_consulta=2;res.entrada_consulta=intake();res.contextos_complementares=teste.contextos_complementares||{};
      res.dados_pessoa={nome:p.name,nascimento:D.birth,hora:D.time||'',cidade:p.city,lat:p.lat,lon:p.lon,tz:p.tz,dst:p.dst,data_referencia:dataFixa};
    }
    p.gt.S = S; p.gt.res = res; p.gt.when = dataFixa; save();
    // Publish an upgrade atomically from server-saved phases; keep the old map until success.
    const upgradedId=upgrading?D.upgradeMapId:null;
    if(upgrading){
      if(!W.assinaturaAtualizacao)throw new Error('Não consegui identificar as etapas da atualização. Tente novamente.');
      const {data:finished,error}=await sb.rpc('guardiao_atualizar_consulta',{p_acao:'finalizar',p_mapa_id:upgradedId,p_assinatura:W.assinaturaAtualizacao});
      if(error||finished?.estado!=='concluido'||finished?.mapa_id!==upgradedId)throw new Error('A atualização ainda não foi concluída. Sua leitura anterior está preservada; tente novamente.');
      res.atualizacao_consulta={versao_anterior_preservada:true};
    }else{
    // Only show a completed map after the database confirms it was saved.
    const { error: profileError } = await sb.from('perfis').upsert({ id: W.user.id, email: W.user.email, nome: p.name, nascimento: D.birth, hora: D.time || null, uf: D.uf || null, cidade: D.city || null, lat: p.lat, lon: p.lon, tz: p.tz, dst: !!D.dst, objetivo: p.goal, aceite_lgpd_em: new Date().toISOString() });
    if (profileError) console.warn('Perfil não atualizado; mapa continua salvo se inserção funcionar.');
    const { error: saveError } = await sb.from('mapas').insert({ user_id: W.user.id, respostas: Entrada.respostasMarcadas(D.ans,GT_Q.length), scores: S, resultado: res, guardiao: GT_G[S.rg[0]][0], ferida: S.rw[0] ? GT_W[S.rw[0]][0] : null, potencial: GT_P[S.rp[0]][0] });
    if (saveError) {
      if (saveError.code === '23505') {
        await loadMaps();
        if (W.maps.length) { clearInterval(tm); return openMap(W.maps[0].id, false); }
      }
      throw new Error('O mapa foi escrito, mas não pôde ser salvo. Tente novamente: as etapas já concluídas serão reutilizadas.');
    }

    }
    await loadMaps();
    W.activeMapId=upgradedId||W.maps[0]?.id||null;
    if(upgrading){D.upgradeMapId=null;W.sourceMap={...W.sourceMap,resultado:res};gtSave();}
    clearInterval(tm); W.viewing=null;W.mapReady=true;
    if(W.screen==='preparar'&&$('wzOpenReading')){$('wzOpenReading').disabled=false;$('wzOpenReading').textContent='Abrir meu mapa';$('wzLive').textContent='Seu mapa está pronto. Abra quando quiser.';}else prepareReading();
  } catch (e) {
    clearInterval(tm);pauseMeditation();
    const detalhe = (typeof e?.message === 'string' && e.message.length < 300 && !['erro','incompleto'].includes(e.message))
      ? e.message : 'Não foi possível gerar o mapa agora. Suas respostas estão salvas; tente novamente.';
    W.err = e.status === 401 ? 'Sua sessão expirou. Entre de novo.' : detalhe;
    if(e.j?.fase) W.err += ' (Etapa ' + String(e.j.fase).toUpperCase() + ')';
    if (e.message?.includes('questionário em geração') || e.message?.includes('questionário anterior')) {
      W.err = 'Sua leitura anterior está preservada, mas as respostas atuais não correspondem ao questionário original. Não refaça a compra. Procure o suporte para recuperar o questionário correto.';
    }
    W.screen = 'erro'; wz();
  } finally { W.busy = false; }
}
async function openMap(id, asAdmin) {
  W.screen = 'loading'; wz();
  const { data: m } = await sb.from('mapas').select('*').eq('id', id).maybeSingle();
  if (!m) { W.err = 'Mapa não encontrado.'; W.screen = 'erro'; return wz(); }
  const { data: pf } = await sb.from('perfis').select('*').eq('id', m.user_id).maybeSingle(); const f = pf || {};
  W.sourceMap=m;W.sourceProfile=f;
  if(m.resultado?.versao_consulta===2&&D.upgradeMapId===m.id){D.upgradeMapId=null;gtSave();}
  const p = { id: 'gtv' + m.id, events: [], elem: {}, name: f.nome || '', birth: f.nascimento, time: f.hora || '', tz: f.tz ?? -3, dst: !!f.dst, city: f.cidade ? `${f.cidade}, ${f.uf || ''}` : '', lat: f.lat, lon: f.lon, goal: f.objetivo || '', guardiao:m.guardiao,potencial:m.potencial,gt: { ans: m.respostas, S: m.scores, res: m.resultado } };
  db.people = db.people.filter(x => x.id !== p.id); db.people.push(p); db.cur = p.id; D.pid = p.id; refStr = (m.created_at || '').slice(0, 10) || iso(todayObj);
  p.goal=m.resultado?.entrada_consulta?.questao||p.goal;
  fillForm(); render(); W.viewing = asAdmin ? m : null; W.activeMapId = m.id;
  if(!asAdmin&&m.user_id===W.user?.id&&m.resultado?.versao_consulta!==2&&new URLSearchParams(location.search).get('atualizar')==='1')return startUpgrade();
  prepareReading(asAdmin);
}

/* ---- eventos ---- */
document.addEventListener('click', async e => {
  const t = e.target.closest('button,li,a'); if (!t || !$('gt') || $('gt').hidden) return;
  const id = t.id;
  if(id==='wzUpgrade')return startUpgrade();
  if(id==='wzQuizStart')return stepNext();
  if(t.dataset?.apoio){const c=Contexto.campos.find(x=>x.key===t.dataset.apoio),o=c?.opcoes[Number(t.dataset.escolha)];if(o){D.contextosComplementares={...D.contextosComplementares,[c.key]:o};gtSave();return wz();}return;}
  if(id==='wzOpenReading'){if(!W.mapReady)return;pauseMeditation();if(!W.preparedMaps)W.preparedMaps=new Set();W.preparedMaps.add(W.activeMapId);W.screen='result';wz();window.scrollTo(0,0);return;}
  if (id === 'wzStart') { if (!W.user) { W.screen = 'auth'; W.mode = 'signup'; return wz(); } if (W.maps.length) return openMap(W.maps[0].id, false); if (!(await liberarAcesso())) return; W.screen = 'step'; return wz(); }
  if (id === 'wzCheckPayment') { if (!(await liberarAcesso())) return; W.screen = 'step'; D.step = D.step || newFirstStep(); return wz(); }
  if (id === 'wzHave') { W.screen = 'auth'; W.mode = 'login'; W.err = ''; return wz(); }
  if (id === 'wzBackW') { W.screen = 'welcome'; W.err = ''; W.msg = ''; return wz(); }
  if (id === 'wzTabS') { W.mode = 'signup'; W.err = ''; return wz(); }
  if (id === 'wzTabL') { W.mode = 'login'; W.err = ''; return wz(); }
  if (id === 'wzForgot') { W.mode = 'forgot'; W.err = ''; return wz(); }
  if (id === 'wzAuth') return doAuth();
  if (id === 'wzToLogin') { W.screen = 'auth'; W.mode = 'login'; return wz(); }
  if (id === 'wzSetPass') { const v = $('wzPass').value; if (v.length < 6) { W.err = 'A senha precisa ter pelo menos 6 caracteres.'; return wz(); } const { error } = await sb.auth.updateUser({ password: v }); if (error) { W.err = msgAuth(error); return wz(); } history.replaceState(null, '', '/'); const { data } = await sb.auth.getSession(); W.user = data.session ? data.session.user : null; return afterLogin(); }
  if (id === 'wzOut') { if(W.busy)return;pauseMeditation();await sb.auth.signOut(); W.user = null; W.maps = []; W.screen = 'welcome'; return wz(); }
  if (id === 'wzPrintFull') {
    try{
      if(!window.guardiaoImprimirLeitura?.save)
        throw new Error('Recurso de impressão indisponível. Atualize a página.');
      window.guardiaoImprimirLeitura.save();
    }catch(err){
      const note=$('gtPrintSt')||$('gtPdfSt');
      if(note)note.textContent=err?.message||'A impressão não pôde ser aberta.';
    }
    return;
  }
  if (id === 'wzPdf29') {
    if (W.pdfDownloading) return;
    W.pdfDownloading = true;
    const status = $('gtPdfSt');
    const btn = $('wzPdf29');
    if (btn) btn.disabled = true;
    if (status) status.textContent = 'Preparando o PDF da sua leitura…';
    try {
      const mapId = W.activeMapId || W.maps[0]?.id;
      if (!mapId) throw new Error('Aguarde o mapa ser salvo no painel antes de baixar.');
      const { data } = await sb.auth.getSession();
      const session = data?.session;
      if (!session) throw new Error('Entre novamente para baixar seu relatório.');
      const pdf = await fetch('/api/relatorio?id=' + encodeURIComponent(mapId), {
        headers: { Authorization: 'Bearer ' + session.access_token }
      });
      if (!pdf.ok) {
        const err = await pdf.json().catch(() => ({}));
        throw Object.assign(new Error(err.erro || 'Não foi possível preparar o seu PDF.'), { status: pdf.status });
      }
      const blob = await pdf.blob();
      if (blob.type !== 'application/pdf' && blob.size < 1000) throw new Error('O arquivo do relatório veio incompleto.');
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = 'Mapa_do_Guardiao_' + String((db.people.find(x => x.id === D.pid)?.name || 'Meu_Mapa')).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_') + '.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(href), 30000);
      if (status) status.textContent = 'Seu PDF está pronto.';
    } catch (err) {
      // If the server fails, render the same saved edition in the browser.
      // Never bypass a 401/403 payment/session rejection.
      if ((!err?.status || err.status >= 500) && W.activeMapId) {
        if (status) status.textContent = 'O servidor demorou. Montando o PDF no navegador…';
        try { const person=db.people.find(x=>x.id===D.pid);if(person?.gt?.res?.versao_consulta===2)await window.GuardiaoPdfConsulta.download(person,btn,status);else await window.guardiaoPdfEssencial.download(btn || { disabled: false }, status || { textContent: '' }); }
        catch (fallbackErr) { if (status) status.textContent = 'Não foi possível baixar agora. Seu mapa continua salvo.'; }
      } else if (status) {
        status.textContent = err?.message || 'O download falhou. Seu mapa continua salvo.';
      }
    } finally {
      W.pdfDownloading = false;
      if (btn) btn.disabled = false;
    }
    return;
  }
  if (id === 'wzMine') { await loadMaps(); W.screen = 'lista'; return wz(); }
  if (t.dataset && t.dataset.map) return openMap(t.dataset.map, false);
  if (id === 'wzPrev') return stepPrev();
  if (t.dataset && t.dataset.opt !== undefined) { const i = +/^q(\d+)$/.exec(D.step)[1]; D.ans[i] = +t.dataset.opt; gtSave(); return wz(); }
  if (id === 'wzManual') { D.manual = true; gtSave(); return wz(); }
  if (id === 'wzList') { D.manual = false; gtSave(); return wz(); }
  if (id === 'wzRetry') return W.resetError ? afterLogin() : gerar();
  if (id === 'wzSyncBack') {
    history.replaceState(null,'','/');
    W.screen='step';D.step=D.step||newFirstStep();W.err='';W.msg='';return wz();
  }
  if (id === 'wzSyncNow') {
    if(W.busy)return;
    W.busy=true;W.msg='Sincronizando suas respostas com a conta…';W.err='';wz();
    try{
      await guardarHistoricoGuardiao();
      W.msg='Questionário recebido pelo suporte! Suas interpretações já existentes serão aproveitadas. Aguarde o contato para receber o PDF.';
    }catch(e){
      W.err='Falha no envio: '+String(e?.message||e).slice(0,220);
      W.msg='Nenhum mapa foi apagado. Tente novamente ou fale com o suporte.';
    }
    W.busy=false;return wz();
  }
  if (id === 'wzSendHistory') {
    if(W.busy)return;
    W.busy=true;W.msg='Enviando os dados do questionário ao suporte…';wz();
    try{
      await guardarHistoricoGuardiao();
      W.msg='Dados enviados ao suporte com sucesso. A equipe poderá recuperar as interpretações já salvas e finalizar o mapa sem uma nova compra.';
    }catch(err){
      W.msg='Não foi possível enviar o questionário: '+String(err?.message||'').slice(0,190)+'. Não apague as respostas deste navegador.';
    }
    W.busy=false;return wz();
  }
  if (id === 'wzToObj') { W.screen = 'step'; D.step = 'obj'; return wz(); }
  if (t.tagName === 'LI' && t.dataset.c !== undefined) { const L = (W.cities[D.uf] || [])[+t.dataset.c]; if (L) { D.city = L[0]; D.lat = L[1]; D.lon = L[2]; D.tz = L[3]; gtSave(); $('wzCity').value = L[0]; $('wzRes').hidden = true; } return; }
  if (id === 'wzNext') {
    const st = D.step; W.err = '';
    if(st.startsWith('ctx_')){const key=st.slice(4);saveIntake(key,$('wzContext').value.trim());if(intake()[key].length<5)W.err='Conte um pouco mais, com pelo menos cinco caracteres.';}
    else if (st === 'dados1') {
      D.name = $('wzName').value.trim(); D.birth = $('wzBirth').value; const b = E.parse(D.birth);
      if (D.name.length < 3) W.err = 'Digite o seu nome completo.'; else if (!b || b.y < 1900 || E.key(b) > E.key(todayObj)) W.err = 'Confira a data de nascimento.';
    } else if (st === 'dados2') {
      D.time = $('wzTime').value || '';
      if (D.manual) { D.lat = $('wzLat').value.replace(',', '.'); D.lon = $('wzLon').value.replace(',', '.'); D.tz = ($('wzTz').value || '-3').replace(',', '.'); if (!isFinite(parseFloat(D.lat)) || !isFinite(parseFloat(D.lon)) || !isFinite(parseFloat(D.tz))) W.err = 'Preencha latitude, longitude e fuso com números.'; D.uf = ''; D.city = ''; }
      else if (!D.uf || !D.city || !isFinite(parseFloat(D.lat))) W.err = 'Escolha o estado e selecione a sua cidade na lista.';
    }
    if (W.err) { gtSave(); return wz(); }
    return stepNext();
  }
  if (id === 'wzGo') {
    W.err = ''; D.goal = $('wzGoal').value.trim(); D.aceite = $('wzAceite').checked;
    if(D.flowVersion===2){saveIntake('questao',D.goal);const missing=Entrada.validar(intake());if(missing.length){W.err='Responda esta pergunta antes de gerar seu mapa.';D.step='ctx_'+missing[0];gtSave();return wz();}}
    if(D.flowVersion===2&&D.contextoVersion===1&&!W.upgradeFrozen){const missing=Contexto.validar(D.contextosComplementares);if(missing.length){W.err='Escolha a resposta que mais se aproxima do seu momento.';D.step='apoio_'+missing[0];gtSave();return wz();}}
    if (D.goal.length < 5) W.err = 'Conte o seu objetivo em poucas palavras.'; else if (!D.aceite) W.err = 'Para gerar o mapa, marque a concordância acima.';
    if (W.err) { gtSave(); return wz(); }
    gtSave(); return gerar();
  }
});
document.addEventListener('input', async e => {
  const t = e.target; if (!$('gt') || $('gt').hidden) return;
  if(t.id==='wzContext'){saveIntake(t.dataset.field,t.value);return;}
  if (t.id === 'wzCity') {
    D.city = ''; D.lat = ''; D.lon = '';
    const q = norm(t.value), res = $('wzRes'); if (!D.uf) { res.hidden = false; res.innerHTML = '<li>Escolha o estado primeiro</li>'; return; }
    const all = await cities(); const L = (all[D.uf] || []);
    const hits = []; L.forEach((c, i) => { if (q && norm(c[0]).includes(q) && hits.length < 8) hits.push(i); });
    res.hidden = !q; res.innerHTML = hits.length ? hits.map(i => `<li tabindex="0" data-c="${i}">${esc(L[i][0])}</li>`).join('') : '<li>Nenhuma cidade encontrada</li>';
  } else if (t.id === 'wzTime') { D.time = t.value; gtSave(); }
  else if (t.id === 'wzGoal') { D.goal = t.value;if(D.flowVersion===2)saveIntake('questao',t.value);gtSave(); }
});
document.addEventListener('change', e => {
  const t = e.target; if (!$('gt') || $('gt').hidden) return;
  if (t.id === 'wzUf') { D.uf = t.value; D.city = ''; D.lat = ''; D.lon = ''; gtSave(); $('wzCity').value = ''; $('wzRes').hidden = true; cities(); }
  else if (t.id === 'wzDst') { D.dst = t.checked; gtSave(); }
  else if (t.id === 'wzAceite') { D.aceite = t.checked; gtSave(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'LI' && e.target.dataset.c !== undefined) e.target.click(); });

/* funções do app original que passam a usar o fluxo em etapas */
window.gtRender = () => wz();
window.gtShow = () => { document.body.classList.add('client'); $('gt').hidden = false; wz(); };
window.wzOpenMap = openMap;

async function boot() {
  document.body.classList.add('client'); $('gt').hidden = false; wz();
  if (!sb) { W.screen = 'config'; return wz(); }
  const ver = new URLSearchParams(location.search).get('ver');
  try { const { data } = await sb.auth.getSession(); W.user = data.session ? data.session.user : null; } catch (e) {}
  sb.auth.onAuthStateChange((ev, sess) => { if (ev === 'PASSWORD_RECOVERY') { W.user = sess ? sess.user : W.user; W.screen = 'novasenha'; W.err = ''; wz(); } });
  if (location.hash.includes('type=recovery')) { W.screen = 'novasenha'; return wz(); }
  if (ver) {
    if (!W.user) { W.screen = 'auth'; W.mode = 'login'; W.msg = 'Entre com a conta de administrador para ver este mapa.'; return wz(); }
    return openMap(ver, true);
  }
  if (W.user) {
    return afterLogin();
  }
  if (new URLSearchParams(location.search).get('compra') === 'aprovada') {
    W.screen = 'auth'; W.mode = 'signup';
    W.msg = 'Crie sua conta com o mesmo e-mail utilizado na compra da Kiwify.';
    return wz();
  }
  W.screen = 'welcome'; wz();
}
// quando o administrador entra pelo link ?ver=
const _afterLogin = afterLogin;
afterLogin = async function () { const ver = new URLSearchParams(location.search).get('ver'); if (ver) { syncLocal(); return openMap(ver, true); } return _afterLogin(); };
boot();
})();

