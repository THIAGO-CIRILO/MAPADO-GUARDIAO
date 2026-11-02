(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();else root.GuardiaoPdfLayout=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const C={ink:'#453A33',accent:'#A35330',muted:'#75675D',pale:'#EEE4D7',light:'#FBF9F5',border:'#DDD2C4'};
 const W=595.28,H=841.89,M=28,CW=W-2*M;
 function draw(painter,pages){
  pages.forEach((p,index)=>{
   let scale=1;
   function metrics(){
    const size=11.4*scale,titleSize=(p.cover?38:27)*scale;
    const introSize=(p.cover?13.4:11.4)*scale;
    const titleY=83;
    let y=titleY+painter.height(p.title,CW,titleSize,'serif')+12*scale;
    const introY=y;
    const promiseEnd=p.promessa?introY+painter.height(p.promessa.inicio,CW,introSize,'regular')+3*scale:0;
    if(p.promessa)y=promiseEnd+painter.height(p.promessa.destaque,CW,15.4*scale,'bold')+18*scale;
    else if(p.intro)y+=painter.height(p.intro,CW,introSize,'regular')+18*scale;
    const cards=p.blocks.map((b,i)=>{
     const boxed=b.tone==='outline'||b.tone==='soft',hero=p.cover&&i===0;
     const pad=boxed?(p.compact?8:14)*scale:0,width=CW-2*pad;
     const label=boxed&&!hero?b.label.toUpperCase():b.label;
     const labelFont=boxed&&!hero?'bold':'serif';
     const labelSize=(hero?24:boxed?8.4:19)*scale;
     const labelH=painter.height(label,width,labelSize,labelFont);
     const eyebrowY=y+pad;
     const eyebrowH=b.eyebrow?painter.height(b.eyebrow.toUpperCase(),width,8.4*scale,'bold')+8*scale:0;
     const labelY=eyebrowY+eyebrowH;
     const bodyY=labelY+labelH+(hero?13:7)*scale;
     const bodyH=b.body?painter.height(b.body,width,size,'regular'):0;
     const items=b.items.map((t,j)=>(j+1)+'. '+t).join('\n');
     const itemsY=bodyY+bodyH+(bodyH&&items?10*scale:0);
     const itemPad=items&&!boxed?10*scale:0;
     const itemsH=items?painter.height(items,width-2*itemPad,size,'regular')+2*itemPad:0;
     const bottom=items?itemsY+itemsH:bodyY+bodyH;
     const h=bottom-y+pad;
     const out={y,h,pad,width,label,labelFont,labelSize,labelY,eyebrowY,bodyY,items,itemsY,itemsH,itemPad,boxed,hero};
     y+=h+(p.compact?10:18)*scale;return out;
    });
    let table;
    if(p.table){
     const t=p.table,fs=10.9*scale,headerSize=8.7*scale;
     const widths=t.widths.map(x=>x*CW);
     const heights=[t.headers,...t.rows].map((row,i)=>{
      const s=i===0?headerSize:fs;
      return Math.max(s+2,...row.map((v,j)=>painter.height(String(v),widths[j]-18*scale,s,i===0?'bold':'regular')))+16*scale;
     });
     table={y,widths,heights,fs,headerSize};y+=heights.reduce((a,b)=>a+b,0);
    }
    return {y,cards,table,size,titleSize,titleY,introY,introSize,promiseEnd};
   }
   let m=metrics();
   while(m.y>H-53&&scale>.85){scale-=.025;m=metrics();}
   if(m.y>H-47)throw new Error('Conteúdo excede o espaço da página '+(index+1)+'.');
   painter.page();
   if(p.cover){
    painter.text(p.section,M,38,CW,8.7,'bold',C.muted);
   }else{
    painter.text(String(index+1).padStart(2,'0'),M+10,36,30,22,'serif',C.accent);
    painter.text(p.section,M+46,43,CW-46,8.7,'regular',C.ink);
    painter.line(M,68,W-M,68,C.border);
   }
   painter.text(p.title,M,m.titleY,CW,m.titleSize,'serif',p.cover?C.accent:C.ink);
   if(p.promessa){painter.text(p.promessa.inicio,M,m.introY,CW,m.introSize,'regular',C.ink);painter.text(p.promessa.destaque,M,m.promiseEnd,CW,15.4*scale,'bold',C.accent);}
   else if(p.intro)painter.text(p.intro,M,m.introY,CW,m.introSize,'regular',C.ink);
   p.blocks.forEach((b,i)=>{
    const bM=m.cards[i],x=M+bM.pad;
    if(bM.boxed)painter.rect(M,bM.y,CW,bM.h,b.tone==='soft'?C.pale:C.light,b.tone==='soft'?null:C.border,4);
    if(b.eyebrow)painter.text(b.eyebrow.toUpperCase(),x,bM.eyebrowY,bM.width,8.4*scale,'bold',C.muted);
    painter.text(bM.label,x,bM.labelY,bM.width,bM.labelSize,bM.labelFont,bM.hero?C.accent:bM.boxed?C.muted:C.ink);
    if(bM.hero)painter.line(x,bM.bodyY-7*scale,W-M-bM.pad,bM.bodyY-7*scale,C.border);
    if(b.body)painter.text(b.body,x,bM.bodyY,bM.width,m.size,'regular',C.ink);
    if(bM.items){
     if(bM.itemPad)painter.rect(x,bM.itemsY,bM.width,bM.itemsH,C.light,null,3);
     painter.text(bM.items,x+bM.itemPad,bM.itemsY+bM.itemPad,bM.width-2*bM.itemPad,m.size,'regular',C.ink);
    }
   });
   if(p.table){
    const t=p.table,tm=m.table;let y=tm.y;
    [t.headers,...t.rows].forEach((row,i)=>{
     let x=M;const h=tm.heights[i];
     painter.rect(M,y,CW,h,i===0?C.pale:i%2===0?C.light:'#FFFFFF',null,i===0?3:0);
     row.forEach((v,j)=>{
      painter.text(String(v),x+9*scale,y+8*scale,tm.widths[j]-18*scale,i===0?tm.headerSize:tm.fs,i===0?'bold':'regular',i===0?C.muted:C.ink);
      if(t.links&&i>0)painter.link(x,y,tm.widths[j],h,Number(t.rows[i-1][1]));
      x+=tm.widths[j];
     });
     painter.line(M,y+h,W-M,y+h,C.border);y+=h;
    });
   }
   painter.line(M,H-42,W-M,H-42,C.border);
   painter.text('MAPA DO GUARDIÃO',M,H-29,270,7.6,'bold',C.muted);
   painter.text(String(index+1).padStart(2,'0')+' / '+pages.length,W-88,H-30,60,8,'regular',C.muted);
  });
 }
 return {draw,W,H};
});
