/* MCL-1: cálculos NUMÉRICOS determinísticos (não efemérides astronômicas).
 * Reproduz as convenções publicadas no Artifact Ciclos de Vida MCL-1:
 * redução 1–9; ano pessoal por ano civil, ou por aniversário quando explicitado;
 * mês pessoal = reduzir(ano pessoal + número do mês).
 */
'use strict';
const leap = y => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
const dim = (y,m) => [31,leap(y)?29:28,31,30,31,30,31,31,30,31,30,31][m-1]||0;
function parseDate(input) {
  const text=String(input||'').trim();
  let d,m,y,match;
  if((match=/^(\d{4})-(\d\d)-(\d\d)$/.exec(text))){y=+match[1];m=+match[2];d=+match[3];}
  else if((match=/^(\d\d)\/(\d\d)\/(\d{4})$/.exec(text))){d=+match[1];m=+match[2];y=+match[3];}
  else return null;
  if(y<1800||y>2100||m<1||m>12||d<1||d>dim(y,m))return null;
  return {y,m,d};
}
function toDate(d){return [String(d.y).padStart(4,'0'),String(d.m).padStart(2,'0'),String(d.d).padStart(2,'0')].join('-');}
const dateKey = a => a.y*10000+a.m*100+a.d;
function reduced(n) {
  if(!Number.isSafeInteger(n)||n<0)throw new Error('Número inválido.');
  while(n>=10)n=String(n).split('').reduce((s,c)=>s+Number(c),0);
  return n;
}
const digitSum=(...values)=>values.map(String).join('').split('').reduce((sum,part)=>sum+Number(part),0);
function birthAnniversary(b,y,leapPolicy='28'){
  if(b.m===2&&b.d===29&&!leap(y))
    return {y,m:leapPolicy==='1'?3:2,d:leapPolicy==='1'?1:28};
  return {y,m:b.m,d:b.d};
}
function age(b,r,leapPolicy='28'){
  return r.y-b.y-(dateKey(r)<dateKey(birthAnniversary(b,r.y,leapPolicy))?1:0);
}
function annualYear(b,r,anchor='ano_civil',leapPolicy='28'){
  return anchor==='aniversario'?r.y-(dateKey(r)<dateKey(birthAnniversary(b,r.y,leapPolicy))?1:0):r.y;
}
function annualValue(b,y){return reduced(digitSum(b.d,b.m,y));}
const monthValue = (annual,m)=>reduced(annual+m);
function calcularCiclos(nascimento,referencia,opts={}) {
  const b=parseDate(nascimento),r=parseDate(referencia);
  if(!b||!r||dateKey(r)<dateKey(b))return null;
  const anchor=opts.marco==='aniversario'?'aniversario':'ano_civil';
  const leapPolicy=opts.bissexto==='1'?'1':'28';
  const idade=age(b,r,leapPolicy);
  if(idade<0||idade>120)return null;
  const personalYearNumber=annualYear(b,r,anchor,leapPolicy);
  const nowAnnual=annualValue(b,personalYearNumber);
  const meses=[];
  for(let i=0;i<12;i++){
    const absolute=r.y*12+(r.m-1)+i;
    const ano=Math.floor(absolute/12),mes=absolute%12+1;
    const target={y:ano,m:mes,d:1};
    // No marco de aniversário: antes do aniversário, mantém o ano pessoal anterior.
    // Num mês que contém o aniversário, o número representa o início do mês;
    // essa ambiguidade é sinalizada na saída, sem fingir que a transição ocorreu no dia 1.
    const yearN=annualYear(b,target,anchor,leapPolicy);
    const mudaNoMes=anchor==='aniversario'&&b.m===mes&&b.d!==1;
    const valorAnual=annualValue(b,yearN);
    meses.push({ano,mes,ano_pessoal:valorAnual,mes_pessoal:monthValue(valorAnual,mes),transicao_no_aniversario:mudaNoMes});
  }
  return {
    metodo:'MCL-1 · convenção numerológica simbólica',
    nascimento:toDate(b),referencia:toDate(r),marco_ano:anchor,
    idade,setenio:Math.floor(idade/7)+1,quinquenio:Math.floor(idade/5)+1,
    numero_natal:reduced(digitSum(b.d,b.m,b.y)),
    ano_pessoal:nowAnnual,
    mes_pessoal:monthValue(nowAnnual,r.m),
    proximos_12_meses:meses,
    aviso:'Os números são calculados por regra matemática definida; seus significados são interpretações simbólicas, não previsões verificáveis. Trânsitos, ascendente e casas exigem efemérides e localização.'
  };
}
module.exports={calcularCiclos,parseDate,reduced,annualValue,monthValue,age};
