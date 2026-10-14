/* Mapa do Guardiao — PDF editorial de 29 paginas, sem chamada à IA.
 * 1 mapa salvo = downloads ilimitados. Dados vêm do resultado e pontuação já salvos.
 * Fotos fixas de apoio: imagens Unsplash; em caso de falha, o design conserva seus blocos.
 */
(function () {
"use strict";
const C={
 dark:[44,26,23], ink:[53,36,30], muted:[116,100,92], orange:[240,74,18],
 orange2:[169,67,36], ivory:[247,241,233], paper:[255,252,247],
 sand:[230,219,206], light:[241,232,222], line:[215,201,186],
 white:[255,255,255], sage:[117,138,127]
};
const PHOTOS={
 faces:"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1000&q=78&fit=crop&fm=jpg",
 intro:"https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1300&q=78&fit=crop&fm=jpg",
 wolf:"https://images.unsplash.com/photo-1511497584788-876760111969?w=1100&q=78&fit=crop&fm=jpg",
 pottery:"https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=1100&q=78&fit=crop&fm=jpg",
 light:"https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1200&q=78&fit=crop&fm=jpg",
 forest:"https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1100&q=78&fit=crop&fm=jpg",
 water:"https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1100&q=78&fit=crop&fm=jpg",
 stars:"https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1100&q=78&fit=crop&fm=jpg",
 trail:"https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1100&q=78&fit=crop&fm=jpg",
 mountain:"https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1100&q=78&fit=crop&fm=jpg",
 leaves:"https://images.unsplash.com/photo-1497436072909-60f362e1d4b1?w=1100&q=78&fit=crop&fm=jpg"
};
const imgs={};
const loadImage=(key)=>new Promise(resolve=>{
 const im=new Image(); im.crossOrigin="anonymous";let done=false;
 const end=v=>{if(done)return;done=true;clearTimeout(timer);if(v)imgs[key]=im;resolve(v)};
 const timer=setTimeout(()=>end(false),6500);
 im.onload=()=>end(true);im.onerror=()=>end(false);im.src=PHOTOS[key];
});
const cleanse=x=>String(x==null?"":x).replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
const para=x=>Array.isArray(x)?x.map(para).filter(Boolean).join("\n"):typeof x==="object"&&x?cleanse((x.titulo?x.titulo+" — ":"")+(x.texto||"")):cleanse(x);
const nested=(r,k)=>k.split(".").reduce((o,key)=>o&&o[key],r);
const validNum=n=>Number.isFinite(Number(n))?Number(n):0;
const cmp=(o,key)=>o&&Object.prototype.hasOwnProperty.call(o,key)?o[key]:null;
function age(iso,dateIso) {
 if(!iso)return null;let bd=new Date(iso),at=new Date(dateIso||Date.now());
 if(!Number.isFinite(bd.getTime()))return null;
 let a=at.getUTCFullYear()-bd.getUTCFullYear();
 if((at.getUTCMonth()*32+at.getUTCDate())<(bd.getUTCMonth()*32+bd.getUTCDate()))a--;
 return a>=0&&a<=125?a:null;
}
const blobDownload=(doc,name)=>{
 const blob=doc.output("blob"),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),9000);
};
function imageCrop(doc,img,x,y,w,h){
 if(!img) return false;
 try{
  // jsPDF handles the fixed photo after CORS-safe image loading.
  const iw=img.naturalWidth,ih=img.naturalHeight;if(!iw||!ih)return false;
  const canvas=document.createElement("canvas"),ratio=w/h,ir=iw/ih;
  canvas.width=Math.max(1,Math.round(w*1.6));canvas.height=Math.max(1,Math.round(h*1.6));
  const ctx=canvas.getContext("2d");
  if(ir>ratio){let sw=ih*ratio;ctx.drawImage(img,(iw-sw)/2,0,sw,ih,0,0,canvas.width,canvas.height);}
  else{let sh=iw/ratio;ctx.drawImage(img,0,(ih-sh)/2,iw,sh,0,0,canvas.width,canvas.height);}
  doc.addImage(canvas.toDataURL("image/jpeg",.78),"JPEG",x,y,w,h,undefined,"FAST");return true;
 }catch(e){return false}
}
function creator(p){
 const S=p.gt.S||{},R=p.gt.res||{},g=S.g||{},w=S.w||{},po=S.p||{},l=S.l||{},m=S.m||{};
 const peak=(o,k)=>Math.round(100*validNum(o[k])/Math.max(1,...Object.values(o).map(validNum)));
 const has=(o,arr,i)=>arr&&arr[i]&&validNum(o[arr[i]])>0;
 const primary=(dict,o,keys)=>has(o,keys,0)&&dict[keys[0]]?dict[keys[0]][0]:"Não indicado";
 const secondary=(dict,o,keys)=>has(o,keys,1)&&dict[keys[1]]?dict[keys[1]][0]:"Sem segundo resultado indicado";
 const gp=primary(GT_G,g,S.rg),gs=secondary(GT_G,g,S.rg),wp=primary(GT_W,w,S.rw),ws=secondary(GT_W,w,S.rw);
 const pp=primary(GT_P,po,S.rp),ps=secondary(GT_P,po,S.rp),lp=primary(GT_L,l,S.rl),mp=primary(GT_M,m,S.rm);
 const dated=(p.gt.when||new Date().toISOString()).slice(0,10);
 const nAge=age(p.birth,dated);
 const who=cleanse(p.name)||"Pessoa";
 const title=(who.length>80?who.slice(0,80):who);
 const G=R.guardiao||{},F=R.ferida||{},P=R.potencial||{},A=R.areas||{},D=R.dinheiro||{},Y=R.ano||{},PL=R.plano||{},B=R.comportamento||{},O=R.objetivo||{};
 return {p,S,R,g,w,po,l,m,peak,gp,gs,wp,ws,pp,ps,lp,mp,G,F,P,A,D,Y,PL,B,O,who,title,dated,nAge};
}
function generate(p){
 const {jsPDF}=window.jspdf;
 const doc=new jsPDF({unit:"pt",format:"a4",orientation:"landscape",compress:true});
 const W=841.89,H=595.28;
 const q=creator(p),R=q.R;
 const hasMonths=Array.isArray(R.meses)&&R.meses.length===12&&R.meses.every(m=>m&&Number.isInteger(m.ano)&&Number.isInteger(m.mes)&&m.mes>=1&&m.mes<=12&&typeof m.titulo==='string');
 const endingPage=hasMonths?35:29;
 let page=0; const overflows=[];
 const color=(c,method="setTextColor")=>doc[method](...(C[c]||C.ink));
 const rect=(x,y,w,h,c="paper",radius=0)=>{color(c,"setFillColor");if(radius)doc.roundedRect(x,y,w,h,radius,radius,"F");else doc.rect(x,y,w,h,"F")};
 const rule=(x,y,w)=>{doc.setDrawColor(...C.line);doc.setLineWidth(.8);doc.line(x,y,x+w,y)};
 const text=(t,x,y,size=12,c="ink",font="helvetica",style="normal")=>{
  doc.setFont(font,style);doc.setFontSize(size);color(c);doc.text(cleanse(t),x,y);
 };
 const blocks=(value,x,y,w,h,opt={})=>{
  const t=para(value);if(!t)return;
  const c=opt.color||"ink";let size=opt.size||11.0;
  let lines,lh;
  for(;size>=8.4;size-=.3){
   doc.setFont(opt.font||"helvetica",opt.style||"normal");doc.setFontSize(size);
   lines=doc.splitTextToSize(t,w);lh=size*(opt.leading||1.37);
   if(lines.length*lh<=h)break;
  }
  // Never silently discard content; continuation pages are added after the fixed 29-page sequence.
  const limit=Math.max(1,Math.floor(h/lh)),visible=lines.slice(0,limit),rest=lines.slice(limit);
  color(c);visible.forEach((line,i)=>doc.text(line,x,y+(i+1)*lh));
  if(rest.length) overflows.push({title:opt.heading||"Continuação da leitura",lines:rest,size:Math.max(10,size),page});
 };
 const card=(x,y,w,h,heading,val,opt={})=>{
  rect(x,y,w,h,opt.dark?"dark":"paper",11);
  doc.setDrawColor(...C.line);doc.setLineWidth(.7);doc.roundedRect(x,y,w,h,11,11,"S");
  if(heading)text(heading.toUpperCase(),x+15,y+20,8.8,opt.dark?"ivory":"orange","helvetica","bold");
  const top=y+(heading?31:8);
  blocks(val,x+15,top,w-30,h-(heading?41:18),{size:opt.size||11,color:opt.dark?"ivory":"ink",heading});
 };
 const picture=(key,x,y,w,h,overlay=false)=>{
  if(!imageCrop(doc,imgs[key],x,y,w,h)){
   rect(x,y,w,h,"dark"); for(let i=0;i<10;i++){
    doc.setDrawColor(...C.orange2);doc.setLineWidth(.5);
    doc.circle(x+w*.5,y+h*.54,Math.max(5,w*.12+i*13),"S");
   }
  }
  if(overlay){doc.setFillColor(...C.dark);doc.setGState(new doc.GState({opacity:.48}));doc.rect(x,y,w,h,"F");doc.setGState(new doc.GState({opacity:1}))}
 };
 const newPage=(heading,eyebrow)=>{
  if(page)doc.addPage();page++;
  rect(0,0,W,H,"ivory");rect(0,0,W,6,"orange");
  text("CAMPO GUARDIÃO",39,39,9,"orange","helvetica","bold");
  text("MAPA DO GUARDIÃO / "+String(page).padStart(2,"0"),650,39,9,"muted","helvetica","bold");rule(39,59,763);
  if(eyebrow)text(eyebrow.toUpperCase(),41,91,9,"orange","helvetica","bold");
  if(heading)blocks(heading,41,101,747,54,{font:"times",size:31,leading:1.05,heading});
  rule(39,551,763);
  text("RECONHECER   •   HONRAR   •   ATUALIZAR",40,572,8,"muted","helvetica","bold");
 };
 const side=(key,heading,eyebrow,summary,left=220)=>{
  newPage(heading,eyebrow);picture(key,41,164,left-56,359);card(left,164,804-left,359,summary.title,summary.value,{size:summary.size||11.4});
 };
 const divider=(key,heading,eyebrow,subtitle)=>{
  if(page)doc.addPage();page++;
  rect(0,0,W,H,"paper");picture(key,0,0,305,H);
  rect(305,0,9,H,"orange");
  text("CAMPO GUARDIÃO / "+eyebrow.toUpperCase(),355,92,10,"orange","helvetica","bold");
  blocks(heading,352,144,430,200,{size:49,font:"times",heading});
  blocks(subtitle,359,378,390,97,{size:19,font:"times",style:"italic",heading});
  text(String(page).padStart(2,"0")+" / "+endingPage,741,555,10,"muted","helvetica","bold");
 };
 const bar=(label,score,x,y,w,group)=>{
  const val=q.peak(group,score);
  text(label,x,y+5,9.4,"ink","helvetica","bold");
  text(String(val)+"%",x+w-36,y+5,9,"orange","helvetica","bold");
  rect(x,y+11,w,5,"light",2);if(val>0)rect(x,y+11,Math.max(2,w*val/100),5,"orange",2);
 };
 const scoreCard=(heading,values,x,y,w,h,cols=1)=>{
  card(x,y,w,h,heading,"");
  let row=27;const rh=(h-45)/values.length;
  values.forEach(([name,key,group])=>{bar(name,key,x+16,y+row,w-33,group);row+=rh});
 };
 const info=(heading,value,photo)=>{
  newPage(heading,"LEITURA PERSONALIZADA");
  if(photo)picture(photo,41,170,170,350);
  card(photo?229:41,170,photo?565:753,350,heading,value,{size:11.6});
 };
 const sec=(dict,scores,keys)=>secondary(dict,scores,keys);
 const sx=(kind)=>{
  const table={g:GT_G,w:GT_W,p:GT_P,l:GT_L,m:GT_M}[kind],score=q.S[kind]||{},rank=q.S[({g:"rg",w:"rw",p:"rp",l:"rl",m:"rm"})[kind]]||[];
  return rank.filter(k=>table[k]).map(k=>[table[k][0].replace(/^Guardião d[aeo] /,""),k,score]);
 };
 const fmt=(a)=>Array.isArray(a)?a.map((v,i)=>(i+1)+". "+para(v)).join("\n"):para(a);
 const scoreBy=(kind,want)=>sx(kind).filter(e=>want.includes(e[1]));
 // 01 CAPA
 page=1;rect(0,0,W,H,"paper");picture("faces",0,0,W,309,true);rect(0,0,9,309,"orange");
 text("MAPEAMENTO SIMBÓLICO  /  CAMPO GUARDIÃO",44,50,10,"white","helvetica","bold");
 text("MAPA DO",43,159,67,"white","helvetica","bold");
 text("GUARDIÃO",43,241,78,"white","helvetica","bold");
 text("O SEU LUGAR DE POTÊNCIA",48,343,10,"orange","helvetica","bold");
 blocks("Onde a sua energia rende mais e custa menos.",48,357,630,80,{size:29,font:"times",style:"italic"});
 rule(48,487,742);
 text("RELATÓRIO PREPARADO PARA",50,510,9,"muted","helvetica","bold");
 blocks(q.title,50,519,489,39,{size:17,heading:"Nome"});
 text("DATA DA LEITURA",590,510,9,"muted","helvetica","bold");text(q.dated.split("-").reverse().join("/"),589,536,12,"ink");
 // 02
 newPage("Antes de começar","CARTA DE ABERTURA");
 blocks("Você não precisa se consertar. Precisa se reconhecer.",47,154,354,164,{font:"times",size:35});
 blocks("Este relatório reúne hipóteses de reflexão. Não é diagnóstico, sentença nem previsão.",48,369,349,91,{size:12});
 card(439,166,356,324,"Uma mensagem para você",R.abertura,{size:11.4});
 // 03
 newPage("Um percurso, não um rótulo","SEU SUMÁRIO");
 const toc=[["COMO LER","04–07","Método e resultados"],["O GUARDIÃO","08–10","Proteção e seus custos"],["FERIDA E POTÊNCIA","11–16","Da defesa aos recursos"],["ÁREAS E CICLOS","17–22","Seu contexto de vida"],["APRENDER E OBJETIVO","23–24","O que ajuda você"],hasMonths?["PRÓXIMOS MESES E PLANO","25–35","Ciclos e escolhas práticas"]:["SEU PLANO","25–29","Reconhecer, honrar, atualizar"]];
 toc.forEach(([a,b,c],i)=>{const x=41+(i%3)*258,y=164+Math.floor(i/3)*171;card(x,y,240,153,a,c+"\n\nPáginas "+b,{size:11.2})});
 // 04
 newPage("O mapa tem três movimentos","COMO LER ESTA ENTREGA");
 blocks("Um percurso para reconhecer a proteção, honrar sua função e atualizar a maneira de agir. A leitura é simbólica e convida você a testar o que faz sentido.",43,155,751,74,{size:13});
 [["01 · RECONHECER","Perceber onde a proteção se ativa e o que tenta evitar."],["02 · HONRAR","Acolher a intenção da defesa, mesmo quando ela já custa caro."],["03 · ATUALIZAR","Dar ao Guardião uma nova referência, com um gesto possível."]].forEach((v,i)=>card(42+i*257,254,244,225,v[0],v[1],{size:14}));
 // 05
 newPage("Seu campo em um olhar","VISÃO GERAL");
 picture("mountain",41,165,471,331);
 card(531,164,266,99,"Guardião",q.gp,{size:17});
 card(531,273,266,99,"Ferida",q.wp,{size:17});
 card(531,381,266,116,"Lugar de potência",q.D.lugar_de_poder||q.mp,{size:14});
 // 06
 newPage("Os números não são sentenças","RESULTADOS DO TESTE / 1");
 blocks("Pontuações relativas à maior marcação do próprio teste. Não são probabilidades nem diagnóstico.",44,146,749,59,{size:11});
 scoreCard("GUARDIÕES / PADRÕES",scoreBy("g",["per","ctl","car","apr","adi","prv","inv","dis"]),42,218,367,275);
 scoreCard("POTENCIAIS GUARDADOS",scoreBy("p",["rec","exs","cnf","exp","cri","psp"]),429,218,367,275);
 text("A barra de 0% não indica um segundo caminho.",44,524,9,"muted");
 // 07
 newPage("Seu teste, sem atalhos","RESULTADOS DO TESTE / 2");
 blocks("Aprendizagem e trabalho são preferências relatadas. Não atribuímos um segundo resultado que tenha 0%.",44,147,748,49,{size:11});
 scoreCard("FERIDAS SIMBÓLICAS",scoreBy("w",["rej","aba","hum","tra","inj"]),40,217,241,275);
 scoreCard("JEITO DE APRENDER",scoreBy("l",["lau","lvi","lpr","lle","lco"]),300,217,241,275);
 scoreCard("JEITO DE TRABALHAR",scoreBy("m",["mco","msv","mve","mlh","mes","mcr"]),558,217,242,275);
 // 08
 divider("forest","A parte de você que chega antes.","SEU GUARDIÃO","A proteção foi importante. Agora ela também pode aprender a mudar.");
 // 09
 newPage("Conheça seu Guardião","A LINGUAGEM DA PROTEÇÃO");
 card(41,166,224,116,"Guardião principal",q.gp,{size:17});
 card(41,294,224,98,"Guardião secundário",q.gs,{size:13});
 card(41,401,224,110,"Como ele reforça o principal",q.gs.startsWith("Sem ")?q.gs:"Esse padrão secundário pode ampliar as tentativas de proteção do primeiro.",{size:10});
 card(281,166,515,236,"Interpretação do Guardião",q.G.leitura,{size:11.8});
 card(281,414,515,99,"O que a proteção entrega",q.G.beneficio,{size:10.7});
 // 10
 newPage("Quando a proteção toma a frente","CENAS, BENEFÍCIOS E CUSTOS");
 (q.G.cenas||[]).slice(0,3).forEach((v,i)=>card(41+i*258,166,243,151,"CENA "+(i+1),v,{size:11}));
 card(41,329,365,188,"O que ela ajuda a preservar",q.G.beneficio,{size:11.4});
 card(422,329,374,188,"O preço que cobra hoje",q.G.preco,{size:11.4});
 // 11
 divider("pottery","A raiz do que se repete.","SUA FERIDA","Uma sensibilidade possível, não uma certeza sobre sua infância.");
 // 12
 newPage("O que a ferida revela","LEITURA SIMBÓLICA");
 card(41,167,317,105,"Ferida principal",q.wp+"\n\n"+para(R.intro_ferida),{size:11});
 card(41,283,317,105,"Ferida secundária",q.ws,{size:14});
 card(41,400,317,115,"Influência de apoio",q.ws.startsWith("Sem ")?q.ws:"A ferida secundária pode influenciar como você recebe proximidade e apoio.",{size:10.7});
 card(373,167,422,348,"Leitura personalizada",q.F.leitura,{size:12});
 // 13
 newPage("Como a ferida se transforma","DA LEITURA À ESCOLHA");
 card(41,168,239,317,"O que a criança pode ter precisado",q.F.crianca_precisou,{size:11.6});
 card(296,168,239,317,"Como você pode ter se defendido",q.F.jeito_de_se_defender,{size:11.6});
 card(551,168,245,317,"Primeiro gesto",q.P.primeiro_gesto,{size:11.6});
 // 14
 divider("light","O que ficou guardado em você.","SUA POTÊNCIA","Onde a sua energia rende mais e custa menos.");
 // 15
 newPage("Você não precisa caber em tudo","SEU LUGAR DE POTÊNCIA");
 card(41,168,754,77,"Seu lugar de potência",q.D.lugar_de_poder||q.mp,{size:16});
 card(41,257,240,115,"Potencial central",q.pp,{size:15});
 card(297,257,240,115,"Potencial de apoio",q.ps,{size:14});
 card(553,257,242,115,"Quando a proteção relaxa",q.P.quando_livre,{size:10});
 card(41,384,754,134,"Como a potência se expressa",q.P.leitura,{size:11});
 // 16
 info("Seu momento encontra sua história",q.R.cruzamento+"\n\n"+q.R.integrada,"trail");
 // 17
 newPage("Trabalho e expressão","ÁREAS DA VIDA");
 picture("mountain",41,166,174,347);
 card(231,166,563,226,"Leitura no trabalho",nested(q.A,"trabalho.texto"),{size:12});
 card(231,404,563,109,"Um gesto no trabalho",nested(q.A,"trabalho.gesto"),{size:11.7});
 // 18
 newPage("Dinheiro e escolhas possíveis","ÁREAS DA VIDA");
 card(41,167,368,164,"Sua relação com o dinheiro",q.D.leitura,{size:11.2});
 card(425,167,370,164,"Armadilha mais comum",q.D.armadilha,{size:11.2});
 card(41,343,368,169,"Formas de aplicar seus recursos",fmt(q.D.formas),{size:10.5});
 card(425,343,370,169,"Primeiro movimento",q.D.primeiro_passo,{size:11.1});
 // 19
 newPage("Relacionamentos e vínculos","ÁREAS DA VIDA");
 picture("water",41,166,172,347);
 card(227,166,569,226,"Padrões nos vínculos",nested(q.A,"relacionamentos.texto"),{size:11.9});
 card(227,403,569,110,"Um gesto possível",nested(q.A,"relacionamentos.gesto"),{size:11.8});
 // 20
 newPage("Saúde, rotina e energia","ÁREAS DA VIDA");
 picture("water",41,166,172,347);
 card(227,166,569,226,"Cuidado e ritmo",nested(q.A,"saude.texto"),{size:11.9});
 card(227,403,569,110,"Pequeno cuidado possível",nested(q.A,"saude.gesto"),{size:11.8});
 // 21
 newPage("Espiritualidade e sentido","ÁREAS DA VIDA");
 picture("forest",41,166,172,347);
 card(227,166,569,226,"Conexão com o que importa",nested(q.A,"espiritualidade.texto"),{size:11.9});
 card(227,403,569,110,"Prática de presença",nested(q.A,"espiritualidade.gesto"),{size:11.8});
 // 22
 newPage("O seu momento de vida","CICLOS E DIREÇÃO");
 card(41,168,218,91,"Idade",q.nAge===null?"Não informada":q.nAge+" anos",{size:17});
 let phase="Fase atual de desenvolvimento";
 if(q.nAge!==null){const begin=Math.floor(q.nAge/7)*7;phase="Fase de "+begin+" a "+(begin+7)+" anos"}
 card(272,168,279,91,"Fase de vida",phase,{size:14});
 card(563,168,231,91,"Tema do ano",q.Y.energia,{size:14});
 card(41,271,242,239,"O que o momento pede",q.Y.leitura,{size:11.3});
 card(296,271,242,239,"O que o ano favorece",fmt(q.Y.favorece),{size:11.2});
 card(552,271,243,239,"Onde pede cuidado",fmt(q.Y.cuidado),{size:11.2});
 // 23
 newPage("Como você aprende","APRENDIZAGEM");
 card(41,166,752,77,"Preferência principal",q.lp+ (q.S.rl && q.S.rl[0]?" · "+q.peak(q.l,q.S.rl[0])+"%":""),{size:17});
 card(41,255,752,135,"Seu jeito de aprender",nested(q.Y,"aprende.leitura"),{size:11.9});
 (nested(q.Y,"aprende.dicas")||[]).slice(0,3).forEach((d,i)=>card(41+i*255,402,241,110,"Dica "+(i+1),d,{size:10.5}));
 // 24
 newPage("A pergunta que trouxe você aqui","SEU OBJETIVO");
 card(41,169,753,81,"Você escreveu",q.p.goal,{size:14});
 card(41,261,481,251,"A resposta do seu mapa",q.O.leitura,{size:12});
 card(537,261,257,251,"O próximo passo",q.O.proximo_passo,{size:11.8});
 // 25–30 · Seus próximos doze meses (dois meses em cada página).
 // Este capítulo só existe para leituras novas que já salvaram a sexta etapa.
 if(hasMonths){
  const monthNames=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const scenes=['forest','mountain','light','water','journey','intro'];
  for(let i=0;i<6;i++){
   const oneMonth=R.meses[2*i],twoMonth=R.meses[2*i+1];
   newPage('Seus próximos 12 meses · '+(i+1)+'/6','CICLOS SIMBÓLICOS DO SEU GUARDIÃO');
   [oneMonth,twoMonth].forEach((m,col)=>{
    const x=41+col*385,wide=369,photo=scenes[i%scenes.length];
    const heading=monthNames[m.mes-1].toUpperCase()+' DE '+m.ano;
    picture(photo,x,169,100,83);
    rect(x+102,169,wide-102,83,'dark');
    text(heading,x+116,189,11,'orange','helvetica','bold');
    blocks(m.titulo,x+115,197,wide-132,40,{size:18,font:'times',color:'ivory',heading:'Título do mês'});
    card(x,266,wide,89,'Potencial do mês',m.potencial,{size:10.8});
    card(x,366,wide,89,'Onde pede cuidado',m.cuidado,{size:10.8});
    card(x,466,wide,67,'Uma atitude possível',m.passo,{size:10});
   });
  }
 }
 // 25 ou 31
 newPage("Quatro pontos para trabalhar","RECONHECER E ESCOLHER");
 (q.R.trabalhar||[]).slice(0,4).forEach((a,i)=>card(41+(i%2)*386,170+Math.floor(i/2)*174,370,156,"Ponto "+String(i+1).padStart(2,"0"),a,{size:11.4}));
 // 26
 newPage("Como se comportar agora","HONRAR E ATUALIZAR");
 card(41,168,369,114,"O que merece acolhimento",q.F.crianca_precisou,{size:11});
 card(427,168,367,114,"O que fazer",fmt(q.B.fazer),{size:10.7});
 card(41,294,369,221,"O que não alimentar",fmt(q.B.evitar),{size:11});
 card(427,294,367,221,"Uma conversa com o Guardião",q.R.conversa,{size:11});
 // 27
 newPage("Seu plano começa no presente","PRÓXIMAS DECISÕES");
 card(41,169,366,344,"Próximas 72 horas",q.PL.h72,{size:12.2});
 card(427,169,368,344,"Prática de cinco minutos",q.PL.min5,{size:12.2});
 // 28
 newPage("Sete dias para experimentar","PLANO DE AÇÃO");
 (q.PL.dias||[]).slice(0,7).forEach((d,i)=>{
 const col=i%4,row=Math.floor(i/4),x=41+col*194,y=170+row*161;
 card(x,y,180,145,"Dia "+(i+1),d,{size:10.3});
 });
 card(623,331,178,145,"Lembrete","Pequenos gestos repetidos contam mais que promessas impossíveis.",{size:11});
 // 29
 doc.addPage();page=endingPage;
 rect(0,0,W,H,"dark");picture("light",570,0,271,H,true);
 text("CAMPO GUARDIÃO",53,77,10,"orange","helvetica","bold");
 blocks("O seu lugar não pede que você desapareça para caber.",53,112,520,210,{size:50,font:"times",color:"ivory"});
 card(52,365,505,113,"Sua frase de atualização",q.R.frase_nova,{size:19,dark:true});
 blocks("SUA PERGUNTA PARA LEVAR",53,488,490,21,{size:9,color:"ivory",heading:"pergunta"});
 blocks(q.R.pergunta,53,510,512,56,{size:12,color:"ivory",heading:"pergunta"});
 // Append any necessary continuations without losing the user text.
 let extras=0;
 while(overflows.length&&extras<50){
  const extra=overflows.shift();doc.addPage();page++;extras++;
  rect(0,0,W,H,"ivory");rect(0,0,W,6,"orange");
  text("CAMPO GUARDIÃO / LEITURA COMPLEMENTAR",41,47,9,"orange","helvetica","bold");
  blocks("Continuação: "+extra.title,42,84,741,72,{size:25,font:"times"});
  const lineHeight=14;let start=0;
  const max=25;
  const part=extra.lines.slice(0,max);
  doc.setFont("helvetica","normal");doc.setFontSize(11);color("ink");
  part.forEach((line,i)=>doc.text(cleanse(line),45,188+i*lineHeight));
  if(extra.lines.length>max)overflows.push({...extra,lines:extra.lines.slice(max)});
 }
 if (overflows.length) throw new Error('O texto excede o limite de páginas adicionais. Entre em contato com o suporte para receber o relatório sem cortes.');
 // Consistent final pagination even with optional overflow pages.
 const total=doc.getNumberOfPages();
 for(let i=1;i<=total;i++){
  doc.setPage(i);doc.setFont("helvetica","normal");doc.setFontSize(8);
  color(i===endingPage?"ivory":"muted");doc.text("MAPA DO GUARDIÃO · "+q.who+"  ·  "+i+" / "+total,42,585);
 }
 doc.setProperties({title:"Mapa do Guardião · "+q.who,subject:"Leitura simbólica individual · Campo Guardião",author:"Campo Guardião"});
 return {doc,pages:total,overflows:overflows.length};
}
const prior=typeof gtPDF==="function"?gtPDF:null;
async function pdfEditorial29(btn,status){
 if(!window.jspdf){status.textContent="Não foi possível carregar a biblioteca do PDF. Atualize a página.";return}
 const p=typeof gtPerson==="function"?gtPerson():null;
 if(!p||!p.gt||!p.gt.res||!p.gt.S){
  status.textContent="Seu mapa salvo não está disponível. Entre novamente no painel.";return;
 }
 btn.disabled=true;status.textContent="Montando seu PDF personalizado com os dados já salvos, sem gerar nova leitura…";
 try{
  await Promise.all(Object.keys(PHOTOS).map(k=>loadImage(k)));
  const result=generate(p);
  const filename="mapa-do-guardiao-"+cleanse(p.name||"meu-mapa").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9]+/g,"-").toLowerCase()+".pdf";
  blobDownload(result.doc,filename);
  status.textContent="PDF pronto ("+result.pages+" páginas). Nenhum novo mapa foi gerado.";
 }catch(e){
  console.error("Erro no PDF editorial de 29 páginas:",e&&e.message||e);
  status.textContent="O PDF editorial não pôde ser montado. Tente novamente.";
 }finally{btn.disabled=false}
}
if(prior){
 gtPDF=pdfEditorial29;
 window.gtPDF=pdfEditorial29;
}
window.guardiaoPdf29={generate,creator,download:pdfEditorial29,version:"35-editorial-monthly-2"};
})();
