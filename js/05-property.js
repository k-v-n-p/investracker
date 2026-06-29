// ══ PROPERTY CONSTANTS & STATE ═════════════════════════════════════════
const TERM = 240;
let currency     = 'INR';
let horizonYrs   = 5;
let rentalINR    = 0;
let _busy        = false;
let activeProfile = 0;
let currentTab   = 1;
let retChartView = 'equity';

const PALETTE = ['#a78bfa','#fb923c','#34d399','#60a5fa','#f472b6','#facc15','#22d3ee','#f87171','#a3e635','#818cf8'];

function defaultTranches(possM) {
  const m = possM || 36;
  return [
    { label:'Booking',    pct:20, month:0 },
    { label:'Possession', pct:80, month:m },
  ];
}

function defaultState() {
  return { prop:10000000, cash:5000000, loan:5000000, rate:9,
           totalPay:300000, appPct:8, rentalINR:0, horizonYrs:5, activeTab:1,
           payMode:'OTP', possessionMonth:36, tranches:defaultTranches(36),
           sqft:1200, possessionDate:'', altRetPct:10 };
}

// Seed defaults; overridden from localStorage at init
const PROFILES = [
  { name:'Property 1', color:'#a78bfa', state: defaultState() },
  { name:'Property 2', color:'#fb923c', state: defaultState() },
  { name:'Property 3', color:'#34d399', state: defaultState() },
];

// CLP state (per-profile, loaded/saved alongside profile state)
let clpPayMode     = 'OTP';
let clpPossMonth   = 36;
let clpTranches    = defaultTranches(36);

function persistProfiles() { Storage.save('property_profiles', PROFILES); }

