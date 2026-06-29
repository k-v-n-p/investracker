// ══ DASHBOARD SWITCH ═══════════════════════════════════════════════════
let activeDash = 'property';

function refreshHeaderTitles() {
  const hidden = typeof Privacy !== 'undefined' && Privacy.hidden;
  if (activeDash === 'stock') {
    document.getElementById('titleActive').textContent = hidden ? 'USP' : 'US Stock Portfolio';
    document.getElementById('titleSwitch').textContent = hidden ? '⇄ PIC' : '⇄ Property Calculator';
    document.getElementById('hdrSub').textContent = 'Robinhood · US Equities';
  } else {
    document.getElementById('titleActive').textContent = hidden ? 'PIC' : 'Property Investment Calculator';
    document.getElementById('titleSwitch').textContent = hidden ? '⇄ USP' : '⇄ Stock Portfolio';
    document.getElementById('hdrSub').textContent = 'Hyderabad · NRI Dashboard';
  }
}

function switchDashboard() {
  if (activeDash==='property') {
    activeDash='stock';
    document.getElementById('propertyDash').classList.add('hidden');
    document.getElementById('stockDash').classList.remove('hidden');
    document.getElementById('rateWrapEl').classList.add('hidden');
    refreshHeaderTitles();
    document.getElementById('profileDot').style.background = '#3b82f6';
    setTimeout(()=>{ perfChart.resize(); allocChart.resize(); },60);
    if (stockHoldings.length) {
      const todayPrices=Storage.load('stock_prices_'+new Date().toISOString().slice(0,10),null);
      if (todayPrices) {
        // Restore today's prices snapshot instantly — zero API calls
        stockPrices=todayPrices; renderStockDash();
      } else if (AV.keys.length) {
        refreshStockData();
      } else { renderStockDash(); }
    }
  } else {
    activeDash='property';
    document.getElementById('stockDash').classList.add('hidden');
    document.getElementById('propertyDash').classList.remove('hidden');
    document.getElementById('curToggleWrap').classList.remove('hidden');
    document.getElementById('rateWrapEl').classList.remove('hidden');
    refreshHeaderTitles();
    renderProfileBar();
  }
}

// ══ ALPHA VANTAGE API ══════════════════════════════════════════════════
const AV = {
  BASE: 'https://www.alphavantage.co/query',
  _activeKey: 0,   // 0=unset, 1=key1 in use, 2=key2 fallback

  get keys() {
    const s=Storage.load('app_settings',{});
    return [s.apiKey, s.apiKey2].filter(Boolean);
  },
  // kept for backward-compat guard checks
  get key() { return this.keys[0] || ''; },

  // 250ms gap between calls to stay under 5 req/min free-tier limit
  _q: [], _t: null,
  _enqueue(fn) {
    return new Promise((res,rej) => { this._q.push({fn,res,rej}); if(!this._t) this._drain(); });
  },
  _drain() {
    if (!this._q.length) { this._t=null; return; }
    const {fn,res,rej}=this._q.shift(); fn().then(res).catch(rej);
    this._t=setTimeout(()=>this._drain(), 250);
  },

  _ck: (ticker, type) => `av_${type}_${ticker}_${new Date().toISOString().slice(0,10)}`,

  // Alpha Vantage returns rate-limit as HTTP 200 with a Note or Information field
  _isRateLimited: d => !!(d.Note || d.Information),

  _trackRequest() {
    const ck='av_req_count_'+new Date().toISOString().slice(0,10);
    const n=(Storage.load(ck,0)||0)+1;
    Storage.save(ck, n);
  },
  get todayReqs() {
    return Storage.load('av_req_count_'+new Date().toISOString().slice(0,10), 0);
  },

  async _fetchWithKey(params, apiKey) {
    this._trackRequest();
    const r=await fetch(this.BASE+'?'+new URLSearchParams({...params, apikey: apiKey}));
    if (!r.ok) throw new Error('HTTP_'+r.status);
    return r.json();
  },

  async _fetch(params) {
    const [k1, k2]=this.keys;
    if (!k1) throw new Error('NO_KEY');
    const d=await this._fetchWithKey(params, k1);
    if (!this._isRateLimited(d)) { this._activeKey=1; return d; }
    // Key 1 hit its daily limit — try Key 2
    if (!k2) { this._activeKey=1; throw new Error('RATE_LIMITED'); }
    const d2=await this._fetchWithKey(params, k2);
    if (this._isRateLimited(d2)) { this._activeKey=2; throw new Error('RATE_LIMITED'); }
    this._activeKey=2; return d2;
  },

  async quote(ticker) {
    const ck=this._ck(ticker,'q'), hit=Storage.load(ck,null);
    if (hit) return hit;
    return this._enqueue(async () => {
      const d=await this._fetch({function:'GLOBAL_QUOTE',symbol:ticker});
      const q=d['Global Quote']||{};
      const out={
        price:    parseFloat(q['05. price']          ||0),
        change:   parseFloat(q['09. change']          ||0),
        changePct: q['10. change percent']            ||'0%',
        prevClose: parseFloat(q['08. previous close'] ||0),
      };
      Storage.save(ck, out); return out;
    });
  },

  async daily(ticker) {
    const ck=this._ck(ticker,'d'), hit=Storage.load(ck,null);
    if (hit) return hit;
    return this._enqueue(async () => {
      const d=await this._fetch({function:'TIME_SERIES_DAILY',symbol:ticker,outputsize:'compact'});
      const ts=d['Time Series (Daily)']||{};
      const out=Object.entries(ts).map(([date,v])=>({date,close:parseFloat(v['4. close'])})).sort((a,b)=>a.date.localeCompare(b.date));
      Storage.save(ck, out); return out;
    });
  },

  async search(kw) {
    if (!this.keys.length||kw.length<2) return [];
    try {
      const d=await this._fetch({function:'SYMBOL_SEARCH',keywords:kw});
      return (d.bestMatches||[]).slice(0,8).map(m=>({ticker:m['1. symbol'],name:m['2. name'],type:m['3. type'],region:m['4. region']})).filter(m=>m.type==='Equity'||m.region==='United States');
    } catch(e) { return []; }
  }
};

