(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();else root.GuardiaoPdfLayout=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const C={ink:'#453A33',accent:'#A35330',muted:'#75675D',pale:'#EEE4D7',light:'#FBF9F5',border:'#DDD2C4'};
 const W=595.28,H=841.89,M=29,CW=W-2*M;
 function draw(painter,pages){
  pages.forEach((p,index)=>{
   let scale=1;
   function metrics(){
    const size=11*scale, gap=8*scale;
    const titleSize=(index===0?35:26)*scale;
    let y=85+painter.height(p.title,CW,titleSize,'serif')+14;
    const introH=p.intro?painter.height(p.intro,CW,index===0?18*scale:size,index===0?'serif':'regular')+16:0;
    y+=introH;
    const cards=p.blocks.map(b=>{
     const body=[b.body,...b.items.map((s,j)=>`${j+1}. ${s}`)].filter(Boolean).join('\n\n');
     const h=14+painter.height(b.label.toUpperCase(),CW-28,8.2*scale,'bold')+8+(body?painter.height(body,CW-28,size,'regular'):0)+14;
     const out={y,h,body};y+=h+gap;return out;
    });
    let table;
    if(p.table){
     const t=p.table,fs=(t.small?9.1:10.3)*scale;
     const widths=t.widths.map(x=>x*CW);
     const rows=[t.headers,...t.rows];
     const heights=rows.map((row,i)=>Math.max(fs+2,...row.map((v,j)=>painter.height(String(v),widths[j]-16,fs,i===0?'bold':'regular')))+12);
     table={y,widths,heights,fs};y+=heights.reduce((a,b)=>a+b,0);
    }
    return {y,cards,table,size,titleSize};
   }
   let m=metrics();
   while(m.y>H-52&&scale>.86){scale-=.025;m=metrics();}
   if(m.y>H-47)throw new Error('Conteúdo excede o espaço da página '+(index+1)+'.');
   painter.page();
   painter.text((index?String(index).padStart(2,'0')+'   ':'')+p.section.toUpperCase(),M,39,CW,9,'bold',C.accent);
   painter.line(M,66,W-M,66,C.border);
   painter.text(p.title,M,85,CW,m.titleSize,'serif',index===0?C.accent:C.ink);
   let iy=85+painter.height(p.title,CW,m.titleSize,'serif')+14;
   if(p.intro)painter.text(p.intro,M,iy,CW,index===0?18*scale:m.size,index===0?'serif':'regular',C.ink);
   p.blocks.forEach((b,i)=>{
    const {y,h,body}=m.cards[i];
    painter.rect(M,y,CW,h,i%2===0?C.pale:C.light,C.border);
    painter.text(b.label.toUpperCase(),M+14,y+14,CW-28,8.2*scale,'bold',C.muted);
    const by=y+14+painter.height(b.label.toUpperCase(),CW-28,8.2*scale,'bold')+8;
    if(body)painter.text(body,M+14,by,CW-28,m.size,'regular',C.ink);
    if(index===3&&i===p.blocks.length-1)painter.link(M+14,by,CW-28,28,'https://mapado-guardiao.vercel.app/meditacao');
   });
   if(p.table){
    const t=p.table,tm=m.table;let y=tm.y;
    [t.headers,...t.rows].forEach((row,i)=>{
     let x=M;const h=tm.heights[i];
     row.forEach((v,j)=>{
      painter.rect(x,y,tm.widths[j],h,i===0?C.pale:(i%2===0?C.light:'#FFFFFF'),C.border);
      painter.text(String(v),x+8,y+6,tm.widths[j]-16,tm.fs,i===0?'bold':'regular',C.ink);
      if(t.links&&i>0)painter.link(x,y,tm.widths[j],h,Number(t.rows[i-1][1]));
      x+=tm.widths[j];
     });y+=h;
    });
   }
   painter.text('MAPA DO GUARDIÃO · '+(index+1)+' / 20',W-215,H-27,186,8,'regular',C.muted);
  });
 }
 return {draw,W,H};
});
