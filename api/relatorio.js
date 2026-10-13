// Relatório editorial 29 páginas do Campo Guardião, a partir do mapa JÁ SALVO.
// Este endpoint não chama Anthropic e jamais cria um segundo mapa.
const PDFDocument = require('pdfkit');
const { URL } = require('node:url');
const W = 841.89, H = 595.28;
const HEX={dark:'#2C1A17',ink:'#35241E',muted:'#75665E',orange:'#F04A12',burnt:'#A94324',ivory:'#F7F1E9',paper:'#FFFCF7',sand:'#E6DBCE',light:'#F0E7DD',line:'#D7C9BA',white:'#FFFFFF'};
const G={apr:'Aprovação',ctl:'Controle',per:'Perfeccionismo',inv:'Invisibilidade',car:'Sobrecarga',dis:'Distância',adi:'Adiamento',prv:'Prova'};
const P={exp:'Expressão',rec:'Recebimento',exs:'Expansão',lid:'Liderança',amo:'Amor',prz:'Prazer',aut:'Autonomia',cri:'Criatividade',psp:'Prosperidade',pre:'Presença',cnf:'Confiança',prp:'Propósito'};
const F={rej:'Rejeição',aba:'Abandono',hum:'Humilhação',tra:'Traição',inj:'Injustiça'};
const L={lvi:'Vendo',lau:'Ouvindo',lpr:'Fazendo',lle:'Lendo e organizando',lco:'Conversando'};
const M={msv:'Atendendo pessoas',mco:'Ensinando e produzindo conteúdo',mve:'Vendendo e negociando',mlh:'Liderando e empreendendo',mes:'Organizando e dando segurança',mcr:'Criando com as próprias mãos'};
const PIC={
  portrait:'https://images.unsplash.com/photo-1649619339447-e199dded19ee?w=1100&q=75',
  horizon:'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=75',
  forest:'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=75',
  earth:'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&q=75',
  sea:'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1200&q=75',
  journey:'https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1200&q=75',
  person:'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=1100&q=75'
};
function plain(v){return String(v==null?'':v).replace(/<[^>]*>/g,'').replace(/[^\S\n]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();}
function short(v,max){const s=plain(v);return s.length>max?s.slice(0,max-1).replace(/\s+\S*$/,'')+'…':s;}
function first(v){return plain(v).split(/\n\s*\n/)[0]||'';}
function arr(v){return Array.isArray(v)?v:[];}
function path(o,k){return k.split('.').reduce((a,b)=>a?.[b],o);}
function css(doc,col){doc.fillColor(HEX[col]||col);}
function box(doc,x,y,w,h,color='paper',radius=10,stroke='line'){
  doc.roundedRect(x,y,w,h,radius).fillAndStroke(HEX[color]||color,HEX[stroke]||stroke);
}
function text(doc,s,x,y,w,sz=11,col='ink',bold=false,opts={}){
  doc.fillColor(HEX[col]||col).font(bold?'Helvetica-Bold':'Helvetica').fontSize(sz)
    .text(plain(s),x,y,{width:w,breakLine:false,...opts});
}
function sub(doc,label,x,y,w,col='orange'){
  text(doc,label.toLocaleUpperCase('pt-BR'),x,y,w,8.4,col,true,{characterSpacing:1});
}
function photo(doc,images,id,x,y,w,h){
  const data=images[id];
  if(data){try{doc.save();doc.rect(x,y,w,h).clip();doc.image(data,x,y,{cover:[w,h]});doc.restore();return;}catch(_){try{doc.restore();}catch(_2){}}}
  // Deterministic vector fallback if the licensed photograph CDN is unavailable.
  doc.save();doc.rect(x,y,w,h).fill(HEX.dark);
  for(let j=0;j<14;j++){
    doc.strokeColor(j%2?HEX.burnt:HEX.sand).opacity(.17).lineWidth(.8)
      .circle(x+w*(j%7)/6,y+h*(Math.floor(j/7)+1)/3,15+j*5).stroke();
  }
  doc.opacity(1).restore();
}
function base(doc,n,title,section='LEITURA PERSONALIZADA'){
  doc.addPage({size:'A4',layout:'landscape',margin:0});
  doc.rect(0,0,W,H).fill(HEX.ivory);doc.rect(0,0,W,6).fill(HEX.orange);
  sub(doc,'CAMPO GUARDIÃO / '+section,41,27,600);
  text(doc,'MAPA DO GUARDIÃO  /  '+String(n).padStart(2,'0'),660,30,147,8,'muted',true,{align:'right'});
  doc.moveTo(39,56).lineTo(803,56).strokeColor(HEX.line).stroke();
  if(title)doc.font('Times-Bold').fontSize(31).fillColor(HEX.dark).text(title,39,83,{width:766,height:68});
  doc.moveTo(39,547).lineTo(803,547).strokeColor(HEX.line).stroke();
  sub(doc,'RECONHECER · HONRAR · ATUALIZAR',42,557,380,'muted');
  text(doc,String(n).padStart(2,'0')+' / 29',735,557,65,9,'muted',true,{align:'right'});
}
const leftovers=[];
function card(doc,label,value,x,y,w,h,opts={}){
  const fg=opts.dark?'ivory':'ink';
  box(doc,x,y,w,h,opts.dark?'dark':'paper',9,opts.dark?'dark':'line');
  const compact = Boolean(label && h < 83);
  if(label)sub(doc,label,x+14,y+(compact?9:13),w-28,opts.dark?'sand':'orange');
  const top=y+(label?(compact?26:39):15), bottom=y+h-(compact?7:13), width=w-28;
  if (bottom - top < 10) throw new Error('PDF card layout too small: ' + label);
  let val=plain(value);
  if(!val)val='Não informado nesta leitura.';
  const font=opts.font||10.2;let size=font;
  doc.font('Helvetica').fontSize(size);
  while(size>=8.1 && doc.heightOfString(val,{width,lineGap:2})>bottom-top){size-=.35;doc.fontSize(size);}
  let display=val;
  if(doc.heightOfString(val,{width,lineGap:2})>bottom-top){
    // Never silently truncate client content: full source is included in appended pages.
    const prefix=(label||'LEITURA')+' — página '+currentPage;
    leftovers.push({label:prefix,full:val});
    const words=val.split(/\s+/); let lo=0,hi=words.length;
    while(lo<hi){
      const mid=Math.ceil((lo+hi)/2);
      const trial=words.slice(0,mid).join(' ')+'\n\n[Texto integral no anexo]';
      if(doc.heightOfString(trial,{width,lineGap:2})<=bottom-top){lo=mid;}else hi=mid-1;
    }
    display=words.slice(0,Math.max(0,lo)).join(' ')+'\n\n[Texto integral no anexo]';size=8.6;
  }
  doc.fillColor(HEX[fg]).font('Helvetica').fontSize(size)
    .text(display,x+14,top,{width,height:bottom-top,lineGap:2,ellipsis:false});
}
let currentPage=0;
function page(doc,n,title,section){currentPage=n;base(doc,n,title,section);}
function scores(doc,group,labels,values,x,y,w,maxRows=12){
  const pairs=Object.entries(labels).map(([key,label])=>({key,label,score:Number(values?.[key])||0}));
  pairs.sort((a,b)=>b.score-a.score);
  const max=Math.max(1,...pairs.map(z=>z.score));
  const rows=pairs.slice(0,maxRows), dy=Math.min(31,308/rows.length);
  rows.forEach((p,i)=>{
    const yy=y+i*dy, score=Math.round(p.score/max*100);
    text(doc,p.label,x,yy,w-46,9.1,'ink',true);text(doc,score+'%',x+w-44,yy,44,9,'orange',true,{align:'right'});
    doc.roundedRect(x,yy+18,w,5,2).fill(HEX.light);
    if(score>0) doc.roundedRect(x,yy+18,Math.max(2,w*score/100),5,2).fill(HEX.orange);
  });
}
function panelPhoto(doc,images,key,x,y,w,h){photo(doc,images,key,x,y,w,h);}
function collage(doc,images,heading,subline){
  panelPhoto(doc,images,'portrait',0,0,W/2,320);
  panelPhoto(doc,images,'person',W/2,0,W/2,320);
  doc.rect(0,0,W,320).fillOpacity(.43).fill(HEX.dark).fillOpacity(1);
  text(doc,heading,45,115,740,61,'white',true);
  doc.font('Times-Bold').fontSize(68).fillColor(HEX.white).text(heading,42,104,{width:750});
  text(doc,subline,46,205,715,14,'ivory');
}
function divider(doc,images,n,key,chapter,title,subtitle){
  page(doc,n,'',chapter);panelPhoto(doc,images,key,0,0,288,H);
  doc.rect(288,0,10,H).fill(HEX.orange);
  doc.rect(299,0,W-299,H).fill(HEX.paper);
  sub(doc,'CAMPO GUARDIÃO / '+chapter,332,75,430);
  doc.moveTo(332,117).lineTo(778,117).strokeColor(HEX.line).stroke();
  doc.font('Helvetica-Bold').fontSize(49).fillColor(HEX.dark).text(title,329,164,{width:454});
  doc.font('Times-Italic').fontSize(19).fillColor(HEX.burnt).text(subtitle,333,403,{width:420});
  text(doc,n+' / 29',737,547,65,9,'muted',true,{align:'right'});
}
function listText(xs){return arr(xs).map((x,i)=>String(i+1)+'. '+plain(typeof x==='object'?(x.titulo?x.titulo+': ':'')+(x.texto||''):x)).join('\n\n');}
function nameRank(scores,rank,dictionary,idx){
  const k=arr(rank)[idx];return k && Number(scores?.[k])>0 ? dictionary[k]||'':'';
}
function fmtDate(s){try{return new Date(s).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'});}catch(_){return '';}}
function ageAt(b,when){if(!b||!/^\d{4}-\d\d-\d\d/.test(b))return null;const d=new Date(when),y=d.getUTCFullYear(),m=d.getUTCMonth()+1,day=d.getUTCDate();const bs=b.split('-').map(Number);return y-bs[0]-(m<bs[1]||(m===bs[1]&&day<bs[2])?1:0);}
async function photos(){
  const entries=Object.entries(PIC);
  const results=await Promise.all(entries.map(async ([k,u])=>{
    try{
      const r=await fetch(u,{signal:AbortSignal.timeout(2500),headers:{'User-Agent':'CampoGuardiaoPdf/1.0'}});
      if(!r.ok) return [k,null];
      const b=Buffer.from(await r.arrayBuffer());
      if(b.length>2_500_000 || !b.length)return [k,null];
      return [k,b];
    }catch(_){return [k,null];}
  }));
  return Object.fromEntries(results);
}
function appended(doc){
  for(const item of leftovers){
    let rest=item.full,seq=0;
    while(rest){
      seq+=1;doc.addPage({size:'A4',layout:'landscape',margin:0});
      doc.rect(0,0,W,H).fill(HEX.paper);doc.rect(0,0,W,6).fill(HEX.orange);
      sub(doc,'COMPLEMENTO DE LEITURA / TEXTO INTEGRAL',46,32,700);
      doc.font('Times-Bold').fontSize(25).fillColor(HEX.dark).text(item.label+(seq>1?' (continuação)':''),45,80,{width:742,height:65});
      doc.font('Helvetica').fontSize(12).fillColor(HEX.ink);
      const words=rest.split(/\s+/);let low=0,high=words.length,fit=0;
      while(low<=high){
        const mid=Math.floor((low+high)/2);
        if(doc.heightOfString(words.slice(0,mid).join(' '),{width:745,lineGap:4})<=385){fit=mid;low=mid+1;}else high=mid-1;
      }
      if(fit<1)fit=Math.min(60,words.length);
      const chunk=words.slice(0,fit).join(' ');
      doc.text(chunk,47,151,{width:744,lineGap:4,height:389});
      rest=words.slice(fit).join(' ');
      doc.moveTo(45,550).lineTo(798,550).strokeColor(HEX.line).stroke();
      text(doc,'CAMPO GUARDIÃO · COMPLEMENTO',46,560,705,8,'muted',true);
    }
  }
}
async function renderReport(m,p){
  const r=m.resultado||{}, s=m.scores||{}, pf=p||{}, g=s.g||{},w=s.w||{},pot=s.p||{},learn=s.l||{},work=s.m||{};
  const primaryG=m.guardiao||nameRank(g,s.rg,G,0)||'Guardião de proteção';
  const secondaryG=nameRank(g,s.rg,G,1);
  const primaryF=m.ferida||nameRank(w,s.rw,F,0)||'Não informada';
  const secondaryF=nameRank(w,s.rw,F,1);
  const primaryP=m.potencial||nameRank(pot,s.rp,P,0)||'Potencial guardado';
  const secondaryP=nameRank(pot,s.rp,P,1);
  const firstLearn=nameRank(learn,s.rl,L,0);
  const secondLearn=nameRank(learn,s.rl,L,1);
  const firstWork=nameRank(work,s.rm,M,0);
  const secondWork=nameRank(work,s.rm,M,1);
  const nome=pf.nome||'Pessoa participante',objetivo=pf.objetivo||'Não informado',data=fmtDate(m.created_at);
  const idade=ageAt(pf.nascimento,m.created_at);
  const area=r.areas||{},guard=r.guardiao||{},fer=r.ferida||{},power=r.potencial||{},money=r.dinheiro||{},ano=r.ano||{},pl=r.plano||{},obj=r.objetivo||{},com=r.comportamento||{};
  leftovers.length=0;
  const images=await photos();
  const doc=new PDFDocument({autoFirstPage:false,size:'A4',layout:'landscape',margin:0,compress:true,info:{Title:'Mapa do Guardião - '+nome,Author:'Campo Guardião',Subject:'Leitura individual e reflexiva'}});
  const pieces=[];doc.on('data',chunk=>pieces.push(chunk));
  const done=new Promise((resolve,reject)=>{doc.on('end',()=>resolve(Buffer.concat(pieces)));doc.on('error',reject);});
  // 1 — capa fotográfica
  doc.addPage({size:'A4',layout:'landscape',margin:0});currentPage=1;
  panelPhoto(doc,images,'portrait',0,0,W/2,315);panelPhoto(doc,images,'person',W/2,0,W/2,315);
  doc.rect(0,0,W,315).fillOpacity(.45).fill(HEX.dark).fillOpacity(1);
  doc.font('Helvetica-Bold').fontSize(62).fillColor(HEX.white).text('MAPA DO',42,88,{width:750});
  doc.font('Helvetica-Bold').fontSize(74).fillColor(HEX.white).text('GUARDIÃO',39,165,{width:760});
  doc.rect(0,315,W,280).fill(HEX.paper);
  sub(doc,'O SEU LUGAR DE POTÊNCIA',51,348,595);
  doc.font('Times-Italic').fontSize(35).fillColor(HEX.dark).text('Onde a sua energia rende mais e custa menos.',48,381,{width:670,height:95});
  text(doc,nome,51,493,666,14,'ink',true);text(doc,'Leitura de '+data+'  ·  Método Campo Guardião',51,516,670,10,'muted');
  // 2 — abertura
  page(doc,2,'Este mapa foi feito para você','ABERTURA');
  panelPhoto(doc,images,'horizon',43,175,372,325);
  card(doc,'SUA CARTA DE ABERTURA',r.abertura,434,175,361,328,{font:10.5});
  // 3 — sumário
  page(doc,3,'Seu caminho pelas próximas páginas','SUMÁRIO');
  const contents=[['01–04','Abertura e método'],['05–07','Visão geral e resultados'],['08–10','Seu Guardião'],['11–13','Sua ferida e defesas'],['14–16','Seu lugar de potência'],['17–21','Trabalho e áreas da vida'],['22–24','Ciclos, aprendizagem e objetivo'],['25–29','Orientações, práticas e síntese']];
  contents.forEach((it,i)=>{const row=Math.floor(i/2),col=i%2,x=45+col*385,y=173+row*86;box(doc,x,y,367,72,'paper');text(doc,it[0],x+16,y+14,88,16,'orange',true);text(doc,it[1],x+104,y+18,245,13,'dark',true);});
  // 4 — método
  page(doc,4,'Como ler o seu mapa','O MÉTODO');
  [['RECONHECER','Observe a proteção que aparece antes da escolha.'],['HONRAR','Entenda qual necessidade essa proteção tentou cuidar.'],['ATUALIZAR','Experimente uma resposta possível para o presente.']].forEach((a,i)=>{const x=42+i*266;box(doc,x,202,250,236,'paper');sub(doc,String(i+1).padStart(2,'0'),x+20,221,92);doc.font('Times-Bold').fontSize(23).fillColor(HEX.dark).text(a[0],x+19,271,{width:215});text(doc,a[1],x+19,324,210,13,'ink');});
  text(doc,'Este material é uma lente simbólica de reflexão, não um diagnóstico ou previsão.',48,469,750,11,'muted');
  // 5 — overview
  page(doc,5,'Um retrato do seu momento','VISÃO GERAL');
  panelPhoto(doc,images,'horizon',43,171,285,330);
  card(doc,'SEU GUARDIÃO',primaryG,345,171,448,96,{font:18});
  card(doc,'SUA FERIDA',primaryF,345,276,448,96,{font:18});
  card(doc,'LUGAR DE POTÊNCIA',money.lugar_de_poder||'A força de uma escolha coerente',345,381,448,120,{font:15});
  // 6 — rankings 1
  page(doc,6,'Seus resultados: proteção e potência','RESULTADOS DO TESTE');
  sub(doc,'GUARDIÕES',55,158,350);sub(doc,'POTENCIAIS GUARDADOS',433,158,360);
  scores(doc,'guardioes',G,g,55,198,325,8);scores(doc,'potenciais',P,pot,433,198,340,12);
  text(doc,'As barras mostram afinidades dentro do teste, não probabilidades ou diagnósticos.',55,510,715,9,'muted');
  // 7 — rankings 2
  page(doc,7,'Resultados: feridas, aprendizagem e trabalho','RESULTADOS DO TESTE');
  sub(doc,'FERIDAS',53,164,240);sub(doc,'COMO VOCÊ APRENDE',304,164,235);sub(doc,'PREFERÊNCIAS DE TRABALHO',552,164,246);
  scores(doc,'feridas',F,w,52,209,222,5);scores(doc,'aprendizagem',L,learn,303,209,222,5);scores(doc,'trabalho',M,work,552,209,230,6);
  text(doc,'Um resultado de 0% não autoriza indicar uma segunda preferência.',52,483,725,10,'muted');
  // 8 divider
  divider(doc,images,8,'forest','RECONHECER','SEU GUARDIÃO','A parte de você que chega antes.');
  // 9 guard
  page(doc,9,'Sua proteção principal','O GUARDIÃO');
  card(doc,'GUARDIÃO PRINCIPAL',primaryG,45,165,242,92,{font:16});
  card(doc,'GUARDIÃO SECUNDÁRIO',secondaryG||'Sem segundo resultado acima de zero',45,266,242,96,{font:12});
  card(doc,'COMO ELE REFORÇA O PRIMEIRO',secondaryG?'O padrão '+secondaryG+' pode intensificar a proteção do '+primaryG+'.':'Não há segundo padrão acima de zero no teste.',45,374,242,127,{font:10});
  card(doc,'INTERPRETAÇÃO DO GUARDIÃO',guard.leitura,302,165,491,210);
  card(doc,'O QUE ESSA PROTEÇÃO ENTREGA',guard.beneficio,302,387,491,114);
  // 10 cenas e custos
  page(doc,10,'Como a proteção aparece no cotidiano','RECONHECER');
  arr(guard.cenas).slice(0,3).forEach((v,i)=>card(doc,v.titulo||'CENA '+(i+1),v.texto||v,41+i*264,163,252,182,{font:10}));
  card(doc,'O QUE AJUDA A PRESERVAR',guard.beneficio,42,356,367,146);
  card(doc,'O PREÇO DESSA PROTEÇÃO',guard.preco,425,356,367,146);
  // 11
  divider(doc,images,11,'portrait','HONRAR','SUA FERIDA','A sensibilidade que pede escuta.');
  // 12
  page(doc,12,'A sensibilidade por trás do padrão','FERIDA');
  panelPhoto(doc,images,'earth',39,167,326,157);
  card(doc,'O QUE É ESTA FERIDA',r.intro_ferida,39,338,326,165,{font:10});
  card(doc,'FERIDA PRINCIPAL',primaryF,380,167,414,75,{font:17});
  card(doc,'FERIDA SECUNDÁRIA',secondaryF||'Sem resultado secundário acima de zero',380,251,414,75);
  card(doc,'LEITURA DA FERIDA',fer.leitura,380,335,414,168);
  // 13
  page(doc,13,'A função da proteção','MECANISMO');
  card(doc,'O QUE A CRIANÇA PODE TER PRECISADO',fer.crianca_precisou,42,169,371,311);
  card(doc,'COMO APRENDEU A SE DEFENDER',fer.jeito_de_se_defender,428,169,367,311);
  // 14
  divider(doc,images,14,'horizon','ATUALIZAR','SEU POTENCIAL','Aquilo que pode voltar ao seu uso.');
  // 15
  page(doc,15,'O recurso que ficou guardado','POTÊNCIA');
  panelPhoto(doc,images,'earth',44,168,360,227);
  card(doc,'PRIMEIRO GESTO PARA ATUALIZAR',power.primeiro_gesto,44,407,360,94,{font:9.6});
  card(doc,'POTENCIAL PRINCIPAL',primaryP,420,168,373,78,{font:15});
  card(doc,'POTENCIAL SECUNDÁRIO',secondaryP||'Sem segundo resultado acima de zero',420,255,373,77);
  card(doc,'COMO ESSA POTÊNCIA SE EXPRESSA',power.leitura,420,342,373,103);
  card(doc,'QUANDO A PROTEÇÃO RELAXA',power.quando_livre,420,454,373,47,{font:9.1});
  // 16
  page(doc,16,'O cruzamento do seu campo','LEITURA INTEGRADA');
  card(doc,'GUARDIÃO + FERIDA + POTÊNCIA',r.cruzamento,41,168,372,336,{font:10.5});
  card(doc,'UMA POSSIBILIDADE NOVA',r.integrada,428,168,365,336,{font:10.3});
  // 17
  page(doc,17,'Trabalho e expressão','APLICAÇÃO NA VIDA');
  panelPhoto(doc,images,'person',40,167,272,332);
  card(doc,'COMO APARECE NO TRABALHO',area.trabalho?.texto,329,167,464,208);
  card(doc,'UM GESTO PRÁTICO',area.trabalho?.gesto,329,387,464,114);
  // 18
  page(doc,18,'Dinheiro sem perder a sua medida','APLICAÇÃO NA VIDA');
  card(doc,'RELAÇÃO COM O DINHEIRO',money.leitura,42,166,367,169);
  card(doc,'A ARMADILHA',money.armadilha,425,166,368,169);
  card(doc,'FORMAS POSSÍVEIS DE TRABALHAR',listText(money.formas),42,349,367,153,{font:9.5});
  card(doc,'PRIMEIRO MOVIMENTO',money.primeiro_passo,425,349,368,153);
  // 19
  page(doc,19,'Relacionamentos e vínculos','APLICAÇÃO NA VIDA');
  panelPhoto(doc,images,'portrait',45,166,295,332);
  card(doc,'O PADRÃO NAS RELAÇÕES',area.relacionamentos?.texto,356,166,437,209);
  card(doc,'UM GESTO CONCRETO',area.relacionamentos?.gesto,356,387,437,113);
  // 20
  page(doc,20,'Saúde, corpo e ritmo','AUTOCUIDADO');
  panelPhoto(doc,images,'sea',40,167,365,332);
  card(doc,'CUIDADO E ROTINA',area.saude?.texto,423,167,371,204);
  card(doc,'UM PEQUENO CUIDADO POSSÍVEL',area.saude?.gesto,423,385,371,116);
  // 21
  page(doc,21,'Espiritualidade e sentido','CONEXÃO');
  panelPhoto(doc,images,'forest',39,165,288,335);
  card(doc,'O QUE IMPORTA PARA VOCÊ',area.espiritualidade?.texto,343,166,451,212);
  card(doc,'UMA PRÁTICA DE PRESENÇA',area.espiritualidade?.gesto,343,390,451,111);
  // 22
  page(doc,22,'Seu momento de vida','CICLOS');
  card(doc,'IDADE NA DATA DA LEITURA',idade===null?'Não informada':idade+' anos',43,166,160,87,{font:17});
  card(doc,'FASE DA VIDA',idade===null?'Não informada':'Um tempo de reconhecer o que precisa de nova organização.',216,166,273,87);
  card(doc,'TEMA DO ANO',ano.energia,502,166,291,87);
  card(doc,'O QUE O MOMENTO PEDE',ano.leitura,43,266,237,237);
  card(doc,'O QUE O ANO FAVORECE',listText(ano.favorece),294,266,237,237);
  card(doc,'ONDE PEDE CUIDADO',listText(ano.cuidado),545,266,248,237);
  // 23
  page(doc,23,'Seu jeito de aprender','APRENDIZAGEM');
  card(doc,'PREFERÊNCIA PRINCIPAL',firstLearn||'Não informada',43,168,269,83,{font:17});
  card(doc,'PREFERÊNCIA DE APOIO',secondLearn||'Sem segunda modalidade com resultado',43,262,269,83);
  card(doc,'COMO VOCÊ APRENDE',ano.aprende?.leitura,327,168,466,181);
  arr(ano.aprende?.dicas).slice(0,3).forEach((d,i)=>card(doc,'DICA '+(i+1),d,327,361+i*48,466,43,{font:9}));
  // 24
  page(doc,24,'A pergunta que trouxe você aqui','SEU OBJETIVO');
  card(doc,'O QUE VOCÊ ESCREVEU',objetivo,43,166,751,79,{dark:true,font:14});
  card(doc,'A RESPOSTA DO MAPA',obj.leitura,43,259,471,244);
  card(doc,'SEU PRÓXIMO PASSO',obj.proximo_passo,526,259,268,244);
  // 25
  page(doc,25,'Os quatro pontos a trabalhar','RECONHECER');
  arr(r.trabalhar).slice(0,4).forEach((it,i)=>{
    const col=i%2, row=Math.floor(i/2);
    card(doc,'PONTO '+(i+1)+' — '+(it.titulo||'A trabalhar'),it.texto,42+col*384,166+row*171,368,160);
  });
  // 26
  page(doc,26,'Honrar sem repetir o padrão','HONRAR');
  card(doc,'O QUE MERECE ACOLHIMENTO',fer.crianca_precisou,42,166,365,122);
  card(doc,'O QUE FAZER',listText(com.fazer),420,166,373,122,{font:9.5});
  card(doc,'O QUE EVITAR',listText(com.evitar),42,301,365,201);
  card(doc,'CONVERSA COM O GUARDIÃO',r.conversa,420,301,373,201);
  // 27
  page(doc,27,'Atualizar com um passo possível','ATUALIZAR');
  card(doc,'DECISÃO NAS PRÓXIMAS 72 HORAS',pl.h72,43,169,360,330);
  card(doc,'CINCO MINUTOS POR DIA',pl.min5,417,169,377,330);
  // 28
  page(doc,28,'Sete dias para experimentar','PLANO DE AÇÃO');
  arr(pl.dias).slice(0,7).forEach((item,i)=>{
    const col=i%4,row=Math.floor(i/4);
    card(doc,'DIA '+(i+1),item,40+col*193,171+row*166,180,156,{font:9.7});
  });
  panelPhoto(doc,images,'journey',40+3*193,337,180,156);
  // 29
  page(doc,29,'Seu lugar não pede que você desapareça para caber','ENCERRAMENTO');
  panelPhoto(doc,images,'horizon',434,158,358,341);
  card(doc,'FRASE DE ATUALIZAÇÃO',r.frase_nova,41,187,379,138,{font:17});
  card(doc,'UMA PERGUNTA PARA LEVAR',r.pergunta,41,341,379,158,{font:12});
  appended(doc);
  doc.end();
  return done;
}
module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  if(req.method!=='GET')return res.status(405).json({erro:'Método não permitido.'});
  const url=new URL(req.url,'https://mapado-guardiao.vercel.app');
  const id=url.searchParams.get('id')||'';
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id))return res.status(400).json({erro:'Mapa inválido.'});
  const jwt=/^Bearer\s+(.+)$/i.exec(req.headers.authorization||'')?.[1];
  if(!jwt||jwt.length>4096)return res.status(401).json({erro:'Entre na sua conta para baixar o PDF.'});
  const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_ANON_KEY;
  if(!base||!key)return res.status(503).json({erro:'Serviço temporariamente indisponível.'});
  const headers={apikey:key,Authorization:'Bearer '+jwt};
  try{
    const [auth,ent,record]=await Promise.all([
      fetch(base+'/auth/v1/user',{headers,signal:AbortSignal.timeout(9000)}),
      fetch(base+'/rest/v1/rpc/tem_acesso_guardiao',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(9000)}),
      fetch(base+'/rest/v1/mapas?id=eq.'+encodeURIComponent(id)+'&select=*',{headers,signal:AbortSignal.timeout(9000)})
    ]);
    if(!auth.ok)return res.status(401).json({erro:'Sua sessão expirou. Entre novamente.'});
    if(!ent.ok)return res.status(503).json({erro:'Falha na verificação do acesso.'});
    if(await ent.json()!==true)return res.status(403).json({erro:'Este acesso não está ativo.'});
    if(!record.ok)return res.status(503).json({erro:'Falha ao consultar o mapa salvo.'});
    const maps=await record.json();const m=maps?.[0];
    if(!m)return res.status(404).json({erro:'Mapa não encontrado para esta conta.'});
    const profile=await fetch(base+'/rest/v1/perfis?id=eq.'+encodeURIComponent(m.user_id)+'&select=*',{headers,signal:AbortSignal.timeout(9000)});
    const profiles=profile.ok?await profile.json():[];
    const pdf=await renderReport(m,profiles?.[0]||{});
    const filename='Mapa_do_Guardiao_'+String(profiles?.[0]?.nome||'Meu_Mapa').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_-]+/g,'_').slice(0,60)+'.pdf';
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition','attachment; filename="'+filename+'"');
    res.setHeader('Content-Length',pdf.length);
    return res.status(200).end(pdf);
  }catch(e){
    console.error('Relatorio PDF',e?.name||'unknown');
    return res.status(503).json({erro:'O PDF não pôde ser montado agora. Seu mapa está salvo; tente novamente.'});
  }
};