function renderProfileBar() {
  const bar = document.getElementById('profileBar');
  bar.innerHTML = '';
  PROFILES.forEach((p, i) => {
    const pill = document.createElement('div');
    pill.className = 'p-pill'; pill.id = 'pp' + i;
    pill.style.borderColor = i===activeProfile ? p.color : 'rgba(255,255,255,0.08)';
    pill.style.background  = i===activeProfile ? hexRgba(p.color, 0.1) : '#161922';
    pill.innerHTML =
      '<span class="p-dot" style="background:'+p.color+'"></span>' +
      '<span class="p-name" id="pname'+i+'" style="color:'+(i===activeProfile?p.color:'#64748b')+'">'+escHtml(p.name)+'</span>' +
      '<span class="p-icons">' +
        '<span class="p-icon" data-action="rename" data-idx="'+i+'" title="Rename">✎</span>' +
        '<span class="p-icon" data-action="copy"   data-idx="'+i+'" title="Duplicate">⧉</span>' +
        '<span class="p-icon del" data-action="del" data-idx="'+i+'" title="Delete">✕</span>' +
      '</span>';
    pill.addEventListener('click', () => switchProfile(i));
    pill.querySelectorAll('.p-icon').forEach(ic => {
      ic.addEventListener('click', e => {
        e.stopPropagation();
        if (ic.dataset.action==='rename') startRename(e, +ic.dataset.idx);
        if (ic.dataset.action==='copy')   copyProfile(+ic.dataset.idx);
        if (ic.dataset.action==='del')    deleteProfile(+ic.dataset.idx);
      });
    });
    bar.appendChild(pill);
  });
  const addBtn = document.createElement('div');
  addBtn.className='p-add'; addBtn.title='New profile'; addBtn.textContent='+';
  addBtn.addEventListener('click', addProfile);
  bar.appendChild(addBtn);
  const color = PROFILES[activeProfile].color;
  document.getElementById('panel1').style.borderLeft = '3px solid '+color;
  document.getElementById('panel2').style.borderLeft = '3px solid '+color;
  if (activeDash==='property') document.getElementById('profileDot').style.background = color;
  const tBtn3 = document.getElementById('tBtn3');
  if (tBtn3) tBtn3.classList.toggle('hidden', PROFILES.length < 2);
  if (PROFILES.length < 2 && currentTab===3) switchTab(1);
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function nextColor() {
  const used = new Set(PROFILES.map(p=>p.color));
  return PALETTE.find(c=>!used.has(c)) || PALETTE[PROFILES.length % PALETTE.length];
}

function addProfile() {
  saveProfile(activeProfile);
  PROFILES.push({ name:'Property '+(PROFILES.length+1), color:nextColor(), state:defaultState() });
  activeProfile = PROFILES.length-1;
  persistProfiles(); renderProfileBar(); loadProfile(activeProfile);
}
function copyProfile(i) {
  saveProfile(activeProfile);
  PROFILES.push({ name:PROFILES[i].name+' (copy)', color:nextColor(), state:{...PROFILES[i].state} });
  activeProfile = PROFILES.length-1;
  persistProfiles(); renderProfileBar(); loadProfile(activeProfile);
}
function deleteProfile(i) {
  if (PROFILES.length<=1) return;
  saveProfile(activeProfile);
  PROFILES.splice(i, 1);
  if (activeProfile>=PROFILES.length) activeProfile=PROFILES.length-1;
  else if (activeProfile>i) activeProfile--;
  persistProfiles(); renderProfileBar(); loadProfile(activeProfile);
}
function saveProfile(i) {
  PROFILES[i].state = {
    prop:+document.getElementById('propVal').value, cash:+document.getElementById('cashVal').value,
    loan:+document.getElementById('loanVal').value, rate:+document.getElementById('rateVal').value,
    totalPay:+document.getElementById('prepayVal').value, appPct:+document.getElementById('appVal').value,
    rentalINR, horizonYrs, activeTab: currentTab > 2 ? 1 : currentTab,
    payMode: clpPayMode,
    possessionMonth: clpPayMode==='CLP' ? computePossMonth() : clpPossMonth,
    tranches: clpTranches.map(t=>({...t})),
    sqft: +document.getElementById('sqftVal').value||0,
    possessionDate: document.getElementById('possDateVal').value||'',
    altRetPct: +document.getElementById('altRetVal').value||10,
  };
  persistProfiles();
}
function loadProfile(i) {
  const s = PROFILES[i].state;
  document.getElementById('propVal').value   = s.prop;
  document.getElementById('cashVal').value   = s.cash;
  document.getElementById('loanVal').value   = s.loan;
  document.getElementById('rateVal').value   = s.rate;
  document.getElementById('prepayVal').value = s.totalPay;
  document.getElementById('appVal').value    = s.appPct;
  rentalINR=s.rentalINR; horizonYrs=s.horizonYrs;
  document.getElementById('rentalVal').value = currency==='INR' ? Math.round(rentalINR) : Math.round(rentalINR/exRate());
  [3,5,10].forEach(n=>document.getElementById('hp'+n).classList.toggle('active',n===horizonYrs));
  // Opportunity cost / alt investment
  document.getElementById('altRetVal').value   = s.altRetPct||10;
  document.getElementById('altRetOut').textContent = (s.altRetPct||10).toFixed(1)+'% p.a.';
  // CLP fields
  document.getElementById('sqftVal').value     = s.sqft != null ? s.sqft : 1200;
  document.getElementById('possDateVal').value = s.possessionDate||'';
  clpPayMode   = s.payMode||'OTP';
  clpPossMonth = s.possessionMonth||36;
  // Re-derive possession month from stored date if available, otherwise use saved month
  if (s.possessionDate) {
    clpPossMonth = computePossMonth();
  }
  clpTranches = (s.tranches && s.tranches.length ? s.tranches : defaultTranches(clpPossMonth)).map(t=>({...t}));
  document.getElementById('payOTP').classList.toggle('active', clpPayMode==='OTP');
  document.getElementById('payCLP').classList.toggle('active', clpPayMode==='CLP');
  document.getElementById('clp-section').classList.toggle('hidden', clpPayMode !== 'CLP');
  renderTranches();
  syncMax(); switchTab(s.activeTab); update();
}
function switchProfile(i) {
  if (i===activeProfile) return;
  saveProfile(activeProfile); activeProfile=i; renderProfileBar(); loadProfile(i);
}
function refreshProfileBar() { renderProfileBar(); }

function startRename(evt, i) {
  evt.stopPropagation();
  const span = document.getElementById('pname'+i);
  if (!span || span.querySelector('input')) return;
  const inp = document.createElement('input');
  inp.type='text'; inp.value=PROFILES[i].name; inp.className='p-name-input';
  inp.style.color = i===activeProfile ? PROFILES[i].color : '#64748b';
  span.textContent=''; span.appendChild(inp); inp.focus(); inp.select();
  const commit = () => {
    const v = inp.value.trim() || PROFILES[i].name;
    PROFILES[i].name=v; span.textContent=v;
    span.style.color = i===activeProfile ? PROFILES[i].color : '#64748b';
    persistProfiles();
  };
  inp.addEventListener('blur', commit);
  inp.addEventListener('keydown', e => {
    if (e.key==='Enter') inp.blur();
    if (e.key==='Escape') span.textContent=PROFILES[i].name;
  });
}

// ══ FORMATTING ═════════════════════════════════════════════════════════
function exRate() { return parseFloat(document.getElementById('exRate').value) || 93; }

function fmtC(inr) {
  const neg=inr<0, abs=Math.abs(inr), s=neg?'-':'';
  if (currency==='USD') {
    const v=abs/exRate();
    if (v>=1e6) return s+'$'+(v/1e6).toFixed(2)+'M';
    if (v>=1e3) return s+'$'+(v/1e3).toFixed(1)+'K';
    return s+'$'+Math.round(v).toLocaleString();
  }
  if (abs>=1e7) return s+'₹'+(abs/1e7).toFixed(2)+' Cr';
  if (abs>=1e5) return s+'₹'+(abs/1e5).toFixed(1)+'L';
  return s+'₹'+Math.round(abs).toLocaleString('en-IN');
}
function fmtAxis(inr) {
  const neg=inr<0, abs=Math.abs(inr), s=neg?'-':'';
  if (currency==='USD') {
    const v=abs/exRate();
    if (v>=1e6) return s+'$'+(v/1e6).toFixed(1)+'M';
    if (v>=1e3) return s+'$'+(v/1e3).toFixed(0)+'K';
    return s+'$'+Math.round(v);
  }
  if (abs>=1e7) return s+'₹'+(abs/1e7).toFixed(1)+'Cr';
  if (abs>=1e5) return s+'₹'+(abs/1e5).toFixed(0)+'L';
  return s+'₹'+Math.round(abs/1000)+'K';
}

// USD formatter for stock dashboard values
function fmtUSD(n) {
  const abs=Math.abs(n);
  if (abs>=1e6) return '$'+(abs/1e6).toFixed(2)+'M';
  if (abs>=1e3) return '$'+(abs/1e3).toFixed(1)+'K';
  return '$'+abs.toFixed(2);
}

// Stock formatters that respect the INR/USD toggle
function fmtSt(usd) {
  if (currency==='INR') return fmtC(usd*exRate());
  return fmtUSD(usd);
}
// Per-share price (more decimal precision)
function fmtStPx(usd) {
  if (currency==='INR') {
    const inr=usd*exRate();
    if (inr>=1e5) return '₹'+(inr/1e5).toFixed(2)+'L';
    if (inr>=1e3) return '₹'+Math.round(inr).toLocaleString('en-IN');
    return '₹'+inr.toFixed(2);
  }
  return '$'+usd.toFixed(2);
}

function hexRgba(hex, a) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

// ══ PROPERTY MATHS ═════════════════════════════════════════════════════
function calcEMI(p, r) {
  if (p<=0) return 0;
  const mr=r/12/100;
  // Standard reducing-balance EMI: P × r(1+r)^n / ((1+r)^n − 1)
  return p*mr*Math.pow(1+mr,TERM)/(Math.pow(1+mr,TERM)-1);
}
function amortize(loan, rate, extra) {
  if (loan<=0) return {emi:0,totalInt:0,months:0,bals:[0]};
  const mr=rate/12/100, emi=calcEMI(loan,rate);
  let bal=loan, tot=0, mo=0; const bals=[loan];
  while (bal>0.5&&mo<TERM) {
    const ic=bal*mr, pp=Math.min(emi-ic+extra,bal);
    tot+=ic; bal-=pp; mo++; bals.push(Math.round(bal));
  }
  return {emi,totalInt:tot,months:mo,bals};
}
function amortizeBase(loan, rate) {
  if (loan<=0) return {totalInt:0,bals:Array(TERM+1).fill(0)};
  const mr=rate/12/100, emi=calcEMI(loan,rate);
  let bal=loan; const bals=[loan];
  for (let i=0;i<TERM;i++) { bal=Math.max(0,bal-(emi-bal*mr)); bals.push(Math.round(bal)); }
  return {totalInt:emi*TERM-loan,bals};
}

// net equity = propertyValue − cumulativeCashSpent − outstandingLoan
function calcReturns(prop, cash, loan, rate, extra, appPct, rental, maxM) {
  const mr=rate/12/100, emi=calcEMI(loan,rate);
  const mApp=Math.pow(1+appPct/100,1/12)-1;
  let bal=loan, cumOut=cash, loanEndM=loan<=0?0:-1;
  const pV=[Math.round(prop)], oV=[Math.round(cash+loan)], prV=[Math.round(prop-cash-loan)];
  for (let m=1;m<=maxM;m++) {
    const pv=prop*Math.pow(1+mApp,m);
    if (bal>0.5) {
      const ic=bal*mr, pp=Math.min(emi-ic+extra,bal);
      cumOut+=ic+pp-rental; bal-=pp;
      if (bal<=0.5) { bal=0; if (loanEndM<0) loanEndM=m; }
    } else { cumOut-=rental; }
    pV.push(Math.round(pv)); oV.push(Math.round(cumOut+bal)); prV.push(Math.round(pv-cumOut-bal));
  }
  if (loanEndM<0) loanEndM=maxM;
  let beM=-1, recoupM=-1;
  for (let m=0;m<=maxM;m++) {
    if (beM<0&&prV[m]>0) beM=m;
    if (recoupM<0&&prV[m]>=cash) recoupM=m;
    if (beM>=0&&recoupM>=0) break;
  }
  return {pV,oV,prV,loanEndM,beM,recoupM};
}

// ══ MILESTONE PLUGIN ═══════════════════════════════════════════════════
function rRect(ctx,x,y,w,h,r){
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}
const msPlugin = {
  id:'ms',
  afterDraw(chart) {
    const o=chart._msOpts; if(!o) return;
    const {ctx,chartArea:{top,bottom,left,right},scales:{x,y}}=chart;
    const dLen=chart.data.labels.length; ctx.save();
    (o.markers||[]).forEach((ms,i)=>{
      if (ms.month<0||ms.month>=dLen) return;
      const px=x.getPixelForValue(ms.month); if(px<left||px>right) return;
      ctx.strokeStyle=ms.sel?ms.color:'rgba(255,255,255,0.13)';
      ctx.lineWidth=ms.sel?1.5:1; ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(px,top); ctx.lineTo(px,bottom); ctx.stroke(); ctx.setLineDash([]);
      const bY=top+6+i*28;
      const pText=ms.profit!=null?((ms.profit>=0?'+':'')+fmtAxis(ms.profit)):'';
      const pColor=ms.profit!=null?(ms.profit>=0?'#10b981':'#f87171'):'#94a3b8';
      const boxH=pText?30:17;
      ctx.font='600 9px system-ui';
      const tw=Math.max(ctx.measureText(ms.label).width,pText?ctx.measureText(pText).width:0);
      const bW=tw+16, bX=Math.max(left+bW/2+2,Math.min(right-bW/2-2,px));
      ctx.fillStyle='rgba(10,12,18,0.92)'; ctx.strokeStyle=ms.sel?ms.color:'rgba(255,255,255,0.09)';
      ctx.lineWidth=ms.sel?1.5:0.5; rRect(ctx,bX-bW/2,bY,bW,boxH,4); ctx.fill(); ctx.stroke();
      ctx.textAlign='center'; ctx.fillStyle=ms.sel?ms.color:'#64748b'; ctx.font='600 9px system-ui';
      ctx.fillText(ms.label,bX,bY+10);
      if (pText) { ctx.fillStyle=pColor; ctx.font='9px system-ui'; ctx.fillText(pText,bX,bY+23); }
    });
    if (o.loanEnd>=0&&o.loanEnd<dLen) {
      const px=x.getPixelForValue(o.loanEnd); if(px>=left&&px<=right) {
        ctx.strokeStyle='rgba(96,165,250,0.45)'; ctx.lineWidth=1; ctx.setLineDash([3,4]);
        ctx.beginPath(); ctx.moveTo(px,top); ctx.lineTo(px,bottom); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle='#60a5fa'; ctx.font='9px system-ui'; ctx.textAlign='center';
        ctx.fillText('Loan end',px,bottom+13);
      }
    }
    if (o.be>0&&o.be<dLen) {
      const px=x.getPixelForValue(o.be), pv=chart.data.datasets[0].data[o.be];
      if (pv!=null&&px>=left&&px<=right) {
        const py=y.getPixelForValue(pv);
        ctx.fillStyle='#fbbf24'; ctx.strokeStyle='#0d0f14'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(px,py,5,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.fillStyle='#fbbf24'; ctx.font='600 9px system-ui'; ctx.textAlign='left';
        ctx.fillText('Break-even',px+8,py+4);
      }
    }
    // Crossover marker — where Invest & Defer NW overtakes Buy Now NW
    if (o.crossover > 0 && o.crossover < dLen) {
      const px = x.getPixelForValue(o.crossover); if (px >= left && px <= right) {
        ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 1.5; ctx.setLineDash([3,3]);
        ctx.beginPath(); ctx.moveTo(px, top); ctx.lineTo(px, bottom); ctx.stroke(); ctx.setLineDash([]);
        const lbl = '↑ invest wins'; const tw2 = ctx.measureText(lbl).width + 16;
        const bX2 = Math.max(left+tw2/2+2, Math.min(right-tw2/2-2, px));
        const bY2 = bottom - 28;
        ctx.fillStyle = 'rgba(10,12,18,0.92)'; ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 1;
        rRect(ctx, bX2-tw2/2, bY2, tw2, 17, 4); ctx.fill(); ctx.stroke();
        ctx.textAlign = 'center'; ctx.fillStyle = '#a78bfa'; ctx.font = '600 9px system-ui';
        ctx.fillText(lbl, bX2, bY2 + 11);
      }
    }
    ctx.restore();
  }
};
Chart.register(msPlugin);

// ══ PROPERTY CHARTS ════════════════════════════════════════════════════
const loanChart = new Chart(document.getElementById('loanChart').getContext('2d'),{
  type:'line', data:{labels:[],datasets:[
    {data:[],borderColor:'#3b82f6',backgroundColor:'rgba(16,185,129,0.12)',borderWidth:2,pointRadius:0,fill:{target:1,above:'rgba(16,185,129,0.12)',below:'transparent'},tension:.35},
    {data:[],borderColor:'#ef4444',backgroundColor:'rgba(239,68,68,0.05)',borderWidth:1.5,borderDash:[5,3],pointRadius:0,fill:true,tension:.35}
  ]},
  options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
    scales:{
      x:{ticks:{color:'#475569',maxTicksLimit:12,font:{size:10}},grid:{display:false},border:{color:'rgba(255,255,255,0.05)'}},
      y:{ticks:{callback:v=>fmtAxis(v),color:'#475569',font:{size:10},maxTicksLimit:5},grid:{color:'rgba(255,255,255,0.04)'},border:{color:'rgba(255,255,255,0.05)'}}
    }}
});
const retChart = new Chart(document.getElementById('retChart').getContext('2d'),{
  type:'line', data:{labels:[],datasets:[
    // View A: equity-positive — green fill to y=0
    {data:[],borderColor:'#10b981',backgroundColor:'rgba(16,185,129,0.18)',borderWidth:2,pointRadius:0,fill:'origin',tension:.35},
    // View A: equity-negative — red fill to y=0
    {data:[],borderColor:'#ef4444',backgroundColor:'rgba(239,68,68,0.18)',borderWidth:2,pointRadius:0,fill:'origin',tension:.35},
    // View B: buy-now net worth (solid green)
    {data:[],borderColor:'#10b981',backgroundColor:'transparent',borderWidth:2.5,pointRadius:0,fill:false,tension:.35,hidden:true},
    // View B: invest & defer net worth (dashed purple)
    {data:[],borderColor:'#a78bfa',backgroundColor:'transparent',borderWidth:1.5,borderDash:[4,3],pointRadius:0,fill:false,tension:.35,hidden:true}
  ]},
  options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
    layout:{padding:{bottom:14}},
    scales:{
      x:{ticks:{callback:(v,i)=>{const m=retChart.data.labels[i];return(m%12===0&&m>0)?m/12+'yr':(m===0?'0':null);},color:'#475569',font:{size:10},maxRotation:0,autoSkip:false},grid:{display:false},border:{color:'rgba(255,255,255,0.05)'}},
      y:{ticks:{callback:v=>fmtAxis(v),color:'#475569',font:{size:10},maxTicksLimit:5},grid:{color:'rgba(255,255,255,0.04)'},border:{color:'rgba(255,255,255,0.05)'}}
    }}
});
const compareChart = new Chart(document.getElementById('compareCanvas').getContext('2d'),{
  type:'bubble',
  data:{datasets:[]},
  options:{
    responsive:true, maintainAspectRatio:false,
    plugins:{
      legend:{display:false},
      tooltip:{callbacks:{label:ctx=>{
        const d=ctx.raw;
        return [d.pName, 'Equity: '+fmtC(d.y),
                d.recoupFound ? 'Recoup: '+d.x.toFixed(1)+' yr' : 'Recoup: >'+Math.floor(d.x)+' yr'];
      }}}
    },
    scales:{
      x:{title:{display:true,text:'Years to recoup down payment',color:'#475569',font:{size:10}},
         ticks:{color:'#475569',font:{size:10}},
         grid:{color:'rgba(255,255,255,0.04)'},border:{color:'rgba(255,255,255,0.05)'}},
      y:{title:{display:true,text:'Net equity at horizon',color:'#475569',font:{size:10}},
         ticks:{callback:v=>fmtAxis(v),color:'#475569',font:{size:10},maxTicksLimit:5},
         grid:{color:'rgba(255,255,255,0.04)'},border:{color:'rgba(255,255,255,0.05)'}}
    }
  }
});

