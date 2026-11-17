

const LANGS = {
 ru:{name:"Russian",nat:"Русский",en:"Russian",wiki:"ru",tat:"rus",freq:"ru",heads:["Русский"]},
 zh:{name:"Chinese",nat:"中文",en:"Chinese",wiki:"zh",tat:"cmn",freq:"zh_cn",heads:["汉语","漢語","中文"]},
 fr:{name:"French",nat:"Français",en:"French",wiki:"fr",tat:"fra",freq:"fr",heads:["Français"]},
 ca:{name:"Catalan",nat:"Català",en:"Catalan",wiki:"ca",tat:"cat",freq:"ca",heads:["Català"]},
 es:{name:"Spanish",nat:"Español",en:"Spanish",wiki:"es",tat:"spa",freq:"es",heads:["Español"]},
 pt:{name:"Portuguese",nat:"Português",en:"Portuguese",wiki:"pt",tat:"por",freq:"pt",heads:["Português"]},
 en:{name:"English",nat:"English",en:"English",wiki:"en",tat:"eng",freq:"en",heads:["English"]},
};
const MODEL="The Linguist’s Dictionary";
const FIELDS=["Word","Language","Meaning","Definition","Pronunciation","Forms","Example","Notes","Source"];
const STORE="linguists-dictionary:v1";
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const clean=s=>String(s||"").replace(/\[\d+\]/g,"").replace(/\s+/g," ").replace(/\s([,.;:)])/g,"$1").trim();
const unstress=s=>/[\u0400-\u04FF]/.test(s)?s.normalize("NFD").replace(/[\u0300\u0301]/g,"").normalize("NFC"):s.normalize("NFC");
function safeHtml(html){const d=new DOMParser().parseFromString(String(html||""),"text/html");const allowed=new Set(["B","I","EM","STRONG","BR","TABLE","THEAD","TBODY","TFOOT","TR","TD","TH","CAPTION","SPAN","DIV","P","UL","OL","LI","SMALL","SUP","SUB"]);d.querySelectorAll("script,style,iframe,object,embed,form,input,button,svg,math,link,meta").forEach(x=>x.remove());[...d.body.querySelectorAll("*")].reverse().forEach(el=>{if(!allowed.has(el.tagName)){el.replaceWith(...el.childNodes);return}for(const a of [...el.attributes])if(!["colspan","rowspan","lang"].includes(a.name))el.removeAttribute(a.name)});return d.body.innerHTML}
const SV='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const I={
 speaker:`<svg ${SV}><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>`,
 sun:`<svg ${SV}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
 moon:`<svg ${SV}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>`,
 auto:`<svg ${SV}><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>`,
 arrow:`<svg ${SV}><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
 check:`<svg ${SV}><path d="m5 12 5 5L20 7"/></svg>`,
 alert:`<svg ${SV}><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>`,
};

// ---------- persistence ----------
const load=()=>{try{return JSON.parse(localStorage.getItem(STORE))||{}}catch{return{}}};
const st=Object.assign({lang:"auto",auto:false,theme:"auto",recent:[],queue:[],cache:{},alias:{}},load());
if(!st.v2){st.lang="auto";st.alias={};st.v2=1}
let saveWarned=false;
function save(){try{localStorage.setItem(STORE,JSON.stringify(st))}catch{ if(!saveWarned){saveWarned=true;alert("Couldn't save history or the Anki queue in this browser.")} }}

// ---------- chrome ----------
function applyTheme(){
 if(st.theme==="auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.dataset.theme=st.theme;
 const b=$("#themeBtn"); b.innerHTML=I[st.theme==="auto"?"auto":st.theme==="light"?"sun":"moon"]; b.title=`Theme: ${st.theme}`;
}
$("#themeBtn").onclick=()=>{st.theme={auto:"light",light:"dark",dark:"auto"}[st.theme]||"auto";save();applyTheme()};
function renderAuto(){$("#autoBtn").setAttribute("aria-checked",String(!!st.auto))}
$("#autoBtn").onclick=()=>{st.auto=!st.auto;save();renderAuto()};
function renderLangs(){
 $("#langs").innerHTML=`<button type="button" data-l="auto" title="Detect the language" aria-pressed="${st.lang==="auto"}">Auto</button>`+Object.entries(LANGS).map(([k,v])=>`<button type="button" data-l="${k}" title="${v.name}" lang="${k}" aria-pressed="${st.lang===k}">${v.nat}</button>`).join("");
 $("#langs").querySelectorAll("button").forEach(b=>b.onclick=()=>{st.lang=b.dataset.l;save();renderLangs();const v=$("#q").value.trim();if(v)lookup(v,st.lang==="auto"?undefined:st.lang);$("#q").focus()});
}
function detect(w){
 const m=w.match(/^(ru|zh|fr|ca|es|pt|en)[:\s]\s*(.+)$/i); if(m) return [m[2].trim(),m[1].toLowerCase()];
 if(/[\u0400-\u04FF]/.test(w)) return [w,"ru"];
 if(/[\u3400-\u9FFF]/.test(w)) return [w,"zh"];
 return [w,st.lang==="auto"||st.lang==="ru"||st.lang==="zh"?null:st.lang];
}

// ---------- fetch helpers ----------
async function j(url,ms=9000){const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal});if(!r.ok)throw new Error(r.status);return await r.json()}finally{clearTimeout(t)}}
async function parsePage(wiki,title){
 const u=t=>`https://${wiki}.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(t)}&prop=text&format=json&formatversion=2&redirects=1&origin=*`;
 let r=await j(u(title)); if(r.error&&title!==title.toLowerCase()) r=await j(u(title.toLowerCase()));
 if(r.error) return null;
 return {title:r.parse.title,doc:new DOMParser().parseFromString(r.parse.text,"text/html")};
}
function isLangHeading(el){return /mw-heading[12]\b/.test(el.className)||/^H[12]$/.test(el.tagName)}
function section(doc,names){
 const root=doc.querySelector(".mw-parser-output")||doc.body; const out=doc.createElement("div"); let on=false;
 for(const el of [...root.children]){
  if(isLangHeading(el)){const h=(el.querySelector("h1,h2")||el).textContent.trim(); if(on)break; if(names.some(n=>h.startsWith(n))){on=true;continue}}
  if(on) out.appendChild(el.cloneNode(true));
 }
 return on?out:null;
}
const POS=/^(Definitions|Noun|Verb|Adjective|Adverb|Pronoun|Preposition|Postposition|Conjunction|Interjection|Particle|Phrase|Prepositional phrase|Proverb|Numeral|Determiner|Article|Idiom|Classifier|Contraction|Prefix|Suffix|Participle|Predicative|Proper noun)/;
function headingText(el){return (el.querySelector("h3,h4,h5")||el).textContent.trim()}

