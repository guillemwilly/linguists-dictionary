/* Small, tested entry paths. Recent searches remain browser-local and untouched. */
(()=>{
 const examples=[['переписать','ru','переписа́ть','rewrite · word structure'],['relecture','fr','relecture','rereading · word family'],['desfer','ca','desfer','undo · word structure'],['infelizmente','pt','infelizmente','unfortunately · word structure'],['happiness','en','happiness','happy + -ness'],['学习','zh','学习','study; learn · derived terms']];
 const main=document.querySelector('#main');
 function attach(){if(!document.body.classList.contains('home')||main.querySelector('.launch-examples'))return;
  const section=document.createElement('section');section.className='launch-examples';section.setAttribute('aria-label','Example entries');section.innerHTML='<h2>Example entries</h2><ul>'+examples.map(([q,l,w,c])=>'<li><a href="?q='+encodeURIComponent(q)+'&lang='+l+'" data-example="'+q+'" data-lang="'+l+'"><span lang="'+l+'">'+w+'</span><small>'+LANGS[l].name+' · '+c+'</small></a></li>').join('')+'</ul>';
  const recent=main.querySelector('.recent');if(recent)recent.before(section);else main.append(section);
  section.querySelectorAll('a').forEach(a=>a.onclick=e=>{if(e.button||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();lookup(a.dataset.example,a.dataset.lang)});
 }
 new MutationObserver(attach).observe(main,{childList:true,subtree:true});attach();
})();
