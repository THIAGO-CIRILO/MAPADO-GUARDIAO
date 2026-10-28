(() => {
 const carousel=document.querySelector('.testimonial-carousel');
 if(!carousel)return;
 const track=carousel.querySelector('#review-track');
 const slides=Array.from(track.children);
 const motionQuery=window.matchMedia('(prefers-reduced-motion: reduce)');
 const hoverQuery=window.matchMedia('(hover: hover)');
 let timer,hovered=false,focused=false,touching=false,visible=false;
 const reduced=()=>motionQuery.matches||document.documentElement.dataset.reduceMotion==='true';
 function syncRotation(){
  clearInterval(timer);
  if(!reduced()&&!hovered&&!focused&&!touching&&visible&&!document.hidden)timer=setInterval(()=>move(1),6000);
 }
 function move(direction){
  const left=track.getBoundingClientRect().left;
  let current=0,distance=Infinity;
  slides.forEach((slide,i)=>{const d=Math.abs(slide.getBoundingClientRect().left-left);if(d<distance){current=i;distance=d;}});
  const atEnd=track.scrollLeft+track.clientWidth>=track.scrollWidth-4;
  let next=current+direction;
  if(direction>0&&atEnd)next=0;
  if(direction<0&&track.scrollLeft<=4)next=slides.length-1;
  next=(next+slides.length)%slides.length;
  const offset=slides[next].getBoundingClientRect().left-left+track.scrollLeft-4;
  track.scrollTo({left:offset,behavior:reduced()?'auto':'smooth'});
 }
 track.addEventListener('focusin',()=>{focused=true;syncRotation();});
 track.addEventListener('focusout',event=>{focused=track.contains(event.relatedTarget);syncRotation();});
 track.addEventListener('mouseenter',()=>{if(hoverQuery.matches){hovered=true;syncRotation();}});
 track.addEventListener('mouseleave',()=>{hovered=false;syncRotation();});
 track.addEventListener('pointerdown',()=>{touching=true;syncRotation();},{passive:true});
 window.addEventListener('pointerup',()=>{touching=false;syncRotation();},{passive:true});
 window.addEventListener('pointercancel',()=>{touching=false;syncRotation();},{passive:true});
 track.addEventListener('keydown',event=>{if(event.target===track&&(event.key==='ArrowRight'||event.key==='ArrowLeft')){event.preventDefault();move(event.key==='ArrowRight'?1:-1);}});
 document.addEventListener('visibilitychange',syncRotation);
 motionQuery.addEventListener('change',syncRotation);
 new MutationObserver(syncRotation).observe(document.documentElement,{attributes:true,attributeFilter:['data-reduce-motion']});
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)slides.forEach(slide=>{slide.querySelector('img').loading='eager';});syncRotation();},{threshold:.1}).observe(carousel);
 else visible=true;
 syncRotation();
})();
