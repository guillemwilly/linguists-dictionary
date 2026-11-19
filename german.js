/* Source-language extensions (German and Italian): explicit sources, preserved spelling/case, no generated analyses. */
LANGS.de={name:"German",nat:"Deutsch",en:"German",wiki:"de",tat:"deu",freq:"de",heads:["Deutsch"]};
LATIN.push("de");
const lexicalKey=(code,word)=>(code==="de"||code==="it")?unstress(word):fold(word);
detect=function(w){
 const m=w.match(/^(ru|zh|fr|ca|es|pt|en|de|it)[:\s]\s*(.+)$/i); if(m) return [m[2].trim(),m[1].toLowerCase()];
 if(/[\u0400-\u04FF]/.test(w)) return [w,"ru"];
 if(/[\u3400-\u9FFF]/.test(w)) return [w,"zh"];
 return [w,st.lang==="auto"||st.lang==="ru"||st.lang==="zh"?null:st.lang];
};
nativeDef=async function(code,title){
 const L=LANGS[code]; if(code==="en") return null;
 try{
  const p=await parsePage(L.wiki,title); if(!p) return null;
  if(code==="it"){
   const sec=section(p.doc,["Italiano"]);if(!sec)return null;
   for(const li of sec.querySelectorAll("ol > li")){
    let chosen=li;
    // Some entries wrap the first definition list in their headword line.
    if(li.firstElementChild?.tagName==="B"&&clean(li.firstElementChild.textContent)===p.title){
     const list=[...li.children].find(n=>n.tagName==="UL");
     if(list?.firstElementChild?.tagName==="LI")chosen=list.firstElementChild;
    }
    const c=chosen.cloneNode(true);c.querySelectorAll("dl,ul,ol,sup,style,figure,table,.reference").forEach(n=>n.remove());
    const text=clean(c.textContent);if(text.length>4)return text.length>240?text.slice(0,237)+"…":text;
   }
   return null;
  }
  if(code==="de"){
   const sec=section(p.doc,[p.title+" (Deutsch)"]);if(!sec)return null;
   for(const marker of sec.querySelectorAll("p")){
    if(clean(marker.textContent)!=="Bedeutungen:")continue;
    const list=marker.nextElementSibling;if(list?.tagName!=="DL")continue;
    const first=[...list.children].find(n=>n.tagName==="DD");if(!first)continue;
    const c=first.cloneNode(true);c.querySelectorAll("sup,dl,ul,ol,style").forEach(n=>n.remove());
    const text=clean(c.textContent);if(text)return text.length>240?text.slice(0,237)+"…":text;
   }
   return null;
  }
  const sec=section(p.doc,L.heads)||p.doc;
  for(const li of [...sec.querySelectorAll("ol > li"),...sec.querySelectorAll("dl > dd")]){
   const c=li.cloneNode(true);
   c.querySelectorAll("dl, ul, ol, sup, style, .example-fullblock, .example-block, [class*=example], .exemple, .reference").forEach(n=>n.remove());
   let t=clean(c.textContent).replace(/^◆\s*/,"");
   if(t.length>4) return t.length>240?t.slice(0,237)+"…":t;
  }
 }catch(err){throw err}
 return null;
};
rankLangs=async function(word,cands){
 if(cands.length<2) return cands;
 // German stays an explicit alternative when an existing language matches.
 if(cands.includes("it"))return [...await rankLangs(word,cands.filter(c=>c!=="it")),"it"];
 if(cands.includes("de"))return [...await rankLangs(word,cands.filter(c=>c!=="de")),"de"];
 const ranks=await within(Promise.all(cands.map(c=>freqRank(c,word))),2500,null);
 const prior=langPrior(),w=word.toLowerCase();
 return cands.map((c,i)=>{let s=prior(c);const r=ranks&&ranks[i];if(ranks)s+=r?1-Math.log10(r)/5:-.2;for(const [re,wt] of HINTS)if(re.test(w))s+=wt[c]||0;return{c,s}}).sort((a,b)=>b.s-a.s).map(x=>x.c);
};
resolve=async function(word,forced,depth=0){
 const base=unstress(word).trim();
 const script=/[\u0400-\u04FF]/.test(base)?"ru":/[\u3400-\u9FFF]/.test(base)?"zh":null;
 const p=await parsePage("en",base);
 const pool=forced?[forced]:script?[script]:LATIN;
 const cands=p?pool.filter(c=>section(p.doc,[LANGS[c].en])):[];
 if(!cands.length){
  if(depth===0&&forced==="de"&&base&&base[0]!==base[0].toUpperCase()){
   const alt=base[0].toUpperCase()+base.slice(1),r=await resolve(alt,forced,1);
   if(!r.missing){r.from=r.from?{...r.from,form:base}:{form:base,desc:"capitalization adjusted"};return r}
  }
  if(depth===0&&forced!=="de"&&forced!=="it"){const alt=await accentFix(base);if(alt){const r=await resolve(alt,forced,1);if(!r.missing&&r.code!=="de"&&r.code!=="it"){r.from=r.from?{...r.from,form:base}:{form:base,desc:"spelling corrected"};return r}}}
  return {missing:true,code:forced||script,base,sugg:depth<2?await suggestions(base).catch(()=>[]):[]};
 }
 const order=await rankLangs(base,cands), code=order[0];
 let sec=section(p.doc,[LANGS[code].en]), lemma=base, from=null, trad="";
 if(code!=="zh"&&depth<2){
  const fo=formOf(sec);
  if(fo&&fo.lemmas.length){const lp=await parsePage("en",fo.lemmas[0]);const ls=lp&&section(lp.doc,[LANGS[code].en]);if(ls){sec=ls;lemma=unstress(fo.lemmas[0]);from={form:base,desc:fo.desc,other:fo.lemmas.slice(1)}}}
 }
 if(code==="zh"&&/For pronunciation and definitions of/.test(sec.textContent)&&!sec.querySelector(".headword-line")){
  const m=sec.textContent.replace(/\s+/g," ").match(/definitions of\s*\S+\s*[–—-]\s*see\s*([\u3400-\u9FFF]+)/);
  if(m){const p2=await parsePage("en",m[1]);const s2=p2&&section(p2.doc,["Chinese"]);if(s2){sec=s2;trad=m[1]}}
 }
 const e=extractEn(sec,code,lemma); e.trad=trad; e.title=trad||lemma; e.audio="";
 e.headword=code==="zh"?lemma:(e.headword||lemma);
 return {code,core:e,alts:order.slice(1),from,lemma};
};
lookup=async function(raw,forced){
 let [word,code]=forced?[raw,forced]:detect(raw);
 document.body.classList.remove("home");
 const my=++seq; const base=unstress(word).trim(); const akey=(code||"auto")+":"+(!code||code==="de"||code==="it"?base:base.toLowerCase());
 const main=$("#main");
 try{history.replaceState(null,"",`?q=${encodeURIComponent(base)}${code?"&lang="+code:""}`)}catch{}
 const ck=st.alias[akey], cached=ck&&st.cache[ck];
 if(cached){render(cached,cached.code);pushRecent(cached,cached.code);maybeAuto(cached,cached.code);return}
 main.innerHTML=`<div class="grid fade lookup-state" role="status" aria-label="Loading dictionary entry"><div><div class="skel" style="width:120px"></div><h2 class="hw" lang="${code||""}">${esc(word)}</h2><div class="skel" style="width:40%"></div><div class="skel" style="width:85%;height:56px;margin-top:28px"></div><div class="skel" style="width:70%;margin-top:40px"></div><div class="skel" style="width:60%"></div></div><div><div class="skel" style="height:96px"></div><div class="skel" style="height:72px"></div></div></div>`;
 const r=await resolve(word,code).catch(()=>null);
 if(my!==seq) return;
 if(!r){renderFailure(word,code);return}
 if(r.missing){renderMiss(word,r);return}
 code=r.code; const lemma=r.lemma, key=code+":"+((code==="de"||code==="it")?lemma:lemma.toLowerCase());
 const sourceResult=(p,ms)=>within(p.then(value=>({value,status:value&&(Array.isArray(value)?value.length:true)?"ready":"unavailable"})),ms,{value:null,status:"failed"});
 const pTat=sourceResult(tatoeba(code,lemma),5000),pWk=within(wikiNote(code,lemma),4000,null),pRank=within(freqRank(code,lemma),6000,undefined),pNat=sourceResult(nativeDef(code,lemma),5000);
 const entry={word:r.core.headword,base:lemma,code,core:r.core,alts:r.alts,from:r.from,tat:[],wk:null,rank:undefined,nat:null,at:Date.now(),partial:true};
 render(entry,code);
 const [tat,wk,rank,nat]=await Promise.all([pTat,pWk,pRank,pNat]);
 if(my!==seq) return;
 Object.assign(entry,{tat:tat.value||[],wk,rank,nat:nat.value,sourceStates:{sentences:tat.status,native:nat.status},partial:false});
 st.cache[key+"|"+akey]=entry; if(Object.keys(st.alias).length>500) st.alias={}; st.alias[akey]=key+"|"+akey;
 if(code==="it"&&!entry.from&&entry.word!==base)st.alias["it:"+entry.word]=key+"|"+akey;
 const ks=Object.keys(st.cache); if(ks.length>150) delete st.cache[ks.sort((a,b)=>st.cache[a].at-st.cache[b].at)[0]];
 save(); render(entry,code,false); pushRecent(entry,code); maybeAuto(entry,code);
};
new MutationObserver(()=>{const h=document.querySelector('#main .col-main .hw');if(!["de","it"].includes(h?.lang))return;document.querySelectorAll('[data-retry-extra]').forEach(b=>b.onclick=()=>{const entry=Object.values(st.cache).find(e=>e.code===h.lang&&e.word===h.textContent),base=entry?.base||h.textContent;for(const [k,v] of Object.entries(st.alias))if(st.cache[v]?.code===h.lang&&st.cache[v]?.word===h.textContent)delete st.alias[k];lookup(base,h.lang)})}).observe(document.querySelector('#main'),{childList:true,subtree:true});
renderLangs();
if(qs&&(ql==="de"||/^de[:\s]/i.test(qs)))setTimeout(()=>lookup(qs,ql==="de"?"de":undefined),0);
