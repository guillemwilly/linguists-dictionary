/* Only source-linked, individually attributed Commons recordings. No synthesis. */
(()=>{
 const previousRender=render,previousLookup=lookup,previousHome=goHome;
 const cache=new Map(),attempts=new Map();let current=null;
 const plain=html=>{const d=new DOMParser().parseFromString(String(html||''),'text/html');d.querySelectorAll('script,style').forEach(n=>n.remove());return clean(d.body.textContent)};
 const safe=(value,host)=>{try{const u=new URL(value.startsWith('//')?'https:'+value:value);return u.protocol==='https:'&&u.hostname===host?u.href:''}catch{return ''}};
 function candidates(sec,code,word){
  const heads=[...sec.querySelectorAll('h3,h4,h5')].map(n=>clean(n.textContent));
  if(code==='zh')return {state:'ambiguous',reason:'Chinese variety-specific recordings are not yet mapped safely.'};
  const words=[...new Set([...sec.querySelectorAll('strong.headword')].filter(n=>n.lang===code).map(n=>clean(n.textContent)))];
  if(heads.filter(t=>/^Etymology/.test(t)).length>1||heads.filter(t=>/^Pronunciation/.test(t)).length>1||words.length>1||!words.length||unstress(words[0])!==unstress(word))return {state:'ambiguous',reason:'A recording cannot be assigned safely to this headword or pronunciation. Check the source.'};
  const found=[];let on=false;
  for(const node of sec.children){
   const h=node.querySelector('h3,h4,h5')||(node.matches('h3,h4,h5')?node:null);
   if(h){on=/^Pronunciation/.test(clean(h.textContent));continue}
   if(!on)continue;
   for(const a of node.querySelectorAll('audio[data-mwprovider="wikimediacommons"]')){
    const file=a.getAttribute('data-mwtitle'),table=a.closest('.audiotable');if(!file||!table)continue;
    const label=clean(table.querySelector('td')?.textContent).replace(/^Audio\s*/,'').replace(/:\s*$/,'').replace(/^\((.*)\)$/,'$1');
    if(/synthetic|text.to.speech|\bTTS\b/i.test(label))continue;
    if(!found.some(x=>x.file===file))found.push({file,label,sources:[...a.querySelectorAll('source')].map(s=>({url:safe(s.getAttribute('src')||'','upload.wikimedia.org'),type:s.getAttribute('type')||''})).filter(s=>s.url)});
   }
  }
  return {state:found.length?'found':'none',items:found.slice(0,4)};
 }
 async function metadata(item){
  const url='https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',titles:'File:'+item.file,prop:'imageinfo',iiprop:'url|extmetadata|mime',format:'json',origin:'*'});
  const d=await j(url),page=Object.values(d.query?.pages||{})[0],info=page?.imageinfo?.[0],m=info?.extmetadata||{};
  const creator=plain(m.Artist?.value),license=plain(m.LicenseShortName?.value),licenseUrl=String(m.LicenseUrl?.value||'').replace(/^http:/,'https:');
  if(!creator||!license||!/^https:\/\/creativecommons\.org\/(licenses\/(by|by-sa)\/|publicdomain\/(zero|mark)\/)/.test(licenseUrl)||/synthetic|text.to.speech|AI.generated/i.test(plain(m.ImageDescription?.value)))return null;
  const source=safe(info.descriptionurl||'','commons.wikimedia.org'),original=safe(info.url||'','upload.wikimedia.org');if(!source||!original)return null;
  const norm=t=>t.replace(/_/g,' ').replace(/^./,c=>c.toLowerCase());
  const file=norm(page.title.replace(/^File:/,''));
  const sources=item.sources.filter(s=>{const u=new URL(s.url),parts=decodeURIComponent(u.pathname).split('/');return norm(parts[u.pathname.includes('/transcoded/')?parts.length-2:parts.length-1])===file});
  sources.sort((a,b)=>(b.type==='audio/mpeg')-(a.type==='audio/mpeg'));
  sources.unshift({url:original,type:info.mime==='application/ogg'?'audio/ogg':info.mime});
  return {...item,file:page.title,creator,license,licenseUrl,source,credit:plain(m.Credit?.value),attribution:plain(m.Attribution?.value),sources};
 }
 async function recordings(e,code){
  const page=await parsePage('en',e.core.title||e.base);if(!page)throw new Error('Source unavailable');
  const sec=section(page.doc,[LANGS[code].en]);if(!sec)throw new Error('Language section unavailable');
  const c=candidates(sec,code,e.word);if(c.state!=='found')return c;
  const loaded=await Promise.allSettled(c.items.map(metadata)),items=loaded.filter(x=>x.status==='fulfilled'&&x.value).map(x=>x.value);
  return {state:items.length?'ready':loaded.some(x=>x.status==='rejected')?'failed':'unverified',items,partialFailure:loaded.some(x=>x.status==='rejected')};
 }
 function stop(){if(current){current.pause();current.removeAttribute('src');current.replaceChildren();current.load();current.remove();current=null}}
 function play(r,button,status,box){
  stop();const audio=document.createElement('audio');audio.preload='none';audio.hidden=true;audio.dataset.recording=r.file;
  const supported=r.sources.filter(s=>!s.type||audio.canPlayType(s.type));const offset=(attempts.get(r.file)||0)%Math.max(1,supported.length);
  if(!supported.length){status.textContent='Not available';return}
  const mediaURL=new URL(supported[offset].url);mediaURL.search='';audio.src=mediaURL.href;box.append(audio);current=audio;
  button.dataset.playLabel=button.dataset.playLabel||button.textContent;button.textContent=button.dataset.playLabel;button.dataset.playAria=button.dataset.playAria||button.getAttribute('aria-label')||button.dataset.playLabel;button.setAttribute('aria-label',button.dataset.playAria);status.textContent='Loading…';button.disabled=true;
  audio.onplaying=()=>{status.textContent='Playing';button.disabled=false};
  audio.onended=()=>{status.textContent='';button.disabled=false};
  const failed=()=>{if(current!==audio)return;attempts.set(r.file,offset+1);audio.pause();status.textContent='Not available';button.textContent='Retry';button.setAttribute('aria-label','Retry audio');button.disabled=false};audio.onerror=failed;
  setTimeout(()=>{if(current===audio&&audio.readyState<2)failed()},12000);
  audio.play().catch(failed);
 }
 function attach(e,code){
  const sub=document.querySelector('#main .col-main>.sub');if(!sub)return;
  const box=document.createElement('span');box.className='pron-audio';
  box.innerHTML='<button type="button" class="recording-main" disabled>Audio…</button><details class="recording-details" hidden><summary>Recordings &amp; credits</summary><div class="recording-content">Checking source recordings…</div></details><span class="recording-status" role="status" aria-live="polite"></span>';sub.append(box);
  if(e.partial)return;
  const key=code+':'+e.core.title+':'+e.word;
  function load(){
   if(!cache.has(key))cache.set(key,recordings(e,code).catch(()=>({state:'failed'})));
   cache.get(key).then(result=>{
    if(!box.isConnected)return;
    const button=box.querySelector('.recording-main'),content=box.querySelector('.recording-content'),status=box.querySelector('.recording-status');
    box.dataset.state=result.state;
    box.querySelector('.audio-retry')?.remove();
    const details=box.querySelector('.recording-details');
    if(result.state!=='ready'){
     button?.remove();details.hidden=true;details.open=false;content.replaceChildren();
     status.textContent='Not available';status.setAttribute('aria-label','Audio not available');
     if(result.state==='failed'){
      const retry=document.createElement('button');retry.type='button';retry.className='audio-retry';retry.textContent='Retry';retry.setAttribute('aria-label','Retry audio');
      retry.onclick=()=>{box.removeAttribute('data-state');cache.delete(key);retry.disabled=true;status.textContent='Loading…';load()};box.append(retry);
     }
     return;
    }
    details.hidden=false;status.textContent='';status.removeAttribute('aria-label');
    // A retry after a failed request needs a fresh main control.
    let main=button;if(!main){main=document.createElement('button');main.type='button';main.className='recording-main';box.prepend(main)}
    main.disabled=false;main.textContent='Listen';main.setAttribute('aria-label','Listen to headword '+e.word+(result.items[0].label?', '+result.items[0].label:''));main.onclick=()=>play(result.items[0],main,status,box);
    content.innerHTML='<p>Headword recording: <strong lang="'+code+'">'+esc(e.word)+'</strong>'+(e.from?' (not the searched form '+esc(e.from.form)+')':'')+'.</p>'+result.items.map((r,i)=>'<div class="recording-credit"><button type="button" data-recording="'+i+'">Listen'+(r.label?' · '+esc(r.label):'')+'</button><p>'+esc(r.creator)+'</p>'+(r.attribution&&r.attribution!==r.creator?'<p>'+esc(r.attribution)+'</p>':'')+(r.credit?'<p>'+esc(r.credit)+'</p>':'')+'<a href="'+esc(r.source)+'" target="_blank" rel="noopener">Recording source</a> · <a href="'+esc(r.licenseUrl)+'" target="_blank" rel="noopener">'+esc(r.license)+'</a></div>').join('')+'<p>Unedited recording; browser format conversion may be supplied by Wikimedia. <a href="https://en.wiktionary.org/wiki/'+encodeURIComponent(e.core.title||e.base)+'#'+LANGS[code].en+'" target="_blank" rel="noopener">Pronunciation source</a></p>';
    content.querySelectorAll('[data-recording]').forEach(b=>b.onclick=()=>play(result.items[+b.dataset.recording],b,status,box));
   });
  }
  load();
 }
 render=function(e,code,anim=true){stop();previousRender(e,code,anim);attach(e,code)};
 lookup=function(...args){stop();return previousLookup(...args)};
 goHome=function(...args){stop();return previousHome(...args)};document.querySelector('#home').onclick=goHome;
 function restore(){if(current&&!current.isConnected)stop();const h=document.querySelector('#main .col-main .hw');if(!h||document.querySelector('.pron-audio'))return;const e=Object.values(st.cache).filter(e=>!e.partial&&e.code===h.lang&&e.word===h.textContent).sort((a,b)=>b.at-a.at)[0];if(e)attach(e,e.code)}
 new MutationObserver(restore).observe(document.querySelector('#main'),{childList:true,subtree:true});restore();
})();
