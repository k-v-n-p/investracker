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

  validateImportPayload(data) {
    if (!data || typeof data !== 'object') return 'Invalid file — not a JSON object.';
    if (data.version !== undefined && data.version !== 1) return 'Unsupported version (expected 1).';
    if (data.property_profiles !== undefined && !Array.isArray(data.property_profiles)) {
      return 'Invalid format: property_profiles must be an array.';
    }
    if (data.stock_holdings !== undefined && !Array.isArray(data.stock_holdings)) {
      return 'Invalid format: stock_holdings must be an array.';
    }
    if (data.stock_pnl_history !== undefined && !Array.isArray(data.stock_pnl_history)) {
      return 'Invalid format: stock_pnl_history must be an array.';
    }
    if (data.settings !== undefined && (typeof data.settings !== 'object' || Array.isArray(data.settings))) {
      return 'Invalid format: settings must be an object.';
    }
    const hasData =
      Array.isArray(data.property_profiles) ||
      Array.isArray(data.stock_holdings) ||
      Array.isArray(data.stock_pnl_history) ||
      (data.settings && Object.keys(data.settings).length > 0);
    if (!hasData) return 'File has no importable data.';
    return null;
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
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const data = JSON.parse(e.target.result);
        const err = Storage.validateImportPayload(data);
        if (err) { alert(err); return; }
        const cloudNote = CloudSync.enabled && CloudSync.token
          ? '\n\nThis replaces all local data and uploads to the cloud.'
          : '\n\nThis replaces all local data.';
        if (!confirm('Import portfolio from this file?' + cloudNote)) return;
        CloudSync.applyPayload(data);
        if (CloudSync.enabled && CloudSync.token) {
          try {
            await CloudSync.push();
            alert('Import complete — saved to cloud.');
          } catch {
            alert('Import applied locally, but cloud upload failed. Try Sync now.');
          }
        } else {
          alert('Import complete.');
        }
      } catch {
        alert('Invalid file format — could not parse JSON.');
      }
    };
    reader.readAsText(file);
  },
};