// ══ PROPERTY CONTROLS ══════════════════════════════════════════════════
function switchTab(n) {
  currentTab=n;
  [1,2,3].forEach(i=>{
    const t=document.getElementById('tab'+i); if(t) t.classList.toggle('active',n===i);
    const b=document.getElementById('tBtn'+i); if(b) b.classList.toggle('active',n===i);
  });
  if (n===2) setTimeout(()=>{retChart.resize();retChart.update('none');},60);
  if (n===3) setTimeout(()=>{compareChart.resize();updateCompareTab();},60);
}
function switchRetChart(view) {
  retChartView = view;
  [0,1].forEach(i => retChart.setDatasetVisibility(i, view==='equity'));
  [2,3].forEach(i => retChart.setDatasetVisibility(i, view==='compare'));
  document.getElementById('rvBtn1').classList.toggle('active', view==='equity');
  document.getElementById('rvBtn2').classList.toggle('active', view==='compare');
  document.getElementById('retChartTitle').textContent = view==='equity'
    ? 'Net equity over time' : 'Buy now vs Invest & defer — net worth';
  update();
}
function _updateRetLegend(view) {
  const el = document.getElementById('ret-legend'); if (!el) return;
  el.innerHTML = view==='equity'
    ? '<span><span class="ld" style="background:#10b981"></span>Net equity (gain)</span><span><span class="ld" style="background:#ef4444"></span>Net equity (deficit)</span>'
    : '<span><span class="ld" style="background:#10b981"></span>Buy now net worth</span><span><span class="ld" style="background:#a78bfa"></span>Invest &amp; defer NW</span>';
}
function buildCompareData() {
  const maxCash = Math.max(...PROFILES.map(q=>q.state.cash||0), 1);
  return PROFILES.map(p => {
    const s = p.state;
    const emi = calcEMI(s.loan, s.rate);
    const extra = Math.max(0, (s.totalPay||0) - emi);
    const am = amortize(s.loan, s.rate, extra);
    const isCLP = s.payMode==='CLP';
    const loanEndM = isCLP ? am.months+(s.possessionMonth||36) : am.months;
    const maxM = Math.max(loanEndM, 120);
    const tranches = s.tranches?.length ? s.tranches : defaultTranches(s.possessionMonth||36);
    const ret = isCLP
      ? calcReturnsCLP(s.prop, s.cash, s.loan, s.rate, extra, s.appPct||8, s.rentalINR||0, maxM, tranches, s.possessionMonth||36)
      : calcReturns(s.prop, s.cash, s.loan, s.rate, extra, s.appPct||8, s.rentalINR||0, maxM);
    const safeH = Math.min((s.horizonYrs||5)*12, maxM);
    const recoupFound = ret.recoupM >= 0;
    return {
      x: recoupFound ? +(ret.recoupM/12).toFixed(1) : +(maxM/12).toFixed(1),
      y: ret.prV[safeH] ?? 0,
      r: Math.max(7, Math.min(26, (s.cash/maxCash)*26)),
      pName: p.name, color: p.color, recoupFound,
    };
  });
}
function updateCompareTab() {
  if (currentTab!==3) return;
  const pts = buildCompareData();
  compareChart.data.datasets = pts.map(d=>({
    label: d.pName,
    data: [{x:d.x, y:d.y, r:d.r, pName:d.pName, recoupFound:d.recoupFound}],
    backgroundColor: hexRgba(d.color, 0.65),
    borderColor: d.color, borderWidth:2,
  }));
  compareChart.update('none');
}
function setCurrency(c) {
  currency=c;
  document.getElementById('btnINR').classList.toggle('active',c==='INR');
  document.getElementById('btnUSD').classList.toggle('active',c==='USD');
  document.getElementById('rentalPfx').textContent=c==='INR'?'₹':'$';
  const ri=document.getElementById('rentalVal');
  ri.value=c==='INR'?Math.round(rentalINR):Math.round(rentalINR/exRate());
  ri.step=c==='INR'?1000:10; update();
  if (activeDash==='stock') renderStockDash();
}
function onRental() {
  const raw=parseFloat(document.getElementById('rentalVal').value)||0;
  rentalINR=currency==='INR'?raw:raw*exRate(); update();
}
function setHorizon(y) {
  horizonYrs=y;
  [3,5,10].forEach(n=>document.getElementById('hp'+n).classList.toggle('active',n===y)); update();
}
function syncMax() {
  const p=+document.getElementById('propVal').value;
  document.getElementById('cashVal').max=p; document.getElementById('loanVal').max=p;
}
function onProp() {
  if (_busy) return; _busy=true; syncMax();
  document.getElementById('loanVal').value=Math.max(0,Math.min(+document.getElementById('propVal').value-+document.getElementById('cashVal').value,+document.getElementById('propVal').value));
  _busy=false; update();
}
function onCash() {
  if (_busy) return; _busy=true;
  document.getElementById('loanVal').value=Math.max(0,+document.getElementById('propVal').value-+document.getElementById('cashVal').value);
  _busy=false; update();
}
function onLoan() {
  if (_busy) return; _busy=true;
  document.getElementById('cashVal').value=Math.max(0,+document.getElementById('propVal').value-+document.getElementById('loanVal').value);
  _busy=false; update();
}