// ══ STOCK STATE ════════════════════════════════════════════════════════
let stockHoldings  = Storage.load('stock_holdings', []);
let stockPnlHistory= Storage.load('stock_pnl_history', []);
let stockPrices    = {};
let lastRefreshed  = null;
let _editIdx       = -1;
let _holdingsCols  = { invested: '$', returns: '$' };
let _dragIdx       = null;
let _pnlView       = 'daily';   // 'daily' | 'monthly'
let _pnlDisplay    = [];        // the data series currently driving the perf chart

function aggregateMonthly(history) {
  const map={};
  history.forEach(d=>{
    const m=d.date.slice(0,7);
    if (!map[m]) map[m]={ pnlPcts:[], pnlValue:0 };
    map[m].pnlPcts.push(d.pnlPct);
    map[m].pnlValue=d.pnlValue; // keep last value of the month
  });
  return Object.entries(map).sort(([a],[b])=>a.localeCompare(b)).map(([m,v])=>{
    const avg=v.pnlPcts.reduce((s,x)=>s+x,0)/v.pnlPcts.length;
    const label=new Date(m+'-15').toLocaleDateString('en-US',{month:'short',year:'2-digit'});
    return {date:m, label, pnlPct:+avg.toFixed(2), pnlValue:v.pnlValue};
  });
}

function setPnlView(view) {
  _pnlView=view;
  document.getElementById('sh-vt-daily').classList.toggle('active',view==='daily');
  document.getElementById('sh-vt-monthly').classList.toggle('active',view==='monthly');
  document.getElementById('sh-pnl-title').textContent=
    view==='daily'?'Portfolio P&L · active days':'Portfolio P&L · monthly avg';
  updateStockCharts();
}

function updatePnlHistoryHint() {
  const el = document.getElementById('sh-pnl-hint');
  if (!el) return;
  if (!stockHoldings.length) { el.textContent = ''; return; }
  if (stockPnlHistory.length === 0) {
    el.textContent = 'No P&L history — click Backfill to chart how today’s portfolio would have looked.';
  } else if (stockPnlHistory.length === 1) {
    el.textContent = 'Today only — Backfill for full history (snapshot of current holdings, not trade history).';
  } else {
    el.textContent = 'Snapshot of current holdings · re-Backfill after you change positions.';
  }
}

function invalidatePnlHistory() {
  stockPnlHistory = [];
  Storage.save('stock_pnl_history', stockPnlHistory);
  updatePnlHistoryHint();
}

