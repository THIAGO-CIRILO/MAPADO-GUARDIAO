/* Mapa do Guardião — PDF Essencial no navegador, sem chamadas à IA.
 * O conteúdo integral segue salvo no painel. Esta é a alternativa segura
 * quando o gerador de PDF no servidor não responde.
 * Sempre 14 páginas (ou 18 com 12 meses). Sem anexos de continuação.
 */
(()=>{'use strict';
const PALETTE={dark:[53,26,20],ink:[37,35,33],orange:[240,74,18],ivory:[247,241,233],paper:[255,252,247],line:[216,203,192],muted:[113,98,89],soft:[240,232,222],white:[255,255,255]};
const GUARD={apr:'Aprovação',ctl:'Controle',per:'Perfeccionismo',inv:'Invisibilidade',car:'Sobrecarga',dis:'Distância',adi:'Adiamento',prv:'Prova'};
const WOUND={rej:'Rejeição',aba:'Abandono',hum:'Humilhação',tra:'Traição',inj:'Injustiça'};
const POWER={exp:'Expressão',rec:'Recebimento',exs:'Expansão',lid:'Liderança',amo:'Amor',prz:'Prazer',aut:'Autonomia',cri:'Criatividade',psp:'Prosperidade',pre:'Presença',cnf:'Confiança',prp:'Propósito'};
const LEARN={lvi:'Vendo',lau:'Ouvindo',lpr:'Fazendo',lle:'Lendo e organizando',lco:'Conversando'};
const WORK={msv:'Atendendo pessoas',mco:'Ensinando e produzindo conteúdo',mve:'Vendendo e negociando',mlh:'Liderando e empreendendo',mes:'Organizando e dando segurança',mcr:'Criando com as próprias mãos'};
const MONTH=['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function plain(v) {
 if(v==null)return '';
 if(Array.isArray(v))return v.map(plain).filter(Boolean).join('. ');
 if(typeof v==='object')return [plain(v.titulo),plain(v.texto)].filter(Boolean).join(' — ');
 return String(v).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
}
const defensive=/\b(?:este|esse|o seu) (?:mapa|relatorio|material) (?:foi escrito|foi feito|foi elaborado|e um espelho|e uma lente|e um convite|se baseia)\b|\bnao (?:e|constitui|se trata de) (?:um |uma )?(?:diagnostico|previsao|veredito)\b|\b(?:feito de hipoteses|sao apenas hipoteses|deixe de lado o que nao serve|fique com o que ressoa|veja o que ressoa)\b/;
function meaningful(v){
 const txt=plain(v);
 return (txt.match(/[^.!?]+[.!?]*/g)||[]).filter(sentence=>!defensive.test(normalize(sentence))).join(' ').trim();
}
function excerpt(v,count=70){
 const t=meaningful(v),a=t.split(/\s+/).filter(Boolean);
 if(a.length<=count)return t;
 const head=a.slice(0,count).join(' ');
 const end=Math.max(head.lastIndexOf('. '),head.lastIndexOf('? '),head.lastIndexOf('! '));
 if(end>head.length*.43)return head.slice(0,end+1);
 return head.replace(/[,;:— -]+$/,'')+'…';
}
const nested=(o,key)=>key.split('.').reduce((v,k)=>v?.[k],o);
const label=(v,rank,dict,index=0)=>{
 const key=Array.isArray(rank)?rank[index]:null;
 return key&&Number(v?.[key])>0?(dict[key]||''):'';
};
const rating=(v,rank)=>{
 const key=Array.isArray(rank)?rank[0]:null;
 const max=Math.max(1,...Object.values(v||{}).map(Number).filter(Number.isFinite));
 return key?Math.max(0,Math.min(100,Math.round(100*(Number(v?.[key])||0)/max))):0;
};
function validateMonths(R){
 return Array.isArray(R?.meses)&&R.meses.length===12&&R.meses.every(m=>Number.isInteger(m?.mes)&&m.mes>=1&&m.mes<=12&&Number.isInteger(m?.ano));
}
function compile(input){
 const {jsPDF}=window.jspdf||{};
 if(!jsPDF)throw new Error('A biblioteca de PDF não está disponível.');
 const doc=new jsPDF({unit:'pt',format:'a4',orientation:'landscape',compress:true});
 const W=841.89,H=595.28,p=input||{},state=p.gt?.S||{},r=p.gt?.res||{};
 const gs=state.g||{},ws=state.w||{},ps=state.p||{},lsa=state.l||{},wsa=state.m||{};
 const gp=label(gs,state.rg,GUARD)||'Não indicado',fp=label(ws,state.rw,WOUND)||'Não indicado',pp=label(ps,state.rp,POWER)||'Não indicado';
 const secondaryG=label(gs,state.rg,GUARD,1),secondaryF=label(ws,state.rw,WOUND,1),secondaryP=label(ps,state.rp,POWER,1);
 const area=r.areas||{},gd=r.guardiao||{},fd=r.ferida||{},pot=r.potencial||{},money=r.dinheiro||{},year=r.ano||{},plan=r.plano||{},goal=r.objetivo||{};
 const hasMonths=validateMonths(r),total=hasMonths?18:14;
 let pages=1;
 const setColor=(name,fn='setTextColor')=>doc[fn](...(PALETTE[name]||PALETTE.ink));
 const rect=(x,y,w,h,name='paper')=>{setColor(name,'setFillColor');doc.rect(x,y,w,h,'F')};
 const rule=(x,y,w)=>{doc.setDrawColor(...PALETTE.line);doc.setLineWidth(.7);doc.line(x,y,x+w,y)};
 const word=(text,x,y,size=11,c='ink',style='normal',font='helvetica')=>{
  doc.setFont(font,style);doc.setFontSize(size);setColor(c);doc.text(plain(text),x,y);
 };
 const place=(v,x,y,w,h,{size=11,color='ink',limit=70,font='helvetica',style='normal',leading=1.34}={})=>{
  const s=excerpt(v,limit);if(!s)return;
  let fontSize=size,lines=[],lineHeight=fontSize*leading;
  do{
   doc.setFont(font,style);doc.setFontSize(fontSize);
   lines=doc.splitTextToSize(s,w).flatMap(a=>String(a).split('\n'));
   lineHeight=fontSize*leading;
   if(lines.length*lineHeight<=h||fontSize<=10.1)break;
   fontSize-=.3;
  }while(fontSize>=10);
  const count=Math.max(1,Math.floor(h/lineHeight));const drawn=lines.slice(0,count);
  if(lines.length>count&&drawn.length){
   let last=drawn.length-1;
   const raw=drawn[last].replace(/[….,;:!? ]+$/,'');
   drawn[last]=raw.slice(0,Math.max(0,raw.length-2))+'…';
  }
  doc.setFont(font,style);doc.setFontSize(fontSize);setColor(color);
  drawn.forEach((ln,i)=>doc.text(String(ln),x,y+(i+1)*lineHeight));
 };
 const box=(x,y,w,h,dark=false)=>{
  setColor(dark?'dark':'paper','setFillColor');
  doc.roundedRect(x,y,w,h,10,10,'F');
  if(!dark){doc.setDrawColor(...PALETTE.line);doc.roundedRect(x,y,w,h,10,10,'S');}
 };
 const card=(title,value,x,y,w,h,{dark=false,size=11.7,limit=70}={})=>{
  box(x,y,w,h,dark);word(String(title).toUpperCase(),x+15,y+22,9,dark?'ivory':'orange','bold');
  place(value,x+15,y+34,w-30,h-43,{color:dark?'ivory':'ink',size,limit});
 };
 const section=(title,eyebrow='LEITURA PERSONALIZADA')=>{
  if(pages>0)doc.addPage();pages++;
  rect(0,0,W,H,'ivory');rect(0,0,W,6,'orange');
  word('CAMPO GUARDIÃO',40,35,9,'orange','bold');
  word('MAPA DO GUARDIÃO',667,35,9,'muted','bold');
  rule(40,59,760);
  word(eyebrow,43,92,9,'orange','bold');
  place(title,41,100,765,51,{font:'times',size:31,limit:25,leading:1.07});
  rule(40,554,760);
  word('RECONHECER · HONRAR · ATUALIZAR',41,574,8,'muted','bold');
  word(String(pages).padStart(2,'0')+' / '+total,751,573,9,'muted','bold');
 };
 const bar=(head,value,x,y,w)=>{
  word(head,x,y,10,'ink','bold');word(value+'%',x+w-39,y,10,'orange','bold');
  rect(x,y+15,w,7,'soft');
  if(value)rect(x,y+15,Math.max(2,w*value/100),7,'orange');
 };
 const duo=(a,b)=>{card(a[0],a[1],43,169,365,331,{limit:110,size:12.2});card(b[0],b[1],424,169,369,331,{limit:110,size:12.2});};
 const month=(m,x,y)=>{
  box(x,y,751,115);
  word(MONTH[m.mes-1]+'/'+m.ano,x+16,y+21,11,'orange','bold');
  place(m.titulo,x+115,y+7,616,28,{size:16.6,limit:12,leading:1});
  rule(x+14,y+39,721);
  for(const [j,l,v] of [[0,'POTENCIAL',m.potencial],[1,'CUIDADO',m.cuidado],[2,'PASSO PRÁTICO',m.passo]]){
   const sx=x+15+j*244;
   if(j)rule(sx-8,y+53,0);
   word(l,sx,y+57,8.3,'orange','bold');
   place(v,sx,y+64,218,42,{size:10.5,limit:24,leading:1.22});
  }
 };
 const list=(arr,max=3)=>Array.isArray(arr)?arr.slice(0,max).map((x,i)=>(i+1)+'. '+excerpt(x,23)).join('  '):'';
 // 01 Capa
 rect(0,0,W,H,'dark');rect(0,0,8,H,'orange');
 setColor('orange','setDrawColor');doc.setLineWidth(1);
 for(let i=0;i<10;i++)doc.circle(677,212,24+i*23,'S');
 word('CAMPO GUARDIÃO  /  EDIÇÃO ESSENCIAL',47,55,11,'orange','bold');
 word('MAPA DO',44,190,68,'ivory','bold','times');
 word('GUARDIÃO',44,272,70,'ivory','bold','times');
 place('Onde a sua energia rende mais e custa menos.',47,326,595,75,{size:26,color:'ivory',font:'times',limit:18});
 rule(46,472,734);
 word('PREPARADO PARA',47,501,9,'orange','bold');
 place(p.name||'Pessoa participante',47,510,610,49,{size:22,color:'ivory',limit:14});
 // 02 Abertura
 section('A pergunta que trouxe você até aqui','ABERTURA');
 card('O QUE VOCÊ VEIO BUSCAR',p.goal||'Compreender meu momento de vida',43,169,244,331,{dark:true,limit:50,size:17});
 card('A PRIMEIRA CORRELAÇÃO',r.abertura||r.integrada,302,169,491,331,{limit:152,size:12.5});
 // 03 Retrato e barras
 section('Seu campo em um olhar','RESULTADOS DO TESTE');
 [[gp,'GUARDIÃO'],[fp,'FERIDA'],[pp,'POTENCIAL']].forEach(([v,l],i)=>card(l,v,43+i*255,166,241,100,{dark:i===0,size:18,limit:15}));
 bar('GUARDIÃO · '+gp,rating(gs,state.rg),53,323,340);
 bar('POTENCIAL · '+pp,rating(ps,state.rp),443,323,340);
 bar('FERIDA · '+fp,rating(ws,state.rw),53,404,340);
 place('Pontuações relativas às respostas do próprio teste.',448,400,322,53,{size:10,limit:21});
 // 04 Guardião
 section('Guardião e ferida','RECONHECER');
 card('GUARDIÃO · '+gp,gd.leitura,43,167,365,248,{limit:88,size:12});
 card('FERIDA · '+fp,fd.leitura,424,167,369,248,{limit:88,size:12});
 card('GUARDIÃO SECUNDÁRIO',secondaryG||'Sem segundo resultado positivo',43,427,365,74,{limit:12});
 card('FERIDA SECUNDÁRIA',secondaryF||'Sem segundo resultado positivo',424,427,369,74,{limit:12});
 // 05 Funções
 section('O que a proteção entrega e cobra','PROTEÇÃO EM MOVIMENTO');
 card('O BENEFÍCIO DA PROTEÇÃO',gd.beneficio,43,167,365,147,{limit:49});
 card('O PREÇO DA PROTEÇÃO',gd.preco,424,167,369,147,{limit:49});
 card('O QUE PRECISAVA SER CUIDADO',fd.crianca_precisou,43,325,365,176,{limit:65});
 const scene=Array.isArray(gd.cenas)?gd.cenas[0]:null;
 card(scene?.titulo||'UMA CENA POSSÍVEL',scene?.texto||r.cruzamento,424,325,369,176,{limit:64});
 // 06 Potência
 section('Sua potência guardada','ATUALIZAR');
 card('POTENCIAL PRINCIPAL · '+pp,pot.leitura,43,166,488,231,{limit:105,size:12.3});
 card('POTENCIAL SECUNDÁRIO',secondaryP||'Sem segundo resultado positivo',543,166,250,231,{dark:true,limit:25,size:19});
 card('UM PRIMEIRO MOVIMENTO',pot.primeiro_gesto||pot.quando_livre,43,408,750,93,{limit:39});
 // 07 Atuação
 section('Trabalho e dinheiro','ÁREAS DA VIDA');
 card('TRABALHO',nested(area,'trabalho.texto'),43,167,365,220,{limit:82});
 card('DINHEIRO',money.leitura,424,167,369,220,{limit:82});
 card('UMA ATITUDE PROFISSIONAL',nested(area,'trabalho.gesto'),43,398,365,103,{limit:34});
 card('UMA DECISÃO COM O DINHEIRO',money.primeiro_passo,424,398,369,103,{limit:34});
 // 08 Vínculos
 section('Relacionamentos e autocuidado','ÁREAS DA VIDA');
 card('RELACIONAMENTOS',nested(area,'relacionamentos.texto'),43,167,365,220,{limit:83});
 card('SAÚDE E ROTINA',nested(area,'saude.texto'),424,167,369,220,{limit:83});
 card('UM GESTO NOS VÍNCULOS',nested(area,'relacionamentos.gesto'),43,398,365,103,{limit:34});
 card('UM CUIDADO POSSÍVEL',nested(area,'saude.gesto'),424,398,369,103,{limit:34});
 // 09 Aprender
 section('Espiritualidade e aprendizagem','SENTIDO E RECURSOS');
 card('ESPIRITUALIDADE',nested(area,'espiritualidade.texto'),43,167,365,226,{limit:85});
 card('COMO VOCÊ APRENDE',nested(year,'aprende.leitura'),424,167,369,226,{limit:85});
 card('PREFERÊNCIA DE APRENDIZAGEM',label(lsa,state.rl,LEARN)||'Não indicada',43,404,365,97,{limit:16,size:15});
 card('PREFERÊNCIA DE TRABALHO',label(wsa,state.rm,WORK)||'Não indicada',424,404,369,97,{limit:16,size:15});
 // 10 Tempo
 section('Seu momento de vida','CICLOS E CONTEXTO');
 card('TEMA DO ANO',year.energia,43,165,241,99,{limit:23,size:13});
 const age=(()=>{try{const a=new Date((p.gt.when||new Date().toISOString()).slice(0,10)),b=new Date(p.birth);return Number.isFinite(b.getTime())?a.getUTCFullYear()-b.getUTCFullYear()-((a.getUTCMonth()<b.getUTCMonth()||(a.getUTCMonth()===b.getUTCMonth()&&a.getUTCDate()<b.getUTCDate()))?1:0):null;}catch(_){return null}})();
 card('IDADE',age==null?'Não informada':age+' anos',297,165,192,99,{limit:12,size:16});
 card('O QUE O ANO PEDE',year.leitura,501,165,292,99,{limit:39});
 card('O QUE FAVORECE',list(year.favorece),43,278,365,223,{limit:87});
 card('ONDE TER ATENÇÃO',list(year.cuidado),424,278,369,223,{limit:87});
 // 11–14 quando há calendário
 if(hasMonths)for(let i=0;i<4;i++){
  section('Seus próximos 12 meses · '+(i+1)+'/4','CICLOS SIMBÓLICOS');
  for(let j=0;j<3;j++)month(r.meses[i*3+j],43,166+j*124);
 }
 // objetivo
 section('Sua pergunta, sua direção','LEITURA INTEGRADA');
 card('O QUE VOCÊ BUSCA',p.goal,43,167,750,82,{dark:true,limit:40,size:14});
 card('CORRELAÇÃO PRINCIPAL',goal.leitura||r.integrada||r.cruzamento,43,260,485,241,{limit:106,size:12});
 card('UM PRÓXIMO PASSO',goal.proximo_passo||pot.primeiro_gesto,541,260,252,241,{limit:71});
 // 72h e 5m
 section('Seu plano começa agora','72 HORAS E CINCO MINUTOS');
 duo(['NAS PRÓXIMAS 72 HORAS',plan.h72],['PRÁTICA DE CINCO MINUTOS',plan.min5]);
 // 7 dias
 section('Sete dias para experimentar','PLANO DE AÇÃO');
 for(let day=0;day<7;day++){
  const xx=43+(day%4)*192,yy=166+Math.floor(day/4)*171;
  card('DIA '+(day+1),Array.isArray(plan.dias)?plan.dias[day]:'',xx,yy,178,151,{limit:42,size:10.6});
 }
 card('LEMBRETE','Uma ação viável sustenta mudanças melhor do que uma promessa impossível.',619,337,178,151,{dark:true,limit:29});
 // Fechamento
 section('O que você escolhe sustentar','ENCERRAMENTO');
 card('SUA FRASE DE ATUALIZAÇÃO',r.frase_nova,43,166,750,151,{dark:true,limit:57,size:16});
 card('UMA PERGUNTA PARA LEVAR',r.pergunta,43,330,750,169,{limit:63,size:16});
 word('A LEITURA COMPLETA PERMANECE DISPONÍVEL NA SUA CONTA',48,529,9,'muted','bold');
 if(pages!==total)throw Error('Paginação essencial inconsistente: '+pages+'/'+total);
 doc.setProperties({title:'Mapa do Guardião · Edição Essencial',author:'Campo Guardião',subject:'Resumo visual personalizado'});
 return {doc,pages,total};
}
function download(doc,filename){
 const blob=doc.output('blob'),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),20000);
}
async function essentialDownload(btn,status){
 if(!window.jspdf){if(status)status.textContent='Biblioteca do PDF indisponível. Tente novamente.';return}
 const p=typeof gtPerson==='function'?gtPerson():null;
 if(!p?.gt?.S||!p?.gt?.res){if(status)status.textContent='A leitura salva não está disponível neste navegador.';return}
 const name=String(p.name||'Meu_Mapa').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9_-]+/g,'_').slice(0,60);
 if(btn)btn.disabled=true;
 try{
  if(status)status.textContent='Montando a Edição Essencial com os dados já salvos…';
  const result=compile(p);
  download(result.doc,'Mapa_do_Guardiao_Edicao_Essencial_'+name+'.pdf');
  if(status)status.textContent='PDF essencial pronto: '+result.pages+' páginas. Sua leitura completa continua no site.';
 }catch(e){
  console.error('Falha ao montar PDF essencial:',e?.message||e);
  if(status)status.textContent='Não foi possível montar o PDF. Tente novamente; seu mapa permanece salvo.';
 }finally{if(btn)btn.disabled=false}
}
window.guardiaoPdfEssencial={generate:compile,download:essentialDownload,version:'14-18-essencial-1'};
})();