// ══ CONSTRUCTION LINKED PLAN (CLP) ═════════════════════════════════════
function setPayMode(mode) {
  clpPayMode = mode;
  document.getElementById('payOTP').classList.toggle('active', mode==='OTP');
  document.getElementById('payCLP').classList.toggle('active', mode==='CLP');
  document.getElementById('clp-section').classList.toggle('hidden', mode !== 'CLP');
  update();
}

// Derives possession month from the possession date field vs today.
// Falls back to clpPossMonth if no date is set.
function computePossMonth() {
  const dateStr = document.getElementById('possDateVal').value; // YYYY-MM
  if (!dateStr) return clpPossMonth;
  const target = new Date(dateStr + '-01');
  const now = new Date();
  // zero out day to avoid off-by-one from current day of month
  now.setDate(1);
  const months = Math.round((target - now) / (1000 * 60 * 60 * 24 * 30.4375));
  return Math.max(1, months);
}

function renderTranches() {
  const tbody = document.getElementById('tranche-tbody');
  if (!tbody) return;
  const last = clpTranches.length - 1;
  // Always sync the last tranche month to clpPossMonth
  if (clpTranches.length > 0) clpTranches[last].month = clpPossMonth;
  tbody.innerHTML = clpTranches.map((t, i) => {
    const isLast = i === last;
    const monthInput = isLast
      ? `<input class="t-num" type="number" value="${clpPossMonth}" readonly
             style="opacity:.45;cursor:default;pointer-events:none" title="Auto-set to possession month">`
      : `<input class="t-num" type="number" value="${t.month}" min="0" max="${clpPossMonth - 1}" step="1"
             onchange="clpTranches[${i}].month=Math.min(${clpPossMonth-1},Math.max(0,+this.value))">`;
    const delBtn = (!isLast && clpTranches.length > 2)
      ? `<button class="t-del" onclick="deleteTranche(${i})" title="Remove">✕</button>`
      : `<span style="width:24px;display:inline-block"></span>`;
    return `
    <tr>
      <td><input class="t-lbl" value="${escHtml(t.label)}" onchange="clpTranches[${i}].label=this.value"></td>
      <td style="width:48px"><input class="t-num" type="number" value="${t.pct}" min="0" max="100" step="1"
          onchange="clpTranches[${i}].pct=Math.max(0,+this.value);updateTrancheSum()"></td>
      <td class="t-unit">%</td>
      <td style="width:44px">${monthInput}</td>
      <td class="t-unit">${isLast ? '<span style="opacity:.45">mo ⚑</span>' : 'mo'}</td>
      <td>${delBtn}</td>
    </tr>`;
  }).join('');
  updateTrancheSum();
}