async function backfillPnlHistory() {
  if (!AV.keys.length) { alert('Add an API key in Settings first.'); return; }
  if (!stockHoldings.length) return;
  const btn=document.getElementById('sh-backfill-btn');
  btn.disabled=true; btn.textContent='↻ Fetching…';
  document.getElementById('sh-status').textContent='Backfilling historical P&L…';
  const dailyData={};
  let ok=0;
  for (const h of stockHoldings) {
    try { dailyData[h.ticker]=await AV.daily(h.ticker); ok++; }
    catch(e) { /* rate limited — skip */ }
  }
  if (ok===0) {
    btn.disabled=false; btn.textContent='↺ Backfill';
    document.getElementById('sh-status').textContent='Backfill failed — rate limited. Try again tomorrow.';
    return;
  }
  // Collect all trading dates across fetched tickers
  const dateSet=new Set();
  Object.values(dailyData).forEach(series=>series.forEach(d=>dateSet.add(d.date)));
  const costBasis=stockHoldings.reduce((s,h)=>s+h.shares*h.avgCost,0);
  stockPnlHistory = [];
  dateSet.forEach(date=>{
    let portVal=0;
    stockHoldings.forEach(h=>{
      const series=dailyData[h.ticker]||[];
      const bar=series.find(d=>d.date===date);
      if (bar) { portVal+=h.shares*bar.close; return; }
      const before=series.filter(d=>d.date<date);
      if (before.length) portVal+=h.shares*before[before.length-1].close;
      else portVal+=h.shares*h.avgCost;
    });
    const pnlValue=Math.round((portVal-costBasis)*100)/100;
    const pnlPct=costBasis>0?Math.round((pnlValue/costBasis)*10000)/100:0;
    stockPnlHistory.push({date, pnlValue, pnlPct});
  });
  stockPnlHistory.sort((a,b)=>a.date.localeCompare(b.date));
  Storage.save('stock_pnl_history',stockPnlHistory);
  btn.disabled=false; btn.textContent='↺ Backfill';
  const reqCount=AV.todayReqs;
  document.getElementById('sh-status').textContent=
    `Backfilled ${dateSet.size} dates from ${ok}/${stockHoldings.length} tickers · ${reqCount} API calls today`;
  updatePnlHistoryHint();
  updateStockCharts();
}

function toggleHoldingsCol(col) {
  _holdingsCols[col] = _holdingsCols[col]==='$' ? '%' : '$';
  document.getElementById('sh-col-'+col+'-mode').textContent = _holdingsCols[col];
  renderHoldings();
}

function onDragStart(e, idx) {
  _dragIdx=idx;
  e.dataTransfer.effectAllowed='move';
  // Defer adding class so drag ghost renders before opacity applies
  setTimeout(()=>{ const r=document.querySelector(`#sh-tbody tr:nth-child(${idx+1})`); if(r) r.classList.add('sh-dragging'); },0);
}
function onDragOver(e, idx) {
  e.preventDefault();
  e.dataTransfer.dropEffect='move';
  document.querySelectorAll('#sh-tbody tr').forEach((r,i)=>{
    r.classList.toggle('sh-drag-target', i===idx && i!==_dragIdx);
  });
}
function onDrop(e, idx) {
  e.preventDefault();
  if (_dragIdx===null || _dragIdx===idx) return;
  const moved=stockHoldings.splice(_dragIdx,1)[0];
  stockHoldings.splice(idx,0,moved);
  Storage.save('stock_holdings',stockHoldings);
  _dragIdx=null;
  renderHoldings();
}
function onDragEnd() {
  _dragIdx=null;
  document.querySelectorAll('#sh-tbody .sh-dragging,.sh-drag-target').forEach(r=>{
    r.classList.remove('sh-dragging','sh-drag-target');
  });
}

// Upsert: always replaces an existing entry for the same ticker (snapshot model)
function mergeHolding(ticker, name, newShares, newPrice, buyDate) {
  const idx = stockHoldings.findIndex(h=>h.ticker===ticker);
  if (idx>=0) stockHoldings.splice(idx,1);
  else if (_editIdx>=0) stockHoldings.splice(_editIdx,1);
  stockHoldings.push({ticker, name:name||ticker, shares:newShares, avgCost:newPrice, firstBuyDate:buyDate});
  Storage.save('stock_holdings', stockHoldings);
  invalidatePnlHistory();
}

