/* Source-based learner tools: no AI, account, backend or API key. */
(()=>{
 const baseExtract=extractEn,baseRender=render;
 function hLevel(el){const h=el.matches?.("h1,h2,h3,h4,h5,h6")?el:el.querySelector?.("h1,h2,h3,h4,h5,h6");return h?+h.tagName.slice(1):0}
 function hText(el){return (el.querySelector("h1,h2,h3,h4,h5,h6")||el).textContent.trim()}
 function afterHeading(kids,start){const level=hLevel(kids[start]),out=[];for(let i=start+1;i<kids.length;i++){const l=hLevel(kids[i]);if(l&&l<=level)break;out.push(kids[i])}return out}
 function relationsFrom(sec,currentCode){
  const r={collocations:[],translations:[],etymologyLinks:[]},kids=[...sec.children],supported=new Set(Object.keys(LANGS));
  const add=(bucket,code,term)=>{term=clean(term);if(!supported.has(code)||code===currentCode||!term||term.length>42||/[\n;]/.test(term))return;const k=code+":"+fold(term);if(!bucket.some(x=>x.k===k))bucket.push({k,code,term})};
  for(let i=0;i<kids.length;i++){
   const title=hLevel(kids[i])?hText(kids[i]).replace(/\s*\d+$/,""):"";if(!title)continue;const blocks=afterHeading(kids,i);
   if(/^Collocations?$/i.test(title)){
    const box=sec.ownerDocument.createElement("div");blocks.forEach(x=>box.appendChild(x.cloneNode(true)));
    box.querySelectorAll("li").forEach(li=>{const c=li.cloneNode(true);c.querySelectorAll("ul,ol,dl,sup,style").forEach(n=>n.remove());const text=clean(c.textContent);if(text.length>=3&&text.length<=140&&!r.collocations.includes(text))r.collocations.push(text)});
   }
   if(/^Translations?$/i.test(title)){
    const box=sec.ownerDocument.createElement("div");blocks.forEach(x=>box.appendChild(x.cloneNode(true)));
    box.querySelectorAll("[lang]").forEach(el=>{const raw=el.getAttribute("lang")||"";if(/-Latn\b/i.test(raw)||el.matches(".tr")||el.closest(".tr"))return;const code=raw.split("-")[0];if(el.children.length===0||el.matches("a,span,strong,i"))add(r.translations,code,el.textContent)});
   }
   if(/^Etymology/i.test(title)){
    const ety=[];for(let j=i+1;j<kids.length&&!hLevel(kids[j]);j++)ety.push(kids[j]);const box=sec.ownerDocument.createElement("div");ety.forEach(x=>box.appendChild(x.cloneNode(true)));
    box.querySelectorAll("[lang]").forEach(el=>{const raw=el.getAttribute("lang")||"";if(/-Latn\b/i.test(raw)||el.matches(".tr")||el.closest(".tr"))return;const code=raw.split("-")[0];if(el.children.length===0||el.matches("a,span,strong,i"))add(r.etymologyLinks,code,el.textContent)});
   }
  }
  r.collocations=r.collocations.slice(0,12);r.translations=r.translations.slice(0,24);r.etymologyLinks=r.etymologyLinks.slice(0,16);return r;
 }
 function framesFor(def){
  const labels=(def.labels||[]).map(x=>x.toLowerCase()),joined=labels.join(" · "),out=[];const add=(pattern,evidence)=>{if(!out.some(x=>x.pattern===pattern))out.push({pattern,evidence})};
  if(labels.some(x=>/\bditransitive\b/.test(x)))add("takes a direct and an indirect object","Wiktionary label: ditransitive");
  else if(labels.some(x=>/\btransitive\b/.test(x)&&!/intransitive/.test(x)))add("takes a direct object","Wiktionary label: transitive");
  if(labels.some(x=>/\bintransitive\b/.test(x)))add("used without a direct object","Wiktionary label: intransitive");
  if(labels.some(x=>/\bcountable\b/.test(x)&&!/uncountable/.test(x)))add("countable noun","Wiktionary label: countable");
  if(labels.some(x=>/\buncountable\b/.test(x)))add("uncountable noun","Wiktionary label: uncountable");
  if(labels.some(x=>/\breflexive\b/.test(x)))add("used reflexively","Wiktionary label: reflexive");
  if(labels.some(x=>/\bimpersonal\b/.test(x)))add("usually used impersonally","Wiktionary label: impersonal");
  if(labels.some(x=>/\bcopular|copulative\b/.test(x)))add("links the subject to a complement","Wiktionary label: copular");
  const m=joined.match(/(?:with|takes?|governs?)\s+(?:the\s+)?(genitive|dative|accusative|instrumental|locative|ablative)/i);if(m)add(`governs the ${m[1]} case`,m[0]);return out;
 }
 function framesHtml(def){const f=framesFor(def);return f.length?`<div class="frames" aria-label="Grammar frame">${f.map(x=>`<div class="frame-row"><span class="frame-pattern">${esc(x.pattern)}</span><span class="frame-evidence">${esc(x.evidence)}</span></div>`).join("")}</div>`:""}
 function collocationsHtml(items){return items?.length?`<details class="disc learning-detail"><summary>Collocations from Wiktionary</summary><ul class="collocation-list">${items.slice(0,10).map(x=>`<li>${esc(x)}</li>`).join("")}</ul></details>`:""}
 function connectionsHtml(core,currentCode){
  const r=core.relations||{},groups=[];const group=(title,items,note)=>{if(!items?.length)return;groups.push(`<div class="conn-group"><h5>${title}</h5><div class="conn-terms">${items.slice(0,10).map(x=>`<button type="button" data-conn-word="${esc(x.term)}" data-conn-lang="${x.code}" lang="${x.code}"><span>${esc(x.term)}</span><small>${LANGS[x.code].nat}</small></button>`).join("")}</div><p>${note}</p></div>`)};
  group("Translations",r.translations,"Grouped from explicit Wiktionary translation sections; senses may not align perfectly.");
  group("Shared history",r.etymologyLinks,"Words explicitly linked in the entry’s etymology. This does not automatically mean identical meaning.");
  return groups.length?`<div class="card connections"><h4>Across your languages</h4>${groups.join("")}<a class="mini-source" href="https://en.wiktionary.org/wiki/${encodeURIComponent(core.title||"")}#${LANGS[currentCode].en}" target="_blank" rel="noopener">Source: Wiktionary ↗</a></div>`:"";
 }
 function cached(base,code){return Object.values(st.cache).filter(e=>e&&e.code===code&&fold(e.base)===fold(base)&&!e.partial).sort((a,b)=>(b.at||0)-(a.at||0))[0]||null}
 function contrastEntry(e){
  const c=e.core,L=LANGS[e.code],defs=c.pos.flatMap(p=>p.defs.map(d=>({p:p.pos,d}))).slice(0,4);
  return `<article class="contrast-entry"><div class="eyebrow">${L.nat}</div><h2 lang="${e.code}">${esc(e.word)}</h2>${c.pron?`<p class="contrast-pron">${esc(c.pron)}</p>`:""}${e.nat?`<div class="native"><span class="k">${L.nat}</span>${esc(e.nat)}</div>`:""}<ol class="defs">${defs.map(x=>`<li><span class="contrast-pos">${esc(x.p)}</span><div class="g">${x.d.labels.map(l=>`<span class="lbl">${esc(l)}</span>`).join("")}${esc(x.d.g)}</div>${framesHtml(x.d)}${x.d.exs.slice(0,1).map(v=>`<div class="ex" lang="${e.code}">${safeHtml(v.ex)}${v.tr?`<i lang="en">${esc(v.tr)}</i>`:""}</div>`).join("")}</li>`).join("")}</ol>${collocationsHtml(c.relations?.collocations)}<a class="mini-source" href="https://en.wiktionary.org/wiki/${encodeURIComponent(c.title||e.base)}#${L.en}" target="_blank" rel="noopener">Wiktionary source ↗</a></article>`;
 }
 function showContrast(left,right){
  document.body.classList.remove("home");try{history.replaceState(null,"",`?q=${encodeURIComponent(right.base)}&lang=${right.code}&compare=${encodeURIComponent(left.base)}&compareLang=${left.code}`)}catch{}
  $("#main").innerHTML=`<section class="contrast-view fade" aria-label="Word comparison"><header class="contrast-head"><div><p class="overline">Contrast mode</p><h1>${esc(left.word)} <span>and</span> ${esc(right.word)}</h1></div><div class="contrast-actions"><button type="button" id="swapCompare">Swap</button><button type="button" id="clearCompare">Clear</button></div></header><div class="contrast-grid">${contrastEntry(left)}${contrastEntry(right)}</div><p class="src">Definitions, labels, frames and collocations are extracted from attributed Wiktionary entries. Missing evidence is omitted rather than generated.</p></section>`;
  $("#swapCompare").onclick=()=>showContrast(right,left);$("#clearCompare").onclick=()=>{st.contrast=null;save();baseRender(right,right.code,false);enhance(right,right.code)};
 }
 function bindCompare(e,code){const b=$("#compareBtn");if(!b)return;b.onclick=()=>{const same=st.contrast&&st.contrast.code===code&&fold(st.contrast.base)===fold(e.base);if(!st.contrast){st.contrast={base:e.base,code,word:e.word};save();baseRender(e,code,false);enhance(e,code);return}if(same){st.contrast=null;save();baseRender(e,code,false);enhance(e,code);return}const left=cached(st.contrast.base,st.contrast.code);if(!left){st.contrast=null;save();alert("The pinned entry needs to be looked up again before comparing.");baseRender(e,code,false);enhance(e,code);return}showContrast(left,e)}}
 function enhance(e,code){
  const root=$("#main"),sub=root.querySelector(".col-main>.sub");if(!sub)return;
  const action=document.createElement("div");action.className="entry-actions";const isPin=!!(st.contrast&&st.contrast.code===code&&fold(st.contrast.base)===fold(e.base));action.innerHTML=`<button type="button" id="compareBtn" ${e.partial?"disabled":""} aria-pressed="${isPin}">${isPin?"Pinned for comparison":st.contrast?`Compare with ${esc(st.contrast.word)}`:"Compare"}</button>${st.contrast?`<span>Open another entry, then compare.</span>`:""}`;sub.after(action);
  const sections=[...root.querySelectorAll(".col-main>.pos")];e.core.pos.forEach((p,pi)=>{const items=sections[pi]?.querySelectorAll("ol.defs>li")||[];p.defs.slice(0,6).forEach((d,di)=>{const html=framesHtml(d);if(html)items[di]?.insertAdjacentHTML("beforeend",html)})});
  const coll=collocationsHtml(e.core.relations?.collocations);if(coll)(sections.at(-1)||action).insertAdjacentHTML("afterend",coll);
  const conn=connectionsHtml(e.core,code),side=root.querySelector(".col-side");if(conn&&side){const ety=[...side.children].find(x=>x.querySelector("h4")?.textContent==="Etymology");(ety||side.lastElementChild)?.insertAdjacentHTML(ety?"beforebegin":"afterend",conn)}
  bindCompare(e,code);root.querySelectorAll("[data-conn-word]").forEach(x=>x.onclick=()=>{$("#q").value=x.dataset.connWord;lookup(x.dataset.connWord,x.dataset.connLang)});
 }
 extractEn=function(sec,code,word){const e=baseExtract(sec,code,word);e.relations=relationsFrom(sec,code);return e};
 render=function(e,code,anim=true){baseRender(e,code,anim);enhance(e,code)};
 const migrate=!st.linguistFeatures1;if(migrate){st.cache={};st.alias={};st.contrast=null;st.linguistFeatures1=1;save();const q=new URLSearchParams(location.search),w=q.get("q"),l=q.get("lang");if(w)setTimeout(()=>lookup(w,LANGS[l]?l:undefined),0)}
})();
