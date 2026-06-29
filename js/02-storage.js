// ══ STORAGE ════════════════════════════════════════════════════════════
const SYNC_KEYS = new Set(['property_profiles', 'stock_holdings', 'stock_pnl_history', 'app_settings']);

const Storage = {
  save(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {}
    if (SYNC_KEYS.has(k)) CloudSync.schedulePush();
  },
  load(k, def) {
    try { const v = localStorage.getItem(k); return v != null ? JSON.parse(v) : def; }
    catch(e) { return def; }
  },
  export() {
    const blob = new Blob([JSON.stringify({
      version: 1, exportedAt: new Date().toISOString(),
      settings:          Storage.load('app_settings', {}),
      property_profiles: PROFILES,
      stock_holdings:    stockHoldings,
      stock_pnl_history: stockPnlHistory,
    }, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `portfolio_data_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  },
  import(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        CloudSync.applyPayload(data);
        CloudSync.schedulePush();
      } catch(err) { alert('Invalid file format.'); }
    };
    reader.readAsText(file);
  }
};
