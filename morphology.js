/* Explicit source evidence only. No word splitting, stemming or inferred families. */
(()=>{
 const previousExtract=extractEn,previousRender=render;
 const text=n=>clean(n.textContent).replace(/[\u200e\u200f]/g,'');
 function heading(n){const h=n.matches('h2,h3,h4,h5,h6')?n:n.querySelector('h2,h3,h4,h5,h6');return h?{name:text(h),level:+h.tagName.slice(1),id:h.id}:null}
 function term(node,code){
  const lang=node.getAttribute('lang');if(lang!==code||node.closest('.tr')||(code==='zh'&&!node.classList.contains('Hans')))return null;
  const a=node.matches('a')?node:node.querySelector('a[href^="/wiki/"]');if(!a)return null;
  const word=text(node),href=a.getAttribute('href')||'';if(!word||word.length>60||!href.startsWith('/wiki/')||/\/wiki\/(?:Appendix|Category|Reconstruction|Help|Wiktionary):/.test(href))return null;
  return {word,lookup:unstress(word),kind:/^-.*-$/.test(word)?'affix':/^-/.test(word)?'suffix':/-$/.test(word)?'prefix':'base'};
 }
 function extract(sec,code){
  const result={analyses:[],derived:[],multiple:false};const kids=[...sec.children];
  const etymologies=kids.filter(x=>/^Etymology/.test(heading(x)?.name||''));
  // Do not merge unrelated homonyms into a single family.
  if(etymologies.length>1){result.multiple=true;return result}
  for(let i=0;i<kids.length;i++){
   const h=heading(kids[i]);if(!h)continue;
   if(/^Etymology/.test(h.name)){
    for(let j=i+1;j<kids.length&&!heading(kids[j]);j++){
     if(kids[j].tagName!=='P')continue;const p=kids[j],raw=text(p);
     const marker=raw.match(/(?:Synchronically|(?:By )?surface analysis)[,:]?\s*/i);
     const evidence=marker?raw.slice(marker.index):raw;
     // Accept a short explicit plus analysis, not a historical narrative or alternatives.
     if(!evidence.includes('+')||evidence.length>320||/\b(or|possibly|perhaps|probably|uncertain|compare|cognate|borrowed|inherited)\b/i.test(evidence))continue;
     const copy=p.cloneNode(true);
     if(marker){let reached=false;for(const node of [...copy.childNodes]){if(!reached&&node.textContent.match(/Synchronically|surface analysis/i))reached=true;if(!reached)node.remove()}}
     const mentions=[...copy.querySelectorAll('.mention[lang]')];
     if(mentions.some(n=>n.getAttribute('lang')!==code))continue;
     const parts=mentions.map(n=>term(n,code));
     if(parts.length<2||parts.length>4||parts.some(x=>!x)||parts.length!==((evidence.match(/\+/g)||[]).length+1))continue;
     // Without a synchronic marker, require the whole paragraph to be a simple formula.
     if(!marker&&!/^(?:From\s+)?[^.]+\.?$/.test(evidence))continue;
     result.analyses.push({parts,evidence,mode:marker?'Current word structure':'Source-listed formation',anchor:h.id});
    }
   }
   if(/^Derived terms$/.test(h.name)){
    for(let j=i+1;j<kids.length;j++){const next=heading(kids[j]);if(next&&next.level<=h.level)break;
     for(const n of kids[j].querySelectorAll('[lang]')){if(n.closest('.tr')||n.querySelector('[lang]'))continue;const t=term(n,code);if(t&&!result.derived.some(x=>x.word===t.word))result.derived.push({...t,anchor:h.id})}
    }
   }
  }
  result.analyses=result.analyses.slice(0,3);result.derived=result.derived.slice(0,18);return result;
 }
 const source=(e,code,anchor)=>`https://en.wiktionary.org/wiki/${encodeURIComponent(e.core.title||e.base)}#${encodeURIComponent(anchor||LANGS[code].en)}`;
 const chip=(x,code)=>`<button type="button" class="morph-term" data-morph-word="${esc(x.lookup)}" data-morph-lang="${code}" lang="${code}">${esc(x.word)}</button>`;
 function enhance(e,code){
  const side=document.querySelector('#main .col-side');if(!side||e.partial)return;
  const m=e.core.morphology||{analyses:[],derived:[]};let html='';
  if(e.from)html+=`<div class="morph-group"><h5>Form resolution</h5><p><span lang="${code}">${esc(e.from.form)}</span> → <span lang="${code}">${esc(e.word)}</span></p><p class="morph-note">${esc(e.from.desc)}. Lookup resolved to this entry. Inflection and spelling variants are not derivational analyses.</p></div>`;
  for(const a of m.analyses)html+=`<div class="morph-group"><h5>${a.mode}</h5><div class="morph-parts">${a.parts.map(x=>`<div>${chip(x,code)}<small>${x.kind}</small></div>`).join('<span aria-hidden="true">+</span>')}</div><p class="morph-note">${esc(a.evidence)}</p><a class="mini-source" href="${source(e,code,a.anchor)}" target="_blank" rel="noopener">View source analysis ↗</a></div>`;
  if(!m.analyses.length)html+=`<p class="morph-note">${m.multiple?'This entry has multiple etymologies. A combined breakdown is not shown to avoid mixing unrelated words.':'No supported word-structure analysis was extracted. This does not mean the word has no internal structure.'}</p>`;
  if(m.derived.length)html+=`<div class="morph-group"><h5>Derived terms</h5><div class="morph-family">${m.derived.map(x=>chip(x,code)).join('')}</div><p class="morph-note">Listed under “Derived terms” in Wiktionary. This source section can include compounds and expressions as well as derivatives. It is not an exhaustive morphological family or a claim of present-day productivity.</p><a class="mini-source" href="${source(e,code,m.derived[0].anchor)}" target="_blank" rel="noopener">View derived terms ↗</a></div>`;
  else html+='<p class="morph-note">No linked derivatives were extracted from a “Derived terms” section.</p>';
  html+='<p class="morph-note morph-limit">Formation evidence is separate from inflection and historical etymology. A base may itself be complex; affix meaning and productivity depend on context.</p>';
  const card=document.createElement('section');card.className='card morphology';card.setAttribute('aria-label','Word structure and family');card.innerHTML='<h4>Word structure &amp; family</h4>'+html+`<a class="mini-source" href="${source(e,code)}" target="_blank" rel="noopener">Wiktionary contributors · source & history ↗</a>`;side.prepend(card);
  card.querySelectorAll('[data-morph-word]').forEach(b=>b.onclick=()=>{document.querySelector('#q').value=b.dataset.morphWord;lookup(b.dataset.morphWord,b.dataset.morphLang)});
 }
 extractEn=function(sec,code,word){const e=previousExtract(sec,code,word);e.morphology=extract(sec,code);return e};
 render=function(e,code,anim=true){previousRender(e,code,anim);enhance(e,code)};
 // Refresh source-derived caches only; preserve saved cards, preferences and history.
 if(!st.morphology1){st.cache={};st.alias={};st.morphology1=1;save();const q=new URLSearchParams(location.search),w=q.get('q'),l=q.get('lang');if(w)setTimeout(()=>lookup(w,LANGS[l]?l:undefined),0)}
})();
