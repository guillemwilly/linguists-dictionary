/* Browser compatibility for the detached Wiktionary documents parsed by the app. */
(()=>{
  // Refresh cached entries once after the iPhone parser fixes, preserving
  // recent words and queued Anki cards.
  try{
    const storageKey="linguists-dictionary:v1";
    const state=JSON.parse(localStorage.getItem(storageKey)||"{}");
    if(!state.german1){state.german1=1;state.cache={};state.alias={};localStorage.setItem(storageKey,JSON.stringify(state))}
    if(!state.nounGender1){
      state.nounGender1=1;
      state.polish1=1;
      state.cache={};
      state.alias={};
      state.iphoneDefinitionsFix=1;
      localStorage.setItem(storageKey,JSON.stringify(state));
    }
  }catch{}

  // English Wiktionary sends iPhones a MobileFrontend response where each
  // language body is wrapped in <section class="mf-section-*">. The original
  // parser expects those headings, paragraphs and lists as direct children.
  const nativeAppend=Node.prototype.appendChild;
  Node.prototype.appendChild=function(node){
    if(this?.tagName==="DIV"&&node?.tagName==="SECTION"&&/(^|\s)mf-section-\d+/.test(node.className||"")){
      while(node.firstChild) nativeAppend.call(this,node.firstChild);
      return node;
    }
    return nativeAppend.call(this,node);
  };

  // WebKit can also return an empty list for :scope direct-child selectors in
  // DOMParser documents. Keep this fallback limited to the two selectors used.
  const nativeQueryAll=Element.prototype.querySelectorAll;
  Element.prototype.querySelectorAll=function(selector){
    if(selector===":scope > li"){
      return [...this.children].filter(node=>node.tagName==="LI");
    }
    if(selector===":scope > .ib-content, :scope > span > .ib-content, .label-content"){
      const direct=[...this.children].filter(node=>node.matches(".ib-content,.label-content"));
      const wrapped=[...this.children].filter(node=>node.tagName==="SPAN").flatMap(node=>[...node.children].filter(child=>child.matches(".ib-content,.label-content")));
      const nested=[...nativeQueryAll.call(this,".label-content")];
      return [...new Set([...direct,...wrapped,...nested])];
    }
    return nativeQueryAll.call(this,selector);
  };
})();