function updateTrancheSum() {
  const total = clpTranches.reduce((s, t) => s + (t.pct||0), 0);
  const el = document.getElementById('tranche-sum');
  el.textContent = `Total: ${total}%${total===100 ? ' ✓' : ' — must equal 100%'}`;
  el.className = 'tranche-sum ' + (total===100 ? 'ok' : 'warn');
}

function addTranche() {
  // Insert before the last (Possession) tranche
  const insertAt = Math.max(clpTranches.length - 1, 0);
  const midMonth = Math.round(clpPossMonth / 2);
  clpTranches.splice(insertAt, 0, { label:'Milestone', pct:0, month:midMonth });
  renderTranches();
}

function deleteTranche(i) {
  if (clpTranches.length <= 1) return;
  clpTranches.splice(i, 1);
  renderTranches();
  update();
}

function equalSplitPreset() {
  const raw = prompt('How many equal payments? (2–12)', '4');
  const n = parseInt(raw);
  if (!n || n < 2 || n > 12) return;
  const base = Math.floor(100 / n), last = 100 - base * (n - 1);
  const interval = Math.round(clpPossMonth / (n - 1));
  clpTranches = Array.from({length: n}, (_, i) => ({
    label: i===0 ? 'Booking' : i===n-1 ? 'Possession' : `Tranche ${i+1}`,
    pct:   i===n-1 ? last : base,
    month: i===n-1 ? clpPossMonth : Math.min(i * interval, clpPossMonth - 1),
  }));
  renderTranches();
  update();
}

