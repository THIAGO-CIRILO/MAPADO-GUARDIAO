(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./consulta-estacoes.js'),require('./consulta-modelo.js').meditacao);
 else root.GuardiaoPdfLayout=factory(root.GuardiaoEstacoes,root.GuardiaoConsulta.meditacao);
})(typeof globalThis!=='undefined'?globalThis:this,function(Estacoes,meditacao){
 'use strict';

 const C={
  ink:'#3A2C26',accent:'#A35330',muted:'#625045',sand:'#F0E4D6',
  light:'#FBF8F2',border:'#DDCEC0',paper:'#FFFCF7',white:'#FFFFFF'
 };
 const W=595.28,H=841.89,M=37,CW=W-2*M;

 function measureCard(painter,b,width,scale){
  const season=Estacoes.obter(b.estacao);
  const month=b.kind==='mes';
  const step=b.kind==='step';
  const area=b.kind==='area';
  const pad=(month||step||area||b.original?10:13)*scale;
  const usable=width-2*pad;
  const accent=season?.accent||C.accent;
  const content=[];
  let y=pad;

  function add(value,size,font='regular',color=C.ink,space=0,x=0,w=usable-x){
   if(!value)return;
   y+=space*scale;
   const fontSize=size*scale;
   content.push({value,x,y,w,fontSize,font,color});
   y+=painter.height(value,w,fontSize,font);
  }

  if(b.original){
   const left=usable*.41;
   const gap=19*scale;
   const right=left+gap;
   add(b.label.toUpperCase(),8.5,'bold',accent,0,0,left);
   add('“'+b.original+'”',10.1,'regular',C.muted,3,0,left);
   const bottomLeft=y;
   y=pad;
   add('O QUE ISSO AJUDA A ENTENDER',8.5,'bold',accent,0,right);
   add(b.body,10.6,'regular',C.ink,3,right);
   y=Math.max(y,bottomLeft);
  }else if(step){
   const offset=54*scale;
   add(b.label.toUpperCase(),8.5,'bold',accent,0,0,offset-5*scale);
   y=pad;
   add(b.body,11.25,'regular',C.ink,0,offset);
  }else{
   if(b.eyebrow)add(b.eyebrow.toUpperCase(),8.5,'bold',accent);
   if(season&&!month)add(season.nome.toUpperCase()+' · '+season.verbo,8.5,'bold',accent);
   const headline=b.kind==='potencia'||b.kind==='estacao'||b.kind==='area'||b.kind==='headline';
   const labelSize=headline?(b.kind==='area'?21.5:25):month?10:8.8;
   const label=(headline||month)?b.label:b.label.toUpperCase();
   add(label,labelSize,headline?'serif':'bold',headline?C.ink:accent,
    content.length?4:0,0,season&&month?usable-69*scale:usable);
   add(b.body,month?19.4:area?10.8:11.35,month?'serif':'regular',C.ink,month?4:5);
   for(const f of b.fields||[]){
    add(f.label.toUpperCase(),month?8:8.45,'bold',accent,month?4:7);
    add(f.text,month?10:area?10.65:11.1,'regular',C.ink,month?1:2);
   }
   if(b.promise){
    add(b.promise.inicio,10,'regular',C.muted,9);
    add(b.promise.destaque,12,'bold',accent,1);
   }
  }

  const fill=season?.fundo||(b.tone==='soft'?C.sand:step?C.white:C.light);
  const border=season?.borda||C.border;
  return {
   height:y+pad,
   draw(x,top,height){
    painter.rect(x,top,width,height,fill,border,5);
    if(season)painter.rect(x+1.5,top+7*scale,2.8,height-14*scale,accent,null,1);
    if(season&&month){
     const chip=64*scale,chipX=x+width-pad-chip;
     painter.rect(chipX,top+pad-1.4*scale,chip,15*scale,accent,null,4);
     painter.text(season.nome.toUpperCase(),chipX+5*scale,top+pad+1.2*scale,
      chip-10*scale,7.6*scale,'bold',C.white);
    }
    if(b.original){
     const divider=x+pad+usable*.41+9.5*scale;
     painter.rect(divider,top+pad,.55,height-2*pad,C.border);
    }
    for(const line of content)painter.text(line.value,x+pad+line.x,top+line.y,
     line.w,line.fontSize,line.font,line.color);
   }
  };
 }

 function measurePage(painter,page,scale){
  const accent=Estacoes.obter(page.estacao)?.accent||C.accent;
  const parts=[];
  const drawText=(value,size,font='regular',color=C.ink,gap=0)=>{
   if(!value)return;
   y+=gap*scale;
   const sizeOnPage=size*scale,top=y;
   parts.push(()=>painter.text(value,M,top,CW,sizeOnPage,font,color));
   y+=painter.height(value,CW,sizeOnPage,font);
  };
  let y=63;
  drawText(page.section.toUpperCase(),9.2,'bold',accent);
  drawText(page.title,page.cover?44:35,'serif',C.ink,8);
  drawText(page.intro,11.9,'regular',C.muted,6);
  y+=14*scale;

  if(page.legend){
   const colors=Object.values(Estacoes.paletas);
   const gap=7*scale,width=(CW-3*gap)/4,top=y;
   const captions=colors.map(s=>painter.height(s.verbo,width-14*scale,8*scale,'regular'));
   const height=Math.max(...captions)+24*scale;
   parts.push(()=>colors.forEach((s,i)=>{
    const x=M+i*(width+gap);
    painter.rect(x,top,width,height,s.fundo,s.borda,5);
    painter.text(s.nome,x+7*scale,top+5*scale,width-14*scale,9*scale,'bold',s.accent);
    painter.text(s.verbo,x+7*scale,top+18*scale,width-14*scale,8*scale,'regular',C.ink);
   }));
   y+=height+10*scale;
  }

  function cards(blocks,columns){
   const gap=(page.compact?8:11)*scale;
   const width=(CW-gap)/2;
   let row=[];
   function flush(){
    if(!row.length)return;
    const measured=row.map(b=>measureCard(painter,b,width,scale));
    const top=y,height=Math.max(...measured.map(c=>c.height));
    parts.push(()=>measured.forEach((c,i)=>c.draw(M+i*(width+gap),top,height)));
    y+=height+gap;
    row=[];
   }
   for(const block of blocks){
    if(columns!==2||block.fullWidth){
     flush();
     const box=measureCard(painter,block,CW,scale),top=y;
     parts.push(()=>box.draw(M,top,box.height));
     y+=box.height+gap;
    }else{
     row.push(block);
     if(row.length===2)flush();
    }
   }
   flush();
  }

  cards(page.blocks,page.columns);
  if(page.table){
   const {headers,rows,widths}=page.table;
   const columns=widths.map(value=>value*CW);
   const inset=9*scale;
   for(const [i,row] of [headers,...rows].entries()){
    const size=(i===0?9.1:10.8)*scale;
    const cells=row.map((value,j)=>{
     const font=i===0||j===0?'bold':'regular';
     const width=columns[j]-2*inset;
     return {value,font,width,height:painter.height(value,width,size,font)};
    });
    const height=Math.max(...cells.map(cell=>cell.height))+18*scale;
    const top=y;
    parts.push(()=>{
     painter.rect(M,top,CW,height,i===0?C.sand:i%2===1?C.white:C.light,null,i===0?4:0);
     if(i>0)painter.rect(M+CW-columns.at(-1),top,columns.at(-1),height,'#F6EBDF');
     let x=M;
     cells.forEach((cell,j)=>{
      painter.text(cell.value,x+inset,top+9*scale,cell.width,size,cell.font,i===0?accent:C.ink);
      x+=columns[j];
     });
     painter.line(M,top+height,W-M,top+height,C.border);
    });
    y+=height;
   }
   y+=12*scale;
  }
  cards(page.after||[]);

  if(page.nav){
   drawText('VÁ DIRETO AO PONTO',8.6,'bold',accent,3);
   const gap=7*scale,width=(CW-2*gap)/3,top=y+6*scale;
   const rows=Math.ceil(page.nav.length/3);
   parts.push(()=>page.nav.forEach((item,i)=>{
    const x=M+(i%3)*(width+gap),rowY=top+Math.floor(i/3)*25*scale;
    painter.rect(x,rowY,width,21*scale,C.light,C.border,4);
    painter.text(String(item.page).padStart(2,'0'),x+7*scale,rowY+5*scale,16*scale,8.3*scale,'bold',accent);
    painter.text(item.label,x+26*scale,rowY+5*scale,width-33*scale,8.8*scale,'bold',C.ink);
    painter.link(x,rowY,width,21*scale,item.page);
   }));
   y=top+(rows*25+6)*scale;
  }
  if(page.audio){
   const top=y,h=28*scale;
   parts.push(()=>{
    painter.rect(M,top,CW,h,C.light,C.border,5);
    painter.text('OUVIR A MEDITAÇÃO DE PREPARAÇÃO · 5 MIN',M+12*scale,top+8*scale,
     CW-24*scale,9.2*scale,'bold',accent);
    painter.link(M,top,CW,h,meditacao);
   });
   y+=h+8*scale;
  }
  drawText(page.note,9.4,'regular',C.muted,2);
  return {height:y,accent,parts};
 }

 function draw(painter,pages){
  pages.forEach((p,index)=>{
   let scale=1,m=measurePage(painter,p,scale);
   while(m.height>H-51&&scale>.84){
    scale=Math.max(.84,scale-.025);
    m=measurePage(painter,p,scale);
   }
   if(m.height>H-48)throw new Error('Conteúdo excede o espaço da página '+(index+1)+'.');

   painter.page(p.title);
   painter.rect(0,0,W,H,C.paper);
   painter.rect(0,0,W,5,m.accent);
   painter.text('CAMPO GUARDIÃO',M,29,180,8.4,'bold',C.muted);
   const name=[p.nome,p.exemplo?'Exemplo fictício':'Sua leitura'].filter(Boolean).join(' · ');
   painter.text(name.toUpperCase(),W-M-285,29,285,8.4,'bold',C.muted,'right');
   painter.line(M,49,W-M,49,C.border);
   m.parts.forEach(drawPart=>drawPart());
   painter.line(M,H-42,W-M,H-42,C.border);
   painter.text('MAPA DO GUARDIÃO · THIAGO CERVI',M,H-29,300,8,'bold',C.muted);
   const number=String(index+1).padStart(2,'0')+' / '+pages.length;
   painter.text(number,W-M-60,H-29,60,8.4,'regular',C.muted,'right');
  });
 }
 return {draw,W,H};
});