// portfolioValue = Σ(shares × currentPrice)
// costBasis      = Σ(shares × avgCost)
// totalReturn    = portfolioValue − costBasis
// todaysGain     = Σ(shares × dayChange)
function calcPortfolio() {
  let totalValue=0, totalCost=0, todayGain=0;
  stockHoldings.forEach(h => {
    const p=stockPrices[h.ticker];
    totalCost+=h.shares*h.avgCost;
    totalValue+=h.shares*(p?p.price:h.avgCost);
    if (p) todayGain+=h.shares*p.change;
  });
  const totalReturn=totalValue-totalCost;
  const totalReturnPct=totalCost>0?(totalReturn/totalCost)*100:0;
  return {totalValue,totalCost,totalReturn,totalReturnPct,todayGain};
}

// ══ STOCK CHARTS ═══════════════════════════════════════════════════════
const perfChart = new Chart(document.getElementById('sh-perf-canvas').getContext('2d'),{
  type:'line', data:{labels:[],datasets:[{
    data:[], borderColor:'#3b82f6', backgroundColor:'rgba(59,130,246,0.07)',
    borderWidth:2, pointRadius:2, fill:true, tension:.35
  }]},
  options:{responsive:true,maintainAspectRatio:false,
    plugins:{
      legend:{display:false},
      tooltip:{callbacks:{
        label: ctx => {
          const snap=_pnlDisplay[ctx.dataIndex];
          if (!snap) return '';
          const pct=(snap.pnlPct>=0?'+':'')+snap.pnlPct.toFixed(2)+'%';
          const val=fmtSt(Math.abs(snap.pnlValue));
          return `${pct}  ·  ${snap.pnlValue>=0?'+':'−'}${val}`;
        },
        title: ctx => {
          const snap=_pnlDisplay[ctx[0]?.dataIndex];
          return snap?snap.date||snap.label:'';
        }
      }}
    },
    scales:{
      x:{ticks:{color:'#475569',maxTicksLimit:8,font:{size:10}},grid:{display:false},border:{color:'rgba(255,255,255,0.05)'}},
      y:{
        ticks:{callback:v=>v.toFixed(1)+'%',color:'#475569',font:{size:10},maxTicksLimit:5},
        grid:{color:'rgba(255,255,255,0.04)'},
        border:{color:'rgba(255,255,255,0.05)'},
        // Zero baseline so gain/loss polarity is immediately visible
        afterDataLimits: axis => {
          if (axis.max<0) axis.max=0;
          if (axis.min>0) axis.min=0;
        }
      }
    }}
});

const ALLOC_COLORS=['#3b82f6','#10b981','#f97316','#a78bfa','#fbbf24','#f87171','#22d3ee','#34d399','#818cf8','#fb923c'];

const allocChart = new Chart(document.getElementById('sh-alloc-canvas').getContext('2d'),{
  type:'doughnut', data:{labels:[],datasets:[{data:[],backgroundColor:[],borderWidth:0,hoverOffset:4}]},
  options:{responsive:true,maintainAspectRatio:false,cutout:'62%',
    plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>' '+ctx.label+': '+fmtSt(ctx.raw)}}}}
});

// ══ STOCK RENDER ═══════════════════════════════════════════════════════
function updateStockCards() {
  const {totalValue,totalCost,totalReturn,totalReturnPct,todayGain}=calcPortfolio();
  const hasHoldings=stockHoldings.length>0, hasPrices=Object.keys(stockPrices).length>0;

  document.getElementById('sh-total-val').textContent = hasHoldings ? fmtSt(totalValue) : '—';
  document.getElementById('sh-invested').textContent  = hasHoldings ? fmtSt(totalCost)  : '—';
  document.getElementById('sh-count').textContent     = stockHoldings.length;

  const rdEl=document.getElementById('sh-ret-dollar'), rpEl=document.getElementById('sh-ret-pct');
  if (hasHoldings) {
    rdEl.textContent=(totalReturn>=0?'+':'−')+fmtSt(Math.abs(totalReturn));
    rdEl.className='mc-val '+(totalReturn>=0?'sh-pos':'sh-neg');
    rpEl.textContent=(totalReturnPct>=0?'+':'')+totalReturnPct.toFixed(2)+'%';
    rpEl.className='mc-profit '+(totalReturnPct>=0?'pos':'neg');
  } else {
    rdEl.textContent='—'; rdEl.className='mc-val';
    rpEl.textContent='—'; rpEl.className='mc-profit';
  }
  const tEl=document.getElementById('sh-today');
  if (hasHoldings && hasPrices) {
    tEl.textContent=(todayGain>=0?'+':'−')+fmtSt(Math.abs(todayGain));
    tEl.className='mc-val '+(todayGain>=0?'sh-pos':'sh-neg');
  } else { tEl.textContent='—'; tEl.className='mc-val'; }
}

