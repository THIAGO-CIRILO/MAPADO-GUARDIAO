'use strict';
const PDFDocument=require('pdfkit');
const path=require('node:path');
const {paginas}=require('../consulta-modelo.js');
const {draw}=require('../consulta-pdf-layout.js');
async function renderConsulta(map,profile){
 const pages=paginas(map,profile);
 const doc=new PDFDocument({autoFirstPage:false,bufferPages:true,margin:0,info:{Title:'Mapa do Guardião · Consulta rápida',Author:'Thiago Cervi'}});
 doc.registerFont('regular',path.join(__dirname,'../assets/fonts/Figtree-Regular.ttf'));
 doc.registerFont('bold',path.join(__dirname,'../assets/fonts/Figtree-Bold.ttf'));
 doc.registerFont('serif',path.join(__dirname,'../assets/fonts/InstrumentSerif-Regular.ttf'));
 const chunks=[];
 const done=new Promise((resolve,reject)=>{doc.on('data',x=>chunks.push(x));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
 const links=[];
 const painter={
  page:()=>doc.addPage({size:'A4',margin:0}),
  height:(t,w,s,f)=>doc.font(f).fontSize(s).heightOfString(t,{width:w,lineGap:2}),
  text:(t,x,y,w,s,f,c)=>doc.font(f).fontSize(s).fillColor(c).text(t,x,y,{width:w,lineGap:2}),
  line:(x,y,xx,yy,c)=>doc.moveTo(x,y).lineTo(xx,yy).strokeColor(c).lineWidth(.6).stroke(),
  rect:(x,y,w,h,c,b,r=0)=>{const shape=r?doc.roundedRect(x,y,w,h,r):doc.rect(x,y,w,h);return b?shape.lineWidth(.6).fillAndStroke(c,b):shape.fill(c);},
  link:(x,y,w,h,target)=>links.push({page:doc.bufferedPageRange().count-1,x,y,w,h,target})
 };
 draw(painter,pages);
 for(const l of links){doc.switchToPage(l.page);if(typeof l.target==='number')doc.goTo(l.x,l.y,l.w,l.h,'pagina'+l.target);else doc.link(l.x,l.y,l.w,l.h,l.target);}
 for(let i=0;i<20;i++){doc.switchToPage(i);doc.addNamedDestination('pagina'+(i+1),'Fit');}
 doc.end();return done;
}
module.exports={renderConsulta};
