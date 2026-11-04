(()=>{'use strict';
 const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const E=window.GuardiaoEstacoes;
 function block(b){
  const s=E.obter(b.estacao),month=b.kind==='mes';
  const style=s?' style="--season-accent:'+s.accent+';--season-bg:'+s.fundo+';--season-border:'+s.borda+'"':'';
  return `<article class="consulta-card consulta-card--${esc(b.tone||'outline')}${b.kind==='potencia'?' consulta-card--potencia':''}${b.kind==='estacao'?' consulta-card--estacao':''}${s?' consulta-card--season':''}${month?' consulta-card--mes':''}"${style}>
   ${b.eyebrow?`<span class="consulta-power-label">${esc(b.eyebrow)}</span>`:''}
   ${s&&b.seasonLabel!==false?`<span class="consulta-season-label">${esc(s.nome)}${month?'':' · '+esc(s.verbo)}</span>`:''}
   <h3>${esc(b.label)}</h3>
   ${b.body?`<p${month?' class="consulta-month-title"':''}>${esc(b.body).replace(/\n/g,'<br>')}</p>`:''}
   ${b.original?`<details class="consulta-original"><summary>Conferir sua resposta original</summary><p>${esc(b.original).replace(/\n/g,'<br>')}</p></details>`:''}
   ${b.items.length?`<ol>${b.items.map(t=>`<li>${esc(t)}</li>`).join('')}</ol>`:''}
   ${b.fields?.length?`<dl class="consulta-fields">${b.fields.map(f=>`<div><dt>${esc(f.label)}</dt><dd>${esc(f.text)}</dd></div>`).join('')}</dl>`:''}
   ${b.note?`<p class="consulta-card-note">${esc(b.note)}</p>`:''}
  </article>`;
 }
 function render(p){
  const pages=window.GuardiaoConsulta.paginas(p,{nome:p.name});
  const html=pages.map((page,i)=>`<section class="consulta-page${page.cover?' consulta-page--cover':''}" id="consulta-pagina-${i+1}"><p class="consulta-kicker"><span class="consulta-section-number">${String(i+1).padStart(2,'0')}</span><span>${esc(page.section)}</span></p><h2>${esc(page.title)}</h2>${page.promessa?`<p class="consulta-promise">${esc(page.promessa.inicio)} <strong>${esc(page.promessa.destaque)}</strong></p>`:page.intro?`<p>${esc(page.intro)}</p>`:''}
   ${page.legend?`<div class="consulta-season-legend" aria-label="Cores das estações">${Object.values(E.paletas).map(s=>`<div style="--season-accent:${s.accent};--season-bg:${s.fundo};--season-border:${s.borda}"><strong>${esc(s.nome)}</strong><span>${esc(s.verbo)}</span></div>`).join('')}</div>`:''}
   <div class="consulta-blocks${page.columns===2?' consulta-blocks--two':''}">${page.blocks.map(b=>`<div${b.fullWidth?' class="consulta-block-full"':''}>${block(b)}</div>`).join('')}</div>
   ${page.table?`<div class="consulta-table-wrap"><table><thead><tr>${page.table.headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${page.table.rows.map(row=>`<tr>${row.map((v,j)=>`<${j===0?'th scope="row"':'td'}>${page.table.links?`<a href="#consulta-pagina-${Number(row[1])}">${esc(v)}</a>`:esc(v)}</${j===0?'th':'td'}>`).join('')}</tr>`).join('')}</tbody></table></div>`:''}<p class="consulta-page-count">${i+1} / 20</p></section>`).join('');
  document.getElementById('gtBody').innerHTML=`<div class="consulta-toolbar"><button id="gtPdf" type="button">Baixar meu mapa · 20 páginas</button><a href="/meditacao" target="_blank" rel="noopener">Ouvir meditação novamente</a><span id="gtPdfSt" role="status" aria-live="polite"></span></div><main class="consulta-reading" id="gtDoc">${html}</main>`;
 }
 window.GuardiaoConsultaView={render};
})();