function renderHoldings() {
  const tbody=document.getElementById('sh-tbody');
  if (!stockHoldings.length) {
    tbody.innerHTML='<tr><td colspan="11" class="sh-empty">No holdings yet — click + Add Stock to get started.</td></tr>'; return;
  }
  const totalPortfolioValue=stockHoldings.reduce((s,h)=>{
    const p=stockPrices[h.ticker]; return s+h.shares*(p?p.price:h.avgCost);
  },0);
  const totalCostBasis=stockHoldings.reduce((s,h)=>s+h.shares*h.avgCost, 0);
  tbody.innerHTML=stockHoldings.map((h,i)=>{
    const p=stockPrices[h.ticker], price=p?p.price:null;
    const mv=price!=null?h.shares*price:h.shares*h.avgCost;
    const cb=h.shares*h.avgCost, retD=mv-cb, retP=cb>0?(retD/cb)*100:0;
    const retCls=retD>=0?'sh-pos':'sh-neg';
    const priceStr=price==null?`<span class="sh-skel" style="width:48px">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>`:fmtStPx(price);
    const dayChg=p?h.shares*p.change:null;
    const dayCls=dayChg!=null&&dayChg<0?'sh-neg':'sh-pos';
    const dayStr=dayChg==null
      ?`<span class="sh-skel" style="width:52px">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>`
      :`<span class="${dayCls}">${dayChg>=0?'+':'−'}${fmtSt(Math.abs(dayChg))}</span>`;
    const weight=totalPortfolioValue>0?(mv/totalPortfolioValue*100).toFixed(1)+'%':'—';
    // Invested column: $ = cost basis of this position; % = share of total invested
    const investedCell=_holdingsCols.invested==='$'
      ?fmtSt(cb)
      :(totalCostBasis>0?(cb/totalCostBasis*100).toFixed(1):'0')+'%';
    // Returns column: $ = unrealised P&L; % = P&L / cost basis
    const returnsCell=_holdingsCols.returns==='$'
      ?`<span class="${retCls}">${retD>=0?'+':'−'}${fmtSt(Math.abs(retD))}</span>`
      :`<span class="${retCls}">${retP>=0?'+':''}${retP.toFixed(2)}%</span>`;
    return `<tr draggable="true" ondragstart="onDragStart(event,${i})" ondragover="onDragOver(event,${i})" ondrop="onDrop(event,${i})" ondragend="onDragEnd()">
      <td><span class="sh-drag-handle">⠿</span></td>
      <td><span class="sh-badge">${escHtml(h.ticker)}</span></td>
      <td style="color:#64748b;font-size:11px;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(h.name)}</td>
      <td>${+h.shares.toFixed(6)}</td>
      <td>${fmtStPx(h.avgCost)}</td>
      <td>${priceStr}</td>
      <td>${dayStr}</td>
      <td>${weight}</td>
      <td>${investedCell}</td>
      <td>${returnsCell}</td>
      <td><div class="sh-row-acts">
        <button class="sh-row-btn" onclick="editHolding(${i})">✎</button>
        <button class="sh-row-btn del" onclick="deleteHolding(${i})">✕</button>
      </div></td>
    </tr>`;
  }).join('');
}

