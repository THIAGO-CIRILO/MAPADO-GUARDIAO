'use strict';
/* Mapa do Guardião: edição essencial, 14 páginas (18 com 12 meses).
 * Usa apenas o mapa JÁ salvo. O conteúdo integral fica no painel da pessoa.
 * Sem geração de texto, sem anexos automáticos, sem letra microscópica.
 */
const PDFDocument=require('pdfkit');
const {Buffer}=require('buffer');
const W=841.89,H=595.28;
const C={dark:'#351A14',ink:'#252321',orange:'#F04A12',ivory:'#F7F1E9',paper:'#FFFCF7',line:'#D8CBC0',muted:'#77685D',light:'#F0E7DD',white:'#FFFFFF'};
const G={apr:'Aprovação',ctl:'Controle',per:'Perfeccionismo',inv:'Invisibilidade',car:'Sobrecarga',dis:'Distância',adi:'Adiamento',prv:'Prova'};
const F={rej:'Rejeição',aba:'Abandono',hum:'Humilhação',tra:'Traição',inj:'Injustiça'};
const P={exp:'Expressão',rec:'Recebimento',exs:'Expansão',lid:'Liderança',amo:'Amor',prz:'Prazer',aut:'Autonomia',cri:'Criatividade',psp:'Prosperidade',pre:'Presença',cnf:'Confiança',prp:'Propósito'};
const L={lvi:'Vendo',lau:'Ouvindo',lpr:'Fazendo',lle:'Lendo e organizando',lco:'Conversando'};
const M={msv:'Atendendo pessoas',mco:'Ensinando e produzindo conteúdo',mve:'Vendendo e negociando',mlh:'Liderando e empreendendo',mes:'Organizando e dando segurança',mcr:'Criando com as próprias mãos'};
const MONTH=['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
const words=s=>String(s).trim().split(/\s+/).filter(Boolean);
const plain=v=>v==null?'':Array.isArray(v)?v.map(plain).join('. '):typeof v==='object'?[plain(v.titulo),plain(v.texto)].filter(Boolean).join(' — '):String(v).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const stopWord=/\b(?:este|esse|o seu) (?:mapa|relatorio|material) (?:foi escrito|foi feito|foi elaborado|e um espelho|e uma lente|e um convite|se baseia)\b|\bnao (?:e|constitui|se trata de) (?:um |uma )?(?:diagnostico|previsao|veredito)\b|\b(?:feito de hipoteses|sao apenas hipoteses|deixe de lado o que nao serve|fique com o que ressoa|veja o que ressoa)\b/;
function trimMeta(value){
 const str=plain(value);
 return (str.match(/[^.!?]+[.!?]*/g)||[]).filter(x=>!stopWord.test(norm(x))).join(' ').trim();
}
function short(value,limit=65){
 const s=trimMeta(value),parts=words(s);
 if(parts.length<=limit)return s;
 const first=parts.slice(0,limit).join(' ');
 const stops=Math.max(first.lastIndexOf('. '),first.lastIndexOf('? '),first.lastIndexOf('! '));
 if(stops>first.length*.45)return first.slice(0,stops+1);
 return first.replace(/[,:;— -]+$/,'')+'…';
}
function list(a,n=3){return Array.isArray(a)?a.slice(0,n).map(x=>short(x,25)).join('  •  '):''}
function picked(values,rank,labels,i=0){const id=Array.isArray(rank)?rank[i]:null;return id&&Number(values?.[id])>0?labels[id]||'':''}
function age(d,when){if(!/^\d{4}-\d\d-\d\d/.test(String(d||''))||!when)return null;const a=new Date(when),b=String(d).split('-').map(Number);return a.getUTCFullYear()-b[0]-(a.getUTCMonth()+1<b[1]||(a.getUTCMonth()+1===b[1]&&a.getUTCDate()<b[2])?1:0)}
function text(doc,v,x,y,w,size=12,color='ink',bold=false,h=400){
 doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(size).fillColor(C[color]||color);
 doc.text(plain(v),x,y,{width:w,height:h,ellipsis:true,breakLine:false,lineGap:2});
}
function kicker(doc,v,x,y,w=600,color='orange'){text(doc,String(v||'').toUpperCase(),x,y,w,9,color,true,20)}
function box(doc,x,y,w,h,dark=false){
 doc.roundedRect(x,y,w,h,12).fill(dark?C.dark:C.paper);
 if(!dark)doc.roundedRect(x,y,w,h,12).lineWidth(.7).stroke(C.line);
}
function card(doc,label,value,x,y,w,h,opt={}){
 box(doc,x,y,w,h,!!opt.dark);
 kicker(doc,label,x+15,y+14,w-30,opt.dark?'ivory':'orange');
 const body=short(value,opt.limit||68);
 if(body)text(doc,body,x+15,y+37,w-30,opt.font||11.4,opt.dark?'ivory':'ink',false,h-48);
}
function bar(doc,label,val,x,y,w){
 kicker(doc,label,x,y,w-49,'ink');text(doc,val+'%',x+w-43,y,w,9,'orange',true,18);
 doc.roundedRect(x,y+24,w,7,3).fill(C.light);
 if(val>0)doc.roundedRect(x,y+24,Math.max(3,w*val/100),7,3).fill(C.orange);
}
function pct(score,key){if(!key||Number(score?.[key])<=0)return 0;return Math.round(Number(score[key])*100/Math.max(1,...Object.values(score).map(Number).filter(Number.isFinite)))}
function add(doc,index,total,title,section){
 doc.addPage({size:'A4',layout:'landscape',margin:0});
 doc.rect(0,0,W,H).fill(C.ivory);doc.rect(0,0,W,6).fill(C.orange);
 kicker(doc,'CAMPO GUARDIÃO',42,26,220);
 text(doc,'MAPA DO GUARDIÃO',652,28,145,9,'muted',true,14);
 doc.moveTo(42,55).lineTo(800,55).stroke(C.line);
 kicker(doc,section,42,77,710);
 doc.font('Times-Bold').fontSize(31).fillColor(C.dark).text(title,41,99,{width:752,height:54,ellipsis:true});
 doc.moveTo(42,552).lineTo(800,552).stroke(C.line);
 kicker(doc,'RECONHECER · HONRAR · ATUALIZAR',43,564,510,'muted');
 text(doc,index+' / '+total,729,562,66,9,'muted',true,16);
}
function cardPair(doc,l,r,limit=110){
 card(doc,l[0],l[1],43,169,365,331,{limit,font:12.2});
 card(doc,r[0],r[1],424,169,369,331,{limit,font:12.2});
}
function monthCard(doc,m,x,y){
 box(doc,x,y,751,115);
 kicker(doc,MONTH[(m.mes||1)-1]+'/'+m.ano,x+15,y+10,126);
 text(doc,short(m.titulo,10),x+122,y+8,605,17,'ink',true,30);
 doc.moveTo(x+15,y+39).lineTo(x+736,y+39).stroke(C.line);
 const labels=[['POTENCIAL',m.potencial],['CUIDADO',m.cuidado],['PASSO PRÁTICO',m.passo]];
 for(let j=0;j<3;j++){
  const xx=x+15+j*243;
  if(j)doc.moveTo(xx-8,y+48).lineTo(xx-8,y+103).stroke(C.line);
  kicker(doc,labels[j][0],xx,y+47,214);
  text(doc,short(labels[j][1],24),xx,y+65,216,10.5,'ink',false,43);
 }
}
async function renderCompact(m,p={}){
 const r=m.resultado||{},s=m.scores||{},sg=s.g||{},sw=s.w||{},sp=s.p||{};
 const guard=r.guardiao||{},wound=r.ferida||{},power=r.potencial||{},money=r.dinheiro||{},
 area=r.areas||{},yr=r.ano||{},plan=r.plano||{},goal=r.objetivo||{};
 const gp=m.guardiao||picked(sg,s.rg,G)||'Não indicado',gs=picked(sg,s.rg,G,1);
 const fp=m.ferida||picked(sw,s.rw,F)||'Não indicado',fs=picked(sw,s.rw,F,1);
 const pp=m.potencial||picked(sp,s.rp,P)||'Não indicado',ps=picked(sp,s.rp,P,1);
 const learn=picked(s.l||{},s.rl,L),work=picked(s.m||{},s.rm,M);
 const name=String(p.nome||'Pessoa participante').slice(0,120);
 const objective=plain(p.objetivo||''),date=m.created_at?new Date(m.created_at).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}):'';
 const months=Array.isArray(r.meses)&&r.meses.length===12&&r.meses.every(a=>Number.isInteger(a?.ano)&&Number.isInteger(a?.mes)&&a.mes>=1&&a.mes<=12);
 const total=months?18:14;
 const doc=new PDFDocument({autoFirstPage:false,layout:'landscape',size:'A4',margin:0,compress:true,
  info:{Title:'Mapa do Guardião · Edição Essencial · '+name,Author:'Campo Guardião'}});
 const pieces=[];let count=0;doc.on('data',x=>pieces.push(x));doc.on('pageAdded',()=>count++);
 const ended=new Promise((resolve,reject)=>{doc.on('end',()=>resolve(Buffer.concat(pieces)));doc.on('error',reject)});
 // 1 — capa
 doc.addPage({size:'A4',layout:'landscape',margin:0});
 doc.rect(0,0,W,H).fill(C.dark);doc.rect(0,0,9,H).fill(C.orange);
 for(let i=0;i<15;i++)doc.circle(670,222,35+i*21).opacity(.1).lineWidth(1.1).strokeColor(i%2?C.orange:C.ivory).stroke();
 doc.opacity(1);
 kicker(doc,'CAMPO GUARDIÃO · EDIÇÃO ESSENCIAL',47,52,520);
 doc.font('Times-Bold').fontSize(69).fillColor(C.ivory).text('MAPA DO',41,144,{width:595});
 doc.font('Times-Bold').fontSize(69).fillColor(C.ivory).text('GUARDIÃO',41,223,{width:643});
 text(doc,'O seu lugar de potência é onde a sua energia rende mais e custa menos.',47,357,610,25,'ivory',false,90);
 kicker(doc,'PREPARADO PARA',48,483,400);
 text(doc,name,47,505,690,18,'ivory',true,35);
 text(doc,date,47,548,300,11,'ivory',false,20);
 // 2 — abertura
 add(doc,2,total,'A pergunta que trouxe você até aqui','ABERTURA');
 card(doc,'SEU OBJETIVO',objective||'Compreender meu momento de vida',43,169,244,331,{dark:true,limit:54,font:18});
 card(doc,'SUA PRIMEIRA PERCEPÇÃO',r.abertura||r.integrada,302,169,491,331,{limit:151,font:12.4});
 // 3 — resultados visual
 add(doc,3,total,'Seu campo em um olhar','RESULTADOS DO TESTE');
 [[gp,'GUARDIÃO'],[fp,'FERIDA'],[pp,'POTENCIAL']].forEach(([v,k],i)=>card(doc,k,v,43+i*256,167,241,99,{limit:15,font:20,dark:i===0}));
 bar(doc,'GUARDIÃO · '+gp,pct(sg,s.rg?.[0]),53,314,345);
 bar(doc,'POTENCIAL · '+pp,pct(sp,s.rp?.[0]),446,314,345);
 bar(doc,'FERIDA · '+fp,pct(sw,s.rw?.[0]),53,391,345);
 text(doc,'Pontuações relativas ao próprio teste.',448,395,316,11,'muted',false,47);
 // 4 — eixo de proteção
 add(doc,4,total,'Guardião e ferida','RECONHECER');
 card(doc,'GUARDIÃO PRINCIPAL · '+gp,guard.leitura,43,166,365,248,{limit:94,font:12});
 card(doc,'FERIDA PRINCIPAL · '+fp,wound.leitura,424,166,369,248,{limit:94,font:12});
 card(doc,'SEGUNDO GUARDIÃO',gs||'Sem segundo resultado acima de zero',43,426,365,74,{limit:16});
 card(doc,'FERIDA SECUNDÁRIA',fs||'Sem segundo resultado acima de zero',424,426,369,74,{limit:16});
 // 5 — custo e cuidado
 add(doc,5,total,'O que a proteção entrega e cobra','PROTEÇÃO EM MOVIMENTO');
 card(doc,'O BENEFÍCIO DA PROTEÇÃO',guard.beneficio,43,166,365,149,{limit:50});
 card(doc,'O PREÇO QUE ELA PODE COBRAR',guard.preco,424,166,369,149,{limit:50});
 card(doc,'O QUE PRECISAVA SER CUIDADO',wound.crianca_precisou,43,328,365,173,{limit:65});
 const scene=Array.isArray(guard.cenas)?guard.cenas[0]:null;
 card(doc,scene?.titulo||'UMA SITUAÇÃO DO COTIDIANO',scene?.texto||r.cruzamento,424,328,369,173,{limit:65});
 // 6 — potencia
 add(doc,6,total,'Sua potência guardada','ATUALIZAR');
 card(doc,'POTENCIAL PRINCIPAL · '+pp,power.leitura,43,166,488,231,{limit:98,font:12.3});
 card(doc,'POTENCIAL SECUNDÁRIO',ps||'Sem segundo resultado acima de zero',543,166,250,231,{limit:25,dark:true,font:21});
 card(doc,'PRIMEIRO GESTO POSSÍVEL',power.primeiro_gesto||power.quando_livre,43,409,750,92,{limit:42});
 // 7 — trabalho dinheiro
 add(doc,7,total,'Trabalho e dinheiro','ESCOLHAS NA VIDA REAL');
 card(doc,'TRABALHO',area.trabalho?.texto,43,167,365,220,{limit:82,font:11.8});
 card(doc,'DINHEIRO',money.leitura,424,167,369,220,{limit:82,font:11.8});
 card(doc,'UM GESTO NO TRABALHO',area.trabalho?.gesto,43,400,365,101,{limit:35});
 card(doc,'UM MOVIMENTO COM O DINHEIRO',money.primeiro_passo,424,400,369,101,{limit:35});
 // 8 — corpo vínculos
 add(doc,8,total,'Relacionamentos e autocuidado','ÁREAS DA VIDA');
 card(doc,'RELACIONAMENTOS',area.relacionamentos?.texto,43,167,365,220,{limit:82,font:11.8});
 card(doc,'SAÚDE E ROTINA',area.saude?.texto,424,167,369,220,{limit:82,font:11.8});
 card(doc,'UM GESTO NOS VÍNCULOS',area.relacionamentos?.gesto,43,400,365,101,{limit:35});
 card(doc,'UM CUIDADO POSSÍVEL',area.saude?.gesto,424,400,369,101,{limit:35});
 // 9 — espiritualidade e modo
 add(doc,9,total,'Espiritualidade e aprendizagem','SENTIDO E RECURSOS');
 card(doc,'ESPIRITUALIDADE',area.espiritualidade?.texto,43,167,365,226,{limit:83,font:11.8});
 card(doc,'COMO VOCÊ APRENDE',yr.aprende?.leitura,424,167,369,226,{limit:83,font:11.8});
 card(doc,'PREFERÊNCIA DE APRENDIZAGEM',learn||'Não indicada',43,406,365,95,{limit:22,font:14});
 card(doc,'PREFERÊNCIA DE TRABALHO',work||'Não indicada',424,406,369,95,{limit:22,font:14});
 // 10 — momento
 add(doc,10,total,'Seu momento de vida','CICLOS E CONTEXTO');
 card(doc,'TEMA DO ANO',yr.energia,43,166,242,98,{limit:24,font:13});
 const years=age(p.nascimento,m.created_at);
 card(doc,'IDADE NA LEITURA',years==null?'Não informada':years+' anos',298,166,191,98,{limit:15,font:18});
 card(doc,'O QUE ESSE MOMENTO PEDE',yr.leitura,501,166,292,98,{limit:37,font:10.8});
 card(doc,'O QUE FAVORECE',list(yr.favorece,3),43,280,365,221,{limit:90});
 card(doc,'ONDE PEDE CUIDADO',list(yr.cuidado,3),424,280,369,221,{limit:90});
 let index=11;
 // 11 a 14 se houver leituras mensais
 if(months)for(let part=0;part<4;part++){
  add(doc,index++,total,'Seus próximos 12 meses · '+(part+1)+'/4','CICLOS SIMBÓLICOS');
  for(let j=0;j<3;j++)monthCard(doc,r.meses[part*3+j],43,166+j*124);
 }
 // objetivo
 add(doc,index++,total,'Sua pergunta, sua direção','LEITURA INTEGRADA');
 card(doc,'O QUE VOCÊ BUSCA',objective,43,167,750,83,{limit:37,dark:true,font:14});
 card(doc,'O QUE O MAPA RELACIONA',goal.leitura||r.integrada||r.cruzamento,43,262,485,239,{limit:109,font:12});
 card(doc,'PRÓXIMO PASSO',goal.proximo_passo||power.primeiro_gesto,541,262,252,239,{limit:72,font:11.3});
 // ação
 add(doc,index++,total,'Seu plano começa agora','72 HORAS E CINCO MINUTOS');
 cardPair(doc,['PRÓXIMAS 72 HORAS',plan.h72],['PRÁTICA DE CINCO MINUTOS',plan.min5],132);
 // 7 dias
 add(doc,index++,total,'Sete dias para experimentar','PLANO DE AÇÃO');
 for(let day=0;day<7;day++){
  const x=43+(day%4)*192,y=166+Math.floor(day/4)*173;
  card(doc,'DIA '+(day+1),Array.isArray(plan.dias)?plan.dias[day]:'',x,y,179,153,{limit:43,font:10.7});
 }
 card(doc,'LEMBRETE','Pequenas ações repetidas podem construir uma nova referência para o seu Guardião.',43+3*192,339,179,153,{dark:true,limit:35});
 // final
 add(doc,index++,total,'O que você escolhe sustentar','ENCERRAMENTO');
 card(doc,'SUA FRASE DE ATUALIZAÇÃO',r.frase_nova,43,166,750,151,{limit:65,font:17,dark:true});
 card(doc,'UMA PERGUNTA PARA LEVAR',r.pergunta,43,331,750,170,{limit:65,font:16});
 kicker(doc,'LEITURA COMPLETA DISPONÍVEL NA SUA CONTA',45,520,733,'muted');
 if(count!==total)throw Error('Paginação essencial inconsistente: '+count+' / '+total);
 doc.end();return ended;
}
module.exports={renderCompact,short,trimMeta};