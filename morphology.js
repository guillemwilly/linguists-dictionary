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
     const parts=mentions.map(n=>{
      const part=term(n,code);if(!part)return null;
      // Use only a gloss attached to this mention in this very analysis.
      // Never borrow a sense from the component's separate dictionary entry.
      let next=n.nextElementSibling;
      while(next&&next.matches('.mention-tr,.tr,.mention-gloss-paren'))next=next.nextElementSibling;
      if(next?.matches('.mention-gloss')){const gloss=text(next);if(gloss&&gloss.length<100)part.gloss=gloss}
      return part;
     });
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
  const side=document.querySelector('#main .col-side');if(!side)return;
  const m=e.core.morphology||{analyses:[],derived:[]};let html='';
  if(e.from)html+=`<div class="morph-group"><h5>Form resolution</h5><p><span lang="${code}">${esc(e.from.form)}</span> → <span lang="${code}">${esc(e.word)}</span></p><p class="morph-note">${esc(e.from.desc)}. Lookup resolved to this entry.</p></div>`;
  for(const a of m.analyses)html+=`<div class="morph-group"><h5>${a.mode}</h5><div class="morph-parts">${a.parts.map(x=>`<div>${chip(x,code)}<small>${x.kind}</small>${x.gloss?`<span class="component-gloss">${esc(x.gloss)}</span>`:""}</div>`).join('<span aria-hidden="true">+</span>')}</div><p class="morph-note">${a.parts.some(x=>x.gloss)?"Glosses are quoted from this source analysis, not a general definition of each component.":"The source lists these components without contextual glosses."}</p><a class="mini-source" href="${source(e,code,a.anchor)}" target="_blank" rel="noopener">View source analysis ↗</a></div>`;
  if(!m.analyses.length)html+=`<p class="morph-note">${m.multiple?'This entry has multiple etymologies. A combined breakdown is not shown to avoid mixing unrelated words.':'No explicit breakdown was extracted from this entry.'}</p>`;
  if(m.derived.length)html+=`<div class="morph-group"><h5>Derived terms</h5><div class="morph-family">${m.derived.map(x=>chip(x,code)).join('')}</div><a class="mini-source" href="${source(e,code,m.derived[0].anchor)}" target="_blank" rel="noopener">View derived terms ↗</a></div>`;
  else html+='<p class="morph-note">No linked derivatives were extracted from a “Derived terms” section.</p>';
  html+=`<details class="analysis-about"><summary>About this analysis</summary><p class="morph-note">Only explicit linked source analyses are shown. “Current word structure” requires a synchronic statement; “Source-listed formation” is not a claim of current productivity. A base may itself be complex. Missing analysis does not mean a word lacks internal structure.</p>${m.analyses.map(a=>`<p class="morph-note">Source wording: ${esc(a.evidence)}</p>`).join('')}<p class="morph-note">Derived terms can include compounds and expressions, not just derivatives. Alternatives, uncertain analyses and combined homonym breakdowns are omitted. Inflection and historical etymology remain distinct.</p><a class="mini-source" href="about.html#sources">Sources &amp; licenses</a></details>`;
  const card=document.createElement('section');card.className='card morphology';card.setAttribute('aria-label','Word structure and family');card.innerHTML='<h4>Word structure &amp; family</h4>'+html+`<a class="mini-source" href="${source(e,code)}" target="_blank" rel="noopener">Wiktionary contributors · source & history ↗</a>`;const main=document.querySelector('#main .col-main');
  const deep=main?.querySelector('.deep');if(deep)deep.before(card);else main?.append(card);
  const ety=[...side.children].find(x=>x.querySelector('h4')?.textContent==='Etymology');
  if(ety){
   const duplicate=m.analyses.some(a=>clean(a.evidence).replace(/[\u200e\u200f]/g,'')===clean(e.core.ety).replace(/[\u200e\u200f]/g,''));
   if(duplicate)ety.remove();
   else {const history=document.createElement('details');history.className='disc historical-detail';history.innerHTML='<summary>Historical etymology</summary><div class="history-content"><p>'+esc(e.core.ety)+'</p><a class="mini-source" href="'+source(e,code)+'" target="_blank" rel="noopener">View source history ↗</a></div>';card.after(history);ety.remove()}
  }
  card.querySelectorAll('[data-morph-word]').forEach(b=>b.onclick=()=>{document.querySelector('#q').value=b.dataset.morphWord;lookup(b.dataset.morphWord,b.dataset.morphLang)});
 }
 extractEn=function(sec,code,word){const e=previousExtract(sec,code,word);e.morphology=extract(sec,code);return e};
 render=function(e,code,anim=true){previousRender(e,code,anim);enhance(e,code)};
 // Refresh source-derived caches only; preserve saved cards, preferences and history.
 if(!st.morphology1){st.cache={};st.alias={};st.morphology1=1;save();const q=new URLSearchParams(location.search),w=q.get('q'),l=q.get('lang');if(w)setTimeout(()=>lookup(w,LANGS[l]?l:undefined),0)}
})();