function updateStockCharts() {
  if (_pnlView==='monthly') {
    _pnlDisplay=aggregateMonthly(stockPnlHistory);
    perfChart.data.labels=_pnlDisplay.map(d=>d.label);
  } else {
    _pnlDisplay=[...stockPnlHistory];
    perfChart.data.labels=_pnlDisplay.map(d=>d.date.slice(5));
  }
  perfChart.data.datasets[0].data=_pnlDisplay.map(d=>d.pnlPct);
  perfChart.update('none');

  const sorted=[...stockHoldings].sort((a,b)=>{
    const va=(stockPrices[a.ticker]?a.shares*stockPrices[a.ticker].price:a.shares*a.avgCost);
    const vb=(stockPrices[b.ticker]?b.shares*stockPrices[b.ticker].price:b.shares*b.avgCost);
    return vb-va;
  });
  const totVal=sorted.reduce((s,h)=>{const p=stockPrices[h.ticker]; return s+(p?h.shares*p.price:h.shares*h.avgCost);},0);
  allocChart.data.labels=sorted.map(h=>h.ticker);
  allocChart.data.datasets[0].data=sorted.map(h=>{const p=stockPrices[h.ticker]; return +(p?h.shares*p.price:h.shares*h.avgCost).toFixed(2);});
  allocChart.data.datasets[0].backgroundColor=sorted.map((_,i)=>ALLOC_COLORS[i%ALLOC_COLORS.length]);
  allocChart.update('none');
  document.getElementById('sh-alloc-legend').innerHTML=sorted.map((h,i)=>{
    const p=stockPrices[h.ticker], mv=p?h.shares*p.price:h.shares*h.avgCost;
    const pct=totVal>0?(mv/totVal*100).toFixed(1):'0';
    return `<div class="sh-alloc-item"><span class="sh-alloc-dot" style="background:${ALLOC_COLORS[i%ALLOC_COLORS.length]}"></span>${escHtml(h.ticker)} <span style="color:#94a3b8">${pct}%</span></div>`;
  }).join('');
}

function renderStockDash() {
  updateStockCards(); renderHoldings(); updateStockCharts();
  updatePnlHistoryHint();
  if (lastRefreshed) {
    const reqCount=AV.todayReqs;
    document.getElementById('sh-status').textContent=
      'Updated '+lastRefreshed.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+(reqCount>0?` · ${reqCount} API calls today`:'');
  }
}

function recordPnlSnapshot() {
  if (!stockHoldings.length) return;
  const {totalValue,totalCost,totalReturn,totalReturnPct}=calcPortfolio();
  if (totalCost<=0) return;
  const today=new Date().toISOString().slice(0,10);
  const entry={date:today, pnlValue:Math.round(totalReturn*100)/100, pnlPct:Math.round(totalReturnPct*100)/100};
  const idx=stockPnlHistory.findIndex(d=>d.date===today);
  if (idx>=0) stockPnlHistory[idx]=entry;
  else stockPnlHistory.push(entry);
  stockPnlHistory.sort((a,b)=>a.date.localeCompare(b.date));
  Storage.save('stock_pnl_history', stockPnlHistory);
  updatePnlHistoryHint();
}

async function refreshStockData(force=false) {
  if (!AV.keys.length) { document.getElementById('sh-status').textContent='No API key — open ⚙ Settings to add one'; return; }
  if (!stockHoldings.length) return;
  const todayKey='stock_prices_'+new Date().toISOString().slice(0,10);
  // Without force, use today's saved snapshot if it exists (zero API calls)
  if (!force) {
    const snap=Storage.load(todayKey,null);
    if (snap) { stockPrices=snap; renderStockDash(); return; }
  }
  const btn=document.getElementById('sh-refresh-btn'); btn.classList.add('spinning');
  renderHoldings();
  let loaded=0; const failed=[];
  for (const h of stockHoldings) {
    try {
      const q=await AV.quote(h.ticker);
      stockPrices[h.ticker]=q; loaded++;
    } catch(e) { failed.push(h.ticker); }
  }
  if (loaded>0) {
    lastRefreshed=new Date();
    recordPnlSnapshot();
    Storage.save(todayKey, stockPrices);
  }
  btn.classList.remove('spinning');
  renderStockDash();
  const reqCount=AV.todayReqs;
  const base=loaded>0?'Updated '+lastRefreshed.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'No prices loaded';
  const failedNote=failed.length?` · ${failed.join(', ')} not loaded — rate limited`:'';
  document.getElementById('sh-status').textContent=base+failedNote+` · ${reqCount} API calls today`;
}

// ══ ADD STOCK MODAL ════════════════════════════════════════════════════
let _searchTimer=null, _pickedTicker=null;

