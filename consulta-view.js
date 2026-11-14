(()=>{'use strict';
 const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const paragraphs=value=>esc(value).replace(/\n/g,'<br>');
 const E=window.GuardiaoEstacoes;

 function block(b){
  const season=E.obter(b.estacao),month=b.kind==='mes';
  const style=season?' style="--season-accent:'+season.accent+';--season-bg:'+season.fundo+';--season-border:'+season.borda+'"':'';
  return `<article class="consulta-card consulta-card--${esc(b.tone||'outline')}${b.kind==='potencia'?' consulta-card--potencia':''}${b.kind==='estacao'?' consulta-card--estacao':''}${season?' consulta-card--season':''}${month?' consulta-card--mes':''}"${style}>
   ${b.eyebrow?`<span class="consulta-power-label">${esc(b.eyebrow)}</span>`:''}
   ${season?`<span class="consulta-season-label">${esc(season.nome)}${month?'':' · '+esc(season.verbo)}</span>`:''}
   <h3>${esc(b.label)}</h3>
   ${b.body?`<p${month?' class="consulta-month-title"':''}>${paragraphs(b.body)}</p>`:''}
   ${b.original?`<details class="consulta-original"><summary>Conferir sua resposta original</summary><p>${paragraphs(b.original)}</p></details>`:''}
   ${b.fields?.length?`<dl class="consulta-fields">${b.fields.map(f=>`<div><dt>${esc(f.label)}</dt><dd>${esc(f.text)}</dd></div>`).join('')}</dl>`:''}
   ${b.promise?`<p class="consulta-promise">${esc(b.promise.inicio)} <strong>${esc(b.promise.destaque)}</strong></p>`:''}
  </article>`;
 }

 function blocks(items,columns){
  return `<div class="consulta-blocks${columns===2?' consulta-blocks--two':''}">${items.map(b=>`<div${b.fullWidth?' class="consulta-block-full"':''}>${block(b)}</div>`).join('')}</div>`;
 }

 function table(t){
  return `<div class="consulta-table-wrap${t.stackOnMobile?' consulta-table-wrap--stack':''}"><table><thead><tr>${t.headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${t.rows.map(row=>`<tr>${row.map((v,j)=>j===0?`<th scope="row">${esc(v)}</th>`:`<td data-label="${esc(t.headers[j])}">${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
 }

 function render(p){
  const pages=window.GuardiaoConsulta.paginas(p,{nome:p.name});
  const html=pages.map((page,i)=>`<section class="consulta-page${page.cover?' consulta-page--cover':''}" id="consulta-pagina-${i+1}"><p class="consulta-kicker"><span class="consulta-section-number">${String(i+1).padStart(2,'0')}</span><span>${esc(page.section)}</span></p><h2>${esc(page.title)}</h2>${page.intro?`<p>${esc(page.intro)}</p>`:''}
   ${page.legend?`<div class="consulta-season-legend" aria-label="Cores das estações">${Object.values(E.paletas).map(s=>`<div style="--season-accent:${s.accent};--season-bg:${s.fundo};--season-border:${s.borda}"><strong>${esc(s.nome)}</strong><span>${esc(s.verbo)}</span></div>`).join('')}</div>`:''}
   ${blocks(page.blocks,page.columns)}
   ${page.table?table(page.table):''}
   ${(page.details||[]).map(d=>`<details class="consulta-details"><summary>${esc(d.title)}</summary>${d.table?table(d.table):blocks(d.blocks,2)}</details>`).join('')}
   <p class="consulta-page-count">${i+1} / ${pages.length}</p></section>`).join('');
  document.getElementById('gtBody').innerHTML=`<div class="consulta-toolbar"><button id="gtPdf" type="button">Baixar PDF completo · ${window.GuardiaoConsulta.paginasDoPDF} páginas</button><a href="/meditacao" target="_blank" rel="noopener">Ouvir meditação novamente</a><span id="gtPdfSt" role="status" aria-live="polite"></span></div><main class="consulta-reading" id="gtDoc">${html}</main>`;
 }
 window.GuardiaoConsultaView={render};
})();
