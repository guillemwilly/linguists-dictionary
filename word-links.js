/* Read-through word links. Source credits and saved cards are left intact. */
(()=>{
 const main=document.querySelector('#main');
 const segments=new Map();
 function words(text,lang){
  if(typeof Intl.Segmenter==='function'){
   if(!segments.has(lang))segments.set(lang,new Intl.Segmenter(lang,{granularity:'word'}));
   const parts=[...segments.get(lang).segment(text)].map(p=>({text:p.segment,word:p.isWordLike&&/\p{L}/u.test(p.segment)}));
   const out=[];
   for(let i=0;i<parts.length;i++){
    let p={...parts[i]};
    while(p.word&&i+2<parts.length&&/^['’ʼ‐‑-]$/.test(parts[i+1].text)&&parts[i+2].word){p.text+=parts[i+1].text+parts[i+2].text;i+=2}
    out.push(p);
   }
   return out;
  }
  // No guessed CJK character boundaries: an unspaced run stays one lookup.
  const re=/[\p{L}\p{M}]+(?:['’ʼ‐‑-][\p{L}\p{M}]+)*/gu,out=[];let at=0;
  for(const m of text.matchAll(re)){if(m.index>at)out.push({text:text.slice(at,m.index)});out.push({text:m[0],word:true});at=m.index+m[0].length}
  if(at<text.length)out.push({text:text.slice(at)});return out;
 }
 function linkText(root,lang){
  const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
  while(walk.nextNode()){
   const node=walk.currentNode;
   if(node.parentElement.closest('a,button,.lbl,.k,.sentence-credit,small,script,style'))continue;
   nodes.push(node);
  }
  for(const node of nodes){
   const inherited=node.parentElement.closest('[lang]')?.getAttribute('lang');
   const code=LANGS[inherited]?inherited:lang;
   const parts=words(node.nodeValue,code);if(!parts.some(p=>p.word))continue;
   const fragment=document.createDocumentFragment();
   for(const part of parts){
    if(!part.word){fragment.append(document.createTextNode(part.text));continue}
    const a=document.createElement('a');a.className='lookup-word';a.textContent=part.text;a.lang=code;
    a.dataset.word=part.text;a.dataset.language=code;
    a.href='?q='+encodeURIComponent(part.text)+'&lang='+code;
    a.title='Look up '+part.text+' · '+LANGS[code].name+(code==='zh'?'. Chinese boundaries use browser segmentation; without it, an unspaced run stays together.':'');
    fragment.append(a);
   }
   node.replaceWith(fragment);
  }
 }
 function decorate(){
  const code=main.querySelector('.col-main .hw')?.getAttribute('lang');if(!LANGS[code])return;
  main.querySelectorAll('.pos .g').forEach(n=>{n.lang='en';linkText(n,'en')});
  main.querySelectorAll('.native:not(.source-state)').forEach(n=>{n.lang=code;linkText(n,code)});
  // The existing Tatoeba request translates English examples into Spanish.
  if(code==='en')main.querySelectorAll('.sentences .ex>i').forEach(n=>n.lang='es');
  main.querySelectorAll('.pos .ex,.sentences .ex').forEach(n=>linkText(n,code));
 }
 new MutationObserver(decorate).observe(main,{childList:true,subtree:true});decorate();
 let dragged=false,start=null;
 main.addEventListener('pointerdown',e=>{dragged=false;start={x:e.clientX,y:e.clientY}});
 main.addEventListener('pointerup',e=>{if(start)dragged=Math.hypot(e.clientX-start.x,e.clientY-start.y)>5;start=null});
 main.addEventListener('click',e=>{
  const a=e.target.closest('a.lookup-word');if(!a||e.defaultPrevented||e.button||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
  const selected=window.getSelection();
  if(e.detail!==0&&(dragged||(selected&&!selected.isCollapsed))){e.preventDefault();return}
  e.preventDefault();lookup(a.dataset.word,a.dataset.language);
 });

 // Save the previous entry before lookup's replaceState, then restore without Auto-add.
 const lookupPrevious=lookup,homePrevious=goHome,autoPrevious=maybeAuto;
 let restoring=false,restoreSequence=-1,nav=0;
 const remember=()=>{try{history.replaceState({...history.state,dictionaryScroll:scrollY},'',location.href)}catch{}};
 maybeAuto=function(e,code){if(seq!==restoreSequence)return autoPrevious(e,code)};
 lookup=async function(raw,forced){
  const returning=restoring;restoring=false;const id=++nav;
  const [word,code]=forced?[raw,forced]:detect(raw);
  const url=new URL(location.href);url.search='?q='+encodeURIComponent(unstress(word).trim())+(code?'&lang='+code:'');url.hash='';
  if(!returning){remember();if(url.href!==location.href)try{history.pushState(null,'',url)}catch{}}
  if(returning)restoreSequence=seq+1;
  document.querySelector('#q').value=word;
  await lookupPrevious(raw,forced);
  if(id===nav&&!returning){scrollTo(0,0);remember()}
 };
 goHome=function(){remember();if(location.search)try{history.pushState(null,'',location.pathname)}catch{}++nav;homePrevious();scrollTo(0,0);remember()};
 document.querySelector('#home').onclick=goHome;
 addEventListener('popstate',async e=>{
  const state=e.state,params=new URLSearchParams(location.search),q=params.get('q'),lang=params.get('lang');
  if(q){restoring=true;const pending=lookup(q,LANGS[lang]?lang:undefined),id=nav;await pending;if(id!==nav)return}
  else{++nav;homePrevious()}
  scrollTo(0,state?.dictionaryScroll||0);remember();
 });
})();