// Returns calculation for CLP mode.
// Tranches are % of the cash payment amount; property value = 0 pre-possession,
// then jumps to full market value at possession and appreciates from there.
function calcReturnsCLP(prop, cash, loan, rate, extra, appPct, rental, maxM, trancheList, possM) {
  const mr=rate/12/100, emi=calcEMI(loan, rate);
  const mApp=Math.pow(1+appPct/100, 1/12)-1;
  let bal=loan, cumOut=0, loanEndM=-1;

  // Build month → cash amount map (tranches clamped to possM)
  const tMap={};
  trancheList.forEach(t => {
    const m = Math.min(Math.round(t.month||0), possM);
    tMap[m] = (tMap[m]||0) + cash*(t.pct/100);
  });

  cumOut = tMap[0]||0;
  const pV=[0], oV=[Math.round(cumOut)], prV=[Math.round(-cumOut)];

  for (let m=1; m<=maxM; m++) {
    // Pre-possession: pay tranches, no property value, no loan
    if (m < possM) {
      cumOut += (tMap[m]||0);
      pV.push(0); oV.push(Math.round(cumOut)); prV.push(Math.round(-cumOut));
      continue;
    }
    // At possession month: final tranche + loan starts
    if (m === possM) {
      cumOut += (tMap[m]||0);
      bal = loan;
    }
    // Post-possession: property appreciates from possession date
    const pv = prop * Math.pow(1+mApp, m-possM);
    if (bal > 0.5) {
      const ic=bal*mr, pp=Math.min(emi-ic+extra, bal);
      cumOut += ic+pp-rental; bal -= pp;
      if (bal<=0.5) { bal=0; if (loanEndM<0) loanEndM=m; }
    } else { cumOut -= rental; }
    pV.push(Math.round(pv)); oV.push(Math.round(cumOut+bal)); prV.push(Math.round(pv-cumOut-bal));
  }
  if (loanEndM<0) loanEndM=maxM;

  let beM=-1, recoupM=-1;
  for (let m=0; m<=maxM; m++) {
    if (beM<0 && pV[m]>0 && prV[m]>0) beM=m;
    if (recoupM<0 && prV[m]>=cash) recoupM=m;
    if (beM>=0 && recoupM>=0) break;
  }
  return {pV, oV, prV, loanEndM, beM, recoupM};
}

// ══ INVEST & DEFER OPPORTUNITY COST ════════════════════════════════════
// Both scenarios share the same monthly budget (totalMonthlyPay) and same
// lump sum (down payment).
//
// Scenario B (Invest & Defer):
//   Month 0  : invest the down payment as a lump sum
//   Each month: invest (totalMonthlyPay − rent) → SIP; pay rent from other funds
//   Net worth at t: corpus(t) − cumulative_rent(t)
//
// Decisive comparison at loan-payoff month N:
//   surplus = (corpus(N) − total_rent(N)) − property_value(N)
//   positive → Scenario B wins (same property + leftover cash)
//   negative → Scenario A wins (buying now was cheaper in wealth terms)
//
// crossoverMonth: first month where NW_B(t) > NW_A(t)  (invest starts beating buy)
// possessionMonth: 0 for OTP, >0 for CLP
// tranches: null for OTP; array of {pct, month} for CLP
function calcInvestAlt(prop, cash, totalMonthlyPay, loanEndM, appPct, rentalINR, altPct, maxM,
                       possessionMonth, tranches) {
  const possM = possessionMonth || 0;
  const altR  = altPct / 12 / 100;
  const mApp  = Math.pow(1 + appPct / 100, 1/12) - 1;
  const sip   = Math.max(0, totalMonthlyPay - rentalINR);

  // Build a map of month → cash to invest, mirroring the tranche schedule.
  // OTP: entire down payment invested at month 0.
  // CLP: each tranche invested at the same month it would otherwise be paid.
  const trancheMap = {};
  if (possM > 0 && tranches && tranches.length) {
    tranches.forEach(t => {
      const m = Math.min(Math.round(t.month || 0), possM);
      trancheMap[m] = (trancheMap[m] || 0) + cash * (t.pct / 100);
    });
  } else {
    trancheMap[0] = cash;
  }

  let corpus  = trancheMap[0] || 0;   // booking tranche (or full lump sum for OTP)
  let cumRent = 0;
  const nwBV  = [Math.round(corpus)];

  for (let m = 1; m <= maxM; m++) {
    corpus = corpus * (1 + altR);
    corpus += (trancheMap[m] || 0);          // invest tranche when it falls due
    if (m > possM) corpus += sip;            // SIP only after possession (post-construction)
    cumRent += rentalINR;
    nwBV.push(Math.round(corpus - cumRent));
  }

  // Property appreciation starts at possession (same logic as calcReturnsCLP)
  const appMonths   = Math.max(0, loanEndM - possM);
  const propAtPayoff = prop * Math.pow(1 + mApp, appMonths);

  // Re-derive corpus and cumRent exactly at loanEndM for the card values
  let c2 = trancheMap[0] || 0, cr2 = 0;
  for (let m = 1; m <= loanEndM; m++) {
    c2 = c2 * (1 + altR);
    c2 += (trancheMap[m] || 0);
    if (m > possM) c2 += sip;
    cr2 += rentalINR;
  }
  const surplusAtPayoff = (c2 - cr2) - propAtPayoff;

  return { nwBV, corpus: c2, totalRent: cr2, propAtPayoff, surplusAtPayoff, sip };
}

