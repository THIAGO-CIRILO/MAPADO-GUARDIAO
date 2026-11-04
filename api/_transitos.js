// Posições astronômicas calculadas no servidor. A interpretação das estações é simbólica.
'use strict';
const Astro=require('astronomy-engine');
const {calcularCiclos,parseDate,age}=require('./_ciclos.js');
const nomes={Sun:'Sol',Moon:'Lua',Mercury:'Mercúrio',Venus:'Vênus',Mars:'Marte',Jupiter:'Júpiter',Saturn:'Saturno',Uranus:'Urano',Neptune:'Netuno',Pluto:'Plutão',Asc:'Ascendente',MC:'Meio do Céu'};
const corpos=Object.keys(nomes).filter(k=>!['Asc','MC'].includes(k));
const lentos=['Jupiter','Saturn','Uranus','Neptune','Pluto'];
const aspectos=[[0,'conjunção'],[60,'sextil'],[90,'quadratura'],[120,'trígono'],[180,'oposição']];
const areas=['identidade','dinheiro','comunicacao','familia','criatividade','rotina','relacionamentos','intimidade','proposito','carreira','coletivos','interioridade'];
const norm=x=>((x%360)+360)%360;
const delta=(a,b)=>Math.abs(((a-b+540)%360)-180);
const iso=d=>d.toISOString().slice(0,10);
const round=(n,p=4)=>Number(n.toFixed(p));
function longitude(corpo,date){return norm(Astro.Ecliptic(Astro.GeoVector(corpo,date,true)).elon);}
function angulos(date,lat,lon){
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>=89||Math.abs(lon)>180)return {};
 const r=Math.PI/180,theta=norm(Astro.SiderealTime(date)*15+lon)*r,phi=lat*r,eps=Astro.e_tilt(Astro.MakeTime(date)).tobl*r;
 const A=Math.cos(phi)*Math.cos(theta),B=Math.cos(phi)*Math.sin(theta)*Math.cos(eps)+Math.sin(phi)*Math.sin(eps);
 let asc=Math.atan2(-A,B),east=-Math.cos(asc)*Math.sin(theta)+Math.sin(asc)*Math.cos(eps)*Math.cos(theta);
 if(Math.abs(east)<1e-9)return {};
 if(east<0)asc+=Math.PI;
 return {Asc:norm(asc/r),MC:norm(Math.atan2(Math.sin(theta),Math.cos(theta)*Math.cos(eps))/r)};
}
function nascimentoUTC(nascimento,pessoa={}){
 const b=parseDate(nascimento);if(!b)throw new Error('Data de nascimento inválida.');
 const hora=typeof pessoa.hora==='string'?pessoa.hora.trim():'';
 const h=/^(\d{2}):(\d{2})(?::\d{2})?$/.exec(hora);
 const tz=typeof pessoa.tz==='number'?pessoa.tz:typeof pessoa.tz==='string'&&pessoa.tz.trim()?Number(pessoa.tz):NaN;
 const exata=!!h&&Number(h[1])<24&&Number(h[2])<60&&Number.isFinite(tz)&&Math.abs(tz)<=14;
 // Sem hora/fuso confiáveis: meio do dia UTC; Lua e ângulos não são usados nos trânsitos.
 const utc=exata?Date.UTC(b.y,b.m-1,b.d,+h[1],+h[2])-((tz+(pessoa.dst===true?1:0))*3600000):Date.UTC(b.y,b.m-1,b.d,12);
 return {date:new Date(utc),hora_confiavel:exata};
}
const cache=new Map();
function calcularTransitos(nascimento,referencia,pessoa={}){
 const ciclos=calcularCiclos(nascimento,referencia);if(!ciclos)throw new Error('Não consegui calcular o período da leitura.');
 const key=JSON.stringify([nascimento,referencia,pessoa.hora,pessoa.tz,pessoa.dst,pessoa.lat,pessoa.lon]);
 if(cache.has(key))return structuredClone(cache.get(key));
 const birth=nascimentoUTC(nascimento,pessoa),natal={};
 for(const body of corpos)if(body!=='Moon'||birth.hora_confiavel)natal[body]=longitude(body,birth.date);
 const number=v=>v===null||v===undefined||v===''?NaN:Number(v);
 if(birth.hora_confiavel)Object.assign(natal,angulos(birth.date,number(pessoa.lat),number(pessoa.lon)));
 const refSign=Math.floor((natal.Asc??natal.Sun)/30);
 const house=lon=>(Math.floor(lon/30)-refSign+12)%12+1;
 const start=new Date(referencia+'T12:00:00.000Z');
 const last=ciclos.proximos_12_meses.at(-1),end=new Date(Date.UTC(last.ano,last.mes,0,12));
 const active=new Map(),events=[];
 const weight={Sun:3,Moon:3,Asc:3,MC:3,Mercury:2,Venus:2,Mars:2,Jupiter:1,Saturn:1,Uranus:.5,Neptune:.5,Pluto:.5};
 for(let d=new Date(start);d<=end;d.setUTCDate(d.getUTCDate()+1)){
  const date=new Date(d),seen=new Set();
  for(const body of lentos){
   const lon=longitude(body,date),h=house(lon),orb=body==='Jupiter'||body==='Saturn'?3:2;
   for(const [target,targetLon] of Object.entries(natal)){
    const separation=delta(lon,targetLon);
    for(const [angle,label] of aspectos){
     const distance=Math.abs(separation-angle);if(distance>orb)continue;
     const id=[body,target,angle].join('-');seen.add(id);
     let ev=active.get(id);
     if(!ev){ev={id:'tr-'+id+'-'+iso(date),transitante:nomes[body],natal:nomes[target],aspecto:label,angulo:angle,orbe_limite:orb,inicio:iso(date),fim:iso(date),em_andamento_no_inicio:iso(date)===iso(start),dias:[],prioridade:weight[target]||1};active.set(id,ev);}
     ev.fim=iso(date);ev.dias.push({data:iso(date),orbe:distance,casa:h});
    }
   }
  }
  for(const [id,ev] of active)if(!seen.has(id)){events.push(ev);active.delete(id);}
 }
 for(const ev of active.values()){ev.continua_apos_periodo=true;events.push(ev);}
 const selected=new Map();
 const meses=ciclos.proximos_12_meses.map(m=>{
  const prefix=m.ano+'-'+String(m.mes).padStart(2,'0');
  const ranked=events.map(ev=>{
   const days=ev.dias.filter(x=>x.data.startsWith(prefix));if(!days.length)return null;
   const nearest=days.reduce((a,b)=>a.orbe<b.orbe?a:b);
   return {ev,days,nearest,score:ev.prioridade*(1.25-nearest.orbe/ev.orbe_limite)};
  }).filter(Boolean).sort((a,b)=>b.score-a.score||a.ev.id.localeCompare(b.ev.id)).slice(0,4);
  for(const x of ranked)if(!selected.has(x.ev.id)){
   const best=x.ev.dias.reduce((a,b)=>a.orbe<b.orbe?a:b);
   selected.set(x.ev.id,{id:x.ev.id,transitante:x.ev.transitante,natal:x.ev.natal,aspecto:x.ev.aspecto,angulo:x.ev.angulo,orbe_limite:x.ev.orbe_limite,
    inicio:x.ev.inicio,fim:x.ev.fim,aproximacao_maior:best.data,orbe_minimo:round(best.orbe),casa_transitada:best.casa,area:areas[best.casa-1],
    em_andamento_no_inicio:x.ev.em_andamento_no_inicio,continua_apos_periodo:!!x.ev.continua_apos_periodo});
  }
  const mid=prefix+'-15',c=calcularCiclos(nascimento,mid<referencia?referencia:mid),b=parseDate(nascimento);
  const leap=m.ano%4===0&&(m.ano%100!==0||m.ano%400===0);
  const anniversary=new Date(Date.UTC(m.ano,b.m-1,b.m===2&&b.d===29&&!leap?28:b.d,12)),a=m.ano-b.y;
  return {...m,idade:c.idade,setenio:c.setenio,faixa_setenio:[(c.setenio-1)*7,c.setenio*7],
   transicao_setenio:m.mes===b.m&&a%7===0&&anniversary>=start?{data:iso(anniversary),novo_setenio:a/7+1}:null,
   base_numerologica:'num-'+prefix,base_setenio:'set-'+prefix,
   transitos:ranked.map(x=>({id:x.ev.id,de:x.days[0].data,ate:x.days.at(-1).data,orbe_minimo:round(x.nearest.orbe)}))};
 });
 const result={versao:1,metodo:'Posições geocêntricas tropicais calculadas com Astronomy Engine 2.1.19',referencia,inicio:iso(start),fim:iso(end),hora_confiavel:birth.hora_confiavel,
  sistema_casas:natal.Asc===undefined?'casas solares':'signos inteiros a partir do Ascendente',
  convencao_janelas:'Amostras diárias às 12h UTC; intervalos dentro do período estudado. Datas de aproximação são aproximadas ao dia; não são previsões de acontecimentos.',
  convencao_estacoes:'Inverno, Primavera, Verão e Outono são sínteses simbólicas do Método Campo Guardião, diferentes das estações do calendário.',
  natal:Object.fromEntries(Object.entries(natal).map(([k,v])=>[nomes[k],{longitude:round(v),casa:house(v),area:areas[house(v)-1]}])),
  ciclos_atual:{idade:ciclos.idade,setenio:ciclos.setenio,faixa_setenio:[(ciclos.setenio-1)*7,ciclos.setenio*7],ano_pessoal:ciclos.ano_pessoal,mes_pessoal:ciclos.mes_pessoal},
  transitos:[...selected.values()],meses};
 if(cache.size>=12)cache.delete(cache.keys().next().value);cache.set(key,result);
 return structuredClone(result);
}
module.exports={calcularTransitos,longitude,angulos,nascimentoUTC};
