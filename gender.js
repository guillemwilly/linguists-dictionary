/* Noun gender comes only from the lexical headword's explicit source markup. */
(()=>{
 const extractPrevious=extractEn,renderPrevious=render;
 const languages=new Set(['ru','fr','ca','es','pt','de']);
 const names={'masculine gender':'masculine','feminine gender':'feminine','neuter gender':'neuter','common gender':'common gender'};
 const short={m:'masculine',f:'feminine',n:'neuter',c:'common gender'};
 const forms=line=>{const c=line.cloneNode(true);c.querySelectorAll('.headword-tr,.tr,sup').forEach(n=>n.remove());return clean(c.textContent).replace(/\(\s*\)/g,'').replace(/•/g,'').trim()};
 function evidence(line){
  const boundary=line.querySelector('b:not(.headword),i');
  const groups=[...line.querySelectorAll('.gender')].filter(n=>n.parentElement===line&&(!boundary||(n.compareDocumentPosition(boundary)&4)));
  const values=[];let bySense=false;const remaining=[];
  for(const group of groups){
   for(const a of group.querySelectorAll('abbr')){
    const title=(a.getAttribute('title')||'').toLowerCase(),value=names[title]||(!title?short[clean(a.textContent)]:null);
    if(value&&!values.includes(value))values.push(value);
    if(title==='according to the gender of the referent')bySense=true;
    if(['animate','inanimate','plural number','singular number'].includes(title)&&!remaining.includes(title))remaining.push(title);
   }
  }
  if(!values.length)return null;
  const raw=groups.map(x=>clean(x.textContent)).join(' / ');
  const connector=/\bor\b/.test(raw)?' or ':' / ';
  const label=values.join(connector)+(bySense?' (by referent)':'');
  const display=line.cloneNode(true);
  const copies=[...display.querySelectorAll('.gender')];
  groups.forEach((n,i)=>{const at=[...line.querySelectorAll('.gender')].indexOf(n);copies[at].replaceWith(document.createTextNode(i?'':remaining.map(t=>t.replace(' number','')).join(' / ')))});
  return {values,label,source:raw,formsDisplay:forms(display)};
 }
 extractEn=function(sec,code,word){
  const entry=extractPrevious(sec,code,word);if(!languages.has(code))return entry;
  let pos='',etymology='',candidates=[];
  for(const node of sec.children){
   if(/mw-heading[345]/.test(node.className)){
    const title=headingText(node);if(/^Etymology/.test(title))etymology=title;
    pos=POS.test(title)?title.replace(/\s*\d+$/,''):'';
   }else if(node.tagName==='P'&&/^(?:Noun|Proper noun)$/.test(pos)){
    const line=node.querySelector('.headword-line');if(line)candidates.push({pos,forms:forms(line),gender:evidence(line),etymology});
   }
  }
  for(const p of entry.pos){
   if(!/^(?:Noun|Proper noun)$/.test(p.pos))continue;
   const i=candidates.findIndex(c=>c.pos===p.pos&&c.forms===p.forms);
   if(i!==-1){const c=candidates.splice(i,1)[0];p.gender=c.gender;p.genderEtymology=c.etymology}
  }
  return entry;
 };
 render=function(e,code,anim=true){
  renderPrevious(e,code,anim);if(!languages.has(code))return;
  const sections=[...document.querySelectorAll('#main .col-main>.pos')];
  e.core.pos.forEach((p,i)=>{
   if(!p.gender||!sections[i])return;
   const badge=document.createElement('span');badge.className='noun-gender';badge.textContent=p.gender.label;
   badge.setAttribute('aria-label','Grammatical gender: '+p.gender.label);badge.title='Wiktionary headword: '+p.gender.source;
   sections[i].querySelector('.pos-h').append(badge);
   const f=sections[i].querySelector('.forms');if(f)f.textContent=p.gender.formsDisplay;
  });
 };
})();
