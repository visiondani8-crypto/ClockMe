(()=>{function loadSample(){
  const st = S.settings; st.name = (UI.obDraft && UI.obDraft.name.trim()) || "";
  if(UI.obDraft && okPhoto(UI.obDraft.photo)) st.photo = UI.obDraft.photo;
  st.email = (UI.obDraft && validEmail(UI.obDraft.email) ? UI.obDraft.email.trim() : "") || (UI.me && UI.me.email) || ""; st.region = "uk"; st.showTakeHome = true; st.weekStart = 1; st.onboarded = true; st.workType = "both";
  const today = startOfDay(Date.now());
  const fri = (()=>{ const d = new Date(today); d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7)); return d.getTime(); })();
  st.payFreq = "weekly"; st.payday = toD(fri);
  const j = newJob(); Object.assign(j, {name:"Tesco Express", rate:12.95, icon:"shopping-cart", color:"#2DB52D", breakMin:30, nightOn:true, nightStart:22*60, nightEnd:6*60, nightPct:15, otOn:true, otAfter:30, otMult:1.5});
  j.weekday[0] = 10; const y = new Date().getFullYear();
  j.contracts = [{id:uid(), type:"permanent", start:fromD(`${y-1}-09-01`), end:0, hours:24, rate:0, notice:"1 week", probationEnd:0, notes:""}];
  j.special = [{date:`${y}-12-25`, label:"Christmas Day", pct:100, yearly:true},{date:`${y}-12-26`, label:"Boxing Day", pct:50, yearly:true}];
  const j2 = newJob(); Object.assign(j2, {name:"Event bar work", rate:15, icon:"utensils", color:"#F07F22", breakMin:0, selfEmployed:true, client:{name:"Mersey Events Ltd", address:"12 Dock Road\nLiverpool L3 4AA", email:"accounts@merseyevents.example"}});
  j2.weekday[5] = 5; j2.weekday[6] = 5;
  j2.contracts = [{id:uid(), type:"freelance", start:addDays(startOfDay(Date.now()),-70), end:addDays(startOfDay(Date.now()),24), hours:0, rate:0, notice:"", probationEnd:0, notes:"Winter events season"}];
  S.jobs.push(j, j2);
  for(let d = 62; d >= 1; d--){
    const day = addDays(today, -d), wd = new Date(day).getDay();
    if([1,3,4].includes(wd) || (wd===0 && d%2===0)){ const s = day + 9*3600000; S.shifts.push({id:uid(), jobId:j.id, start:s, end:s + 8.5*3600000, breakMin:30, rate:j.rate, extraPct:0, tips:0, notes:""}); }
    if(wd===5 || wd===6){ const s = day + 19*3600000; S.shifts.push({id:uid(), jobId:j2.id, start:s, end:s + 7*3600000, breakMin:0, rate:j2.rate, extraPct:0, tips:0, notes:""}); }
  }
  S.roster = {on:true, months:2, until:0, since:Date.now(), skips:[], entries:[1,3,4].map(day=>({id:uid(), day, jobId:j.id, start:"09:00", end:"17:30", breakMin:30})).concat([{id:uid(), day:6, jobId:j2.id, start:"19:00", end:"02:00", breakMin:0}])};
  S.business = Object.assign(blankBiz(), {name: st.name || "Your Name", address:"1 Example Street\nBootle L20 1AA", email: st.email || "you@example.com", bankName:"Example Bank", accountName: st.name || "Your Name", sortCode:"00-00-00", accountNumber:"00000000"});
  S.goals.push({id:uid(), title:"Summer holiday", subtitle:"Let's get there", icon:"plane", color:"#2DB52D", target:6000, start:addDays(today,-60), deadline:addDays(today,150)});
  S.goals.push({id:uid(), title:"First car", subtitle:"Insurance and all", icon:"car", color:"#F07F22", target:15000, start:addDays(today,-60), deadline:addDays(today,400)});
  const from = mascotRect();
  syncRoster(); save(); UI.obDraft = null; UI.auth = null; UI.tab = "home"; UI.stack = [];
  window.scrollTo(0,0); UI.noEnter = true; toast("Sample data loaded"); render(); UI.noEnter = false;
  flyMascotToLogo(from);
}

UI.obDraft = UI.obDraft || obDefaults(); loadSample();})()