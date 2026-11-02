(()=>{'use strict';
 let fontPromise;
 async function loadFonts(){
  if(!fontPromise)fontPromise=Promise.all(['Figtree-Regular.ttf','Figtree-Bold.ttf','InstrumentSerif-Regular.ttf'].map(async name=>{
   const r=await fetch('/fonts/'+name);if(!r.ok)throw new Error('Não consegui carregar as fontes do PDF.');
   const bytes=new Uint8Array(await r.arrayBuffer());let s='';
   for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));
   return {name,data:btoa(s)};
  })).catch(err=>{fontPromise=null;throw err;});
  return fontPromise;
 }
 async function download(p,button,status){
  const pages=window.GuardiaoConsulta.paginas(p,{nome:p.name});
  const fonts=await loadFonts();
  const JsPDF=window.jspdf?.jsPDF;
  if(!JsPDF)throw new Error('O recurso de PDF não carregou. Atualize a página.');
  const doc=new JsPDF({unit:'pt',format:'a4',orientation:'portrait',compress:true});
  fonts.forEach((f,i)=>{doc.addFileToVFS(f.name,f.data);doc.addFont(f.name,i===2?'serif':i===1?'bold':'regular','normal');});
  let count=0;const links=[];
  const set=(s,f,c)=>{doc.setFont(f,'normal');doc.setFontSize(s);if(c)doc.setTextColor(c);doc.setLineHeightFactor(1+2/s);};
  const painter={
   page:()=>{if(count++)doc.addPage('a4','portrait');},
   height:(t,w,s,f)=>{set(s,f);return doc.splitTextToSize(t,w).length*(s+2);},
   text:(t,x,y,w,s,f,c)=>{set(s,f,c);doc.text(doc.splitTextToSize(t,w),x,y,{baseline:'top'});},
   line:(x,y,xx,yy,c)=>{doc.setDrawColor(c);doc.setLineWidth(.6);doc.line(x,y,xx,yy);},
   rect:(x,y,w,h,c,b,r=0)=>{doc.setFillColor(c);if(b)doc.setDrawColor(b);doc.setLineWidth(.6);if(r)doc.roundedRect(x,y,w,h,r,r,b?'FD':'F');else doc.rect(x,y,w,h,b?'FD':'F');},
   link:(x,y,w,h,target)=>links.push({page:count,x,y,w,h,target})
  };
  window.GuardiaoPdfLayout.draw(painter,pages);
  links.forEach(l=>{doc.setPage(l.page);doc.link(l.x,l.y,l.w,l.h,typeof l.target==='number'?{pageNumber:l.target}:{url:l.target});});
  if(doc.getNumberOfPages()!==20)throw new Error('Não consegui fechar o PDF em 20 páginas.');
  const name=String(p.name||'Meu_Mapa').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_-]+/g,'_').slice(0,60);
  doc.save('Mapa_do_Guardiao_20_Paginas_'+name+'.pdf');
  if(status)status.textContent='Seu mapa de 20 páginas está pronto.';
 }
 window.GuardiaoPdfConsulta={download};
})();