// ---------- English Wiktionary extraction ----------
function extractEn(sec,code,word){
 const e={headword:"",pron:"",audio:"",pos:[],ety:"",partners:[],classifiers:[],tables:[]};
 const hw=sec.querySelector("strong.headword"); e.headword=hw?clean(hw.textContent):"";
 const py=sec.querySelector("[class*=pinyin-t-form-of], [class*=pinyin-ts-form-of]");
 e.pron=py?clean(py.textContent):clean(sec.querySelector(".IPA")?.textContent);
 const au=sec.querySelector('audio source[type="audio/mpeg"]')||sec.querySelector("audio source");
 if(au){let s=au.getAttribute("src");e.audio=s.startsWith("//")?"https:"+s:s}
 const kids=[...sec.children]; let cur=null;
 for(let i=0;i<kids.length;i++){
  const el=kids[i];
  if(/mw-heading[345]/.test(el.className)){
   const t=headingText(el);
   if(/^Etymology/.test(t)&&!e.ety){const p=kids.slice(i+1).find(x=>x.tagName==="P");if(p)e.ety=clean(p.textContent)}
   cur=POS.test(t)?{pos:t.replace(/\s*\d+$/,""),forms:"",defs:[]}:null; if(cur)e.pos.push(cur); continue;
  }
  if(!cur) continue;
  if(el.tagName==="P"&&el.querySelector(".headword-line")&&!cur.forms){
   const line=el.querySelector(".headword-line").cloneNode(true);
   line.querySelectorAll(".headword-tr, .tr, sup").forEach(n=>n.remove());
   cur.forms=clean(line.textContent).replace(/\(\s*\)/g,"").replace(/•/g,"").trim();
   let label="";
   el.querySelectorAll("i, a[href^='/wiki/']").forEach(n=>{
    if(n.tagName==="I"){const t=clean(n.textContent).toLowerCase(); if(!/^(or|and|,)$/.test(t)) label=t; return}
    if(n.closest("strong.headword")||n.closest("i")) return;
    const lg=n.closest("[lang]")?.getAttribute("lang")||""; const t=clean(n.textContent);
    if(/^(perfective|imperfective|feminine|masculine)\b/.test(label)&&!/plural/.test(label)&&lg.split("-")[0]===code&&t&&unstress(t)!==unstress(word)&&!e.partners.includes(t)) e.partners.push(t);
   });
  }
  if(el.tagName==="OL"&&cur.defs.length===0){
   for(const li of el.querySelectorAll(":scope > li")){
    const c=li.cloneNode(true);
    const labels=[...c.querySelectorAll(":scope > .ib-content, :scope > span > .ib-content, .label-content")].filter(x=>!x.closest("dl")).map(x=>clean(x.textContent));
    const exs=[];
    c.querySelectorAll(".h-usage-example").forEach(x=>{const ex=clean(x.querySelector(".e-example")?.innerHTML.replace(/<(?!\/?b>)[^>]+>/g,"")),tr=clean(x.querySelector(".e-translation")?.textContent);if(ex)exs.push({ex,tr})});
    if(code==="zh") c.querySelectorAll("dd").forEach(dd=>{const h=dd.querySelector(".Hans")||dd.querySelector(".Hani");if(!h||/Classifier/i.test(dd.textContent))return;const parts=dd.textContent.split("―");exs.push({ex:esc(clean(h.textContent)),tr:clean(parts[parts.length-1])})});
    c.querySelectorAll("dl, ul, ol, .ib-brac, .ib-content, .label-content, sup, style, .ib-colon, [class*=nyms]").forEach(n=>n.remove());
    const g=clean(c.textContent).replace(/\(Classifiers?:[^)]*\)/g,"").replace(/\(\s*\)/g,"").replace(/^[,;:\s]+/,"").trim();
    if(g) cur.defs.push({g,labels:[...new Set(labels)],exs:exs.slice(0,2)});
   }
  }
 }
 const txt=sec.textContent;
 const cl=txt.match(/Classifiers?:\s*([^\n]{1,80})/); if(cl) e.classifiers=[...new Set((cl[1].replace(/([\u3400-\u9FFF]+)／([\u3400-\u9FFF]+)/g,"$2").match(/[\u3400-\u9FFF]+/g)||[]))].slice(0,3);
 sec.querySelectorAll("table.inflection-table, .NavFrame table, table.roa-inflection-table").forEach((t,i)=>{if(i<2){t.querySelectorAll("a").forEach(a=>a.replaceWith(document.createTextNode(a.textContent)));t.querySelectorAll("[style]").forEach(n=>n.removeAttribute("style"));t.removeAttribute("style");e.tables.push(t.outerHTML)}});
 e.pos=e.pos.filter(p=>p.defs.length);
 return e;
}

