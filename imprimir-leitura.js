/* Campo Guardião — impressão integral da leitura visível.
 * Usa somente #gtDoc já renderizado no navegador.
 * Não consulta Claude, APIs ou servidores. */
(()=>{'use strict';
const STYLE_ID='guardiao-print-full-style';
function ensureStyle(){
 if(document.getElementById(STYLE_ID))return;
 const style=document.createElement('style');
 style.id=STYLE_ID;
 style.textContent="\n @page { size: A4 portrait; margin: 12mm 12mm 13mm; }\n @media print {\n   html,body { margin:0!important; padding:0!important; width:100%!important; height:auto!important; background:#fff!important; overflow:visible!important; color:#252321!important; -webkit-print-color-adjust:exact; print-color-adjust:exact; }\n   body > :not(#gt) {display:none!important;}\n   #gt {display:block!important; width:100%!important; max-width:none!important; min-width:0!important; margin:0!important; padding:0!important; background:#fff!important; border:0!important; box-shadow:none!important;}\n   #gt .gt-top {display:none!important;}\n   #gtBody,#gtDoc {display:block!important; width:100%!important; max-width:100%!important; min-width:0!important; margin:0!important; padding:0!important; gap:7mm!important; overflow:visible!important;}\n   #gtDoc .btns,#gtDoc button,#gtDoc .note,#gtDoc > p.gt-note:last-child {display:none!important;}\n   #gtDoc .gt-hero {padding:9mm 8mm!important; border-radius:0!important; margin-bottom:6mm!important; break-inside:avoid-page;}\n   #gtDoc .gt-hero h2 {font-size:22pt!important; line-height:1.17!important;}\n   #gtDoc .gt-sec {margin:0 0 6mm!important; padding:6mm!important; background:#fff!important; box-shadow:none!important; border:1px solid #D8CBC0!important; border-radius:0!important; break-inside:avoid-page; page-break-inside:avoid;}\n   #gtDoc .gt-sec h3 {font-size:16pt!important; color:#351A14!important; line-height:1.3!important; margin-bottom:3mm!important;}\n   #gtDoc .gt-txt p,#gtDoc p,#gtDoc li {font-size:10.4pt!important; line-height:1.55!important; orphans:2; widows:2;}\n   #gtDoc .gt-cols,#gtDoc .gt-work,#gtDoc .gt-cenas {grid-template-columns:repeat(2,minmax(0,1fr))!important; gap:4mm!important;}\n   #gtDoc .gt-node,#gtDoc .gt-box,#gtDoc .gt-w,#gtDoc .gt-quote,#gtDoc .gt-tiles,#gtDoc .gt-bars {break-inside:avoid-page; page-break-inside:avoid;}\n   #gtDoc .gt-triad {grid-template-columns:1fr!important;gap:4mm!important;}\n   #gtDoc .gt-arrow {display:none!important;}\n   #gtDoc .gt-quote {font-size:12pt!important;}\n   #gtDoc a {color:#351A14!important; text-decoration:none!important;}\n   #gtDoc .gt-days li {break-inside:avoid-page;page-break-inside:avoid;}\n }\n";
 document.head.appendChild(style);
}
function save(){
 const doc=document.getElementById('gtDoc');
 if(!doc || !doc.isConnected || !doc.textContent?.trim()) {
  throw new Error('Abra seu mapa completo antes de salvar a leitura.');
 }
 ensureStyle();
 const note=document.getElementById('gtPrintSt')||document.getElementById('gtPdfSt');
 if(note)note.textContent='Na janela de impressão, escolha Salvar como PDF ou uma impressora. Toda a leitura exibida será incluída.';
 window.print();
}
window.guardiaoImprimirLeitura={save};
})();