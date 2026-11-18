/* Place the existing controls together without changing save or comparison behavior. */
(()=>{
 const main=document.querySelector('#main');
 function compact(){
  const row=main.querySelector('.headword-row'),save=main.querySelector('.entry-save'),actions=main.querySelector('.entry-actions'),button=actions?.querySelector('#compareBtn');
  if(!row||!save||!actions||!button)return;
  let group=row.querySelector('.headword-actions');
  if(!group){group=document.createElement('div');group.className='headword-actions';group.setAttribute('role','group');group.setAttribute('aria-label','Entry actions');row.append(group)}
  if(save.parentElement!==group)group.append(save);
  if(actions.parentElement!==group)group.append(actions);
  const pinned=button.getAttribute('aria-pressed')==='true';
  const label=pinned?'Pinned':'Compare';
  const description=pinned?'Pinned for comparison. Open another entry or clear this pin.':st.contrast?'Compare with '+st.contrast.word:'Pin this entry for comparison';
  if(button.textContent!==label)button.textContent=label;
  button.title=description;button.setAttribute('aria-label',description);
  actions.querySelector('span')?.remove();
 }
 new MutationObserver(compact).observe(main,{childList:true,subtree:true});compact();
})();