// ---------- extra sources ----------
async function nativeDef(code,title){
 const L=LANGS[code]; if(code==="en") return null;
 try{
  const p=await parsePage(L.wiki,title); if(!p) return null;
  const sec=section(p.doc,L.heads)||p.doc;
  for(const li of [...sec.querySelectorAll("ol > li"),...sec.querySelectorAll("dl > dd")]){
   const c=li.cloneNode(true);
   c.querySelectorAll("dl, ul, ol, sup, style, .example-fullblock, .example-block, [class*=example], .exemple, .reference").forEach(n=>n.remove());
   let t=clean(c.textContent).replace(/^◆\s*/,"");
   if(t.length>4) return t.length>240?t.slice(0,237)+"…":t;
  }
 }catch{}
 return null;
}
async function tatoeba(code,word){
 const tr=code==="en"?"spa":"eng";
 try{
  const r=await j(`https://api.tatoeba.org/unstable/sentences?lang=${LANGS[code].tat}&q=${encodeURIComponent(word)}&trans:lang=${tr}&sort=relevance&limit=60&showtrans=matching`);
  const seen=new Set();
  return (r.data||[]).filter(s=>{if(!s.translations?.length||code==="zh"&&!s.text.includes(word))return false;const n=code==="zh"?s.text.length/2:s.text.split(/\s+/).length;const t=s.translations[0].text.toLowerCase();if(n<4||n>14||seen.has(t))return false;seen.add(t);return true}).slice(0,3).map(s=>({ex:esc(s.text),tr:s.translations[0].text,id:s.id,owner:s.owner||"Tatoeba contributor",license:s.license||"See sentence page",trId:s.translations[0].id,trOwner:s.translations[0].owner||"Tatoeba contributor"}));
 }catch{return[]}
}
async function wikiNote(code,title){
 try{const r=await j(`https://${LANGS[code].wiki}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,6000);
  if(r.type==="standard"&&r.extract&&r.extract.length>60) return {title:r.title,extract:r.extract.length>420?r.extract.slice(0,417)+"…":r.extract,url:r.content_urls?.desktop?.page,thumb:null};
 }catch{} return null;
}
const freqMaps={};
async function freqRank(code,word){
 const k=LANGS[code].freq;
 try{
  if(!freqMaps[k]) freqMaps[k]=fetch(`https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/${k}/${k}_50k.txt`).then(r=>r.text()).then(t=>{const m=new Map();t.split("\n").forEach((l,i)=>{const w=l.split(" ")[0];if(w&&!m.has(w))m.set(w,i+1)});return m});
  const m=await freqMaps[k]; return m.get(unstress(word).toLowerCase())||null;
 }catch{return undefined}
}
function freqBand(r){
 if(r===undefined) return {n:0,label:"Unknown",sub:""};
 if(!r) return {n:0,label:"Unranked",sub:"Not listed among the top 50k word forms in this subtitle dataset"};
 const sub=`#${r.toLocaleString("en")} in film subtitles`;
 if(r<=1000) return {n:5,label:"Very common",sub};
 if(r<=5000) return {n:4,label:"Common",sub};
 if(r<=20000) return {n:3,label:"Mid-frequency",sub};
 return {n:2,label:"Less common",sub};
}
function freqLabel(r){const b=freqBand(r);return b.sub?`${b.label} · ${b.sub}`:b.label}

// ---------- core lookup ----------
const within=(p,ms,fb)=>Promise.race([p.catch(()=>fb),new Promise(r=>setTimeout(()=>r(fb),ms))]);
const LATIN=["es","fr","ca","pt","en"];
const fold=s=>unstress(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/·/g,"").toLowerCase();
const HINTS=[[/ñ|¿|¡/,{es:2}],[/[ãõ]/,{pt:2}],[/l·l/,{ca:2}],[/œ/,{fr:2}],[/ç/,{ca:.3,fr:.3,pt:.3,es:-1}],[/[êîôûëï]/,{fr:.5,pt:.2,ca:.1}],[/[àèò]/,{ca:.5,fr:.3,pt:.1,es:-.5}],[/[áíóú]/,{es:.4,pt:.4,ca:.2,fr:-.5}],[/ny/,{ca:.15}],[/ção|ções|lh|nh/,{pt:.6}],[/(eau|eux|aux)$/,{fr:.4}]];
function langPrior(){const r=st.recent.slice(0,15),n={};r.forEach(x=>n[x.code]=(n[x.code]||0)+1);return c=>r.length?.4*(n[c]||0)/r.length:0}
async function rankLangs(word,cands){
 if(cands.length<2) return cands;
 const ranks=await within(Promise.all(cands.map(c=>freqRank(c,word))),2500,null);
 const prior=langPrior(),w=word.toLowerCase();
 return cands.map((c,i)=>{let s=prior(c);const r=ranks&&ranks[i];if(ranks)s+=r?1-Math.log10(r)/5:-.2;for(const [re,wt] of HINTS)if(re.test(w))s+=wt[c]||0;return{c,s}}).sort((a,b)=>b.s-a.s).map(x=>x.c);
}
function formOf(sec){
 const lis=[...sec.querySelectorAll("ol > li")].filter(li=>!li.parentElement.closest("li"));
 const isF=li=>!!li.querySelector(".form-of-definition-link a"), fl=lis.filter(isF);
 if(!lis.length||!isF(lis[0])||fl.length<lis.length/2) return null;
 const lemmas=[];
 fl.forEach(li=>{const h=li.querySelector(".form-of-definition-link a").getAttribute("href")||"";let t="";try{t=decodeURIComponent(h.replace(/^\/wiki\//,"").replace(/#.*/,"")).replace(/_/g," ")}catch{}if(t&&!t.includes(":")&&!lemmas.includes(t))lemmas.push(t)});
 const c=lis[0].cloneNode(true);c.querySelectorAll("dl,ul,ol,.form-of-definition-link,.mention-gloss-paren,.tr,.mention-tr,sup").forEach(n=>n.remove());
 let desc=clean(c.textContent).replace(/\(\s*\)/g,"").replace(/:\s*$/,"").replace(/\s*\bof\s*$/i,"").trim();
const nested=lis[0].querySelector("ul > li, ol > li");
if(/^inflection$/i.test(desc)&&nested) desc=clean(nested.textContent);
return {lemmas,desc};
}
async function wt(path){return j(`https://en.wiktionary.org/w/api.php?${path}&format=json&origin=*`,5000)}
async function accentFix(base){try{const o=await wt(`action=opensearch&search=${encodeURIComponent(base)}&limit=10&namespace=0`);return (o[1]||[]).find(t=>t!==base&&fold(t)===fold(base))||null}catch{return null}}
async function suggestions(base){
 const out=[];
 const [o,s]=await Promise.all([wt(`action=opensearch&search=${encodeURIComponent(base)}&limit=6&namespace=0`).catch(()=>null),wt(`action=query&list=search&srsearch=${encodeURIComponent(base)}&srlimit=6`).catch(()=>null)]);
 [s?.query?.searchinfo?.suggestion,...(o?.[1]||[]),...(s?.query?.search||[]).map(x=>x.title)].forEach(t=>{if(t&&t!==base&&!t.includes(" ")&&!out.includes(t))out.push(t)});
 return out.slice(0,6);
}
async function resolve(word,forced,depth=0){
 const base=unstress(word).trim();
 const script=/[\u0400-\u04FF]/.test(base)?"ru":/[\u3400-\u9FFF]/.test(base)?"zh":null;
 const p=await parsePage("en",base);
 const pool=forced?[forced]:script?[script]:LATIN;
 const cands=p?pool.filter(c=>section(p.doc,[LANGS[c].en])):[];
 if(!cands.length){
  if(depth===0){const alt=await accentFix(base);if(alt){const r=await resolve(alt,forced,1);if(!r.missing){r.from=r.from?{...r.from,form:base}:{form:base,desc:"spelling corrected"};return r}}}
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
}
async function fetchCore(word,code){const r=await resolve(word,code,2);return r.missing?{missing:true}:r.core}
let seq=0;
async function lookup(raw,forced){
 let [word,code]=forced?[raw,forced]:detect(raw);
 document.body.classList.remove("home");
 const my=++seq; const base=unstress(word).trim(); const akey=(code||"auto")+":"+base.toLowerCase();
 const main=$("#main");
 try{history.replaceState(null,"",`?q=${encodeURIComponent(base)}${code?"&lang="+code:""}`)}catch{}
 const ck=st.alias[akey], cached=ck&&st.cache[ck];
 if(cached){render(cached,cached.code);pushRecent(cached,cached.code);maybeAuto(cached,cached.code);return}
 main.innerHTML=`<div class="grid fade"><div><div class="skel" style="width:120px"></div><h2 class="hw" lang="${code||""}">${esc(word)}</h2><div class="skel" style="width:40%"></div><div class="skel" style="width:85%;height:56px;margin-top:28px"></div><div class="skel" style="width:70%;margin-top:40px"></div><div class="skel" style="width:60%"></div></div><div><div class="skel" style="height:96px"></div><div class="skel" style="height:72px"></div></div></div>`;
 const r=await resolve(word,code).catch(()=>null);
 if(my!==seq) return;
 if(!r||r.missing){renderMiss(word,r);return}
 code=r.code; const lemma=r.lemma, key=code+":"+lemma.toLowerCase();
 const pTat=within(tatoeba(code,lemma),5000,[]),pWk=within(wikiNote(code,lemma),4000,null),pRank=within(freqRank(code,lemma),6000,undefined),pNat=within(nativeDef(code,lemma),5000,null);
 const entry={word:r.core.headword,base:lemma,code,core:r.core,alts:r.alts,from:r.from,tat:[],wk:null,rank:undefined,nat:null,at:Date.now(),partial:true};
 render(entry,code);
 const [tat,wk,rank,nat]=await Promise.all([pTat,pWk,pRank,pNat]);
 if(my!==seq) return;
 Object.assign(entry,{tat,wk,rank,nat,partial:false});
 st.cache[key+"|"+akey]=entry; if(Object.keys(st.alias).length>500) st.alias={}; st.alias[akey]=key+"|"+akey;
 const ks=Object.keys(st.cache); if(ks.length>150) delete st.cache[ks.sort((a,b)=>st.cache[a].at-st.cache[b].at)[0]];
 save(); render(entry,code,false); pushRecent(entry,code); maybeAuto(entry,code);
}
function renderMiss(word,r){
 const code=r?.code, s=r?.sugg||[];
 $("#main").innerHTML=`<div class="fade"><div class="eyebrow">${code?LANGS[code].nat:"No match"}</div><h2 class="hw">${esc(word)}</h2><p class="err">No matching entry was returned. Check the spelling or try again if a source is unavailable.</p>${s.length?`<div class="card miss"><h4>Did you mean</h4><div class="chips">${s.map(t=>`<button type="button" data-s="${esc(t)}">${esc(t)}</button>`).join("")}</div></div>`:""}${deepLink(word,code)}</div>`;
 $("#main").querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>{$("#q").value=b.dataset.s;lookup(b.dataset.s,code||undefined)});
}
function pushRecent(e,code){
 const g=e.core.pos[0]?.defs[0]?.g||"";
 st.recent=[{w:e.word,base:e.base,code,g},...st.recent.filter(r=>!(r.base===e.base&&r.code===code))].slice(0,30); save();
}
function deepLink(word,code){return `<a class="deep" href="https://en.wiktionary.org/wiki/${encodeURIComponent(unstress(word))}${code?"#"+LANGS[code].en:""}" target="_blank" rel="noopener">Full Wiktionary entry ${I.arrow}</a><p class="deep-sub">More senses, usage notes and source history</p>`}
function render(e,code,anim=true){
 const c=e.core,L=LANGS[code];
 const labels=[...new Set(c.pos.flatMap(p=>p.defs.flatMap(d=>d.labels)))].filter(x=>x.length<30).slice(0,4);
 const posNames=[...new Set(c.pos.map(p=>p.pos.toLowerCase().replace("definitions","")))].filter(Boolean);
 const typed=e.from?.form||e.base;
let m=`${e.from?`<div class="from"><span class="typed" lang="${code}">${esc(e.from.form)}</span>${I.arrow}<span>${esc(e.from.desc||"form of")}</span>${(e.from.other||[]).map(o=>`<button type="button" class="alt" data-lemma="${esc(o)}" lang="${code}">or ${esc(o)}</button>`).join("")}</div>`:""}<div class="eyebrow"><span>${L.nat}</span>${posNames.length?`<span class="sep"></span><span>${esc(posNames.join(", "))}</span>`:""}${(e.alts||[]).length?`<span class="also">Also in ${e.alts.map(a=>`<button type="button" class="alt" data-alt="${a}">${LANGS[a].nat}</button>`).join("")}</span>`:""}</div>
 <h2 class="hw" lang="${code}">${esc(e.word)}</h2>
 <div class="sub">${c.pron?`<span class="pron">${esc(c.pron)}</span>`:""}${c.audio?`<button class="icon-btn" id="play" type="button" aria-label="Listen">${I.speaker}</button>`:""}${c.trad?`<span class="tag" lang="zh-Hant">繁 ${esc(c.trad)}</span>`:""}${labels.map(l=>`<span class="tag">${esc(l)}</span>`).join("")}</div>`;
 if(e.nat) m+=`<div class="native"><span class="k">${L.nat}</span>${esc(e.nat)}</div>`;
 else if(e.partial&&code!=="en") m+=`<div class="native"><div class="skel" style="width:30%;margin:2px 0 10px"></div><div class="skel" style="width:75%;margin:0"></div></div>`;
 c.pos.forEach(p=>{m+=`<section class="pos"><div class="pos-h"><h3>${esc(p.pos==="Definitions"?"Meanings":p.pos)}</h3></div>${p.forms&&code!=="zh"?`<p class="forms">${esc(p.forms)}</p>`:""}<ol class="defs">${p.defs.slice(0,6).map(d=>`<li><div class="g">${d.labels.map(l=>`<span class="lbl">${esc(l)}</span>`).join("")}${esc(d.g)}</div>${d.exs.map(x=>`<div class="ex" lang="${code}">${safeHtml(x.ex)}${x.tr?`<i lang="en">${esc(x.tr)}</i>`:""}</div>`).join("")}</li>`).join("")}</ol></section>`});
 if(e.tat.length) m+=`<h3 class="section-h">Real sentences</h3><div class="sentences">${e.tat.map(x=>`<div class="ex" lang="${code}">${safeHtml(x.ex)}<i lang="en">${esc(x.tr)}</i>${x.id?`<small class="sentence-credit"><a href="https://tatoeba.org/en/sentences/show/${x.id}" target="_blank" rel="noopener">${esc(x.owner)} · ${esc(x.license)}</a> / <a href="https://tatoeba.org/en/sentences/show/${x.trId}" target="_blank" rel="noopener">translation: ${esc(x.trOwner)}</a></small>`:""}</div>`).join("")}</div>`;
 const tables=code==="zh"?[]:c.tables, p0=c.pos[0]?.pos||"";
 const tname=/Verb/.test(p0)?"Conjugation":/Noun|Adjective|Pronoun|Numeral/.test(p0)?"Declension":"Inflection";
 if(tables.length) m+=`<div style="margin-top:28px">${tables.map((t,i)=>`<details class="disc"><summary>${tname}${tables.length>1?` · ${i+1}`:""}</summary><div class="tblwrap">${safeHtml(t)}</div></details>`).join("")}</div>`;
 m+=deepLink(e.word,code);
 const b=freqBand(e.rank);
 let s=`<div class="card"><h4>Frequency</h4>${e.partial?`<div class="skel" style="margin:4px 0 12px"></div><div class="skel" style="width:50%;margin:0"></div>`:`<div class="meter">${[1,2,3,4,5].map(i=>`<span class="${i<=b.n?"on":""}"></span>`).join("")}</div><div class="freq-l">${b.label}</div>${b.sub?`<div class="freq-r">${esc(b.sub)}</div>`:""}`}</div>`;
 const partners=[...c.partners,...c.classifiers];
 const ptitle=code==="zh"?"Measure words":code==="ru"&&/Verb/.test(p0)?"Aspect pair":"Counterpart";
 if(partners.length) s+=`<div class="card"><h4>${ptitle}</h4><div class="chips">${partners.map(p=>`<button type="button" data-p="${esc(p)}" lang="${code}">${esc(p)}</button>`).join("")}</div></div>`;
 if(c.ety) s+=`<div class="card"><h4>Etymology</h4><p class="clamp">${esc(c.ety)}</p></div>`;
 if(e.wk) s+=`<div class="card culture">${e.wk.thumb?`<img src="${esc(e.wk.thumb)}" alt="" loading="lazy">`:""}<h4>Culture · Wikipedia</h4><p class="wk-t">${esc(e.wk.title)}</p><p class="clamp">${esc(e.wk.extract)}</p>${e.wk.url?`<a href="${esc(e.wk.url)}" target="_blank" rel="noopener">Read on Wikipedia ↗</a>`:""}</div>`;
 const toast=`<div class="toast" id="toast"><span class="msg" id="ankiMsg">${st.auto?`<span class="spin"></span>Adding to Anki`:"Ready to save"}</span><button type="button" id="addBtn" ${st.auto?"hidden":""}>Save cards</button></div>`;
 $("#main").innerHTML=`<article class="${anim?"fade":""}"><div class="grid"><div class="col-main">${m}</div><aside class="col-side">${s}</aside></div><p class="src"><a href="https://en.wiktionary.org/wiki/${encodeURIComponent(c.title||e.base)}#${L.en}" target="_blank" rel="noopener">Wiktionary contributors</a> · <a href="https://${L.wiki}.wiktionary.org/wiki/${encodeURIComponent(e.base)}" target="_blank" rel="noopener">Target-language source</a> · <a href="about.html#sources">Licenses &amp; attribution</a>. Entries are extracted and reformatted; coverage varies.</p>${toast}</article>`;
 if(c.audio){const a=new Audio(c.audio);$("#play").onclick=()=>{a.currentTime=0;a.play()}}
 $("#main").querySelectorAll("[data-p]").forEach(x=>x.onclick=()=>{$("#q").value=x.dataset.p;lookup(x.dataset.p,code)});
 $("#main").querySelectorAll(".clamp").forEach(x=>x.onclick=()=>x.classList.toggle("open"));
$("#main").querySelectorAll("[data-alt]").forEach(x=>x.onclick=()=>{$("#q").value=typed;lookup(typed,x.dataset.alt)});
$("#main").querySelectorAll("[data-lemma]").forEach(x=>x.onclick=()=>{$("#q").value=x.dataset.lemma;lookup(x.dataset.lemma,code)});
 $("#addBtn").onclick=()=>addEntry(e,code,true);
}
function homeHtml(){
 const hint=`<p class="hint">Automatic language suggestions · inflected forms where available · type fr: to choose French · press / to search</p>`;
 if(!st.recent.length) return `<div class="fade">${hint}</div>`;
 return `<div class="fade">${hint}<section class="recent"><h3>Recent</h3><ul>${st.recent.slice(0,12).map((r,i)=>`<li><button type="button" data-r="${i}"><span class="w"><span lang="${r.code}">${esc(r.w)}</span><span class="l">${r.code}</span></span><span class="g">${esc(r.g)}</span></button></li>`).join("")}</ul></section></div>`;
}
function goHome(){seq++;document.body.classList.add("home");$("#q").value="";$("#main").innerHTML=homeHtml();bindRecent();try{history.replaceState(null,"",location.pathname)}catch{}$("#q").focus()}
function bindRecent(){$("#main").querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>{const r=st.recent[+b.dataset.r];$("#q").value=r.base;lookup(r.base,r.code);scrollTo(0,0)})}

// ---------- Anki ----------
const CSS=`.card{font-family:-apple-system,"Helvetica Neue",sans-serif;font-size:20px;text-align:center;color:#1d1b18;background:#f7f3ec;line-height:1.45}
.nightMode .card,.night_mode .card{color:#eee8dc;background:#1f1d1a}
.lang{font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.55}
.word{font-size:40px;margin:.3em 0}.pron{font-size:16px;opacity:.7}
.meaning{font-size:24px;margin:.4em 0}.def{font-size:17px;font-style:italic;opacity:.85}
.forms,.ex,.notes{font-size:15px;text-align:left;max-width:560px;margin:.8em auto}
.ex{border-left:3px solid #b5523b;padding-left:.7em}.notes{opacity:.8}.src{font-size:11px;opacity:.4;margin-top:1.5em}`;
const DETAIL='{{#Definition}}<div class="def">{{Definition}}</div>{{/Definition}}{{#Forms}}<div class="forms">{{Forms}}</div>{{/Forms}}{{#Example}}<div class="ex">{{Example}}</div>{{/Example}}{{#Notes}}<div class="notes">{{Notes}}</div>{{/Notes}}{{#Source}}<div class="src">{{Source}}</div>{{/Source}}';
const TEMPLATES=[{Name:"Recognize",Front:'<div class="lang">{{Language}}</div><div class="word">{{Word}}</div><div class="pron">{{Pronunciation}}</div>',Back:'{{FrontSide}}<hr id=answer><div class="meaning">{{Meaning}}</div>'+DETAIL},
{Name:"Produce",Front:'<div class="lang">{{Language}} · say it</div><div class="meaning">{{Meaning}}</div>',Back:'{{FrontSide}}<hr id=answer><div class="word">{{Word}}</div><div class="pron">{{Pronunciation}}</div>'+DETAIL}];
async function anki(action,params={}){const c=new AbortController();const t=setTimeout(()=>c.abort(),action==="requestPermission"?90000:8000);let r;try{r=await fetch("http://127.0.0.1:8765",{method:"POST",body:JSON.stringify({action,version:6,params}),signal:c.signal})}finally{clearTimeout(t)}const x=await r.json();if(x.error)throw new Error(x.error);return x.result}
let ankiOk=null;
function ensureAnki(){ if(!ankiOk) ankiOk=connectAnki().catch(e=>{ankiOk=null;throw e}); return ankiOk }
async function connectAnki(){
 const p=await anki("requestPermission"); if(p.permission!=="granted") throw new Error("Anki refused this page");
 const models=await anki("modelNames"); if(!models.includes(MODEL)) await anki("createModel",{modelName:MODEL,inOrderFields:FIELDS,css:CSS,cardTemplates:TEMPLATES});
 setStatus(true); return true;
}
function setStatus(on){
 $("#ankiStatus").innerHTML=`<span class="dot ${on?"on":"off"}"></span>${on?"Anki connected":"Connect Anki"}`;
 const q=$("#queueStatus"),n=st.queue.length;q.hidden=!n;
 if(n){q.innerHTML=`${n} saved · <a href="#" id="retry">Sync</a>`;$("#retry").onclick=ev=>{ev.preventDefault();flushQueue()}}
}
function exportQueue(){
 if(!st.queue.length){alert("No saved cards to export. Look up a word and choose Save cards, or enable Auto-add.");return}
 const text=["#separator:tab","#html:true","#columns:"+FIELDS.join("\t"),...st.queue.map(n=>FIELDS.map(f=>String(n.fields[f]||"").replace(/[\t\r\n]+/g," ")).join("\t"))].join("\n");
 const url=URL.createObjectURL(new Blob([text],{type:"text/tab-separated-values;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="linguists-dictionary-cards.tsv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function noteFrom(e,code,partnerOf){
 const c=e.core,L=LANGS[code],p0=c.pos[0]||{defs:[],forms:""};
 const meaning=c.pos.flatMap(p=>p.defs.slice(0,2).map(d=>d.g)).slice(0,3).join("; ").slice(0,200);
 const ex=(c.pos.flatMap(p=>p.defs.flatMap(d=>d.exs))[0])||(e.tat||[])[0];
 const labels=[...new Set(c.pos.flatMap(p=>p.defs.flatMap(d=>d.labels)))].slice(0,4);
 const notes=[labels.join(", "),e.rank!==undefined?freqLabel(e.rank):"",partnerOf?`partner of ${partnerOf}`:"",c.classifiers.length?`measure word: ${c.classifiers.join(", ")}`:"",c.ety?("Etym: "+(c.ety.length>220?c.ety.slice(0,217)+"…":c.ety)):""].filter(Boolean).map(esc).join("<br>");
 return {deckName:`Dictionary::${L.name}`,modelName:MODEL,tags:["linguists-dictionary",L.name.toLowerCase(),...(partnerOf?["partner"]:[])],options:{allowDuplicate:false},
  fields:{Word:e.word,Language:L.name,Meaning:esc(meaning),Definition:esc(e.nat||""),Pronunciation:esc(c.pron||""),Forms:esc([p0.forms,c.trad?"traditional "+c.trad:""].filter(Boolean).join(" · ")),Example:ex?`${safeHtml(ex.ex)}${ex.tr?"<br><i>"+esc(ex.tr)+"</i>":""}`:"",Notes:notes,Source:`<a href="https://en.wiktionary.org/wiki/${encodeURIComponent(c.title||e.word)}#${L.en}">Wiktionary contributors</a> (CC BY-SA, extracted). ${e.nat?`<a href="https://${L.wiki}.wiktionary.org/wiki/${encodeURIComponent(e.base||e.word)}">Target-language Wiktionary</a>. `:""}${ex?.id?`<a href="https://tatoeba.org/en/sentences/show/${ex.id}">Tatoeba: ${esc(ex.owner)}</a> (${esc(ex.license)}); <a href="https://tatoeba.org/en/sentences/show/${ex.trId}">translation: ${esc(ex.trOwner)}</a>.`:""}`}};
}
async function addNotes(notes){
 await ensureAnki(); const decks=new Set(await anki("deckNames")); const added=[],skipped=[];
 for(const n of notes){
  if(!decks.has(n.deckName)){await anki("createDeck",{deck:n.deckName});decks.add(n.deckName)}
  const qq=s=>s.replace(/[\\"*_:]/g,m=>"\\"+m);
  const ex=await anki("findNotes",{query:`"note:${MODEL}" "Word:${qq(n.fields.Word)}" "Language:${n.fields.Language}"`});
  if(ex.length){skipped.push(n.fields.Word);continue}
  added.push({id:await anki("addNote",{note:n}),w:n.fields.Word});
 }
 return {added,skipped};
}
function hideLater(t,ms){if(!t)return;clearTimeout(t._h);t.classList.remove("hide");t._h=setTimeout(()=>t.classList.add("hide"),ms)}
async function addEntry(e,code,manual){
 const msg=$("#ankiMsg"),btn=$("#addBtn"),toast=$("#toast");
 if(btn)btn.hidden=true; if(msg)msg.innerHTML=`<span class="spin"></span>Adding to Anki`;
 const notes=[noteFrom(e,code)];
 const requestedConnection=!!ankiOk;
 const ps=[...e.core.partners,...e.core.classifiers].slice(0,4);
 for(const p of ps){try{const k=code+":"+unstress(p).toLowerCase();const pc=st.cache[k]?.core||await fetchCore(p,code);if(pc&&!pc.missing&&pc.pos.length)notes.push(noteFrom({word:pc.headword||p,core:pc,nat:"",tat:[]},code,e.word))}catch{}}
 if(!requestedConnection){
  st.queue.push(...notes.filter(n=>!st.queue.some(q=>q.fields.Word===n.fields.Word&&q.fields.Language===n.fields.Language)));save();setStatus(false);
  if(msg)msg.textContent=`${notes.length} notes saved in this browser`;
  if(btn){btn.hidden=false;btn.textContent="Export";btn.onclick=exportQueue}return;
 }
 try{
  const r=await addNotes(notes);
  if(!msg||!document.body.contains(msg)) return;
  if(r.added.length){
   msg.innerHTML=`${I.check}<span>Added ${esc(r.added.map(a=>a.w).join(", "))}</span>`;
   btn.hidden=false;btn.disabled=false;btn.textContent="Undo";
   btn.onclick=async()=>{btn.disabled=true;await anki("deleteNotes",{notes:r.added.map(a=>a.id)});msg.textContent="Removed from Anki";btn.disabled=false;btn.textContent="Add to Anki";btn.onclick=()=>addEntry(e,code,true);hideLater(toast,5000)};
   hideLater(toast,6000);
  }else{msg.innerHTML=`${I.check}<span>Already in Anki</span>`;btn.hidden=true;hideLater(toast,2500)}
 }catch(err){
  ankiOk=null;
  st.queue.push(...notes.filter(n=>!st.queue.some(q=>q.fields.Word===n.fields.Word&&q.fields.Language===n.fields.Language))); save(); setStatus(false);
  if(msg){msg.innerHTML=`${I.alert}<span>Anki unreachable · ${notes.length} queued</span>`}
  if(btn){btn.hidden=false;btn.disabled=false;btn.textContent="Retry";btn.onclick=()=>flushQueue()}
 }
}
async function flushQueue(){
 if(!st.queue.length) return;
 try{const r=await addNotes(st.queue);st.queue=[];save();setStatus(true);const m=$("#ankiMsg");if(m){m.innerHTML=`${I.check}<span>Queue sent · ${r.added.length} added</span>`;const b=$("#addBtn");if(b)b.hidden=true;hideLater($("#toast"),3000)}}catch{setStatus(false)}
}
function maybeAuto(e,code){if(st.auto) addEntry(e,code,false); else {const m=$("#ankiMsg"),b=$("#addBtn");if(m)m.textContent="Ready to save";if(b)b.disabled=false}}

// ---------- boot ----------
applyTheme(); renderLangs(); renderAuto();
$("#home").onclick=goHome;
$("#f").onsubmit=ev=>{ev.preventDefault();const v=$("#q").value.trim();if(v){lookup(v);$("#q").blur()}};
addEventListener("keydown",ev=>{
 if(ev.key==="/"&&document.activeElement!==$("#q")){ev.preventDefault();$("#q").focus();$("#q").select()}
 if(ev.key==="Escape"){if($("#q").value){$("#q").value="";$("#q").focus()}else goHome()}
});
addEventListener("scroll",()=>document.body.classList.toggle("scrolled",scrollY>4),{passive:true});
setTimeout(()=>LATIN.forEach(c=>freqRank(c,"a")),1200);
setStatus(false);
$("#ankiStatus").onclick=()=>ensureAnki().then(flushQueue).catch(()=>{setStatus(false);alert("Open Anki Desktop with AnkiConnect installed, then allow this site. If your browser blocks local access, use Export saved cards. See Anki setup below.")});
$("#exportBtn").onclick=exportQueue;
const qp=new URLSearchParams(location.search),qs=qp.get("q"),ql=qp.get("lang");if(qs){$("#q").value=qs;lookup(qs,LANGS[ql]?ql:undefined)}else goHome();
