(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./consulta-estacoes.js'));else root.GuardiaoPdfLayout=factory(root.GuardiaoEstacoes);
})(typeof globalThis!=='undefined'?globalThis:this,function(Estacoes){
 'use strict';
 const C={ink:'#453A33',accent:'#A35330',muted:'#75675D',pale:'#EEE4D7',light:'#FBF9F5',border:'#DDD2C4'};
 const W=595.28,H=841.89,M=28,CW=W-2*M;
 function draw(painter,pages){
  pages.forEach((p,index)=>{
   let scale=1,columns=p.columns===2?2:1;
   function metrics(){
    const size=(p.months?10.3:11.4)*scale,titleSize=(p.cover?38:27)*scale,introSize=(p.cover?13.4:11.4)*scale,titleY=83;
    let y=titleY+painter.height(p.title,CW,titleSize,'serif')+12*scale;
    const introY=y,promiseEnd=p.promessa?introY+painter.height(p.promessa.inicio,CW,introSize,'regular')+3*scale:0;
    if(p.promessa)y=promiseEnd+painter.height(p.promessa.destaque,CW,15.4*scale,'bold')+18*scale;
    else if(p.intro)y+=painter.height(p.intro,CW,introSize,'regular')+16*scale;
    let legend;
    if(p.legend){
     const width=(CW-18*scale)/4;
     const height=Math.max(...Object.values(Estacoes.paletas).map(s=>painter.height(s.verbo,width-12*scale,7.4*scale,'regular')))+25*scale;
     legend={y,width,height};y+=height+12*scale;
    }
    const gap=(p.compact?9:12)*scale,cols=columns,cards=[];
    function measure(b,i,outerWidth){
     const palette=Estacoes.obter(b.estacao),month=b.kind==='mes',hero=p.cover&&i===0,seasonHero=b.kind==='estacao';
     const boxed=b.tone!=='plain'||!!palette;
     const pad=boxed?(p.compact?8:month?10:12)*scale:0,width=outerWidth-2*pad;
     const label=boxed&&!hero&&!seasonHero&&!month?b.label.toUpperCase():b.label;
     const labelFont=hero||seasonHero?'serif':boxed?'bold':'serif';
     const labelSize=(hero?24:seasonHero?23:month?10.3:boxed?8.7:19)*scale;
     const eyebrowY=pad,eyebrowH=b.eyebrow?painter.height(b.eyebrow.toUpperCase(),width,8.4*scale,'bold')+8*scale:0;
     const seasonY=eyebrowY+eyebrowH,seasonH=palette&&!month&&b.seasonLabel!==false?15*scale:0;
     const labelY=seasonY+seasonH,labelW=month?width-69*scale:width,labelH=painter.height(label,labelW,labelSize,labelFont);
     const bodyY=labelY+labelH+(hero?13:8)*scale,bodySize=month?15.5*scale:size,bodyFont=month?'serif':'regular';
     const bodyH=b.body?painter.height(b.body,width,bodySize,bodyFont):0;
     const items=(b.items||[]).map((t,j)=>(j+1)+'. '+t).join('\n'),itemsY=bodyY+bodyH+(bodyH&&items?9*scale:0);
     const itemPad=items&&!boxed?10*scale:0,itemsH=items?painter.height(items,width-2*itemPad,size,'regular')+2*itemPad:0;
     let bottom=items?itemsY+itemsH:bodyY+bodyH;
     const fields=(b.fields||[]).map(f=>{
      const fs=(month?9.9:10.8)*scale,ls=(month?8:8.5)*scale;
      const labelY=bottom+(month?6:10)*scale,labelH=painter.height(f.label.toUpperCase(),width,ls,'bold'),textY=labelY+labelH+3*scale;
      bottom=textY+painter.height(f.text,width,fs,'regular');
      return {...f,labelY,textY,fs,ls};
     });
     const noteY=bottom+8*scale,noteSize=9.1*scale;
     if(b.note)bottom=noteY+painter.height(b.note,width,noteSize,'regular');
     return {outerWidth,pad,width,label,labelW,labelFont,labelSize,labelY,eyebrowY,seasonY,bodyY,bodySize,bodyFont,items,itemsY,itemsH,itemPad,fields,noteY,noteSize,boxed,hero,month,palette,h:bottom+pad};
    }
    let row=[];
    function flush(){if(!row.length)return;const h=Math.max(...row.map(x=>x.h));for(let j=0;j<row.length;j++){const c=row[j];c.x=M+j*((CW-gap)/2+gap);c.y=y;c.h=h;cards[c.index]=c;}y+=h+gap;row=[];}
    p.blocks.forEach((b,i)=>{
     if(cols===1||b.fullWidth){flush();const c=measure(b,i,CW);c.x=M;c.y=y;cards[i]=c;y+=c.h+gap;}
     else{row.push({...measure(b,i,(CW-gap)/2),index:i});if(row.length===2)flush();}
    });flush();
    let table;
    if(p.table){
     const t=p.table,fs=10.9*scale,headerSize=8.7*scale,widths=t.widths.map(x=>x*CW);
     const heights=[t.headers,...t.rows].map((row,i)=>Math.max((i?fs:headerSize)+2,...row.map((v,j)=>painter.height(String(v),widths[j]-18*scale,i?fs:headerSize,i?'regular':'bold')))+16*scale);
     table={y,widths,heights,fs,headerSize};y+=heights.reduce((a,b)=>a+b,0);
    }
    return {y,cards,legend,table,size,titleSize,titleY,introY,introSize,promiseEnd};
   }
   let m=metrics();
   if(columns===2&&!p.months&&m.y>H-53){columns=1;const alternate=metrics();if(alternate.y<m.y)m=alternate;else columns=2;}
   while(m.y>H-53&&scale>.85){scale-=.025;m=metrics();}
   if(m.y>H-47)throw new Error('Conteúdo excede o espaço da página '+(index+1)+'.');
   painter.page();const pageAccent=Estacoes.obter(p.estacao)?.accent||C.accent;
   if(p.cover)painter.text(p.section,M,38,CW,8.7,'bold',C.muted);
   else{painter.text(String(index+1).padStart(2,'0'),M+10,36,30,22,'serif',pageAccent);painter.text(p.section,M+46,43,CW-46,8.7,'regular',C.ink);painter.line(M,68,W-M,68,C.border);}
   painter.text(p.title,M,m.titleY,CW,m.titleSize,'serif',p.cover?pageAccent:C.ink);
   if(p.promessa){painter.text(p.promessa.inicio,M,m.introY,CW,m.introSize,'regular',C.ink);painter.text(p.promessa.destaque,M,m.promiseEnd,CW,15.4*scale,'bold',pageAccent);}
   else if(p.intro)painter.text(p.intro,M,m.introY,CW,m.introSize,'regular',C.ink);
   if(m.legend)Object.values(Estacoes.paletas).forEach((s,i)=>{
    const l=m.legend,x=M+i*(l.width+6*scale);painter.rect(x,l.y,l.width,l.height,s.fundo,s.borda,4);
    painter.text(s.nome,x+6*scale,l.y+5*scale,l.width-12*scale,8.5*scale,'bold',s.accent);
    painter.text(s.verbo,x+6*scale,l.y+17*scale,l.width-12*scale,7.4*scale,'regular',C.ink);
   });
   p.blocks.forEach((b,i)=>{
    const c=m.cards[i],x=c.x+c.pad,y=c.y,pal=c.palette;
    if(c.boxed){painter.rect(c.x,y,c.outerWidth,c.h,pal?.fundo||(b.tone==='soft'?C.pale:C.light),pal?.borda||(b.tone==='soft'?null:C.border),4);if(pal)painter.rect(c.x+1,y+4,3,c.h-8,pal.accent,null,0);}
    if(b.eyebrow)painter.text(b.eyebrow.toUpperCase(),x,y+c.eyebrowY,c.width,8.4*scale,'bold',C.muted);
    if(pal&&!c.month&&b.seasonLabel!==false)painter.text(pal.nome.toUpperCase()+' · '+pal.verbo,x,y+c.seasonY,c.width,8.2*scale,'bold',pal.accent);
    if(pal&&c.month){const chipX=c.x+c.outerWidth-c.pad-63*scale;painter.rect(chipX,y+c.labelY-2*scale,63*scale,15*scale,pal.accent,null,4);painter.text(pal.nome.toUpperCase(),chipX+5*scale,y+c.labelY,53*scale,7.5*scale,'bold','#FFFFFF');}
    painter.text(c.label,x,y+c.labelY,c.labelW,c.labelSize,c.labelFont,c.hero?pageAccent:c.boxed?pal?.accent||C.muted:C.ink);
    if(c.hero)painter.line(x,y+c.bodyY-7*scale,c.x+c.outerWidth-c.pad,y+c.bodyY-7*scale,C.border);
    if(b.body)painter.text(b.body,x,y+c.bodyY,c.width,c.bodySize,c.bodyFont,C.ink);
    if(c.items){if(c.itemPad)painter.rect(x,y+c.itemsY,c.width,c.itemsH,C.light,null,3);painter.text(c.items,x+c.itemPad,y+c.itemsY+c.itemPad,c.width-2*c.itemPad,m.size,'regular',C.ink);}
    for(const f of c.fields){painter.text(f.label.toUpperCase(),x,y+f.labelY,c.width,f.ls,'bold',pal?.accent||C.muted);painter.text(f.text,x,y+f.textY,c.width,f.fs,'regular',C.ink);}
    if(b.note)painter.text(b.note,x,y+c.noteY,c.width,c.noteSize,'regular',C.muted);
   });
   if(p.table){const t=p.table,tm=m.table;let y=tm.y;[t.headers,...t.rows].forEach((row,i)=>{
    let x=M;const h=tm.heights[i];painter.rect(M,y,CW,h,i===0?C.pale:i%2===0?C.light:'#FFFFFF',null,i===0?3:0);
    row.forEach((v,j)=>{painter.text(String(v),x+9*scale,y+8*scale,tm.widths[j]-18*scale,i===0?tm.headerSize:tm.fs,i===0?'bold':'regular',i===0?C.muted:C.ink);if(t.links&&i>0)painter.link(x,y,tm.widths[j],h,Number(t.rows[i-1][1]));x+=tm.widths[j];});
    painter.line(M,y+h,W-M,y+h,C.border);y+=h;
   });}
   painter.line(M,H-42,W-M,H-42,C.border);painter.text('MAPA DO GUARDIÃO',M,H-29,270,7.6,'bold',C.muted);painter.text(String(index+1).padStart(2,'0')+' / '+pages.length,W-88,H-30,60,8,'regular',C.muted);
  });
 }
 return {draw,W,H};
});
