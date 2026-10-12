/* ===== MAPA DO GUARDIÃO · app em etapas, login (Supabase) e geração (servidor) ===== */
(() => {
const CFG = window.APP_CONFIG || {};
const ADMIN = (CFG.ADMIN_EMAIL || 'contato.energystudio@gmail.com').toLowerCase();
let sb = null;
try { if (CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase) sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY); } catch (e) { sb = null; }
// download direto no navegador (o app original usava o recurso de download do Claude)
window.claude = { use: async n => n === 'downloads' ? { save: async ({ filename, data }) => { const a = document.createElement('a'); a.href = URL.createObjectURL(data); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); } } : null };

const D = gtDraft;
const W = { screen: 'boot', mode: 'signup', msg: '', err: '', user: null, maps: [], cities: null, busy: false, results: [], viewing: null };
const STEPS = ['dados1', 'dados2', ...GT_Q.map((_, i) => 'q' + i), 'obj'];
const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const isAdmin = () => W.user && (W.user.email || '').toLowerCase() === ADMIN;
const root = () => $('gtBody');
let bar = null;

function resetDraft(keepPerson) {
  const keep = keepPerson ? { name: D.name, birth: D.birth, time: D.time, uf: D.uf, city: D.city, lat: D.lat, lon: D.lon, tz: D.tz, dst: D.dst, manual: D.manual } : {};
  Object.keys(D).forEach(k => delete D[k]);
  Object.assign(D, { ans: {}, name: '', birth: '', time: '', uf: '', city: '', lat: '', lon: '', tz: -3, dst: false, goal: '', aceite: false, pid: null, step: 'dados1', manual: false }, keep);
  gtSave();
}
if (!D.step) { D.step = 'dados1'; if (D.city === 'Ribeirão Preto, SP') { D.city = ''; D.lat = ''; D.lon = ''; } D.uf = D.uf || ''; D.tz = D.tz ?? -3; }
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
    R.innerHTML = `<div class="wz"><div class="wz-card" style="padding:28px 20px;gap:18px"><span class="eyebrow">Campo Guardião</span><h1 style="font-size:2.3rem;line-height:1.05">Mapa do Guardião</h1><p class="wz-promise">Descubra o bloqueio emocional por trás do seu comportamento.</p><p class="wz-sub">Em cerca de 10 minutos: o que protege você, o que ficou guardado, um plano de ação e o lugar onde você trabalha melhor.</p><div class="wz-nav"><button id="wzStart" type="button">${W.user ? (W.maps.length ? 'Entrar no meu mapa' : 'Começar') : 'Começar'}</button></div>${W.user ? '' : '<button class="wz-link" id="wzHave" type="button">Já tenho conta</button>'}<p class="gt-note">Este mapa é um convite à reflexão. Não é diagnóstico nem previsão.</p></div></div>`; return;
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
  if (s === 'confirma') { R.innerHTML = `<div class="wz"><div class="wz-card"><h2>Confira o seu e-mail</h2><p class="lead">Enviamos um link para <b>${esc(W.email || '')}</b>. Clique nele para confirmar e depois volte aqui para entrar.</p><div class="wz-nav"><button id="wzToLogin" type="button">Já confirmei, entrar</button></div></div></div>`; return; }
  if (s === 'novasenha') { R.innerHTML = `<div class="wz"><div class="wz-card"><h2>Nova senha</h2><label>Nova senha (mínimo 6 caracteres)<input id="wzPass" type="password" autocomplete="new-password"></label><p class="wz-err" role="alert">${esc(W.err)}</p><div class="wz-nav"><button id="wzSetPass" type="button">Salvar senha</button></div></div></div>`; return; }
  if (s === 'lista') {
    R.innerHTML = `<div class="wz"><div class="wz-card"><h2>Meu Mapa do Guardião</h2><p class="lead">Seu mapa é único. Você pode consultá-lo e baixar o PDF sempre que quiser.</p><div class="wz-list">${W.maps.map(m => `<button type="button" data-map="${m.id}">Mapa de ${fdate(m.created_at)}<small>${esc(m.guardiao || '')} · ${esc(m.potencial || '')}</small></button>`).join('')}</div></div></div>`; return;
  }
  if (s === 'loading') { R.innerHTML = '<div class="wz"><div class="wz-load"><span class="gt-dot"></span><p class="wz-msg">Abrindo…</p></div></div>'; return; }
  if (s === 'gerando') {
    R.innerHTML = `<div class="wz"><div class="wz-card wz-load"><span class="gt-dot"></span><h2>Montando o seu mapa</h2><p class="wz-msg" id="wzLive" role="status" aria-live="polite">${esc(W.live || 'Lendo as suas respostas…')}</p><p class="wz-msg">Isso pode levar alguns minutos. Mantenha esta página aberta.</p></div></div>`; return;
  }
  if (s === 'erro') { R.innerHTML = `<div class="wz"><div class="wz-card"><h2>Não deu certo desta vez</h2><p class="wz-err" role="alert">${esc(W.err)}</p><div class="wz-nav"><button class="ghost" id="wzToObj" type="button">Voltar</button><button id="wzRetry" type="button">Tentar de novo</button></div></div></div>`; return; }
  if (s === 'result') {
    const p = db.people.find(x => x.id === D.pid && x.gt && x.gt.res); if (!p) { W.screen = 'welcome'; return wz(); }
    gtResult(p);
    const extra = W.viewing ? '' : `<div class="btns" style="margin-top:12px"><button class="ghost" id="wzMine" type="button">Meus mapas</button></div>`;
    root().insertAdjacentHTML('beforeend', extra); if ($('gtRedo')) $('gtRedo').remove(); return;
  }
  // etapas
  const st = D.step;
  if (st === 'dados1') {
    R.innerHTML = `<div class="wz">${dotsHtml(st)}<div class="wz-card"><h2>Vamos começar</h2><label>Seu nome completo<input id="wzName" autocomplete="name" value="${esc(D.name)}"></label><label>Data de nascimento<input id="wzBirth" type="date" value="${esc(D.birth)}"></label><p class="wz-err" role="alert">${esc(W.err)}</p><div class="wz-nav"><button id="wzNext" type="button">Próximo</button></div></div></div>`; return;
  }
  if (st === 'dados2') {
    R.innerHTML = `<div class="wz">${dotsHtml(st)}<div class="wz-card"><h2>Onde e a que horas você nasceu?</h2><label>Hora de nascimento (se souber)<input id="wzTime" type="time" value="${esc(D.time)}"></label><p class="wz-hint">Sem a hora o mapa funciona do mesmo jeito, só com menos detalhes.</p>
      ${D.manual ? `<div class="row2"><label>Latitude<input id="wzLat" inputmode="decimal" value="${esc(D.lat)}" placeholder="-21.17"></label><label>Longitude<input id="wzLon" inputmode="decimal" value="${esc(D.lon)}" placeholder="-47.81"></label></div><label>Fuso em relação a Greenwich<input id="wzTz" inputmode="decimal" value="${esc(D.tz)}" placeholder="-3"></label><button class="wz-link" id="wzList" type="button">Voltar para a lista de cidades</button>`
      : `<label>Estado<select id="wzUf"><option value="">Escolha o estado</option>${UFS.map(u => `<option${u === D.uf ? ' selected' : ''}>${u}</option>`).join('')}</select></label><label>Cidade<input id="wzCity" autocomplete="off" placeholder="Digite o nome da cidade" value="${esc(D.city)}"></label><ul class="wz-res" id="wzRes" hidden></ul><button class="wz-link" id="wzManual" type="button">Minha cidade não está na lista (ou nasci fora do Brasil)</button>`}
      <label class="check"><input id="wzDst" type="checkbox"${D.dst ? ' checked' : ''}> Nasci em época de horário de verão</label>
      <p class="wz-err" role="alert">${esc(W.err)}</p><div class="wz-nav"><button class="ghost" id="wzPrev" type="button">Voltar</button><button id="wzNext" type="button">Próximo</button></div></div></div>`; return;
  }
  const qm = /^q(\d+)$/.exec(st);
  if (qm) {
    const i = +qm[1], q = GT_Q[i];
    R.innerHTML = `<div class="wz">${dotsHtml(st)}<div class="wz-card"><span class="eyebrow">Pergunta ${i + 1} de ${GT_Q.length}</span><p class="wz-q">${esc(q[0])}</p>${q[1] ? `<p class="wz-hint">${esc(q[1])}</p>` : ''}<div class="wz-opts">${q[2].map((o, j) => `<button type="button" class="wz-opt" data-opt="${j}" aria-pressed="${D.ans[i] === j}">${esc(o[0])}</button>`).join('')}</div><div class="wz-nav"><button class="ghost" id="wzPrev" type="button">Voltar</button><button id="wzNext" type="button"${D.ans[i] === undefined ? ' disabled' : ''}>Próximo</button></div></div></div>`; return;
  }
  if (st === 'obj') {
    R.innerHTML = `<div class="wz">${dotsHtml(st)}<div class="wz-card"><h2>Qual é o seu objetivo agora?</h2><label>O que você quer mudar ou conquistar? Escreva do seu jeito.<textarea id="wzGoal" rows="4" placeholder="Ex.: Quero cobrar o que meu trabalho vale, sem culpa.">${esc(D.goal)}</textarea></label>
      <label class="check" style="align-items:flex-start"><input id="wzAceite" type="checkbox"${D.aceite ? ' checked' : ''} style="margin-top:3px"> <span>Concordo em enviar as minhas respostas para gerar o mapa e que o terapeuta responsável tenha acesso a elas.</span></label>
      <details><summary class="wz-link">Como usamos os seus dados</summary><p class="wz-msg">Os dados informados (nome, nascimento, respostas e objetivo) são usados apenas para gerar o seu mapa e ficam guardados para você consultar e para o acompanhamento com o terapeuta. O texto é gerado por inteligência artificial. Você pode pedir a exclusão dos seus dados a qualquer momento pelo contato do terapeuta.</p></details>
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
async function afterLogin() {
  syncLocal(); await loadMaps();
  if (new URLSearchParams(location.search).get('ver')) return;
  if (W.maps.length) return openMap(W.maps[0].id, false);
  W.screen = 'step'; D.step = D.step || 'dados1'; wz();
}
async function doAuth() {
  const email = ($('wzEmail').value || '').trim(), m = W.mode; W.email = email; W.err = ''; W.msg = '';
  if (!/^\S+@\S+\.\S+$/.test(email)) { W.err = 'Digite um e-mail válido.'; return wz(); }
  const pass = $('wzPass') ? $('wzPass').value : '';
  if (m !== 'forgot' && pass.length < 6) { W.err = 'A senha precisa ter pelo menos 6 caracteres.'; return wz(); }
  W.busy = true; $('wzAuth').disabled = true;
  try {
    if (m === 'forgot') { const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + '/' }); if (error) throw error; W.msg = 'Pronto! Se o e-mail existir, o link chegou na sua caixa de entrada.'; }
    else if (m === 'signup') {
      const { data, error } = await sb.auth.signUp({ email, password: pass, options: { emailRedirectTo: location.origin + '/' } }); if (error) throw error;
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
  const g1 = GT_G[S.rg[0]], g2 = GT_G[S.rg[1]], po1 = GT_P[S.rp[0]], po2 = GT_P[S.rp[1]];
  return {
    guardiao_principal: { nome: g1[0], apelido: g1[1], protege: g1[2], frase_interna: g1[3] }, guardiao_secundario: { nome: g2[0], apelido: g2[1] },
    ferida_principal: S.rw[0] ? { nome: GT_W[S.rw[0]][0], descricao: GT_W[S.rw[0]][1], jeito_de_se_defender: GT_W[S.rw[0]][2] } : 'a pessoa pulou a pergunta da infância; trate a ferida como hipótese leve e diga que ela pode confirmar ou não',
    ferida_secundaria: S.rw[1] ? GT_W[S.rw[1]][0] : null,
    potencial_principal: { nome: po1[0], significa: po1[1] }, potencial_secundario: { nome: po2[0], significa: po2[1] },
    estilo_de_aprender: { principal: GT_L[S.rl[0]][0] + ': ' + GT_L[S.rl[0]][1], secundario: GT_L[S.rl[1]][0] },
    fonte_de_renda_preferida: { principal: GT_M[S.rm[0]][0] + ': ' + GT_M[S.rm[0]][1], secundaria: GT_M[S.rm[1]][0] },
    respostas: GT_Q.map((q, i) => ({ pergunta: q[0], resposta: q[2][D.ans[i]] ? q[2][D.ans[i]][0] : 'não respondeu' })),
    objetivo_da_pessoa: p.goal
  };
}
async function gerar() {
  if (W.busy) return;
  W.busy = true;
  try { await loadMaps(); } catch (e) {}
  if (W.maps.length) { W.busy = false; return openMap(W.maps[0].id, false); }
  const sess = (await sb.auth.getSession()).data.session;
  if (!sess) { W.busy = false; W.screen = 'auth'; W.mode = 'login'; W.err = 'Entre de novo para continuar.'; return wz(); }
  const c = { uf: D.uf, nome: D.city };
  let p = db.people.find(x => x.id === D.pid && x.gt); if (!p) { p = { id: 'gt' + Date.now(), events: [], elem: {} }; db.people.push(p); }
  Object.assign(p, { name: D.name.trim(), birth: D.birth, goal: D.goal.trim(), time: D.time || '', dst: !!D.dst, city: D.city ? `${D.city}, ${D.uf}` : '', lat: parseFloat(D.lat), lon: parseFloat(D.lon), tz: parseFloat(D.tz) });
  p.gt = { ans: Object.assign({}, D.ans) }; D.pid = p.id; db.cur = p.id; refStr = iso(todayObj); gtSave();
  fillForm(); render();
  const S = gtScore(D.ans), dossier = buildDossier('atual');
  if (!dossier) { W.busy = false; W.err = 'Não consegui calcular os ciclos. Confira a data de nascimento.'; W.screen = 'erro'; return wz(); }
  delete dossier.areas; delete dossier.modo; delete dossier.elementos_autoavaliacao;
  const teste = wzTeste(p, S);
  W.screen = 'gerando'; W.live = 'Lendo as suas respostas…'; wz();
  const frases = ['Calculando os seus ciclos…', 'Cruzando o seu Guardião com o seu momento de vida…', 'Escrevendo o seu mapa…', 'Montando o plano de ação…', 'Revisando os últimos detalhes…'];
  let k = 0; const tm = setInterval(() => { W.live = frases[Math.min(k++, frases.length - 1)]; const l = $('wzLive'); if (l) l.textContent = W.live; }, 9000);
  const call = fase => fetch('/api/gerar', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sess.access_token }, body: JSON.stringify({ fase, teste, dossier }) })
    .then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.erro || 'erro'), { status: r.status, j }); return j.parte; });
  try {
    // Reuse completed stages after an error. Limit concurrency to two API calls.
    const assinatura = JSON.stringify({ teste, dossier });
    if (W.assinaturaGeracao !== assinatura) {
      W.assinaturaGeracao = assinatura;
      W.partesGeradas = {};
    }
    const fases = ['a', 'b', 'c', 'd', 'e'];
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
    p.gt.S = S; p.gt.res = res; p.gt.when = iso(todayObj); save();
    // Only show a completed map after the database confirms it was saved.
    const { error: profileError } = await sb.from('perfis').upsert({ id: W.user.id, email: W.user.email, nome: p.name, nascimento: D.birth, hora: D.time || null, uf: D.uf || null, cidade: D.city || null, lat: p.lat, lon: p.lon, tz: p.tz, dst: !!D.dst, objetivo: p.goal, aceite_lgpd_em: new Date().toISOString() });
    if (profileError) console.warn('Perfil não atualizado; mapa continua salvo se inserção funcionar.');
    const { error: saveError } = await sb.from('mapas').insert({ user_id: W.user.id, respostas: D.ans, scores: S, resultado: res, guardiao: GT_G[S.rg[0]][0], ferida: S.rw[0] ? GT_W[S.rw[0]][0] : null, potencial: GT_P[S.rp[0]][0] });
    if (saveError) {
      if (saveError.code === '23505') {
        await loadMaps();
        if (W.maps.length) { clearInterval(tm); return openMap(W.maps[0].id, false); }
      }
      throw new Error('O mapa foi escrito, mas não pôde ser salvo. Tente novamente: as etapas já concluídas serão reutilizadas.');
    }
    await loadMaps();
    clearInterval(tm); W.viewing = null; W.screen = 'result'; wz(); window.scrollTo(0, 0);
  } catch (e) {
    clearInterval(tm);
    const detalhe = (typeof e?.message === 'string' && e.message.length < 300 && !['erro','incompleto'].includes(e.message))
      ? e.message : 'Não foi possível gerar o mapa agora. Suas respostas estão salvas; tente novamente.';
    W.err = e.status === 401 ? 'Sua sessão expirou. Entre de novo.' : detalhe;
    if (e.j?.fase) W.err += ' (Etapa ' + String(e.j.fase).toUpperCase() + ')';
    W.screen = 'erro'; wz();
  } finally { W.busy = false; }
}
async function openMap(id, asAdmin) {
  W.screen = 'loading'; wz();
  const { data: m } = await sb.from('mapas').select('*').eq('id', id).maybeSingle();
  if (!m) { W.err = 'Mapa não encontrado.'; W.screen = 'erro'; return wz(); }
  const { data: pf } = await sb.from('perfis').select('*').eq('id', m.user_id).maybeSingle(); const f = pf || {};
  const p = { id: 'gtv' + m.id, events: [], elem: {}, name: f.nome || '', birth: f.nascimento, time: f.hora || '', tz: f.tz ?? -3, dst: !!f.dst, city: f.cidade ? `${f.cidade}, ${f.uf || ''}` : '', lat: f.lat, lon: f.lon, goal: f.objetivo || '', gt: { ans: m.respostas, S: m.scores, res: m.resultado } };
  db.people = db.people.filter(x => x.id !== p.id); db.people.push(p); db.cur = p.id; D.pid = p.id; refStr = (m.created_at || '').slice(0, 10) || iso(todayObj);
  fillForm(); render(); W.viewing = asAdmin ? m : null; W.screen = 'result'; wz(); window.scrollTo(0, 0);
}

/* ---- eventos ---- */
document.addEventListener('click', async e => {
  const t = e.target.closest('button,li,a'); if (!t || !$('gt') || $('gt').hidden) return;
  const id = t.id;
  if (id === 'wzStart') { if (!W.user) { W.screen = 'auth'; W.mode = 'signup'; return wz(); } if (W.maps.length) return openMap(W.maps[0].id, false); W.screen = 'step'; return wz(); }
  if (id === 'wzHave') { W.screen = 'auth'; W.mode = 'login'; W.err = ''; return wz(); }
  if (id === 'wzBackW') { W.screen = 'welcome'; W.err = ''; W.msg = ''; return wz(); }
  if (id === 'wzTabS') { W.mode = 'signup'; W.err = ''; return wz(); }
  if (id === 'wzTabL') { W.mode = 'login'; W.err = ''; return wz(); }
  if (id === 'wzForgot') { W.mode = 'forgot'; W.err = ''; return wz(); }
  if (id === 'wzAuth') return doAuth();
  if (id === 'wzToLogin') { W.screen = 'auth'; W.mode = 'login'; return wz(); }
  if (id === 'wzSetPass') { const v = $('wzPass').value; if (v.length < 6) { W.err = 'A senha precisa ter pelo menos 6 caracteres.'; return wz(); } const { error } = await sb.auth.updateUser({ password: v }); if (error) { W.err = msgAuth(error); return wz(); } history.replaceState(null, '', '/'); const { data } = await sb.auth.getSession(); W.user = data.session ? data.session.user : null; return afterLogin(); }
  if (id === 'wzOut') { await sb.auth.signOut(); W.user = null; W.maps = []; W.screen = 'welcome'; return wz(); }
  if (id === 'wzMine') { await loadMaps(); W.screen = 'lista'; return wz(); }
  if (t.dataset && t.dataset.map) return openMap(t.dataset.map, false);
  if (id === 'wzPrev') return stepPrev();
  if (t.dataset && t.dataset.opt !== undefined) { const i = +/^q(\d+)$/.exec(D.step)[1]; D.ans[i] = +t.dataset.opt; gtSave(); return wz(); }
  if (id === 'wzManual') { D.manual = true; gtSave(); return wz(); }
  if (id === 'wzList') { D.manual = false; gtSave(); return wz(); }
  if (id === 'wzRetry') return gerar();
  if (id === 'wzToObj') { W.screen = 'step'; D.step = 'obj'; return wz(); }
  if (t.tagName === 'LI' && t.dataset.c !== undefined) { const L = (W.cities[D.uf] || [])[+t.dataset.c]; if (L) { D.city = L[0]; D.lat = L[1]; D.lon = L[2]; D.tz = L[3]; gtSave(); $('wzCity').value = L[0]; $('wzRes').hidden = true; } return; }
  if (id === 'wzNext') {
    const st = D.step; W.err = '';
    if (st === 'dados1') {
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
    if (D.goal.length < 5) W.err = 'Conte o seu objetivo em poucas palavras.'; else if (!D.aceite) W.err = 'Para gerar o mapa, marque a concordância acima.';
    if (W.err) { gtSave(); return wz(); }
    gtSave(); return gerar();
  }
});
document.addEventListener('input', async e => {
  const t = e.target; if (!$('gt') || $('gt').hidden) return;
  if (t.id === 'wzCity') {
    D.city = ''; D.lat = ''; D.lon = '';
    const q = norm(t.value), res = $('wzRes'); if (!D.uf) { res.hidden = false; res.innerHTML = '<li>Escolha o estado primeiro</li>'; return; }
    const all = await cities(); const L = (all[D.uf] || []);
    const hits = []; L.forEach((c, i) => { if (q && norm(c[0]).includes(q) && hits.length < 8) hits.push(i); });
    res.hidden = !q; res.innerHTML = hits.length ? hits.map(i => `<li tabindex="0" data-c="${i}">${esc(L[i][0])}</li>`).join('') : '<li>Nenhuma cidade encontrada</li>';
  } else if (t.id === 'wzTime') { D.time = t.value; gtSave(); }
  else if (t.id === 'wzGoal') { D.goal = t.value; gtSave(); }
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
    syncLocal(); await loadMaps();
    if (W.maps.length) return openMap(W.maps[0].id, false);
  }
  W.screen = 'welcome'; wz();
}
// quando o administrador entra pelo link ?ver=
const _afterLogin = afterLogin;
afterLogin = async function () { const ver = new URLSearchParams(location.search).get('ver'); if (ver) { syncLocal(); return openMap(ver, true); } return _afterLogin(); };
boot();
})();
