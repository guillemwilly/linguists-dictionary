/* WebKit returns an empty list for :scope direct-child selectors on the
   detached HTML documents used for Wiktionary parsing. Keep this polyfill
   deliberately narrow so normal page selectors retain native behavior. */
(()=>{
  // Entries saved before this fix can contain an empty meanings array. Refresh
  // the lookup cache once while preserving recent words and saved Anki cards.
  try{
    const storageKey="linguists-dictionary:v1";
    const state=JSON.parse(localStorage.getItem(storageKey)||"{}");
    if(!state.webkitDefinitionsFix){
      state.cache={};
      state.alias={};
      state.webkitDefinitionsFix=1;
      localStorage.setItem(storageKey,JSON.stringify(state));
    }
  }catch{}

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
