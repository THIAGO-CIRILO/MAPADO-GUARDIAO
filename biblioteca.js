/* Biblioteca Campo Guardião — interface administrativa.
 * PDF.js extrai texto LOCALMENTE no navegador. Arquivos e trechos só vão ao Storage e banco privados.
 * Autorização é verificada no PostgreSQL por RLS, não por texto/e-mail no navegador.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const BUCKET = 'guardiao-livros';
  const MAX_STORAGE_SIZE = 50 * 1024 * 1024;
  const MAX_PARSE_SIZE = 200 * 1024 * 1024;
  const GROUP = 60;
  const cfg = window.APP_CONFIG || {};
  let db, user, importing = false, selected = [];
  const cats = ['astrologia','ciclos','relacionamentos','cabala','espiritualidade','numerologia','metodo','outros'];
  const visible = (id, show) => { const node = $(id); if (node) node.hidden = !show; };
  const status = (message, err=false) => {
    $('status').textContent=message||'';
    $('status').className=err?'error':'';
  };
  const message = err => {
    const s = String(err?.message || err || 'Erro desconhecido');
    if (s.includes('row-level security') || s.includes('permission denied')) return 'Permissão negada. Entre com sua conta de administrador.';
    return s.slice(0,280);
  };
  const ensure = ({data,error}) => { if (error) throw error; return data; };
  // Mobile networks can interrupt Supabase calls without an HTTP error.
  // Retry ONLY transient failures. Permission and validation errors fail immediately.
  const transientError = error => {
    const statusCode=Number(error?.status||error?.code)||0;
    if([408,425,429,500,502,503,504,520,521,522,523,524].includes(statusCode))return true;
    const m=String(error?.message||error||'').toLowerCase();
    return /failed to fetch|networkerror|network error|fetch failed|load failed|connection lost|timed out|timeout|temporar(?:ily|iamente) unavailable|econnreset/.test(m);
  };
  const wait = ms => new Promise(resolve=>setTimeout(resolve,ms));
  async function requestWithRetry(stage, action, note, maxAttempts=5){
    let last;
    for(let attempt=1;attempt<=maxAttempts;attempt++){
      try {
        return ensure(await action());
      } catch(err){
        last=err;
        if(!transientError(err)||attempt===maxAttempts)break;
        const delay=[1100,2300,4500,7500][attempt-1]||9500;
        if(note)note.textContent='Conexão instável ao '+stage+'. Tentativa '+(attempt+1)+'/'+maxAttempts+' em '+Math.ceil(delay/1000)+' s…';
        await wait(delay);
      }
    }
    const error=new Error('Falha em '+stage+': '+message(last)+'. '+(transientError(last)?'A rede não respondeu após várias tentativas.':''));
    error.cause=last;
    throw error;
  }
  const progress = value => { $('bar').style.width = Math.min(100,Math.max(0,value)).toFixed(1)+'%'; };
  function queueLine(label, detail){
    const li=document.createElement('li'), name=document.createElement('span'), note=document.createElement('span');
    name.textContent=label; note.textContent=detail; li.append(name,note); $('queue').append(li);return note;
  }
  async function checkSession() {
    visible('loadingPanel',true);visible('loginPanel',false);visible('privatePanels',false);
    try {
      if (!db) throw new Error('Configuração do Supabase ausente.');
      const {data,error} = await db.auth.getSession();
      if(error) throw error;
      user=data?.session?.user || null;
      if (!user) {visible('loginPanel',true);return;}
      const allowed=ensure(await db.rpc('is_guardiao_admin'));
      if(allowed!==true){visible('loginPanel',true);$('loginError').textContent='Esta conta não tem autorização para administrar a biblioteca.';return;}
      visible('privatePanels',true);
      await loadBooks();
    } catch(err) {
      visible('loginPanel',true);
      $('loginError').textContent=message(err);
    } finally {visible('loadingPanel',false);}
  }
  async function signIn(event){
    event.preventDefault();$('loginError').textContent='';
    const email=$('email').value.trim(),password=$('password').value;
    const {error}=await db.auth.signInWithPassword({email,password});
    if(error){$('loginError').textContent=message(error);return;}
    $('password').value='';await checkSession();
  }
  const isPdf = file => file && /\.pdf$/i.test(file.name) && file.size>100 && file.size<=MAX_PARSE_SIZE;
  function setSelected(files){
    selected=Array.from(files||[]);
    $('btnImport').disabled=importing||!selected.length;
    $('queue').replaceChildren();
    progress(0);
    const valid=selected.filter(isPdf).length;
    const textOnly=selected.filter(f=>isPdf(f)&&f.size>MAX_STORAGE_SIZE).length;
    status(selected.length ? selected.length+' arquivo(s) selecionado(s); '+valid+' PDF(s) aceito(s).'+(textOnly?' '+textOnly+' acima de 50 MB: somente texto indexado, sem cópia do PDF.':'') : '');
  }
  function cleanTitle(name){
    return String(name||'').replace(/\.pdf$/i,'').replace(/[_]+/g,' ').replace(/\s+/g,' ').trim().slice(0,250)||'Livro sem título';
  }
  function safeName(name){
    return String(name||'livro.pdf').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-zA-Z0-9_.-]+/g,'-').slice(-150).replace(/^[-.]+/,'')||'livro.pdf';
  }
  function splitPage(raw){
    const text=String(raw||'').replace(/[\u0000-\u001f\u007f]/g,' ')
      .replace(/\s+/g,' ').trim();
    if(text.length<35) return [];
    const chunks=[];let start=0;
    while(start<text.length){
      let end=Math.min(start+1250,text.length);
      if(end<text.length){
        const space=text.lastIndexOf(' ',end);
        if(space>start+650)end=space;
      }
      const piece=text.slice(start,end).trim();
      if(piece.length>=20)chunks.push(piece.slice(0,1800));
      if(end>=text.length)break;
      start=Math.max(start+1,end-140);
    }
    return chunks;
  }
  async function parsePdf(bytes,note){
    if(!window.pdfjsLib)throw new Error('Leitor de PDF indisponível. Atualize a página e tente novamente.');
    const signature=new TextDecoder().decode(bytes.slice(0,5));
    if(signature!=='%PDF-')throw new Error('O arquivo não tem assinatura de PDF válido.');
    // PDF.js may transfer this buffer to its worker. Avoid a costly second copy on mobile.
    const task=pdfjsLib.getDocument({data:bytes,isEvalSupported:false});
    const doc=await task.promise;
    if(doc.numPages>3000){await doc.destroy();throw new Error('O livro excede o limite de 3.000 páginas.');}
    const chunks=[];let pagesWithText=0;
    try {
      for(let pageNo=1;pageNo<=doc.numPages;pageNo++){
        const page=await doc.getPage(pageNo);
        const content=await page.getTextContent({disableCombineTextItems:false});
        const text=content.items.map(i=>i.str||'').join(' ');
        const slices=splitPage(text);
        if(slices.length)pagesWithText++;
        slices.forEach((piece,i)=>chunks.push({pagina:pageNo,ordem:i,texto:piece}));
        page.cleanup();
        if(pageNo%15===0||pageNo===doc.numPages){
          note.textContent='Extraindo texto: página '+pageNo+' de '+doc.numPages;
          await new Promise(r=>setTimeout(r,0));
        }
        if(chunks.length>20000)throw new Error('Livro muito extenso para esta importação (20 mil trechos).');
      }
      if(!chunks.length)throw new Error('Não foi encontrado texto pesquisável. Este arquivo precisa de OCR.');
      if(pagesWithText/doc.numPages<0.50)throw new Error('Mais da metade das páginas não tem texto. Faça OCR antes de importar.');
      return {paginas:doc.numPages,chunks};
    }finally{await doc.destroy();}
  }
  async function hash(buffer){
    const digest=await crypto.subtle.digest('SHA-256',buffer);
    return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  async function insertChunks(id,chunks,note){
    for(let k=0;k<chunks.length;k+=GROUP){
      const batch=chunks.slice(k,k+GROUP).map(x=>({livro_id:id,...x}));
      await requestWithRetry('indexar os trechos '+(k+1)+'–'+Math.min(k+GROUP,chunks.length),
        () => db.from('biblioteca_trechos').upsert(batch,{onConflict:'livro_id,pagina,ordem'}),note);
      note.textContent='Indexados '+Math.min(k+GROUP,chunks.length)+' de '+chunks.length+' trechos';
      if(k>0&&k%(GROUP*6)===0)await wait(100);
    }
  }
  async function importSingle(file,category,note) {
    if(!isPdf(file))throw new Error('Aceito somente PDF digital válido de até 200 MB. Arquivos maiores precisam ser divididos.');
    const raw=await file.arrayBuffer(),bytes=new Uint8Array(raw);
    const sha=await hash(raw);
    const found=await requestWithRetry('consultar livros existentes',
      () => db.from('biblioteca_livros').select('id,titulo,situacao,storage_path,arquivo_armazenado,total_trechos').eq('sha256',sha).maybeSingle(),note);
    if(found?.situacao==='pronto'){
      note.textContent='Já cadastrado. Mantido sem reenviar: '+found.titulo;
      return 'existente';
    }
    note.textContent=found?'Retomando livro incompleto…':'Lendo páginas e preparando índice…';
    const parsed=await parsePdf(bytes,note);
    const id=found?.id||crypto.randomUUID();
    const storedPdf=found?found.arquivo_armazenado:file.size<=MAX_STORAGE_SIZE;
    const path=found?.storage_path||(storedPdf?id+'/'+safeName(file.name):'somente-indice/'+id+'.pdf');
    let uploaded=!!found?.arquivo_armazenado,registered=!!found;
    try{
      if(!found){
        if(storedPdf){
          note.textContent='Enviando PDF ao armazenamento privado…';
          await requestWithRetry('enviar o PDF',()=>{
            return db.storage.from(BUCKET).upload(path,file,{contentType:'application/pdf',upsert:true});
          },note);
          uploaded=true;
        }else{
          note.textContent='Livro acima de 50 MB: indexando texto sem armazenar o PDF original…';
        }
        await requestWithRetry('cadastrar o livro',
          () => db.from('biblioteca_livros').upsert({
            id,titulo:cleanTitle(file.name),autor:'',categoria:category,
            nome_arquivo:file.name,storage_path:path,sha256:sha,
            arquivo_armazenado:storedPdf,tamanho_bytes:file.size,paginas:parsed.paginas,
            situacao:'processando',ativo:false
          },{onConflict:'sha256'}),note);
        registered=true;
      }else{
        await requestWithRetry('retomar o cadastro',
          () => db.from('biblioteca_livros').update({
            situacao:'processando',ativo:false,mensagem_erro:null,
            paginas:parsed.paginas,atualizado_em:new Date().toISOString()
          }).eq('id',id),note);
      }
      await insertChunks(id,parsed.chunks,note);
      await requestWithRetry('finalizar a indexação',
        () => db.from('biblioteca_livros').update({
          situacao:'pronto',ativo:true,total_trechos:parsed.chunks.length,
          mensagem_erro:null,atualizado_em:new Date().toISOString()
        }).eq('id',id),note);
      note.textContent='Pronto: '+parsed.paginas+' páginas · '+parsed.chunks.length+' trechos'+(storedPdf?'':' · somente índice textual');
      return found?'retomado':'novo';
    }catch(err){
      if(registered){
        try{
          await requestWithRetry('registrar a falha',
            () => db.from('biblioteca_livros').update({
              situacao:'erro',ativo:false,mensagem_erro:message(err),
              atualizado_em:new Date().toISOString()
            }).eq('id',id),note,2);
        }catch(_){}
      }else if(uploaded){
        try { await requestWithRetry('limpar upload incompleto',
          () => db.storage.from(BUCKET).remove([path]),note,2); }catch(_){}
      }
      throw err;
    }
  }
  async function beginImport(){
    if(importing||!selected.length)return;
    importing=true;$('btnImport').disabled=true;$('files').disabled=true;$('category').disabled=true;
    $('queue').replaceChildren();
    let done=0,failed=0,skipped=0;
    const batch=selected.slice(),category=$('category').value;
    for(let i=0;i<batch.length;i++){
      const file=batch[i],note=queueLine(file.name,'Aguardando');
      try {
        const result=await importSingle(file,category,note);
        if(result==='existente')skipped++;
      }catch(err){failed++;note.textContent='ERRO: '+message(err);}
      done++;progress(100*done/batch.length);
      status('Processados '+done+' de '+batch.length+' · '+skipped+' já prontos · '+failed+' falha(s)');
    }
    importing=false;selected=[];$('files').disabled=false;$('files').value='';
    $('category').disabled=false;$('btnImport').disabled=true;
    status('Lote concluído: '+(done-failed-skipped)+' novos/retomados, '+skipped+' já cadastrados, '+failed+' falha(s).'+(failed?' Confira a etapa do erro na lista.':''));
    try{await loadBooks();}catch(err){status('O lote terminou, mas a lista não atualizou: '+message(err),true);}
  }
  function el(tag,content,className){
    const n=document.createElement(tag);if(content!==undefined)n.textContent=String(content);
    if(className)n.className=className;return n;
  }
  function action(label,fn,cls='ghost'){
    const b=el('button',label,cls+' small');b.type='button';b.addEventListener('click',fn);return b;
  }
  async function loadBooks(){
    const data=ensure(await db.from('biblioteca_livros').select('id,titulo,autor,categoria,nome_arquivo,storage_path,arquivo_armazenado,paginas,total_trechos,situacao,ativo,mensagem_erro,criado_em').order('criado_em',{ascending:false}).limit(500));
    $('total').textContent=(data||[]).length+' livro(s)';
    $('rows').replaceChildren();
    if(!data?.length){const tr=el('tr');const td=el('td','Nenhum livro importado.');td.colSpan=8;tr.append(td);$('rows').append(tr);return;}
    for(const book of data){
      const tr=el('tr');
      const nm=el('td');nm.append(el('div',book.titulo,'name'),el('div',book.nome_arquivo,'small-text'));
      if(book.arquivo_armazenado===false)nm.append(el('div','Somente índice textual (PDF original não armazenado)','small-text'));
      tr.append(nm,el('td',book.autor||'—'),el('td',book.categoria),el('td',book.paginas),el('td',book.total_trechos));
      const st=el('td');st.append(el('span',book.situacao,'status-pill '+book.situacao));if(book.mensagem_erro)st.append(el('div',book.mensagem_erro,'small-text'));tr.append(st);
      const active=el('td');const check=document.createElement('input');check.type='checkbox';check.className='checkbox';check.checked=book.ativo;check.disabled=book.situacao!=='pronto';
      check.title='Usar este livro nas próximas leituras';
      check.addEventListener('change',async()=>{try{ensure(await db.from('biblioteca_livros').update({ativo:check.checked,atualizado_em:new Date().toISOString()}).eq('id',book.id));status(book.titulo+(check.checked?' ativado.':' desativado.'));}
      catch(err){check.checked=!check.checked;status(message(err),true);}});active.append(check);tr.append(active);
      const actions=el('td'),group=el('div',undefined,'actions');
      group.append(action('Editar',()=>editBook(book)));
      if(book.situacao!=='pronto'&&book.arquivo_armazenado!==false)group.append(action('Retomar',()=>retryBook(book)));
      group.append(action('Excluir',()=>deleteBook(book),'ghost'));
      actions.append(group);tr.append(actions);$('rows').append(tr);
    }
  }
  async function editBook(book){
    const titulo=prompt('Título do livro',book.titulo);if(titulo===null)return;
    const autor=prompt('Autor ou autores',book.autor||'');if(autor===null)return;
    const categoria=prompt('Categoria: '+cats.join(', '),book.categoria);if(categoria===null)return;
    if(!titulo.trim()||titulo.length>250||!cats.includes(categoria.trim())){alert('Título ou categoria inválidos.');return;}
    try{ensure(await db.from('biblioteca_livros').update({
      titulo:titulo.trim(),autor:autor.trim().slice(0,200),categoria:categoria.trim(),atualizado_em:new Date().toISOString()
    }).eq('id',book.id));await loadBooks();}
    catch(err){status(message(err),true);}
  }
  async function deleteBook(book){
    if(importing)return;
    if(!confirm('Excluir definitivamente "'+book.titulo+'", o PDF e todos os trechos associados?'))return;
    try{
      if(book.arquivo_armazenado!==false)ensure(await db.storage.from(BUCKET).remove([book.storage_path]));
      ensure(await db.from('biblioteca_livros').delete().eq('id',book.id));
      status('Livro excluído: '+book.titulo);await loadBooks();
    }catch(err){status('Não foi possível excluir: '+message(err),true);}
  }
  async function retryBook(book){
    if(importing)return;
    if(book.arquivo_armazenado===false){status('Este livro tem somente o índice textual. Se houver erro, exclua o registro e selecione o PDF original novamente.',true);return;}
    importing=true;$('btnImport').disabled=true;
    const note=queueLine('Reprocessando '+book.titulo,'Baixando original privado…');
    try{
      const data=await requestWithRetry('baixar PDF privado',
        () => db.storage.from(BUCKET).download(book.storage_path),note);
      const bytes=new Uint8Array(await data.arrayBuffer());
      const parsed=await parsePdf(bytes,note);
      await requestWithRetry('retomar livro',
        () => db.from('biblioteca_livros').update({situacao:'processando',ativo:false}).eq('id',book.id),note);
      // Upsert resumes where a previous attempt stopped, without deleting valid chunks.
      await insertChunks(book.id,parsed.chunks,note);
      await requestWithRetry('finalizar livro',
        () => db.from('biblioteca_livros').update({situacao:'pronto',ativo:true,paginas:parsed.paginas,total_trechos:parsed.chunks.length,mensagem_erro:null,atualizado_em:new Date().toISOString()}).eq('id',book.id),note);
      note.textContent='Reprocessado com sucesso.';
    }catch(err){
      note.textContent='Erro: '+message(err);
      try{await requestWithRetry('registrar erro de recuperação',
        () => db.from('biblioteca_livros').update({situacao:'erro',ativo:false,mensagem_erro:message(err)}).eq('id',book.id),note,2);}catch(_){}
    }finally{
      importing=false;$('btnImport').disabled=!selected.length;
      try{await loadBooks();}catch(err){status('Não consegui atualizar a lista: '+message(err),true);}
    }
  }
  async function search(event){
    event.preventDefault();
    const q=$('searchQuery').value.trim();if(q.length<2)return;
    $('results').replaceChildren();$('results').append(el('p','Pesquisando…'));
    try{
      const rows=ensure(await db.rpc('biblioteca_buscar',{p_consulta:q,p_limite:7}));
      $('results').replaceChildren();
      if(!rows?.length){$('results').append(el('p','Nenhum trecho encontrado nos livros ativos.'));return;}
      rows.forEach(row=>{
        const box=el('div',undefined,'test-result');
        box.append(el('strong',row.titulo+' · p. '+row.pagina),
          el('div',row.autor||row.categoria,'small-text'),el('p',row.trecho));
        $('results').append(box);
      });
    }catch(err){$('results').replaceChildren();$('results').append(el('p',message(err),'error'));}
  }
  async function start(){
    if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY||!window.supabase){
      visible('loadingPanel',false);visible('loginPanel',true);$('loginError').textContent='Configuração de acesso indisponível. Contate o suporte.';return;
    }
    db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
    if(window.pdfjsLib)pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    $('loginForm').addEventListener('submit',signIn);
    $('btnLogout').addEventListener('click',async()=>{await db.auth.signOut();await checkSession();});
    $('files').addEventListener('change',event=>setSelected(event.target.files));
    $('btnImport').addEventListener('click',beginImport);
    $('refresh').addEventListener('click',loadBooks);
    $('searchForm').addEventListener('submit',search);
    const drop=$('drop');
    ['dragenter','dragover'].forEach(type=>drop.addEventListener(type,event=>{event.preventDefault();drop.classList.add('drag');}));
    ['dragleave','drop'].forEach(type=>drop.addEventListener(type,event=>{event.preventDefault();drop.classList.remove('drag');}));
    drop.addEventListener('drop',e=>setSelected(e.dataTransfer.files));
    await checkSession();
  }
  start().catch(err=>{visible('loadingPanel',false);visible('loginPanel',true);$('loginError').textContent=message(err);});
})();