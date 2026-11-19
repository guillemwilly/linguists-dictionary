/* Italian uses the same source-based lookup, gender, audio and save paths. */
LANGS.it={name:"Italian",nat:"Italiano",en:"Italian",wiki:"it",tat:"ita",freq:"it",heads:["Italiano"]};
LATIN.push("it");
renderLangs();
if(qs&&(ql==="it"||/^it[:\s]/i.test(qs)))setTimeout(()=>lookup(qs,ql==="it"?"it":undefined),0);
