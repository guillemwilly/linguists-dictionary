/* WebKit returns an empty list for :scope direct-child selectors on the
   detached HTML documents used for Wiktionary parsing. Keep this polyfill
   deliberately narrow so normal page selectors retain native behavior. */
(()=>{
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
