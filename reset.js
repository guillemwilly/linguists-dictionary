/* Let a pinned comparison be cleared before a second entry is chosen. */
(()=>{
 const main=document.querySelector("#main");
 function attach(){
  const action=main?.querySelector(".entry-actions"),compare=action?.querySelector("#compareBtn");
  if(!action||!compare||!st.contrast||action.querySelector("#clearPin"))return;
  const clear=document.createElement("button");clear.type="button";clear.id="clearPin";clear.className="clear-pin";clear.textContent="Clear";
  clear.onclick=()=>{st.contrast=null;save();compare.textContent="Compare";compare.setAttribute("aria-pressed","false");action.querySelector("span")?.remove();clear.remove()};
  action.append(clear);
 }
 new MutationObserver(attach).observe(main,{childList:true,subtree:true});attach();
})();