// ══ PROPERTY UPDATE ════════════════════════════════════════════════════
function update() {
  const prop=+document.getElementById('propVal').value, cash=+document.getElementById('cashVal').value;
  const loan=+document.getElementById('loanVal').value, rate=+document.getElementById('rateVal').value;
  const appPct=+document.getElementById('appVal').value;
  const isCLP = clpPayMode === 'CLP';

  // Re-derive possession month from date whenever in CLP mode
  if (isCLP) {
    const derived = computePossMonth();
    if (derived !== clpPossMonth) {
      clpPossMonth = derived;
      // clamp all intermediate tranche months, keep last pinned (renderTranches does this)
      clpTranches.slice(0, -1).forEach(t => { t.month = Math.min(t.month, clpPossMonth - 1); });
      renderTranches();
    }
    // Always keep the display and last-tranche in sync
    const yrs = Math.floor(clpPossMonth/12), mos = clpPossMonth%12;
    document.getElementById('possMonthOut').textContent =
      (yrs > 0 ? yrs+'yr '+(mos?mos+'mo':'') : clpPossMonth+' mo');
    if (clpTranches.length) clpTranches[clpTranches.length-1].month = clpPossMonth;
  }

  // Price per sqft
  const sqft = +document.getElementById('sqftVal').value||0;
  document.getElementById('pricePerSqft').textContent = sqft > 0 ? fmtC(Math.round(prop/sqft))+'/sqft' : '—';

  document.getElementById('propOut').textContent=fmtC(prop);
  document.getElementById('cashOut').textContent=fmtC(cash);
  document.getElementById('loanOut').textContent=fmtC(loan);
  document.getElementById('loanHint').textContent='Loan = '+fmtC(loan);
  document.getElementById('cashHint').textContent='Cash = '+fmtC(cash);
  document.getElementById('rateOut').textContent=rate.toFixed(2)+'%';
  const emi=calcEMI(loan,rate);
  const minPay=Math.max(5000,Math.ceil(emi/5000)*5000);
  const ps=document.getElementById('prepayVal'); ps.min=minPay;
  if (+ps.value<minPay) ps.value=minPay;
  const curTotalPay=+ps.value, extra=Math.max(0,curTotalPay-emi);
  document.getElementById('prepayOut').textContent=fmtC(curTotalPay);
  document.getElementById('prepayHint').innerHTML='<b>EMI</b> '+fmtC(Math.round(emi))+'&nbsp; &middot; &nbsp;<b>Extra</b> '+fmtC(Math.round(extra));
  const am=amortize(loan,rate,extra), base=amortizeBase(loan,rate);

  // Metric cards — in CLP mode payoff time counts from booking (includes construction)
  document.getElementById('m1EMI').textContent=fmtC(Math.round(am.emi));
  if (loan>0) {
    const mo=am.months;
    const totalMo = isCLP ? mo + clpPossMonth : mo;
    const tYrs=Math.floor(totalMo/12), tMos=totalMo%12;
    document.getElementById('m1Mo').textContent=totalMo;
    const moLabel = tYrs>0 ? tYrs+'yr '+(tMos?tMos+'mo':'') : totalMo+' months';
    document.getElementById('m1MoSub').textContent = isCLP ? moLabel+' from booking' : moLabel;
    document.getElementById('m1Int').textContent=fmtC(Math.round(am.totalInt));
    document.getElementById('m1Saved').textContent=fmtC(Math.max(0,Math.round(base.totalInt-am.totalInt)));
    document.getElementById('m1Total').textContent=fmtC(Math.round(cash+loan+am.totalInt));
  } else {
    ['m1Mo','m1Int','m1Saved'].forEach(id=>document.getElementById(id).textContent='—');
    document.getElementById('m1MoSub').textContent='no loan';
    document.getElementById('m1Total').textContent=fmtC(cash);
  }

  // Loan balance chart — in CLP mode prepend zeros for construction period (loan not yet disbursed)
  const lMax = isCLP ? Math.max(am.months+clpPossMonth, TERM) : Math.max(am.months, TERM);
  let lwp, lbase;
  if (isCLP) {
    const zeros = Array(clpPossMonth).fill(0);
    lwp   = [...zeros, ...am.bals];   while(lwp.length<=lMax)   lwp.push(0);
    lbase = [...zeros, ...base.bals]; while(lbase.length<=lMax) lbase.push(0);
  } else {
    lwp=[...am.bals]; while(lwp.length<=lMax) lwp.push(0);
    lbase=base.bals;
  }
  loanChart.data.labels=Array.from({length:lMax+1},(_,i)=>i);
  loanChart.data.datasets[0].data=lwp; loanChart.data.datasets[1].data=lbase;
  loanChart.update('none');

  document.getElementById('appOut').textContent=appPct.toFixed(1)+'% p.a.';

  // Returns calculation
  const effectiveLoanEndM = isCLP ? am.months + clpPossMonth : am.months;
  const maxRetM = Math.max(effectiveLoanEndM, 120);
  const ret = isCLP
    ? calcReturnsCLP(prop, cash, loan, rate, extra, appPct, rentalINR, maxRetM, clpTranches, clpPossMonth)
    : calcReturns(prop, cash, loan, rate, extra, appPct, rentalINR, maxRetM);
  const loanEndM = ret.loanEndM;

  const hM=horizonYrs*12, safeH=Math.min(hM,maxRetM);
  const profitEnd=ret.prV[loanEndM]??0, profitH=ret.prV[safeH]??0;
  const propEnd=ret.pV[loanEndM]??prop, propH=ret.pV[safeH]??prop;
  const ley=Math.floor(loanEndM/12);
  document.getElementById('loanEndLbl').textContent=loanEndM+'mo'+(ley>0?' ('+ley+'yr)':'');
  document.getElementById('totalPaidLbl').textContent=fmtC(Math.round(cash+loan+am.totalInt));
  document.getElementById('m2PropEnd').textContent=fmtC(propEnd);
  const peEl=document.getElementById('m2PrEnd');
  peEl.textContent=(profitEnd>=0?'+':'')+fmtC(profitEnd); peEl.className='mc-profit '+(profitEnd>=0?'pos':'neg');
  document.getElementById('m2HLbl').textContent='At '+horizonYrs+'-Year Mark';
  document.getElementById('m2PropH').textContent=hM<=maxRetM?fmtC(propH):'—';
  const phEl=document.getElementById('m2PrH');
  phEl.textContent=hM<=maxRetM?((profitH>=0?'+':'')+fmtC(profitH)):'—'; phEl.className='mc-profit '+(profitH>=0?'pos':'neg');
  const be=ret.recoupM;
  if (be<0) {
    document.getElementById('m2BE').textContent='>'+Math.floor(maxRetM/12)+'yr';
    document.getElementById('m2BESub').textContent='try longer horizon or higher appreciation';
  } else {
    const by=Math.floor(be/12),bm=be%12;
    document.getElementById('m2BE').textContent=by>0?by+'yr '+(bm?bm+'mo':''):be+'mo';
    document.getElementById('m2BESub').textContent='profit ≥ down payment of '+fmtC(cash);
  }
  document.getElementById('m2RLbl').textContent='Rental at '+horizonYrs+'yr';
  document.getElementById('m2Rental').textContent=fmtC(rentalINR*(Math.min(hM,maxRetM)));

  // ── Opportunity cost: Invest & Defer ──────────────────────────────────
  const altRetPct = +document.getElementById('altRetVal').value || 10;
  document.getElementById('altRetOut').textContent = altRetPct.toFixed(1)+'% p.a.';
  const alt = calcInvestAlt(
    prop, cash, curTotalPay, loanEndM, appPct, rentalINR, altRetPct, maxRetM,
    isCLP ? clpPossMonth : 0,
    isCLP ? clpTranches  : null
  );
  // SIP info row
  document.getElementById('opp-sip-display').textContent  = fmtC(alt.sip);
  document.getElementById('opp-lump-display').textContent = fmtC(cash);
  document.getElementById('opp-sip-warn').style.display   = alt.sip === 0 && rentalINR > 0 ? 'block' : 'none';
  // Cards
  document.getElementById('opp-corpus').textContent  = fmtC(Math.round(alt.corpus));
  document.getElementById('opp-rent').textContent    = fmtC(Math.round(alt.totalRent));
  document.getElementById('opp-net').textContent     = fmtC(Math.round(alt.corpus - alt.totalRent));
  document.getElementById('opp-propval').textContent = fmtC(Math.round(alt.propAtPayoff));
  const surp = alt.surplusAtPayoff;
  document.getElementById('opp-surplus').textContent = (surp>=0?'+':'')+fmtC(Math.round(surp));
  const vc = document.getElementById('opp-verdict-card');
  vc.className = 'mc ' + (surp>=0 ? 'green' : 'red');
  document.getElementById('opp-verdict').textContent = surp>=0 ? 'Invest & defer wins ✓' : 'Buy now wins ✓';
  // Find NW crossover: first month where NW_B(t) > NW_A(t)
  let crossoverM = -1;
  for (let m = 0; m <= maxRetM; m++) {
    const nwA = (ret.pV[m]??0) - Math.max(0, (isCLP ? (m<clpPossMonth?0:loan) : loan) /* approx */);
    if (alt.nwBV[m] !== undefined && alt.nwBV[m] > (ret.pV[m]??0) - (ret.oV[m]??0) + (ret.prV[m]??0)) {
      // simpler: NW_B > NW_A where NW_A = prV (already computes equity)
    }
    if (m > 0 && alt.nwBV[m] !== undefined && ret.prV[m] !== undefined) {
      if (crossoverM < 0 && alt.nwBV[m] > ret.prV[m]) crossoverM = m;
    }
  }
  // Chart
  retChart.data.labels=Array.from({length:maxRetM+1},(_,i)=>i);
  // View A datasets: split prV at zero so each fills to the y=0 baseline
  retChart.data.datasets[0].data=ret.prV.map(v=>v>=0?v:NaN);
  retChart.data.datasets[1].data=ret.prV.map(v=>v<0?v:NaN);
  // View B datasets: both net-worth lines on the same axis
  retChart.data.datasets[2].data=ret.prV;
  retChart.data.datasets[3].data=alt.nwBV;
  const markerDefs=[
    {month:36,label:'3yr',color:'#a78bfa',sel:horizonYrs===3},
    {month:60,label:'5yr',color:'#60a5fa',sel:horizonYrs===5},
    {month:120,label:'10yr',color:'#34d399',sel:horizonYrs===10},
  ];
  retChart._msOpts = retChartView==='equity' ? {
    markers:markerDefs.filter(m=>m.month<=maxRetM).map(m=>({...m,profit:ret.prV[m.month]??null})),
    loanEnd:loanEndM<=maxRetM?loanEndM:-1, be:ret.beM, crossover:-1
  } : {
    markers:[], loanEnd:-1, be:-1,
    crossover: crossoverM>0&&crossoverM<=maxRetM ? crossoverM : -1
  };
  _updateRetLegend(retChartView);
  retChart.update('none');
  updateCompareTab();

  // Pre-possession info bar (CLP only)
  document.getElementById('pre-pos-bar').classList.toggle('hidden', !isCLP);
  if (isCLP) {
    const py=Math.floor(clpPossMonth/12), pm=clpPossMonth%12;
    document.getElementById('ppb-period').textContent = py>0 ? py+'yr '+(pm?pm+'mo':'') : clpPossMonth+' mo';
    document.getElementById('ppb-preout').textContent = fmtC(cash);
    document.getElementById('ppb-loanstart').textContent = 'Month ' + clpPossMonth;
  }
}
