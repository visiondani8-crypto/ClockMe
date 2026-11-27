"use strict";
/* ============ Constants ============ */
const DAY = 86400000;
const REGIONS = {
  uk:{title:"United Kingdom",flag:"🇬🇧",cur:"GBP",note:"England, Wales & NI · 2026/27 Income Tax, Class 1 NI (employed), Class 4 NI (self-employed)"},
  scotland:{title:"Scotland",flag:"🏴󠁧󠁢󠁳󠁣󠁴󠁿",cur:"GBP",note:"Scottish rates · 2026/27 Income Tax, Class 1 and Class 4 NI"},
  ireland:{title:"Ireland",flag:"🇮🇪",cur:"EUR",note:"Ireland · PAYE (single), USC and PRSI. Switches to Budget 2027 rates on 1 Jan 2027."},
  us:{title:"United States",flag:"🇺🇸",cur:"USD",note:"US 2026 · Federal tax, FICA (employed) and self-employment tax, standard deduction"},
  custom:{title:"Other country",flag:"🌍",cur:"EUR",note:"A flat % you set. Use this for any other country."}
};
const LOANS = {none:["None",Infinity],plan1:["Plan 1",26900],plan2:["Plan 2",29385],plan4:["Plan 4 (Scotland)",33795],plan5:["Plan 5",25000]};
/* Yearly repayment threshold on a date. 2026/27 above; from 6 April 2027: Plan 1 £28,005, Plan 2 £29,385, Plan 5 £26,025
   (GOV.UK announcements of 10 August and 12 November 2026). Plan 4 for 2027/28 isn't announced yet, so it stays at £33,795. */
const LOANS_2027 = {plan1:28005, plan2:29385, plan5:26025};
const loanThreshold = (plan, ms = Date.now()) => (ms >= Date.UTC(2027,3,6) && LOANS_2027[plan]) || LOANS[plan][1];
const CURRENCIES = ["GBP","EUR","USD","CAD","AUD","NZD","CHF","SEK","NOK","DKK","PLN","NGN","GHS","ZAR","KES","INR","AED","SGD","JPY"];
const PALETTE = ["#2DB52D","#F07F22","#4A6CF7","#8E5CF6","#EC4899","#14B8A6","#E5484D","#6B6B70"];
const JOB_ICONS = ["briefcase","shopping-cart","coffee","utensils","stethoscope","package","car","hammer","wrench","building-2","shopping-bag","laptop","graduation-cap","scissors","dumbbell","mic"];
const GOAL_ICONS = ["plane","car","house","building-2","graduation-cap","gift","laptop","smartphone","gamepad-2","heart","banknote","umbrella"];
const WD = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const WDS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const FREQS = {weekly:["Every week",7],fortnightly:["Every 2 weeks",14],fourweekly:["Every 4 weeks",28],monthly:["Every month",0]};
const THEMES = [["system","Auto","#EAF5FF","#06101F"],["light","Light","#EAF5FF","#1E8FE8"],["dark","Dark","#050E1C","#5BB8FF"],["white","White","#FFFFFF","#141415"],["lightpink","Light pink","#FCEEF3","#D9548C"],["pink","Pink","#F6C3D6","#B21E5C"],["darkpink","Dark pink","#1C0A13","#FF5DA2"]];
function swatchesHTML(current){ return `<div class="swatches">${THEMES.map(([k,l,bg,acc])=>`<button class="swatch ${current===k?"on":""}" data-act="setTheme" data-v="${k}" aria-label="${l} theme"><i style="background:${bg}"><b style="background:${acc}"></b></i>${l}</button>`).join("")}</div>`; }
/* Official bank / public holidays (GOV.UK, Citizens Information, OPM). Substitute days included. */
const BANK_HOLS = {
  ew:{title:"England & Wales", d:{"2026-01-01":"New Year's Day","2026-04-03":"Good Friday","2026-04-06":"Easter Monday","2026-05-04":"Early May bank holiday","2026-05-25":"Spring bank holiday","2026-08-31":"Summer bank holiday","2026-12-25":"Christmas Day","2026-12-28":"Boxing Day (substitute)",
    "2027-01-01":"New Year's Day","2027-03-26":"Good Friday","2027-03-29":"Easter Monday","2027-05-03":"Early May bank holiday","2027-05-31":"Spring bank holiday","2027-08-30":"Summer bank holiday","2027-12-27":"Christmas Day (substitute)","2027-12-28":"Boxing Day (substitute)"}},
  sco:{title:"Scotland", d:{"2026-01-01":"New Year's Day","2026-01-02":"2nd January","2026-04-03":"Good Friday","2026-05-04":"Early May bank holiday","2026-05-25":"Spring bank holiday","2026-06-15":"World Cup bank holiday","2026-08-03":"Summer bank holiday","2026-11-30":"St Andrew's Day","2026-12-25":"Christmas Day","2026-12-28":"Boxing Day (substitute)",
    "2027-01-01":"New Year's Day","2027-01-04":"2nd January (substitute)","2027-03-26":"Good Friday","2027-05-03":"Early May bank holiday","2027-05-31":"Spring bank holiday","2027-08-02":"Summer bank holiday","2027-11-30":"St Andrew's Day","2027-12-27":"Christmas Day (substitute)","2027-12-28":"Boxing Day (substitute)"}},
  ni:{title:"Northern Ireland", d:{"2026-01-01":"New Year's Day","2026-03-17":"St Patrick's Day","2026-04-03":"Good Friday","2026-04-06":"Easter Monday","2026-05-04":"Early May bank holiday","2026-05-25":"Spring bank holiday","2026-07-13":"Battle of the Boyne (substitute)","2026-08-31":"Summer bank holiday","2026-12-25":"Christmas Day","2026-12-28":"Boxing Day (substitute)",
    "2027-01-01":"New Year's Day","2027-03-17":"St Patrick's Day","2027-03-26":"Good Friday","2027-03-29":"Easter Monday","2027-05-03":"Early May bank holiday","2027-05-31":"Spring bank holiday","2027-07-12":"Battle of the Boyne","2027-08-30":"Summer bank holiday","2027-12-27":"Christmas Day (substitute)","2027-12-28":"Boxing Day (substitute)"}},
  ie:{title:"Ireland", d:{"2026-01-01":"New Year's Day","2026-02-02":"St Brigid's Day","2026-03-17":"St Patrick's Day","2026-04-06":"Easter Monday","2026-05-04":"May bank holiday","2026-06-01":"June bank holiday","2026-08-03":"August bank holiday","2026-10-26":"October bank holiday","2026-12-25":"Christmas Day","2026-12-26":"St Stephen's Day",
    "2027-01-01":"New Year's Day","2027-02-01":"St Brigid's Day","2027-03-17":"St Patrick's Day","2027-03-29":"Easter Monday","2027-05-03":"May bank holiday","2027-06-07":"June bank holiday","2027-08-02":"August bank holiday","2027-10-25":"October bank holiday","2027-12-25":"Christmas Day","2027-12-26":"St Stephen's Day"}},
  us:{title:"United States (federal)", d:{"2026-01-01":"New Year's Day","2026-01-19":"Martin Luther King Jr. Day","2026-02-16":"Washington's Birthday","2026-05-25":"Memorial Day","2026-06-19":"Juneteenth","2026-07-03":"Independence Day (observed)","2026-09-07":"Labor Day","2026-10-12":"Columbus Day","2026-11-11":"Veterans Day","2026-11-26":"Thanksgiving","2026-12-25":"Christmas Day",
    "2027-01-01":"New Year's Day","2027-01-18":"Martin Luther King Jr. Day","2027-02-15":"Washington's Birthday","2027-05-31":"Memorial Day","2027-06-18":"Juneteenth (observed)","2027-07-05":"Independence Day (observed)","2027-09-06":"Labor Day","2027-10-11":"Columbus Day","2027-11-11":"Veterans Day","2027-11-25":"Thanksgiving","2027-12-24":"Christmas Day (observed)","2027-12-31":"New Year's Day 2028 (observed)"}}
};
const defaultHolRegion = () => ({uk:"ew", scotland:"sco", ireland:"ie", us:"us"})[S.settings.region] || "ew";
/* Minimum wage for the user's age group, on a given date. null where the app has no figure. */
const AGE_BANDS = [["21+","21 or over"],["18-20","18 to 20"],["u18","Under 18"],["app","Apprentice (1st year or under 19)"]];
function minWage(ms){
  const st = S.settings, band = st.ageBand || "21+", d = new Date(ms || Date.now());
  if(st.region === "uk" || st.region === "scotland"){
    const t = d >= new Date(2027,3,1) ? {"21+":13.21,"18-20":11.27,u18:8.31,app:8.31} : d >= new Date(2026,3,1) ? {"21+":12.71,"18-20":10.85,u18:8,app:8} : {"21+":12.21,"18-20":10,u18:7.55,app:7.55};
    return {rate:t[band], name:band==="21+"?"National Living Wage":"National Minimum Wage", where:"the UK"};
  }
  if(st.region === "ireland" && band === "21+") return {rate: d >= new Date(2027,0,1) ? 14.94 : 14.15, name:"national minimum wage", where:"Ireland"};
  if(st.region === "us") return {rate:7.25, name:"federal minimum wage", where:"the US (your state may be higher)"};
  return null;
}
function belowMin(job, ms, rate){
  if(!job || job.selfEmployed) return null;
  const m = minWage(ms); if(!m || !m.rate) return null;
  const r = rate != null ? rate : rateFor(job, ms || Date.now());
  return r > 0 && r + 0.0001 < m.rate ? m : null;
}
const HORIZONS = [[1,"End of this month"],[2,"End of next month"],[3,"Next 3 months"],[6,"Next 6 months"]];
const WORKTYPES = {employed:["Employed","I get a payslip (PAYE / W-2)","badge-check"],self:["Self-employed","I invoice clients","receipt"],both:["Both","A job plus some freelance work","layers"]};

/* ============ State ============ */
const blankBiz = () => ({vatNo:"", name:"",address:"",email:"",phone:"",bankName:"",accountName:"",sortCode:"",accountNumber:"",iban:"",taxRef:"",terms:14,vatOn:false,vatPct:20,prefix:"INV-",next:1});
const blank = () => ({
  v:3, updatedAt:0,
  settings:{name:"",region:"uk",showTakeHome:true,workType:"employed",loan:"none",postgrad:false,filing:"single",statePct:0,customPct:20,customCur:"EUR",pensionPct:0,fixedOn:false,fixedIncome:0,weekStart:1,appearance:"system",onboarded:false,payFreq:"weekly",payday:"",ageBand:"21+",email:"",pinOn:false,pinHash:"",photo:""},
  business: blankBiz(),
  roster:{on:false, months:2, until:0, since:0, entries:[], skips:[], locked:[]},
  jobs:[], shifts:[], goals:[], invoices:[], payslips:[], clock:null
});
let S = blank();
const UI = {me:null, locked:false, hiddenAt:0, pin:"", pinErr:false, shiftView:"list", calMonth:Date.now(), calDay:null, tab:"home", stack:[], sheet:null, dialog:null, period:"week", anchor:Date.now(), filterJob:null, ob:0, obDraft:null, sync:"local", selBar:null, importFile:null, importURL:null, importCtl:null};
/* Money helpers: parse what people type (12,50 or 12.50) and keep pennies exact. */
const num = v => { const n = parseFloat(String(v ?? "").replace(/\s/g,"").replace(",", ".").replace(/[^0-9.\-]/g,"")); return isFinite(n) ? n : 0; };
const r2 = v => Math.round((v + Number.EPSILON) * 100) / 100;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const uid = () => Math.random().toString(36).slice(2,9) + Date.now().toString(36);

function hydrate(s){
  const b = blank();
  const o = Object.assign(b, s);
  o.settings = Object.assign(blank().settings, s.settings || {});
  o.business = Object.assign(blankBiz(), s.business || {});
  o.roster = Object.assign(blank().roster, s.roster || {});
  o.invoices = s.invoices || [];
  o.payslips = s.payslips || [];
  o.jobs = (s.jobs || []).map(j => Object.assign({contracts:[], selfEmployed:false, holiday:"none", holidayPct:12.07, breakAfter:0, client:{name:"",address:"",email:""}}, j, {client:Object.assign({name:"",address:"",email:""}, j.client || {})}));
  return o;
}

/* ============ Storage: account (db) with device fallback ============
   Data is split into small documents (settings & jobs, shifts per year, invoices per year)
   so years of shifts never hit the size limit of one document, and only changed parts are written. */
let dbCol = null, writing = false, again = false, saveTimer = null, written = {};
function loadLocal(){ try{ const raw = localStorage.getItem("shiftpay"); if(raw){ const s = JSON.parse(raw); if(s && s.settings) S = hydrate(s); } }catch(e){} }
function save(){
  S.updatedAt = Date.now();
  try{ localStorage.setItem("shiftpay", JSON.stringify(S)); }catch(e){}
  clearTimeout(saveTimer); saveTimer = setTimeout(flush, 600);
}
function chunks(){
  const out = {};
  const by = (list, key, prefix) => { for(const x of list){ const k = prefix + new Date(x[key]).getFullYear(); (out[k] = out[k] || []).push(x); } };
  by(S.shifts, "start", "shifts-"); by(S.invoices, "issue", "invoices-");
  for(const k in out) out[k] = JSON.stringify(out[k]);
  const core = Object.assign({}, S); delete core.shifts; delete core.invoices;
  out.core = JSON.stringify(core);
  return out;
}
async function flush(){
  if(!dbCol) return;
  if(writing){ again = true; return; }
  writing = true;
  try{
    const c = chunks(), stamp = S.updatedAt;
    for(const k of Object.keys(written)) if(!(k in c)) c[k] = "[]";
    const keys = Object.keys(c).filter(k => k !== "core").concat("core"); // core last: it marks a complete save
    for(const k of keys){ if(written[k] !== c[k]){ await dbCol.doc(k).set({data:c[k], updatedAt:stamp}); written[k] = c[k]; } }
    UI.sync = "account"; UI.syncErr = null;
  }catch(e){
    const code = e && e.code;
    if(code === "invalid_argument"){ UI.syncErr = "readonly"; dbCol = null; UI.sync = "local"; render(); }
    else if(code === "quota_exceeded"){ UI.syncErr = "full"; toast("Your account storage is full. Your data is still saved on this device."); }
    else if(code === "revoked" || code === "not_granted"){ dbCol = null; UI.sync = "local"; }
    else { setTimeout(flush, 8000); }
  }
  writing = false;
  if(again){ again = false; flush(); }
}
/* Pulls the newest copy from the account. Runs at start and whenever the app comes back to the screen. */
async function pull(){
  if(!dbCol) return;
  const snap = await dbCol.get();
  const docs = {}; for(const d of snap.docs){ const v = d.data(); if(v) docs[d.id] = v; }
  if(docs.core){
    const remoteAt = docs.core.updatedAt || 0;
    for(const k in docs) if(k !== "state" && typeof docs[k].data === "string") written[k] = docs[k].data;
    if(remoteAt > (S.updatedAt || 0)){
      const core = JSON.parse(docs.core.data);
      core.shifts = []; core.invoices = [];
      for(const k in docs){
        if(k.startsWith("shifts-")) core.shifts.push(...JSON.parse(docs[k].data || "[]"));
        if(k.startsWith("invoices-")) core.invoices.push(...JSON.parse(docs[k].data || "[]"));
      }
      S = hydrate(core); S.updatedAt = remoteAt;
      try{ localStorage.setItem("shiftpay", JSON.stringify(S)); }catch(e){}
      if(S.settings.onboarded && syncRoster()) save();
      applyTheme(); render(); return;
    }
  } else if(docs.state && docs.state.state){ // older single-document format
    const old = JSON.parse(docs.state.state);
    if((docs.state.updatedAt || 0) > (S.updatedAt || 0)){ S = hydrate(old); S.updatedAt = docs.state.updatedAt; applyTheme(); }
    S.updatedAt = Math.max(S.updatedAt || 0, Date.now()); render(); flush(); return;
  }
  if(S.updatedAt) flush();
  render();
}
async function connect(){
  try{
    if(!window.claude || !window.claude.use) return;
    const [db, user] = await Promise.all([claude.use("db"), claude.use("user")]);
    if(!user) return;
    const me = await user.me();
    UI.me = me && me.id ? {id:me.id, name:me.name || "", email:me.email || "", avatar:me.avatarUrl || ""} : null;
    if(UI.obDraft && UI.me){ // prefill setup from the Claude account
      if(!UI.obDraft.name && UI.me.name) UI.obDraft.name = UI.me.name.split(" ")[0];
      if(!UI.obDraft.email && UI.me.email) UI.obDraft.email = UI.me.email;
    }
    render();
    const id = me && me.id;
    if(!id || !db) return;
    dbCol = db.collection("data/users/" + id); UI.sync = "account";
    await pull();
  }catch(e){ dbCol = null; UI.sync = "local"; }
}

/* ============ Formatting ============ */
const fmtCache = {};
const cur = () => S.settings.region === "custom" ? S.settings.customCur : REGIONS[S.settings.region].cur;
function moneyC(v, code, dp=2){
  const k = code+dp;
  if(!fmtCache[k]) fmtCache[k] = new Intl.NumberFormat(undefined,{style:"currency",currency:code,minimumFractionDigits:dp,maximumFractionDigits:dp});
  return fmtCache[k].format(Math.abs(v) < 0.005 ? 0 : v);
}
const money = (v, dp=2) => moneyC(v, cur(), dp);
const money0 = v => money(v,0);
function curSymbol(code){ code = code || cur(); try{ return new Intl.NumberFormat(undefined,{style:"currency",currency:code}).formatToParts(0).find(p=>p.type==="currency").value; }catch(e){ return code; } }
const pct = p => (Math.round(p*10)/10).toString() + "%";
const spct = p => (p >= 0 ? "+" : "−") + pct(Math.abs(p));
const hrs = h => { const m = Math.round(h*60); return `${Math.floor(m/60)}h ${String(m%60).padStart(2,"0")}m`; };
const hdec = h => (Math.round(h*100)/100).toFixed(2);
const pad = n => String(n).padStart(2,"0");
const tm = ms => new Date(ms).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"});
const dayMon = ms => new Date(ms).toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"});
const dm = ms => new Date(ms).toLocaleDateString(undefined,{day:"numeric",month:"short"});
const dmy = ms => new Date(ms).toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"});
const toDT = ms => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const toD = ms => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const fromD = s => { const [y,m,d] = String(s).split("-").map(Number); return new Date(y,(m||1)-1,d||1).getTime(); };
const toT = ms => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const minToT = m => `${pad(Math.floor(m/60)%24)}:${pad(m%60)}`;
const tToMin = s => { const [h,m] = String(s||"0:0").split(":").map(Number); return (h||0)*60+(m||0); };
const clockStr = s => { s = Math.max(0, Math.floor(s)); return `${pad(Math.floor(s/3600))}:${pad(Math.floor(s%3600/60))}:${pad(s%60)}`; };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const nl2br = s => esc(s).replace(/\n/g,"<br>");
/* Icons: Phosphor (MIT), duotone for things, bold for controls. Embedded so they show instantly and never depend on a CDN. */
const ICONS = {"archive-restore":"<path d=\"M216,128a88,88,0,1,1-88-88A88,88,0,0,1,216,128Z\" opacity=\"0.2\"/><path d=\"M136,80v43.47l36.12,21.67a8,8,0,0,1-8.24,13.72l-40-24A8,8,0,0,1,120,128V80a8,8,0,0,1,16,0Zm-8-48A95.44,95.44,0,0,0,60.08,60.15C52.81,67.51,46.35,74.59,40,82V64a8,8,0,0,0-16,0v40a8,8,0,0,0,8,8H72a8,8,0,0,0,0-16H49c7.15-8.42,14.27-16.35,22.39-24.57a80,80,0,1,1,1.66,114.75,8,8,0,1,0-11,11.64A96,96,0,1,0,128,32Z\"/>","arrow-down":"<path d=\"M208.49,152.49l-72,72a12,12,0,0,1-17,0l-72-72a12,12,0,0,1,17-17L116,187V40a12,12,0,0,1,24,0V187l51.51-51.52a12,12,0,0,1,17,17Z\"/>","arrow-up":"<path d=\"M208.49,120.49a12,12,0,0,1-17,0L140,69V216a12,12,0,0,1-24,0V69L64.49,120.49a12,12,0,0,1-17-17l72-72a12,12,0,0,1,17,0l72,72A12,12,0,0,1,208.49,120.49Z\"/>","arrow-up-right":"<path d=\"M204,64V168a12,12,0,0,1-24,0V93L72.49,200.49a12,12,0,0,1-17-17L163,76H88a12,12,0,0,1,0-24H192A12,12,0,0,1,204,64Z\"/>","badge":"<path d=\"M232,128c0,12.51-17.82,21.95-22.68,33.69-4.68,11.32,1.42,30.64-7.78,39.85s-28.53,3.1-39.85,7.78C150,214.18,140.5,232,128,232s-22-17.82-33.69-22.68c-11.32-4.68-30.64,1.42-39.85-7.78s-3.1-28.53-7.78-39.85C41.82,150,24,140.5,24,128s17.82-22,22.68-33.69C51.36,83,45.26,63.67,54.46,54.46S83,51.36,94.31,46.68C106.05,41.82,115.5,24,128,24S150,41.82,161.69,46.68c11.32,4.68,30.64-1.42,39.85,7.78s3.1,28.53,7.78,39.85C214.18,106.05,232,115.5,232,128Z\" opacity=\"0.2\"/><path d=\"M225.86,102.82c-3.77-3.94-7.67-8-9.14-11.57-1.36-3.27-1.44-8.69-1.52-13.94-.15-9.76-.31-20.82-8-28.51s-18.75-7.85-28.51-8c-5.25-.08-10.67-.16-13.94-1.52-3.57-1.47-7.63-5.37-11.57-9.14C146.27,23.51,138.44,16,128,16s-18.27,7.51-25.18,14.14c-3.94,3.77-8,7.67-11.57,9.14C88,40.64,82.56,40.72,77.31,40.8c-9.76.15-20.82.31-28.51,8S41,67.55,40.8,77.31c-.08,5.25-.16,10.67-1.52,13.94-1.47,3.57-5.37,7.63-9.14,11.57C23.51,109.73,16,117.56,16,128s7.51,18.27,14.14,25.18c3.77,3.94,7.67,8,9.14,11.57,1.36,3.27,1.44,8.69,1.52,13.94.15,9.76.31,20.82,8,28.51s18.75,7.85,28.51,8c5.25.08,10.67.16,13.94,1.52,3.57,1.47,7.63,5.37,11.57,9.14C109.73,232.49,117.56,240,128,240s18.27-7.51,25.18-14.14c3.94-3.77,8-7.67,11.57-9.14,3.27-1.36,8.69-1.44,13.94-1.52,9.76-.15,20.82-.31,28.51-8s7.85-18.75,8-28.51c.08-5.25.16-10.67,1.52-13.94,1.47-3.57,5.37-7.63,9.14-11.57C232.49,146.27,240,138.44,240,128S232.49,109.73,225.86,102.82Zm-11.55,39.29c-4.79,5-9.75,10.17-12.38,16.52-2.52,6.1-2.63,13.07-2.73,19.82-.1,7-.21,14.33-3.32,17.43s-10.39,3.22-17.43,3.32c-6.75.1-13.72.21-19.82,2.73-6.35,2.63-11.52,7.59-16.52,12.38S132,224,128,224s-9.14-4.92-14.11-9.69-10.17-9.75-16.52-12.38c-6.1-2.52-13.07-2.63-19.82-2.73-7-.1-14.33-.21-17.43-3.32h0c-3.11-3.1-3.22-10.39-3.32-17.43-.1-6.75-.21-13.72-2.73-19.82-2.63-6.35-7.59-11.52-12.38-16.52S32,132,32,128s4.92-9.14,9.69-14.11,9.75-10.17,12.38-16.52c2.52-6.1,2.63-13.07,2.73-19.82.1-7,.21-14.33,3.32-17.43S70.51,56.9,77.55,56.8c6.75-.1,13.72-.21,19.82-2.73,6.35-2.63,11.52-7.59,16.52-12.38S124,32,128,32s9.14,4.92,14.11,9.69,10.17,9.75,16.52,12.38c6.1,2.52,13.07,2.63,19.82,2.73,7,.1,14.33.21,17.43,3.32s3.22,10.39,3.32,17.43c.1,6.75.21,13.72,2.73,19.82,2.63,6.35,7.59,11.52,12.38,16.52S224,124,224,128,219.08,137.14,214.31,142.11Z\"/>","badge-check":"<path d=\"M232,128c0,12.51-17.82,21.95-22.68,33.69-4.68,11.32,1.42,30.65-7.78,39.85s-28.53,3.1-39.85,7.78C150,214.18,140.5,232,128,232s-22-17.82-33.69-22.68c-11.32-4.68-30.65,1.42-39.85-7.78s-3.1-28.53-7.78-39.85C41.82,150,24,140.5,24,128s17.82-22,22.68-33.69C51.36,83,45.26,63.66,54.46,54.46S83,51.36,94.31,46.68C106.05,41.82,115.5,24,128,24S150,41.82,161.69,46.68c11.32,4.68,30.65-1.42,39.85,7.78s3.1,28.53,7.78,39.85C214.18,106.05,232,115.5,232,128Z\" opacity=\"0.2\"/><path d=\"M225.86,102.82c-3.77-3.94-7.67-8-9.14-11.57-1.36-3.27-1.44-8.69-1.52-13.94-.15-9.76-.31-20.82-8-28.51s-18.75-7.85-28.51-8c-5.25-.08-10.67-.16-13.94-1.52-3.56-1.47-7.63-5.37-11.57-9.14C146.28,23.51,138.44,16,128,16s-18.27,7.51-25.18,14.14c-3.94,3.77-8,7.67-11.57,9.14C88,40.64,82.56,40.72,77.31,40.8c-9.76.15-20.82.31-28.51,8S41,67.55,40.8,77.31c-.08,5.25-.16,10.67-1.52,13.94-1.47,3.56-5.37,7.63-9.14,11.57C23.51,109.72,16,117.56,16,128s7.51,18.27,14.14,25.18c3.77,3.94,7.67,8,9.14,11.57,1.36,3.27,1.44,8.69,1.52,13.94.15,9.76.31,20.82,8,28.51s18.75,7.85,28.51,8c5.25.08,10.67.16,13.94,1.52,3.56,1.47,7.63,5.37,11.57,9.14C109.72,232.49,117.56,240,128,240s18.27-7.51,25.18-14.14c3.94-3.77,8-7.67,11.57-9.14,3.27-1.36,8.69-1.44,13.94-1.52,9.76-.15,20.82-.31,28.51-8s7.85-18.75,8-28.51c.08-5.25.16-10.67,1.52-13.94,1.47-3.56,5.37-7.63,9.14-11.57C232.49,146.28,240,138.44,240,128S232.49,109.73,225.86,102.82Zm-11.55,39.29c-4.79,5-9.75,10.17-12.38,16.52-2.52,6.1-2.63,13.07-2.73,19.82-.1,7-.21,14.33-3.32,17.43s-10.39,3.22-17.43,3.32c-6.75.1-13.72.21-19.82,2.73-6.35,2.63-11.52,7.59-16.52,12.38S132,224,128,224s-9.15-4.92-14.11-9.69-10.17-9.75-16.52-12.38c-6.1-2.52-13.07-2.63-19.82-2.73-7-.1-14.33-.21-17.43-3.32s-3.22-10.39-3.32-17.43c-.1-6.75-.21-13.72-2.73-19.82-2.63-6.35-7.59-11.52-12.38-16.52S32,132,32,128s4.92-9.15,9.69-14.11,9.75-10.17,12.38-16.52c2.52-6.1,2.63-13.07,2.73-19.82.1-7,.21-14.33,3.32-17.43S70.51,56.9,77.55,56.8c6.75-.1,13.72-.21,19.82-2.73,6.35-2.63,11.52-7.59,16.52-12.38S124,32,128,32s9.15,4.92,14.11,9.69,10.17,9.75,16.52,12.38c6.1,2.52,13.07,2.63,19.82,2.73,7,.1,14.33.21,17.43,3.32s3.22,10.39,3.32,17.43c.1,6.75.21,13.72,2.73,19.82,2.63,6.35,7.59,11.52,12.38,16.52S224,124,224,128,219.08,137.15,214.31,142.11ZM173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34Z\"/>","banknote":"<path d=\"M160,128a32,32,0,1,1-32-32A32,32,0,0,1,160,128Zm40-64a48.85,48.85,0,0,0,40,40V64Zm0,128h40V152A48.85,48.85,0,0,0,200,192ZM16,152v40H56A48.85,48.85,0,0,0,16,152Zm0-48A48.85,48.85,0,0,0,56,64H16Z\" opacity=\"0.2\"/><path d=\"M128,88a40,40,0,1,0,40,40A40,40,0,0,0,128,88Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,152ZM240,56H16a8,8,0,0,0-8,8V192a8,8,0,0,0,8,8H240a8,8,0,0,0,8-8V64A8,8,0,0,0,240,56ZM24,72H45.37A40.81,40.81,0,0,1,24,93.37Zm0,112V162.63A40.81,40.81,0,0,1,45.37,184Zm208,0H210.63A40.81,40.81,0,0,1,232,162.63Zm0-38.35A56.78,56.78,0,0,0,193.65,184H62.35A56.78,56.78,0,0,0,24,145.65v-35.3A56.78,56.78,0,0,0,62.35,72h131.3A56.78,56.78,0,0,0,232,110.35Zm0-52.28A40.81,40.81,0,0,1,210.63,72H232Z\"/>","bell-ring":"<path d=\"M208,192H48a8,8,0,0,1-6.88-12C47.71,168.6,56,147.81,56,112a72,72,0,0,1,144,0c0,35.82,8.3,56.6,14.9,68A8,8,0,0,1,208,192Z\" opacity=\"0.2\"/><path d=\"M224,71.1a8,8,0,0,1-10.78-3.42,94.13,94.13,0,0,0-33.46-36.91,8,8,0,1,1,8.54-13.54,111.46,111.46,0,0,1,39.12,43.09A8,8,0,0,1,224,71.1ZM35.71,72a8,8,0,0,0,7.1-4.32A94.13,94.13,0,0,1,76.27,30.77a8,8,0,1,0-8.54-13.54A111.46,111.46,0,0,0,28.61,60.32,8,8,0,0,0,35.71,72Zm186.1,103.94A16,16,0,0,1,208,200H167.2a40,40,0,0,1-78.4,0H48a16,16,0,0,1-13.79-24.06C43.22,160.39,48,138.28,48,112a80,80,0,0,1,160,0C208,138.27,212.78,160.38,221.81,175.94ZM150.62,200H105.38a24,24,0,0,0,45.24,0ZM208,184c-10.64-18.27-16-42.49-16-72a64,64,0,0,0-128,0c0,29.52-5.38,53.74-16,72Z\"/>","box":"<path d=\"M128,129.09V232a8,8,0,0,1-3.84-1l-88-48.18a8,8,0,0,1-4.16-7V80.18a8,8,0,0,1,.7-3.25Z\" opacity=\"0.2\"/><path d=\"M223.68,66.15,135.68,18a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15ZM128,32l80.34,44-29.77,16.3-80.35-44ZM128,120,47.66,76l33.9-18.56,80.34,44ZM40,90l80,43.78v85.79L40,175.82Zm176,85.78h0l-80,43.79V133.82l32-17.51V152a8,8,0,0,0,16,0V107.55L216,90v85.77Z\"/>","briefcase":"<path d=\"M224,118.31V200a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V118.31h0A191.14,191.14,0,0,0,128,144,191.08,191.08,0,0,0,224,118.31Z\" opacity=\"0.2\"/><path d=\"M104,112a8,8,0,0,1,8-8h32a8,8,0,0,1,0,16H112A8,8,0,0,1,104,112ZM232,72V200a16,16,0,0,1-16,16H40a16,16,0,0,1-16-16V72A16,16,0,0,1,40,56H80V48a24,24,0,0,1,24-24h48a24,24,0,0,1,24,24v8h40A16,16,0,0,1,232,72ZM96,56h64V48a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8ZM40,72v41.62A184.07,184.07,0,0,0,128,136a184,184,0,0,0,88-22.39V72ZM216,200V131.63A200.25,200.25,0,0,1,128,152a200.19,200.19,0,0,1-88-20.36V200H216Z\"/>","building":"<path d=\"M136,32V216H40V85.35a8,8,0,0,1,3.56-6.66l80-53.33A8,8,0,0,1,136,32Z\" opacity=\"0.2\"/><path d=\"M240,208H224V96a16,16,0,0,0-16-16H144V32a16,16,0,0,0-24.88-13.32L39.12,72A16,16,0,0,0,32,85.34V208H16a8,8,0,0,0,0,16H240a8,8,0,0,0,0-16ZM208,96V208H144V96ZM48,85.34,128,32V208H48ZM112,112v16a8,8,0,0,1-16,0V112a8,8,0,1,1,16,0Zm-32,0v16a8,8,0,0,1-16,0V112a8,8,0,1,1,16,0Zm0,56v16a8,8,0,0,1-16,0V168a8,8,0,0,1,16,0Zm32,0v16a8,8,0,0,1-16,0V168a8,8,0,0,1,16,0Z\"/>","building-2":"<path d=\"M136,32V216H40V85.35a8,8,0,0,1,3.56-6.66l80-53.33A8,8,0,0,1,136,32Z\" opacity=\"0.2\"/><path d=\"M240,208H224V96a16,16,0,0,0-16-16H144V32a16,16,0,0,0-24.88-13.32L39.12,72A16,16,0,0,0,32,85.34V208H16a8,8,0,0,0,0,16H240a8,8,0,0,0,0-16ZM208,96V208H144V96ZM48,85.34,128,32V208H48ZM112,112v16a8,8,0,0,1-16,0V112a8,8,0,1,1,16,0Zm-32,0v16a8,8,0,0,1-16,0V112a8,8,0,1,1,16,0Zm0,56v16a8,8,0,0,1-16,0V168a8,8,0,0,1,16,0Zm32,0v16a8,8,0,0,1-16,0V168a8,8,0,0,1,16,0Z\"/>","calendar":"<path d=\"M216,48V88H40V48a8,8,0,0,1,8-8H208A8,8,0,0,1,216,48Z\" opacity=\"0.2\"/><path d=\"M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Z\"/>","calendar-check":"<path d=\"M216,48V88H40V48a8,8,0,0,1,8-8H208A8,8,0,0,1,216,48Z\" opacity=\"0.2\"/><path d=\"M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Zm-38.34-85.66a8,8,0,0,1,0,11.32l-48,48a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L116,164.69l42.34-42.35A8,8,0,0,1,169.66,122.34Z\"/>","calendar-clock":"<path d=\"M216,48V88H40V48a8,8,0,0,1,8-8H208A8,8,0,0,1,216,48Z\" opacity=\"0.2\"/><path d=\"M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Zm-68-76a12,12,0,1,1-12-12A12,12,0,0,1,140,132Zm44,0a12,12,0,1,1-12-12A12,12,0,0,1,184,132ZM96,172a12,12,0,1,1-12-12A12,12,0,0,1,96,172Zm44,0a12,12,0,1,1-12-12A12,12,0,0,1,140,172Zm44,0a12,12,0,1,1-12-12A12,12,0,0,1,184,172Z\"/>","calendar-cog":"<path d=\"M216,48V88H40V48a8,8,0,0,1,8-8H208A8,8,0,0,1,216,48Z\" opacity=\"0.2\"/><path d=\"M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Zm-68-76a12,12,0,1,1-12-12A12,12,0,0,1,140,132Zm44,0a12,12,0,1,1-12-12A12,12,0,0,1,184,132ZM96,172a12,12,0,1,1-12-12A12,12,0,0,1,96,172Zm44,0a12,12,0,1,1-12-12A12,12,0,0,1,140,172Zm44,0a12,12,0,1,1-12-12A12,12,0,0,1,184,172Z\"/>","calendar-days":"<path d=\"M216,48V88H40V48a8,8,0,0,1,8-8H208A8,8,0,0,1,216,48Z\" opacity=\"0.2\"/><path d=\"M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Zm-68-76a12,12,0,1,1-12-12A12,12,0,0,1,140,132Zm44,0a12,12,0,1,1-12-12A12,12,0,0,1,184,132ZM96,172a12,12,0,1,1-12-12A12,12,0,0,1,96,172Zm44,0a12,12,0,1,1-12-12A12,12,0,0,1,140,172Zm44,0a12,12,0,1,1-12-12A12,12,0,0,1,184,172Z\"/>","calendar-plus":"<path d=\"M216,48V88H40V48a8,8,0,0,1,8-8H208A8,8,0,0,1,216,48Z\" opacity=\"0.2\"/><path d=\"M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Zm-48-56a8,8,0,0,1-8,8H136v16a8,8,0,0,1-16,0V160H104a8,8,0,0,1,0-16h16V128a8,8,0,0,1,16,0v16h16A8,8,0,0,1,160,152Z\"/>","calendar-range":"<path d=\"M216,48V88H40V48a8,8,0,0,1,8-8H208A8,8,0,0,1,216,48Z\" opacity=\"0.2\"/><path d=\"M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Z\"/>","camera":"<path d=\"M208,64H176L160,40H96L80,64H48A16,16,0,0,0,32,80V192a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V80A16,16,0,0,0,208,64ZM128,168a36,36,0,1,1,36-36A36,36,0,0,1,128,168Z\" opacity=\"0.2\"/><path d=\"M208,56H180.28L166.65,35.56A8,8,0,0,0,160,32H96a8,8,0,0,0-6.65,3.56L75.71,56H48A24,24,0,0,0,24,80V192a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V80A24,24,0,0,0,208,56Zm8,136a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V80a8,8,0,0,1,8-8H80a8,8,0,0,0,6.66-3.56L100.28,48h55.43l13.63,20.44A8,8,0,0,0,176,72h32a8,8,0,0,1,8,8ZM128,88a44,44,0,1,0,44,44A44.05,44.05,0,0,0,128,88Zm0,72a28,28,0,1,1,28-28A28,28,0,0,1,128,160Z\"/>","car":"<path d=\"M88,176a24,24,0,1,1-24-24A24,24,0,0,1,88,176Zm104-24a24,24,0,1,0,24,24A24,24,0,0,0,192,152ZM162.34,74.34A8,8,0,0,0,156.69,72H44.28a8,8,0,0,0-6.66,3.56L8,120H208Z\" opacity=\"0.2\"/><path d=\"M240,112H211.31L168,68.69A15.86,15.86,0,0,0,156.69,64H44.28A16,16,0,0,0,31,71.12L1.34,115.56A8.07,8.07,0,0,0,0,120v48a16,16,0,0,0,16,16H33a32,32,0,0,0,62,0h66a32,32,0,0,0,62,0h17a16,16,0,0,0,16-16V128A16,16,0,0,0,240,112ZM44.28,80H156.69l32,32H23ZM64,192a16,16,0,1,1,16-16A16,16,0,0,1,64,192Zm128,0a16,16,0,1,1,16-16A16,16,0,0,1,192,192Zm48-24H223a32,32,0,0,0-62,0H95a32,32,0,0,0-62,0H16V128H240Z\"/>","chart-pie":"<path d=\"M96,37.5v72l-62.4,36A96,96,0,0,1,96,37.5Z\" opacity=\"0.2\"/><path d=\"M100,116.43a8,8,0,0,0,4-6.93v-72A8,8,0,0,0,93.34,30,104.06,104.06,0,0,0,25.73,147a8,8,0,0,0,4.52,5.81,7.86,7.86,0,0,0,3.35.74,8,8,0,0,0,4-1.07ZM88,49.62v55.26L40.12,132.51C40,131,40,129.48,40,128A88.12,88.12,0,0,1,88,49.62ZM128,24a8,8,0,0,0-8,8v91.82L41.19,169.73a8,8,0,0,0-2.87,11A104,104,0,1,0,128,24Zm0,192a88.47,88.47,0,0,1-71.49-36.68l75.52-44a8,8,0,0,0,4-6.92V40.36A88,88,0,0,1,128,216Z\"/>","chevron-down":"<path d=\"M216.49,104.49l-80,80a12,12,0,0,1-17,0l-80-80a12,12,0,0,1,17-17L128,159l71.51-71.52a12,12,0,0,1,17,17Z\"/>","chevron-left":"<path d=\"M168.49,199.51a12,12,0,0,1-17,17l-80-80a12,12,0,0,1,0-17l80-80a12,12,0,0,1,17,17L97,128Z\"/>","chevron-right":"<path d=\"M184.49,136.49l-80,80a12,12,0,0,1-17-17L159,128,87.51,56.49a12,12,0,1,1,17-17l80,80A12,12,0,0,1,184.49,136.49Z\"/>","circle-check":"<path d=\"M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z\" opacity=\"0.2\"/><path d=\"M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z\"/>","circle-help":"<path d=\"M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z\" opacity=\"0.2\"/><path d=\"M140,180a12,12,0,1,1-12-12A12,12,0,0,1,140,180ZM128,72c-22.06,0-40,16.15-40,36v4a8,8,0,0,0,16,0v-4c0-11,10.77-20,24-20s24,9,24,20-10.77,20-24,20a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-.72c18.24-3.35,32-17.9,32-35.28C168,88.15,150.06,72,128,72Zm104,56A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z\"/>","clock":"<path d=\"M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z\" opacity=\"0.2\"/><path d=\"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z\"/>","cloud-off":"<path d=\"M240,128a80,80,0,0,1-80,80H72A56,56,0,1,1,85.92,97.74l0,.1A80,80,0,0,1,240,128Z\" opacity=\"0.2\"/><path d=\"M53.92,34.62A8,8,0,1,0,42.08,45.38L81.32,88.55l-.06.12A65,65,0,0,0,72,88a64,64,0,0,0,0,128h88a87.34,87.34,0,0,0,31.8-5.93l10.28,11.31a8,8,0,1,0,11.84-10.76ZM160,200H72a48,48,0,0,1,0-96c1.1,0,2.2,0,3.3.12A88.4,88.4,0,0,0,72,128a8,8,0,0,0,16,0,72.25,72.25,0,0,1,5.06-26.54l87,95.7A71.66,71.66,0,0,1,160,200Zm88-72a87.89,87.89,0,0,1-22.35,58.61A8,8,0,0,1,213.71,176,72,72,0,0,0,117.37,70a8,8,0,0,1-9.48-12.89A88,88,0,0,1,248,128Z\"/>","coffee":"<path d=\"M208,88v48a88,88,0,0,1-51.3,80H83.3A88,88,0,0,1,32,136V88Z\" opacity=\"0.2\"/><path d=\"M80,56V24a8,8,0,0,1,16,0V56a8,8,0,0,1-16,0Zm40,8a8,8,0,0,0,8-8V24a8,8,0,0,0-16,0V56A8,8,0,0,0,120,64Zm32,0a8,8,0,0,0,8-8V24a8,8,0,0,0-16,0V56A8,8,0,0,0,152,64Zm96,56v8a40,40,0,0,1-37.51,39.91,96.59,96.59,0,0,1-27,40.09H208a8,8,0,0,1,0,16H32a8,8,0,0,1,0-16H56.54A96.3,96.3,0,0,1,24,136V88a8,8,0,0,1,8-8H208A40,40,0,0,1,248,120ZM200,96H40v40a80.27,80.27,0,0,0,45.12,72h69.76A80.27,80.27,0,0,0,200,136Zm32,24a24,24,0,0,0-16-22.62V136a95.78,95.78,0,0,1-1.2,15A24,24,0,0,0,232,128Z\"/>","copy":"<path d=\"M216,28H88A12,12,0,0,0,76,40V76H40A12,12,0,0,0,28,88V216a12,12,0,0,0,12,12H168a12,12,0,0,0,12-12V180h36a12,12,0,0,0,12-12V40A12,12,0,0,0,216,28ZM156,204H52V100H156Zm48-48H180V88a12,12,0,0,0-12-12H100V52H204Z\"/>","currency":"<path d=\"M240,132c0,19.88-35.82,36-80,36-19.6,0-37.56-3.17-51.47-8.44h0C146.76,156.85,176,142,176,124V96.72h0C212.52,100.06,240,114.58,240,132ZM176,84c0-19.88-35.82-36-80-36S16,64.12,16,84s35.82,36,80,36S176,103.88,176,84Z\" opacity=\"0.2\"/><path d=\"M184,89.57V84c0-25.08-37.83-44-88-44S8,58.92,8,84v40c0,20.89,26.25,37.49,64,42.46V172c0,25.08,37.83,44,88,44s88-18.92,88-44V132C248,111.3,222.58,94.68,184,89.57ZM232,132c0,13.22-30.79,28-72,28-3.73,0-7.43-.13-11.08-.37C170.49,151.77,184,139,184,124V105.74C213.87,110.19,232,122.27,232,132ZM72,150.25V126.46A183.74,183.74,0,0,0,96,128a183.74,183.74,0,0,0,24-1.54v23.79A163,163,0,0,1,96,152,163,163,0,0,1,72,150.25Zm96-40.32V124c0,8.39-12.41,17.4-32,22.87V123.5C148.91,120.37,159.84,115.71,168,109.93ZM96,56c41.21,0,72,14.78,72,28s-30.79,28-72,28S24,97.22,24,84,54.79,56,96,56ZM24,124V109.93c8.16,5.78,19.09,10.44,32,13.57v23.37C36.41,141.4,24,132.39,24,124Zm64,48v-4.17c2.63.1,5.29.17,8,.17,3.88,0,7.67-.13,11.39-.35A121.92,121.92,0,0,0,120,171.41v23.46C100.41,189.4,88,180.39,88,172Zm48,26.25V174.4a179.48,179.48,0,0,0,24,1.6,183.74,183.74,0,0,0,24-1.54v23.79a165.45,165.45,0,0,1-48,0Zm64-3.38V171.5c12.91-3.13,23.84-7.79,32-13.57V172C232,180.39,219.59,189.4,200,194.87Z\"/>","delete":"<path d=\"M216,36H68.53a20.09,20.09,0,0,0-17.15,9.71L5.71,121.83a12,12,0,0,0,0,12.34l45.67,76.12A20.09,20.09,0,0,0,68.53,220H216a20,20,0,0,0,20-20V56A20,20,0,0,0,216,36Zm-4,160H70.8L30,128,70.8,60H212ZM103.51,143.51,119,128l-15.52-15.51a12,12,0,0,1,17-17L136,111l15.51-15.52a12,12,0,0,1,17,17L153,128l15.52,15.51a12,12,0,0,1-17,17L136,145l-15.51,15.52a12,12,0,0,1-17-17Z\"/>","download":"<path d=\"M216,48V208H40V48A16,16,0,0,1,56,32H200A16,16,0,0,1,216,48Z\" opacity=\"0.2\"/><path d=\"M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V32a8,8,0,0,0-16,0v92.69L93.66,98.34a8,8,0,0,0-11.32,11.32Z\"/>","dumbbell":"<path d=\"M96,64V192a8,8,0,0,1-8,8H64a8,8,0,0,1-8-8V64a8,8,0,0,1,8-8H88A8,8,0,0,1,96,64Zm96-8H168a8,8,0,0,0-8,8V192a8,8,0,0,0,8,8h24a8,8,0,0,0,8-8V64A8,8,0,0,0,192,56Z\" opacity=\"0.2\"/><path d=\"M248,120h-8V88a16,16,0,0,0-16-16H208V64a16,16,0,0,0-16-16H168a16,16,0,0,0-16,16v56H104V64A16,16,0,0,0,88,48H64A16,16,0,0,0,48,64v8H32A16,16,0,0,0,16,88v32H8a8,8,0,0,0,0,16h8v32a16,16,0,0,0,16,16H48v8a16,16,0,0,0,16,16H88a16,16,0,0,0,16-16V136h48v56a16,16,0,0,0,16,16h24a16,16,0,0,0,16-16v-8h16a16,16,0,0,0,16-16V136h8a8,8,0,0,0,0-16ZM32,168V88H48v80Zm56,24H64V64H88V192Zm104,0H168V64h24V175.83c0,.06,0,.11,0,.17s0,.12,0,.17V192Zm32-24H208V88h16Z\"/>","ellipsis-vertical":"<path d=\"M112,60a16,16,0,1,1,16,16A16,16,0,0,1,112,60Zm16,52a16,16,0,1,0,16,16A16,16,0,0,0,128,112Zm0,68a16,16,0,1,0,16,16A16,16,0,0,0,128,180Z\"/>","eye":"<path d=\"M128,56C48,56,16,128,16,128s32,72,112,72,112-72,112-72S208,56,128,56Zm0,112a40,40,0,1,1,40-40A40,40,0,0,1,128,168Z\" opacity=\"0.2\"/><path d=\"M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z\"/>","file":"<path d=\"M208,88H152V32Z\" opacity=\"0.2\"/><path d=\"M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z\"/>","file-check":"<path d=\"M208,48V216a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8H96a39.83,39.83,0,0,0-8,24v8h80V64a39.83,39.83,0,0,0-8-24h40A8,8,0,0,1,208,48Z\" opacity=\"0.2\"/><path d=\"M168,152a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,152Zm-8-40H96a8,8,0,0,0,0,16h64a8,8,0,0,0,0-16Zm56-64V216a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V48A16,16,0,0,1,56,32H92.26a47.92,47.92,0,0,1,71.48,0H200A16,16,0,0,1,216,48ZM96,64h64a32,32,0,0,0-64,0ZM200,48H173.25A47.93,47.93,0,0,1,176,64v8a8,8,0,0,1-8,8H88a8,8,0,0,1-8-8V64a47.93,47.93,0,0,1,2.75-16H56V216H200Z\"/>","file-clock":"<path d=\"M180.92,88,128,128,74.67,88Z\" opacity=\"0.2\"/><path d=\"M200,75.64V40a16,16,0,0,0-16-16H72A16,16,0,0,0,56,40V76a16.07,16.07,0,0,0,6.4,12.8L114.67,128,62.4,167.2A16.07,16.07,0,0,0,56,180v36a16,16,0,0,0,16,16H184a16,16,0,0,0,16-16V180.36a16.09,16.09,0,0,0-6.35-12.77L141.27,128l52.38-39.59A16.09,16.09,0,0,0,200,75.64ZM72,40H184V75.64L178.23,80H77.33L72,76Zm56,78L98.67,96h58.4Zm56,98H72V180l48-36v24a8,8,0,0,0,16,0V144.08l48,36.28Z\"/>","file-pen-line":"<path d=\"M67.41,142.56C35.71,129.52,45.41,32.07,78,32,111.82,32.05,92,90.26,67.41,142.56Z\" opacity=\"0.2\"/><path d=\"M232,168H63.86c2.66-5.24,5.33-10.63,8-16.11,14.94,1.65,32.58-8.78,52.66-31.14,5,13.46,14.45,30.93,30.58,31.25,9.09.18,18.11-5.2,27.42-16.37C189.31,143.75,203.3,152,232,152a8,8,0,0,0,0-16c-30.43,0-39.43-10.45-40-16.11a7.67,7.67,0,0,0-5.46-7.75,8.14,8.14,0,0,0-9.25,3.49C165.23,134.17,158,136.06,155.38,136c-8.26-.16-16.66-19.52-19.54-33.42a8,8,0,0,0-14.09-3.37C101.54,124.55,88,133.08,79.57,135.29,88.06,116.42,94.4,99.85,98.46,85.9c6.82-23.44,7.32-39.83,1.51-50.1-3-5.38-9.34-11.8-22.06-11.8C61.85,24,49.18,39.18,43.14,65.65c-3.59,15.71-4.18,33.21-1.62,48s7.87,25.55,15.59,31.94c-3.73,7.72-7.53,15.26-11.23,22.41H24a8,8,0,0,0,0,16H37.41c-11.32,21-20.12,35.64-20.26,35.88a8,8,0,1,0,13.71,8.24c.15-.26,11.27-18.79,24.7-44.12H232a8,8,0,0,0,0-16ZM58.74,69.21C62.72,51.74,70.43,40,77.91,40c5.33,0,7.1,1.86,8.13,3.67,3,5.33,6.52,24.19-21.66,86.39C56.12,118.78,53.31,93,58.74,69.21Z\"/>","file-text":"<path d=\"M208,88H152V32Z\" opacity=\"0.2\"/><path d=\"M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Zm-32-80a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,136Zm0,32a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h64A8,8,0,0,1,168,168Z\"/>","filter":"<path d=\"M221.9,61.38,152,136v58.65a8,8,0,0,1-3.56,6.66l-32,21.33A8,8,0,0,1,104,216V136L34.1,61.38A8,8,0,0,1,40,48H216A8,8,0,0,1,221.9,61.38Z\" opacity=\"0.2\"/><path d=\"M230.6,49.53A15.81,15.81,0,0,0,216,40H40A16,16,0,0,0,28.19,66.76l.08.09L96,139.17V216a16,16,0,0,0,24.87,13.32l32-21.34A16,16,0,0,0,160,194.66V139.17l67.74-72.32.08-.09A15.8,15.8,0,0,0,230.6,49.53ZM40,56h0Zm106.18,74.58A8,8,0,0,0,144,136v58.66L112,216V136a8,8,0,0,0-2.16-5.47L40,56H216Z\"/>","flag":"<path d=\"M224,56V176c-64,55.43-112-55.43-176,0V56C112,.57,160,111.43,224,56Z\" opacity=\"0.2\"/><path d=\"M42.76,50A8,8,0,0,0,40,56V224a8,8,0,0,0,16,0V179.77c26.79-21.16,49.87-9.75,76.45,3.41,16.4,8.11,34.06,16.85,53,16.85,13.93,0,28.54-4.75,43.82-18a8,8,0,0,0,2.76-6V56A8,8,0,0,0,218.76,50c-28,24.23-51.72,12.49-79.21-1.12C111.07,34.76,78.78,18.79,42.76,50ZM216,172.25c-26.79,21.16-49.87,9.74-76.45-3.41-25-12.35-52.81-26.13-83.55-8.4V59.79c26.79-21.16,49.87-9.75,76.45,3.4,25,12.35,52.82,26.13,83.55,8.4Z\"/>","gamepad-2":"<path d=\"M216.86,207.57a28,28,0,0,1-24.66-7.77L150.09,152H172a51.94,51.94,0,0,0,51.2-61h0l16.36,84.17A28,28,0,0,1,216.86,207.57Z\" opacity=\"0.2\"/><path d=\"M176,112H152a8,8,0,0,1,0-16h24a8,8,0,0,1,0,16ZM104,96H96V88a8,8,0,0,0-16,0v8H72a8,8,0,0,0,0,16h8v8a8,8,0,0,0,16,0v-8h8a8,8,0,0,0,0-16ZM241.48,200.65a36,36,0,0,1-54.94,4.81c-.12-.12-.24-.24-.35-.37L146.48,160h-37L69.81,205.09l-.35.37A36.08,36.08,0,0,1,44,216,36,36,0,0,1,8.56,173.75a.68.68,0,0,1,0-.14L24.93,89.52A59.88,59.88,0,0,1,83.89,40H172a60.08,60.08,0,0,1,59,49.25c0,.06,0,.12,0,.18l16.37,84.17a.68.68,0,0,1,0,.14A35.74,35.74,0,0,1,241.48,200.65ZM172,144a44,44,0,0,0,0-88H83.89A43.9,43.9,0,0,0,40.68,92.37l0,.13L24.3,176.59A20,20,0,0,0,58,194.3l41.92-47.59a8,8,0,0,1,6-2.71Zm59.7,32.59-8.74-45A60,60,0,0,1,172,160h-4.2L198,194.31a20.09,20.09,0,0,0,17.46,5.39,20,20,0,0,0,16.23-23.11Z\"/>","gauge":"<path d=\"M232,152v24a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V153.13C24,95.65,70.15,48.2,127.63,48A104,104,0,0,1,232,152Z\" opacity=\"0.2\"/><path d=\"M207.06,72.67A111.24,111.24,0,0,0,128,40h-.4C66.07,40.21,16,91,16,153.13V176a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V152A111.25,111.25,0,0,0,207.06,72.67ZM224,176H119.71l54.76-75.3a8,8,0,0,0-12.94-9.42L99.92,176H32V153.13c0-3.08.15-6.12.43-9.13H56a8,8,0,0,0,0-16H35.27c10.32-38.86,44-68.24,84.73-71.66V80a8,8,0,0,0,16,0V56.33A96.14,96.14,0,0,1,221,128H200a8,8,0,0,0,0,16h23.67c.21,2.65.33,5.31.33,8Z\"/>","gift":"<path d=\"M208,128v72a8,8,0,0,1-8,8H56a8,8,0,0,1-8-8V128Z\" opacity=\"0.2\"/><path d=\"M216,72H180.92c.39-.33.79-.65,1.17-1A29.53,29.53,0,0,0,192,49.57,32.62,32.62,0,0,0,158.44,16,29.53,29.53,0,0,0,137,25.91a54.94,54.94,0,0,0-9,14.48,54.94,54.94,0,0,0-9-14.48A29.53,29.53,0,0,0,97.56,16,32.62,32.62,0,0,0,64,49.57,29.53,29.53,0,0,0,73.91,71c.38.33.78.65,1.17,1H40A16,16,0,0,0,24,88v32a16,16,0,0,0,16,16v64a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V136a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72ZM149,36.51a13.69,13.69,0,0,1,10-4.5h.49A16.62,16.62,0,0,1,176,49.08a13.69,13.69,0,0,1-4.5,10c-9.49,8.4-25.24,11.36-35,12.4C137.7,60.89,141,45.5,149,36.51Zm-64.09.36A16.63,16.63,0,0,1,96.59,32h.49a13.69,13.69,0,0,1,10,4.5c8.39,9.48,11.35,25.2,12.39,34.92-9.72-1-25.44-4-34.92-12.39a13.69,13.69,0,0,1-4.5-10A16.6,16.6,0,0,1,84.87,36.87ZM40,88h80v32H40Zm16,48h64v64H56Zm144,64H136V136h64Zm16-80H136V88h80v32Z\"/>","goal":"<path d=\"M240,104,56,168V40Z\" opacity=\"0.2\"/><path d=\"M242.63,96.44l-184-64A8,8,0,0,0,48,40V216a8,8,0,0,0,16,0V173.69l178.63-62.13a8,8,0,0,0,0-15.12ZM64,156.75V51.25L215.65,104Z\"/>","graduation-cap":"<path d=\"M216,113.07v53.22a8,8,0,0,1-2,5.31c-11.3,12.59-38.9,36.4-86,36.4s-74.68-23.81-86-36.4a8,8,0,0,1-2-5.31V113.07L128,160Z\" opacity=\"0.2\"/><path d=\"M251.76,88.94l-120-64a8,8,0,0,0-7.52,0l-120,64a8,8,0,0,0,0,14.12L32,117.87v48.42a15.91,15.91,0,0,0,4.06,10.65C49.16,191.53,78.51,216,128,216a130,130,0,0,0,48-8.76V240a8,8,0,0,0,16,0V199.51a115.63,115.63,0,0,0,27.94-22.57A15.91,15.91,0,0,0,224,166.29V117.87l27.76-14.81a8,8,0,0,0,0-14.12ZM128,200c-43.27,0-68.72-21.14-80-33.71V126.4l76.24,40.66a8,8,0,0,0,7.52,0L176,143.47v46.34C163.4,195.69,147.52,200,128,200Zm80-33.75a97.83,97.83,0,0,1-16,14.25V134.93l16-8.53ZM188,118.94l-.22-.13-56-29.87a8,8,0,0,0-7.52,14.12L171,128l-43,22.93L25,96,128,41.07,231,96Z\"/>","group":"<path d=\"M168,144a40,40,0,1,1-40-40A40,40,0,0,1,168,144ZM64,56A32,32,0,1,0,96,88,32,32,0,0,0,64,56Zm128,0a32,32,0,1,0,32,32A32,32,0,0,0,192,56Z\" opacity=\"0.2\"/><path d=\"M244.8,150.4a8,8,0,0,1-11.2-1.6A51.6,51.6,0,0,0,192,128a8,8,0,0,1,0-16,24,24,0,1,0-23.24-30,8,8,0,1,1-15.5-4A40,40,0,1,1,219,117.51a67.94,67.94,0,0,1,27.43,21.68A8,8,0,0,1,244.8,150.4ZM190.92,212a8,8,0,1,1-13.85,8,57,57,0,0,0-98.15,0,8,8,0,1,1-13.84-8,72.06,72.06,0,0,1,33.74-29.92,48,48,0,1,1,58.36,0A72.06,72.06,0,0,1,190.92,212ZM128,176a32,32,0,1,0-32-32A32,32,0,0,0,128,176ZM72,120a8,8,0,0,0-8-8A24,24,0,1,1,87.24,82a8,8,0,1,0,15.5-4A40,40,0,1,0,37,117.51,67.94,67.94,0,0,0,9.6,139.19a8,8,0,1,0,12.8,9.61A51.6,51.6,0,0,1,64,128,8,8,0,0,0,72,120Z\"/>","hammer":"<path d=\"M245.66,129,217,157.66a8,8,0,0,1-11.3,0L168.1,120l-28,28-32-32,28-28L80,31.78a87.81,87.81,0,0,1,98.31,18l67.35,67.89A8,8,0,0,1,245.66,129Z\" opacity=\"0.2\"/><path d=\"M251.34,112,183.88,44.08a96.1,96.1,0,0,0-135.77,0l-.09.09L34.25,58.4A8,8,0,0,0,45.74,69.53L59.47,55.35a79.92,79.92,0,0,1,18.71-13.9L124.68,88l-96,96a16,16,0,0,0,0,22.63l20.69,20.69a16,16,0,0,0,22.63,0l96-96,14.34,14.34h0L200,163.3a16,16,0,0,0,22.63,0l28.69-28.69A16,16,0,0,0,251.34,112ZM60.68,216,40,195.31l68-68L128.68,148ZM162.34,114.32,140,136.67,119.31,116l22.35-22.35a8,8,0,0,0,0-11.32L94.32,35a80,80,0,0,1,78.23,20.41l44.22,44.51L188,128.66l-14.34-14.34A8,8,0,0,0,162.34,114.32Zm49,37.66-12-12L228,111.25l12,12Z\"/>","hard-drive-download":"<path d=\"M216,152v48a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V152a8,8,0,0,1,8-8H208A8,8,0,0,1,216,152ZM208,48H48a8,8,0,0,0-8,8v48a8,8,0,0,0,8,8H208a8,8,0,0,0,8-8V56A8,8,0,0,0,208,48Z\" opacity=\"0.2\"/><path d=\"M208,136H48a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V152A16,16,0,0,0,208,136Zm0,64H48V152H208v48Zm0-160H48A16,16,0,0,0,32,56v48a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V56A16,16,0,0,0,208,40Zm0,64H48V56H208v48ZM192,80a12,12,0,1,1-12-12A12,12,0,0,1,192,80Zm0,96a12,12,0,1,1-12-12A12,12,0,0,1,192,176Z\"/>","heart":"<path d=\"M232,102c0,66-104,122-104,122S24,168,24,102A54,54,0,0,1,78,48c22.59,0,41.94,12.31,50,32,8.06-19.69,27.41-32,50-32A54,54,0,0,1,232,102Z\" opacity=\"0.2\"/><path d=\"M178,40c-20.65,0-38.73,8.88-50,23.89C116.73,48.88,98.65,40,78,40a62.07,62.07,0,0,0-62,62c0,70,103.79,126.66,108.21,129a8,8,0,0,0,7.58,0C136.21,228.66,240,172,240,102A62.07,62.07,0,0,0,178,40ZM128,214.8C109.74,204.16,32,155.69,32,102A46.06,46.06,0,0,1,78,56c19.45,0,35.78,10.36,42.6,27a8,8,0,0,0,14.8,0c6.82-16.67,23.15-27,42.6-27a46.06,46.06,0,0,1,46,46C224,155.61,146.24,204.15,128,214.8Z\"/>","history":"<path d=\"M216,128a88,88,0,1,1-88-88A88,88,0,0,1,216,128Z\" opacity=\"0.2\"/><path d=\"M136,80v43.47l36.12,21.67a8,8,0,0,1-8.24,13.72l-40-24A8,8,0,0,1,120,128V80a8,8,0,0,1,16,0Zm-8-48A95.44,95.44,0,0,0,60.08,60.15C52.81,67.51,46.35,74.59,40,82V64a8,8,0,0,0-16,0v40a8,8,0,0,0,8,8H72a8,8,0,0,0,0-16H49c7.15-8.42,14.27-16.35,22.39-24.57a80,80,0,1,1,1.66,114.75,8,8,0,1,0-11,11.64A96,96,0,1,0,128,32Z\"/>","house":"<path d=\"M216,120v96H152V152H104v64H40V120a8,8,0,0,1,2.34-5.66l80-80a8,8,0,0,1,11.32,0l80,80A8,8,0,0,1,216,120Z\" opacity=\"0.2\"/><path d=\"M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V160h32v56a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48V120l80-80,80,80Z\"/>","import":"<path d=\"M216,48V208H40V48A16,16,0,0,1,56,32H200A16,16,0,0,1,216,48Z\" opacity=\"0.2\"/><path d=\"M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V32a8,8,0,0,0-16,0v92.69L93.66,98.34a8,8,0,0,0-11.32,11.32Z\"/>","info":"<path d=\"M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z\" opacity=\"0.2\"/><path d=\"M144,176a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176Zm88-48A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128ZM124,96a12,12,0,1,0-12-12A12,12,0,0,0,124,96Z\"/>","landmark":"<path d=\"M232,96H24L128,32Z\" opacity=\"0.2\"/><path d=\"M24,104H48v64H32a8,8,0,0,0,0,16H224a8,8,0,0,0,0-16H208V104h24a8,8,0,0,0,4.19-14.81l-104-64a8,8,0,0,0-8.38,0l-104,64A8,8,0,0,0,24,104Zm40,0H96v64H64Zm80,0v64H112V104Zm48,64H160V104h32ZM128,41.39,203.74,88H52.26ZM248,208a8,8,0,0,1-8,8H16a8,8,0,0,1,0-16H240A8,8,0,0,1,248,208Z\"/>","laptop":"<path d=\"M216,72V176H40V72A16,16,0,0,1,56,56H200A16,16,0,0,1,216,72Z\" opacity=\"0.2\"/><path d=\"M232,168h-8V72a24,24,0,0,0-24-24H56A24,24,0,0,0,32,72v96H24a8,8,0,0,0-8,8v16a24,24,0,0,0,24,24H216a24,24,0,0,0,24-24V176A8,8,0,0,0,232,168ZM48,72a8,8,0,0,1,8-8H200a8,8,0,0,1,8,8v96H48ZM224,192a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8v-8H224ZM152,88a8,8,0,0,1-8,8H112a8,8,0,0,1,0-16h32A8,8,0,0,1,152,88Z\"/>","layers":"<path d=\"M224,80l-96,56L32,80l96-56Z\" opacity=\"0.2\"/><path d=\"M230.91,172A8,8,0,0,1,228,182.91l-96,56a8,8,0,0,1-8.06,0l-96-56A8,8,0,0,1,36,169.09l92,53.65,92-53.65A8,8,0,0,1,230.91,172ZM220,121.09l-92,53.65L36,121.09A8,8,0,0,0,28,134.91l96,56a8,8,0,0,0,8.06,0l96-56A8,8,0,1,0,220,121.09ZM24,80a8,8,0,0,1,4-6.91l96-56a8,8,0,0,1,8.06,0l96,56a8,8,0,0,1,0,13.82l-96,56a8,8,0,0,1-8.06,0l-96-56A8,8,0,0,1,24,80Zm23.88,0L128,126.74,208.12,80,128,33.26Z\"/>","life-buoy":"<path d=\"M195.88,195.88l-39.6-39.6a40,40,0,0,0,0-56.56l39.6-39.6A96,96,0,0,1,195.88,195.88ZM60.12,60.12a96,96,0,0,0,0,135.76l39.6-39.6a40,40,0,0,1,0-56.56Z\" opacity=\"0.2\"/><path d=\"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm39.1,131.79a47.84,47.84,0,0,0,0-55.58l28.5-28.49a87.83,87.83,0,0,1,0,112.56ZM96,128a32,32,0,1,1,32,32A32,32,0,0,1,96,128Zm88.28-67.6L155.79,88.9a47.84,47.84,0,0,0-55.58,0L71.72,60.4a87.83,87.83,0,0,1,112.56,0ZM60.4,71.72l28.5,28.49a47.84,47.84,0,0,0,0,55.58L60.4,184.28a87.83,87.83,0,0,1,0-112.56ZM71.72,195.6l28.49-28.5a47.84,47.84,0,0,0,55.58,0l28.49,28.5a87.83,87.83,0,0,1-112.56,0Z\"/>","link":"<path d=\"M218.34,119.6,183.6,154.34a46.58,46.58,0,0,1-44.31,12.26c-.31.34-.62.67-.95,1L103.6,202.34A46.63,46.63,0,1,1,37.66,136.4L72.4,101.66A46.6,46.6,0,0,1,116.71,89.4c.31-.34.62-.67,1-1L152.4,53.66a46.63,46.63,0,0,1,65.94,65.94Z\" opacity=\"0.2\"/><path d=\"M240,88.23a54.43,54.43,0,0,1-16,37L189.25,160a54.27,54.27,0,0,1-38.63,16h-.05A54.63,54.63,0,0,1,96,119.84a8,8,0,0,1,16,.45A38.62,38.62,0,0,0,150.58,160h0a38.39,38.39,0,0,0,27.31-11.31l34.75-34.75a38.63,38.63,0,0,0-54.63-54.63l-11,11A8,8,0,0,1,135.7,59l11-11A54.65,54.65,0,0,1,224,48,54.86,54.86,0,0,1,240,88.23ZM109,185.66l-11,11A38.41,38.41,0,0,1,70.6,208h0a38.63,38.63,0,0,1-27.29-65.94L78,107.31A38.63,38.63,0,0,1,144,135.71a8,8,0,0,0,7.78,8.22H152a8,8,0,0,0,8-7.78A54.86,54.86,0,0,0,144,96a54.65,54.65,0,0,0-77.27,0L32,130.75A54.62,54.62,0,0,0,70.56,224h0a54.28,54.28,0,0,0,38.64-16l11-11A8,8,0,0,0,109,185.66Z\"/>","list":"<path d=\"M216,64V192H40V64Z\" opacity=\"0.2\"/><path d=\"M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z\"/>","lock":"<path d=\"M216,96V208a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V96a8,8,0,0,1,8-8H208A8,8,0,0,1,216,96Z\" opacity=\"0.2\"/><path d=\"M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Zm-68-56a12,12,0,1,1-12-12A12,12,0,0,1,140,152Z\"/>","mic":"<path d=\"M168,64v64a40,40,0,0,1-40,40h0a40,40,0,0,1-40-40V64a40,40,0,0,1,40-40h0A40,40,0,0,1,168,64Z\" opacity=\"0.2\"/><path d=\"M128,176a48.05,48.05,0,0,0,48-48V64a48,48,0,0,0-96,0v64A48.05,48.05,0,0,0,128,176ZM96,64a32,32,0,0,1,64,0v64a32,32,0,0,1-64,0Zm40,143.6V240a8,8,0,0,1-16,0V207.6A80.11,80.11,0,0,1,48,128a8,8,0,0,1,16,0,64,64,0,0,0,128,0,8,8,0,0,1,16,0A80.11,80.11,0,0,1,136,207.6Z\"/>","package":"<path d=\"M128,129.09V232a8,8,0,0,1-3.84-1l-88-48.18a8,8,0,0,1-4.16-7V80.18a8,8,0,0,1,.7-3.25Z\" opacity=\"0.2\"/><path d=\"M223.68,66.15,135.68,18a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15ZM128,32l80.34,44-29.77,16.3-80.35-44ZM128,120,47.66,76l33.9-18.56,80.34,44ZM40,90l80,43.78v85.79L40,175.82Zm176,85.78h0l-80,43.79V133.82l32-17.51V152a8,8,0,0,0,16,0V107.55L216,90v85.77Z\"/>","palette":"<path d=\"M224,127.17a96.48,96.48,0,0,1-2.39,22.18A24,24,0,0,1,198.21,168H152a24,24,0,0,0-24,24,24,24,0,0,1-32,22.61C58.73,201.44,32,169.81,32,128a96,96,0,0,1,95-96C179.84,31.47,223.55,74.35,224,127.17Z\" opacity=\"0.2\"/><path d=\"M200.77,53.89A103.27,103.27,0,0,0,128,24h-1.07A104,104,0,0,0,24,128c0,43,26.58,79.06,69.36,94.17A32,32,0,0,0,136,192a16,16,0,0,1,16-16h46.21a31.81,31.81,0,0,0,31.2-24.88,104.43,104.43,0,0,0,2.59-24A103.28,103.28,0,0,0,200.77,53.89Zm13,93.71A15.89,15.89,0,0,1,198.21,160H152a32,32,0,0,0-32,32,16,16,0,0,1-21.31,15.07C62.49,194.3,40,164,40,128a88,88,0,0,1,87.09-88h.9a88.35,88.35,0,0,1,88,87.25A88.86,88.86,0,0,1,213.81,147.6ZM140,76a12,12,0,1,1-12-12A12,12,0,0,1,140,76ZM96,100A12,12,0,1,1,84,88,12,12,0,0,1,96,100Zm0,56a12,12,0,1,1-12-12A12,12,0,0,1,96,156Zm88-56a12,12,0,1,1-12-12A12,12,0,0,1,184,100Z\"/>","pencil":"<path d=\"M221.66,90.34,192,120,136,64l29.66-29.66a8,8,0,0,1,11.31,0L221.66,79A8,8,0,0,1,221.66,90.34Z\" opacity=\"0.2\"/><path d=\"M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z\"/>","phone":"<path d=\"M223.94,174.08A48.33,48.33,0,0,1,176,216,136,136,0,0,1,40,80,48.33,48.33,0,0,1,81.92,32.06a8,8,0,0,1,8.3,4.8l21.13,47.2a8,8,0,0,1-.66,7.53L89.32,117a7.93,7.93,0,0,0-.54,7.81c8.27,16.93,25.77,34.22,42.75,42.41a7.92,7.92,0,0,0,7.83-.59l25-21.3a8,8,0,0,1,7.59-.69l47.16,21.13A8,8,0,0,1,223.94,174.08Z\" opacity=\"0.2\"/><path d=\"M222.37,158.46l-47.11-21.11-.13-.06a16,16,0,0,0-15.17,1.4,8.12,8.12,0,0,0-.75.56L134.87,160c-15.42-7.49-31.34-23.29-38.83-38.51l20.78-24.71c.2-.25.39-.5.57-.77a16,16,0,0,0,1.32-15.06l0-.12L97.54,33.64a16,16,0,0,0-16.62-9.52A56.26,56.26,0,0,0,32,80c0,79.4,64.6,144,144,144a56.26,56.26,0,0,0,55.88-48.92A16,16,0,0,0,222.37,158.46ZM176,208A128.14,128.14,0,0,1,48,80,40.2,40.2,0,0,1,82.87,40a.61.61,0,0,0,0,.12l21,47L83.2,111.86a6.13,6.13,0,0,0-.57.77,16,16,0,0,0-1,15.7c9.06,18.53,27.73,37.06,46.46,46.11a16,16,0,0,0,15.75-1.14,8.44,8.44,0,0,0,.74-.56L168.89,152l47,21.05h0s.08,0,.11,0A40.21,40.21,0,0,1,176,208Z\"/>","piggy-bank":"<path d=\"M240,112v32a16,16,0,0,1-16,16h-8l-18.1,50.69a8,8,0,0,1-7.54,5.31H177.64a8,8,0,0,1-7.54-5.31L166.29,200H97.71L93.9,210.69A8,8,0,0,1,86.36,216H73.64a8,8,0,0,1-7.54-5.31L53,174a79.7,79.7,0,0,1-21-54h0a80,80,0,0,1,80-80h32a80,80,0,0,1,73.44,48.22,82.22,82.22,0,0,1,2.9,7.78H224A16,16,0,0,1,240,112Z\" opacity=\"0.2\"/><path d=\"M192,116a12,12,0,1,1-12-12A12,12,0,0,1,192,116ZM152,64H112a8,8,0,0,0,0,16h40a8,8,0,0,0,0-16Zm96,48v32a24,24,0,0,1-24,24h-2.36l-16.21,45.38A16,16,0,0,1,190.36,224H177.64a16,16,0,0,1-15.07-10.62L160.65,208h-57.3l-1.92,5.38A16,16,0,0,1,86.36,224H73.64a16,16,0,0,1-15.07-10.62L46,178.22a87.69,87.69,0,0,1-21.44-48.38A16,16,0,0,0,16,144a8,8,0,0,1-16,0,32,32,0,0,1,24.28-31A88.12,88.12,0,0,1,112,32H216a8,8,0,0,1,0,16H194.61a87.93,87.93,0,0,1,30.17,37c.43,1,.85,2,1.25,3A24,24,0,0,1,248,112Zm-16,0a8,8,0,0,0-8-8h-3.66a8,8,0,0,1-7.64-5.6A71.9,71.9,0,0,0,144,48H112A72,72,0,0,0,58.91,168.64a8,8,0,0,1,1.64,2.71L73.64,208H86.36l3.82-10.69A8,8,0,0,1,97.71,192h68.58a8,8,0,0,1,7.53,5.31L177.64,208h12.72l18.11-50.69A8,8,0,0,1,216,152h8a8,8,0,0,0,8-8Z\"/>","pin":"<path d=\"M229.66,98.34,172.39,155.8c11.46,22.93-1.72,45.86-10.11,57a8,8,0,0,1-12,.83L42.34,105.76A8,8,0,0,1,43,93.85c29.65-23.92,57.4-10,57.4-10l57.27-57.46a8,8,0,0,1,11.31,0L229.66,87A8,8,0,0,1,229.66,98.34Z\" opacity=\"0.2\"/><path d=\"M235.32,81.37,174.63,20.69a16,16,0,0,0-22.63,0L98.37,74.49c-10.66-3.34-35-7.37-60.4,13.14a16,16,0,0,0-1.29,23.78L85,159.71,42.34,202.34a8,8,0,0,0,11.32,11.32L96.29,171l48.29,48.29A16,16,0,0,0,155.9,224c.38,0,.75,0,1.13,0a15.93,15.93,0,0,0,11.64-6.33c19.64-26.1,17.75-47.32,13.19-60L235.33,104A16,16,0,0,0,235.32,81.37ZM224,92.69h0l-57.27,57.46a8,8,0,0,0-1.49,9.22c9.46,18.93-1.8,38.59-9.34,48.62L48,100.08c12.08-9.74,23.64-12.31,32.48-12.31A40.13,40.13,0,0,1,96.81,91a8,8,0,0,0,9.25-1.51L163.32,32,224,92.68Z\"/>","plane":"<path d=\"M209,81l-33,31,32,88-24,24-48-72-24,24v24L88,224,72,184,32,168l24-24H80l24-24L32,72,56,48l88,32,31-33A24,24,0,0,1,209,81Z\" opacity=\"0.2\"/><path d=\"M185.33,114.21l29.14-27.43.17-.16a32,32,0,0,0-45.26-45.26l-.16.17L141.79,70.67l-83-30.2a8,8,0,0,0-8.39,1.86l-24,24a8,8,0,0,0,1.22,12.31l63.89,42.59L76.69,136H56a8,8,0,0,0-5.65,2.34l-24,24A8,8,0,0,0,29,175.42l36.82,14.73,14.7,36.75.06.16a8,8,0,0,0,13.18,2.47l23.87-23.88A8,8,0,0,0,120,200V179.31l14.76-14.76,42.59,63.89a8,8,0,0,0,12.31,1.22l24-24a8,8,0,0,0,1.86-8.39Zm-.07,97.23-42.59-63.89A8,8,0,0,0,136.8,144a7.09,7.09,0,0,0-.79,0,8,8,0,0,0-5.66,2.34l-24,24A8,8,0,0,0,104,176v20.69L90.93,209.76,79.43,181A8,8,0,0,0,75,176.57l-28.74-11.5L59.32,152H80a8,8,0,0,0,5.66-2.34l24-24a8,8,0,0,0-1.22-12.32L44.56,70.74l13.5-13.49,83.22,30.26a8,8,0,0,0,8.56-2l30.94-32.88A16,16,0,0,1,203.4,75.22l-32.87,30.94a8,8,0,0,0-2,8.56l30.26,83.22Z\"/>","play":"<path d=\"M234.49,111.07,90.41,22.94A20,20,0,0,0,60,39.87V216.13a20,20,0,0,0,30.41,16.93l144.08-88.13a19.82,19.82,0,0,0,0-33.86ZM84,208.85V47.15L216.16,128Z\"/>","plus":"<path d=\"M228,128a12,12,0,0,1-12,12H140v76a12,12,0,0,1-24,0V140H40a12,12,0,0,1,0-24h76V40a12,12,0,0,1,24,0v76h76A12,12,0,0,1,228,128Z\"/>","receipt":"<path d=\"M224,56V208l-32-16-32,16-32-16L96,208,64,192,32,208V56a8,8,0,0,1,8-8H216A8,8,0,0,1,224,56Z\" opacity=\"0.2\"/><path d=\"M72,104a8,8,0,0,1,8-8h96a8,8,0,0,1,0,16H80A8,8,0,0,1,72,104Zm8,40h96a8,8,0,0,0,0-16H80a8,8,0,0,0,0,16ZM232,56V208a8,8,0,0,1-11.58,7.15L192,200.94l-28.42,14.21a8,8,0,0,1-7.16,0L128,200.94,99.58,215.15a8,8,0,0,1-7.16,0L64,200.94,35.58,215.15A8,8,0,0,1,24,208V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56Zm-16,0H40V195.06l20.42-10.22a8,8,0,0,1,7.16,0L96,199.06l28.42-14.22a8,8,0,0,1,7.16,0L160,199.06l28.42-14.22a8,8,0,0,1,7.16,0L216,195.06Z\"/>","refresh-cw":"<path d=\"M228,48V96a12,12,0,0,1-12,12H168a12,12,0,0,1,0-24h19l-7.8-7.8a75.55,75.55,0,0,0-53.32-22.26h-.43A75.49,75.49,0,0,0,72.39,75.57,12,12,0,1,1,55.61,58.41a99.38,99.38,0,0,1,69.87-28.47H126A99.42,99.42,0,0,1,196.2,59.23L204,67V48a12,12,0,0,1,24,0ZM183.61,180.43a75.49,75.49,0,0,1-53.09,21.63h-.43A75.55,75.55,0,0,1,76.77,179.8L69,172H88a12,12,0,0,0,0-24H40a12,12,0,0,0-12,12v48a12,12,0,0,0,24,0V189l7.8,7.8A99.42,99.42,0,0,0,130,226.06h.56a99.38,99.38,0,0,0,69.87-28.47,12,12,0,0,0-16.78-17.16Z\"/>","repeat":"<path d=\"M224,64v64a64,64,0,0,1-64,64H32V128A64,64,0,0,1,96,64Z\" opacity=\"0.2\"/><path d=\"M24,128A72.08,72.08,0,0,1,96,56H204.69L194.34,45.66a8,8,0,0,1,11.32-11.32l24,24a8,8,0,0,1,0,11.32l-24,24a8,8,0,0,1-11.32-11.32L204.69,72H96a56.06,56.06,0,0,0-56,56,8,8,0,0,1-16,0Zm200-8a8,8,0,0,0-8,8,56.06,56.06,0,0,1-56,56H51.31l10.35-10.34a8,8,0,0,0-11.32-11.32l-24,24a8,8,0,0,0,0,11.32l24,24a8,8,0,0,0,11.32-11.32L51.31,200H160a72.08,72.08,0,0,0,72-72A8,8,0,0,0,224,120Z\"/>","rotate-ccw":"<path d=\"M228,128a100,100,0,0,1-98.66,100H128a99.39,99.39,0,0,1-68.62-27.29,12,12,0,0,1,16.48-17.45,76,76,0,1,0-1.57-109c-.13.13-.25.25-.39.37L54.89,92H72a12,12,0,0,1,0,24H24a12,12,0,0,1-12-12V56a12,12,0,0,1,24,0V76.72L57.48,57.06A100,100,0,0,1,228,128Z\"/>","save":"<path d=\"M216,83.31V208a8,8,0,0,1-8,8H176V152a8,8,0,0,0-8-8H88a8,8,0,0,0-8,8v64H48a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8H172.69a8,8,0,0,1,5.65,2.34l35.32,35.32A8,8,0,0,1,216,83.31Z\" opacity=\"0.2\"/><path d=\"M219.31,72,184,36.69A15.86,15.86,0,0,0,172.69,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V83.31A15.86,15.86,0,0,0,219.31,72ZM168,208H88V152h80Zm40,0H184V152a16,16,0,0,0-16-16H88a16,16,0,0,0-16,16v56H48V48H172.69L208,83.31ZM160,72a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h56A8,8,0,0,1,160,72Z\"/>","scale":"<path d=\"M56,88l32,80c0,17.67-20,24-32,24s-32-6.33-32-24ZM200,56l-32,80c0,17.67,20,24,32,24s32-6.33,32-24Z\" opacity=\"0.2\"/><path d=\"M239.43,133l-32-80h0a8,8,0,0,0-9.16-4.84L136,62V40a8,8,0,0,0-16,0V65.58L54.26,80.19A8,8,0,0,0,48.57,85h0v.06L16.57,165a7.92,7.92,0,0,0-.57,3c0,23.31,24.54,32,40,32s40-8.69,40-32a7.92,7.92,0,0,0-.57-3L66.92,93.77,120,82V208H104a8,8,0,0,0,0,16h48a8,8,0,0,0,0-16H136V78.42L187,67.1,160.57,133a7.92,7.92,0,0,0-.57,3c0,23.31,24.54,32,40,32s40-8.69,40-32A7.92,7.92,0,0,0,239.43,133ZM56,184c-7.53,0-22.76-3.61-23.93-14.64L56,109.54l23.93,59.82C78.76,180.39,63.53,184,56,184Zm144-32c-7.53,0-22.76-3.61-23.93-14.64L200,77.54l23.93,59.82C222.76,148.39,207.53,152,200,152Z\"/>","scan-line":"<path d=\"M176,80v96H80V80Z\" opacity=\"0.2\"/><path d=\"M224,40V80a8,8,0,0,1-16,0V48H176a8,8,0,0,1,0-16h40A8,8,0,0,1,224,40ZM80,208H48V176a8,8,0,0,0-16,0v40a8,8,0,0,0,8,8H80a8,8,0,0,0,0-16Zm136-40a8,8,0,0,0-8,8v32H176a8,8,0,0,0,0,16h40a8,8,0,0,0,8-8V176A8,8,0,0,0,216,168ZM40,88a8,8,0,0,0,8-8V48H80a8,8,0,0,0,0-16H40a8,8,0,0,0-8,8V80A8,8,0,0,0,40,88ZM80,72h96a8,8,0,0,1,8,8v96a8,8,0,0,1-8,8H80a8,8,0,0,1-8-8V80A8,8,0,0,1,80,72Zm8,96h80V88H88Z\"/>","scissors":"<path d=\"M40.2,95.8a28,28,0,1,1,39.6,0A28,28,0,0,1,40.2,95.8Zm0,64.4a28,28,0,1,0,39.6,0A28,28,0,0,0,40.2,160.2Z\" opacity=\"0.2\"/><path d=\"M157.73,113.13A8,8,0,0,1,159.82,102L227.48,55.7a8,8,0,0,1,9,13.21l-67.67,46.3a7.92,7.92,0,0,1-4.51,1.4A8,8,0,0,1,157.73,113.13Zm80.87,85.09a8,8,0,0,1-11.12,2.08L136,137.7,93.49,166.78a36,36,0,1,1-9-13.19L121.83,128,84.44,102.41a35.86,35.86,0,1,1,9-13.19l143,97.87A8,8,0,0,1,238.6,198.22ZM80,180a20,20,0,1,0-5.86,14.14A19.85,19.85,0,0,0,80,180ZM74.14,90.13a20,20,0,1,0-28.28,0A19.85,19.85,0,0,0,74.14,90.13Z\"/>","search":"<path d=\"M232.49,215.51,185,168a92.12,92.12,0,1,0-17,17l47.53,47.54a12,12,0,0,0,17-17ZM44,112a68,68,0,1,1,68,68A68.07,68.07,0,0,1,44,112Z\"/>","share":"<path d=\"M220,112v96a20,20,0,0,1-20,20H56a20,20,0,0,1-20-20V112A20,20,0,0,1,56,92H76a12,12,0,0,1,0,24H60v88H196V116H180a12,12,0,0,1,0-24h20A20,20,0,0,1,220,112ZM96.49,72.49,116,53v83a12,12,0,0,0,24,0V53l19.51,19.52a12,12,0,1,0,17-17l-40-40a12,12,0,0,0-17,0l-40,40a12,12,0,1,0,17,17Z\"/>","sheet":"<path d=\"M88,104v96H32V104Z\" opacity=\"0.2\"/><path d=\"M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48ZM40,112H80v32H40Zm56,0H216v32H96ZM216,64V96H40V64ZM40,160H80v32H40Zm176,32H96V160H216v32Z\"/>","shield-check":"<path d=\"M216,56v56c0,96-88,120-88,120S40,208,40,112V56a8,8,0,0,1,8-8H208A8,8,0,0,1,216,56Z\" opacity=\"0.2\"/><path d=\"M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.26,47,25.53a8,8,0,0,0,4.2,0c1-.27,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40Zm0,72c0,37.07-13.66,67.16-40.6,89.42A129.3,129.3,0,0,1,128,223.62a128.25,128.25,0,0,1-38.92-21.81C61.82,179.51,48,149.3,48,112l0-56,160,0ZM82.34,141.66a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32l-56,56a8,8,0,0,1-11.32,0Z\"/>","shopping-bag":"<path d=\"M224,56V200a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V56a8,8,0,0,1,8-8H216A8,8,0,0,1,224,56Z\" opacity=\"0.2\"/><path d=\"M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM176,88a48,48,0,0,1-96,0,8,8,0,0,1,16,0,32,32,0,0,0,64,0,8,8,0,0,1,16,0Z\"/>","shopping-cart":"<path d=\"M224,64l-12.16,66.86A16,16,0,0,1,196.1,144H70.55L56,64Z\" opacity=\"0.2\"/><path d=\"M230.14,58.87A8,8,0,0,0,224,56H62.68L56.6,22.57A8,8,0,0,0,48.73,16H24a8,8,0,0,0,0,16h18L67.56,172.29a24,24,0,0,0,5.33,11.27,28,28,0,1,0,44.4,8.44h45.42A27.75,27.75,0,0,0,160,204a28,28,0,1,0,28-28H91.17a8,8,0,0,1-7.87-6.57L80.13,152h116a24,24,0,0,0,23.61-19.71l12.16-66.86A8,8,0,0,0,230.14,58.87ZM104,204a12,12,0,1,1-12-12A12,12,0,0,1,104,204Zm96,0a12,12,0,1,1-12-12A12,12,0,0,1,200,204Zm4-74.57A8,8,0,0,1,196.1,136H77.22L65.59,72H214.41Z\"/>","smartphone":"<path d=\"M192,56V200H64V56Z\" opacity=\"0.2\"/><path d=\"M176,16H80A24,24,0,0,0,56,40V216a24,24,0,0,0,24,24h96a24,24,0,0,0,24-24V40A24,24,0,0,0,176,16ZM72,64H184V192H72Zm8-32h96a8,8,0,0,1,8,8v8H72V40A8,8,0,0,1,80,32Zm96,192H80a8,8,0,0,1-8-8v-8H184v8A8,8,0,0,1,176,224Z\"/>","sparkles":"<path d=\"M194.82,151.43l-55.09,20.3-20.3,55.09a7.92,7.92,0,0,1-14.86,0l-20.3-55.09-55.09-20.3a7.92,7.92,0,0,1,0-14.86l55.09-20.3,20.3-55.09a7.92,7.92,0,0,1,14.86,0l20.3,55.09,55.09,20.3A7.92,7.92,0,0,1,194.82,151.43Z\" opacity=\"0.2\"/><path d=\"M197.58,129.06,146,110l-19-51.62a15.92,15.92,0,0,0-29.88,0L78,110l-51.62,19a15.92,15.92,0,0,0,0,29.88L78,178l19,51.62a15.92,15.92,0,0,0,29.88,0L146,178l51.62-19a15.92,15.92,0,0,0,0-29.88ZM137,164.22a8,8,0,0,0-4.74,4.74L112,223.85,91.78,169A8,8,0,0,0,87,164.22L32.15,144,87,123.78A8,8,0,0,0,91.78,119L112,64.15,132.22,119a8,8,0,0,0,4.74,4.74L191.85,144ZM144,40a8,8,0,0,1,8-8h16V16a8,8,0,0,1,16,0V32h16a8,8,0,0,1,0,16H184V64a8,8,0,0,1-16,0V48H152A8,8,0,0,1,144,40ZM248,88a8,8,0,0,1-8,8h-8v8a8,8,0,0,1-16,0V96h-8a8,8,0,0,1,0-16h8V72a8,8,0,0,1,16,0v8h8A8,8,0,0,1,248,88Z\"/>","square":"<path d=\"M200,36H56A20,20,0,0,0,36,56V200a20,20,0,0,0,20,20H200a20,20,0,0,0,20-20V56A20,20,0,0,0,200,36Zm-4,160H60V60H196Z\"/>","stethoscope":"<path d=\"M240,160a32,32,0,1,1-32-32A32,32,0,0,1,240,160Z\" opacity=\"0.2\"/><path d=\"M220,160a12,12,0,1,1-12-12A12,12,0,0,1,220,160Zm-4.55,39.29A48.08,48.08,0,0,1,168,240H144a48.05,48.05,0,0,1-48-48V151.49A64,64,0,0,1,40,88V40a8,8,0,0,1,8-8H72a8,8,0,0,1,0,16H56V88a48,48,0,0,0,48.64,48c26.11-.34,47.36-22.25,47.36-48.83V48H136a8,8,0,0,1,0-16h24a8,8,0,0,1,8,8V87.17c0,32.84-24.53,60.29-56,64.31V192a32,32,0,0,0,32,32h24a32.06,32.06,0,0,0,31.22-25,40,40,0,1,1,16.23.27ZM232,160a24,24,0,1,0-24,24A24,24,0,0,0,232,160Z\"/>","sun":"<path d=\"M184,128a56,56,0,1,1-56-56A56,56,0,0,1,184,128Z\" opacity=\"0.2\"/><path d=\"M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z\"/>","target":"<path d=\"M176,128a48,48,0,1,1-48-48A48,48,0,0,1,176,128Z\" opacity=\"0.2\"/><path d=\"M221.87,83.16A104.1,104.1,0,1,1,195.67,49l22.67-22.68a8,8,0,0,1,11.32,11.32l-96,96a8,8,0,0,1-11.32-11.32l27.72-27.72a40,40,0,1,0,17.87,31.09,8,8,0,1,1,16-.9,56,56,0,1,1-22.38-41.65L184.3,60.39a87.88,87.88,0,1,0,23.13,29.67,8,8,0,0,1,14.44-6.9Z\"/>","text":"<path d=\"M232,164c0,15.46-14.33,28-32,28s-32-12.54-32-28,14.33-28,32-28S232,148.54,232,164ZM34.82,152h90.36L80,56Z\" opacity=\"0.2\"/><path d=\"M87.24,52.59a8,8,0,0,0-14.48,0l-64,136a8,8,0,1,0,14.48,6.81L39.9,160h80.2l16.66,35.4a8,8,0,1,0,14.48-6.81ZM47.43,144,80,74.79,112.57,144ZM200,96c-12.76,0-22.73,3.47-29.63,10.32a8,8,0,0,0,11.26,11.36c3.8-3.77,10-5.68,18.37-5.68,13.23,0,24,9,24,20v3.22A42.76,42.76,0,0,0,200,128c-22.06,0-40,16.15-40,36s17.94,36,40,36a42.73,42.73,0,0,0,24-7.25,8,8,0,0,0,16-.75V132C240,112.15,222.06,96,200,96Zm0,88c-13.23,0-24-9-24-20s10.77-20,24-20,24,9,24,20S213.23,184,200,184Z\"/>","thermometer":"<path d=\"M152,138V48a32,32,0,0,0-64,0v90a56,56,0,1,0,64,0Zm-32,70a24,24,0,1,1,24-24A24,24,0,0,1,120,208Z\" opacity=\"0.2\"/><path d=\"M212,56a28,28,0,1,0,28,28A28,28,0,0,0,212,56Zm0,40a12,12,0,1,1,12-12A12,12,0,0,1,212,96Zm-84,57V88a8,8,0,0,0-16,0v65a32,32,0,1,0,16,0Zm-8,47a16,16,0,1,1,16-16A16,16,0,0,1,120,200Zm40-66V48a40,40,0,0,0-80,0v86a64,64,0,1,0,80,0Zm-40,98a48,48,0,0,1-27.42-87.4A8,8,0,0,0,96,138V48a24,24,0,0,1,48,0v90a8,8,0,0,0,3.42,6.56A48,48,0,0,1,120,232Z\"/>","timer":"<path d=\"M216,136a88,88,0,1,1-88-88A88,88,0,0,1,216,136Z\" opacity=\"0.2\"/><path d=\"M128,40a96,96,0,1,0,96,96A96.11,96.11,0,0,0,128,40Zm0,176a80,80,0,1,1,80-80A80.09,80.09,0,0,1,128,216ZM173.66,90.34a8,8,0,0,1,0,11.32l-40,40a8,8,0,0,1-11.32-11.32l40-40A8,8,0,0,1,173.66,90.34ZM96,16a8,8,0,0,1,8-8h48a8,8,0,0,1,0,16H104A8,8,0,0,1,96,16Z\"/>","trash-2":"<path d=\"M200,56V208a8,8,0,0,1-8,8H64a8,8,0,0,1-8-8V56Z\" opacity=\"0.2\"/><path d=\"M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z\"/>","tree-palm":"<path d=\"M232,58.75,128,104a65.47,65.47,0,0,1,17.84-45.25,58.87,58.87,0,0,1,86.16,0ZM176.56,98.18A64.2,64.2,0,0,0,128,104.52L221.81,176a63,63,0,0,0-6.39-48.22A63.73,63.73,0,0,0,176.56,98.18Zm-66.4-39.43a58.87,58.87,0,0,0-86.16,0L128,104A65.47,65.47,0,0,0,110.16,58.75ZM79.44,98.18a63.73,63.73,0,0,0-38.86,29.6A63,63,0,0,0,34.19,176L128,104.52A64.2,64.2,0,0,0,79.44,98.18Z\" opacity=\"0.2\"/><path d=\"M237.79,53.23a66.86,66.86,0,0,0-97.74,0,72.21,72.21,0,0,0-12.05,17,72.21,72.21,0,0,0-12-17,66.86,66.86,0,0,0-97.74,0,8,8,0,0,0,2.6,12.85L77,90.55a71.42,71.42,0,0,0-43.36,33.21,70.64,70.64,0,0,0-7.2,54.32A8,8,0,0,0,39,182.36l81-61.68V224a8,8,0,0,0,16,0V120.68l81,61.68a8,8,0,0,0,12.57-4.28,70.64,70.64,0,0,0-7.2-54.32A71.42,71.42,0,0,0,179,90.55l56.22-24.47a8,8,0,0,0,2.6-12.85ZM67.08,48a51.13,51.13,0,0,1,37.28,16.26,56.53,56.53,0,0,1,14.26,26.93L39,56.53A50.5,50.5,0,0,1,67.08,48ZM40,161.5a54.82,54.82,0,0,1,7.47-29.7,55.55,55.55,0,0,1,34-25.89A56.52,56.52,0,0,1,96.1,104a55.82,55.82,0,0,1,16.23,2.41ZM208.5,131.8A54.82,54.82,0,0,1,216,161.5l-72.3-55.1a56.3,56.3,0,0,1,64.83,25.4ZM137.38,91.19a56.53,56.53,0,0,1,14.26-26.93A51.13,51.13,0,0,1,188.92,48,50.5,50.5,0,0,1,217,56.53Z\"/>","triangle-alert":"<path d=\"M215.46,216H40.54C27.92,216,20,202.79,26.13,192.09L113.59,40.22c6.3-11,22.52-11,28.82,0l87.46,151.87C236,202.79,228.08,216,215.46,216Z\" opacity=\"0.2\"/><path d=\"M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z\"/>","umbrella":"<path d=\"M128,32S88,64,88,136H32a8,8,0,0,1-8-8.71A104.21,104.21,0,0,1,128,32Zm104,95.29A104.21,104.21,0,0,0,128,32s40,32,40,104h56A8,8,0,0,0,232,127.29Z\" opacity=\"0.2\"/><path d=\"M240,126.63A112.44,112.44,0,0,0,51.75,53.75a111.56,111.56,0,0,0-35.7,72.88A16,16,0,0,0,32,144h88v56a32,32,0,0,0,64,0,8,8,0,0,0-16,0,16,16,0,0,1-32,0V144h88a16,16,0,0,0,16-17.37ZM32,128l0,0a96.15,96.15,0,0,1,76.2-85.89C96.48,58,81.85,86.11,80.17,128Zm64.15,0c1.39-30.77,10.53-52.81,18.3-66.24A106.44,106.44,0,0,1,128,43.16a106.31,106.31,0,0,1,13.52,18.6C154.8,84.7,159,109.28,159.82,128Zm79.65,0c-1.68-41.89-16.31-70-28-85.94A96.07,96.07,0,0,1,224,128Z\"/>","user":"<path d=\"M192,96a64,64,0,1,1-64-64A64,64,0,0,1,192,96Z\" opacity=\"0.2\"/><path d=\"M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z\"/>","user-round":"<path d=\"M224,128a95.76,95.76,0,0,1-31.8,71.37A72,72,0,0,0,128,160a40,40,0,1,0-40-40,40,40,0,0,0,40,40,72,72,0,0,0-64.2,39.37h0A96,96,0,1,1,224,128Z\" opacity=\"0.2\"/><path d=\"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0ZM96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120Zm97.76,66.41a79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75,88,88,0,1,1,131.52,0Z\"/>","utensils":"<path d=\"M208,40V168H152S152,64,208,40Z\" opacity=\"0.2\"/><path d=\"M72,88V40a8,8,0,0,1,16,0V88a8,8,0,0,1-16,0ZM216,40V224a8,8,0,0,1-16,0V176H152a8,8,0,0,1-8-8,268.75,268.75,0,0,1,7.22-56.88c9.78-40.49,28.32-67.63,53.63-78.47A8,8,0,0,1,216,40ZM200,53.9c-32.17,24.57-38.47,84.42-39.7,106.1H200ZM119.89,38.69a8,8,0,1,0-15.78,2.63L112,88.63a32,32,0,0,1-64,0l7.88-47.31a8,8,0,1,0-15.78-2.63l-8,48A8.17,8.17,0,0,0,32,88a48.07,48.07,0,0,0,40,47.32V224a8,8,0,0,0,16,0V135.32A48.07,48.07,0,0,0,128,88a8.17,8.17,0,0,0-.11-1.31Z\"/>","wallet":"<path d=\"M224,80V192a8,8,0,0,1-8,8H56a16,16,0,0,1-16-16V56A16,16,0,0,0,56,72H216A8,8,0,0,1,224,80Z\" opacity=\"0.2\"/><path d=\"M216,64H56a8,8,0,0,1,0-16H192a8,8,0,0,0,0-16H56A24,24,0,0,0,32,56V184a24,24,0,0,0,24,24H216a16,16,0,0,0,16-16V80A16,16,0,0,0,216,64Zm0,128H56a8,8,0,0,1-8-8V78.63A23.84,23.84,0,0,0,56,80H216Zm-48-60a12,12,0,1,1,12,12A12,12,0,0,1,168,132Z\"/>","wrench":"<path d=\"M224,96a64,64,0,0,1-94.94,56L73,217A24,24,0,0,1,39,183L104,126.94a64,64,0,0,1,80-90.29L144,80l5.66,26.34L176,112l43.35-40A63.8,63.8,0,0,1,224,96Z\" opacity=\"0.2\"/><path d=\"M226.76,69a8,8,0,0,0-12.84-2.88l-40.3,37.19-17.23-3.7-3.7-17.23,37.19-40.3A8,8,0,0,0,187,29.24,72,72,0,0,0,88,96,72.34,72.34,0,0,0,94,124.94L33.79,177c-.15.12-.29.26-.43.39a32,32,0,0,0,45.26,45.26c.13-.13.27-.28.39-.42L131.06,162A72,72,0,0,0,232,96,71.56,71.56,0,0,0,226.76,69ZM160,152a56.14,56.14,0,0,1-27.07-7,8,8,0,0,0-9.92,1.77L67.11,211.51a16,16,0,0,1-22.62-22.62L109.18,133a8,8,0,0,0,1.77-9.93,56,56,0,0,1,58.36-82.31l-31.2,33.81a8,8,0,0,0-1.94,7.1L141.83,108a8,8,0,0,0,6.14,6.14l26.35,5.66a8,8,0,0,0,7.1-1.94l33.81-31.2A56.06,56.06,0,0,1,160,152Z\"/>","x":"<path d=\"M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z\"/>","bold":"<path d=\"M200,160a40,40,0,0,1-40,40H80V48h68a36,36,0,0,1,0,72h12A40,40,0,0,1,200,160Z\" opacity=\"0.2\"/><path d=\"M178.48,115.7A44,44,0,0,0,148,40H80a8,8,0,0,0-8,8V200a8,8,0,0,0,8,8h80a48,48,0,0,0,18.48-92.3ZM88,56h60a28,28,0,0,1,0,56H88Zm72,136H88V128h72a32,32,0,0,1,0,64Z\"/>","circle":"<path d=\"M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z\" opacity=\"0.2\"/><path d=\"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Z\"/>","check":"<path d=\"M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z\"/>","minus":"<path d=\"M228,128a12,12,0,0,1-12,12H40a12,12,0,0,1,0-24H216A12,12,0,0,1,228,128Z\"/>","circle-user":"<path d=\"M224,128a95.76,95.76,0,0,1-31.8,71.37A72,72,0,0,0,128,160a40,40,0,1,0-40-40,40,40,0,0,0,40,40,72,72,0,0,0-64.2,39.37h0A96,96,0,1,1,224,128Z\" opacity=\"0.2\"/><path d=\"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0ZM96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120Zm97.76,66.41a79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75,88,88,0,1,1,131.52,0Z\"/>"};
const TAB_ICONS = {"house":["<path d=\"M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V160h32v56a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48V120l80-80,80,80Z\"/>","<path d=\"M224,120v96a8,8,0,0,1-8,8H160a8,8,0,0,1-8-8V164a4,4,0,0,0-4-4H108a4,4,0,0,0-4,4v52a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V120a16,16,0,0,1,4.69-11.31l80-80a16,16,0,0,1,22.62,0l80,80A16,16,0,0,1,224,120Z\"/>"],"chart-pie":["<path d=\"M100,116.43a8,8,0,0,0,4-6.93v-72A8,8,0,0,0,93.34,30,104.06,104.06,0,0,0,25.73,147a8,8,0,0,0,4.52,5.81,7.86,7.86,0,0,0,3.35.74,8,8,0,0,0,4-1.07ZM88,49.62v55.26L40.12,132.51C40,131,40,129.48,40,128A88.12,88.12,0,0,1,88,49.62ZM128,24a8,8,0,0,0-8,8v91.82L41.19,169.73a8,8,0,0,0-2.87,11A104,104,0,1,0,128,24Zm0,192a88.47,88.47,0,0,1-71.49-36.68l75.52-44a8,8,0,0,0,4-6.92V40.36A88,88,0,0,1,128,216Z\"/>","<path d=\"M100,116.43a8,8,0,0,0,4-6.93v-72A8,8,0,0,0,93.34,30,104.06,104.06,0,0,0,25.73,147a8,8,0,0,0,4.52,5.81,7.86,7.86,0,0,0,3.35.74,8,8,0,0,0,4-1.07ZM88,49.62v55.26L40.12,132.51C40,131,40,129.48,40,128A88.12,88.12,0,0,1,88,49.62ZM232,128A104,104,0,0,1,38.32,180.7a8,8,0,0,1,2.87-11L120,123.83V32a8,8,0,0,1,8-8,104.05,104.05,0,0,1,89.74,51.48c.11.16.21.32.31.49s.2.37.29.55A103.34,103.34,0,0,1,232,128Z\"/>"],"calendar-days":["<path d=\"M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Zm-68-76a12,12,0,1,1-12-12A12,12,0,0,1,140,132Zm44,0a12,12,0,1,1-12-12A12,12,0,0,1,184,132ZM96,172a12,12,0,1,1-12-12A12,12,0,0,1,96,172Zm44,0a12,12,0,1,1-12-12A12,12,0,0,1,140,172Zm44,0a12,12,0,1,1-12-12A12,12,0,0,1,184,172Z\"/>","<path d=\"M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM84,184a12,12,0,1,1,12-12A12,12,0,0,1,84,184Zm44,0a12,12,0,1,1,12-12A12,12,0,0,1,128,184Zm0-40a12,12,0,1,1,12-12A12,12,0,0,1,128,144Zm44,40a12,12,0,1,1,12-12A12,12,0,0,1,172,184Zm0-40a12,12,0,1,1,12-12A12,12,0,0,1,172,144Zm36-64H48V48H72v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24Z\"/>"],"user-round":["<path d=\"M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM74.08,197.5a64,64,0,0,1,107.84,0,87.83,87.83,0,0,1-107.84,0ZM96,120a32,32,0,1,1,32,32A32,32,0,0,1,96,120Zm97.76,66.41a79.66,79.66,0,0,0-36.06-28.75,48,48,0,1,0-59.4,0,79.66,79.66,0,0,0-36.06,28.75,88,88,0,1,1,131.52,0Z\"/>","<path d=\"M172,120a44,44,0,1,1-44-44A44.05,44.05,0,0,1,172,120Zm60,8A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88.09,88.09,0,0,0-91.47-87.93C77.43,41.89,39.87,81.12,40,128.25a87.65,87.65,0,0,0,22.24,58.16A79.71,79.71,0,0,1,84,165.1a4,4,0,0,1,4.83.32,59.83,59.83,0,0,0,78.28,0,4,4,0,0,1,4.83-.32,79.71,79.71,0,0,1,21.79,21.31A87.62,87.62,0,0,0,216,128Z\"/>"]};
const ico = (n, cls="ico") => `<svg class="${cls} pi" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">${ICONS[n] || ICONS.circle}</svg>`;
const tabIco = n => `<svg class="ico pi t-reg" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">${TAB_ICONS[n][0]}</svg><svg class="ico pi t-fil" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">${TAB_ICONS[n][1]}</svg>`;
function amountHTML(text){
  const sep = (1.1).toLocaleString().charAt(1);
  const i = text.lastIndexOf(sep);
  return i < 0 ? esc(text) : `${esc(text.slice(0,i))}<span class="dim">${esc(text.slice(i))}</span>`;
}
function atTime(dayMs, hhmm){ const d = new Date(dayMs); const m = tToMin(hhmm); d.setHours(Math.floor(m/60), m%60, 0, 0); return d.getTime(); }

/* ============ Dates ============ */
const startOfDay = ms => { const d = new Date(ms); d.setHours(0,0,0,0); return d.getTime(); };
const addDays = (ms, n) => { const d = new Date(ms); d.setDate(d.getDate()+n); return d.getTime(); };
function weekStart(ms){ const d = new Date(startOfDay(ms)); const diff = (d.getDay() - S.settings.weekStart + 7) % 7; d.setDate(d.getDate()-diff); return d.getTime(); }
function interval(kind, ms){
  const d = new Date(ms);
  if(kind === "week"){ const s = weekStart(ms); return [s, addDays(s,7)]; }
  if(kind === "month"){ return [new Date(d.getFullYear(), d.getMonth(), 1).getTime(), new Date(d.getFullYear(), d.getMonth()+1, 1).getTime()]; }
  return [new Date(d.getFullYear(),0,1).getTime(), new Date(d.getFullYear()+1,0,1).getTime()];
}
function shiftPeriod(kind, ms, n){
  const d = new Date(ms);
  if(kind === "week") return addDays(ms, 7*n);
  if(kind === "month") return new Date(d.getFullYear(), d.getMonth()+n, 1).getTime();
  return new Date(d.getFullYear()+n, 0, 1).getTime();
}
function stepPayday(ms, freq, n){
  if(freq === "monthly"){ const d = new Date(ms); const day = d.getDate(); const t = new Date(d.getFullYear(), d.getMonth()+n, 1); const last = new Date(t.getFullYear(), t.getMonth()+1, 0).getDate(); t.setDate(Math.min(day, last)); return t.getTime(); }
  return addDays(ms, FREQS[freq][1]*n);
}
/* [previous payday, next payday] around today, or null */
function paydays(){
  const st = S.settings; if(!st.payday) return null;
  let p = fromD(st.payday); const today = startOfDay(Date.now());
  let guard = 0;
  while(p < today && guard++ < 1000) p = stepPayday(p, st.payFreq, 1);
  while(stepPayday(p, st.payFreq, -1) >= today && guard++ < 2000) p = stepPayday(p, st.payFreq, -1);
  return [stepPayday(p, st.payFreq, -1), p];
}

/* ============ Pay engine ============ */
const jobById = id => S.jobs.find(j => j.id === id);
function zero(){ return {hours:0,base:0,premium:0,premHours:0,ot:0,otHours:0,tips:0,holHours:0,sickHours:0,holEarned:0,parts:{}}; }
function addPB(a, b){
  const o = zero();
  for(const k of ["hours","premHours","otHours","holHours","sickHours","holEarned"]) o[k] = (a[k]||0) + (b[k]||0);
  for(const k of ["base","premium","ot","tips"]) o[k] = r2(a[k] + b[k]);
  o.parts = Object.assign({}, a.parts);
  for(const k in b.parts) o.parts[k] = r2((o.parts[k]||0) + b.parts[k]);
  return o;
}
const gross = p => r2(p.base + p.premium + p.ot + p.tips);
const wages = p => r2(p.base + p.premium + p.ot);
function isNight(ms, job){
  const d = new Date(ms); const m = d.getHours()*60 + d.getMinutes();
  const s = job.nightStart, e = job.nightEnd;
  if(s === e) return false;
  return s < e ? (m >= s && m < e) : (m >= s || m < e);
}
/* Splits the shift at every midnight and night-window edge so each slice gets its own day's rate. */
const shiftType = s => s.type || "work";
function payShift(sh){
  const r = zero(); r.tips = +sh.tips || 0;
  const total = sh.end - sh.start;
  if(!(total > 0)) return r;
  const job = jobById(sh.jobId);
  const type = shiftType(sh);
  if(type !== "work"){ // holiday is paid at the basic rate; sick is unpaid unless marked as paid
    const h = Math.max(0, total - (sh.breakMin||0)*60000) / 3600000;
    r.tips = 0;
    if(type === "holiday"){ r.hours = h; r.holHours = h; r.base = r2(h * (+sh.rate||0)); }
    else { r.sickHours = h; if(sh.paidSick){ r.hours = h; r.base = r2(h * (+sh.rate||0)); } }
    return r;
  }
  const factor = Math.max(0, total - (sh.breakMin||0)*60000) / total;
  const cuts = new Set([sh.start, sh.end]);
  let day = addDays(startOfDay(sh.start), -1);
  while(day < sh.end){
    if(day > sh.start) cuts.add(day);
    if(job && job.nightOn){
      for(const m of [job.nightStart, job.nightEnd]){
        const d = new Date(day); d.setMinutes(m); const t = d.getTime();
        if(t > sh.start && t < sh.end) cuts.add(t);
      }
    }
    day = addDays(day, 1);
  }
  const pts = [...cuts].sort((a,b)=>a-b);
  const special = {};
  if(job) for(const sp of job.special||[]){ if(sp.yearly) special["Y"+String(sp.date).slice(5)] = sp; else special[sp.date] = sp; }
  for(let i=0;i<pts.length-1;i++){
    const a = pts[i], b = pts[i+1];
    const h = (b-a)/3600000*factor;
    if(h <= 0) continue;
    const mid = a + (b-a)/2;
    const segBase = h * (+sh.rate||0);
    r.hours += h; r.base += segBase;
    const parts = [];
    if(job){
      const dk = toD(mid), sp = special[dk] || special["Y"+dk.slice(5)];
      if(sp && +sp.pct){ parts.push([`${sp.label || "Special day"} ${spct(+sp.pct)}`, +sp.pct]); }
      else { const wd = new Date(mid).getDay(); const p = +job.weekday[wd]||0; if(p) parts.push([`${WD[wd]} ${spct(p)}`, p]); }
      if(job.nightOn && +job.nightPct && isNight(mid, job)) parts.push([`Night ${spct(+job.nightPct)}`, +job.nightPct]);
    }
    if(+sh.extraPct) parts.push([`Shift bonus ${spct(+sh.extraPct)}`, +sh.extraPct]);
    if(parts.length) r.premHours += h;
    for(const [label, p] of parts){ const amt = segBase*p/100; r.parts[label] = (r.parts[label]||0) + amt; }
  }
  // Round each line to the penny, the way a payslip does, so totals always add up.
  r.base = r2(r.base); r.tips = r2(r.tips);
  for(const k in r.parts) r.parts[k] = r2(r.parts[k]);
  r.premium = r2(Object.values(r.parts).reduce((a,b)=>a+b,0));
  if(job && job.holiday === "rolled" && +job.holidayPct){ // rolled-up holiday pay on top of each shift
    const hp = r2((r.base + r.premium) * job.holidayPct / 100);
    r.parts[`Holiday pay ${+job.holidayPct}%`] = hp; r.premium = r2(r.premium + hp);
  }
  if(job && job.holiday === "accrue") r.holEarned = r.hours * (+job.holidayPct || 12.07) / 100;
  return r;
}
/* ============ Contracts ============ */
const CONTRACT_TYPES = {permanent:"Permanent", fixed:"Fixed-term", zero:"Zero-hours", temp:"Temporary / agency", seasonal:"Seasonal", freelance:"Freelance / client contract", apprentice:"Apprenticeship"};
const contractsOf = job => [...((job && job.contracts) || [])].sort((a,b)=>a.start-b.start);
/* The contract that covers a given day, or null. A job with no contracts is always "covered". */
function contractOn(job, ms){
  const day = startOfDay(ms);
  return contractsOf(job).find(c => startOfDay(c.start) <= day && (!c.end || day <= startOfDay(c.end))) || null;
}
const covered = (job, ms) => !job || !(job.contracts||[]).length || !!contractOn(job, ms);
function rateFor(job, ms){ const c = contractOn(job, ms); return c && +c.rate > 0 ? +c.rate : (job ? +job.rate || 0 : 0); }
function contractStatus(job){
  const cs = contractsOf(job); if(!cs.length) return null;
  const today = startOfDay(Date.now()), cur = contractOn(job, today);
  if(cur){
    const renewal = cur.end ? cs.find(c => startOfDay(c.start) === addDays(startOfDay(cur.end), 1)) : null;
    if(renewal) return {state:"active", c:cur, left:null, label:`Renews ${dmy(renewal.start)}${+renewal.rate ? ` at ${money(renewal.rate)}/h` : ""}`};
    const left = cur.end ? Math.round((startOfDay(cur.end) - today)/DAY) : null;
    return {state:"active", c:cur, left, label: cur.end ? (left === 0 ? "Ends today" : `Ends ${dmy(cur.end)} · ${left>=60?`${Math.round(left/30)} months`:left>=14?`${Math.round(left/7)} weeks`:`${left} day${left===1?"":"s"}`} left`) : `${CONTRACT_TYPES[cur.type]||"Contract"} since ${dmy(cur.start)}`};
  }
  const future = cs.find(c => startOfDay(c.start) > today);
  if(future) return {state:"future", c:future, label:`Starts ${dmy(future.start)}`};
  const last = cs[cs.length-1];
  return {state:"ended", c:last, label:`Ended ${dmy(last.end)}`};
}
function breakFor(job, start, end){
  if(!job) return 0;
  return (end - start)/3600000 > (+job.breakAfter || 0) ? (+job.breakMin || 0) : 0;
}
/* Holiday hours built up minus holiday taken or booked, for jobs that build up paid leave. */
function holidayBalance(job, C){
  let earned = 0, taken = 0;
  for(const s of S.shifts){ if(s.jobId !== job.id) continue;
    const t = shiftType(s);
    if(t === "work" && !isFuture(s)) earned += C.pay(s).holEarned;
    if(t === "holiday") taken += C.pay(s).holHours; }
  return {earned, taken, left: earned - taken};
}
/* Weekly overtime per job, applied in time order. */
function buildLedger(){
  const map = new Map();
  for(const s of S.shifts) map.set(s.id, payShift(s));
  const groups = {};
  for(const s of S.shifts){
    const j = jobById(s.jobId);
    if(!j || !j.otOn || shiftType(s) !== "work") continue;
    const k = j.id + "|" + (j.otPer === "day" ? startOfDay(s.start) : weekStart(s.start));
    (groups[k] = groups[k] || []).push(s);
  }
  for(const k in groups){
    const list = groups[k].sort((a,b)=>a.start-b.start);
    const j = jobById(list[0].jobId);
    const th = Math.max(0, +j.otAfter||0);
    let run = 0;
    for(const s of list){
      const p = map.get(s.id); const before = run; run += p.hours;
      if(run > th){ const oh = run - Math.max(before, th); p.otHours = oh; p.ot = r2(oh * (+s.rate||0) * (Math.max(1,+j.otMult||1) - 1)); }
    }
  }
  return map;
}

/* ============ Tax engine ============ */
function progressive(x, bands){ let t=0, lo=0; for(const [up, r] of bands){ if(x > lo) t += (Math.min(x, up) - lo) * r; lo = up; } return t; }
function ukIncomeTax(x, scot){
  let pa = 12570; if(x > 100000) pa = Math.max(0, pa - (x-100000)/2);
  const t = Math.max(0, x - pa);
  return scot ? progressive(t, [[3967,.19],[16956,.20],[31092,.21],[62430,.42],[125140,.45],[Infinity,.48]])
              : progressive(t, [[37700,.20],[125140,.40],[Infinity,.45]]);
}
const ukClass1 = x => Math.max(0, Math.min(x,50270)-12570)*.08 + Math.max(0, x-50270)*.02;
const ukClass4 = x => Math.max(0, Math.min(x,50270)-12570)*.06 + Math.max(0, x-50270)*.02;
/* emp = employed income, self = self-employed income, both yearly */
function taxLines(emp, self){
  const st = S.settings; const inc = emp + self; if(!(inc > 0)) return [];
  const pension = Math.max(0, inc * (+st.pensionPct||0)/100);
  const taxable = Math.max(0, inc - pension);
  const out = [];
  switch(st.region){
    case "uk": case "scotland":
      // Self-employed: the £1,000 trading allowance comes off before tax and Class 4 NI.
      const selfAfterAllowance = Math.max(0, self - 1000);
      const ukTaxable = Math.max(0, taxable - (self - selfAfterAllowance));
      out.push(["Income tax", ukIncomeTax(ukTaxable, st.region === "scotland")]);
      if(emp > 0) out.push(["National Insurance", ukClass1(emp)]);
      if(self > 0) out.push(["Class 4 NI (self-employed)", ukClass4(selfAfterAllowance)]);
      if(st.loan !== "none") out.push(["Student loan", Math.max(0, inc - loanThreshold(st.loan))*.09]);
      if(st.postgrad) out.push(["Postgraduate loan", Math.max(0, inc-21000)*.06]);
      break;
    case "ireland": {
      const now = new Date(), y27 = now >= new Date(2027,0,1);
      const band = y27 ? 46500 : 44000, credits = y27 ? 4250 : 4000, usc2 = y27 ? 30300 : 28700; // credits: personal + employee (or earned income), €2,125 each from 2027
      const prsi = now >= new Date(2027,9,1) ? .045 : now >= new Date(2026,9,1) ? .0435 : .042;
      out.push(["Income tax", Math.max(0, progressive(taxable, [[band,.2],[Infinity,.4]]) - credits)]);
      let usc = inc <= 13000 ? 0 : progressive(inc, [[12012,.005],[usc2,.02],[70044,.03],[Infinity,.08]]);
      if(self > 100000) usc += (self - 100000) * .03; // self-employed surcharge
      out.push(["USC", usc]);
      out.push(["PRSI", (emp/52 <= 352 ? 0 : emp*prsi) + (self >= 5000 ? Math.max(650, self*prsi) : 0)]);
      break; }
    case "us": {
      const mar = st.filing === "married";
      const br = mar ? [[24800,.1],[100800,.12],[211400,.22],[403550,.24],[512450,.32],[768700,.35],[Infinity,.37]]
                     : [[12400,.1],[50400,.12],[105700,.22],[201775,.24],[256225,.32],[640600,.35],[Infinity,.37]];
      const seNet = self * .9235;
      const seTax = Math.min(seNet, Math.max(0, 184500 - emp))*.124 + seNet*.029;
      out.push(["Federal income tax", progressive(Math.max(0, taxable - seTax/2 - (mar ? 32200 : 16100)), br)]);
      if(emp > 0){ out.push(["Social Security", Math.min(emp, 184500)*.062]); out.push(["Medicare", emp*.0145 + Math.max(0, inc - (mar ? 250000 : 200000))*.009]); }
      if(self > 0) out.push(["Self-employment tax", seTax]);
      if(+st.statePct > 0) out.push(["State & local", taxable*(+st.statePct)/100]);
      break; }
    default:
      out.push(["Tax", taxable*Math.max(0,+st.customPct||0)/100]);
  }
  if(pension > 0) out.push(["Pension", pension]);
  return out;
}
function projectedIncome(L){
  const now = Date.now(), from = now - 56*DAY;
  const recent = S.shifts.filter(s => s.start >= from && s.start <= now);
  if(!recent.length) return {emp:0, self:0};
  const first = Math.min(...recent.map(s=>s.start));
  const f = 365 / Math.max(7, (now-first)/DAY);
  let emp = 0, self = 0;
  for(const s of recent){ const j = jobById(s.jobId); const g = gross(L.get(s.id)); if(j && j.selfEmployed) self += g; else emp += g; }
  return {emp: emp*f, self: self*f};
}
function context(){
  const L = buildLedger();
  const st = S.settings;
  let tax = {on:false, income:0, lines:[], rate:0};
  if(st.showTakeHome){
    let emp, self;
    if(st.fixedOn && +st.fixedIncome > 0){
      const p = projectedIncome(L), t = p.emp + p.self;
      const selfShare = t > 0 ? p.self/t : (st.workType === "self" ? 1 : 0);
      self = +st.fixedIncome * selfShare; emp = +st.fixedIncome - self;
    } else ({emp, self} = projectedIncome(L));
    const inc = emp + self, lines = taxLines(emp, self);
    const tot = lines.reduce((a,l)=>a+l[1],0);
    tax = {on:true, income:inc, lines, rate: inc > 0 ? Math.min(1, tot/inc) : 0};
  }
  const pay = s => L.get(s.id) || payShift(s);
  const total = list => list.reduce((a,s)=>addPB(a, pay(s)), zero());
  const deductions = g => tax.on && tax.income > 0 ? tax.lines.map(([n,a]) => [n, r2(g*a/tax.income)]) : [];
  const shown = g => tax.on && tax.income > 0 ? r2(g - deductions(g).reduce((x,[,v])=>x+v,0)) : g;
  const label = tax.on && tax.income > 0 ? (st.workType === "self" ? "After tax (est.)" : "Take-home (est.)") : "Earned (gross)";
  return {pay, total, shown, tax, deductions, label};
}

/* ============ Weekly roster autopilot ============ */
/* Creates scheduled shifts from the weekly pattern for the coming weeks.
   Shifts the user edited or deleted are left alone; past roster shifts stay as worked. */
/* The roster fills the calendar up to the end of this month (+ extra months), or further if you planned a later month. */
function rosterHorizon(){
  const R = S.roster, d = new Date();
  const months = +R.months || (R.weeks ? Math.max(1, Math.ceil(R.weeks/4)) : 2);
  return Math.max(new Date(d.getFullYear(), d.getMonth() + months, 1).getTime(), +R.until || 0);
}
const monthStart = ms => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
const monthEnd = ms => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth()+1, 1).getTime(); };
function syncRoster(){
  const R = S.roster, now = Date.now();
  let changed = false;
  const live = R.on ? R.entries.filter(e => jobById(e.jobId)) : [];
  const locked = new Set(R.locked || []); // weeks saved as "this week only" are never changed by the roster
  const isLocked = ms => locked.has(toD(weekStart(ms)));
  const ids = new Set(live.map(e => e.id));
  const before = S.shifts.length;
  S.shifts = S.shifts.filter(s => !(s.rosterKey && !s.edited && s.start > now && !ids.has(s.rosterKey.split("|")[0]) && !isLocked(s.start)));
  if(S.shifts.length !== before) changed = true;
  if(!live.length) return changed;
  const until = rosterHorizon();
  const since = R.since || now;
  const ws = weekStart(Math.min(since, now));
  const existing = new Map(S.shifts.filter(s => s.rosterKey).map(s => [s.rosterKey, s]));
  const skips = new Set(R.skips || []);
  for(const e of live){
    const j = jobById(e.jobId);
    for(let w = ws; w < until; w = addDays(w, 7)){
      const day = addDays(w, (e.day - S.settings.weekStart + 7) % 7);
      if(day >= until || isLocked(day)) continue;
      const key = e.id + "|" + toD(day);
      if(skips.has(key)) continue;
      const start = atTime(day, e.start);
      let end = atTime(day, e.end); if(end <= start) end = addDays(end, 1);
      const ex = existing.get(key);
      if(!covered(j, day)){ // outside the contract: no shift, and remove an untouched planned one
        if(ex && !ex.edited && ex.start > now){ S.shifts = S.shifts.filter(x => x !== ex); changed = true; }
        continue;
      }
      if(!ex && start < since) continue; // never back-fill shifts from before the roster was switched on
      if(ex){
        if(!ex.edited && ex.start > now && (ex.start !== start || ex.end !== end || ex.breakMin !== (+e.breakMin||0) || ex.jobId !== e.jobId)){
          Object.assign(ex, {start, end, breakMin:+e.breakMin||0, jobId:e.jobId, rate:rateFor(j, day)}); changed = true;
        }
        continue;
      }
      S.shifts.push({id:uid(), jobId:e.jobId, start, end, breakMin:+e.breakMin||0, rate:rateFor(j, day), extraPct:0, tips:0, notes:"", rosterKey:key});
      changed = true;
    }
  }
  return changed;
}

/* ============ Invoices ============ */
const invStatus = inv => inv.status === "paid" ? "paid" : (inv.status === "sent" && inv.due < startOfDay(Date.now())) ? "overdue" : inv.status;
const ST_LABEL = {draft:"Draft", sent:"Sent", paid:"Paid", overdue:"Overdue"};
const invNumber = n => `${S.business.prefix || ""}${String(n).padStart(4,"0")}`;
const dupNumber = d => S.invoices.some(i => i.id !== d.id && String(i.number).trim().toLowerCase() === String(d.number).trim().toLowerCase());
function invoicePresets(){
  const ws = weekStart(Date.now()), now = new Date();
  return {
    lastWeek:["Last week", addDays(ws,-7), addDays(ws,-1)],
    thisWeek:["This week", ws, addDays(ws,6)],
    nextWeek:["Next week", addDays(ws,7), addDays(ws,13)],
    lastMonth:["Last month", new Date(now.getFullYear(), now.getMonth()-1, 1).getTime(), new Date(now.getFullYear(), now.getMonth(), 0).getTime()],
    thisMonth:["This month", new Date(now.getFullYear(), now.getMonth(), 1).getTime(), new Date(now.getFullYear(), now.getMonth()+1, 0).getTime()]
  };
}
function invoiceShifts(d){
  return S.shifts.filter(s => s.jobId === d.jobId && shiftType(s) === "work" && s.start >= startOfDay(d.from) && s.start < addDays(startOfDay(d.to),1)
    && (d.includeScheduled || !isFuture(s)) && (!d.skipInvoiced || !s.invoiceId || s.invoiceId === d.id)).sort((a,b)=>a.start-b.start);
}
function buildInvoice(d, C){
  const job = jobById(d.jobId), biz = S.business;
  const shifts = job ? invoiceShifts(d) : [];
  const lines = [];
  let hours = 0;
  const addShift = (date, desc, p, rate, scheduled) => {
    hours += p.hours;
    lines.push({date, desc: desc + (scheduled ? " (booked)" : ""), qty:r2(p.hours), rate, amount:p.base});
    for(const [l, v] of Object.entries(p.parts).sort((a,b)=>b[1]-a[1])) lines.push({sub:true, desc:l, amount:v});
    if(p.ot > 0) lines.push({sub:true, desc:`Overtime ${hrs(p.otHours)} × ${(+jobById(d.jobId).otMult)}`, amount:p.ot});
  };
  if(d.group === "day"){
    const days = new Map();
    for(const s of shifts){ const k = toD(s.start); if(!days.has(k)) days.set(k, []); days.get(k).push(s); }
    for(const [k, list] of days){
      const p = list.reduce((a,s)=>addPB(a, C.pay(s)), zero());
      const rates = [...new Set(list.map(s=>+s.rate))];
      addShift(fromD(k), list.map(s=>`${tm(s.start)}–${tm(s.end)}`).join(", "), p, rates.length === 1 ? rates[0] : null, list.some(isFuture));
    }
  } else {
    for(const s of shifts){
      addShift(s.start, `${tm(s.start)}–${tm(s.end)}${s.breakMin?` · ${s.breakMin} min unpaid break`:""}${s.notes?` · ${s.notes}`:""}`, C.pay(s), +s.rate, isFuture(s));
    }
  }
  for(const e of d.extras || []) if(e.desc || num(e.amount)) lines.push({extra:true, desc:e.desc || "Item", amount:r2(num(e.amount))});
  const subtotal = r2(lines.reduce((a,l)=>a+l.amount, 0));
  const vatPct = biz.vatOn ? num(biz.vatPct) : 0;
  const vat = r2(subtotal * vatPct/100);
  const client = job ? Object.assign({}, job.client, {name: (job.client && job.client.name) || job.name}) : {name:"",address:"",email:""};
  return {id:d.id || null, number:d.number, jobId:d.jobId, client, biz:Object.assign({}, biz), from:startOfDay(d.from), to:startOfDay(d.to),
    issue:startOfDay(d.issue), due:addDays(startOfDay(d.issue), num(biz.terms)), lines, hours:r2(hours), subtotal, vatPct, vat, total:r2(subtotal+vat),
    notes:d.notes||"", shiftIds:shifts.map(s=>s.id), currency:cur(), status:d.status||"draft", createdAt:Date.now()};
}
function paperHTML(inv){
  const m = v => moneyC(v, inv.currency), b = inv.biz, c = inv.client;
  const bank = [b.bankName && `Bank: ${b.bankName}`, b.accountName && `Account name: ${b.accountName}`, b.sortCode && `Sort code: ${b.sortCode}`, b.accountNumber && `Account no: ${b.accountNumber}`, b.iban && `IBAN: ${b.iban}`].filter(Boolean);
  return `<div class="paper">
    <div class="between" style="align-items:flex-start"><div><h3>INVOICE</h3><div class="pm" style="margin-top:4px">${esc(inv.number)}</div></div>
      <div style="text-align:right"><div><span class="pm">Issued</span> ${dmy(inv.issue)}</div><div><span class="pm">Due</span> <b>${dmy(inv.due)}</b></div><div><span class="pm">Period</span> ${dm(inv.from)} – ${dmy(inv.to)}</div></div></div>
    <div class="cols"><div><div class="lab">From</div><b>${esc(b.name || "Your name")}</b><br>${nl2br(b.address)}${b.email?`<br>${esc(b.email)}`:""}${b.phone?`<br>${esc(b.phone)}`:""}${b.taxRef?`<br><span class="pm">Tax ref:</span> ${esc(b.taxRef)}`:""}${inv.vatPct && b.vatNo?`<br><span class="pm">VAT no:</span> ${esc(b.vatNo)}`:""}</div>
      <div><div class="lab">Bill to</div><b>${esc(c.name || "Client")}</b><br>${nl2br(c.address)}${c.email?`<br>${esc(c.email)}`:""}</div></div>
    <table><thead><tr><th>Date</th><th>Description</th><th class="r">Hours</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead><tbody>
      ${inv.lines.length ? inv.lines.map(l => l.sub ? `<tr class="sub"><td></td><td>${esc(l.desc)}</td><td></td><td></td><td class="r">${m(l.amount)}</td></tr>`
        : `<tr><td style="white-space:nowrap">${l.date?dm(l.date):""}</td><td>${esc(l.desc)}</td><td class="r">${l.qty!=null?hdec(l.qty):""}</td><td class="r">${l.rate!=null?m(l.rate):""}</td><td class="r">${m(l.amount)}</td></tr>`).join("")
        : `<tr><td colspan="5" class="pm" style="text-align:center;padding:16px">No shifts in this period yet</td></tr>`}
    </tbody></table>
    <div class="tot"><div><span class="pm">Total hours</span><span>${hdec(inv.hours)}</span></div><div><span class="pm">Subtotal</span><span>${m(inv.subtotal)}</span></div>
      ${inv.vatPct?`<div><span class="pm">VAT ${inv.vatPct}%</span><span>${m(inv.vat)}</span></div>`:""}<div class="big"><span>Total due</span><span>${m(inv.total)}</span></div></div>
    ${bank.length?`<div class="pay"><div class="lab">Payment details</div>${bank.map(esc).join("<br>")}<br><span class="pm">Reference:</span> ${esc(inv.number)}</div>`:""}
    ${inv.notes?`<div style="margin-top:12px">${nl2br(inv.notes)}</div>`:""}
  </div>`;
}
function invoiceText(inv){
  const m = v => moneyC(v, inv.currency), b = inv.biz, c = inv.client;
  const out = [`INVOICE ${inv.number}`, `Issued ${dmy(inv.issue)} · Due ${dmy(inv.due)}`, `Period ${dmy(inv.from)} – ${dmy(inv.to)}`, "", `From: ${b.name}`, b.address, b.email, "", `Bill to: ${c.name}`, c.address, c.email, ""];
  for(const l of inv.lines) out.push(l.sub ? `   ${l.desc}: ${m(l.amount)}` : `${l.date?dm(l.date)+" · ":""}${l.desc}${l.qty!=null?` · ${hdec(l.qty)}h`:""}${l.rate!=null?` × ${m(l.rate)}`:""}: ${m(l.amount)}`);
  out.push("", `Subtotal: ${m(inv.subtotal)}`); if(inv.vatPct) out.push(`VAT ${inv.vatPct}%: ${m(inv.vat)}`); out.push(`TOTAL DUE: ${m(inv.total)}`, "");
  if(b.accountNumber || b.iban) out.push("Payment details:", b.bankName && `Bank: ${b.bankName}`, b.accountName && `Account name: ${b.accountName}`, b.sortCode && `Sort code: ${b.sortCode}`, b.accountNumber && `Account no: ${b.accountNumber}`, b.iban && `IBAN: ${b.iban}`, `Reference: ${inv.number}`);
  if(inv.notes) out.push("", inv.notes);
  return out.filter(x => x !== undefined && x !== false && x !== null && x !== "" || x === "").join("\n").replace(/\n{3,}/g,"\n\n");
}
function invoicePDF(inv){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:"pt", format:"a4"});
  const W = 595.28, M = 46, R = W - M;
  const pm = v => { const s = moneyC(v, inv.currency); return /[^\x20-\xFF]/.test(s) ? `${inv.currency} ${(Math.round(v*100)/100).toFixed(2)}` : s; };
  const b = inv.biz, c = inv.client;
  let y = M + 14;
  const txt = (t, x, yy, opt) => doc.text(String(t ?? "").replace(/[^\x20-\xFF\n]/g, "-"), x, yy, opt);
  doc.setFont("helvetica","bold"); doc.setFontSize(24); txt("INVOICE", M, y);
  doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.setTextColor(110);
  txt(inv.number, M, y + 16);
  doc.setTextColor(30);
  txt(`Issued: ${dmy(inv.issue)}`, R, y - 8, {align:"right"});
  doc.setFont("helvetica","bold"); txt(`Due: ${dmy(inv.due)}`, R, y + 6, {align:"right"}); doc.setFont("helvetica","normal");
  txt(`Period: ${dmy(inv.from)} - ${dmy(inv.to)}`, R, y + 20, {align:"right"});
  y += 56;
  const block = (title, lines, x) => { let yy = y; doc.setFontSize(8); doc.setTextColor(130); doc.setFont("helvetica","bold"); txt(title.toUpperCase(), x, yy); yy += 14; doc.setFontSize(10); doc.setTextColor(25);
    lines.filter(Boolean).forEach((l, i) => { doc.setFont("helvetica", i === 0 ? "bold" : "normal"); for(const part of doc.splitTextToSize(String(l), 230)){ txt(part, x, yy); yy += 13; } }); return yy; };
  const y1 = block("From", [b.name || "Your name", ...String(b.address||"").split("\n"), b.email, b.phone, b.taxRef && `Tax ref: ${b.taxRef}`, inv.vatPct && b.vatNo && `VAT no: ${b.vatNo}`], M);
  const y2 = block("Bill to", [c.name || "Client", ...String(c.address||"").split("\n"), c.email], 310);
  y = Math.max(y1, y2) + 18;
  const cols = [M, M+62, R-170, R-95, R];
  const head = () => { doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(120);
    txt("DATE", cols[0], y); txt("DESCRIPTION", cols[1], y); txt("HOURS", cols[2]+40, y, {align:"right"}); txt("RATE", cols[3]+40, y, {align:"right"}); txt("AMOUNT", cols[4], y, {align:"right"});
    y += 6; doc.setDrawColor(25); doc.setLineWidth(1.2); doc.line(M, y, R, y); y += 14; doc.setTextColor(25); doc.setFont("helvetica","normal"); doc.setFontSize(9.5); };
  head();
  for(const l of inv.lines){
    const desc = doc.splitTextToSize(String(l.desc).replace(/[^\x20-\xFF]/g,"-"), cols[2] - cols[1] - 6);
    const h = desc.length * 12 + 6;
    if(y + h > 790){ doc.addPage(); y = M + 10; head(); }
    if(l.sub){ doc.setTextColor(40,130,40); txt(desc, cols[1] + 8, y); txt(pm(l.amount), cols[4], y, {align:"right"}); doc.setTextColor(25); }
    else { txt(l.date ? dm(l.date) : "", cols[0], y); txt(desc, cols[1], y); if(l.qty != null) txt(hdec(l.qty), cols[2]+40, y, {align:"right"}); if(l.rate != null) txt(pm(l.rate), cols[3]+40, y, {align:"right"}); txt(pm(l.amount), cols[4], y, {align:"right"}); }
    y += h - 6; doc.setDrawColor(230); doc.setLineWidth(.5); doc.line(M, y, R, y); y += 12;
  }
  if(y > 690){ doc.addPage(); y = M + 10; }
  y += 6;
  const tl = (l, v, bold) => { doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(bold ? 13 : 10); txt(l, R-200, y); txt(v, R, y, {align:"right"}); y += bold ? 20 : 15; };
  tl("Total hours", hdec(inv.hours)); tl("Subtotal", pm(inv.subtotal)); if(inv.vatPct) tl(`VAT ${inv.vatPct}%`, pm(inv.vat));
  doc.setDrawColor(25); doc.setLineWidth(1.2); doc.line(R-200, y-9, R, y-9); y += 6; tl("Total due", pm(inv.total), true);
  const bank = [b.bankName && `Bank: ${b.bankName}`, b.accountName && `Account name: ${b.accountName}`, b.sortCode && `Sort code: ${b.sortCode}`, b.accountNumber && `Account no: ${b.accountNumber}`, b.iban && `IBAN: ${b.iban}`].filter(Boolean);
  if(bank.length){
    y += 14; if(y > 720){ doc.addPage(); y = M + 10; }
    doc.setFillColor(245,245,247); doc.roundedRect(M, y-14, R-M, bank.length*13 + 34, 8, 8, "F");
    doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(120); txt("PAYMENT DETAILS", M+12, y); y += 14;
    doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.setTextColor(25);
    for(const l of bank){ txt(l, M+12, y); y += 13; } txt(`Reference: ${inv.number}`, M+12, y); y += 18;
  }
  if(inv.notes){ y += 8; doc.setFontSize(10); for(const part of doc.splitTextToSize(inv.notes.replace(/[^\x20-\xFF\n]/g,"-"), R-M)){ if(y > 800){ doc.addPage(); y = M+10; } txt(part, M, y); y += 13; } }
  return doc.output("arraybuffer");
}

/* ============ Rendering helpers ============ */
const isFuture = s => s.start > Date.now();
const sorted = () => [...S.shifts].sort((a,b)=>b.start-a.start);
const activeJobs = () => S.jobs.filter(j=>!j.archived);
const selfJobs = () => S.jobs.filter(j=>j.selfEmployed);
function shiftRow(s, C){
  const p = C.pay(s), j = jobById(s.jobId), extra = p.premium + p.ot, fut = isFuture(s), type = shiftType(s);
  const cap = type === "holiday" ? `Holiday · ${hrs(p.holHours)}` : type === "sick" ? (s.paidSick ? "Sick · paid" : "Sick · unpaid") : fut ? (s.weekEdit || weekLocked(weekStart(s.start)) ? "This week only" : s.rosterKey ? "From roster" : "Scheduled") : extra > 0 ? `incl. ${money(extra)} extra` : hrs(p.hours);
  const icon = type === "holiday" ? "tree-palm" : type === "sick" ? "thermometer" : (j ? j.icon : "briefcase");
  return `<button class="shift ${fut?"fut":""}" data-act="editShift" data-id="${s.id}">
    <div class="avatar" style="color:${type==="holiday"?"var(--blue)":type==="sick"?"var(--orange)":j?j.color:"var(--muted)"}">${ico(icon)}${extra>0&&!fut?`<span class="up">${ico("arrow-up")}</span>`:""}</div>
    <div class="mid"><b>${esc(j?j.name:"Shift")}${s.invoiceId?` <span class="badge">${ico("receipt","ico-sm")}</span>`:""}</b><span>${dm(s.start)} · ${tm(s.start)}–${tm(s.end)}</span></div>
    <div class="right"><b>${fut?"":"+"}${money(C.shown(gross(p)))}</b><span class="${fut?"sched":extra>0?"g":""}">${cap}</span></div>
  </button>`;
}
function empty(icon, title, text, act, label){
  return `<div class="empty"><div class="art m">${mascotSVG(mascotEmpty(icon))}</div><b>${title}</b><p>${text}</p>${act?`<button class="btn" data-act="${act}" style="margin-top:4px">${label}</button>`:""}</div>`;
}
function goalCard(g, earned){
  const pr = g.target > 0 ? earned/g.target : 0;
  return `<button class="panel goal" data-act="openGoal" data-id="${g.id}">
    <div class="row" style="width:100%"><div class="tile" style="color:${g.color}">${ico(g.icon)}</div><span class="goal-title">${esc(g.title)}</span><span class="chev">${ico("chevron-right","ico-sm")}</span></div>
    <div class="card" style="width:100%">
      <div class="between small num"><span style="font-weight:500">${money0(earned)}</span><span class="muted">${money0(g.target)}</span></div>
      <div class="progress"><i style="width:${Math.min(100,pr*100)}%;background:${g.color}${pr<=0?";min-width:0":""}"></i></div>
      <div class="between small"><span>${pr>=1?`<b style="color:var(--green)">Goal reached</b>`:daysText(g)}</span><span style="font-weight:600;${pr>=1?"color:var(--green)":""}">${pct(Math.min(pr,9.99)*100)}</span></div>
    </div></button>`;
}
const daysLeft = g => Math.max(0, Math.round((startOfDay(g.deadline) - startOfDay(Date.now()))/DAY));
function daysText(g){ const d = daysLeft(g); if(g.deadline < startOfDay(Date.now())) return "Ended"; if(d===0) return "Last day"; if(d>=730) return `${Math.floor(d/365)} years to go`; if(d>=60) return `${Math.floor(d/30)} months to go`; return `${d} day${d===1?"":"s"} to go`; }
const goalShifts = g => S.shifts.filter(s => s.start >= startOfDay(g.start) && s.start < addDays(startOfDay(g.deadline),1) && s.start <= Date.now());
const chartAvg = bars => { const nz = bars.filter(b => b.v > 0 && !b.fut); return nz.length > 1 ? nz.reduce((a, b) => a + b.v, 0) / nz.length : 0; };
/* Capsule bar chart: gradient bars, the picked (or current) bar in ink with its value in a bubble, and a dashed average line. */
function chart(bars, fmt, highlight, opts = {}){
  const H = opts.h || 128, max = Math.max(...bars.map(b => b.v), 0.0001);
  const avg = chartAvg(bars);
  const sel = UI.selBar != null && UI.selBar < bars.length ? UI.selBar : null, show = sel != null ? sel : highlight;
  return `<div class="pchart ${bars.length > 8 ? "many" : ""}" style="--h:${H}px">
    ${avg > 0 ? `<div class="pavg" style="--y:${(H * avg / max).toFixed(1)}px"></div>` : ""}
    <div class="pbars">${bars.map((b, i) => { const h = b.v <= 0 ? 8 : Math.max(18, H * b.v / max);
      return `<button class="pcol ${i===show?"on":""} ${i===highlight?"cur":""} ${b.fut?"fut":""}" style="--bh:${h.toFixed(1)}px" data-act="bar" data-i="${i}" aria-label="${esc(b.l)} ${esc(fmt(b.v))}">${i===show && b.v > 0 ? `<span class="pbub">${esc(fmt(b.v))}</span>` : ""}<span class="pbar ${b.v<=0?"zero":""}" style="--i:${i}"></span><span class="plab">${esc(b.l)}</span></button>`; }).join("")}</div></div>`;
}
function delta(p){ const up = p >= 0; return `<span class="delta ${up?"":"down"}"><i>${ico(up?"arrow-up":"arrow-down")}</i>${spct(p)}</span>`; }
function sel(id, bind, options, value, extra=""){ return `<select id="${id}" ${bind} ${extra}>${options.map(([v,l])=>`<option value="${esc(v)}" ${String(v)===String(value)?"selected":""}>${esc(l)}</option>`).join("")}</select>`; }
function toggleHTML(id, attrs, on){ return `<label class="toggle"><input type="checkbox" id="${id}" ${attrs} ${on?"checked":""}><i></i></label>`; }

/* ============ Mascot ============
   The ClockMe mascot, drawn as a vector so its eyes can blink and follow what you're doing.
   Poses: idle, wave, coffee, laptop, envelope, bulb. Variants: face (just the face, for the teal cards). */
let mascotN = 0;
const MASCOT_FOR = {clock:"coffee", briefcase:"laptop", list:"coffee", flag:"bulb", receipt:"envelope", "file-text":"envelope", target:"bulb", wallet:"envelope", "calendar-days":"coffee"};
function mascotSVG(pose = "idle", opts = {}){
  const id = "mz" + (++mascotN);
  const navy = "#143A66";
  const eyes = `<g class="m-eye"><ellipse cx="96" cy="119" rx="6" ry="8" fill="${navy}"/><circle cx="98.2" cy="115.8" r="2" fill="#fff"/></g>
    <g class="m-eye"><ellipse cx="144" cy="119" rx="6" ry="8" fill="${navy}"/><circle cx="146.2" cy="115.8" r="2" fill="#fff"/></g>
    <path class="m-happy" d="M89 121q7-8 14 0M137 121q7-8 14 0" fill="none" stroke="${navy}" stroke-width="4.2" stroke-linecap="round"/>`;
  const glasses = `<g fill="rgba(255,255,255,.10)" stroke="${navy}" stroke-width="6.5"><circle cx="94" cy="116" r="22"/><circle cx="146" cy="116" r="22"/></g>
    <path d="M116.5 113q3.5-5 7 0" fill="none" stroke="${navy}" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M72.3 110L56 104.5M167.7 110L184 104.5" stroke="${navy}" stroke-width="5.5" stroke-linecap="round"/>`;
  const smile = `<path d="M108 149q12 10.5 24 0" fill="none" stroke="${navy}" stroke-width="4.6" stroke-linecap="round"/>`;
  const sprout = `<path d="M118 52C100 50 82 37 86 22C90 9 110 12 116 28C119 36 120 44 118 52Z" fill="url(#${id}k)"/>
    <path d="M122 52C127 38 140 25 153 27C164 29 162 44 151 48C141 52 131 54 122 52Z" fill="url(#${id}r)"/>`;
  const defs = `<defs>
    <linearGradient id="${id}b" x1=".15" y1=".05" x2=".85" y2=".95"><stop offset="0" stop-color="#4DEFDC"/><stop offset=".45" stop-color="#22D8C4"/><stop offset="1" stop-color="#0FB6AA"/></linearGradient>
    <radialGradient id="${id}s" cx=".32" cy=".28" r=".85"><stop offset=".55" stop-color="#0A8F8C" stop-opacity="0"/><stop offset="1" stop-color="#077F80" stop-opacity=".42"/></radialGradient>
    <linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2196E6"/><stop offset="1" stop-color="#0B4FA3"/></linearGradient>
    <linearGradient id="${id}k" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1E92DD"/><stop offset="1" stop-color="#0A5DAE"/></linearGradient>
    <linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#58CFF7"/><stop offset="1" stop-color="#169DDE"/></linearGradient></defs>`;
  if(opts.face){
    return `<svg class="mascot face" data-ex=".5" data-ey=".62" viewBox="50 6 140 164" aria-hidden="true">${defs}
      <g class="m-all">${sprout}<ellipse cx="74" cy="82" rx="11" ry="6" transform="rotate(-38 74 82)" fill="#fff" opacity=".5"/>${glasses}${eyes}${smile}</g></svg>`;
  }
  const L = `url(#${id}l)`;
  const armL = `<ellipse cx="46" cy="168" rx="13" ry="27" transform="rotate(14 46 168)" fill="${L}"/>`;
  const armR = `<ellipse cx="194" cy="168" rx="13" ry="27" transform="rotate(-14 194 168)" fill="${L}"/>`;
  let front = "";
  if(pose === "wave") front = armL + `<g class="m-wave"><ellipse cx="203" cy="118" rx="12.5" ry="26" transform="rotate(24 203 118)" fill="${L}"/></g>`;
  else if(pose === "coffee") front = armL + `<ellipse cx="180" cy="170" rx="12.5" ry="23" transform="rotate(-58 180 170)" fill="${L}"/>
    <g class="m-steam" fill="none" stroke="#86CFF5" stroke-width="3.2" stroke-linecap="round"><path d="M166 142q-5-7 0-14t0-14"/><path d="M178 140q-5-6 0-12t0-12"/></g>
    <rect x="156" y="150" width="32" height="36" rx="8" fill="#F5F8FB" stroke="#D9E3EC" stroke-width="2"/>
    <path d="M188 158q11 0 11 9.5t-11 9.5" fill="none" stroke="#D9E3EC" stroke-width="4.5"/>
    <ellipse cx="172" cy="153.5" rx="13" ry="3.6" fill="#6E4127"/><circle cx="160" cy="172" r="10" fill="${L}"/>`;
  else if(pose === "laptop") front = `<ellipse cx="58" cy="176" rx="12.5" ry="22" transform="rotate(40 58 176)" fill="${L}"/><ellipse cx="182" cy="178" rx="12.5" ry="22" transform="rotate(-48 182 178)" fill="${L}"/>
    <path d="M60 148L140 156L134 206L54 198Z" fill="#1E3D66"/><path d="M60 148L140 156L139 162L59 154Z" fill="#2B5486"/>
    <circle cx="98" cy="178" r="6.5" fill="#5DE4F6"/><path d="M54 198L134 206L176 198L98 191Z" fill="#2E5D91"/>
    <circle cx="60" cy="194" r="10.5" fill="${L}"/><circle cx="168" cy="196" r="10.5" fill="${L}"/>`;
  else if(pose === "envelope") front = armR + `<ellipse cx="62" cy="172" rx="12.5" ry="22" transform="rotate(44 62 172)" fill="${L}"/>
    <g transform="rotate(-12 82 176)"><rect x="46" y="152" width="74" height="50" rx="7" fill="#FFC53F"/><path d="M48 155L83 181L118 155" fill="#FFD772" stroke="#F0A21C" stroke-width="2.5" stroke-linejoin="round"/></g>
    <circle cx="58" cy="190" r="10.5" fill="${L}"/>`;
  else if(pose === "bulb") front = `<ellipse cx="60" cy="182" rx="12.5" ry="22" transform="rotate(48 60 182)" fill="${L}"/><ellipse cx="180" cy="182" rx="12.5" ry="22" transform="rotate(-48 180 182)" fill="${L}"/>
    <g class="m-rays" stroke="#FFC93D" stroke-width="3.8" stroke-linecap="round"><path d="M120 128v-10M94 138l-7-7M146 138l7-7M84 160h-10M156 160h10"/></g>
    <circle cx="120" cy="160" r="23" fill="#FFD84D"/><circle cx="112" cy="152" r="6" fill="#FFF1B0" opacity=".8"/><path d="M113 163q7 9 14 0" fill="none" stroke="#E8960C" stroke-width="2.6" stroke-linecap="round"/>
    <rect x="109" y="180" width="22" height="15" rx="4" fill="#5C6E8A"/><path d="M110 186h20M110 190.5h20" stroke="#8495B0" stroke-width="1.7"/>
    <circle cx="82" cy="196" r="10.5" fill="${L}"/><circle cx="158" cy="196" r="10.5" fill="${L}"/>`;
  else front = armL + armR;
  return `<svg class="mascot ${opts.cls||""}" data-ex=".5" data-ey=".46" viewBox="0 0 240 260" aria-hidden="true">${defs}
    <ellipse class="m-shadow" cx="120" cy="246" rx="66" ry="7.5" fill="rgba(20,30,50,.13)"/>
    <rect x="90" y="200" width="20" height="32" rx="8" fill="${L}"/><rect x="130" y="200" width="20" height="32" rx="8" fill="${L}"/>
    <ellipse cx="97" cy="234" rx="21" ry="10.5" fill="#0B4A98"/><ellipse cx="143" cy="234" rx="21" ry="10.5" fill="#0B4A98"/>
    <g class="m-all">${sprout}
      <path d="M120 44C160 44 186 78 192 124C198 172 182 214 120 216C58 214 42 172 48 124C54 78 80 44 120 44Z" fill="url(#${id}b)"/>
      <path d="M120 44C160 44 186 78 192 124C198 172 182 214 120 216C58 214 42 172 48 124C54 78 80 44 120 44Z" fill="url(#${id}s)"/>
      <ellipse cx="124" cy="180" rx="44" ry="29" fill="#94F4E3" opacity=".72"/>
      <ellipse cx="76" cy="74" rx="13" ry="7" transform="rotate(-38 76 74)" fill="#fff" opacity=".6"/><circle cx="63" cy="92" r="4" fill="#fff" opacity=".45"/>
      ${glasses}${eyes}${smile}${front}</g></svg>`;
}
function mascotEmpty(icon){ return MASCOT_FOR[icon] || "idle"; }

/* Eyes: one loop drives every mascot on screen. They look at the field you're typing in (following the text),
   glance where you tap, and otherwise look around the questions. They blink every few seconds. */
const MZ = {gx:0, gy:0, ix:0, iy:.4, idleNext:0, pt:null, lookUntil:0, typeAt:0, blinkT:-1e9, nextBlink:0, last:0, happyUntil:0, on:false};
const IDLE_OB = [[0,.9,3],[-.75,.65,1.6],[.75,.65,1.6],[-.95,.05,1.2],[.95,.05,1.2],[0,-.8,.8],[0,.1,.8]];
const IDLE_APP = [[0,.1,4],[-.9,.05,1.4],[.9,.05,1.4],[0,-.7,.8],[0,.7,1.2],[-.6,-.5,.5],[.6,-.5,.5]];
function pickIdle(list){ const tot = list.reduce((a,x)=>a+x[2],0); let r = Math.random()*tot; for(const x of list){ r -= x[2]; if(r <= 0) return x; } return list[0]; }
function mascotLook(x, y, ms = 900){ MZ.ix = x; MZ.iy = y; MZ.idleNext = performance.now() + ms; MZ.lookUntil = 0; }
function mascotHappy(ms = 1400){ MZ.happyUntil = performance.now() + ms; }
function boop(el){ el = el || document.querySelector(".logo .mascot"); if(!el || reduceMotion()) return; el.classList.remove("boop"); void el.getBoundingClientRect(); el.classList.add("boop"); mascotHappy(700); buzz(); }
function mascotLoop(now){
  requestAnimationFrame(mascotLoop);
  const els = document.querySelectorAll(".mascot");
  const dt = Math.min(.05, Math.max(0, (now - (MZ.last || now)) / 1000)); MZ.last = now;
  if(!els.length || document.hidden) return;
  const rm = reduceMotion(), inOb = !!document.querySelector(".ob");
  if(now >= MZ.nextBlink){ MZ.blinkT = now; MZ.nextBlink = now + (Math.random() < .18 ? 280 : 2300 + Math.random()*3300); }
  const bp = (now - MZ.blinkT) / 150, blink = bp >= 0 && bp < 1 ? 1 - .9*Math.sin(Math.PI*bp) : 1;
  const happy = now < MZ.happyUntil;
  let tgt;
  const f = document.activeElement, field = f && f.matches && f.matches("input,select,textarea") && f.closest(".ob") ? f : null;
  if(MZ.pt && now < MZ.lookUntil) tgt = {px:MZ.pt[0], py:MZ.pt[1]};
  else if(field){
    const r = field.getBoundingClientRect(); let x = r.left + r.width/2;
    if(now - MZ.typeAt < 1500 && field.tagName !== "SELECT"){ const n = String(field.value || "").length; x = r.left + Math.min(r.width - 6, 14 + n * 8.5); }
    tgt = {px:x, py:r.top + r.height/2};
  } else {
    if(now >= MZ.idleNext && !rm){ const p = pickIdle(inOb ? IDLE_OB : IDLE_APP); MZ.ix = p[0]; MZ.iy = p[1]; MZ.idleNext = now + (inOb ? 700 + Math.random()*1300 : 1800 + Math.random()*2800); }
    tgt = rm ? {x:0, y:.2} : {x:MZ.ix, y:MZ.iy};
  }
  const a = 1 - Math.exp(-dt * 15);
  els.forEach(el => {
    let gx = tgt.x, gy = tgt.y;
    if(tgt.px != null){
      const r = el.getBoundingClientRect(), ex = r.left + r.width * (+el.dataset.ex || .5), ey = r.top + r.height * (+el.dataset.ey || .46);
      const dx = tgt.px - ex, dy = tgt.py - ey, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 110);
      gx = dx / d * k; gy = dy / d * k;
    }
    if(el._gx == null){ el._gx = MZ.gx; el._gy = MZ.gy; }
    el._gx += (gx - el._gx) * a; el._gy += (gy - el._gy) * a;
    MZ.gx = el._gx; MZ.gy = el._gy;
    el.classList.toggle("happy", happy);
    const tr = `translate(${(el._gx * 7.5).toFixed(2)}px,${(el._gy * 6.5).toFixed(2)}px) scale(1,${blink.toFixed(3)})`;
    for(const e of el.querySelectorAll(".m-eye")) e.style.transform = tr;
  });
}
function startMascot(){
  if(MZ.on) return; MZ.on = true;
  document.addEventListener("input", e => { if(e.target.closest && e.target.closest(".ob")) MZ.typeAt = performance.now(); }, true);
  document.addEventListener("pointerdown", e => { MZ.pt = [e.clientX, e.clientY]; MZ.lookUntil = performance.now() + 1100;
    const m = e.target.closest && e.target.closest(".mascot"); if(m) boop(m); }, true);
  requestAnimationFrame(mascotLoop);
}
/* ============ Polo's loading screen ============
   When setup finishes, Polo (the mascot) fills the screen while ClockMe gets ready, then bursts and reveals the app. */
function poloLoader(from, steps, done){
  const rm = reduceMotion();
  const el = document.createElement("div"); el.className = "polo-load";
  el.innerHTML = `<div class="pl-bg"><span class="bubbles" aria-hidden="true">${"<i></i>".repeat(9)}</span></div>
    <div class="pl-m" aria-hidden="true">${mascotSVG("wave")}</div>
    <div class="pl-text" role="status" aria-live="polite"><b>Polo is getting<br>ClockMe ready</b><span class="pl-step in">${esc(steps[0])}</span></div>
    <div class="pl-bar"><i></i></div><span class="pl-ring" aria-hidden="true"></span><canvas class="pl-burst" aria-hidden="true"></canvas>`;
  document.body.appendChild(el);
  const m = el.querySelector(".pl-m"), stepEl = el.querySelector(".pl-step"), bar = el.querySelector(".pl-bar i");
  if(from && !rm){ // Polo grows from where he stood on the last question
    const r = m.getBoundingClientRect(), s = Math.max(.15, from.width / r.width);
    m.animate([{transform:`translate(${(from.left + from.width/2) - (r.left + r.width/2)}px,${(from.top + from.height/2) - (r.top + r.height/2)}px) scale(${s})`},{transform:"none"}], {duration:750, easing:"cubic-bezier(.34,1.25,.5,1)"});
  }
  mascotLook(0, .95, 2600); mascotHappy(500);
  const total = rm ? 700 : 2700, per = total / steps.length;
  bar.style.transition = `width ${total}ms cubic-bezier(.45,0,.25,1)`;
  requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = "100%"; }));
  let i = 0;
  const tick = setInterval(() => { i++; if(i >= steps.length){ clearInterval(tick); return; } stepEl.classList.remove("in"); void stepEl.offsetWidth; stepEl.textContent = steps[i]; stepEl.classList.add("in"); }, per);
  let ended = false;
  const explode = () => {
    if(ended) return; ended = true; clearInterval(tick);
    stepEl.textContent = steps[steps.length-1]; bar.style.width = "100%"; mascotHappy(1200);
    el.classList.add("charge");
    setTimeout(() => {
      const r = m.getBoundingClientRect(), ring = el.querySelector(".pl-ring");
      ring.style.left = (r.left + r.width/2) + "px"; ring.style.top = (r.top + r.height*.47) + "px";
      el.classList.add("boom"); burst(el.querySelector(".pl-burst"), r); buzz();
      done && done();
      setTimeout(() => el.remove(), rm ? 300 : 1400);
    }, rm ? 0 : 560);
  };
  el.addEventListener("click", explode); // tap to skip
  setTimeout(explode, total + 300);
}
/* Polo bursts into blobs of his own colours, bubbles and sparkles. */
function burst(cv, r){
  if(reduceMotion() || !cv) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  const x = cv.getContext("2d"); x.scale(dpr, dpr);
  const cx = r.left + r.width/2, cy = r.top + r.height*.47;
  const cols = ["#22D8C4","#4DEFDC","#1E92DD","#58CFF7","#0B4FA3","#94F4E3","#FFD84D","#143A66"];
  const P = Array.from({length:110}, (_, k) => { const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 15;
    return {x:cx + Math.cos(a)*20, y:cy + Math.sin(a)*20, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp - 2.5, r:3 + Math.random()*12, c:cols[k % cols.length], kind:k % 7 === 0 ? "bub" : k % 11 === 0 ? "star" : "blob", rot:Math.random()*6, vr:(Math.random()-.5)*.3}; });
  const t0 = performance.now();
  const star = (px, py, rad, rot) => { x.save(); x.translate(px, py); x.rotate(rot); x.beginPath(); for(let i = 0; i < 8; i++){ const rr = i % 2 ? rad*.38 : rad; x.lineTo(Math.cos(i*Math.PI/4)*rr, Math.sin(i*Math.PI/4)*rr); } x.closePath(); x.fill(); x.restore(); };
  const f = now => {
    const t = now - t0; x.clearRect(0, 0, innerWidth, innerHeight);
    for(const p of P){
      p.vx *= .962; p.vy = p.vy * .962 + .24; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      x.globalAlpha = Math.max(0, 1 - t / 1250);
      if(p.kind === "bub"){ x.beginPath(); x.arc(p.x, p.y, p.r * 1.3, 0, 7); x.strokeStyle = "rgba(255,255,255,.95)"; x.lineWidth = 2.2; x.stroke(); x.beginPath(); x.arc(p.x - p.r*.45, p.y - p.r*.45, p.r*.28, 0, 7); x.fillStyle = "#fff"; x.fill(); }
      else if(p.kind === "star"){ x.fillStyle = "#FFE680"; star(p.x, p.y, p.r * 1.3, p.rot); }
      else { x.beginPath(); x.ellipse(p.x, p.y, p.r, p.r * .8, p.rot, 0, 7); x.fillStyle = p.c; x.fill(); }
    }
    if(t < 1300) requestAnimationFrame(f); else x.clearRect(0, 0, innerWidth, innerHeight);
  };
  requestAnimationFrame(f);
}
/* When setup is done the mascot shrinks and flies up into the top-left corner, where it stays as the logo. */
function flyMascotToLogo(from, done){
  const to = document.querySelector(".logo .mascot");
  if(!from || !to || reduceMotion()){ done && done(); return; }
  const tr = to.getBoundingClientRect();
  const clone = document.createElement("div"); clone.className = "mflight";
  clone.innerHTML = mascotSVG("wave");
  Object.assign(clone.style, {left:from.left + "px", top:from.top + "px", width:from.width + "px", height:from.height + "px"});
  document.body.appendChild(clone); to.style.visibility = "hidden"; mascotHappy(1300);
  const s = tr.width / from.width, dx = tr.left - from.left, dy = tr.top - from.top;
  const anim = clone.animate([
    {transform:"translate(0,0) scale(1) rotate(0deg)"},
    {transform:`translate(${dx*.45}px,${dy*.45 - 70}px) scale(${(1+s)/2}) rotate(-10deg)`, offset:.45},
    {transform:`translate(${dx}px,${dy}px) scale(${s}) rotate(0deg)`}
  ], {duration:1050, easing:"cubic-bezier(.45,0,.2,1)", fill:"forwards"});
  anim.onfinish = () => { to.style.visibility = ""; clone.remove(); to.classList.add("landed"); done && done(); };
}

/* ============ Final design: shared pieces ============ */
function topbarHTML(right = ""){
  return `<div class="topbar"><div class="logo" aria-label="ClockMe">${mascotSVG("idle")}<span class="lw">ClockMe</span></div><div class="row" style="gap:8px">${right}</div></div>`;
}
/* Thin vertical lines, like a heart-rate trace, one per day or bucket. */
function spikesSVG(vals){
  if(!vals.some(v => v > 0)) return `<svg class="spikes nodata" viewBox="0 0 140 70" preserveAspectRatio="none" aria-hidden="true"><line x1="6" x2="134" y1="35" y2="35"/></svg>`;
  const mx = Math.max(...vals, .0001), n = vals.length, step = 140 / n;
  return `<svg class="spikes" viewBox="0 0 140 70" preserveAspectRatio="none" aria-hidden="true">${vals.map((v, i) => {
    const h = v > 0 ? 12 + 46 * v / mx : 5, cy = 35 + (((i * 7) % 5) - 2) * 3.2, x = (step / 2 + i * step).toFixed(1);
    return `<line x1="${x}" x2="${x}" y1="${(cy - h/2).toFixed(1)}" y2="${(cy + h/2).toFixed(1)}" style="--i:${i}"/>`;
  }).join("")}</svg>`;
}
function mascotRect(){
  const el = document.querySelector(".ob .mascot"); if(!el) return null;
  const r = el.getBoundingClientRect();
  if(!el.classList.contains("face")) return r;
  const w = r.width * .72, h = w * 260 / 240;
  return {left: r.left + (r.width - w) / 2, top: r.top + r.height * .04, width: w, height: h};
}

/* ============ Welcome, sign up and log in ============ */
function welcomeHTML(entering){
  return `<div class="ob auth welcome ${entering?"enter":""}">
    <span class="bubbles" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
    <span class="wb w1" aria-hidden="true"></span><span class="wb w2" aria-hidden="true"></span><span class="wb w3" aria-hidden="true"></span>
    <div class="wbody">
      <h1 class="bigt">Let's track<br>some shifts!</h1>
      <p>Every hour, paid right.<br>Welcome to ClockMe.</p>
      <button class="btn big wbtn" data-act="authSignup">Sign up</button>
      <button class="btn big wout" data-act="authLogin">Log in</button>
    </div>
    <div class="wpeek">${mascotSVG("wave")}</div>
  </div>`;
}
function emailMsg(o){ return o.email && !validEmail(o.email) ? `<span>Check your email address.</span>` : "Used on your invoices and backups. We never send marketing."; }
function claudeChip(){
  const me = UI.me;
  return me ? `<div class="tacct">${ico("shield-check","ico-sm")}<span>Signed in${me.email?` as ${esc(me.email)}`:""} · your data syncs</span></div>`
    : `<div class="tacct">${ico("cloud-off","ico-sm")}<span>Your data stays on this device</span></div>`;
}
function signupHTML(entering, canNext){
  const o = UI.obDraft;
  return `<div class="ob auth signup ${entering?"enter":""}"><div class="tcard"><span class="bubbles" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
    <div class="tbar"><button class="tround" data-act="authBack" aria-label="Back">${ico("chevron-left")}</button><span class="tstep">Create account</span><span style="width:40px"></span></div>
    <div class="tface">${mascotSVG("idle", {face:true})}</div>
    <h1 class="ttitle">Ready to get<br>paid right?</h1>
    <div class="tfields">
      <input class="tin" id="ob-name" data-ob="name" placeholder="Your name" value="${esc(o.name)}" autocomplete="given-name" aria-label="Your name">
      <input class="tin" id="ob-email" data-ob="email" type="email" inputmode="email" placeholder="Email" value="${esc(o.email)}" autocomplete="email" aria-label="Email">
      <div class="tmsg" id="ob-email-msg">${emailMsg(o)}</div>
    </div>
    <button class="btn big tcta" data-act="obNext" id="obnext" ${canNext?"":"disabled"}>Let's go!</button>
    <p class="tfoot">Already have an account? <button data-act="authLogin">Log in</button></p>
  </div></div>`;
}
function loginHTML(entering){
  const me = UI.me;
  return `<div class="ob auth signup login ${entering?"enter":""}"><div class="tcard"><span class="bubbles" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
    <div class="tbar"><button class="tround" data-act="authBack" aria-label="Back">${ico("chevron-left")}</button><span class="tstep">Log in</span><span style="width:40px"></span></div>
    <div class="tface">${mascotSVG("idle", {face:true})}</div>
    <h1 class="ttitle">Welcome back!</h1>
    <p class="tp">${me && me.email ? `We couldn't find any ClockMe data for <b>${esc(me.email)}</b> yet.` : `We couldn't find any ClockMe data on this device yet.`}</p>
    <div class="tnote">${ico("refresh-cw","ico-sm")}<span>${HOSTED ? "Your ClockMe data is saved on the device you used. Moving to a new phone? Restore the backup you saved." : "Used ClockMe on another device? Your data appears here by itself once it syncs."}</span></div>
    <label class="btn big tcta" for="restore-file">${ico("archive-restore","ico-sm")} Restore from a backup<input type="file" id="restore-file" accept="application/json,.json" hidden></label>
    <p class="tp xs">A backup is the file you saved from Profile, then Back up my data.</p>
    <p class="tfoot">New to ClockMe? <button data-act="authSignup">Create an account</button></p>
  </div></div>`;
}

/* ============ Shifts timeline ============ */
function tlItem(s, C, next, dayStart){
  const p = C.pay(s), j = jobById(s.jobId), type = shiftType(s), fut = isFuture(s), extra = p.premium + p.ot;
  const h = new Date(s.start).getHours();
  const part = h < 5 ? "Night" : h < 12 ? "Morning" : h < 17 ? "Day" : h < 21 ? "Evening" : "Night";
  const title = type === "holiday" ? "Holiday" : type === "sick" ? "Sick day" : `${part} shift`;
  const cls = next ? "pinkc" : type === "holiday" ? "holc" : type === "sick" ? "sickc" : "greyc";
  const live = !fut && s.end > Date.now() && type === "work";
  const hours = type === "holiday" ? p.holHours : type === "sick" ? (p.sickHours || p.hours) : p.hours;
  const cap = type === "sick" ? (s.paidSick ? "Sick pay" : "Unpaid") : type === "holiday" ? "Holiday pay" : fut ? "Expected pay" : extra > 0 ? `incl. ${money(extra)} extra` : "Earned";
  const icon = type === "holiday" ? "tree-palm" : type === "sick" ? "thermometer" : (j ? j.icon : "briefcase");
  const col = type === "holiday" ? "var(--blue)" : type === "sick" ? "var(--orange)" : j ? j.color : "var(--muted)";
  const d = new Date(s.start);
  return `<div class="tl-row ${next?"next":""}"><div class="tl-time">${dayStart?`<span class="tl-day">${WDS[d.getDay()]} ${d.getDate()}</span>`:""}<b>${tm(s.start)}</b></div>
    <button class="tl-card ${cls} ${fut?"fut":""}" data-act="editShift" data-id="${s.id}">
      <span class="tl-t">${tm(s.start)} – ${tm(s.end)} · ${hrs(hours)}${live?` <span class="tl-live">Now</span>`:""}${s.weekEdit?` <span class="tl-tag">This week only</span>`:""}${s.invoiceId?` <span class="tl-tag">Invoiced</span>`:""}</span>
      <b class="tl-h">${title}<br><span>at ${esc(j ? j.name : "your job")}</span></b>
      <span class="tl-f"><span class="tl-who"><span class="tl-av" style="color:${col}">${ico(icon)}</span><span><b class="num">${fut || type !== "work" ? "" : "+"}${money(C.shown(gross(p)))}</b><small>${cap}</small></span></span><span class="tl-go" aria-hidden="true">${ico("arrow-up-right")}</span></span>
    </button></div>`;
}

/* ============ Screens ============ */
function homeView(C){
  const st = S.settings;
  const [ws, we] = interval("week", Date.now());
  const weekAll = S.shifts.filter(s => s.start >= ws && s.start < we);
  const week = weekAll.filter(s => !isFuture(s));
  const upcoming = weekAll.filter(isFuture);
  const t = C.total(week);
  const sched = C.shown(gross(C.total(upcoming)));
  const list = sorted().filter(s => !isFuture(s));
  const next = [...S.shifts].filter(isFuture).sort((a,b)=>a.start-b.start)[0];
  const jobs = activeJobs();
  const ck = S.clock;
  let hero;
  if(ck){
    const j = jobById(ck.jobId);
    hero = `<section class="pinkc livec"><div class="between"><span class="lchip"><span class="tag ${ck.breakStart?"orange":"pulse"}"></span>${ck.breakStart?"On break":"On shift"} · ${esc(j?j.name:"Shift")}</span><span class="tl-go" aria-hidden="true">${ico("timer","ico-sm")}</span></div>
      <div class="ltime num" id="cktime">00:00:00</div>
      <div class="between" style="align-items:flex-end"><div class="amount" id="ckamt">${amountHTML(money(0))}</div><span class="xs" id="ckcap" style="opacity:.7;text-align:right">Since ${tm(ck.start)}</span></div></section>`;
  } else {
    const extra = t.premium + t.ot, today = startOfDay(Date.now());
    const dv = Array.from({length:7}, (_,i) => { const d = addDays(ws, i), l = weekAll.filter(s => s.start >= d && s.start < addDays(d,1)); return {d, v:C.shown(gross(C.total(l))), fut:d > today}; });
    const mx = Math.max(1, ...dv.map(x => x.v));
    const tIdx = dv.findIndex(x => x.d === today);
    hero = `<section class="glass wcard">
      <div class="between"><span class="wlab"><span class="wic">${ico("wallet","ico-sm")}</span>This week</span><span class="amount num" data-count="${C.shown(gross(t))}" data-ckey="hero">${amountHTML(money(C.shown(gross(t))))}</span></div>
      <div class="wsub">${esc(C.label)} · ${hrs(t.hours)} paid${extra>0?` · ${money(extra)} extra`:""}${upcoming.length?` · ${money(sched)} to come`:""}</div>
      ${chart(dv.map(x => ({l:WDS[new Date(x.d).getDay()], v:x.v, fut:x.fut})), money0, tIdx >= 0 ? tIdx : null, {h:104})}
      <div class="between"><span class="pleg">${chartAvg(dv.map(x=>({v:x.v,fut:x.fut}))) > 0 ? `<i></i>avg ${money0(chartAvg(dv.map(x=>({v:x.v,fut:x.fut}))))} a day` : ""}</span><button class="wmore" data-act="tab" data-tab="insights">See insights ${ico("chevron-right","ico-sm")}</button></div></section>`;
  }
  // Payday & invoices cards
  const cards = [];
  { const now = Date.now();
    if(!ck){ // a planned shift starting soon or already under way
      const due = S.shifts.filter(s => shiftType(s)==="work" && !s.clocked && s.start - now < 45*60000 && s.start - now > -20*60000 && s.end > now).sort((a,b)=>a.start-b.start)[0];
      if(due){ const j = jobById(due.jobId), mins = Math.round((due.start - now)/60000);
        cards.push(`<div class="paycard remind"><div class="tile" style="color:var(--green)">${ico("bell-ring")}</div><div style="flex:1;min-width:0"><b>${mins > 0 ? `Shift starts in ${mins} min` : "Your shift has started"}</b><div class="small muted">${esc(j?j.name:"Shift")} · ${tm(due.start)}–${tm(due.end)}</div></div><button class="btn" style="padding:9px 14px;font-size:14px" data-act="clockInShift" data-id="${due.id}">Clock in</button></div>`); }
    } else {
      const plan = ck.planId ? S.shifts.find(s => s.id === ck.planId) : null;
      const overdue = plan ? now - plan.end > 30*60000 : now - ck.start > 12*3600000;
      if(overdue) cards.push(`<div class="paycard remind"><div class="tile" style="color:var(--orange)">${ico("bell-ring")}</div><div style="flex:1;min-width:0"><b>Still clocked in?</b><div class="small muted">${plan ? `Your shift was due to end at ${tm(plan.end)}` : `You clocked in at ${tm(ck.start)}, ${dayMon(ck.start)}`}</div></div><button class="btn" style="padding:9px 14px;font-size:14px" data-act="clock">Clock out</button></div>`);
    }
  }
  const pd = paydays();
  if(pd && S.jobs.some(j => !j.selfEmployed)){
    const days = Math.round((pd[1] - startOfDay(Date.now()))/DAY);
    const earned = C.total(S.shifts.filter(s => s.start >= pd[0] && !isFuture(s) && !(jobById(s.jobId)||{}).selfEmployed));
    cards.push(`<button class="paycard" data-act="openPayslip"><div class="tile">${ico("wallet")}</div><div><b>${days===0?"Payday today":days===1?"Payday tomorrow":`Payday in ${days} days`}</b><div class="small muted">${dayMon(pd[1])} · tap to check a payslip</div></div>
      <div class="amt"><b>${money(C.shown(gross(earned)))}</b><span class="xs muted">since last payday</span></div></button>`);
  }
  for(const j of S.jobs.filter(j => !j.archived)){
    const mw = belowMin(j);
    if(mw) cards.push(`<button class="paycard" data-act="editJob" data-id="${j.id}"><div class="tile" style="color:var(--red)">${ico("scale")}</div><div><b>Below minimum wage</b><div class="small muted">${esc(j.name)} pays ${money(rateFor(j, Date.now()))}/h. The ${mw.name} for your age is ${money(mw.rate)}.</div></div><span class="amt">${ico("chevron-right","ico-sm")}</span></button>`);
  }
  for(const j of S.jobs.filter(j => !j.archived)){
    const cs = contractStatus(j); if(!cs) continue;
    const today = startOfDay(Date.now());
    if(cs.state === "active" && cs.left != null && cs.left <= 30)
      cards.push(`<button class="paycard" data-act="editJob" data-id="${j.id}"><div class="tile" style="color:${cs.left<=7?"var(--red)":"var(--orange)"}">${ico("file-clock")}</div><div><b>${cs.left===0?"Contract ends today":`Contract ends in ${cs.left} day${cs.left===1?"":"s"}`}</b><div class="small muted">${esc(j.name)} · ${dmy(cs.c.end)}${cs.c.notice?` · notice ${esc(cs.c.notice)}`:""}</div></div><span class="amt">${ico("chevron-right","ico-sm")}</span></button>`);
    if(cs.state === "active" && cs.label.startsWith("Renews")){ const nx = contractsOf(j).find(c => startOfDay(c.start) > startOfDay(Date.now())); const dl = nx ? Math.round((startOfDay(nx.start)-today)/DAY) : 99;
      if(nx && dl <= 30) cards.push(`<button class="paycard" data-act="editJob" data-id="${j.id}"><div class="tile" style="color:var(--green)">${ico("file-pen-line")}</div><div><b>New contract in ${dl} day${dl===1?"":"s"}</b><div class="small muted">${esc(j.name)} · from ${dmy(nx.start)}${+nx.rate?` at ${money(nx.rate)}/h`:""}</div></div><span class="amt">${ico("chevron-right","ico-sm")}</span></button>`); }
    if(cs.state === "future" && Math.round((startOfDay(cs.c.start)-today)/DAY) <= 30)
      cards.push(`<button class="paycard" data-act="editJob" data-id="${j.id}"><div class="tile" style="color:var(--green)">${ico("file-pen-line")}</div><div><b>New contract starts ${dmy(cs.c.start)}</b><div class="small muted">${esc(j.name)}${+cs.c.rate?` · ${money(cs.c.rate)}/h`:""}</div></div><span class="amt">${ico("chevron-right","ico-sm")}</span></button>`);
    const pe = cs.c && cs.c.probationEnd; const pl = pe ? Math.round((startOfDay(pe)-today)/DAY) : -1;
    if(pl >= 0 && pl <= 21) cards.push(`<button class="paycard" data-act="editJob" data-id="${j.id}"><div class="tile" style="color:var(--blue)">${ico("badge-check")}</div><div><b>${pl===0?"Probation ends today":`Probation ends in ${pl} day${pl===1?"":"s"}`}</b><div class="small muted">${esc(j.name)} · ${dmy(pe)}</div></div><span class="amt">${ico("chevron-right","ico-sm")}</span></button>`);
  }
  for(const j of S.jobs.filter(j => j.holiday === "accrue" && !j.archived)){
    const hb = holidayBalance(j, C);
    cards.push(`<button class="paycard" data-act="bookHoliday"><div class="tile" style="color:var(--blue)">${ico("tree-palm")}</div><div><b>Holiday left</b><div class="small muted">${esc(j.name)} · tap to book time off</div></div>
      <div class="amt"><b>${hrs(Math.max(0, hb.left))}</b><span class="xs muted">worth ${money(Math.max(0, hb.left) * j.rate)}</span></div></button>`);
  }
  if(selfJobs().length){
    const unpaid = S.invoices.filter(i => i.status !== "paid");
    const owed = unpaid.reduce((a,i)=>a+i.total,0), over = unpaid.filter(i=>invStatus(i)==="overdue").length;
    cards.push(`<button class="paycard" data-act="push" data-page="invoices"><div class="tile" style="color:var(--orange)">${ico("receipt")}</div><div><b>Invoices</b><div class="small ${over?"":"muted"}" style="${over?"color:var(--red)":""}">${over?`${over} overdue`:unpaid.length?`${unpaid.length} unpaid`:"All paid"}</div></div>
      <div class="amt"><b>${money(owed)}</b><span class="xs muted">owed to you</span></div></button>`);
  }
  {
    const nws = addDays(weekStart(Date.now()), 7), nwe = addDays(nws, 7);
    const nw = S.shifts.filter(s => shiftType(s)==="work" && s.start >= nws && s.start < nwe);
    if(activeJobs().length){
      const t = C.total(nw), changedNW = weekLocked(nws) || nw.some(s => s.weekEdit);
      cards.push(`<div class="paycard"><div class="tile" style="color:var(--blue)">${ico("calendar-cog")}</div><div style="flex:1;min-width:0"><b>Next week${changedNW?` <span class="st sent">Changed</span>`:""}</b><div class="small muted">${nw.length ? `${nw.length} shift${nw.length===1?"":"s"} · ${hrs(t.hours)} · ${money0(C.shown(gross(t)))}` : "No shifts planned yet"}</div></div><button class="btn ghost" style="padding:9px 14px;font-size:14px;background:var(--card);border:1px solid var(--line)" data-act="openWeek" data-ws="${nws}">Edit</button></div>`);
    }
    const [ma, mb] = [monthStart(Date.now()), monthEnd(Date.now())];
    const mAll = S.shifts.filter(s => s.start >= ma && s.start < mb);
    if(mAll.length){
      const mw = C.total(mAll.filter(s=>!isFuture(s))), mf = C.total(mAll.filter(isFuture));
      cards.push(`<button class="paycard" data-act="openCalendar"><div class="tile" style="color:var(--ink)">${ico("calendar-range")}</div><div><b>${new Date().toLocaleDateString(undefined,{month:"long"})}</b><div class="small muted">${mAll.length} shift${mAll.length===1?"":"s"} · ${money0(C.shown(gross(mf)))} still to come</div></div>
        <div class="amt"><b>${money(C.shown(gross(mw)) + C.shown(gross(mf)))}</b><span class="xs muted">expected this month</span></div></button>`);
    }
  }
  if(next){
    const j = jobById(next.jobId);
    cards.push(`<button class="paycard" data-act="editShift" data-id="${next.id}"><div class="tile" style="color:${j?j.color:"var(--muted)"}">${ico("calendar-clock")}</div><div><b>Next shift</b><div class="small muted">${dayMon(next.start)} · ${tm(next.start)}–${tm(next.end)}</div></div>
      <div class="amt"><b>${money(C.shown(gross(C.pay(next))))}</b><span class="xs muted">${esc(j?j.name:"")}</span></div></button>`);
  }
  const greet = (()=>{ const h = new Date().getHours(); const g = h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; return st.name ? `${g},<br>${esc(st.name)}` : g; })();
  return `<div class="stack home">
    <div class="hello">${topbarHTML(`<button class="iconbtn glassbtn" data-act="export" aria-label="Export shifts">${ico("share")}</button><button class="iconbtn avbtn" data-act="tab" data-tab="profile" aria-label="Profile and settings">${avatarHTML(40)}</button>`)}
      <small>${new Date().toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"})}</small><h1 class="bigt">${greet}</h1></div>
    ${hero}
    <div class="acts">
      <button class="act" data-act="clock"><span class="ball dark ${ck?"live":""}">${ico(ck?"square":"play")}</span>${ck?"Clock out":"Clock in"}</button>
      <button class="act" data-act="break" ${ck?"":"disabled"}><span class="ball">${ico(ck&&ck.breakStart?"rotate-ccw":"coffee")}</span>${ck&&ck.breakStart?"Resume":"Break"}</button>
      <button class="act" data-act="newShift"><span class="ball">${ico("plus")}</span>Add shift</button>
      <button class="act" data-act="openRoster"><span class="ball">${ico("calendar-days")}</span>Roster</button>
    </div>
    ${statsCardHTML()}
    ${cards.length?`<div class="list">${cards.join("")}</div>`:""}
    ${(()=>{ const ch = activeJobs().reduce((a2,j) => { const c = contractOn(j, ws); return a2 + (c && +c.hours || 0); }, 0);
      const ex14 = Array.from({length:14}, (_,i) => { const d = addDays(startOfDay(Date.now()), i-13), l = S.shifts.filter(x => x.start >= d && x.start < addDays(d,1) && !isFuture(x)); const tt = C.total(l); return l.length ? Math.max(.15, tt.premium + tt.ot) : 0; });
      const ex14sum = Array.from({length:14}, (_,i) => { const d = addDays(startOfDay(Date.now()), i-13); const tt = C.total(S.shifts.filter(x => x.start >= d && x.start < addDays(d,1) && !isFuture(x))); return tt.premium + tt.ot; }).reduce((a2,b2)=>a2+b2,0);
      return `<div class="tiles">
      <div class="tile2 t1"><span class="tlab"><i style="color:var(--ic1)">${ico("clock","ico-sm")}</i>Hours</span><b class="num">${ch > 0 ? `${Math.round(t.hours*10)/10}<small>/${+ch} h</small>` : hrs(t.hours)}</b><span class="tsub">this week</span></div>
      <div class="tile2 t2 tall"><span class="tlab"><i style="color:var(--ic2)">${ico("sparkles","ico-sm")}</i>Extra pay</span>${spikesSVG(ex14)}<b class="num">${money0(ex14sum)}</b><span class="tsub">last 2 weeks</span></div>
      <div class="tile2 t3"><span class="tlab"><i style="color:var(--ic3)">${ico("gauge","ico-sm")}</i>Per hour</span><b class="num">${t.hours>0?money(wages(t)/t.hours):"—"}</b><span class="tsub">average this week</span></div>
    </div>`; })()}
    ${jobs.length && S.roster.on ? `<div class="qa"><button data-act="bookHoliday"><span class="tile" style="color:var(--blue)">${ico("tree-palm","ico-sm")}</span>Book holiday</button><button data-act="openPayslip"><span class="tile" style="color:var(--green)">${ico("file-check","ico-sm")}</span>Check a payslip</button></div>` : ""}
    ${!S.roster.on && jobs.length ? `<div class="qa"><button data-act="openRoster"><span class="tile" style="color:var(--blue)">${ico("calendar-days","ico-sm")}</span>Set my weekly roster</button><button data-act="openImport"><span class="tile" style="color:var(--green)">${ico("scan-line","ico-sm")}</span>Scan a rota</button></div>` : ""}
    <section class="stack" style="gap:12px">
      <div class="between"><h2>Your goals</h2>${S.goals.length?`<button class="link" data-act="push" data-page="goals">View all ${ico("chevron-right","ico-sm")}</button>`:""}</div>
      ${S.goals.length ? S.goals.slice(0,3).map(g=>goalCard(g, C.shown(gross(C.total(goalShifts(g)))))).join("") : empty("flag","Set an earnings goal","Pick a target like a holiday or a car, and watch your shifts fill it up.","newGoal","Add goal")}
    </section>
    <section class="stack" style="gap:12px">
      <div class="between"><h2>Recent shifts</h2>${list.length?`<button class="link" data-act="tab" data-tab="shifts">History ${ico("chevron-right","ico-sm")}</button>`:""}</div>
      ${list.length ? `<div class="list">${list.slice(0,5).map(s=>shiftRow(s,C)).join("")}</div>` : (jobs.length ? empty("clock","No shifts yet","Clock in when you start, add a shift you've worked, or set your roster and let the app fill them in.","newShift","Add shift") : empty("briefcase","Add your first job","Set your hourly rate and extra pay for Sundays, nights or bank holidays.","newJob","Add job"))}
    </section></div>`;
}
function updateLive(){
  const ck = S.clock; if(!ck || UI.tab !== "home" || UI.stack.length) return;
  const el = document.getElementById("ckamt"); if(!el) return;
  const now = Date.now();
  const brk = (ck.breakSec||0) + (ck.breakStart ? (now-ck.breakStart)/1000 : 0);
  const j = jobById(ck.jobId);
  const p = payShift({start:ck.start, end:now, breakMin:brk/60, rate:j?j.rate:0, jobId:ck.jobId, tips:0, extraPct:0});
  const C = lastC || context();
  document.getElementById("cktime").textContent = clockStr((now-ck.start)/1000 - brk);
  el.innerHTML = amountHTML(money(C.shown(gross(p))));
  document.getElementById("ckcap").textContent = p.premium > 0 ? `Includes ${money(p.premium)} premium` : `Since ${tm(ck.start)}`;
}

function insightsView(C){
  const per = UI.period;
  const [a, b] = interval(per, UI.anchor);
  const inP = S.shifts.filter(s => s.start >= a && s.start < b);
  const t = C.total(inP), shown = C.shown(gross(t));
  const [pa, pb] = interval(per, shiftPeriod(per, a, -1));
  const isNow = Date.now() >= a && Date.now() < b;
  const cutoff = isNow ? pa + (Date.now() - a) : pb;
  const worked = C.shown(gross(C.total(inP.filter(s => !isFuture(s)))));
  const prev = C.shown(gross(C.total(S.shifts.filter(s=>s.start>=pa && s.start<Math.min(pb,cutoff)))));
  const change = prev > 0 ? ((isNow ? worked : shown)-prev)/prev*100 : null;
  const schedAmt = shown - worked;
  let title;
  if(per==="week") title = `${dm(a)} – ${dmy(b-1)}`;
  else if(per==="month") title = new Date(a).toLocaleDateString(undefined,{month:"long",year:"numeric"});
  else title = String(new Date(a).getFullYear());
  const buckets = [];
  if(per==="week") for(let i=0;i<7;i++){ const s = addDays(a,i); buckets.push([WDS[new Date(s).getDay()], s, addDays(s,1)]); }
  else if(per==="month"){ let s = a; while(s < b){ const e = Math.min(addDays(s,7), b); buckets.push([`${new Date(s).getDate()}–${new Date(e-1).getDate()}`, s, e]); s = e; } }
  else for(let i=0;i<12;i++){ const s = new Date(new Date(a).getFullYear(), i, 1).getTime(), e = new Date(new Date(a).getFullYear(), i+1, 1).getTime(); buckets.push([new Date(s).toLocaleDateString(undefined,{month:"short"}).slice(0,3), s, e]); }
  const bars = buckets.map(([l,s,e]) => ({l, v: C.shown(gross(C.total(inP.filter(x=>x.start>=s && x.start<e))))}));
  const parts = Object.entries(t.parts).sort((x,y)=>y[1]-x[1]);
  const ded = C.deductions(gross(t));
  const byJob = {};
  for(const s of inP){ (byJob[s.jobId] = byJob[s.jobId] || []).push(s); }
  const jobsRows = Object.entries(byJob).map(([id, l]) => { const tt = C.total(l); return {j:jobById(id), v:C.shown(gross(tt)), h:tt.hours}; }).sort((x,y)=>y.v-x.v);
  const sum = Math.max(0.0001, jobsRows.reduce((x,r)=>x+r.v,0));
  const selfGross = gross(C.total(inP.filter(s => (jobById(s.jobId)||{}).selfEmployed)));
  const bucketName = per==="week"?"day":per==="month"?"week":"month";
  const curIdx = isNow ? buckets.findIndex(([l,s,e]) => Date.now() >= s && Date.now() < e) : -1;
  const exB = buckets.map(([l,s,e]) => { const tt = C.total(inP.filter(x=>x.start>=s && x.start<e)); return tt.premium + tt.ot; });
  return `<div class="stack" style="gap:18px">
    ${topbarHTML(`<button class="iconbtn glassbtn" data-act="copySummary" aria-label="Copy this ${per}'s summary">${ico("copy")}</button>`)}
    <h1 class="bigt">Check<br>your pay</h1>
    <div class="seg pills">${["week","month","year"].map(p=>`<button class="${per===p?"on":""}" data-act="period" data-p="${p}">${p[0].toUpperCase()+p.slice(1)}</button>`).join("")}</div>
    <div class="navper"><button class="round" data-act="prevP" aria-label="Previous">${ico("chevron-left","ico-sm")}</button>
      <div style="text-align:center"><b style="font-size:15px">${title}</b>${isNow?"":`<br><button class="xs muted" data-act="nowP" style="font-weight:600">Back to now</button>`}</div>
      <button class="round" data-act="nextP" aria-label="Next">${ico("chevron-right","ico-sm")}</button></div>
    <div class="glass wcard ins">
      <div class="between"><span class="wlab"><span class="wic">${ico("wallet","ico-sm")}</span>${esc(C.label)}</span>${change!=null?`<span title="Compared with the same point last ${per}">${delta(change)}</span>`:""}</div>
      <div class="amount big" data-count="${shown}" data-ckey="ins">${amountHTML(money(shown))}</div>
      ${schedAmt>0.005?`<div class="wsub">Includes ${money(schedAmt)} from scheduled shifts</div>`:""}
      ${chart(bars, money0, curIdx >= 0 ? curIdx : null)}
      <div class="between"><span class="pleg">${chartAvg(bars) > 0 ? `<i></i>avg ${money0(chartAvg(bars))} a ${bucketName}` : ""}</span><span class="xs muted">Tap a bar to see the amount</span></div>
    </div>
    <div class="tiles">
      <div class="tile2 t1"><span class="tlab"><i style="color:var(--ic1)">${ico("clock","ico-sm")}</i>Hours</span><b class="num">${hrs(t.hours)}</b><span class="tsub">this ${per}</span></div>
      <div class="tile2 t2 tall"><span class="tlab"><i style="color:var(--ic2)">${ico("sparkles","ico-sm")}</i>Extra pay</span>${spikesSVG(exB)}<b class="num">${money0(t.premium+t.ot)}</b><span class="tsub">premiums and overtime</span></div>
      <div class="tile2 t3"><span class="tlab"><i style="color:var(--ic3)">${ico("gauge","ico-sm")}</i>Per hour</span><b class="num">${t.hours>0?money(wages(t)/t.hours):"—"}</b><span class="tsub">average</span></div>
    </div>
    ${(()=>{ const n = per==="year" ? 5 : 8; const vals = []; for(let k=n-1;k>=0;k--){ const [x,y] = interval(per, shiftPeriod(per, a, -k)); vals.push(C.shown(gross(C.total(S.shifts.filter(s=>s.start>=x && s.start<y && !isFuture(s)))))); }
      return vals.some(v=>v>0) ? `<div class="glass sparkc"><div class="between small"><b>Last ${n} ${per}s</b><span class="muted">avg ${money0(vals.reduce((p,q)=>p+q,0)/n)}</span></div>${sparkline(vals)}</div>` : ""; })()}
    <div class="panel" style="padding:14px;display:flex;flex-direction:column;gap:12px"><h2>Pay breakdown</h2>
      <div class="card lines num">
        <div class="line"><span>Base pay</span><span>${money(t.base)}</span></div>
        ${parts.map(([l,v])=>`<div class="line ind"><span>${esc(l)}</span><span class="g">${money(v)}</span></div>`).join("")}
        ${t.ot>0?`<div class="line ind"><span>Overtime (${hrs(t.otHours)})</span><span class="g">${money(t.ot)}</span></div>`:""}
        ${t.tips>0?`<div class="line"><span>Tips</span><span>${money(t.tips)}</span></div>`:""}
        <hr><div class="line b"><span>Gross pay</span><span>${money(gross(t))}</span></div>
        ${C.tax.on&&C.tax.income>0?ded.map(([n,v])=>`<div class="line"><span>${esc(n)}</span><span class="r">−${money(v)}</span></div>`).join("")+`<hr><div class="line b"><span>${C.label}</span><span>${money(shown)}</span></div>`:""}
      </div>
      <button class="btn ghost" data-act="copySummary" style="width:100%;background:var(--card)">${ico("copy","ico-sm")} Copy this ${per}'s summary</button>
      ${selfGross>0&&C.tax.on?`<div class="warn" style="margin:0">${ico("piggy-bank","ico-sm")}<span>Self-employed pay has no tax taken off. Put aside about <b>${money(selfGross*C.tax.rate)}</b> from this ${per} for your tax bill.</span></div>`:""}
      ${C.tax.on&&C.tax.income>0?`<div class="xs muted">Estimate for ${REGIONS[S.settings.region].title}, based on ${money0(C.tax.income)} a year. Your payslip or tax bill may differ.</div>`:""}
    </div>
    ${(()=>{ if(per !== "week") return ""; const rows = S.jobs.filter(j=>!j.archived).map(j => { const c = contractOn(j, a); if(!c || !(+c.hours)) return null; const h = C.total(inP.filter(s=>s.jobId===j.id && shiftType(s)!=="sick")).hours; return {j, c, h}; }).filter(Boolean);
      return rows.length ? `<div class="panel" style="padding:14px;display:flex;flex-direction:column;gap:10px"><h2>Contracted hours</h2>${rows.map(r => { const diff = r.h - r.c.hours; return `<div class="card" style="padding:12px;display:flex;flex-direction:column;gap:8px"><div class="between small"><span class="row" style="gap:8px;font-weight:600"><span style="color:${r.j.color}">${ico(r.j.icon,"ico-sm")}</span>${esc(r.j.name)}</span><b class="num">${hrs(r.h)} of ${hrs(r.c.hours)}</b></div><div class="progress"><i style="width:${Math.min(100, r.h/r.c.hours*100)}%;background:${r.j.color}"></i></div><span class="xs" style="color:${diff>0.01?"var(--green)":diff<-0.01?"var(--orange)":"var(--muted)"}">${Math.abs(diff)<0.01?"Exactly your contracted hours":diff>0?`${hrs(diff)} over your contract`:`${hrs(-diff)} under your contract`}</span></div>`; }).join("")}</div>` : ""; })()}
    ${jobsRows.length>1?`<div class="panel" style="padding:14px;display:flex;flex-direction:column;gap:10px"><h2>By job</h2>${jobsRows.map(r=>`<div class="card" style="padding:12px;display:flex;flex-direction:column;gap:8px">
      <div class="between small"><span class="row" style="gap:8px;font-weight:600"><span style="color:${r.j?r.j.color:"var(--muted)"}">${ico(r.j?r.j.icon:"briefcase","ico-sm")}</span>${esc(r.j?r.j.name:"Unassigned")}</span><b class="num">${money(r.v)}</b></div>
      <div class="progress"><i style="width:${r.v/sum*100}%;background:${r.j?r.j.color:"#888"}"></i></div><span class="xs muted">${hrs(r.h)}</span></div>`).join("")}</div>`:""}
  </div>`;
}

function shiftsView(C){
  const q = (UI.search || "").trim().toLowerCase();
  const allMatch = sorted().filter(s => (!UI.filterJob || s.jobId === UI.filterJob) && (!q || [((jobById(s.jobId)||{}).name||""), s.notes||"", dayMon(s.start), dmy(s.start), shiftType(s)].join(" ").toLowerCase().includes(q)));
  const today = startOfDay(Date.now()), sel = UI.dayStrip != null ? UI.dayStrip : today, cal = UI.shiftView === "calendar";
  const right = `<button class="iconbtn glassbtn ${UI.searchOpen||q?"on":""}" data-act="toggleSearch" aria-label="Search shifts">${ico("search")}</button><button class="iconbtn glassbtn" data-act="openRoster" aria-label="Weekly roster">${ico("calendar-days")}</button><button class="iconbtn inkbtn" data-act="newShift" aria-label="Add shift">${ico("plus")}</button>`;
  const head = `${topbarHTML(right)}
    <button class="mtitle" data-act="shiftView" data-v="${cal?"list":"calendar"}" aria-label="${new Date(cal ? UI.calMonth : sel).toLocaleDateString(undefined,{month:"long",year:"numeric"})}, ${cal?"show day by day":"show the whole month"}">${new Date(cal ? UI.calMonth : sel).toLocaleDateString(undefined,{month:"long",year:"numeric"})}<span class="${cal?"up":""}">${ico("chevron-down")}</span></button>`;
  const chips = S.jobs.length>1?`<div class="chips"><button class="fchip ${!UI.filterJob?"on":""}" data-act="filter" data-id=""><i style="background:currentColor"></i>All jobs</button>${S.jobs.map(j=>`<button class="fchip ${UI.filterJob===j.id?"on":""}" data-act="filter" data-id="${j.id}"><i style="background:${j.color}"></i>${esc(j.name)}</button>`).join("")}</div>`:"";
  const search = (UI.searchOpen || q) ? `<div class="search">${ico("search","ico-sm")}<input id="shift-search" type="search" placeholder="Search shifts, notes or dates" value="${esc(UI.search||"")}" autocomplete="off"></div>` : "";
  if(cal) return `<div class="stack shifts" style="gap:16px">${head}${chips}${calendarHTML(C, allMatch)}</div>`;
  if(q) return `<div class="stack shifts" style="gap:16px">${head}${search}${chips}
    ${allMatch.length ? `<p class="xs muted" style="margin:0">${allMatch.length} shift${allMatch.length===1?"":"s"} found</p><div class="list">${allMatch.slice(0,60).map(s=>shiftRow(s,C)).join("")}</div>` : `<p class="small muted" style="margin:0;text-align:center">No shifts match "${esc(UI.search)}".</p>`}</div>`;
  const has = new Set(allMatch.map(s => toD(s.start)));
  const days = []; for(let i = -21; i <= 42; i++) days.push(addDays(today, i));
  const strip = `<div class="dstrip" aria-label="Pick a day">${days.map(d => `<button class="dpill ${d===sel?"on":""} ${d===today?"today":""}" data-act="pickDay" data-v="${d}" aria-pressed="${d===sel}" title="${dayMon(d)}"><b>${new Date(d).getDate()}</b><span>${WDS[new Date(d).getDay()]}</span>${has.has(toD(d))?"<i></i>":""}</button>`).join("")}</div>`;
  const up = allMatch.filter(s => isFuture(s) && s.start >= sel && s.start < addDays(sel, 15)).sort((a,b)=>a.start-b.start);
  const doneAll = allMatch.filter(s => !isFuture(s) && s.start < addDays(sel, 1));
  const lim = UI.doneLimit || 15;
  const tab = UI.shiftTab || (up.length || sel >= today ? "up" : "done");
  const list = tab === "up" ? up : doneAll.slice(0, lim);
  const nextId = tab === "up" && up.length && sel <= today + DAY ? up[0].id : (tab === "up" && up.length ? up[0].id : null);
  const later = tab === "up" ? allMatch.filter(s => isFuture(s) && s.start >= addDays(sel, 15)).length : 0;
  const wk = weekStart(sel), wkShifts = allMatch.filter(s => s.start >= wk && s.start < addDays(wk, 7)), wt = C.total(wkShifts);
  const body = list.length ? `<div class="tline">${list.map((s,i) => tlItem(s, C, s.id === nextId, i === 0 || toD(list[i-1].start) !== toD(s.start)).replace('<div class="tl-row', `<div style="--k:${Math.min(i,8)}" class="tl-row`)).join("")}</div>
      ${tab === "done" && doneAll.length > lim ? `<button class="btn ghost more" data-act="doneMore">Show older shifts</button>` : ""}
      ${later ? `<button class="paycard" data-act="openCalendar"><div class="tile" style="color:var(--blue)">${ico("calendar-range")}</div><div><b>${later} more planned shift${later===1?"":"s"}</b><div class="small muted">Further ahead · see the whole month</div></div><span class="amt">${ico("chevron-right","ico-sm")}</span></button>` : ""}`
    : tab === "up" ? empty("calendar-days", "Nothing planned", sel > today ? "No shifts from this day on. Add one, or set your usual week and ClockMe fills them in." : "No shifts coming up. Add one, or set your usual week and ClockMe fills them in.", S.jobs.length ? "newShift" : "newJob", S.jobs.length ? "Add shift" : "Add job")
    : empty("clock", "No shifts worked yet", "Shifts you've worked show here with what each one paid.", S.jobs.length ? "newShift" : "newJob", S.jobs.length ? "Add shift" : "Add job");
  return `<div class="stack shifts" style="gap:16px">${head}${strip}${search}
    <div class="tlwrap"><div class="ftabs"><button class="${tab==="up"?"on":""}" data-act="shiftTab" data-v="up">Upcoming (${up.length})</button><button class="${tab==="done"?"on":""}" data-act="shiftTab" data-v="done">Completed (${doneAll.length})</button></div>
      <div class="tlbody ${UI.tlAnim?"anim":""}">${chips}<div class="tlsum"><span>Week of ${dm(wk)} · ${wkShifts.length} shift${wkShifts.length===1?"":"s"} · ${hrs(wt.hours)} · <b class="num">${money0(C.shown(gross(wt)))}</b></span><span class="row" style="gap:6px;flex:none">${selfJobs().length?`<button data-act="newInvoice">Invoice</button>`:""}<button data-act="openWeek" data-ws="${wk}">Edit week</button></span></div>${body}</div></div>
  </div>`;
}
function calendarHTML(C, list){
  const m = new Date(UI.calMonth), y = m.getFullYear(), mo = m.getMonth();
  const first = new Date(y, mo, 1).getTime(), next = new Date(y, mo+1, 1).getTime(), days = new Date(y, mo+1, 0).getDate();
  const lead = (new Date(first).getDay() - S.settings.weekStart + 7) % 7;
  const byDay = {};
  for(const s of list){ const k = toD(s.start); (byDay[k] = byDay[k] || []).push(s); }
  const inMonth = list.filter(s => s.start >= first && s.start < next);
  const worked = inMonth.filter(s => !isFuture(s)), booked = inMonth.filter(isFuture);
  const tw = C.total(worked), tb = C.total(booked), today = toD(Date.now());
  const sel = UI.calDay && UI.calDay >= toD(first) && UI.calDay < toD(next) ? UI.calDay : null;
  const R = S.roster, hasRoster = R.on && R.entries.some(e => jobById(e.jobId));
  const cells = [];
  for(let i=0;i<lead;i++) cells.push(`<span></span>`);
  for(let d=1; d<=days; d++){
    const k = toD(new Date(y, mo, d).getTime()), ss = (byDay[k] || []).sort((a,b)=>a.start-b.start);
    const amt = ss.length ? C.shown(gross(C.total(ss))) : 0;
    const types = ss.map(shiftType);
    const dots = [...new Set(ss.map(s => shiftType(s)==="holiday" ? "var(--blue)" : shiftType(s)==="sick" ? "var(--orange)" : (jobById(s.jobId)||{}).color || "#888"))].slice(0,3);
    const label = types.includes("holiday") ? "Hol" : types.includes("sick") && types.every(t=>t==="sick") ? "Sick" : amt > 0 ? money0(amt) : "";
    const time = ss.length === 1 && types[0] === "work" ? toT(ss[0].start).replace(/^0/,"") : ss.length > 1 ? `${ss.length} shifts` : "";
    const dms = fromD(k);
    const mark = S.jobs.filter(j=>!j.archived).flatMap(j => contractsOf(j).flatMap(c => [startOfDay(c.start)===dms ? ["start", j] : null, c.end && startOfDay(c.end)===dms ? ["end", j] : null]).filter(Boolean))[0];
    const outside = S.jobs.filter(j=>!j.archived && (j.contracts||[]).length).length && S.jobs.filter(j=>!j.archived && (j.contracts||[]).length).every(j => !covered(j, dms));
    cells.push(`<button class="cday ${k===today?"today":""} ${k===sel?"sel":""} ${ss.length&&ss.every(isFuture)?"fut":""} ${ss.length?"has":""} ${outside?"off":""} ${ss.length && (ss.some(x=>x.weekEdit) || weekLocked(weekStart(dms))) ?"wkedit":""}" ${mark?`title="${mark[0]==="start"?"Contract starts":"Contract ends"}: ${esc(mark[1].name)}"`:""} data-act="calDay" data-v="${k}" aria-label="${dmy(new Date(y,mo,d).getTime())}${ss.length?`, ${ss.length} shift${ss.length===1?"":"s"}`:", day off"}">
      ${mark?`<span class="cmark ${mark[0]}" style="--c:${mark[1].color}">${mark[0]==="start"?"Start":"End"}</span>`:""}<b>${d}</b>${dots.length?`<span class="cdots">${dots.map(c=>`<i style="background:${c}"></i>`).join("")}</span>`:""}${time?`<span class="ctime">${time}</span>`:""}${label?`<span class="camt">${label}</span>`:""}</button>`);
  }
  const order = [0,1,2,3,4,5,6].map(i => (S.settings.weekStart + i) % 7);
  const selShifts = sel ? (byDay[sel] || []).sort((a,b)=>a.start-b.start) : [];
  // What the roster could still add to this month
  let banner = "";
  if(!hasRoster && S.jobs.length) banner = `<button class="paycard" data-act="openRoster"><div class="tile" style="color:var(--blue)">${ico("calendar-plus")}</div><div><b>Fill this calendar</b><div class="small muted">Set your usual week and every shift is added for you</div></div><span class="amt">${ico("chevron-right","ico-sm")}</span></button>`;
  else if(hasRoster && first >= rosterHorizon()) banner = `<button class="paycard" data-act="planMonth" data-v="${first}"><div class="tile" style="color:var(--blue)">${ico("calendar-plus")}</div><div><b>Plan ${new Date(first).toLocaleDateString(undefined,{month:"long"})}</b><div class="small muted">Add your usual week to this month</div></div><span class="amt">${ico("chevron-right","ico-sm")}</span></button>`;
  else if(hasRoster && first === monthStart(Date.now()) && (R.since || 0) > first && Date.now() > first + DAY) banner = `<button class="paycard" data-act="backfillMonth"><div class="tile" style="color:var(--green)">${ico("history")}</div><div><b>Add earlier shifts this month</b><div class="small muted">Fill ${dm(first)} – ${dm(Math.min(R.since, Date.now()))} from your usual week</div></div><span class="amt">${ico("chevron-right","ico-sm")}</span></button>`;
  const jobsIn = [...new Set(inMonth.filter(s=>shiftType(s)==="work").map(s=>s.jobId))].map(jobById).filter(Boolean);
  return `<div class="panel" style="padding:12px">
      <div class="navper" style="margin-bottom:10px"><button class="round" data-act="calPrev" aria-label="Previous month" style="background:var(--card)">${ico("chevron-left","ico-sm")}</button>
        <div style="text-align:center"><b style="font-size:16px">${new Date(first).toLocaleDateString(undefined,{month:"long",year:"numeric"})}</b>${first!==monthStart(Date.now())?`<br><button class="xs muted" data-act="calToday" style="font-weight:600">Back to this month</button>`:""}</div>
        <button class="round" data-act="calNext" aria-label="Next month" style="background:var(--card)">${ico("chevron-right","ico-sm")}</button></div>
      <div class="cal">${order.map(i=>`<span class="cwd">${WDS[i].slice(0,2)}</span>`).join("")}${cells.join("")}</div>
      ${jobsIn.length>1 || inMonth.some(s=>shiftType(s)!=="work") ? `<div class="legend">${jobsIn.map(j=>`<span><i style="background:${j.color}"></i>${esc(j.name)}</span>`).join("")}${inMonth.some(s=>shiftType(s)==="holiday")?`<span><i style="background:var(--blue)"></i>Holiday</span>`:""}${inMonth.some(s=>shiftType(s)==="sick")?`<span><i style="background:var(--orange)"></i>Sick</span>`:""}<span><i class="dash"></i>Booked</span></div>` : ""}
      ${inMonth.some(x => x.weekEdit) || (S.roster.locked||[]).some(k => fromD(k) >= addDays(first,-6) && fromD(k) < next) ? `<div class="legend" style="margin-top:6px"><span><i style="background:var(--blue)"></i>Week changed just for that week</span></div>` : ""}
    </div>
    <div class="stats">
      <div class="stat"><b class="num">${money0(C.shown(gross(tw)))}</b><span>Earned</span></div>
      <div class="stat"><b class="num">${money0(C.shown(gross(tb)))}</b><span>Still to come</span></div>
      <div class="stat"><b class="num">${hrs(tw.hours + tb.hours)}</b><span>${inMonth.length} shift${inMonth.length===1?"":"s"}</span></div>
    </div>
    ${banner}
    ${sel ? `<section class="stack" style="gap:10px">${(()=>{ const notes = S.jobs.filter(j=>!j.archived).flatMap(j => contractsOf(j).flatMap(c => [startOfDay(c.start)===fromD(sel)?`${esc(j.name)}: contract starts (${esc(CONTRACT_TYPES[c.type]||"contract")})`:null, c.end && startOfDay(c.end)===fromD(sel)?`${esc(j.name)}: last day of contract`:null]).filter(Boolean)); return notes.length?`<div class="warn" style="margin:0;background:var(--panel);color:var(--text)">${ico("file-pen-line","ico-sm")}<span>${notes.join("<br>")}</span></div>`:""; })()}<div class="between"><b style="font-size:15px">${dayMon(fromD(sel))}</b><div class="row" style="gap:14px">${selShifts.length?"":`<button class="link" style="color:var(--blue);font-weight:600" data-act="holOnDay" data-v="${sel}">${ico("tree-palm","ico-sm")} Holiday</button>`}<button class="link" style="color:var(--green);font-weight:600" data-act="addOnDay" data-v="${sel}">${ico("plus","ico-sm")} Add shift</button></div></div>
      ${selShifts.length ? `<div class="list">${selShifts.map(s=>shiftRow(s,C)).join("")}</div><p class="xs muted" style="margin:0">Tap a shift to change its times, swap it for holiday, or delete it if you're not working.</p>` : `<p class="small muted" style="margin:0">Day off. Add a shift if you're working.</p>`}</section>`
      : `<p class="xs muted" style="text-align:center;margin:0">Tap a day to see, add or change shifts.</p>`}
    <div class="qa"><button data-act="openWeek" data-ws="${sel ? fromD(sel) : (first <= Date.now() && Date.now() < next ? Date.now() : first)}"><span class="tile" style="color:var(--blue)">${ico("calendar-cog","ico-sm")}</span>Edit ${sel ? "this" : "a"} week</button><button data-act="openRoster"><span class="tile" style="color:var(--ink)">${ico("calendar-days","ico-sm")}</span>Edit usual week</button></div>`;
}
function profileView(C){
  const st = S.settings, life = C.total(S.shifts.filter(s=>!isFuture(s)));
  const item = (icon, t, d, act, extra="") => `<button class="item" data-act="${act}" ${extra}><span class="sq">${ico(icon)}</span><span class="t">${t}</span><span class="d">${d}</span>${ico("chevron-right","ico-sm")}</button>`;
  const pd = paydays();
  return `<div class="stack" style="gap:18px">
    ${topbarHTML(`<button class="iconbtn glassbtn" data-act="help" aria-label="Help">${ico("circle-help")}</button>`)}
    <h1 class="bigt">Profile</h1>
    <div class="panel" style="padding:16px;display:flex;flex-direction:column;gap:12px"><div class="row">${avatarEdit(56)}
      <div style="flex:1;min-width:0"><b style="font-size:18px">${esc(st.name||"Your name")}</b><div class="small muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(st.email || "No email added")}</div><div class="xs muted">${REGIONS[st.region].flag} ${REGIONS[st.region].title} · ${cur()} · ${WORKTYPES[st.workType][0]}</div></div>
      <button class="link" data-act="editName" style="font-weight:600">Edit</button></div>
      <div class="row xs" style="gap:6px;color:${UI.me?"var(--green)":"var(--muted)"}">${ico(UI.me?"shield-check":"cloud-off","ico-sm")}<span>${UI.me?`Synced to your account${UI.me.email?` · ${esc(UI.me.email)}`:""}`:"Not signed in · saved on this device only"}</span></div></div>
    <div class="stats">
      <div class="stat"><b class="num">${money0(C.shown(gross(life)))}</b><span>All-time ${C.tax.on&&C.tax.income>0?"take-home":"gross"}</span></div>
      <div class="stat"><b class="num">${hrs(life.hours)}</b><span>Hours</span></div>
      <div class="stat"><b class="num">${S.shifts.filter(s=>!isFuture(s)).length}</b><span>Shifts</span></div></div>
    <div><div class="glabel">Work</div><div class="group">
      ${item("briefcase","Jobs & pay rules",S.jobs.length,"push",'data-page="jobs"')}
      ${item("calendar-days","Weekly roster",S.roster.on?`${S.roster.entries.length} shift${S.roster.entries.length===1?"":"s"} a week`:"Off","openRoster")}
      ${item("scan-line","Scan or paste a rota","","openImport")}
      ${item("flag","Goals",S.goals.length,"push",'data-page="goals"')}</div></div>
    ${billingOn()?`<div><div class="glabel">ClockMe Pro</div><div class="group">
      <button class="item pro-row" data-act="openProSheet"><span class="sq">${ico("sparkles")}</span><span class="t">${isPro()&&proSub()?"ClockMe Pro":"Try ClockMe Pro"}</span><span class="d">${esc(proStatusText())}</span>${ico("chevron-right","ico-sm")}</button></div></div>`:""}
    <div><div class="glabel">Account & privacy</div><div class="group">
      ${item("user-round","Your details",esc(st.email||"Add email"),"editName")}
      ${item("lock","Passcode lock",st.pinOn?"On":"Off","pinMenu")}
      ${statsAvailable()?`<div class="item"><span class="sq">${ico("chart-pie")}</span><span class="t">Share anonymous usage <span class="xs muted">(never pay or names)</span></span>${toggleHTML("tg-stats",'data-stats="1"',statsChoice()==="yes")}</div>`:""}
      <div class="item" style="flex-direction:column;align-items:stretch;padding:10px 0"><div class="row"><span class="sq">${ico("scale")}</span><span class="t">Age group <span class="xs muted">(minimum wage check)</span></span></div>
        <div class="chips" style="margin:8px 0 0;padding:0;flex-wrap:wrap">${AGE_BANDS.map(([k,l])=>`<button class="fchip ${(st.ageBand||"21+")===k?"on":""}" data-act="setAge" data-v="${k}">${l}</button>`).join("")}</div></div></div></div>
    <div><div class="glabel">Getting paid</div><div class="group">
      ${item("wallet","Pay schedule",pd?`${FREQS[st.payFreq][0]}`:"Not set","openPay")}
      ${item("file-check","Payslip checks",S.payslips.length||"","push",'data-page="payslips"')}
      ${item("receipt","Invoices",S.invoices.length,"push",'data-page="invoices"')}
      ${item("building","Business & bank details",S.business.name?esc(S.business.name):"Not set","openBusiness")}</div></div>
    <div><div class="glabel">Pay & tax</div><div class="group">${item("landmark","Country & tax",REGIONS[st.region].title,"push",'data-page="tax"')}
      <div class="item"><span class="sq">${ico("eye")}</span><span class="t">Show take-home pay</span>${toggleHTML("tg-take",'data-set="showTakeHome"',st.showTakeHome)}</div></div></div>
    <div><div class="glabel">App</div><div class="group">
      <div class="item"><span class="sq">${ico("calendar")}</span><span class="t">Week starts on</span>${sel("sel-week",'data-set="weekStart" data-num="1" style="font:inherit;color:var(--text);background:transparent;border:0"',[[1,"Monday"],[0,"Sunday"],[6,"Saturday"]],st.weekStart)}</div>
      <div class="item" style="flex-direction:column;align-items:stretch;gap:0;padding-top:10px"><div class="row"><span class="sq">${ico("palette")}</span><span class="t">Theme</span><span class="d">${THEMES.find(t=>t[0]===st.appearance)[1]}</span></div>${swatchesHTML(st.appearance)}</div>
      <button class="item" data-act="export"><span class="sq">${ico("download")}</span><span class="t">Export all shifts (CSV)</span><span class="d"></span></button>
      <button class="item" data-act="backup"><span class="sq">${ico("hard-drive-download")}</span><span class="t">Back up my data</span><span class="d"></span></button>
      <label class="item" for="restore-file" style="cursor:pointer"><span class="sq">${ico("archive-restore")}</span><span class="t">Restore from a backup</span><span class="d"></span><input type="file" id="restore-file" accept="application/json,.json" hidden></label>
      <button class="item" data-act="help"><span class="sq">${ico("circle-help")}</span><span class="t">How ClockMe works</span><span class="d"></span></button>
      <button class="item" data-act="rerunSetup"><span class="sq">${ico("rotate-ccw")}</span><span class="t">Run setup again</span><span class="d"></span></button></div></div>
    ${UI.syncErr==="readonly"?`<div class="warn" style="margin:0">${ico("lock","ico-sm")}<span>You can use ClockMe but can't save to your account yet. Ask the person who shared it to give you edit access. Until then your data stays on this device.</span></div>`:""}
    <button class="danger" data-act="wipe" style="background:transparent;border:0;padding:6px">Delete all my data</button>
    <p class="xs muted" style="margin:0 4px;text-align:center">ClockMe 1.0 · ${UI.sync==="account"?"Saved to your account, so it follows you to your other devices.":"Saved on this device."}<br>Tax figures are estimates to help you plan. Your payslip or tax bill is the final word.</p>
  </div>`;
}

function phead(title, right=""){ return `<div class="phead"><button class="iconbtn" data-act="back" aria-label="Back">${ico("chevron-left")}</button><b>${title}</b><div>${right}</div></div>`; }

function goalsPage(C){
  return `<div class="stack" style="gap:14px">${phead("Goals",`<button class="iconbtn" data-act="newGoal" aria-label="Add goal">${ico("plus")}</button>`)}
    ${S.goals.length?S.goals.map(g=>goalCard(g, C.shown(gross(C.total(goalShifts(g)))))).join(""):empty("flag","No goals yet","Add something you're working towards.","newGoal","Add goal")}</div>`;
}
function jobsPage(){
  return `<div class="stack" style="gap:14px">${phead("Jobs",`<button class="iconbtn" data-act="newJob" aria-label="Add job">${ico("plus")}</button>`)}
    ${S.jobs.length?S.jobs.map(j=>{ const tags = [];
      if(belowMin(j)) tags.push(`Below minimum wage`);
      { const cs = contractStatus(j); if(cs) tags.push(cs.label); const cur = contractOn(j, Date.now()); if(cur && +cur.hours) tags.push(`${cur.hours}h / week contracted`); }
      if(j.selfEmployed) tags.push(`Self-employed${j.client&&j.client.name?` · bills ${esc(j.client.name)}`:""}`);
      j.weekday.forEach((p,i)=>{ if(+p) tags.push(`${WDS[i]} ${spct(+p)}`); });
      if(j.nightOn && +j.nightPct) tags.push(`Nights ${spct(+j.nightPct)}`);
      if(j.otOn) tags.push(`OT ${j.otMult}× after ${j.otAfter}h a ${j.otPer==="day"?"day":"week"}`);
      if(j.holiday==="rolled") tags.push(`Holiday pay +${+j.holidayPct}%`);
      if(j.holiday==="accrue"){ const hb = holidayBalance(j, lastC || context()); tags.push(`Holiday left ${hrs(Math.max(0,hb.left))}`); }
      if((j.special||[]).length) tags.push(`${j.special.length} special day${j.special.length===1?"":"s"}`);
      return `<button class="panel goal" data-act="editJob" data-id="${j.id}" style="${j.archived?"opacity:.6":""}">
        <div class="row" style="width:100%"><div class="tile" style="color:${j.color}">${ico(j.icon)}</div><div style="flex:1;min-width:0"><b style="font-size:16px">${esc(j.name)}</b><div class="small muted">${money(+j.rate)} / hour${j.archived?" · Archived":""}</div></div><span class="chev">${ico("chevron-right","ico-sm")}</span></div>
        ${tags.length?`<div class="chips wrap" style="margin:0;padding:0">${tags.map(t=>`<span class="fchip xs" style="background:var(--green-soft);color:var(--green);padding:5px 10px">${t}</span>`).join("")}</div>`:""}</button>`; }).join("")
      :empty("briefcase","No jobs yet","Add where you work and how you're paid.","newJob","Add job")}</div>`;
}
function goalPage(C, id){
  const g = S.goals.find(x=>x.id===id); if(!g){ UI.stack.pop(); return mainView(C); }
  const list = goalShifts(g).sort((a,b)=>b.start-a.start);
  const earned = C.shown(gross(C.total(list)));
  const pr = g.target > 0 ? earned/g.target : 0;
  const now = new Date(), thisM = new Date(now.getFullYear(), now.getMonth(), 1);
  const gm = new Date(new Date(g.start).getFullYear(), new Date(g.start).getMonth(), 1);
  const since = Math.max(0, (thisM.getFullYear()-gm.getFullYear())*12 + thisM.getMonth()-gm.getMonth());
  const n = Math.min(6, Math.max(1, since+1));
  const bars = [];
  for(let i=0;i<n;i++){ const s = new Date(thisM.getFullYear(), thisM.getMonth()-(n-1-i), 1).getTime(), e = new Date(thisM.getFullYear(), thisM.getMonth()-(n-2-i), 1).getTime();
    bars.push({l:new Date(s).toLocaleDateString(undefined,{month:"short"}).slice(0,3), v:C.shown(gross(C.total(list.filter(x=>x.start>=s && x.start<e))))}); }
  const avg = bars.reduce((a,b)=>a+b.v,0)/bars.length;
  const lastS = new Date(thisM.getFullYear(), thisM.getMonth()-1, 1).getTime();
  const lastCut = lastS + (Date.now() - thisM.getTime());
  const a1 = gross(C.total(list.filter(x=>x.start>=thisM.getTime()))), b1 = gross(C.total(list.filter(x=>x.start>=lastS && x.start<Math.min(thisM.getTime(), lastCut))));
  const change = b1 > 0 ? (a1-b1)/b1*100 : null;
  const left = daysLeft(g);
  return `<div class="stack" style="gap:18px;padding-bottom:20px">${phead("Goal detail",`<button class="iconbtn" data-act="goalMenu" data-id="${g.id}" aria-label="Goal options">${ico("ellipsis-vertical")}</button>`)}
    <div class="between" style="align-items:flex-start"><div class="ring" style="--p:${Math.min(1,pr)};--c:${g.color}"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" class="ring-track"/><circle cx="32" cy="32" r="28" class="ring-bar" pathLength="100" style="stroke-dashoffset:${100-Math.min(1,pr)*100}"/></svg><span style="color:${g.color}">${ico(g.icon)}</span></div>${change!=null?`<div style="text-align:right">${delta(change)}<div class="small muted" style="margin-top:6px">vs this time last month</div></div>`:""}</div>
    <div><h1 style="font-size:28px">${esc(g.title)}</h1>${g.subtitle?`<div class="muted" style="font-size:16px;margin-top:4px">${esc(g.subtitle)}</div>`:""}</div>
    <div class="panel" style="display:flex;flex-direction:column;gap:12px">
      <div style="padding:4px 4px 0;display:flex;flex-direction:column;gap:10px">
        <div class="between num" style="font-size:18px"><b style="font-weight:600">${money0(earned)}</b><span class="muted">${money0(g.target)}</span></div>
        <div class="progress"><i style="width:${Math.min(100,pr*100)}%;background:${g.color}${pr<=0?";min-width:0":""}"></i></div>
        <div class="between" style="font-size:14px"><span>${pr>=1?`<b style="color:var(--green)">Goal reached</b>`:daysText(g)}</span><span>${pct(Math.min(pr,9.99)*100)}</span></div>
        ${left>0 && g.target>earned?`<div class="xs muted">Earn about ${money0((g.target-earned)/Math.max(1,left/7))} a week to hit it on time</div>`:""}
      </div>
      <div class="card" style="padding:16px"><h2 style="font-weight:500">Earnings analytics</h2><div class="small" style="margin:4px 0 14px"><span class="muted">Average per month</span> <b>${money0(avg)}</b></div>${chart(bars, money0, bars.length-1)}</div>
    </div>
    <h2>Shifts</h2>
    ${list.length?`<div class="list">${list.slice(0,30).map(s=>shiftRow(s,C)).join("")}</div>`:empty("clock","Nothing yet",`Shifts worked from ${dmy(g.start)} count towards this goal.`)}
  </div>
  <div class="bottomcta"><button class="btn big" data-act="newShift">${ico("plus")} Add shift</button></div>`;
}
function taxPage(C){
  const st = S.settings, r = st.region;
  const tg = (key, label) => `<div class="f"><span>${label}</span>${toggleHTML("t-"+key,`data-set="${key}"`,st[key])}</div>`;
  const num = (key, label, unit, pre="") => `<div class="f"><span>${label}</span>${pre?`<span class="unit">${pre}</span>`:""}<input type="text" inputmode="decimal" autocomplete="off" id="n-${key}" data-set="${key}" data-num="1" value="${st[key]}" step="any"><span class="unit">${unit}</span></div>`;
  let region = "";
  if(r==="uk"||r==="scotland") region = `<div class="fgroup"><div class="f"><span>Student loan</span>${sel("s-loan",'data-set="loan"',Object.entries(LOANS).map(([k,v])=>[k,v[0]]),st.loan)}</div>${tg("postgrad","Postgraduate loan")}</div>`;
  else if(r==="us") region = `<div class="fgroup"><div class="f"><span>Filing status</span>${sel("s-filing",'data-set="filing"',[["single","Single"],["married","Married filing jointly"]],st.filing)}</div>${num("statePct","State & local tax","%")}</div>`;
  else if(r==="custom") region = `<div class="fgroup">${num("customPct","Tax rate","%")}</div>`;
  else region = `<div class="fgroup"><div class="f"><span class="muted">Single person, standard credits</span></div></div>`;
  const tax = C.tax;
  return `<div class="stack" style="gap:18px">${phead("Country & tax")}
    <div class="fsec"><label class="h">Where & how you work</label><div class="fgroup"><div class="f"><span>Country</span>${sel("s-region",'data-set="region"',Object.entries(REGIONS).map(([k,v])=>[k,`${v.flag} ${v.title}`]),r)}</div>
      ${r==="custom"?`<div class="f"><span>Currency</span>${sel("s-cur",'data-set="customCur"',CURRENCIES.map(c=>[c,c]),st.customCur)}</div>`:""}
      <div class="f"><span>Work type</span>${sel("s-wt",'data-set="workType"',Object.entries(WORKTYPES).map(([k,v])=>[k,v[0]]),st.workType)}</div></div>
      <div class="foot">Mark self-employed jobs inside each job. Their tax is worked out as self-employed.</div></div>
    <div class="fsec"><div class="seg"><button class="${st.showTakeHome?"on":""}" data-act="setTake" data-v="1">Take-home</button><button class="${!st.showTakeHome?"on":""}" data-act="setTake" data-v="0">Gross only</button></div>
      <div class="foot">${st.showTakeHome?"We estimate tax and show what you keep.":"No tax maths. You'll just see what you earned before deductions."}</div></div>
    ${st.showTakeHome?`
      <div class="fsec"><label class="h">${REGIONS[r].title}</label>${region}<div class="foot">${REGIONS[r].note}</div></div>
      <div class="fsec"><label class="h">Pension</label><div class="fgroup">${num("pensionPct","Pension","% of pay")}</div><div class="foot">Treated as taken before tax (salary sacrifice or 401(k) style).</div></div>
      <div class="fsec"><label class="h">Tax band</label><div class="fgroup">${tg("fixedOn","Set my yearly income")}${st.fixedOn?num("fixedIncome","Yearly income","",curSymbol()):""}</div><div class="foot">Tax depends on what you earn across the year. By default we project it from your last 8 weeks of shifts.</div></div>
      <div class="fsec"><label class="h">Your estimate</label><div class="card lines num">${tax.income<=0?`<span class="muted small">Log a few shifts, or set your yearly income, to see your estimate.</span>`:
        `<div class="line"><span>Yearly income</span><span>${money0(tax.income)}</span></div>${tax.lines.map(([n,v])=>`<div class="line"><span>${esc(n)}</span><span>${money0(v)} <span class="muted xs">${pct(v/tax.income*100)}</span></span></div>`).join("")}<hr><div class="line b"><span>You keep</span><span style="color:var(--green)!important">${pct((1-tax.rate)*100)}</span></div>`}</div></div>`:""}
  </div>`;
}
function invoicesPage(){
  const list = [...S.invoices].sort((a,b)=>b.issue-a.issue || b.createdAt-a.createdAt);
  const unpaid = list.filter(i=>i.status!=="paid"), yr = new Date().getFullYear();
  const owed = unpaid.reduce((a,i)=>a+i.total,0);
  const paidYr = list.filter(i=>i.status==="paid" && new Date(i.paidAt||i.issue).getFullYear()===yr).reduce((a,i)=>a+i.total,0);
  return `<div class="stack" style="gap:14px">${phead("Invoices",`<button class="iconbtn" data-act="newInvoice" aria-label="New invoice">${ico("plus")}</button>`)}
    <div class="darkcard"><div class="between"><span style="font-size:13px;color:rgba(255,255,255,.6)">Owed to you</span><span class="st ${unpaid.some(i=>invStatus(i)==="overdue")?"overdue":"paid"}">${unpaid.filter(i=>invStatus(i)==="overdue").length} overdue</span></div>
      <div class="amount" style="font-size:34px" data-count="${owed}" data-ckey="owed">${amountHTML(money(owed))}</div>
      <div class="mini"><div><b>${unpaid.length}</b><span>Unpaid</span></div><div><b>${money0(paidYr)}</b><span>Paid in ${yr}</span></div><div><b>${list.length}</b><span>Invoices</span></div></div></div>
    ${!selfJobs().length?`<div class="warn">${ico("info","ico-sm")}<span>Invoices are made from self-employed jobs. Turn on "Self-employed" in a job, then add who you bill.</span></div>`:""}
    ${!S.business.name?`<button class="paycard" data-act="openBusiness"><div class="tile">${ico("building")}</div><div><b>Add your business & bank details</b><div class="small muted">They go on every invoice</div></div><span class="amt">${ico("chevron-right","ico-sm")}</span></button>`:""}
    ${list.length?`<div class="list">${list.map(i=>{ const s = invStatus(i); return `<button class="inv-row" data-act="openInvoice" data-id="${i.id}"><div class="mid"><b>${esc(i.number)} · ${esc(i.client.name)}</b><span>${dm(i.from)} – ${dm(i.to)} · due ${dm(i.due)}</span></div><div class="right"><b>${moneyC(i.total,i.currency)}</b><span class="st ${s}">${ST_LABEL[s]}</span></div></button>`; }).join("")}</div>`
      : empty("receipt","No invoices yet","Pick a client and a period. Your shifts become the invoice lines, premiums included.",selfJobs().length?"newInvoice":"push",selfJobs().length?"Create invoice":"Set up a job")}
  </div>`;
}
function invoicePage(id){
  const inv = S.invoices.find(i=>i.id===id); if(!inv){ UI.stack.pop(); return mainView(lastC||context()); }
  const s = invStatus(inv);
  return `<div class="stack" style="gap:14px;padding-bottom:20px">${phead(esc(inv.number),`<button class="iconbtn" data-act="invMenu" data-id="${inv.id}" aria-label="Invoice options">${ico("ellipsis-vertical")}</button>`)}
    <div class="between"><div><b style="font-size:22px" class="num">${moneyC(inv.total, inv.currency)}</b><div class="small muted">${esc(inv.client.name)} · due ${dmy(inv.due)}</div></div><span class="st ${s}">${ST_LABEL[s]}</span></div>
    <div class="seg">${["draft","sent","paid"].map(k=>`<button class="${inv.status===k?"on":""}" data-act="invStatus" data-id="${inv.id}" data-v="${k}">${ST_LABEL[k]}</button>`).join("")}</div>
    ${paperHTML(inv)}
  </div>
  <div class="bottomcta" style="display:grid;grid-template-columns:1fr auto;gap:8px"><button class="btn big" data-act="invPDF" data-id="${inv.id}">${ico("download")} Download PDF</button><button class="btn big ghost" style="width:58px;padding:0" data-act="invCopy" data-id="${inv.id}" aria-label="Copy as text">${ico("copy")}</button></div>`;
}
function mainView(C){
  const top = UI.stack[UI.stack.length-1];
  if(top){
    if(top.page==="goals") return goalsPage(C);
    if(top.page==="jobs") return jobsPage();
    if(top.page==="goal") return goalPage(C, top.id);
    if(top.page==="tax") return taxPage(C);
    if(top.page==="invoices") return invoicesPage();
    if(top.page==="invoice") return invoicePage(top.id);
    if(top.page==="payslips") return payslipsPage();
  }
  if(UI.tab==="insights") return insightsView(C);
  if(UI.tab==="shifts") return shiftsView(C);
  if(UI.tab==="profile") return profileView(C);
  return homeView(C);
}

/* ============ Sheets ============ */
function fRow(label, inner){ return `<div class="f"><span>${label}</span>${inner}</div>`; }
function shiftSheet(){
  const d = UI.sheet.data, j = jobById(d.jobId);
  const end = resolvedEnd(d);
  const overnight = toD(end) !== toD(d.start);
  const rec = d.id ? S.shifts.find(s=>s.id===d.id) : null;
  return `<div class="sheet-b">
    ${rec && rec.rosterKey ? `<div class="warn" style="background:var(--panel);color:var(--muted);margin:0">${ico("calendar-days","ico-sm")}<span>Added from your weekly roster. Changes here only affect this shift.</span></div>`:""}
    ${rec && rec.invoiceId ? `<div class="warn" style="margin:0">${ico("receipt","ico-sm")}<span>This shift is on an invoice. Edits won't change the saved invoice.</span></div>`:""}
    <div class="seg">${[["work","Work"],["holiday","Holiday"],["sick","Sick"]].map(([k,l])=>`<button class="${(d.type||"work")===k?"on":""}" data-act="shiftType" data-v="${k}">${l}</button>`).join("")}</div>
    <div class="fsec">${activeJobs().length || j ? `<div class="fgroup">${fRow("Job",sel("sh-job",'data-bind="jobId"',S.jobs.filter(x=>!x.archived||x.id===d.jobId).map(x=>[x.id,x.name]),d.jobId))}</div>`:`<button class="btn" data-act="newJob">Add a job first</button>`}</div>
    ${!d.id && (d.type||"work")==="work" && quickTimes(d.jobId).length ? `<div class="fsec"><label class="h">Your usual times</label><div class="chips" style="margin:0;padding:0;flex-wrap:wrap">${quickTimes(d.jobId).map(q=>`<button class="fchip" data-act="quickTime" data-v="${q}">${ico("clock","ico-sm")} ${q.replace("–"," – ")}</button>`).join("")}</div></div>`:""}
    <div class="fsec"><label class="h">Time</label><div class="fgroup">
      ${fRow("Start",`<input type="datetime-local" id="sh-start" data-bind="start" data-type="dt" value="${toDT(d.start)}">`)}
      ${fRow("End",`<input type="time" id="sh-end" data-bind="endTime" value="${d.endTime}">`)}
      ${fRow("Unpaid break",`<input type="text" inputmode="numeric" autocomplete="off" id="sh-break" data-bind="breakMin" data-type="num" value="${d.breakMin}" min="0" step="5"><span class="unit">min</span>`)}
    </div><div class="foot" id="sh-over">${overnight?`Overnight: ends ${dayMon(end)} at ${tm(end)}. Hours after midnight use that day's rate.`:""}</div></div>
    <div class="fsec"><label class="h">Pay</label><div class="fgroup">
      ${d.type==="sick"?`<div class="f"><span>My employer pays sick pay</span>${toggleHTML("sh-paidsick",'data-bind="paidSick" data-type="bool" data-rerender="1"',d.paidSick)}</div>`:""}
      ${d.type!=="sick"||d.paidSick?fRow(d.type==="holiday"?"Holiday pay rate":"Hourly rate",`<span class="unit">${curSymbol()}</span><input type="text" inputmode="decimal" autocomplete="off" id="sh-rate" data-bind="rate" data-type="num" value="${d.rate}" step="any">`):""}
      ${(d.type||"work")!=="work"?"":`${fRow("Extra for this shift",`<input type="text" inputmode="decimal" autocomplete="off" id="sh-extra" data-bind="extraPct" data-type="num" value="${d.extraPct||""}" placeholder="0" step="any" class="pct"><span class="unit">%</span>`)}
      ${fRow("Tips",`<span class="unit">${curSymbol()}</span><input type="text" inputmode="decimal" autocomplete="off" id="sh-tips" data-bind="tips" data-type="num" value="${d.tips||""}" placeholder="0.00" step="any">`)}`}
    </div><div class="foot">${d.type==="holiday"?"Holiday is paid at your basic rate with no extras, and comes off your holiday balance.":d.type==="sick"?"Statutory Sick Pay isn't worked out here. If your employer pays you for sick days, turn it on and set the rate.":"Day, night and holiday extras come from the job automatically. Use \"Extra for this shift\" for one-offs, like covering a colleague."}</div></div>
    <div class="fsec"><label class="h">This shift</label><div id="sh-warn">${shiftWarnings()}</div><div class="card lines num preview" id="sh-preview">${shiftPreview()}</div></div>
    <div class="fsec"><label class="h">Notes</label><div class="fgroup"><textarea id="sh-notes" data-bind="notes" placeholder="Optional">${esc(d.notes)}</textarea></div></div>
    ${d.id?`<button class="btn ghost" data-act="repeatShift" style="width:100%">${ico("repeat","ico-sm")} Repeat this shift today</button><button class="danger" data-act="delShift">Delete shift</button>`:""}
  </div>`;
}
function quickTimes(jobId){
  if(!jobId) return [];
  const m = new Map();
  for(const e of S.roster.entries.filter(e=>e.jobId===jobId)) m.set(`${e.start}–${e.end}`, (m.get(`${e.start}–${e.end}`)||0) + 5);
  for(const s of S.shifts.filter(s=>s.jobId===jobId && shiftType(s)==="work").slice(-40)){ const k = `${toT(s.start)}–${toT(s.end)}`; m.set(k, (m.get(k)||0) + 1); }
  return [...m.entries()].filter(x=>x[1]>=2).sort((a,b)=>b[1]-a[1]).slice(0,4).map(x=>x[0]);
}
function resolvedEnd(d){
  let t = atTime(d.start, d.endTime || "17:00");
  if(t <= d.start) t = addDays(t, 1);
  return t;
}
function shiftWarnings(){
  const d = UI.sheet.data, end = resolvedEnd(d), len = (end - d.start)/60000, w = [];
  if(num(d.breakMin) >= len) w.push("The break is as long as the shift, so nothing is paid.");
  if(!(num(d.rate) > 0)) w.push("Hourly rate is 0. Set it here or on the job.");
  if(d.fromClock && Date.now() - d.start > 16*3600000) w.push(`You've been clocked in since ${dayMon(d.start)} at ${tm(d.start)}. If you forgot to clock out, set the real end time here.`);
  if(d.start > Date.now() + 365*DAY) w.push("This shift is more than a year away. Check the date.");
  { const j = jobById(d.jobId), mw = (d.type||"work")==="work" ? belowMin(j, d.start, num(d.rate)) : null;
    if(mw) w.push(`${money(num(d.rate))}/h is below the ${mw.name} for your age in ${mw.where} (${money(mw.rate)}). If that's your real rate, you may be underpaid.`); }
  { const j = jobById(d.jobId); if(j && !covered(j, d.start)){ const st = contractStatus(j); w.push(`This date is outside your contract with ${esc(j.name)}${st ? ` (${st.label})` : ""}. Check the date, or add a new contract to the job.`); } }
  if(len > 16*60) w.push(`This shift is ${hrs(len/60)} long. Check the start and end times.`);
  const clash = S.shifts.find(s => s.id !== d.id && s.start < end && s.end > d.start);
  if(clash){ const j = jobById(clash.jobId); w.push(`Overlaps your ${j?esc(j.name)+" ":""}shift on ${dm(clash.start)}, ${tm(clash.start)}–${tm(clash.end)}.`); }
  return w.map(t => `<div class="warn">${ico("triangle-alert","ico-sm")}<span>${t}</span></div>`).join("");
}
function shiftPreview(){
  const d = UI.sheet.data, j = jobById(d.jobId);
  const p = payShift({start:d.start, end:resolvedEnd(d), breakMin:num(d.breakMin), rate:num(d.rate), extraPct:num(d.extraPct), tips:num(d.tips), jobId:d.jobId});
  return `<div class="line"><span>Paid time</span><span>${hrs(p.hours)}</span></div>
    <div class="line"><span>Base pay</span><span>${money(p.base)}</span></div>
    ${Object.entries(p.parts).sort((a,b)=>b[1]-a[1]).map(([l,v])=>`<div class="line"><span>${esc(l)}</span><span class="g">${money(v)}</span></div>`).join("")}
    ${p.tips>0?`<div class="line"><span>Tips</span><span>${money(p.tips)}</span></div>`:""}
    <hr><div class="line b"><span>Total</span><span>${money(gross(p))}</span></div>
    ${j&&j.otOn?`<div class="xs muted">Overtime is worked out weekly once you pass ${j.otAfter}h, so it shows in your totals.</div>`:""}`;
}
function jobSheet(){
  const d = UI.sheet.data;
  const order = [0,1,2,3,4,5,6].map(i => (S.settings.weekStart + i) % 7);
  return `<div class="sheet-b">
    <div class="fsec"><div class="fgroup">
      <div class="f"><input class="full" id="jb-name" data-bind="name" placeholder="Job name, e.g. Tesco" value="${esc(d.name)}"></div>
      ${fRow("Hourly rate",`<span class="unit">${curSymbol()}</span><input type="text" inputmode="decimal" autocomplete="off" id="jb-rate" data-bind="rate" data-type="num" value="${d.rate||""}" placeholder="0.00" step="any">`)}
      <div id="jb-mw">${jobMinWarn(d)}</div>
      ${fRow("Usual unpaid break",`<input type="text" inputmode="numeric" autocomplete="off" id="jb-break" data-bind="breakMin" data-type="num" value="${d.breakMin}" step="5" min="0"><span class="unit">min</span>`)}
      ${fRow("Only on shifts over",`<input type="text" inputmode="decimal" autocomplete="off" id="jb-bafter" data-bind="breakAfter" data-type="num" value="${d.breakAfter||""}" placeholder="0" style="max-width:60px"><span class="unit">hours</span>`)}
    </div><div class="foot">Leave at 0 to take the break off every shift. In the UK you're entitled to a 20-minute break on shifts over 6 hours.</div></div>
    <div class="fsec"><label class="h">Holiday pay</label><div class="fgroup">
      ${fRow("How it works",sel("jb-hol",'data-bind="holiday" data-rerender="1"',[["none","Not tracked"],["accrue","Builds up as paid leave"],["rolled","Paid on top of each shift"]],d.holiday||"none"))}
      ${d.holiday && d.holiday!=="none" ? fRow(d.holiday==="rolled"?"Holiday pay":"Builds up at",`<input type="text" inputmode="decimal" autocomplete="off" class="pct" id="jb-holpct" data-bind="holidayPct" data-type="num" value="${d.holidayPct}"><span class="unit">${d.holiday==="rolled"?"% of pay":"% of hours"}</span>`) : ""}
    </div><div class="foot">UK hourly and part-year workers build up holiday at 12.07% of hours worked. Some employers pay it on top of each payslip instead ("rolled-up"). Check your contract.</div></div>
    <div class="fsec"><label class="h">Contract</label>
      ${d.contracts.length ? d.contracts.map((c,i)=>`<div class="fgroup contract">
        <div class="f"><span><b>${d.contracts.length>1?`Contract ${i+1}`:"Your contract"}</b></span><button data-act="delContract" data-i="${i}" class="xs" style="color:var(--red);font-weight:600">Remove</button></div>
        ${fRow("Type",sel("ct-t-"+i,`data-bind="contracts.${i}.type" data-rerender="1"`,Object.entries(CONTRACT_TYPES),c.type))}
        ${fRow("Started",`<input type="date" id="ct-s-${i}" data-bind="contracts.${i}.start" data-type="date" data-rerender="1" value="${toD(c.start)}">`)}
        <div class="f"><span>Has an end date</span>${toggleHTML("ct-he-"+i,`data-bind="contracts.${i}.hasEnd" data-type="bool" data-rerender="1"`,c.hasEnd)}</div>
        ${c.hasEnd?fRow("Ends",`<input type="date" id="ct-e-${i}" data-bind="contracts.${i}.end" data-type="date" data-rerender="1" value="${c.end?toD(c.end):""}">`):""}
        ${c.hasEnd && (!c.end || c.end < c.start) ? `<div class="warn" style="margin:6px 0">${ico("triangle-alert","ico-sm")}<span>Pick an end date on or after the start date.</span></div>` : ""}
        ${fRow("Contracted hours",`<input type="text" inputmode="decimal" autocomplete="off" id="ct-h-${i}" data-bind="contracts.${i}.hours" data-type="num" value="${c.hours||""}" placeholder="${c.type==="zero"?"0":"e.g. 24"}" style="max-width:70px"><span class="unit">h / week</span>`)}
        ${fRow("Rate on this contract",`<span class="unit">${curSymbol()}</span><input type="text" inputmode="decimal" autocomplete="off" id="ct-r-${i}" data-bind="contracts.${i}.rate" data-type="num" value="${c.rate||""}" placeholder="same as job">`)}
        ${fRow("Notice period",`<input id="ct-n-${i}" data-bind="contracts.${i}.notice" value="${esc(c.notice||"")}" placeholder="e.g. 1 week">`)}
        ${fRow("Probation ends",`<input type="date" id="ct-p-${i}" data-bind="contracts.${i}.probationEnd" data-type="date0" value="${c.probationEnd?toD(c.probationEnd):""}">`)}
        <div class="f"><textarea id="ct-x-${i}" data-bind="contracts.${i}.notes" placeholder="Notes, e.g. who signed it, where it's saved" style="min-height:50px">${esc(c.notes||"")}</textarea></div>
      </div>`).join("") : ""}
      <button class="btn ghost" data-act="addContract" style="width:100%;background:var(--card);border:1px solid var(--line)">${ico("file-pen-line","ico-sm")} ${d.contracts.length?"Add a renewal or next contract":"Add contract dates"}</button>
      <div class="foot">${d.contracts.length?"Your roster only fills days inside a contract, shifts outside it get a warning, and the calendar marks the start and end. A rate here replaces the job's rate for shifts in that contract.":"Add when this job started and when it ends, so ClockMe stops planning shifts after your last day."}</div></div>
    <div class="fsec"><label class="h">How you're paid here</label><div class="fgroup">
      <div class="f"><span>Self-employed (I send invoices)</span>${toggleHTML("jb-self",'data-bind="selfEmployed" data-type="bool" data-rerender="1"',d.selfEmployed)}</div>
      ${d.selfEmployed?`<div class="f"><input class="full" id="jb-cn" data-bind="client.name" placeholder="Bill to: client or company name" value="${esc(d.client.name)}"></div>
        <div class="f"><textarea id="jb-ca" data-bind="client.address" placeholder="Client address" style="min-height:56px">${esc(d.client.address)}</textarea></div>
        <div class="f"><input class="full" id="jb-ce" data-bind="client.email" type="email" placeholder="Client email" value="${esc(d.client.email)}"></div>`:""}
    </div><div class="foot">${d.selfEmployed?"No tax is taken from this pay. The app tells you what to put aside, and you can invoice these shifts.":"Turn on if you invoice for this work instead of getting a payslip."}</div></div>
    <div class="fsec"><label class="h">Extra pay by day</label><div class="fgroup">
      ${order.map(i=>`<div class="f"><span>${WD[i]}</span><span class="hint" id="wd-hint-${i}">${+d.weekday[i]?money(d.rate*(1+d.weekday[i]/100))+"/h":""}</span><span class="unit">+</span><input type="text" inputmode="decimal" autocomplete="off" class="pct" id="jb-wd-${i}" data-bind="weekday.${i}" data-type="num" value="${d.weekday[i]||""}" placeholder="0" step="any"><span class="unit">%</span></div>`).join("")}
    </div><div class="foot">Earn more on some days? Add the %. Sunday +10% turns ${money(10)} an hour into ${money(11)}. A shift that crosses midnight is split, so each hour gets its own day's rate.</div></div>
    <div class="fsec"><label class="h">Nights</label><div class="fgroup">
      <div class="f"><span>Night premium</span>${toggleHTML("jb-night",'data-bind="nightOn" data-type="bool" data-rerender="1"',d.nightOn)}</div>
      ${d.nightOn?`${fRow("From",`<input type="time" id="jb-ns" data-bind="nightStart" data-type="min" value="${minToT(d.nightStart)}">`)}${fRow("Until",`<input type="time" id="jb-ne" data-bind="nightEnd" data-type="min" value="${minToT(d.nightEnd)}">`)}${fRow("Extra",`<input type="text" inputmode="decimal" autocomplete="off" class="pct" id="jb-np" data-bind="nightPct" data-type="num" value="${d.nightPct}" step="any"><span class="unit">%</span>`)}`:""}
    </div><div class="foot">Added on top of any day premium for hours inside this window.</div></div>
    <div class="fsec"><label class="h">Overtime</label><div class="fgroup">
      <div class="f"><span>Overtime pay</span>${toggleHTML("jb-ot",'data-bind="otOn" data-type="bool" data-rerender="1"',d.otOn)}</div>
      ${d.otOn?`${fRow("Counted per",sel("jb-oper",'data-bind="otPer" data-rerender="1"',[["week","Week"],["day","Day"]],d.otPer||"week"))}${fRow("After",`<input type="text" inputmode="decimal" autocomplete="off" id="jb-oa" data-bind="otAfter" data-type="num" value="${d.otAfter}" step="any"><span class="unit">h / ${d.otPer==="day"?"day":"week"}</span>`)}${fRow("Pay",`<input type="text" inputmode="decimal" autocomplete="off" id="jb-om" data-bind="otMult" data-type="num" value="${d.otMult}" step="0.05"><span class="unit">×</span>`)}`:""}
    </div><div class="foot">Hours past the limit (per week or per day) are paid at the multiplier, e.g. 1.5× for time and a half.</div></div>
    <div class="fsec"><label class="h">Bank holidays & special days</label><div class="fgroup">
      ${d.special.map((s,i)=>`<div class="special"><div class="f"><input class="full" id="sp-l-${i}" data-bind="special.${i}.label" placeholder="Name, e.g. Christmas Day" value="${esc(s.label)}"><button data-act="delSpecial" data-i="${i}" aria-label="Remove" style="color:var(--red)">${ico("x","ico-sm")}</button></div>
        <div class="f"><span>Date</span><input type="date" id="sp-d-${i}" data-bind="special.${i}.date" value="${s.date}"></div>
        <div class="f"><span>Extra</span><input type="text" inputmode="decimal" autocomplete="off" class="pct" id="sp-p-${i}" data-bind="special.${i}.pct" data-type="num" value="${s.pct}" step="any"><span class="unit">%</span></div>
        <div class="f"><span>Repeats every year</span>${toggleHTML("sp-y-"+i,`data-bind="special.${i}.yearly" data-type="bool"`,s.yearly)}</div></div>`).join("")}
      <button class="f" data-act="addSpecial" style="width:100%;color:var(--green);font-weight:600;justify-content:flex-start;gap:8px">${ico("plus","ico-sm")} Add a special day</button>
    </div>
    <div class="fgroup" style="margin-top:8px">
      <div class="f"><span><b>Add official bank holidays</b><br><span class="xs muted">2026 and 2027, substitute days included</span></span></div>
      ${fRow("Region",sel("bh-reg",'data-bind="bhRegion"',Object.entries(BANK_HOLS).map(([k,v])=>[k,v.title]),d.bhRegion||defaultHolRegion()))}
      ${fRow("Extra pay on those days",`<input type="text" inputmode="decimal" autocomplete="off" class="pct" id="bh-pct" data-bind="bhPct" data-type="num" value="${d.bhPct ?? 50}"><span class="unit">%</span>`)}
      <button class="f" data-act="addBankHols" style="width:100%;color:var(--green);font-weight:600;justify-content:flex-start;gap:8px">${ico("calendar-plus","ico-sm")} Add bank holidays</button>
    </div><div class="foot">A special day's % replaces that weekday's % for the whole day. Turn on "Repeats every year" for fixed dates like Christmas Day.</div></div>
    <div class="fsec"><label class="h">Look</label><div class="fgroup">
      <div class="icongrid">${JOB_ICONS.map(n=>`<button data-act="pickIcon" data-v="${n}" style="${d.icon===n?`background:${d.color};color:#fff`:`color:${d.color}`}" aria-label="${n}">${ico(n,"ico-sm")}</button>`).join("")}</div>
      <div class="colors">${PALETTE.map(c=>`<button data-act="pickColor" data-v="${c}" class="${d.color===c?"on":""}" style="background:${c}" aria-label="Colour"></button>`).join("")}</div>
    </div></div>
    ${d.id?`<div class="fgroup"><div class="f"><span>Archived (hidden from clock-in)</span>${toggleHTML("jb-arch",'data-bind="archived" data-type="bool"',d.archived)}</div></div><button class="danger" data-act="delJob">Delete job and its shifts</button>`:""}
  </div>`;
}
function jobMinWarn(d){
  const m = !d.selfEmployed && num(d.rate) > 0 ? belowMin(Object.assign({}, d, {contracts:[]}), Date.now(), num(d.rate)) : null;
  return m ? `<div class="warn" style="margin:6px 0">${ico("scale","ico-sm")}<span>${money(num(d.rate))}/h is below the ${m.name} for your age (${money(m.rate)}). Check your contract, or contact Acas or your union if it's right.</span></div>` : "";
}
function goalSheet(){
  const d = UI.sheet.data;
  return `<div class="sheet-b">
    <div class="fsec"><div class="fgroup">
      <div class="f"><input class="full" id="gl-t" data-bind="title" placeholder="Name, e.g. Summer holiday" value="${esc(d.title)}"></div>
      <div class="f"><input class="full" id="gl-s" data-bind="subtitle" placeholder="Note, e.g. Let's get there" value="${esc(d.subtitle)}"></div>
    </div></div>
    <div class="fsec"><label class="h">Target</label><div class="fgroup">
      ${fRow("Amount",`<span class="unit">${curSymbol()}</span><input type="text" inputmode="decimal" autocomplete="off" id="gl-a" data-bind="target" data-type="num" value="${d.target}" step="any">`)}
      ${fRow("Count shifts from",`<input type="date" id="gl-f" data-bind="start" data-type="date" value="${toD(d.start)}">`)}
      ${fRow("Deadline",`<input type="date" id="gl-d" data-bind="deadline" data-type="date" value="${toD(d.deadline)}">`)}
    </div><div class="foot">Progress uses your ${S.settings.showTakeHome?"estimated take-home":"gross"} pay.</div></div>
    <div class="fsec"><label class="h">Look</label><div class="fgroup">
      <div class="icongrid">${GOAL_ICONS.map(n=>`<button data-act="pickIcon" data-v="${n}" style="${d.icon===n?`background:${d.color};color:#fff`:`color:${d.color}`}" aria-label="${n}">${ico(n,"ico-sm")}</button>`).join("")}</div>
      <div class="colors">${PALETTE.map(c=>`<button data-act="pickColor" data-v="${c}" class="${d.color===c?"on":""}" style="background:${c}" aria-label="Colour"></button>`).join("")}</div>
    </div></div>
  </div>`;
}
function nameSheet(){
  const d = UI.sheet.data;
  const has = okPhoto(S.settings.photo);
  return `<div class="sheet-b">
    <div class="photo-pick">${avatarEdit(88)}<div class="stack" style="gap:6px;align-items:flex-start"><b>Profile photo</b><span class="xs muted">Shown on your profile, home screen and lock screen.</span>
      <span class="row" style="gap:14px"><button class="link" style="color:var(--blue);font-weight:600" data-act="pickPhoto">${has?"Change photo":"Add photo"}</button>${has?`<button class="link" style="color:var(--red);font-weight:600" data-act="removePhoto">Remove</button>`:""}</span></div></div>
    <div class="fsec"><label class="h">Your details</label><div class="fgroup">
    <div class="f"><input class="full" id="nm" data-bind="name" value="${esc(d.name)}" placeholder="First name" autocomplete="given-name"></div>
    <div class="f"><input class="full" id="nm-email" data-bind="email" type="email" inputmode="email" value="${esc(d.email)}" placeholder="Email address" autocomplete="email"></div></div>
    <div class="foot">This email goes on your invoices and backups.</div></div></div>`;
}
function rosterSheet(){
  const d = UI.sheet.data;
  const order = [0,1,2,3,4,5,6].map(i => (S.settings.weekStart + i) % 7);
  const jobs = activeJobs();
  const perWeek = d.entries.reduce((a,e)=>{ let len = tToMin(e.end) - tToMin(e.start); if(len<=0) len += 1440; return a + Math.max(0, len - (+e.breakMin||0))/60; }, 0);
  return `<div class="sheet-b">
    <div class="fsec"><div class="fgroup">
      <div class="f"><span><b>Fill in my shifts automatically</b></span>${toggleHTML("ro-on",'data-bind="on" data-type="bool" data-rerender="1"',d.on)}</div>
      ${fRow("Fill my calendar",sel("ro-w",'data-bind="months" data-type="num"',HORIZONS,d.months||2))}
      <div class="f"><span>Add shifts I've already worked this month</span>${toggleHTML("ro-back",'data-bind="backfill" data-type="bool"',d.backfill)}</div>
    </div><div class="foot">Your usual week fills the calendar as scheduled shifts. When each shift's time comes it counts as worked, so pay, goals, payday and invoices update by themselves. Change or delete any day in the calendar if a week is different.</div></div>
    <button class="btn ghost" data-act="openImport" style="width:100%">${ico("scan-line","ico-sm")} Fill from a photo or text of my rota</button>
    <button class="paycard" data-act="openWeek" style="background:var(--card);border:1px solid var(--line)"><div class="tile" style="color:var(--blue)">${ico("calendar-cog")}</div><div><b>Only one week is different?</b><div class="small muted">Edit next week (or any week) without changing your usual week</div></div><span class="amt">${ico("chevron-right","ico-sm")}</span></button>
    ${!jobs.length?`<div class="warn">${ico("info","ico-sm")}<span>Add a job first, then build your week.</span></div>`:""}
    ${order.map(day => { const es = d.entries.map((e,i)=>[e,i]).filter(([e])=>e.day===day); return `<div class="rday"><div class="dh"><span>${WD[day]}</span>${jobs.length?`<button class="link" style="color:var(--green);font-weight:600" data-act="addEntry" data-day="${day}">${ico("plus","ico-sm")} Add</button>`:""}</div>
      ${es.length ? es.map(([e,i])=>`<div class="rentry">
        ${jobs.length>1?fRow("Job",sel("re-j-"+i,`data-bind="entries.${i}.jobId"`,jobs.map(j=>[j.id,j.name]),e.jobId)):""}
        ${fRow("Start",`<input type="time" id="re-s-${i}" data-bind="entries.${i}.start" value="${e.start}">`)}
        ${fRow("End",`<input type="time" id="re-e-${i}" data-bind="entries.${i}.end" value="${e.end}">`)}
        <div class="f"><span>Unpaid break</span><input type="text" inputmode="numeric" autocomplete="off" id="re-b-${i}" data-bind="entries.${i}.breakMin" data-type="num" value="${e.breakMin}" step="5" min="0" style="max-width:60px"><span class="unit">min</span><button data-act="delEntry" data-i="${i}" aria-label="Remove" style="color:var(--red);margin-left:6px">${ico("trash-2","ico-sm")}</button></div>
      </div>`).join("") : `<div class="xs muted" style="padding:0 4px 4px">Day off</div>`}</div>`; }).join("")}
    <div class="card lines num"><div class="line"><span>Usual week</span><span>${d.entries.length} shift${d.entries.length===1?"":"s"} · ${hrs(perWeek)}</span></div></div>
  </div>`;
}
function importSheet(){
  const d = UI.sheet.data, jobs = activeJobs();
  if(d.status === "done"){
    const on = d.results.filter(r=>r.on).length;
    return `<div class="sheet-b">
      <div class="fsec"><label class="h">Found ${d.results.length} shift${d.results.length===1?"":"s"}</label>
        ${d.warning?`<div class="warn">${ico("info","ico-sm")}<span>${esc(d.warning)}</span></div>`:""}
        <div class="found">${d.results.map((r,i)=>`<div class="fi ${r.on?"":"off"}">
          <div class="f"><span><b>${r.date?dayMon(fromD(r.date)):"?"}</b>${r.note?` <span class="xs muted">${esc(r.note)}</span>`:""}</span>${toggleHTML("rs-on-"+i,`data-bind="results.${i}.on" data-type="bool" data-rerender="1"`,r.on)}</div>
          <div class="f"><span>Date</span><input type="date" id="rs-d-${i}" data-bind="results.${i}.date" value="${r.date||""}"></div>
          ${fRow("Start",`<input type="time" id="rs-s-${i}" data-bind="results.${i}.start" value="${r.start}">`)}
          ${fRow("End",`<input type="time" id="rs-e-${i}" data-bind="results.${i}.end" value="${r.end}">`)}
          ${jobs.length>1?fRow("Job",sel("rs-j-"+i,`data-bind="results.${i}.jobId"`,jobs.map(j=>[j.id,j.name]),r.jobId)):""}
        </div>`).join("")}</div></div>
      <button class="btn big" data-act="importAdd" ${on?"":"disabled"}>${ico("calendar-check")} Use for those dates only (${on} shift${on===1?"":"s"})</button>
      <button class="btn ghost" data-act="importPattern" style="width:100%" ${on?"":"disabled"}>${ico("calendar-days","ico-sm")} Make this my usual week</button>
      <button class="small muted" data-act="importReset" style="padding:10px;font-weight:600">Start again</button>
    </div>`;
  }
  return `<div class="sheet-b">
    <p class="muted small" style="margin:0">Take a photo or screenshot of your rota, or paste the message your manager sent. ClockMe reads it and finds your shifts. You check them before anything is added.</p>
    <label class="drop" for="imp-file">${UI.importURL?`<img src="${UI.importURL}" alt="Your rota">`:`<div class="tile">${ico("camera")}</div><b>Add a photo of your rota</b><span class="xs muted">Screenshot, photo or picture of the staff board</span>`}<input type="file" accept="image/*" id="imp-file"></label>
    <div class="fsec"><label class="h">Or paste the text</label><div class="fgroup"><textarea id="imp-text" data-bind="text" placeholder="e.g. Mon 9-5, Wed 12-8, Sat 7am-3pm" style="min-height:90px">${esc(d.text)}</textarea></div></div>
    <div class="fsec"><div class="fgroup">
      <div class="f"><input class="full" id="imp-name" data-bind="name" placeholder="Your name as it appears on the rota" value="${esc(d.name)}"></div>
      ${jobs.length>1?fRow("Job",sel("imp-job",'data-bind="jobId"',jobs.map(j=>[j.id,j.name]),d.jobId)):""}
    </div><div class="foot">If the rota lists the whole team, ClockMe only picks the rows with your name.</div></div>
    ${!UI.online && HOSTED && d.status!=="error"?`<div class="warn" id="imp-offline">${ico("cloud-off","ico-sm")}<span>You're offline. Reading a rota needs a connection. You can still add shifts by hand.</span></div>`:""}
    ${d.status==="error"?`<div class="warn">${ico("triangle-alert","ico-sm")}<span>${esc(d.msg)}${d.code?` <span class="xs" style="opacity:.6">(${esc(d.code)})</span>`:""}</span></div>`:""}
    ${d.status==="working"?`<div class="row" style="justify-content:center;gap:10px;padding:8px"><span class="spinner"></span><span class="small">Reading your rota… this can take up to a minute</span></div><button class="btn ghost" data-act="importStop" style="width:100%">Stop</button>`
      :`<button class="btn big" data-act="importRead" ${(UI.importFile||d.text.trim())&&jobs.length?"":"disabled"}>${ico("sparkles")} Find my shifts</button>`}
    ${!jobs.length?`<div class="warn">${ico("info","ico-sm")}<span>Add a job first so the shifts know what they pay.</span></div>`:""}
  </div>`;
}
function invoiceSheet(){
  const d = UI.sheet.data, C = lastC || context();
  const jobs = selfJobs();
  const presets = invoicePresets();
  return `<div class="sheet-b">
    <div class="fsec"><div class="fgroup">
      ${fRow("Client",sel("in-job",'data-bind="jobId" data-rerender="1"',jobs.map(j=>[j.id,(j.client&&j.client.name)||j.name]),d.jobId))}
      ${fRow("Number",`<input id="in-num" data-bind="number" value="${esc(d.number)}" autocomplete="off">`)}
      <div id="in-warn">${dupNumber(d)?`<div class="warn" style="margin:6px 0">${ico("triangle-alert","ico-sm")}<span>You already have an invoice numbered ${esc(d.number)}.</span></div>`:""}</div>
      ${fRow("Issue date",`<input type="date" id="in-iss" data-bind="issue" data-type="date" value="${toD(d.issue)}">`)}
    </div></div>
    <div class="fsec"><label class="h">Period</label><div class="chips" style="margin:0;padding:0;flex-wrap:wrap">${Object.entries(presets).map(([k,v])=>`<button class="fchip ${d.preset===k?"on":""}" data-act="invPreset" data-v="${k}">${v[0]}</button>`).join("")}<button class="fchip ${d.preset==="custom"?"on":""}" data-act="invPreset" data-v="custom">Custom</button></div>
      <div class="fgroup" style="margin-top:6px">${fRow("From",`<input type="date" id="in-from" data-bind="from" data-type="date" data-custom="1" value="${toD(d.from)}">`)}${fRow("To",`<input type="date" id="in-to" data-bind="to" data-type="date" data-custom="1" value="${toD(d.to)}">`)}</div></div>
    <div class="fsec"><div class="fgroup">
      <div class="f"><span>Include scheduled shifts</span>${toggleHTML("in-sch",'data-bind="includeScheduled" data-type="bool"',d.includeScheduled)}</div>
      <div class="f"><span>Skip shifts already invoiced</span>${toggleHTML("in-skip",'data-bind="skipInvoiced" data-type="bool"',d.skipInvoiced)}</div>
      ${fRow("Lines",sel("in-grp",'data-bind="group"',[["shift","One per shift"],["day","One per day"]],d.group))}
    </div><div class="foot">Turn on "Include scheduled shifts" to invoice hours you're booked to work, e.g. billing a week in advance.</div></div>
    <div class="fsec"><label class="h">Extra items</label><div class="fgroup">
      ${d.extras.map((e,i)=>`<div class="f"><input class="full" id="in-xd-${i}" data-bind="extras.${i}.desc" placeholder="e.g. Travel, materials" value="${esc(e.desc)}"><span class="unit">${curSymbol()}</span><input type="text" inputmode="decimal" autocomplete="off" id="in-xa-${i}" data-bind="extras.${i}.amount" data-type="num" value="${e.amount||""}" placeholder="0.00" step="any" style="max-width:80px"><button data-act="delExtra" data-i="${i}" aria-label="Remove" style="color:var(--red)">${ico("x","ico-sm")}</button></div>`).join("")}
      <button class="f" data-act="addExtra" style="width:100%;color:var(--green);font-weight:600;justify-content:flex-start;gap:8px">${ico("plus","ico-sm")} Add item</button>
    </div></div>
    <div class="fsec"><label class="h">Notes</label><div class="fgroup"><textarea id="in-notes" data-bind="notes" placeholder="e.g. Thanks for your business">${esc(d.notes)}</textarea></div></div>
    ${!S.business.name || !(S.business.accountNumber || S.business.iban)?`<button class="paycard" data-act="openBusiness" style="background:var(--card);border:1px solid var(--line)"><div class="tile">${ico("building")}</div><div><b>Add your business & bank details</b><div class="small muted">So clients know who to pay and where</div></div></button>`:""}
    <div class="fsec"><label class="h">Preview</label><div id="in-preview">${paperHTML(buildInvoice(d, C))}</div></div>
  </div>`;
}
function businessSheet(){
  const d = UI.sheet.data;
  const t = (k, ph, type="text") => `<div class="f"><input class="full" id="bz-${k}" data-bind="${k}" type="${type}" placeholder="${ph}" value="${esc(d[k])}"></div>`;
  return `<div class="sheet-b">
    <div class="fsec"><label class="h">On your invoices</label><div class="fgroup">${t("name","Your name or business name")}
      <div class="f"><textarea id="bz-address" data-bind="address" placeholder="Address" style="min-height:60px">${esc(d.address)}</textarea></div>
      ${t("email","Email","email")}${t("phone","Phone","tel")}${t("taxRef","Tax reference, e.g. UTR (optional)")}</div></div>
    <div class="fsec"><label class="h">Where clients pay you</label><div class="fgroup">${t("bankName","Bank name")}${t("accountName","Account name")}${t("sortCode","Sort code")}${t("accountNumber","Account number")}${t("iban","IBAN (optional)")}</div>
      <div class="foot">Stored in your own ClockMe data and only printed on invoices you make.</div></div>
    <div class="fsec"><label class="h">Invoice settings</label><div class="fgroup">
      ${fRow("Payment due after",`<input type="text" inputmode="numeric" autocomplete="off" id="bz-terms" data-bind="terms" data-type="num" value="${d.terms}" style="max-width:60px"><span class="unit">days</span>`)}
      ${fRow("Number prefix",`<input id="bz-prefix" data-bind="prefix" value="${esc(d.prefix)}" style="max-width:90px">`)}
      <div class="f"><span>Add VAT</span>${toggleHTML("bz-vat",'data-bind="vatOn" data-type="bool" data-rerender="1"',d.vatOn)}</div>
      ${d.vatOn?`<div class="f"><input class="full" id="bz-vatno" data-bind="vatNo" placeholder="VAT registration number" value="${esc(d.vatNo||"")}"></div>`:""}
      ${d.vatOn?fRow("VAT rate",`<input type="text" inputmode="decimal" autocomplete="off" id="bz-vatp" data-bind="vatPct" data-type="num" value="${d.vatPct}" class="pct"><span class="unit">%</span>`):""}
    </div><div class="foot">In the UK you only add VAT if you're VAT-registered.</div></div>
  </div>`;
}
function paySheet(){
  const d = UI.sheet.data;
  return `<div class="sheet-b">
    <div class="fsec"><label class="h">Your payslip</label><div class="fgroup">
      ${fRow("How often",sel("py-f",'data-bind="payFreq"',Object.entries(FREQS).map(([k,v])=>[k,v[0]]),d.payFreq))}
      ${fRow("A payday",`<input type="date" id="py-d" data-bind="payday" value="${d.payday}">`)}
    </div><div class="foot">Pick your last or next payday. Home then shows the countdown and what you've earned since your last payday.</div></div>
  </div>`;
}
function helpSheet(){
  return `<div class="sheet-b help">
    <div class="fsec"><label class="h">How your pay is worked out</label><div class="card lines small" style="line-height:1.5">
      <p>Each shift is paid at the rate saved on it, for the time worked minus any unpaid break.</p>
      <p>Extra pay is added on top: the day's % (a bank holiday replaces the weekday %), night %, and any one-off bonus. A shift that runs past midnight is split, so each hour gets the right day's rate.</p>
      <p>Overtime is counted per job across the week, in time order. Hours past your limit get the extra part of the multiplier, e.g. the extra 0.5× for time and a half.</p>
      <p>Every line is rounded to the penny, like a payslip, so totals always add up.</p>
      <p>Your usual week fills the calendar. If one week is different, use Edit week: "This week only" changes just that week, "Make this my usual week" changes every week from then on.</p>
      <p>Contracts set when a job starts and ends. Your roster only fills days inside a contract, and a renewal can bring a new rate.</p>
      <p>Bank holidays can be added in one tap for England & Wales, Scotland, Northern Ireland, Ireland and the US (2026–2027, from GOV.UK, Citizens Information and OPM).</p></div></div>
    <div class="fsec"><label class="h">Minimum wage check</label><div class="card lines small" style="line-height:1.5">
      <p>UK: from 1 April 2026 the minimum is £12.71 (21+), £10.85 (18–20), £8.00 (under 18 and apprentices), rising on 1 April 2027 to £13.21, £11.27 and £8.31. Ireland: €14.15 in 2026, €14.94 from 1 January 2027. US: the federal $7.25 (many states pay more).</p>
      <p>ClockMe warns you if a job pays less than the rate for your age group. Self-employed work isn't covered by minimum wage.</p></div></div>
    <div class="fsec"><label class="h">How take-home is estimated</label><div class="card lines small" style="line-height:1.5">
      <p>We project your yearly income from your last 8 weeks (or use the figure you set), work out the year's tax, then apply the same share to any week or shift.</p>
      <p>Rates used: UK and Scotland 2026/27 Income Tax and National Insurance (Class 1 employed, Class 4 self-employed) and student loans. Ireland 2026 PAYE, USC and PRSI, switching to Budget 2027 rates on 1 Jan 2027. US 2026 federal brackets, standard deduction and FICA. Other countries use your own %.</p>
      <p>Self-employed UK income has the £1,000 trading allowance taken off first, as ClockMe doesn't track expenses.</p>
      <p>It's an estimate. Tax codes, benefits, other income and how your employer runs payroll can change the real amount.</p></div></div>
    <div class="fsec"><label class="h">Your data</label><div class="card lines small" style="line-height:1.5">
      <p>Your data is saved privately to your account and on this device. People you share the app with get their own separate, private data.</p>
      <p>Use Profile → Back up my data to keep a copy you can restore any time.</p></div></div>
  </div>`;
}
function sheetHTML(isNew){
  const s = UI.sheet; if(!s) return "";
  if(s.kind === "pro") return `<div class="overlay ${isNew?"anim":""}" data-act="closeSheetBg"><div class="sheet prowall" role="dialog" aria-label="ClockMe Pro">${proSheet()}</div></div>`;
  const titles = {shift: s.data.type==="holiday" ? (s.data.id?"Edit holiday":"Book holiday") : s.data.type==="sick" ? "Sick day" : s.data.id ? "Edit shift" : (s.data.fromClock ? "Clock out" : "New shift"), job: S.jobs.some(j => j.id === s.data.id) ? "Edit job" : "New job", goal: s.data.id ? "Edit goal" : "New goal", name:"Your details", roster:"Weekly roster", import:"Scan your rota", pro:"ClockMe Pro", invoice: s.data.id ? "Edit invoice" : "New invoice", business:"Business & bank", pay:"Pay schedule", help:"How ClockMe works", pin:"Passcode lock", payslip:"Check a payslip", week:"Edit a week"};
  const body = {shift:shiftSheet, job:jobSheet, goal:goalSheet, name:nameSheet, roster:rosterSheet, import:importSheet, invoice:invoiceSheet, business:businessSheet, pay:paySheet, help:helpSheet, pin:pinSheet, payslip:payslipSheet, week:weekSheet, pro:proSheet}[s.kind]();
  const saveLabel = s.kind === "payslip" ? "Save" : s.kind === "invoice" ? (s.data.id ? "Save" : "Create") : (s.kind === "import" || s.kind === "help" || s.kind === "pin" || s.kind === "week" || s.kind === "pro") ? "" : "Save";
  return `<div class="overlay ${isNew?"anim":""}" data-act="closeSheetBg"><div class="sheet" role="dialog" aria-label="${titles[s.kind]}">
    <div class="sheet-h"><button data-act="closeSheet" style="justify-self:start">${s.kind==="import"||s.kind==="help"||s.kind==="pro"?"Close":"Cancel"}</button><b>${titles[s.kind]}</b>${saveLabel?`<button class="save" data-act="saveSheet" id="savebtn" ${canSave()?"":"disabled"}>${saveLabel}</button>`:"<span></span>"}</div>${body}</div></div>`;
}
function canSave(){
  const s = UI.sheet; if(!s) return false; const d = s.data;
  if(s.kind==="shift") return !!jobById(d.jobId) && d.start > 0;
  if(s.kind==="job") return d.name.trim().length > 0 && (d.contracts||[]).every(c => c.start && (!c.hasEnd || (c.end && c.end >= c.start)));
  if(s.kind==="goal") return d.title.trim().length > 0 && num(d.target) > 0;
  if(s.kind==="payslip") return num(d.gross) > 0 && d.to >= d.from;
  if(s.kind==="name") return d.name.trim().length > 0 && (!d.email || validEmail(d.email));
  if(s.kind==="roster") return d.entries.every(e => jobById(e.jobId) && e.start && e.end);
  if(s.kind==="invoice"){ const inv = buildInvoice(d, lastC || context()); return !!jobById(d.jobId) && inv.lines.length > 0 && String(d.number).trim() && !dupNumber(d); }
  return true;
}
function dialogHTML(isNew){
  const d = UI.dialog; if(!d) return "";
  return `<div class="overlay ${isNew?"anim":""}" data-act="closeDlgBg"><div class="dlg"><div class="box">${d.title||d.message?`<div class="ttl">${d.title?`<b>${esc(d.title)}</b>`:""}${esc(d.message||"")}</div>`:""}
    ${d.actions.map((a,i)=>`<button data-act="dlg" data-i="${i}" class="${a.danger?"danger-t":""}">${esc(a.label)}</button>`).join("")}</div>
    <button class="cancel" data-act="closeDlg">Cancel</button></div></div>`;
}

/* ============ Onboarding (asks enough to set everything up) ============ */
function obDefaults(){
  const st = S.settings, nextFri = (()=>{ const d = new Date(startOfDay(Date.now())); d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7)); return toD(d.getTime()); })();
  const days = {}; for(let i=0;i<7;i++) days[i] = {on: i>=1 && i<=5, start:"09:00", end:"17:00"};
  return {ageBand:st.ageBand || "21+", name:st.name || (UI.me && UI.me.name ? UI.me.name.split(" ")[0] : ""), email:st.email || (UI.me && UI.me.email) || "", workType:st.workType, region:st.region, take:st.showTakeHome, loan:st.loan, postgrad:st.postgrad, filing:st.filing, statePct:st.statePct||"", customPct:st.customPct, customCur:st.customCur, pensionPct:st.pensionPct||"",
    payFreq:st.payFreq, payday:st.payday || nextFri, weekStart:st.weekStart, hasPayday:true,
    job:"", rate:"", breakMin:30, sat:"", sun:"", nightOn:false, nightPct:"", selfJob:st.workType==="self", client:"",
    rosterOn:true, rosterMonths:2, backfill:false, days,
    ctType:st.workType==="self"?"freelance":"permanent", ctStart:toD(Date.now()), ctHasEnd:false, ctEnd:toD(addDays(Date.now(),90)), ctHours:"", biz:{name:S.business.name, email:S.business.email, address:S.business.address, sortCode:S.business.sortCode, accountNumber:S.business.accountNumber},
    goalTitle:"", goalTarget:"", goalDate:toD(addDays(Date.now(), 90))};
}
function obSteps(){
  const o = UI.obDraft, s = ["name","work","country"];
  if(o.take) s.push("tax");
  if(o.workType !== "self") s.push("pay");
  s.push("job","week");
  if(o.workType !== "employed") s.push("business");
  s.push("goal");
  return s;
}
/* ============ Passcode lock ============
   A privacy lock for shared phones. It hides the app behind a 4-digit code; the code itself is only stored as a hash. */
async function hashPin(pin){
  const salt = S.settings.pinSalt || (S.settings.pinSalt = uid());
  const txt = "shiftpay|" + salt + "|" + pin;
  try{ const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt)); return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join(""); }
  catch(e){ let h = 0; for(const c of txt) h = (h*31 + c.charCodeAt(0)) | 0; return "x" + h; }
}
function keypad(act){
  const keys = ["1","2","3","4","5","6","7","8","9","","0","del"];
  return `<div class="keypad">${keys.map(k => k === "" ? "<span></span>" : `<button data-act="${act}" data-v="${k}" aria-label="${k==="del"?"Delete":k}">${k==="del"?ico("delete"):k}</button>`).join("")}</div>`;
}
function pinDots(n, err){ return `<div class="pindots ${err?"shake":""}">${[0,1,2,3].map(i=>`<i class="${i<n?"on":""}"></i>`).join("")}</div>`; }
function lockHTML(){
  return `<div class="lock">${avatarHTML(64)}<b style="font-size:20px">${S.settings.name ? `Welcome back, ${esc(S.settings.name)}` : "Welcome back"}</b><span class="small muted">Enter your ClockMe passcode</span>
    ${pinDots(UI.pin.length, UI.pinErr)}${keypad("unlockKey")}
    <button class="small muted" data-act="forgotPin" style="font-weight:600;padding:10px">Forgot passcode?</button></div>`;
}
/* ============ Payslip check ============ */
function defaultPayslipRange(){
  const pd = paydays();
  if(pd){ const end = addDays(pd[0], -1); const from = stepPayday(pd[0], S.settings.payFreq, -1); return [from, end]; }
  const ws = weekStart(Date.now()); return [addDays(ws,-7), addDays(ws,-1)];
}
function payslipShifts(from, to){ return S.shifts.filter(s => !(jobById(s.jobId)||{}).selfEmployed && !isFuture(s) && s.start >= startOfDay(from) && s.start < addDays(startOfDay(to),1)).sort((a,b)=>a.start-b.start); }
function payslipVerdict(diff){
  if(Math.abs(diff) < 0.01) return ["ok","Matches to the penny"];
  if(Math.abs(diff) < 1) return ["ok","Within £1, likely rounding".replace("£", curSymbol())];
  return diff < 0 ? ["under",`You may be underpaid by ${money(-diff)}`] : ["over",`Paid ${money(diff)} more than your shifts show`];
}
function payslipResult(){
  const d = UI.sheet.data, C = lastC || context();
  const list = payslipShifts(d.from, d.to), t = C.total(list), exp = gross(t), g = num(d.gross), n = num(d.net);
  const [cls, msg] = g > 0 ? payslipVerdict(r2(g - exp)) : ["", ""];
  return `<div class="card lines num">
    <div class="line"><span>Your shifts (${list.length} · ${hrs(t.hours)})</span><span>${money(exp)}</span></div>
    ${g>0?`<div class="line"><span>Gross on payslip</span><span>${money(g)}</span></div><hr>
      <div class="verdict ${cls}">${ico(cls==="under"?"triangle-alert":cls==="over"?"info":"circle-check","ico-sm")}<b>${msg}</b></div>
      ${cls==="under"?`<div class="xs muted">Check for missing shifts, a wrong rate or missing extra pay below, then speak to your manager or payroll.</div>`:cls==="over"?`<div class="xs muted">This is often holiday pay, back pay, a bonus or a shift you haven't logged.</div>`:""}`
      :`<div class="xs muted">Enter the gross pay from your payslip to compare.</div>`}
    ${g>0&&n>0?`<hr><div class="line"><span>Deductions on payslip</span><span>${money(g-n)}</span></div><div class="line"><span>ClockMe estimate</span><span>${money(g - C.shown(g))}</span></div>`:""}
  </div>
  ${list.length?`<div class="fsec"><label class="h">Shifts in this period</label><div class="card lines num small">${list.map(s=>{ const p = C.pay(s); return `<div class="line"><span>${dayMon(s.start)} · ${shiftType(s)==="work"?`${tm(s.start)}–${tm(s.end)}`:shiftType(s)}</span><span>${money(gross(p))}</span></div>`; }).join("")}</div></div>`:""}`;
}
function payslipSheet(){
  const d = UI.sheet.data;
  return `<div class="sheet-b">
    <p class="small muted" style="margin:0">Compare what you were paid with the shifts you worked. Most payslips show the period they cover near the top.</p>
    <div class="fsec"><label class="h">Pay period</label><div class="fgroup">
      ${fRow("From",`<input type="date" id="ps-from" data-bind="from" data-type="date" value="${toD(d.from)}">`)}
      ${fRow("To",`<input type="date" id="ps-to" data-bind="to" data-type="date" value="${toD(d.to)}">`)}</div></div>
    <div class="fsec"><label class="h">From your payslip</label><div class="fgroup">
      ${fRow("Gross pay",`<span class="unit">${curSymbol()}</span><input type="text" inputmode="decimal" autocomplete="off" id="ps-gross" data-bind="gross" value="${esc(d.gross)}" placeholder="0.00">`)}
      ${fRow("Take-home (net)",`<span class="unit">${curSymbol()}</span><input type="text" inputmode="decimal" autocomplete="off" id="ps-net" data-bind="net" value="${esc(d.net)}" placeholder="optional">`)}</div></div>
    <div id="ps-result">${payslipResult()}</div>
  </div>`;
}
function payslipsPage(){
  const list = [...S.payslips].sort((a,b)=>b.to-a.to);
  return `<div class="stack" style="gap:14px">${phead("Payslip checks",`<button class="iconbtn" data-act="openPayslip" aria-label="New check">${ico("plus")}</button>`)}
    ${list.length?`<div class="list">${list.map(p=>{ const [cls,msg] = payslipVerdict(r2(p.gross - p.expected)); return `<div class="inv-row"><div class="mid"><b>${dm(p.from)} – ${dmy(p.to)}</b><span>Payslip ${money(p.gross)} · shifts ${money(p.expected)}</span></div><div class="right"><span class="st ${cls==="ok"?"paid":cls==="under"?"overdue":"sent"}">${cls==="ok"?"Matches":cls==="under"?"Underpaid":"Overpaid"}</span><button class="xs muted" data-act="delPayslip" data-id="${p.id}">Remove</button></div></div>`; }).join("")}</div>`
      : empty("file-check","No payslip checks yet","When you get paid, enter your payslip's gross pay and ClockMe tells you if it matches your shifts.","openPayslip","Check a payslip")}</div>`;
}
/* ============ Edit a single week ============
   Change one week's days and hours without touching the usual week, or make that week the new usual week. */
function weekLabel(ws){
  const cur = weekStart(Date.now());
  const rel = ws === cur ? "This week" : ws === addDays(cur,7) ? "Next week" : ws === addDays(cur,-7) ? "Last week" : "";
  return `${rel ? rel + " · " : ""}${dm(ws)} – ${dm(addDays(ws,6))}`;
}
function buildWeekDraft(ws){
  const we = addDays(ws, 7), days = {};
  for(let i=0;i<7;i++) days[i] = [];
  for(const sh of S.shifts.filter(x => shiftType(x)==="work" && x.start >= ws && x.start < we).sort((a,b)=>a.start-b.start)){
    const off = Math.round((startOfDay(sh.start) - ws)/DAY);
    if(days[off]) days[off].push({id:sh.id, jobId:sh.jobId, start:toT(sh.start), end:toT(sh.end), breakMin:sh.breakMin||0});
  }
  return {ws, days, dirty:false};
}
function usualFor(weekday){ return S.roster.on ? S.roster.entries.filter(e => e.day === weekday && jobById(e.jobId)) : []; }
const entryKey = e => `${e.jobId}|${e.start}|${e.end}|${+e.breakMin||0}`;
function dayDiffers(d, off){
  if(!S.roster.on) return false;
  const wd = new Date(addDays(d.ws, off)).getDay();
  const a = d.days[off].map(entryKey).sort().join(","), b = usualFor(wd).map(entryKey).sort().join(",");
  return a !== b;
}
function weekEntryPay(d, off, e){
  const day = addDays(d.ws, off), j = jobById(e.jobId);
  const start = atTime(day, e.start); let end = atTime(day, e.end); if(end <= start) end = addDays(end, 1);
  return payShift({start, end, breakMin:num(e.breakMin), rate:rateFor(j, day), jobId:e.jobId, tips:0, extraPct:0});
}
function weekSummary(d){
  let t = zero(), n = 0;
  for(let i=0;i<7;i++) for(const e of d.days[i]) if(jobById(e.jobId)){ t = addPB(t, weekEntryPay(d, i, e)); n++; }
  const C = lastC || context();
  return `<b>${n} shift${n===1?"":"s"}</b> · ${hrs(t.hours)} · about <b>${money(C.shown(gross(t)))}</b>`;
}
function weekSheet(){
  const d = UI.sheet.data, jobs = activeJobs(), order = [0,1,2,3,4,5,6];
  const today = startOfDay(Date.now());
  const others = S.shifts.filter(x => shiftType(x)!=="work" && x.start >= d.ws && x.start < addDays(d.ws,7));
  const overrides = weekLocked(d.ws) || S.shifts.some(x => x.weekEdit && x.start >= Math.max(d.ws, Date.now()) && x.start < addDays(d.ws,7));
  return `<div class="sheet-b">
    <div class="navper"><button class="round" data-act="weekNav" data-v="-1" aria-label="Previous week" style="background:var(--card)">${ico("chevron-left","ico-sm")}</button>
      <div style="text-align:center"><b style="font-size:16px">${weekLabel(d.ws)}</b><div class="small muted" id="wk-sum">${weekSummary(d)}</div></div>
      <button class="round" data-act="weekNav" data-v="1" aria-label="Next week" style="background:var(--card)">${ico("chevron-right","ico-sm")}</button></div>
    ${weekLocked(d.ws) ? `<div class="warn" style="margin:0;background:var(--panel);color:var(--text)">${ico("calendar-check","ico-sm")}<span>This week has its own hours. Changes to your usual week won't affect it.</span></div>` : ""}
    <p class="small muted" style="margin:0">Change the days and hours for this week only. Your usual week stays as it is unless you choose to update it.</p>
    ${S.roster.on ? `<button class="link" data-act="weekFromUsual" style="color:var(--blue);font-weight:600;align-self:flex-start">${ico("copy","ico-sm")} Start from my usual week</button>` : ""}
    ${order.map(off => { const day = addDays(d.ws, off), wd = new Date(day).getDay(), es = d.days[off], past = day < today;
      const other = others.filter(x => startOfDay(x.start) === day);
      const outside = es.some(e => !covered(jobById(e.jobId), day));
      return `<div class="rday">
        <div class="dh"><span>${WD[wd]} <span class="muted" style="font-weight:500">${dm(day)}</span>${dayDiffers(d, off) ? ` <span class="st sent" style="margin-left:4px">Changed</span>` : ""}${past ? ` <span class="st" style="margin-left:4px">Past</span>` : ""}</span>
          <span class="row" style="gap:12px">${es.length ? `<button class="link xs" style="color:var(--muted);font-weight:600" data-act="weekDayOff" data-o="${off}">Day off</button>` : ""}${jobs.length ? `<button class="link" style="color:var(--green);font-weight:600" data-act="weekAdd" data-o="${off}">${ico("plus","ico-sm")} Add</button>` : ""}</span></div>
        ${other.map(x => `<div class="xs" style="padding:0 4px;color:${shiftType(x)==="holiday"?"var(--blue)":"var(--orange)"}">${ico(shiftType(x)==="holiday"?"tree-palm":"thermometer","ico-sm")} ${shiftType(x)==="holiday"?"Holiday":"Sick day"} booked</div>`).join("")}
        ${outside ? `<div class="xs" style="padding:0 4px;color:var(--red)">Outside your contract dates</div>` : ""}
        ${es.length ? es.map((e,i) => `<div class="rentry">
          ${jobs.length>1 || !jobById(e.jobId) ? fRow("Job", sel(`wk-j-${off}-${i}`, `data-bind="days.${off}.${i}.jobId"`, S.jobs.filter(j=>!j.archived||j.id===e.jobId).map(j=>[j.id,j.name]), e.jobId)) : ""}
          ${fRow("Start", `<input type="time" id="wk-s-${off}-${i}" data-bind="days.${off}.${i}.start" value="${e.start}">`)}
          ${fRow("End", `<input type="time" id="wk-e-${off}-${i}" data-bind="days.${off}.${i}.end" value="${e.end}">`)}
          <div class="f"><span>Unpaid break</span><input type="text" inputmode="numeric" autocomplete="off" id="wk-b-${off}-${i}" data-bind="days.${off}.${i}.breakMin" data-type="num" value="${e.breakMin}" style="max-width:60px"><span class="unit">min</span><button data-act="weekDel" data-o="${off}" data-i="${i}" aria-label="Remove shift" style="color:var(--red);margin-left:6px">${ico("trash-2","ico-sm")}</button></div>
        </div>`).join("") : `<div class="xs muted" style="padding:0 4px 4px">Day off</div>`}
      </div>`; }).join("")}
    <div class="stack" style="gap:8px;margin-top:6px">
      <button class="btn big" data-act="weekSaveOnly">${ico("calendar-check")} Save for this week only</button>
      <button class="btn ghost" data-act="weekSaveUsual" style="width:100%;background:var(--card);border:1px solid var(--line)">${ico("calendar-days","ico-sm")} Save and make this my usual week</button>
      ${overrides && S.roster.on ? `<button class="small" data-act="weekReset" style="padding:10px;font-weight:600;color:var(--red)">Undo this week's changes (back to my usual week)</button>` : ""}
      <p class="xs muted" style="margin:0;text-align:center">"This week only" keeps your usual week the same. "Make this my usual week" changes every week from now on.</p>
    </div>
  </div>`;
}
/* Writes the draft week into your shifts. Edited or added shifts are marked so the roster never overwrites them. */
const lockWeek = ws => { S.roster.locked = [...new Set([...(S.roster.locked||[]), toD(ws)])].filter(k => fromD(k) >= addDays(weekStart(Date.now()), -56)); };
const unlockWeek = ws => { S.roster.locked = (S.roster.locked||[]).filter(k => k !== toD(ws)); };
const weekLocked = ws => (S.roster.locked||[]).includes(toD(ws));
function applyWeek(d, onlyPast){
  const ws = d.ws, we = addDays(ws, 7), now = Date.now();
  if(!onlyPast) lockWeek(ws);
  const inWeek = S.shifts.filter(x => shiftType(x)==="work" && x.start >= ws && x.start < we && (!onlyPast || x.start <= now));
  const keep = new Set(); let changed = 0;
  for(let off=0; off<7; off++){
    const day = addDays(ws, off);
    if(onlyPast && atTime(day, "00:00") > now) continue;
    for(const e of d.days[off]){
      const j = jobById(e.jobId); if(!j) continue;
      const start = atTime(day, e.start); let end = atTime(day, e.end); if(end <= start) end = addDays(end, 1);
      if(onlyPast && start > now) continue;
      const br = Math.max(0, Math.round(num(e.breakMin)));
      const ex = e.id ? S.shifts.find(x => x.id === e.id) : null;
      if(ex){
        keep.add(ex.id);
        if(ex.start !== start || ex.end !== end || (ex.breakMin||0) !== br || ex.jobId !== e.jobId){
          Object.assign(ex, {start, end, breakMin:br, rate: ex.jobId !== e.jobId ? rateFor(j, day) : ex.rate, jobId:e.jobId, edited:true, weekEdit:true}); changed++;
        }
      } else {
        S.shifts.push({id:uid(), jobId:j.id, start, end, breakMin:br, rate:rateFor(j, day), extraPct:0, tips:0, notes:"", edited:true, weekEdit:true}); changed++;
      }
    }
  }
  const gone = inWeek.filter(x => !keep.has(x.id));
  if(gone.length){
    S.shifts = S.shifts.filter(x => !gone.includes(x));
    const keys = gone.filter(x => x.rosterKey).map(x => x.rosterKey);
    if(keys.length) S.roster.skips = [...new Set([...(S.roster.skips||[]), ...keys])].slice(-1000);
    changed += gone.length;
  }
  return changed;
}
function pinSheet(){
  const d = UI.sheet.data;
  return `<div class="sheet-b" style="align-items:center;text-align:center;padding-top:30px">
    <div class="tile lg" style="color:var(--ink)">${ico("lock")}</div>
    <b style="font-size:18px">${d.step === 1 ? "Choose a 4-digit passcode" : "Enter it again to confirm"}</b>
    <span class="small muted">${d.mismatch ? "Those didn't match. Try again." : "You'll enter it when you open ClockMe or come back to it after a minute away."}</span>
    ${pinDots(d.pin.length, d.mismatch)}${keypad("setPinKey")}</div>`;
}
const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e||"").trim());
const okPhoto = p => typeof p === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p);
/* Square-crops and shrinks a picked photo so it stays small enough to sync (about 10–20 KB). */
function makeAvatar(file){
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      try{
        const w = img.naturalWidth, h = img.naturalHeight, side = Math.min(w, h), n = 240;
        if(!side) throw new Error("empty");
        const c = document.createElement("canvas"); c.width = c.height = n;
        const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, n, n);
        x.imageSmoothingQuality = "high";
        x.drawImage(img, (w - side)/2, (h - side)/2, side, side, 0, 0, n, n);
        URL.revokeObjectURL(url); res(c.toDataURL("image/jpeg", .82));
      }catch(e){ URL.revokeObjectURL(url); rej(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("unreadable")); };
    img.src = url;
  });
}
function avatarEdit(size, where){
  const has = where === "ob" ? okPhoto(UI.obDraft && UI.obDraft.photo) : okPhoto(S.settings.photo);
  return `<label class="avedit" aria-label="${has?"Change":"Add"} profile photo">${avatarHTML(size, where)}<span class="cam">${ico(has?"pencil":"camera")}</span><input type="file" accept="image/*" data-photo="${where||"me"}" hidden></label>`;
}
function avatarHTML(size=56, where){
  const st = S.settings, me = UI.me;
  const photo = where === "ob" ? (UI.obDraft && UI.obDraft.photo) : st.photo;
  if(okPhoto(photo)) return `<img class="avimg" src="${photo}" alt="Profile photo" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex:none">`;
  if(me && me.avatar) return `<img src="${esc(me.avatar)}" alt="" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex:none">`;
  const n = (st.name || (UI.obDraft && UI.obDraft.name) || "S").trim()[0] || "S";
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:700;font-size:${Math.round(size*.4)}px;background:linear-gradient(180deg,var(--hero1),var(--hero2));flex:none">${esc(n.toUpperCase())}</div>`;
}
function accountCard(){
  const me = UI.me;
  return me ? `<div class="acct">${avatarHTML(44)}<div style="flex:1;min-width:0"><b>${esc(me.name || "Your account")}</b><div class="small muted" style="overflow:hidden;text-overflow:ellipsis">${esc(me.email || "Signed in")}</div></div><span class="st paid">${ico("shield-check","ico-sm")} Signed in</span></div>
    <div class="foot" style="margin-top:-10px">Your data is private to you and syncs to your other devices.</div>`
    : `<div class="acct">${ico("cloud-off")}<div style="flex:1"><b>Not signed in</b><div class="small muted">Your data stays on this device.</div></div></div>`;
}
function choice(act, v, on, icon, title, sub){ return `<button class="choice ${on?"on":""}" data-act="${act}" data-v="${v}"><span class="tile">${ico(icon)}</span><span><b>${title}</b><span class="s">${sub}</span></span><span class="rad"></span></button>`; }
function onboardingHTML(entering){
  if(!UI.obDraft) UI.obDraft = obDefaults();
  const o = UI.obDraft, steps = obSteps(); if(UI.ob >= steps.length) UI.ob = steps.length - 1;
  const step = steps[UI.ob];
  if(step === "name"){ if(UI.auth === "login") return loginHTML(entering); if(UI.auth !== "signup") return welcomeHTML(entering); }
  const code = o.region === "custom" ? o.customCur : REGIONS[o.region].cur;
  const sym = curSymbol(code);
  const h = (t, sub) => `<h1 class="bigt" style="font-size:28px">${t}</h1>${sub?`<p class="muted" style="margin:0;line-height:1.45">${sub}</p>`:""}`;
  let body;
  if(step==="name") body = "";
  else if(step==="work") body = `${h("How do you work?","This decides how tax is worked out and whether you need invoices.")}
    <div class="list">${Object.entries(WORKTYPES).map(([k,v])=>choice("obWork",k,o.workType===k,v[2],v[0],v[1])).join("")}</div>
    <div class="fsec"><label class="h">Your age group</label><div class="chips" style="margin:0;padding:0;flex-wrap:wrap">${AGE_BANDS.map(([k,l])=>`<button class="fchip ${o.ageBand===k?"on":""}" data-act="obAge" data-v="${k}">${l}</button>`).join("")}</div>
      <div class="foot">Used only to check you're paid at least the minimum wage for your age.</div></div>`;
  else if(step==="country") body = `${h("Where do you work?","This sets your currency and tax rules.")}
    <div class="list">${Object.entries(REGIONS).map(([k,v])=>`<button class="region ${o.region===k?"on":""}" data-act="obRegion" data-v="${k}"><span class="fl">${v.flag}</span><span><b>${v.title}</b><div class="small muted">${k==="custom"?"Set your own tax %":v.cur}</div></span><span class="rad"></span></button>`).join("")}</div>
    ${o.region==="custom"?`<div class="fgroup">${fRow("Currency",sel("ob-cur",'data-ob="customCur"',CURRENCIES.map(c=>[c,c]),o.customCur))}${fRow("Tax rate",`<input type="text" inputmode="decimal" autocomplete="off" class="pct" id="ob-cpct" data-ob="customPct" value="${o.customPct}" step="any"><span class="unit">%</span>`)}</div>`:""}
    <div class="fsec"><b>What do you want to see?</b><div class="seg"><button class="${o.take?"on":""}" data-act="obTake" data-v="1">After tax</button><button class="${!o.take?"on":""}" data-act="obTake" data-v="0">Before tax only</button></div><div class="foot">You can change this any time.</div></div>`;
  else if(step==="tax"){
    let q = "";
    if(o.region==="uk"||o.region==="scotland") q = `<div class="fgroup">${fRow("Student loan",sel("ob-loan",'data-ob="loan"',Object.entries(LOANS).map(([k,v])=>[k,v[0]]),o.loan))}<div class="f"><span>Postgraduate loan</span>${toggleHTML("ob-pg",'data-ob="postgrad" data-type="bool"',o.postgrad)}</div></div>`;
    else if(o.region==="us") q = `<div class="fgroup">${fRow("Filing status",sel("ob-fil",'data-ob="filing"',[["single","Single"],["married","Married filing jointly"]],o.filing))}${fRow("State & local tax",`<input type="text" inputmode="decimal" autocomplete="off" class="pct" id="ob-st" data-ob="statePct" value="${o.statePct}" placeholder="0" step="any"><span class="unit">%</span>`)}</div><div class="foot">Not sure? Most states are 0–6%. Leave it at 0 for Texas, Florida and other no-income-tax states.</div>`;
    body = `${h("A bit about your tax","So your take-home estimate matches your payslip as closely as possible.")}${q}
      <div class="fgroup">${fRow("Pension you pay in",`<input type="text" inputmode="decimal" autocomplete="off" class="pct" id="ob-pen" data-ob="pensionPct" value="${o.pensionPct}" placeholder="0" step="any"><span class="unit">%</span>`)}</div>
      <div class="foot">UK workplace pensions are often 5%. Leave at 0 if you've opted out or don't know.</div>`;
  }
  else if(step==="pay") body = `${h("When do you get paid?","We'll count down to payday and show what's coming.")}
    <div class="list">${Object.entries(FREQS).map(([k,v])=>choice("obFreq",k,o.payFreq===k,"wallet",v[0],k==="monthly"?"Same date each month":`Every ${v[1]} days`)).join("")}</div>
    <div class="fgroup">${fRow("Your next payday",`<input type="date" id="ob-pd" data-ob="payday" value="${o.payday}">`)}${fRow("Week starts on",sel("ob-ws",'data-ob="weekStart" data-type="num"',[[1,"Monday"],[0,"Sunday"],[6,"Saturday"]],o.weekStart))}</div>
    <div class="foot">The week start is used for weekly totals and overtime.</div>`;
  else if(step==="job") body = `${h("Your main job","Add the extra % you get on weekends or nights. You can add more jobs later.")}
    <div class="fgroup">
      <div class="f"><input class="full" id="ob-job" data-ob="job" placeholder="Job name, e.g. Costa" value="${esc(o.job)}"></div>
      ${fRow("Hourly rate",`<span class="unit">${sym}</span><input type="text" inputmode="decimal" autocomplete="off" id="ob-rate" data-ob="rate" value="${o.rate}" placeholder="0.00" step="any">`)}
      ${fRow("Usual unpaid break",`<input type="text" inputmode="numeric" autocomplete="off" id="ob-brk" data-ob="breakMin" value="${o.breakMin}" step="5" style="max-width:60px"><span class="unit">min</span>`)}
      ${fRow("Saturday extra",`<input type="text" inputmode="decimal" autocomplete="off" class="pct" id="ob-sat" data-ob="sat" value="${o.sat}" placeholder="0" step="any"><span class="unit">%</span>`)}
      ${fRow("Sunday extra",`<input type="text" inputmode="decimal" autocomplete="off" class="pct" id="ob-sun" data-ob="sun" value="${o.sun}" placeholder="0" step="any"><span class="unit">%</span>`)}
      <div class="f"><span>Extra pay for nights</span>${toggleHTML("ob-night",'data-ob="nightOn" data-type="bool" data-rerender="1"',o.nightOn)}</div>
      ${o.nightOn?fRow("Night extra (10pm–6am)",`<input type="text" inputmode="decimal" autocomplete="off" class="pct" id="ob-np" data-ob="nightPct" value="${o.nightPct}" placeholder="0" step="any"><span class="unit">%</span>`):""}
      ${o.workType==="both"?`<div class="f"><span>This job is self-employed</span>${toggleHTML("ob-self",'data-ob="selfJob" data-type="bool" data-rerender="1"',o.selfJob)}</div>`:""}
      ${(o.workType==="self"||o.selfJob)?`<div class="f"><input class="full" id="ob-client" data-ob="client" placeholder="Who do you invoice? (client name)" value="${esc(o.client)}"></div>`:""}
    </div>
    <div class="fsec"><label class="h">Your contract</label><div class="fgroup">
      ${fRow("Contract type",sel("ob-ct",'data-ob="ctType" data-rerender="1"',Object.entries(CONTRACT_TYPES),o.ctType))}
      ${fRow("Started on",`<input type="date" id="ob-cs" data-ob="ctStart" value="${o.ctStart}">`)}
      <div class="f"><span>It has an end date</span>${toggleHTML("ob-che",'data-ob="ctHasEnd" data-type="bool" data-rerender="1"',o.ctHasEnd)}</div>
      ${o.ctHasEnd?fRow("Ends on",`<input type="date" id="ob-ce" data-ob="ctEnd" value="${o.ctEnd}">`):""}
      ${fRow("Contracted hours",`<input type="text" inputmode="decimal" autocomplete="off" id="ob-ch" data-ob="ctHours" value="${o.ctHours}" placeholder="optional" style="max-width:80px"><span class="unit">h / week</span>`)}
    </div><div class="foot">${o.ctHasEnd?"ClockMe stops planning shifts after your last day and reminds you before the contract ends.":"Permanent or rolling? Leave the end date off."}</div></div>`;
  else if(step==="week"){
    const order = [0,1,2,3,4,5,6].map(i => (+o.weekStart + i) % 7);
    body = `${h("Your usual week","Pick the days you normally work. ClockMe adds them as scheduled shifts every week, so you don't have to.")}
      <div class="daygrid">${order.map(i=>`<button class="${o.days[i].on?"on":""}" data-act="obDay" data-d="${i}">${WDS[i]}</button>`).join("")}</div>
      ${order.filter(i=>o.days[i].on).length?`<div class="fgroup">${order.filter(i=>o.days[i].on).map(i=>`<div class="f"><span>${WDS[i]}</span><input type="time" id="ob-ds-${i}" data-ob="days.${i}.start" value="${o.days[i].start}" style="max-width:110px"><span class="unit">to</span><input type="time" id="ob-de-${i}" data-ob="days.${i}.end" value="${o.days[i].end}" style="max-width:110px"></div>`).join("")}</div>`:""}
      <div class="fgroup"><div class="f"><span>Fill my calendar with these shifts</span>${toggleHTML("ob-ro",'data-ob="rosterOn" data-type="bool" data-rerender="1"',o.rosterOn)}</div>
        ${o.rosterOn?`${fRow("How far ahead",sel("ob-hz",'data-ob="rosterMonths" data-type="num"',HORIZONS,o.rosterMonths||2))}
        <div class="f"><span>Also add shifts I've already worked this month</span>${toggleHTML("ob-back",'data-ob="backfill" data-type="bool"',o.backfill)}</div>`:""}</div>
      <div class="foot">${o.rosterOn?`Every ${order.filter(i=>o.days[i].on).map(i=>WDS[i]).join(", ")||"day you pick"} goes into your calendar. You can change or delete any single day later.`:"Rota changes week to week? Leave this off and scan your rota from the Roster button instead."}</div>`;
  }
  else if(step==="business") body = `${h("Your invoice details","These go on every invoice. You can skip and add them later.")}
    <div class="fgroup">
      <div class="f"><input class="full" id="ob-bn" data-ob="biz.name" placeholder="Your name or business name" value="${esc(o.biz.name)}"></div>
      <div class="f"><input class="full" id="ob-be" data-ob="biz.email" type="email" placeholder="Email for invoices" value="${esc(o.biz.email || o.email)}"></div>
      <div class="f"><textarea id="ob-ba" data-ob="biz.address" placeholder="Address" style="min-height:56px">${esc(o.biz.address)}</textarea></div>
      <div class="f"><input class="full" id="ob-bs" data-ob="biz.sortCode" placeholder="Sort code" value="${esc(o.biz.sortCode)}"></div>
      <div class="f"><input class="full" id="ob-bac" data-ob="biz.accountNumber" placeholder="Account number" value="${esc(o.biz.accountNumber)}"></div>
    </div>`;
  else body = `${h("Saving for something?","Set a goal and watch your shifts fill it up. Optional.")}
    <div class="fgroup">
      <div class="f"><input class="full" id="ob-gt" data-ob="goalTitle" placeholder="e.g. Summer holiday, first car" value="${esc(o.goalTitle)}"></div>
      ${fRow("Target",`<span class="unit">${sym}</span><input type="text" inputmode="decimal" autocomplete="off" id="ob-ga" data-ob="goalTarget" value="${o.goalTarget}" placeholder="0" step="any">`)}
      ${fRow("By",`<input type="date" id="ob-gd" data-ob="goalDate" value="${o.goalDate}">`)}
    </div>
    <div class="fsec"><label class="h">Pick your look</label>${swatchesHTML(S.settings.appearance)}</div>`;
  const last = UI.ob === steps.length - 1;
  const canNext = step !== "name" || (o.name.trim() && validEmail(o.email));
  if(step === "name") return signupHTML(entering, canNext);
  const qs = steps.slice(1), qi = UI.ob - 1;
  const pose = {work:"laptop", country:"idle", tax:"bulb", pay:"envelope", job:"laptop", week:"coffee", business:"envelope", goal:"bulb"}[step] || "idle";
  return `<div class="ob q ${entering?"enter":""}">
    <div class="qtop"><button class="qround" data-act="obBack" aria-label="Back">${ico("chevron-left")}</button>
      <div class="dots" style="grid-template-columns:repeat(${qs.length},1fr)">${qs.map((_,i)=>`<i class="${i<=qi?"on":""}"></i>`).join("")}</div><span class="qcount">${qi+1}/${qs.length}</span></div>
    <div class="mslot">${mascotSVG(pose)}</div>
    <div class="stack obbody" style="gap:18px;flex:1">${body}</div>
    <div class="stack" style="gap:6px">
      <button class="btn big" data-act="obNext" id="obnext">${last?"Finish setup":"Continue"}</button>
      ${["tax","pay","week","business","goal"].includes(step)?`<button class="small muted" data-act="obSkipStep" style="padding:12px;font-weight:600">Skip this step</button>`:""}
    </div></div>`;
}
function finishOnboarding(){
  const o = UI.obDraft, st = S.settings;
  Object.assign(st, {ageBand:o.ageBand || "21+", name:o.name.trim(), email:String(o.email||"").trim(), workType:o.workType, region:o.region, showTakeHome:o.take, loan:o.loan, postgrad:o.postgrad, filing:o.filing, statePct:clamp(num(o.statePct),0,20), customPct:clamp(num(o.customPct),0,90), customCur:o.customCur, pensionPct:clamp(num(o.pensionPct),0,60), weekStart:+o.weekStart, onboarded:true});
  if(okPhoto(o.photo)) st.photo = o.photo;
  if(o.workType !== "self" && o.hasPayday){ st.payFreq = o.payFreq; st.payday = o.payday; }
  let job = null;
  if(o.job.trim()){
    job = S.jobs.find(j => j.name.toLowerCase() === o.job.trim().toLowerCase());
    if(!job){ job = newJob(); S.jobs.push(job); }
    Object.assign(job, {name:o.job.trim(), rate:Math.max(0,num(o.rate)), breakMin:Math.max(0,Math.round(num(o.breakMin))), nightOn:!!o.nightOn, nightPct:clamp(num(o.nightPct),-100,500), selfEmployed: o.workType==="self" || (o.workType==="both" && o.selfJob)});
    job.weekday[0] = clamp(num(o.sun),-100,500); job.weekday[6] = clamp(num(o.sat),-100,500);
    if(o.ctStart){ const end = o.ctHasEnd && o.ctEnd ? fromD(o.ctEnd) : 0;
      job.contracts = [{id:uid(), type:o.ctType, start:fromD(o.ctStart), end: end && end >= fromD(o.ctStart) ? end : 0, hours:Math.max(0,num(o.ctHours)), rate:0, notice:"", probationEnd:0, notes:""}]; }
    if(job.selfEmployed && o.client.trim()) job.client.name = o.client.trim();
  }
  if(o.workType !== "employed") Object.assign(S.business, Object.fromEntries(Object.entries(o.biz).filter(([k,v])=>v)));
  if(!S.business.email && st.email) S.business.email = st.email;
  if(!S.business.name && st.name && o.workType !== "employed") S.business.name = st.name;
  if(job && o.rosterOn){
    const days = Object.entries(o.days).filter(([,v])=>v.on);
    if(days.length){
      S.roster.entries = S.roster.entries.filter(e => e.jobId !== job.id);
      for(const [i, v] of days) S.roster.entries.push({id:uid(), day:+i, jobId:job.id, start:v.start, end:v.end, breakMin:job.breakMin});
      S.roster.on = true; S.roster.months = +o.rosterMonths || 2;
      S.roster.since = o.backfill ? monthStart(Date.now()) : Date.now();
    }
  }
  if(o.goalTitle.trim() && num(o.goalTarget) > 0) S.goals.push({id:uid(), title:o.goalTitle.trim(), subtitle:"", icon:"flag", color:"#2DB52D", target:num(o.goalTarget), start:startOfDay(Date.now()), deadline:fromD(o.goalDate)});
  const from = mascotRect();
  const steps = ["Saving your details", job ? `Adding ${job.name}` : null, S.settings.showTakeHome ? "Setting up your tax" : null, S.roster.on ? "Filling your calendar" : null, S.goals.length ? "Setting your goal" : null, "Working out your pay", "All done!"].filter(Boolean);
  syncRoster(); save(); UI.obDraft = null; UI.ob = 0; UI.auth = null; UI.tab = "home"; UI.stack = [];
  window.scrollTo(0,0); UI.noEnter = true; render(); UI.noEnter = false;
  track("setup_finished", setupSummary());
  poloLoader(from, steps, () => {
    lastView = ""; render(); // the app rises in as Polo bursts
    setTimeout(() => { const lm = document.querySelector(".logo .mascot"); if(lm) lm.classList.add("landed"); mascotHappy(900); }, 420);
    if(S.roster.on) toast(`All set. Your calendar is filled until ${dm(rosterHorizon()-DAY)}.`, "See it", () => { UI.tab = "shifts"; UI.shiftView = "calendar"; UI.calMonth = Date.now(); UI.calDay = toD(Date.now()); render(); });
    else toast("You're all set");
  });
}

/* ============ Actions ============ */
function newJob(){ return {id:uid(), contracts:[], holiday:"none", holidayPct:12.07, breakAfter:0, name:"", rate:0, icon:"briefcase", color:PALETTE[S.jobs.length % PALETTE.length], breakMin:0, weekday:[0,0,0,0,0,0,0], nightOn:false, nightStart:1320, nightEnd:360, nightPct:0, otOn:false, otAfter:40, otMult:1.5, special:[], archived:false, selfEmployed:false, client:{name:"",address:"",email:""}}; }
function openShift(s, dayMs, type){
  if(s){ UI.sheet = {kind:"shift", data:{id:s.id, type:shiftType(s), paidSick:!!s.paidSick, jobId:s.jobId, start:s.start, endTime:toT(s.end), breakMin:s.breakMin, breakTouched:true, rate:s.rate, extraPct:s.extraPct, tips:s.tips, notes:s.notes}}; }
  else {
    const j = activeJobs()[0]; const st = new Date(dayMs || Date.now()); st.setHours(9,0,0,0);
    const q = j ? quickTimes(j.id)[0] : null;
    const [qs, qe] = q ? q.split("–") : ["09:00","17:00"];
    const start = atTime(st.getTime(), qs), end0 = atTime(st.getTime(), qe), end = end0 <= start ? addDays(end0,1) : end0;
    UI.sheet = {kind:"shift", data:{id:null, type:type||"work", paidSick:false, jobId:j?j.id:null, start, endTime:qe, breakMin:breakFor(j, start, end), rate:rateFor(j, start), extraPct:0, tips:0, notes:""}};
  }
  render();
}
function dialog(title, message, actions){ UI.dialog = {title, message, actions}; render(); }
let toastTimer;
function toast(t, actionLabel, action){
  const old = document.querySelector(".toast"); if(old) old.remove();
  const el = document.createElement("div"); el.className = "toast"; el.textContent = t;
  if(actionLabel){ const b = document.createElement("button"); b.textContent = actionLabel; b.style.cssText = "margin-left:12px;color:var(--green);font-weight:700"; b.onclick = () => { el.remove(); action(); }; el.appendChild(b); }
  document.body.appendChild(el); clearTimeout(toastTimer); toastTimer = setTimeout(()=>el.remove(), actionLabel ? 5000 : 2000);
}
function buzz(){ try{ navigator.vibrate && navigator.vibrate(10); }catch(e){} }
function clockIn(j, planId){ buzz(); S.clock = {jobId:j.id, start:Date.now(), breakStart:null, breakSec:0, planId:planId || null}; save(); track("clocked_in", {from_roster: !!planId}); toast(`Clocked in · ${j.name}`); render(); setTimeout(() => boop(), 60); }
async function saveFile(filename, data){
  let dl = null;
  try{ dl = window.claude && claude.use ? await claude.use("downloads") : null; }catch(e){}
  if(!dl){ // on the web: share sheet on phones, normal download elsewhere
    try{
      const type = /\.pdf$/.test(filename) ? "application/pdf" : /\.csv$/.test(filename) ? "text/csv" : /\.json$/.test(filename) ? "application/json" : "application/octet-stream";
      const blob = data instanceof Blob ? data : new Blob([data], {type});
      const file = typeof File === "function" ? new File([blob], filename, {type}) : null;
      if(file && navigator.canShare && /iPhone|iPad|Android/i.test(navigator.userAgent) && navigator.canShare({files:[file]})){ await navigator.share({files:[file], title:filename}); return true; }
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); return true;
    }catch(e){ toast(e && e.name === "AbortError" ? "Download cancelled" : "Couldn't save the file"); return false; }
  }
  try{ await dl.save({filename, data}); return true; }
  catch(e){ toast(e && e.code === "declined" ? "Download cancelled" : "Couldn't save the file"); return false; }
}
async function exportCSV(){
  if(!S.shifts.length){ toast("No shifts to export yet"); return; }
  const C = context();
  const head = ["Date","Job","Start","End","Unpaid break (min)","Paid hours","Rate","Base pay","Premium pay","Premium details","Overtime hours","Overtime pay","Tips","Gross","Type","Status"].concat(C.tax.on?["Est. deductions","Est. after tax"]:[]).concat(["Notes"]);
  const q = v => { v = String(v ?? ""); return /[",\n]/.test(v) ? `"${v.replace(/"/g,'""')}"` : v; };
  const rows = [head.map(q).join(",")];
  for(const s of [...S.shifts].sort((a,b)=>a.start-b.start)){
    const p = C.pay(s), j = jobById(s.jobId), g = gross(p);
    const r = [toD(s.start), j?j.name:"", toT(s.start), toT(s.end), s.breakMin, p.hours.toFixed(2), (+s.rate).toFixed(2), p.base.toFixed(2), p.premium.toFixed(2), Object.entries(p.parts).map(([l,v])=>`${l}: ${v.toFixed(2)}`).join("; "), p.otHours.toFixed(2), p.ot.toFixed(2), p.tips.toFixed(2), g.toFixed(2), {work:"Work",holiday:"Holiday",sick:s.paidSick?"Sick (paid)":"Sick (unpaid)"}[shiftType(s)], isFuture(s)?"Scheduled":"Worked"];
    if(C.tax.on){ const n = C.shown(g); r.push((g-n).toFixed(2), n.toFixed(2)); }
    r.push(s.notes||""); rows.push(r.map(q).join(","));
  }
  const csv = rows.join("\n");
  if(!(await saveFile(`ClockMe-${toD(Date.now())}.csv`, csv))){ try{ await navigator.clipboard.writeText(csv); toast("CSV copied to clipboard instead"); }catch(e){} }
}
function rosterPrompt(d){
  const ws = weekStart(Date.now());
  return `You read work rotas (rosters) and pull out one person's shifts.
Today is ${toD(Date.now())} (${WD[new Date().getDay()]}). This week started on ${toD(ws)} (${WD[S.settings.weekStart]}).
The person's name: "${d.name || "(not given)"}".

Rules:
- If the rota lists several people, return only this person's shifts. If it is clearly a list of just their own shifts (for example a screenshot of a rota app's "My shifts" screen, in any language), take all of them even if no name is shown.
- Use any date range or month shown on the rota (e.g. "16 - 22 Nov") together with the day numbers to get exact dates.
- Times may be written 24-hour ("16:00 - 22:00") or 12-hour ("4pm-10pm", "4:00 PM"); convert to 24-hour.
- Give each shift a calendar date as YYYY-MM-DD. If the rota only shows weekday names, use the matching day of the week that starts ${toD(ws)}, unless the rota says it is for next week, then add 7 days. If a date has no year, pick the year that puts it nearest to today.
- Times as 24-hour HH:MM. "9-5" means 09:00 to 17:00. If an end time is earlier than the start, the shift ends after midnight; keep the times as written.
- breakMin: the unpaid break in minutes if the rota states one, otherwise null.
- note: a short role, department or location if shown (e.g. "F&B Outlets"), otherwise "". Ignore labels like "Normal" or "Confirmed".
- Skip days off, holidays, "OFF", "AL", "rest" and blank days.

Reply with only JSON in this shape:
{"shifts":[{"date":"2026-11-17","start":"09:00","end":"17:30","breakMin":30,"note":""}],"warning":""}
Put a short note in "warning" if anything was hard to read or you were unsure whose row it was, otherwise "".

Rota text (may be empty if a photo is attached):
"""
${(d.text || "").slice(0, 8000)}
"""`;
}
/* Turns any picked photo (iPhone HEIC, huge camera shots, PNG screenshots) into a clean JPEG Claude can read. */
async function prepRotaImage(file){
  try{
    let src, w, h, done = () => {};
    try{ src = await createImageBitmap(file); w = src.width; h = src.height; done = () => src.close && src.close(); }
    catch(e){
      src = await new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image();
        im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = () => { URL.revokeObjectURL(u); rej(e); }; im.src = u; });
      w = src.naturalWidth; h = src.naturalHeight;
    }
    if(!w || !h) throw new Error("empty");
    const k = Math.min(1, 1800 / Math.max(w, h)), c = document.createElement("canvas");
    c.width = Math.round(w * k); c.height = Math.round(h * k);
    const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
    x.imageSmoothingQuality = "high"; x.drawImage(src, 0, 0, c.width, c.height); done();
    const blob = await new Promise(r => c.toBlob(r, "image/jpeg", 0.9));
    if(blob && blob.size) return blob;
  }catch(e){}
  return null; // the browser couldn't open it
}
/* ============ Usage stats (PostHog, EU Cloud) ============
   Website build only, and only after the person says yes (Profile can turn it off again).
   Events carry what was used, never who or how much: no names, emails, pay, rates, tax, times or notes.
   Autocapture, heatmaps and session replay stay off because they would pick up on-screen text such as pay. */
const PH = (window.CLOCKME_CFG || {}).posthog || null;
const STATS_KEY = "clockme-stats";
const statsAvailable = () => HOSTED && !!(PH && PH.key && PH.host);
function statsChoice(){ try{ return localStorage.getItem(STATS_KEY) || ""; }catch(e){ return ""; } }
let phLoaded = false;
function startStats(){
  if(phLoaded || !statsAvailable() || statsChoice() !== "yes") return;
  phLoaded = true;
  try{
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],Object.defineProperty(u,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e}}),Object.defineProperty(u.people,"toString",{configurable:!0,enumerable:!0,writable:!0,value:function(){return u.toString(1)+".people (stub)"}}),o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagResult isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    posthog.init(PH.key, {
      api_host: PH.host,
      defaults: PH.defaults,
      persistence: "localStorage",
      person_profiles: "identified_only",
      autocapture: false,
      enable_heatmaps: false,
      capture_dead_clicks: false,
      disable_session_recording: true,
      capture_exceptions: true,
      mask_all_text: true,
      mask_all_element_attributes: true
    });
    const standalone = !!(window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
    posthog.register({app_version:"1.0", installed: standalone});
  }catch(e){ phLoaded = false; }
}
const statsOn = () => phLoaded && statsChoice() === "yes";
function track(event, props){ if(!statsOn()) return; try{ posthog.capture(event, props || {}); }catch(e){} }
function setupSummary(){
  const st = S.settings;
  return {work_type: st.workType, country: st.region, jobs: S.jobs.length, roster_on: !!S.roster.on, goals: S.goals.length,
    shifts: S.shifts.filter(s => !isFuture(s)).length, take_home_on: !!st.showTakeHome, passcode_on: !!st.pinOn};
}
function setStats(on){
  try{ localStorage.setItem(STATS_KEY, on ? "yes" : "no"); }catch(e){}
  if(!on){ if(phLoaded) try{ posthog.opt_out_capturing(); }catch(e){} return; }
  if(phLoaded){ try{ posthog.opt_in_capturing(); }catch(e){} }
  else startStats();
  track("stats_turned_on", setupSummary());
}
function statsCardHTML(){
  if(!statsAvailable() || statsChoice() || !S.settings.onboarded) return "";
  return `<div class="statsask glass" role="region" aria-label="Usage stats">
    <div class="sa-m" aria-hidden="true">${mascotSVG("bulb")}</div>
    <div class="sa-b"><b>Help Polo make ClockMe better?</b>
      <p>Share anonymous stats on which features get used. Never your pay, name or tax details. You can change this in Profile.</p>
      <div class="sa-a"><button class="btn" data-act="statsYes">Sure</button><button class="btn ghost" data-act="statsNo">No thanks</button></div></div>
  </div>`;
}

/* ============ ClockMe Pro (Stripe, website only) ============
   No accounts yet: after Stripe Checkout the server gives this device a signed pass (customer + subscription),
   kept in S.settings.pro so it also travels in backups. Until Stripe is set up (/api/billing says not ready),
   everything stays unlocked. In the Claude preview there's no billing at all. */
const BILL_KEY = "clockme-billing", DEV_KEY = "clockme-device", PENDING_KEY = "clockme-checkout";
UI.online = navigator.onLine !== false;
UI.billing = (() => { try{ return JSON.parse(localStorage.getItem(BILL_KEY) || "null"); }catch(e){ return null; } })();
UI.proPlan = "yearly";
const billingOn = () => HOSTED && !!(UI.billing && UI.billing.ready && (UI.billing.plans || []).length);
function deviceId(){
  let d = ""; try{ d = localStorage.getItem(DEV_KEY) || ""; }catch(e){}
  if(!/^[a-zA-Z0-9-]{8,64}$/.test(d)){ d = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (uid() + "-" + uid()); try{ localStorage.setItem(DEV_KEY, d); }catch(e){} }
  return d;
}
const proSub = () => (S.settings.pro && S.settings.pro.sub) || null;
function isPro(){
  if(!billingOn()) return true;
  const sub = proSub(); if(!sub || !sub.pro) return false;
  const end = Math.max(sub.until || 0, sub.trialEnd || 0) * 1000;
  return !end || end > Date.now() - 3*DAY; // a few days' grace offline
}
async function billApi(body){
  let r; try{ r = await fetch("/api/billing", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)}); }
  catch(e){ throw {code:"offline"}; }
  const j = await r.json().catch(() => ({}));
  if(!r.ok) throw {code: j.code || "error", status: r.status};
  return j;
}
function setPro(j){ S.settings.pro = {pass:j.pass, sub:j.sub, checkedAt:Date.now()}; save(); }
async function claimCheckout(session, quiet){
  try{
    const j = await billApi({action:"claim", session, device:deviceId()});
    setPro(j); try{ localStorage.removeItem(PENDING_KEY); }catch(e){}
    track("pro_started", {plan: j.sub && j.sub.plan, status: j.sub && j.sub.status});
    if(!quiet){ UI.sheet = null; render(); confetti(); mascotHappy && mascotHappy(1400);
      toast(j.sub && j.sub.status === "trialing" ? `Welcome to Pro! Your free trial ends ${dm(j.sub.trialEnd*1000)}` : "Welcome to ClockMe Pro!"); }
    return true;
  }catch(e){
    if(["not_yours","not_found","bad_request"].includes(e.code)) try{ localStorage.removeItem(PENDING_KEY); }catch(x){}
    if(!quiet) toast(e.code === "not_finished" ? "Your payment is still finishing. Open ClockMe again in a minute." : "Couldn't confirm Pro yet. Open ClockMe again in a minute.");
    return false;
  }
}
async function refreshBilling(force, returning){
  if(!HOSTED) return;
  try{ const r = await fetch("/api/billing"); if(r.ok){ UI.billing = await r.json(); try{ localStorage.setItem(BILL_KEY, JSON.stringify(UI.billing)); }catch(e){} } }catch(e){}
  if(!billingOn()){ render(); return; }
  let pend = null; try{ pend = localStorage.getItem(PENDING_KEY); }catch(e){}
  const pr = S.settings.pro;
  // Coming back from Stripe Checkout, handleBillingReturn claims it; claiming here too made two requests,
  // and the later one could close whatever the person had just opened.
  if(pend && !returning && !(pr && pr.pass)) await claimCheckout(pend, true);
  else if(pr && pr.pass && (force || Date.now() - (pr.checkedAt || 0) > 6*3600e3)){
    try{ setPro(await billApi({action:"status", pass:pr.pass})); }
    catch(e){ if(e.code === "bad_pass"){ delete S.settings.pro; save(); } }
  }
  render();
}
function handleBillingReturn(){
  if(!HOSTED) return;
  const q = new URLSearchParams(location.search), c = q.get("checkout"), sid = q.get("session_id"), portal = q.get("portal");
  if(!c && !portal) return;
  try{ history.replaceState(null, "", location.pathname); }catch(e){}
  if(c === "done" && sid){ setTimeout(() => claimCheckout(sid, false), 400); return true; }
  if(c === "cancelled"){ try{ localStorage.removeItem(PENDING_KEY); }catch(e){} setTimeout(() => toast("No problem. You haven't been charged"), 400); }
  if(portal) return "portal";
}
function openPro(reason){
  if(!billingOn()) return;
  UI.sheet = {kind:"pro", data:{reason: reason || "profile"}}; render();
  track("paywall_viewed", {reason: reason || "profile"});
}
// Gate for Pro-only actions. Returns true when the action may go ahead.
function proOK(reason){ if(isPro()) return true; openPro(reason); return false; }
const planMoney = (p, amount) => { try{ return new Intl.NumberFormat(undefined, {style:"currency", currency:(p.currency||"gbp").toUpperCase()}).format((amount ?? p.amount)/100); }catch(e){ return ((amount ?? p.amount)/100).toFixed(2); } };
async function startCheckout(){
  const plan = UI.proPlan || "yearly", b = document.getElementById("probuy");
  if(b){ b.disabled = true; b.innerHTML = `<span class="spin"></span><span>Opening secure checkout…</span>`; }
  try{
    const j = await billApi({action:"checkout", plan, device:deviceId(), email:S.settings.email || ""});
    try{ localStorage.setItem(PENDING_KEY, j.id); }catch(e){}
    track("checkout_started", {plan});
    location.href = j.url;
  }catch(e){
    toast(e.code === "not_setup" ? "ClockMe Pro isn't available yet" : e.code === "offline" ? "You're offline. Connect and try again." : "Couldn't open checkout. Try again in a moment.");
    render();
  }
}
async function openPortal(){
  const pr = S.settings.pro; if(!pr || !pr.pass) return openPro("profile");
  toast("Opening your subscription…");
  try{ const j = await billApi({action:"portal", pass:pr.pass}); location.href = j.url; }
  catch(e){ toast(e.code === "offline" ? "You're offline. Connect and try again." : "Couldn't open your subscription. Try again in a moment."); }
}
function proStatusText(){
  const sub = proSub();
  if(!isPro() || !sub) return "Free";
  const d = t => dm(t*1000);
  if(sub.status === "trialing") return sub.cancelling ? `Trial · ends ${d(sub.trialEnd)}` : `Free trial · until ${d(sub.trialEnd)}`;
  if(sub.status === "past_due") return "Payment problem";
  if(sub.cancelling) return `Ends ${d(sub.cancelAt || sub.until)}`;
  return sub.until ? `Renews ${d(sub.until)}` : "Active";
}
function proSheet(){
  const B = UI.billing || {plans:[]}, plans = B.plans || [], n = B.trialDays || 0;
  const m = plans.find(p => p.id === "monthly"), y = plans.find(p => p.id === "yearly");
  if(!plans.some(p => p.id === UI.proPlan)) UI.proPlan = (y || plans[0] || {}).id;
  const save = m && y && m.interval === "month" && y.interval === "year" ? Math.round((1 - y.amount / (m.amount * 12)) * 100) : 0;
  const head = {rota:["Snap your rota.","Polo adds every shift for you."], invoice:["Invoices in seconds.","Turn your shifts into a bill you can send."], payslip:["Never get underpaid.","Check every payslip against your shifts."]}[UI.sheet.data.reason] || ["Get paid right.","Polo does the boring bits for you."];
  const perks = [["scan-line","Read rota photos","Screenshots and photos become shifts"],["receipt","Invoices","PDF invoices for self-employed work"],["file-check","Payslip checks","Spot underpayments straight away"],["sparkles","Every new feature","And you keep Polo going"]];
  const tile = p => {
    if(!p) return "";
    const on = UI.proPlan === p.id, yr = p.interval === "year";
    return `<button class="pw-plan ${on?"on":""} ${yr?"yr":""}" data-act="pickPlan" data-v="${p.id}" role="radio" aria-checked="${on}">
      ${yr && save > 0 ? `<span class="pw-ribbon">Save ${save}%</span>` : ""}
      <span class="pw-check" aria-hidden="true">${ico("check")}</span>
      <span class="pw-pn">${yr ? "Yearly" : "Monthly"}</span>
      <span class="pw-pp">${planMoney(p)}</span>
      <span class="pw-ps">${yr ? `${planMoney(p, Math.round(p.amount/12))} / month` : "per month"}</span></button>`;
  };
  const chosen = plans.find(p => p.id === UI.proPlan) || plans[0];
  const after = chosen ? `${planMoney(chosen)} a ${chosen.interval === "year" ? "year" : "month"}` : "";
  const owned = S.settings.pro && S.settings.pro.pass;
  return `<div class="pw-scroll">
    <div class="pw-hero">
      <span class="pw-glow" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="bubbles" aria-hidden="true">${"<i></i>".repeat(9)}</span>
      <span class="pw-spark" aria-hidden="true">${"<i></i>".repeat(6)}</span>
      <button class="pw-x" data-act="closeSheet" aria-label="Close">${ico("x")}</button>
      <div class="pw-polo" aria-hidden="true">${mascotSVG("wave")}</div>
      <div class="pw-brand"><span>ClockMe</span><b class="pw-foil">PRO</b></div>
      <h2>${head[0]}</h2><p>${head[1]}</p>
    </div>
    <div class="pw-body">
      <ul class="pw-perks">${perks.map(([i,t,d]) => `<li><span class="pw-ic">${ico(i)}</span><span class="pw-pt"><b>${t}</b><small>${d}</small></span><span class="pw-ok">${ico("check")}</span></li>`).join("")}</ul>
      <div class="pw-plans" role="radiogroup" aria-label="Choose a plan">${tile(y)}${tile(m)}</div>
      ${owned ? `<button class="pw-link" data-act="managePro">Manage your subscription</button>` : `<p class="pw-note">Pro on another phone? Restore its backup in Profile.</p>`}
    </div>
  </div>
  <div class="pw-foot">
    <button class="pw-cta" id="probuy" data-act="buyPro"><span>${n ? `Try ${n} days free` : "Continue"}</span>${ico("arrow-up-right","ico-sm")}</button>
    <p class="pw-fine">${n ? `${n} days free, then ${after}.` : `${after}.`} Cancel anytime.</p>
    <p class="pw-trust">${ico("lock","ico-sm")} Secure checkout with Stripe${B.live ? "" : ` <span class="pw-test">Test mode · card 4242 4242 4242 4242</span>`}</p>
  </div>`;
}

/* On the web (Vercel) rota photos go to ClockMe's own /api/read-rota, which holds the AI key on the server. */
const HOSTED = !window.claude && /^https?:$/.test(location.protocol);
const blobToB64 = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] || ""); r.onerror = rej; r.readAsDataURL(b); });
/* Cloudflare Turnstile (only when config/public.json has turnstile.siteKey): an invisible check that the request
   comes from a person on this page. Returns a one-use token, or "" when it's switched off or can't load. */
function humanCheck(action){
  const key = ((window.CLOCKME_CFG || {}).turnstile || {}).siteKey;
  if(!key) return Promise.resolve("");
  return new Promise(resolve => {
    let tries = 0, done = false; const finish = t => { if(!done){ done = true; resolve(t || ""); } };
    setTimeout(() => finish(""), 12000);
    (function go(){
      if(!window.turnstile){ if(++tries < 40) return setTimeout(go, 250); return finish(""); }
      let box = document.getElementById("human-check");
      if(!box){ box = document.createElement("div"); box.id = "human-check"; box.setAttribute("aria-live","polite"); document.body.appendChild(box); }
      if(UI.turnstileId != null){ try{ turnstile.remove(UI.turnstileId); }catch(e){} }
      UI.turnstileId = turnstile.render(box, { sitekey:key, action, appearance:"interaction-only", callback:finish, "error-callback":() => finish(""), "expired-callback":() => finish("") });
    })();
  });
}
function hostedReader(){
  return {
    limits: async () => ({maxPromptBytes:262144, images:{maxCount:1, maxInputBytes:20e6, mediaTypes:["image/jpeg","image/png","image/webp","image/gif"]}}),
    json: async (prompt, opts = {}) => {
      const body = {prompt};
      const img = opts.images && opts.images[0];
      if(img){ body.image = await blobToB64(img); body.mediaType = img.type || "image/jpeg"; }
      let r;
      if(navigator.onLine === false) throw {code:"offline"};
      const pass = (S.settings.pro && S.settings.pro.pass) || "";
      const check = await humanCheck("read_rota");
      try{ r = await fetch("/api/read-rota", {method:"POST", headers:Object.assign({"Content-Type":"application/json"}, pass ? {"X-ClockMe-Pass":pass} : {}, check ? {"X-ClockMe-Check":check} : {}), body:JSON.stringify(body), signal:opts.signal}); }
      catch(e){ throw {code: e && e.name === "AbortError" ? "cancelled" : navigator.onLine === false ? "offline" : "upstream_error"}; }
      if(!r.ok){ const err = await r.json().catch(() => ({})); throw {code: err.code || (r.status === 429 ? "rate_limited" : "upstream_error")}; }
      return r.json();
    }
  };
}
async function readRoster(){
  const d = UI.sheet.data;
  let sample = null;
  try{ sample = window.claude && claude.use ? await claude.use("sample") : null; }catch(e){}
  if(!sample && HOSTED) sample = hostedReader();
  if(!sample){ d.status = "error"; d.msg = "Reading rotas isn't available right now. Paste it as text, or add your shifts by hand."; render(); return; }
  const opts = {};
  UI.importCtl = new AbortController(); opts.signal = UI.importCtl.signal;
  d.status = "working"; d.msg = ""; d.code = ""; render();
  if(UI.importFile){
    const lim = await sample.limits().catch(()=>null);
    if(lim && !lim.images){ d.status = "error"; d.msg = "Photos can't be read right now. Paste the rota as text instead."; render(); return; }
    const img = await prepRotaImage(UI.importFile);
    const okType = f => /^image\/(jpeg|png|webp|gif)$/.test(f.type);
    if(!img && !okType(UI.importFile)){ d.status = "error"; d.msg = "This photo's format can't be opened. Take a screenshot of the rota and use that instead."; render(); return; }
    opts.images = [img || UI.importFile];
  }
  try{
    const res = await sample.json(rosterPrompt(d), opts);
    const list = res && Array.isArray(res.shifts) ? res.shifts : [];
    const job = jobById(d.jobId) || activeJobs()[0];
    const okT = t => /^\d{1,2}:\d{2}$/.test(String(t||""));
    d.results = list.filter(x => okT(x.start) && okT(x.end) && /^\d{4}-\d{2}-\d{2}$/.test(String(x.date||""))).map(x => ({on:true, date:x.date, start:x.start.padStart(5,"0"), end:x.end.padStart(5,"0"), breakMin: x.breakMin != null ? +x.breakMin : (job ? job.breakMin : 0), note:String(x.note||"").slice(0,40), jobId: job ? job.id : null}));
    d.warning = res && res.warning ? String(res.warning).slice(0,200) : "";
    if(d.results.length){ d.status = "done"; }
    else { d.status = "error"; d.msg = "No shifts found for you. Check your name matches the rota, or try a clearer photo."; }
  }catch(e){
    const c = e && e.code;
    if(c === "cancelled"){ d.status = "idle"; }
    else if(c === "pro_required"){ d.status = "idle"; if(S.settings.pro) S.settings.pro.checkedAt = 0; refreshBilling(true); openPro("rota"); return; }
    else { d.status = "error"; d.code = c || "unknown"; d.msg = c === "offline" ? "You're offline. Reading a rota needs a connection. You can still add shifts by hand." : c === "not_setup" ? "Rota reading isn't switched on yet. Paste the rota as text, or add your shifts by hand." : c === "image_too_large" ? "That photo is too big. Try a screenshot instead." : c === "images_unavailable" ? "Photos can't be read right now. Paste the rota as text instead." : c === "sampling_disabled" ? "Rota reading isn't available on your account right now." : c === "session_expired" ? "Your sign-in expired. Close and reopen ClockMe." : c === "refused" ? "That image couldn't be read. Try a screenshot of just your shifts." : c === "not_granted" ? "ClockMe wasn't allowed to read the rota. Allow it when asked, or add shifts by hand." : c === "rate_limited" ? "Too many requests right now. Try again in a minute." : c === "too_many" ? "You've read a lot of rotas in a short time. Try again in a bit, or paste it as text." : c === "check_failed" ? "ClockMe couldn't confirm the request came from you. Reload the page and try again." : c === "busy_today" ? "Rota reading is busy today. Paste the rota as text, or try again tomorrow." : c === "image_rejected" ? "That image couldn't be read. Try a JPG or PNG screenshot." : c === "invalid_json" ? "The rota couldn't be read clearly. Try again or paste it as text." : "Something went wrong reading the rota. Try again."; }
  }
  track("rota_read", {from: UI.importFile ? "photo" : "text", result: d.status, error: d.code || null, shifts: (d.results || []).length});
  if(UI.sheet && UI.sheet.kind === "import") render();
}

const A = {
  tab(el){ UI.tab = el.dataset.tab; UI.stack = []; UI.selBar = null; render(); window.scrollTo(0,0); track("tab_opened", {tab: UI.tab}); },
  pickPlan(el){ UI.proPlan = el.dataset.v; render(); },
  buyPro(){ startCheckout(); },
  managePro(){ openPortal(); },
  openProSheet(){ isPro() && proSub() ? openPortal() : openPro("profile"); },
  statsYes(){ setStats(true); render(); toast("Thanks! Polo appreciates it"); },
  statsNo(){ setStats(false); render(); toast("No problem. Nothing is shared"); },
  push(el){ UI.stack.push({page:el.dataset.page || "jobs"}); UI.selBar = null; render(); window.scrollTo(0,0); },
  back(){ UI.stack.pop(); UI.selBar = null; render(); },
  openGoal(el){ UI.stack.push({page:"goal", id:el.dataset.id}); UI.selBar = null; render(); window.scrollTo(0,0); },
  openInvoice(el){ UI.stack.push({page:"invoice", id:el.dataset.id}); render(); window.scrollTo(0,0); },
  newShift(){ if(!activeJobs().length){ A.newJob(); return; } openShift(null); },
  editShift(el){ openShift(S.shifts.find(s=>s.id===el.dataset.id)); },
  newJob(){ UI.sheet = {kind:"job", data:newJob(), returnTo: UI.sheet}; render(); },
  editJob(el){ const j = jobById(el.dataset.id); const d = JSON.parse(JSON.stringify(j)); d.contracts = contractsOf(d).map(c => Object.assign({}, c, {hasEnd: !!c.end})); UI.sheet = {kind:"job", data:d}; render(); },
  addContract(){ const d = UI.sheet.data, cs = d.contracts, last = cs[cs.length-1];
    const start = last ? (last.end ? addDays(startOfDay(last.end), 1) : startOfDay(Date.now())) : startOfDay(Date.now());
    cs.push({id:uid(), type: last ? last.type : (d.selfEmployed ? "freelance" : "permanent"), start, end: 0, hasEnd: false, hours: last ? last.hours : 0, rate: 0, notice: last ? last.notice : "", probationEnd: 0, notes: ""});
    if(last && !last.end){ last.hasEnd = true; last.end = addDays(start, -1); }
    render(); },
  delContract(el){ UI.sheet.data.contracts.splice(+el.dataset.i, 1); render(); },
  newGoal(){ const t = startOfDay(Date.now()); UI.sheet = {kind:"goal", data:{id:null, title:"", subtitle:"", icon:"plane", color:"#2DB52D", target:1000, start:t, deadline:addDays(t,90)}}; render(); },
  editName(){ UI.sheet = {kind:"name", data:{name:S.settings.name, email:S.settings.email}}; render(); },
  openRoster(){ UI.sheet = {kind:"roster", data:JSON.parse(JSON.stringify(Object.assign({}, S.roster, {on: S.roster.on || !S.roster.entries.length, months: S.roster.months || 2, backfill:false})))}; render(); },
  openImport(){ if(!proOK("rota")) return; const j = activeJobs()[0]; UI.importFile = null; if(UI.importURL){ URL.revokeObjectURL(UI.importURL); UI.importURL = null; }
    UI.sheet = {kind:"import", data:{text:"", name:S.settings.name, jobId:j?j.id:null, status:"idle", results:[], warning:"", msg:""}, returnTo: UI.sheet && UI.sheet.kind==="roster" ? UI.sheet : null}; render(); },
  openBusiness(){ UI.sheet = {kind:"business", data:Object.assign({}, S.business), returnTo: UI.sheet}; render(); },
  openPay(){ UI.sheet = {kind:"pay", data:{payFreq:S.settings.payFreq, payday:S.settings.payday || toD(Date.now())}}; render(); },
  async unlockKey(el){
    const v = el.dataset.v; UI.pinErr = false;
    if(v === "del") UI.pin = UI.pin.slice(0,-1); else if(UI.pin.length < 4) UI.pin += v;
    render();
    if(UI.pin.length === 4){
      const ok = (await hashPin(UI.pin)) === S.settings.pinHash;
      UI.pin = ""; if(ok){ UI.locked = false; buzz(); } else { UI.pinErr = true; try{ navigator.vibrate && navigator.vibrate([30,40,30]); }catch(e){} }
      render();
    }
  },
  forgotPin(){
    if(UI.me) dialog("Turn off your passcode?", `You're signed in${UI.me.email?` as ${UI.me.email}`:""}, so you can remove the passcode and set a new one in Profile.`, [{label:"Turn off passcode", run:()=>{ S.settings.pinOn = false; S.settings.pinHash = ""; UI.locked = false; save(); render(); toast("Passcode turned off"); }}]);
    else dialog("Reset ClockMe on this device?", "Without being signed in, the only way past a forgotten passcode is to delete the data on this device. A backup can be restored afterwards.", [{label:"Delete data on this device", danger:true, run:()=>{ const keep = S.settings.appearance; S = blank(); S.settings.appearance = keep; UI.locked = false; save(); render(); }}]);
  },
  pinMenu(){
    if(!S.settings.pinOn){ UI.sheet = {kind:"pin", data:{step:1, pin:"", first:"", mismatch:false}}; render(); return; }
    dialog("Passcode lock is on", "", [
      {label:"Change passcode", run:()=>{ UI.sheet = {kind:"pin", data:{step:1, pin:"", first:"", mismatch:false}}; render(); }},
      {label:"Turn off passcode", danger:true, run:()=>{ S.settings.pinOn = false; S.settings.pinHash = ""; save(); render(); toast("Passcode turned off"); }}
    ]);
  },
  async setPinKey(el){
    const d = UI.sheet.data, v = el.dataset.v; d.mismatch = false;
    if(v === "del") d.pin = d.pin.slice(0,-1); else if(d.pin.length < 4) d.pin += v;
    render();
    if(d.pin.length < 4) return;
    if(d.step === 1){ d.first = d.pin; d.pin = ""; d.step = 2; render(); return; }
    if(d.pin !== d.first){ Object.assign(d, {step:1, pin:"", first:"", mismatch:true}); render(); return; }
    S.settings.pinHash = await hashPin(d.pin); S.settings.pinOn = true; UI.sheet = null; save(); render(); toast("Passcode lock is on");
  },
  shiftType(el){ const d = UI.sheet.data; d.type = el.dataset.v; const j = jobById(d.jobId); if(d.type !== "work" && !d.id){ d.extraPct = 0; d.tips = 0; } if(d.type==="holiday" && j && !d.id){ d.rate = j.rate; } render(); },
  quickTime(el){ const d = UI.sheet.data, [a,b] = el.dataset.v.split("–"); d.start = atTime(d.start, a); d.endTime = b; if(!d.breakTouched) d.breakMin = breakFor(jobById(d.jobId), d.start, resolvedEnd(d)); render(); },
  bookHoliday(){ if(!activeJobs().length){ A.newJob(); return; } openShift(null, Date.now(), "holiday"); },
  openPayslip(){ if(!proOK("payslip")) return; const [f,t] = defaultPayslipRange(); UI.sheet = {kind:"payslip", data:{from:f, to:t, gross:"", net:""}}; render(); },
  delPayslip(el){ S.payslips = S.payslips.filter(p=>p.id!==el.dataset.id); save(); render(); },
  shiftView(el){ UI.shiftView = el.dataset.v; if(UI.shiftView === "calendar"){ UI.calMonth = Date.now(); UI.calDay = toD(Date.now()); } render(); },
  calPrev(){ const m = new Date(UI.calMonth); UI.calMonth = new Date(m.getFullYear(), m.getMonth()-1, 1).getTime(); UI.calDay = null; render(); },
  calNext(){ const m = new Date(UI.calMonth); UI.calMonth = new Date(m.getFullYear(), m.getMonth()+1, 1).getTime(); UI.calDay = null; render(); },
  calDay(el){ UI.calDay = UI.calDay === el.dataset.v ? null : el.dataset.v; render(); },
  openCalendar(){ UI.tab = "shifts"; UI.stack = []; UI.shiftView = "calendar"; UI.calMonth = Date.now(); UI.calDay = toD(Date.now()); render(); window.scrollTo(0,0); },
  calToday(){ UI.calMonth = Date.now(); UI.calDay = toD(Date.now()); render(); },
  holOnDay(el){ if(!activeJobs().length){ A.newJob(); return; } openShift(null, fromD(el.dataset.v), "holiday"); },
  planMonth(el){ S.roster.until = Math.max(+S.roster.until || 0, monthEnd(+el.dataset.v)); syncRoster(); save(); render(); toast(`${new Date(+el.dataset.v).toLocaleDateString(undefined,{month:"long"})} planned from your usual week`); },
  backfillMonth(){ dialog("Add this month's earlier shifts?", "Your usual week is added for the days before you started using ClockMe. They count as worked, so delete any days you didn't work.", [{label:"Add them", run:()=>{ const before = S.shifts.length; S.roster.since = monthStart(Date.now()); syncRoster(); save(); render(); toast(`Added ${S.shifts.length - before} shift${S.shifts.length - before === 1 ? "" : "s"}`); }}]); },
  addOnDay(el){ if(!activeJobs().length){ A.newJob(); return; } openShift(null, fromD(el.dataset.v)); },
  async copySummary(){
    const C = lastC || context(), per = UI.period, [a, b] = interval(per, UI.anchor);
    const list = S.shifts.filter(s => s.start >= a && s.start < b).sort((x,y)=>x.start-y.start), t = C.total(list);
    const lines = [`ClockMe · ${per==="week"?`Week of ${dmy(a)}`:per==="month"?new Date(a).toLocaleDateString(undefined,{month:"long",year:"numeric"}):new Date(a).getFullYear()}`,
      `Hours: ${hrs(t.hours)}`, `Gross pay: ${money(gross(t))}`];
    if(t.premium + t.ot > 0) lines.push(`Extra pay included: ${money(t.premium + t.ot)}`);
    if(C.tax.on && C.tax.income > 0) lines.push(`${C.label}: ${money(C.shown(gross(t)))}`);
    if(per !== "year" && list.length){ lines.push("", "Shifts:"); for(const s of list){ const j = jobById(s.jobId); lines.push(`${dayMon(s.start)} ${tm(s.start)}–${tm(s.end)} · ${j?j.name:""} · ${money(gross(C.pay(s)))}${isFuture(s)?" (scheduled)":""}`); } }
    try{ await navigator.clipboard.writeText(lines.join("\n")); toast("Summary copied"); }catch(e){ toast("Copy isn't available here"); }
  },
  recover(){ UI.stack = []; UI.tab = "home"; UI.sheet = null; UI.dialog = null; render(); },
  backup(){ saveFile(`ClockMe-backup-${toD(Date.now())}.json`, JSON.stringify(Object.assign({app:"ClockMe", exportedAt:new Date().toISOString()}, S), null, 1)).then(ok => { if(ok) track("backup_saved"); if(ok) toast("Backup saved"); }); },
  help(){ UI.sheet = {kind:"help", data:{}}; render(); },
  wipe(){ dialog("Delete all your data?", "Every shift, job, goal and invoice will be removed from this device and your account. Make a backup first if you might want it back.", [{label:"Delete everything", danger:true, run:()=>{
    track("data_deleted"); if(phLoaded) try{ posthog.reset(); }catch(e){}
    const keep = S.settings.appearance; S = blank(); S.settings.appearance = keep; UI.stack = []; UI.tab = "home"; UI.obDraft = null; UI.ob = 0; save(); render(); toast("All data deleted"); }}]); },
  rerunSetup(){ track("setup_rerun"); UI.obDraft = obDefaults(); UI.ob = 0; S.settings.onboarded = false; render(); window.scrollTo(0,0); },
  addEntry(el){ const j = activeJobs()[0]; const day = +el.dataset.day; const same = UI.sheet.data.entries.find(e=>e.day===day); UI.sheet.data.entries.push({id:uid(), day, jobId: same ? same.jobId : j.id, start:"09:00", end:"17:00", breakMin:j.breakMin||0}); render(); },
  delEntry(el){ UI.sheet.data.entries.splice(+el.dataset.i, 1); render(); },
  importRead(){ readRoster(); },
  importStop(){ if(UI.importCtl) UI.importCtl.abort(); },
  importReset(){ Object.assign(UI.sheet.data, {status:"idle", results:[], warning:""}); render(); },
  importAdd(){
    const d = UI.sheet.data; let n = 0, dup = 0;
    for(const r of d.results.filter(r=>r.on && r.date && jobById(r.jobId))){
      const day = fromD(r.date), start = atTime(day, r.start); let end = atTime(day, r.end); if(end <= start) end = addDays(end, 1);
      const j = jobById(r.jobId);
      // A scanned rota replaces the usual-week shifts planned for that day (only for that week).
      const planned = S.shifts.filter(s => s.rosterKey && !s.edited && shiftType(s)==="work" && startOfDay(s.start) === day && s.jobId === j.id);
      if(planned.length){ S.shifts = S.shifts.filter(s => !planned.includes(s)); S.roster.skips = [...new Set([...(S.roster.skips||[]), ...planned.map(s=>s.rosterKey)])]; }
      if(S.shifts.some(s => s.start < end && s.end > start)){ dup++; continue; }
      S.shifts.push({id:uid(), jobId:j.id, start, end, breakMin:+r.breakMin||0, rate:rateFor(j, day), extraPct:0, tips:0, notes:r.note||"", edited:true, weekEdit:true});
      lockWeek(weekStart(day));
      n++;
    }
    UI.sheet = null; save(); render(); toast(`Added ${n} shift${n===1?"":"s"} for those dates${dup?` · skipped ${dup} already there`:""} · usual week unchanged`);
  },
  importPattern(){
    const d = UI.sheet.data, entries = [];
    for(const r of d.results.filter(r=>r.on && r.date && jobById(r.jobId))){
      const day = new Date(fromD(r.date)).getDay();
      if(!entries.some(e => e.day===day && e.start===r.start && e.jobId===r.jobId)) entries.push({id:uid(), day, jobId:r.jobId, start:r.start, end:r.end, breakMin:+r.breakMin||0});
    }
    const base = UI.sheet.returnTo && UI.sheet.returnTo.kind==="roster" ? UI.sheet.returnTo.data : JSON.parse(JSON.stringify(S.roster));
    base.entries = entries; base.on = true;
    UI.sheet = {kind:"roster", data:base}; render(); toast("Check your week, then tap Save");
  },
  newInvoice(){
    if(!proOK("invoice")) return;
    const jobs = selfJobs();
    if(!jobs.length){ dialog("No self-employed jobs yet", "Invoices are made from jobs you invoice for. Open a job and turn on \"Self-employed\".", [{label:"Open jobs", run:()=>{ UI.stack.push({page:"jobs"}); render(); }}]); return; }
    const p = invoicePresets().lastWeek;
    const d = {id:null, jobId:jobs[0].id, number:invNumber(S.business.next||1), issue:startOfDay(Date.now()), preset:"lastWeek", from:p[1], to:p[2], includeScheduled:false, skipInvoiced:true, group:"shift", extras:[], notes:"", status:"draft"};
    if(!buildInvoice(d, lastC||context()).lines.length){ const t = invoicePresets().thisWeek; Object.assign(d, {preset:"thisWeek", from:t[1], to:t[2]}); }
    UI.sheet = {kind:"invoice", data:d}; render();
  },
  invPreset(el){ const d = UI.sheet.data, k = el.dataset.v; d.preset = k; if(k !== "custom"){ const p = invoicePresets()[k]; d.from = p[1]; d.to = p[2]; if(k === "nextWeek") d.includeScheduled = true; } render(); },
  addExtra(){ UI.sheet.data.extras.push({desc:"", amount:0}); render(); },
  delExtra(el){ UI.sheet.data.extras.splice(+el.dataset.i, 1); render(); },
  invStatus(el){ const inv = S.invoices.find(i=>i.id===el.dataset.id); inv.status = el.dataset.v; if(inv.status === "paid") inv.paidAt = Date.now(); save(); render(); if(inv.status==="paid"){ toast("Marked as paid"); confetti(); } },
  async invPDF(el){ const inv = S.invoices.find(i=>i.id===el.dataset.id);
    if(!window.jspdf){ toast("PDF maker didn't load. Copy the invoice as text instead."); return; }
    try{ const ok = await saveFile(`${inv.number}.pdf`, invoicePDF(inv)); if(ok && inv.status === "draft"){ inv.status = "sent"; save(); render(); toast("Saved. Marked as sent."); } }catch(e){ toast("Couldn't make the PDF"); } },
  async invCopy(el){ const inv = S.invoices.find(i=>i.id===el.dataset.id); try{ await navigator.clipboard.writeText(invoiceText(inv)); toast("Invoice copied as text"); }catch(e){ toast("Copy isn't available here"); } },
  invMenu(el){ const inv = S.invoices.find(i=>i.id===el.dataset.id); dialog(inv.number, "", [
    {label:"Edit invoice", run:()=>{ UI.sheet = {kind:"invoice", data:{id:inv.id, jobId:inv.jobId, number:inv.number, issue:inv.issue, preset:"custom", from:inv.from, to:inv.to, includeScheduled:inv.lines.some(l=>/\(booked\)$/.test(l.desc||"")), skipInvoiced:true, group:"shift", extras:inv.lines.filter(l=>l.extra).map(l=>({desc:l.desc, amount:l.amount})), notes:inv.notes, status:inv.status}}; render(); }},
    {label:"Make a copy for the next period", run:()=>{ if(!proOK("invoice")) return; const days = Math.round((inv.to - inv.from)/DAY)+1; UI.sheet = {kind:"invoice", data:{id:null, jobId:inv.jobId, number:invNumber(S.business.next||1), issue:startOfDay(Date.now()), preset:"custom", from:addDays(inv.to,1), to:addDays(inv.to,days), includeScheduled:false, skipInvoiced:true, group:"shift", extras:[], notes:inv.notes, status:"draft"}}; render(); }},
    {label:"Delete invoice", danger:true, run:()=>dialog(`Delete ${inv.number}?`, "The shifts stay and can be invoiced again.", [{label:"Delete", danger:true, run:()=>{ for(const s of S.shifts) if(s.invoiceId===inv.id) delete s.invoiceId; S.invoices = S.invoices.filter(i=>i.id!==inv.id); UI.stack.pop(); save(); render(); }}])}
  ]); },
  clock(){
    const ck = S.clock;
    if(ck){
      const now = Date.now(), j = jobById(ck.jobId);
      const brk = (ck.breakSec||0) + (ck.breakStart ? (now-ck.breakStart)/1000 : 0);
      UI.sheet = {kind:"shift", data:{id:null, type:"work", jobId:ck.jobId, start:ck.start, endTime:toT(now), breakMin:brk >= 60 ? Math.round(brk/60) : breakFor(j, ck.start, now), breakTouched:brk >= 60, rate:rateFor(j, ck.start), extraPct:0, tips:0, notes:"", fromClock:true, planId:ck.planId || null}};
      render(); return;
    }
    const jobs = activeJobs();
    if(!jobs.length){ A.newJob(); return; }
    if(jobs.length === 1){ clockIn(jobs[0]); return; }
    dialog("Clock in to which job?", "", jobs.map(j=>({label:j.name, run:()=>clockIn(j)})));
  },
  break(){ const ck = S.clock; if(!ck) return; if(ck.breakStart){ ck.breakSec += (Date.now()-ck.breakStart)/1000; ck.breakStart = null; } else ck.breakStart = Date.now(); save(); render(); },
  export(){ exportCSV(); track("csv_exported"); },
  period(el){ UI.period = el.dataset.p; UI.anchor = Date.now(); UI.selBar = null; render(); },
  prevP(){ UI.anchor = shiftPeriod(UI.period, interval(UI.period, UI.anchor)[0], -1); UI.selBar = null; render(); },
  nextP(){ UI.anchor = shiftPeriod(UI.period, interval(UI.period, UI.anchor)[0], 1); UI.selBar = null; render(); },
  nowP(){ UI.anchor = Date.now(); UI.selBar = null; render(); },
  bar(el){ const i = +el.dataset.i; UI.selBar = UI.selBar === i ? null : i; render(); },
  filter(el){ UI.filterJob = el.dataset.id || null; render(); },
  setTheme(el){ S.settings.appearance = el.dataset.v; applyTheme(); save(); render(); track("theme_changed", {theme: el.dataset.v}); },
  setTake(el){ S.settings.showTakeHome = el.dataset.v === "1"; save(); render(); },
  goalMenu(el){ const g = S.goals.find(x=>x.id===el.dataset.id); dialog(g.title, "", [
    {label:"Edit goal", run:()=>{ UI.sheet = {kind:"goal", data:Object.assign({}, g)}; render(); }},
    {label:"Delete goal", danger:true, run:()=>dialog(`Delete ${g.title}?`, "Your shifts stay. Only the goal is removed.", [{label:"Delete", danger:true, run:()=>{ S.goals = S.goals.filter(x=>x.id!==g.id); UI.stack.pop(); save(); render(); }}])}
  ]); },
  closeSheet(){ if(UI.importCtl) UI.importCtl.abort(); const r = UI.sheet && UI.sheet.returnTo; UI.sheet = r || null; render(); },
  closeSheetBg(el, ev){ if(ev.target === el) A.closeSheet(); },
  closeDlg(){ UI.dialog = null; render(); },
  closeDlgBg(el, ev){ if(ev.target === el) A.closeDlg(); },
  dlg(el){ const a = UI.dialog.actions[+el.dataset.i]; UI.dialog = null; a.run(); },
  pickIcon(el){ UI.sheet.data.icon = el.dataset.v; render(); },
  pickColor(el){ UI.sheet.data.color = el.dataset.v; render(); },
  addBankHols(){
    const d = UI.sheet.data, reg = BANK_HOLS[d.bhRegion || defaultHolRegion()], p = clamp(num(d.bhPct ?? 50), -100, 500);
    const have = new Set(d.special.map(x => x.date)); let n = 0;
    for(const [date, label] of Object.entries(reg.d)){ if(have.has(date)) continue; d.special.push({date, label, pct:p, yearly:false}); n++; }
    d.special.sort((a,b)=>a.date.localeCompare(b.date));
    render(); toast(n ? `Added ${n} ${reg.title} bank holidays` : "Those bank holidays are already added");
  },
  addSpecial(){ UI.sheet.data.special.push({date:toD(Date.now()), label:"", pct:50, yearly:false}); render(); },
  delSpecial(el){ UI.sheet.data.special.splice(+el.dataset.i, 1); render(); },
  delShift(){ const id = UI.sheet.data.id; dialog("Delete this shift?", "", [{label:"Delete", danger:true, run:()=>{
    const gone = S.shifts.find(s=>s.id===id); S.shifts = S.shifts.filter(s=>s.id!==id);
    if(gone && gone.rosterKey) S.roster.skips = [...(S.roster.skips||[]), gone.rosterKey].slice(-500);
    UI.sheet = null; save(); render();
    toast("Shift deleted", "Undo", ()=>{ S.shifts.push(gone); if(gone.rosterKey) S.roster.skips = S.roster.skips.filter(k=>k!==gone.rosterKey); save(); render(); }); }}]); },
  repeatShift(){ const d = UI.sheet.data; const s = new Date(d.start), t = new Date(); t.setHours(s.getHours(), s.getMinutes(), 0, 0); UI.sheet = {kind:"shift", data:Object.assign({}, d, {id:null, start:t.getTime()})}; render(); },
  delJob(){ const id = UI.sheet.data.id; dialog("Delete this job?", "All of its shifts and roster entries will be deleted too.", [{label:"Delete job and shifts", danger:true, run:()=>{ S.jobs = S.jobs.filter(j=>j.id!==id); S.shifts = S.shifts.filter(s=>s.jobId!==id); S.roster.entries = S.roster.entries.filter(e=>e.jobId!==id); if(S.clock && S.clock.jobId===id) S.clock = null; UI.sheet = null; save(); render(); }}]); },
  saveSheet(){
    if(!canSave()) return;
    const s = UI.sheet, d = s.data;
    if(s.kind==="shift"){
      const old = d.id ? S.shifts.find(x=>x.id===d.id) : null;
      const rec = Object.assign({}, old || {}, {id:d.id||uid(), jobId:d.jobId, start:d.start, end:resolvedEnd(d), breakMin:Math.max(0,Math.round(num(d.breakMin))), rate:Math.max(0,r2(num(d.rate))), extraPct:(d.type||"work")==="work"?clamp(num(d.extraPct),-100,500):0, tips:(d.type||"work")==="work"?Math.max(0,r2(num(d.tips))):0, notes:d.notes||"", type:d.type||"work", paidSick:d.type==="sick"&&!!d.paidSick});
      if(old) rec.edited = true;
      const i = S.shifts.findIndex(x=>x.id===rec.id); if(i>=0) S.shifts[i] = rec; else S.shifts.push(rec);
      if(d.fromClock){
        S.clock = null;
        // Clocking out replaces the roster shift planned for the same time, so it isn't counted twice.
        const planId = d.planId;
        const dupe = (planId && S.shifts.find(x => x.id === planId && x.id !== rec.id)) || S.shifts.find(x => x.id !== rec.id && x.rosterKey && !x.edited && x.start < rec.end && x.end > rec.start);
        if(dupe){ S.shifts = S.shifts.filter(x=>x!==dupe); if(dupe.rosterKey) S.roster.skips = [...(S.roster.skips||[]), dupe.rosterKey]; }
        rec.clocked = true;
      }
      track("shift_saved", {type: d.type || "work", source: d.fromClock ? "clock" : "manual", edited: !!old});
      UI.sheet = null; setTimeout(() => boop(), 450); toast(d.fromClock ? "Shift saved · clocked out" : d.type==="holiday" ? "Holiday saved" : d.type==="sick" ? "Sick day saved" : "Shift saved");
    } else if(s.kind==="job"){
      const rec = JSON.parse(JSON.stringify(d)); rec.name = rec.name.trim(); rec.rate = Math.max(0, r2(num(rec.rate))); rec.otMult = clamp(num(rec.otMult)||1, 1, 5); rec.otAfter = Math.max(0, num(rec.otAfter));
      rec.breakMin = Math.max(0, Math.round(num(rec.breakMin))); rec.breakAfter = Math.max(0, num(rec.breakAfter)); rec.holidayPct = clamp(num(rec.holidayPct) || 12.07, 0, 50); rec.nightPct = clamp(num(rec.nightPct),-100,500);
      rec.contracts = (rec.contracts||[]).map(c => ({id:c.id||uid(), type:c.type||"permanent", start:startOfDay(c.start), end: c.hasEnd && c.end ? startOfDay(c.end) : 0, hours:Math.max(0,num(c.hours)), rate:Math.max(0,r2(num(c.rate))), notice:String(c.notice||"").trim(), probationEnd:c.probationEnd?startOfDay(c.probationEnd):0, notes:String(c.notes||"")})).sort((a,b)=>a.start-b.start);
      rec.weekday = rec.weekday.map(v=>clamp(num(v),-100,500)); rec.special = (rec.special||[]).filter(x=>x.date).map(x=>Object.assign(x,{pct:clamp(num(x.pct),-100,500)}));
      const i = S.jobs.findIndex(x=>x.id===rec.id);
      const oldRate = i>=0 ? +S.jobs[i].rate : null;
      track("job_saved", {new: i < 0, self_employed: !!rec.selfEmployed});
      if(i>=0) S.jobs[i] = rec; else S.jobs.push(rec);
      const r = s.returnTo;
      if(r && (r.kind==="shift" || r.kind==="import") && !jobById(r.data.jobId)){ r.data.jobId = rec.id; if(r.kind==="shift"){ r.data.rate = rec.rate; r.data.breakMin = rec.breakMin; } }
      const affected = S.shifts.filter(x => x.jobId===rec.id && +x.rate===oldRate);
      if(oldRate !== null && oldRate !== rec.rate && affected.length){
        const wk = weekStart(Date.now());
        const apply = from => { let n = 0; for(const x of affected) if(x.start >= from){ x.rate = rec.rate; n++; } save(); toast(n ? `Updated ${n} shift${n===1?"":"s"}` : "Job saved"); render(); };
        UI.sheet = r || null; save();
        dialog(`Rate changed to ${money(rec.rate)}`, `Shifts already saved keep ${money(oldRate)}. Update any of them?`, [
          {label:"Only new shifts", run:()=>{ for(const x of affected) if(x.start > Date.now() && x.rosterKey && !x.edited) x.rate = rec.rate; save(); toast("Job saved"); render(); }},
          {label:"Shifts from this week on", run:()=>apply(wk)},
          {label:"All shifts for this job", run:()=>apply(-Infinity)}
        ]);
        return;
      }
      if(syncRoster()) {}
      UI.sheet = r || null; toast("Job saved");
    } else if(s.kind==="goal"){
      const rec = Object.assign({}, d, {id:d.id||uid(), title:d.title.trim(), target:r2(num(d.target))});
      const prevG = S.goals.find(x=>x.id===rec.id); if(prevG && prevG.target !== rec.target) rec.celebrated = false;
      if(rec.deadline < rec.start) rec.deadline = rec.start;
      const i = S.goals.findIndex(x=>x.id===rec.id); track("goal_saved", {new: i < 0}); if(i>=0) S.goals[i] = rec; else S.goals.push(rec);
      UI.sheet = null; toast("Goal saved");
    } else if(s.kind==="roster"){
      const wasOn = S.roster.on;
      const back = !!d.backfill; delete d.backfill;
      S.roster = Object.assign({}, S.roster, d, {months:+d.months||2});
      delete S.roster.weeks;
      if(back) S.roster.since = Math.min(S.roster.since || Date.now(), monthStart(Date.now()));
      if(S.roster.on && (!wasOn || !S.roster.since)) S.roster.since = Date.now();
      const before = S.shifts.filter(x=>x.rosterKey && isFuture(x)).length;
      syncRoster();
      const after = S.shifts.filter(x=>x.rosterKey && isFuture(x)).length;
      track("roster_saved", {on: !!S.roster.on, shifts_a_week: S.roster.entries.length});
      UI.sheet = null;
      if(S.roster.on) toast(`Calendar filled until ${dm(rosterHorizon()-DAY)} · ${after} upcoming shift${after===1?"":"s"}`, "View", () => { UI.tab = "shifts"; UI.stack = []; UI.shiftView = "calendar"; UI.calMonth = Date.now(); UI.calDay = toD(Date.now()); render(); window.scrollTo(0,0); });
      else toast("Auto-fill turned off");
    } else if(s.kind==="invoice"){
      const C = lastC || context();
      const inv = buildInvoice(d, C);
      if(d.id){
        const old = S.invoices.find(i=>i.id===d.id);
        inv.id = d.id; inv.status = old ? old.status : "draft"; inv.paidAt = old && old.paidAt; inv.createdAt = old ? old.createdAt : Date.now();
        for(const sh of S.shifts) if(sh.invoiceId === d.id) delete sh.invoiceId;
        S.invoices = S.invoices.map(i => i.id === d.id ? inv : i);
      } else { inv.id = uid(); inv.status = "draft"; S.invoices.push(inv); }
      for(const sh of S.shifts) if(inv.shiftIds.includes(sh.id)) sh.invoiceId = inv.id;
      track("invoice_saved", {new: !d.id, shifts: inv.shiftIds.length});
      const m = String(d.number).match(/(\d+)\s*$/); if(m) S.business.next = Math.max(+S.business.next||1, +m[1] + 1);
      UI.sheet = null;
      if(!d.id) UI.stack.push({page:"invoice", id:inv.id});
      toast(d.id ? "Invoice updated" : "Invoice created");
    } else if(s.kind==="business"){
      S.business = Object.assign({}, S.business, d, {terms:clamp(Math.round(num(d.terms)),0,365), vatPct:clamp(num(d.vatPct),0,50)});
      UI.sheet = s.returnTo || null; toast("Details saved");
    } else if(s.kind==="pay"){
      S.settings.payFreq = d.payFreq; S.settings.payday = d.payday; UI.sheet = null; toast("Pay schedule saved");
    } else if(s.kind==="payslip"){
      const C = lastC || context(), exp = gross(C.total(payslipShifts(d.from, d.to)));
      S.payslips.push({id:uid(), from:startOfDay(d.from), to:startOfDay(d.to), expected:exp, gross:r2(num(d.gross)), net:r2(num(d.net)), createdAt:Date.now()});
      const [cls] = payslipVerdict(r2(num(d.gross) - exp));
      track("payslip_checked", {result: cls});
      UI.sheet = null; toast(cls === "ok" ? "Payslip matches. Saved." : "Check saved");
    } else if(s.kind==="name"){ S.settings.name = d.name.trim(); S.settings.email = String(d.email||"").trim(); UI.sheet = null; toast("Details saved"); }
    save(); render();
  },
  obNext(){ const steps = obSteps(); if(UI.ob < steps.length-1){ UI.ob++; UI.auth = "signup"; render(); window.scrollTo(0,0); mascotLook(0, .9, 1100); } else finishOnboarding(); },
  authSignup(){ UI.auth = "signup"; UI.ob = 0; if(!UI.obDraft) UI.obDraft = obDefaults(); render(); window.scrollTo(0,0); mascotLook(0, .8); },
  authLogin(){ UI.auth = "login"; UI.ob = 0; render(); window.scrollTo(0,0); },
  authBack(){ UI.auth = "welcome"; UI.ob = 0; render(); window.scrollTo(0,0); },
  pickDay(el){ const d = +el.dataset.v; UI.dayStrip = d; UI.tlAnim = true; UI.shiftTab = d < startOfDay(Date.now()) ? "done" : "up"; UI.doneLimit = 15; render(); },
  shiftTab(el){ UI.shiftTab = el.dataset.v; UI.tlAnim = true; UI.doneLimit = 15; render(); },
  doneMore(){ UI.doneLimit = (UI.doneLimit || 15) + 20; render(); },
  toggleSearch(){ UI.shiftView = "list"; UI.searchOpen = !(UI.searchOpen || (UI.search||"").trim()); if(!UI.searchOpen) UI.search = ""; render(); setTimeout(() => { const i = document.getElementById("shift-search"); if(i) i.focus(); }, 60); },
  obBack(){ UI.ob = Math.max(0, UI.ob-1); render(); },
  obSkipStep(){ const step = obSteps()[UI.ob]; const o = UI.obDraft;
    if(step==="pay") o.hasPayday = false; if(step==="week") o.rosterOn = false; if(step==="goal"){ o.goalTitle = ""; }
    if(step==="business") o.biz = {name:"",email:"",address:"",sortCode:"",accountNumber:""};
    A.obNext(); },
  obRegion(el){ UI.obDraft.region = el.dataset.v; render(); },
  obTake(el){ UI.obDraft.take = el.dataset.v === "1"; render(); },
  obWork(el){ UI.obDraft.workType = el.dataset.v; UI.obDraft.selfJob = el.dataset.v === "self"; render(); },
  obFreq(el){ UI.obDraft.payFreq = el.dataset.v; UI.obDraft.hasPayday = true; render(); },
  pickPhoto(){ const i = document.querySelector('.sheet [data-photo]') || document.querySelector('[data-photo]'); if(i) i.click(); },
  removePhoto(el){
    if(el && el.dataset.v === "ob"){ UI.obDraft.photo = ""; render(); return; }
    const old = S.settings.photo; S.settings.photo = ""; save(); render();
    toast("Photo removed", "Undo", () => { S.settings.photo = old; save(); render(); });
  },
  openWeek(el){
    const ws = el && el.dataset && el.dataset.ws ? weekStart(+el.dataset.ws) : addDays(weekStart(Date.now()), 7);
    if(!activeJobs().length){ A.newJob(); return; }
    UI.sheet = {kind:"week", data:buildWeekDraft(ws)}; render();
  },
  weekNav(el){
    const d = UI.sheet.data, ws = addDays(d.ws, 7 * +el.dataset.v);
    const go = () => { UI.sheet = {kind:"week", data:buildWeekDraft(ws)}; lastSheet = UI.sheet; render(); };
    if(!d.dirty){ go(); return; }
    dialog("Save this week first?", `You changed ${weekLabel(d.ws)}.`, [
      {label:"Save for this week only", run:()=>{ applyWeek(d); syncRoster(); save(); go(); toast("Saved for that week only"); }},
      {label:"Discard changes", danger:true, run:go}
    ]);
  },
  weekAdd(el){
    const d = UI.sheet.data, off = +el.dataset.o, day = addDays(d.ws, off), wd = new Date(day).getDay();
    const usual = usualFor(wd)[0], prev = d.days[off][d.days[off].length-1];
    const j = jobById((prev||usual||{}).jobId) || activeJobs()[0];
    const q = quickTimes(j.id)[0];
    const [a, b] = usual ? [usual.start, usual.end] : q ? q.split("–") : ["09:00","17:00"];
    const st = atTime(day, a); let en = atTime(day, b); if(en <= st) en = addDays(en, 1);
    d.days[off].push({id:null, jobId:j.id, start:a, end:b, breakMin: usual ? usual.breakMin : breakFor(j, st, en)});
    d.dirty = true; render();
  },
  weekDel(el){ const d = UI.sheet.data; d.days[+el.dataset.o].splice(+el.dataset.i, 1); d.dirty = true; render(); },
  weekDayOff(el){ const d = UI.sheet.data; d.days[+el.dataset.o] = []; d.dirty = true; render(); },
  weekFromUsual(){
    const d = UI.sheet.data;
    for(let off=0; off<7; off++){ const wd = new Date(addDays(d.ws, off)).getDay();
      const keepIds = d.days[off].map(e => e.id).filter(Boolean);
      d.days[off] = usualFor(wd).map((u, i) => ({id: keepIds[i] || null, jobId:u.jobId, start:u.start, end:u.end, breakMin:u.breakMin||0})); }
    d.dirty = true; render(); toast("Filled from your usual week");
  },
  weekSaveOnly(){
    const d = UI.sheet.data, n = applyWeek(d);
    syncRoster(); save(); UI.sheet = null; render();
    const rel = weekLabel(d.ws).includes(" · ") ? weekLabel(d.ws).split(" · ")[0].toLowerCase() : `week of ${dm(d.ws)}`;
    toast(n ? `Saved for ${rel} only` : "No changes to save");
  },
  weekSaveUsual(){
    const d = UI.sheet.data;
    const pattern = [];
    for(let off=0; off<7; off++){ const wd = new Date(addDays(d.ws, off)).getDay();
      for(const e of d.days[off]) if(jobById(e.jobId)) pattern.push({id:uid(), day:wd, jobId:e.jobId, start:e.start, end:e.end, breakMin:Math.max(0, Math.round(num(e.breakMin)))}); }
    const go = () => {
      applyWeek(d, true); // past days of this week are kept as worked
      const now = Date.now(), we = addDays(d.ws, 7);
      // the rest of this week follows the new usual week
      const fut = S.shifts.filter(x => shiftType(x)==="work" && x.start > now && x.start >= d.ws && x.start < we);
      S.shifts = S.shifts.filter(x => !fut.includes(x));
      const wk = new Set(Array.from({length:7}, (_,i) => toD(addDays(d.ws, i))));
      S.roster.skips = (S.roster.skips||[]).filter(k => !wk.has(k.split("|")[1]));
      unlockWeek(d.ws);
      S.roster.entries = pattern; S.roster.on = true;
      if(!S.roster.since) S.roster.since = now;
      syncRoster(); save(); UI.sheet = null; render();
      toast(`Usual week updated · ${pattern.length} shift${pattern.length===1?"":"s"} a week from now on`);
    };
    if(!pattern.length){ dialog("Make an empty week your usual week?", "Your calendar would stop filling in shifts automatically.", [{label:"Yes, clear my usual week", danger:true, run:go}]); return; }
    dialog("Make this your usual week?", "Every week from now on will use these days and hours. Weeks you've changed by hand stay as they are.", [{label:"Update my usual week", run:go}]);
  },
  weekReset(){
    const d = UI.sheet.data, ws = d.ws, we = addDays(ws, 7), now = Date.now();
    dialog("Undo this week's changes?", "Shifts you changed or added for this week are removed, and your usual week fills it again. Past days aren't touched.", [{label:"Undo changes", danger:true, run:()=>{
      S.shifts = S.shifts.filter(x => !(shiftType(x)==="work" && x.start > now && x.start >= ws && x.start < we && (x.weekEdit || (x.rosterKey && x.edited))));
      const wk = new Set(Array.from({length:7}, (_,i) => toD(addDays(ws, i))));
      S.roster.skips = (S.roster.skips||[]).filter(k => !wk.has(k.split("|")[1]));
      unlockWeek(ws);
      // untouched shifts left from an older usual week are replaced by the current one
      const ids = new Set(S.roster.entries.map(e => e.id));
      S.shifts = S.shifts.filter(x => !(x.rosterKey && !x.edited && x.start > now && x.start >= ws && x.start < we && !ids.has(x.rosterKey.split("|")[0])));
      syncRoster(); save(); UI.sheet = {kind:"week", data:buildWeekDraft(ws)}; render(); toast("Back to your usual week");
    }}]);
  },
  clockInShift(el){ const s = S.shifts.find(x => x.id === el.dataset.id); const j = s && jobById(s.jobId); if(j) clockIn(j, s.id); },
  obAge(el){ UI.obDraft.ageBand = el.dataset.v; render(); },
  setAge(el){ S.settings.ageBand = el.dataset.v; save(); render(); },
  obDay(el){ const d = UI.obDraft.days[+el.dataset.d]; d.on = !d.on; render(); }
};

document.addEventListener("click", ev => {
  const el = ev.target.closest("[data-act]"); if(!el || el.disabled) return;
  const f = A[el.dataset.act];
  if(f){ try{ const r = f(el, ev); if(r && r.catch) r.catch(err => { console.error(err); toast("Something went wrong. Please try again."); }); }catch(err){ console.error(err); toast("Something went wrong. Please try again."); } }
});
function setPath(obj, path, val){ const k = path.split("."); let o = obj; for(let i=0;i<k.length-1;i++) o = o[k[i]]; o[k[k.length-1]] = val; }
function readVal(el){
  const t = el.dataset.type;
  if(t==="bool") return el.checked;
  if(t==="num") return num(el.value);
  if(t==="dt") return el.value ? new Date(el.value).getTime() : UI.sheet.data.start;
  if(t==="date") return el.value ? fromD(el.value) : startOfDay(Date.now());
  if(t==="date0") return el.value ? fromD(el.value) : 0;
  if(t==="min") return el.value ? tToMin(el.value) : 0;
  return el.value;
}
function onField(ev){
  const el = ev.target;
  if(el.id === "shift-search"){ UI.search = el.value; clearTimeout(UI.searchT); UI.searchT = setTimeout(() => { const pos = el.selectionStart; render(); const n = document.getElementById("shift-search"); if(n){ n.focus(); try{ n.setSelectionRange(pos,pos); }catch(e){} } }, 250); return; }
  if(el.id === "restore-file"){
    if(ev.type !== "change" || !el.files || !el.files[0]) return;
    el.files[0].text().then(txt => {
      let data; try{ data = JSON.parse(txt); }catch(e){ toast("That file isn't a ClockMe backup"); return; }
      if(!data || !data.settings || !Array.isArray(data.shifts)){ toast("That file isn't a ClockMe backup"); return; }
      dialog("Restore this backup?", `It has ${data.shifts.length} shifts, ${(data.jobs||[]).length} jobs and ${(data.invoices||[]).length} invoices. It replaces what's in the app now.`, [{label:"Restore", run:()=>{ S = hydrate(data); save(); applyTheme(); render(); toast("Backup restored"); }}]);
    });
    el.value = ""; return;
  }
  if(el.dataset && el.dataset.photo !== undefined){
    if(ev.type !== "change") return;
    const f = el.files && el.files[0], where = el.dataset.photo; el.value = "";
    if(!f) return;
    if(f.type && !/^image\//.test(f.type)){ toast("Choose a photo (JPG, PNG or HEIC)"); return; }
    if(f.size > 25e6){ toast("That photo is too large"); return; }
    makeAvatar(f).then(url => {
      if(where === "ob"){ UI.obDraft.photo = url; render(); toast("Photo added"); return; }
      S.settings.photo = url; save(); render(); toast("Profile photo updated");
    }).catch(() => toast("Couldn't open that photo. Try a JPG or PNG."));
    return;
  }
  if(el.id === "imp-file"){
    if(ev.type !== "change") return;
    const f = el.files && el.files[0];
    if(UI.importURL) URL.revokeObjectURL(UI.importURL);
    UI.importFile = f || null; UI.importURL = f ? URL.createObjectURL(f) : null;
    if(UI.sheet) Object.assign(UI.sheet.data, {status:"idle", msg:""});
    render(); return;
  }
  if(el.dataset.ob !== undefined){
    if(!UI.obDraft) return; // setup already finished (e.g. a late change event from a removed field)
    if(ev.type === "input" && (el.tagName === "SELECT" || el.type === "checkbox")) return;
    setPath(UI.obDraft, el.dataset.ob, el.dataset.type ? readVal(el) : el.value);
    const b = document.getElementById("obnext"); if(b && obSteps()[UI.ob]==="name") b.disabled = !(UI.obDraft.name.trim() && validEmail(UI.obDraft.email));
    const em = document.getElementById("ob-email-msg"); if(em && el.id==="ob-email") em.innerHTML = emailMsg(UI.obDraft);
    if(el.dataset.rerender && ev.type === "change") render();
    return;
  }
  if(el.dataset.stats !== undefined){
    if(ev.type !== "change") return;
    setStats(el.checked); toast(el.checked ? "Thanks! Usage stats on" : "Usage stats off"); render();
    return;
  }
  if(el.dataset.set !== undefined){
    if(ev.type === "input" && (el.tagName === "SELECT" || el.type === "checkbox")) return;
    let v = el.type === "checkbox" ? el.checked : el.value;
    if(el.dataset.num) v = num(v);
    S.settings[el.dataset.set] = v;
    if(el.dataset.set === "weekStart" && syncRoster()) {}
    save();
    if(el.dataset.set === "appearance") applyTheme();
    if(ev.type === "change") render();
    return;
  }
  if(el.dataset.bind !== undefined && UI.sheet){
    if(ev.type === "input" && (el.tagName === "SELECT" || el.type === "checkbox")) return;
    const d = UI.sheet.data, key = el.dataset.bind;
    const prevJob = d.jobId;
    setPath(d, key, readVal(el));
    const kind = UI.sheet.kind;
    if(kind==="shift"){
      if(key==="jobId" && d.jobId !== prevJob && !d.id){ const j = jobById(d.jobId); if(j){ d.rate = j.rate; if(!d.breakTouched) d.breakMin = breakFor(j, d.start, resolvedEnd(d)); } render(); return; }
      if(key==="breakMin") d.breakTouched = true;
      if((key==="start" || key==="endTime") && !d.breakTouched && !d.id){ d.breakMin = breakFor(jobById(d.jobId), d.start, resolvedEnd(d)); const bi = document.getElementById("sh-break"); if(bi) bi.value = d.breakMin; }
      const pv = document.getElementById("sh-preview"); if(pv) pv.innerHTML = shiftPreview();
      const wn = document.getElementById("sh-warn"); if(wn) wn.innerHTML = shiftWarnings();
      const ov = document.getElementById("sh-over"); if(ov){ const e = resolvedEnd(d); ov.textContent = toD(e) !== toD(d.start) ? `Overnight: ends ${dayMon(e)} at ${tm(e)}. Hours after midnight use that day's rate.` : ""; }
      if(window.lucide) lucide.createIcons();
    }
    if(kind==="job" && /^contracts\.\d+\.hasEnd$/.test(key)){ const c = d.contracts[+key.split(".")[1]]; if(c.hasEnd && !c.end) c.end = addDays(c.start || startOfDay(Date.now()), 90); }
    if(kind==="job"){
      const mwEl = document.getElementById("jb-mw"); if(mwEl && (key==="rate" || key==="selfEmployed")){ mwEl.innerHTML = jobMinWarn(d); if(window.lucide) lucide.createIcons(); }
      for(let i=0;i<7;i++){ const h = document.getElementById("wd-hint-"+i); if(h) h.textContent = +d.weekday[i] ? money(d.rate*(1+d.weekday[i]/100))+"/h" : ""; }
    }
    if(kind==="invoice"){
      if(el.dataset.custom) d.preset = "custom";
      if(ev.type === "change" && (el.tagName === "SELECT" || el.type === "checkbox" || el.dataset.custom)) { render(); return; }
      const pv = document.getElementById("in-preview"); if(pv) pv.innerHTML = paperHTML(buildInvoice(d, lastC || context()));
      const iw = document.getElementById("in-warn"); if(iw){ iw.innerHTML = dupNumber(d) ? `<div class="warn" style="margin:6px 0"><span>You already have an invoice numbered ${esc(d.number)}.</span></div>` : ""; }
    }
    if(kind==="week"){
      d.dirty = true;
      const ws = document.getElementById("wk-sum"); if(ws) ws.innerHTML = weekSummary(d);
      if(ev.type === "change" && (el.type === "time" || el.tagName === "SELECT")) render();
    }
    if(kind==="payslip"){ const pr = document.getElementById("ps-result"); if(pr){ pr.innerHTML = payslipResult(); if(window.lucide) lucide.createIcons(); } }
    if(kind==="import" && key==="text"){ const b = document.querySelector('[data-act="importRead"]'); if(b) b.disabled = !((UI.importFile || d.text.trim()) && activeJobs().length); }
    if(el.dataset.rerender && ev.type==="change") render();
    const sb = document.getElementById("savebtn"); if(sb) sb.disabled = !canSave();
  }
}
document.addEventListener("keydown", ev => {
  if(ev.key === "Escape"){ if(UI.dialog) A.closeDlg(); else if(UI.sheet) A.closeSheet(); }
  if(ev.key === "Enter" && ev.target && ev.target.matches && ev.target.matches(".ob input:not([type=checkbox])")){ const b = document.getElementById("obnext"); if(b && !b.disabled){ ev.preventDefault(); ev.target.blur(); setTimeout(() => b.click(), 0); } }
});
window.addEventListener("error", ev => { console.error(ev.error || ev.message); });
window.addEventListener("unhandledrejection", ev => { console.error(ev.reason); });
document.addEventListener("input", onField);
document.addEventListener("change", onField);
document.addEventListener("visibilitychange", () => {
  if(document.visibilityState !== "visible") { UI.hiddenAt = Date.now(); if(dbCol) flush(); return; }
  if(S.settings.pinOn && UI.hiddenAt && Date.now() - UI.hiddenAt > 60000){ UI.locked = true; UI.pin = ""; UI.sheet = null; UI.dialog = null; render(); }
  if(S.settings.onboarded && syncRoster()){ save(); render(); }
  if(dbCol && !UI.sheet) pull().catch(()=>{});
});

/* ============ Render ============ */
function applyTheme(){ if(!THEMES.some(t=>t[0]===S.settings.appearance)) S.settings.appearance = "system"; const a = S.settings.appearance; if(a==="system") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", a); }
let lastC = null, lastSheet = null, lastDlg = null, lastView = "", lastTabIdx = 0;
const counts = {};
const TABS = [["home","house","Home"],["insights","chart-pie","Insights"],["shifts","calendar-days","Shifts"],["profile","user-round","Profile"]];
const reduceMotion = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
function viewKey(){ const top = UI.stack[UI.stack.length-1]; return S.settings.onboarded ? UI.tab + "|" + (top ? top.page + (top.id||"") : "") + "|" + (UI.tab==="insights" ? UI.period + UI.anchor : "") : "ob" + UI.ob + (UI.ob ? "" : UI.auth || "welcome"); }
/* Accessibility: every form control gets a name from the label people can see next to it
   (the row's text, the setting's title, or its placeholder), so screen readers announce it. */
function a11yLabels(scope){
  for(const el of scope.querySelectorAll("input:not([type=hidden]),select,textarea")){
    if(el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) continue;
    if(el.id && scope.querySelector(`label[for="${CSS.escape(el.id)}"]`)) continue;
    const wrap = el.closest("label"); if(wrap && wrap.textContent.trim()) continue;
    const host = el.closest(".f, .item, .row, .tin, .fsec");
    const cue = host && host.querySelector(":scope > span:not(.unit):not(.sq):not(.toggle), :scope > .t, :scope > label.h, :scope > b");
    const t = (cue && cue.textContent.trim()) || el.getAttribute("placeholder") || el.getAttribute("title") || "";
    if(t) el.setAttribute("aria-label", t.replace(/\s+/g, " ").slice(0, 80));
  }
}
function render(){
  try { renderInner(); a11yLabels(document.body); }
  catch(err){
    console.error(err);
    UI.sheet = null; UI.dialog = null;
    document.getElementById("root").innerHTML = `<main class="app"><div class="empty" style="margin-top:40px"><div class="art">${ico("life-buoy")}</div><b>Something went wrong showing this screen</b><p>Your data is safe. Go back to Home and try again.</p><button class="btn" data-act="recover">Back to Home</button></div></main>`;
    if(window.lucide) lucide.createIcons();
  }
}
let lastStrip = "";
function renderInner(){
  const root = document.getElementById("root");
  const sheetScroll = document.querySelector(".sheet-b") ? document.querySelector(".sheet-b").scrollTop : 0;
  const key = viewKey(), entering = key !== lastView && !UI.noEnter; lastView = key;
  const sheetNew = !!UI.sheet && UI.sheet !== lastSheet; lastSheet = UI.sheet;
  const dlgNew = !!UI.dialog && UI.dialog !== lastDlg; lastDlg = UI.dialog;
  if(UI.locked && S.settings.onboarded && S.settings.pinOn){ root.innerHTML = lockHTML() + dialogHTML(dlgNew); }
  else if(!S.settings.onboarded){ root.innerHTML = onboardingHTML(entering) + dialogHTML(dlgNew); }
  else {
    const C = context(); lastC = C;
    const top = UI.stack[UI.stack.length-1];
    const hideTabs = top && (top.page === "goal" || top.page === "invoice");
    const idx = Math.max(0, TABS.findIndex(t => t[0] === UI.tab));
    root.innerHTML = `<main class="app ${entering?"enter":""}">${mainView(C)}</main>
      ${hideTabs?"":`<nav class="tabbar" aria-label="Tabs"><span class="tab-ind" style="transform:translateX(calc(${lastTabIdx} * (100% + 6px)))"></span>${TABS.map(([t,i,l])=>`<button class="${UI.tab===t?"on":""}" data-act="tab" data-tab="${t}" aria-label="${l}" ${UI.tab===t?'aria-current="page"':""}><span class="ti ${UI.tab===t && lastTabIdx!==idx?"pop":""}">${tabIco(i)}</span></button>`).join("")}</nav>`}
      ${sheetHTML(sheetNew)}${dialogHTML(dlgNew)}`;
    const ind = root.querySelector(".tab-ind");
    if(ind && lastTabIdx !== idx) requestAnimationFrame(() => requestAnimationFrame(() => { ind.style.transform = `translateX(calc(${idx} * (100% + 6px)))`; }));
    lastTabIdx = idx;
    updateLive();
    checkGoals(C);
  }
  { const qs = !S.settings.onboarded && UI.obDraft && UI.ob > 0 ? obSteps()[UI.ob] : null; // each setup question has its own colours
    if(qs) document.documentElement.dataset.qstep = qs; else delete document.documentElement.dataset.qstep; }
  const sb = document.querySelector(".sheet-b"); if(sb && sheetScroll) sb.scrollTop = sheetScroll;
  document.body.classList.toggle("locked", !!(UI.sheet || UI.dialog));
  if(window.lucide) lucide.createIcons();
  animateCounts(entering);
  startMascot(); UI.tlAnim = false;
  const ds = document.querySelector(".dstrip");
  if(ds){ const on = ds.querySelector(".on"), k = String(UI.dayStrip||"") + UI.tab; if(on && (entering || k !== lastStrip)) ds.scrollLeft = on.offsetLeft - ds.clientWidth/2 + on.offsetWidth/2; lastStrip = k; }
}
/* Rolls money figures up to their new value. */
function animateCounts(entering){
  for(const el of document.querySelectorAll("[data-count]")){
    const k = el.dataset.ckey || "", to = +el.dataset.count;
    const from = counts[k] == null ? (entering ? 0 : to) : (entering && counts[k] === to ? to * .6 : counts[k]);
    counts[k] = to;
    if(from === to || reduceMotion()) continue;
    const fmt = v => el.dataset.cur ? moneyC(v, el.dataset.cur) : money(v), t0 = performance.now(), dur = 750;
    const step = now => { const p = Math.min(1, (now - t0)/dur), e = 1 - Math.pow(1-p, 3); if(!el.isConnected) return;
      el.innerHTML = amountHTML(fmt(from + (to-from)*e)); if(p < 1) requestAnimationFrame(step); };
    el.innerHTML = amountHTML(fmt(from)); requestAnimationFrame(step);
  }
}
/* Celebrates a goal the first time it's reached. */
function checkGoals(C){
  for(const g of S.goals){
    if(g.celebrated || !(g.target > 0)) continue;
    const earned = C.shown(gross(C.total(goalShifts(g))));
    if(earned >= g.target){ g.celebrated = true; save(); setTimeout(() => { confetti(); toast(`Goal reached: ${g.title}`); }, 400); }
  }
}
function confetti(){
  if(reduceMotion()) return;
  const c = document.createElement("canvas"), dpr = Math.min(2, window.devicePixelRatio || 1);
  c.className = "confetti"; c.width = innerWidth*dpr; c.height = innerHeight*dpr; document.body.appendChild(c);
  const ctx = c.getContext("2d"); ctx.scale(dpr, dpr);
  const cols = ["#2DB52D","#F07F22","#4A6CF7","#EC4899","#FFD43B","#8E5CF6"];
  const P = Array.from({length:140}, () => ({x:innerWidth/2 + (Math.random()-.5)*80, y:innerHeight*.35, vx:(Math.random()-.5)*11, vy:-Math.random()*13-4, r:Math.random()*Math.PI, vr:(Math.random()-.5)*.3, w:6+Math.random()*6, h:4+Math.random()*5, c:cols[Math.floor(Math.random()*cols.length)]}));
  const t0 = performance.now();
  const frame = now => {
    const t = now - t0; ctx.clearRect(0,0,innerWidth,innerHeight);
    for(const p of P){ p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - t/2200); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h); ctx.restore(); }
    if(t < 2200) requestAnimationFrame(frame); else c.remove();
  };
  requestAnimationFrame(frame);
}
function sparkline(vals){
  const W = 300, H = 70, max = Math.max(...vals, 0.0001), n = vals.length, id = "sp" + (++mascotN);
  const pts = vals.map((v,i) => [n === 1 ? W/2 : i*(W-16)/(n-1) + 8, H - 10 - (v/max)*(H-24)]);
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for(let i = 1; i < n; i++){ const [x0,y0] = pts[i-1], [x1,y1] = pts[i], cx = (x0 + x1) / 2; d += ` C${cx.toFixed(1)},${y0.toFixed(1)} ${cx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`; }
  const last = pts[n-1];
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF8DBA" stop-opacity=".45"/><stop offset="1" stop-color="#FF8DBA" stop-opacity="0"/></linearGradient></defs>
    <path d="${d} L${last[0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z" fill="url(#${id})"/><path class="spark-line" d="${d}" fill="none" stroke="#F0619A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/>
    ${pts.slice(0,-1).map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.6" class="spark-dot"/>`).join("")}
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="10" fill="#F0619A" opacity=".18" class="spark-pulse"/><circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="5.5" fill="#F0619A" stroke="#fff" stroke-width="2.5"/></svg>`;
}
setInterval(updateLive, 1000);
loadLocal(); applyTheme(); UI.locked = !!S.settings.pinOn;
if(S.settings.onboarded && syncRoster()) save();
render();
setTimeout(connect, 0);
startStats();
(() => { const back = handleBillingReturn(); refreshBilling(back === "portal", back === true); })();
/* Offline: clocking, shifts, pay, insights, invoices and backups all work without a connection, because the data
   lives on this phone. A small banner says so; things that need the internet say so up front; when the connection
   comes back, billing is re-checked (and an unfinished checkout claimed). */
function netBanner(){
  let b = document.getElementById("net-banner");
  if(UI.online){ if(b) b.remove(); return; }
  if(!b){ b = document.createElement("div"); b.id = "net-banner"; b.className = "net-banner"; b.setAttribute("role", "status"); document.body.appendChild(b); }
  b.textContent = "Offline · your shifts still save on this phone";
}
function setOnline(on){
  if(UI.online === on) return;
  UI.online = on; netBanner();
  if(UI.sheet && UI.sheet.kind === "import") render();
  if(on){ toast("Back online"); refreshBilling(); }
}
addEventListener("offline", () => setOnline(false));
addEventListener("online", () => setOnline(true));
netBanner();