function openAddModal(editIdx=-1) {
  _editIdx=editIdx; _pickedTicker=null;
  const isEdit=editIdx>=0;
  document.getElementById('sh-modal-heading').textContent = isEdit?'Edit Holding':'Add Stock';
  document.getElementById('sh-modal-submit').textContent  = isEdit?'Save Changes':'Add to Portfolio';
  document.getElementById('sh-modal-err').style.display   = 'none';
  document.getElementById('sh-search-drop').classList.remove('open');
  if (isEdit) {
    const h=stockHoldings[editIdx];
    document.getElementById('sh-ticker-input').value  = h.ticker;
    document.getElementById('sh-company-name').value  = h.name;
    document.getElementById('sh-shares-input').value  = h.shares;
    document.getElementById('sh-price-input').value   = h.avgCost.toFixed(2);
    _pickedTicker=h.ticker;
  } else {
    ['sh-ticker-input','sh-company-name','sh-shares-input','sh-price-input'].forEach(id=>document.getElementById(id).value='');
  }
  document.getElementById('sh-modal-overlay').classList.add('open');
  setTimeout(()=>document.getElementById('sh-ticker-input').focus(), 50);
}
function closeAddModal() {
  document.getElementById('sh-modal-overlay').classList.remove('open');
  document.getElementById('sh-search-drop').classList.remove('open');
  _editIdx=-1; _pickedTicker=null;
}

function onTickerInput() {
  clearTimeout(_searchTimer); _pickedTicker=null;
  const kw=document.getElementById('sh-ticker-input').value.trim();
  if (kw.length<2) { document.getElementById('sh-search-drop').classList.remove('open'); return; }
  _searchTimer=setTimeout(async ()=>{
    const results=await AV.search(kw);
    const drop=document.getElementById('sh-search-drop');
    if (!results.length) { drop.classList.remove('open'); return; }
    // Use data-* attributes — avoids quote-escaping bugs with inline onclick
    drop.innerHTML=results.map(r=>
      `<div class="sh-search-item" data-ticker="${escHtml(r.ticker)}" data-name="${escHtml(r.name)}">
        <span class="sh-search-ticker">${escHtml(r.ticker)}</span>
        <span class="sh-search-name">${escHtml(r.name)}</span>
      </div>`
    ).join('');
    drop.classList.add('open');
  }, 400);
}
function pickTicker(ticker, name) {
  _pickedTicker=ticker;
  document.getElementById('sh-ticker-input').value=ticker;
  document.getElementById('sh-company-name').value=name;
  document.getElementById('sh-search-drop').classList.remove('open');
  document.getElementById('sh-shares-input').value='1';
  const priceEl=document.getElementById('sh-price-input');
  priceEl.value='';
  if (AV.keys.length) {
    priceEl.placeholder='Fetching…';
    AV.quote(ticker).then(q=>{
      if (q && q.price>0) priceEl.value=q.price.toFixed(2);
      priceEl.placeholder='150.00';
    }).catch(()=>{ priceEl.placeholder='150.00'; });
  }
  priceEl.focus();
}

function confirmAddStock() {
  const ticker=(_pickedTicker||document.getElementById('sh-ticker-input').value.trim()).toUpperCase();
  const name=document.getElementById('sh-company-name').value.trim()||ticker;
  const shares=parseFloat(document.getElementById('sh-shares-input').value);
  const price=parseFloat(document.getElementById('sh-price-input').value);
  const errEl=document.getElementById('sh-modal-err');
  if (!ticker)      { _showModalErr(errEl,'Enter a ticker symbol'); return; }
  if (!(shares>0))  { _showModalErr(errEl,'Enter a valid share count (fractions like 1.5 are OK)'); return; }
  if (!(price>0))   { _showModalErr(errEl,'Enter the avg price per share'); return; }
  errEl.style.display='none';
  mergeHolding(ticker,name,shares,price,'');
  closeAddModal(); renderHoldings(); updateStockCards(); updateStockCharts();
  if (activeDash==='stock' && AV.keys.length) refreshStockData();
}
function _showModalErr(el,msg) { el.textContent=msg; el.style.display='block'; }

function deleteHolding(i) {
  if (!confirm(`Remove ${stockHoldings[i].ticker} from your portfolio?`)) return;
  delete stockPrices[stockHoldings[i].ticker];
  stockHoldings.splice(i,1);
  Storage.save('stock_holdings', stockHoldings);
  invalidatePnlHistory();
  renderStockDash();
}
function editHolding(i) { openAddModal(i); }

// mousedown fires before blur — prevents dropdown from closing before pickTicker runs
document.getElementById('sh-search-drop').addEventListener('mousedown', e => {
  const item=e.target.closest('.sh-search-item');
  if (!item) return;
  e.preventDefault();
  pickTicker(item.dataset.ticker, item.dataset.name);
});

document.addEventListener('click', e=>{
  if (!e.target.closest('.sh-search-wrap')) document.getElementById('sh-search-drop').classList.remove('open');
});
