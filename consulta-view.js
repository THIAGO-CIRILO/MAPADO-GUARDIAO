(()=>{'use strict';
 const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 function render(p){
  const pages=window.GuardiaoConsulta.paginas(p,{nome:p.name});
  const html=pages.map((page,i)=>`<section class="consulta-page" id="consulta-pagina-${i+1}"><p class="consulta-kicker">${String(i+1).padStart(2,'0')} · ${esc(page.section)}</p><h2>${esc(page.title)}</h2>${page.intro?`<p>${esc(page.intro)}</p>`:''}${page.blocks.map(b=>`<div class="consulta-card"><h3>${esc(b.label)}</h3>${b.body?`<p>${esc(b.body).replace(/\n/g,'<br>')}</p>`:''}${b.items.length?`<ol>${b.items.map(t=>`<li>${esc(t)}</li>`).join('')}</ol>`:''}</div>`).join('')}${page.table?`<div class="consulta-table-wrap"><table><thead><tr>${page.table.headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${page.table.rows.map(row=>`<tr>${row.map((v,j)=>`<${j===0?'th scope="row"':'td'}>${page.table.links?`<a href="#consulta-pagina-${Number(row[1])}">${esc(v)}</a>`:esc(v)}</${j===0?'th':'td'}>`).join('')}</tr>`).join('')}</tbody></table></div>`:''}<p class="consulta-page-count">${i+1} / 20</p></section>`).join('');
  document.getElementById('gtBody').innerHTML=`<div class="consulta-toolbar"><button id="gtPdf" type="button">Baixar meu mapa · 20 páginas</button><a href="/meditacao" target="_blank" rel="noopener">Ouvir meditação novamente</a><span id="gtPdfSt" role="status" aria-live="polite"></span></div><main class="consulta-reading" id="gtDoc">${html}</main>`;
 }
 window.GuardiaoConsultaView={render};
})();
