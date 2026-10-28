(() => {
 const root=document.documentElement;
 const storageKey='thiago-cervi-reading-preferences-v1';
 let state={scale:1,contrast:false,motion:false};
 try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved&&typeof saved==='object'){state.scale=Math.min(2,Math.max(1,Number(saved.scale)||1));state.contrast=saved.contrast===true;state.motion=saved.motion===true;}}catch{}
 const status=document.querySelector('#access-status');
 const increase=document.querySelector('[data-text="increase"]');
 const decrease=document.querySelector('[data-text="decrease"]');
 const contrast=document.querySelector('#contrast-toggle');
 const motion=document.querySelector('#motion-toggle');
 function apply(announce=false){
  const percent=Math.round(state.scale*100);
  root.style.fontSize=percent+'%';
  root.dataset.readingLarge=String(state.scale>1.25);
  root.dataset.contrast=state.contrast?'high':'default';
  root.dataset.reduceMotion=String(state.motion);
  document.querySelector('#text-size').textContent=percent+'%';
  increase.disabled=state.scale>=2;decrease.disabled=state.scale<=1;
  contrast.setAttribute('aria-pressed',String(state.contrast));motion.setAttribute('aria-pressed',String(state.motion));
  if(announce)status.textContent=`Texto em ${percent}%. Alto contraste ${state.contrast?'ativado':'desativado'}. Redução de movimento ${state.motion?'ativada':'desativada'}.`;
  try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{}
 }
 document.querySelectorAll('[data-text]').forEach(button=>button.addEventListener('click',()=>{const action=button.dataset.text;state.scale=action==='reset'?1:Math.min(2,Math.max(1,state.scale+(action==='increase'?.125:-.125)));apply(true);}));
 contrast.addEventListener('click',()=>{state.contrast=!state.contrast;apply(true)});
 motion.addEventListener('click',()=>{state.motion=!state.motion;apply(true)});
 document.querySelectorAll('a[target="_blank"]').forEach(link=>{const note=document.createElement('span');note.className='sr-only';note.textContent=' (abre em nova aba)';link.append(note)});
 apply();
})();
