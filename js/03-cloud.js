// ══ CLOUD SYNC (MongoDB via API) ═══════════════════════════════════════
const CloudSync = {
  _pushTimer: null,
  _status: 'idle',

  get enabled() {
    const url = (window.APP_CONFIG?.API_URL || '').trim();
    return url.length > 0 && url !== '__API_URL__';
  },

  get apiUrl() {
    return (window.APP_CONFIG?.API_URL || '').replace(/\/$/, '');
  },

  get token() {
    return sessionStorage.getItem('auth_token') || '';
  },

  setToken(token) {
    if (token) sessionStorage.setItem('auth_token', token);
    else sessionStorage.removeItem('auth_token');
  },

  _setStatus(state, message) {
    CloudSync._status = state;
    const el = document.getElementById('cloud-sync-status');
    if (!el) return;
    const labels = {
      idle: 'Cloud sync idle',
      syncing: 'Syncing…',
      synced: 'Synced to cloud',
      error: 'Sync error',
      offline: 'Cloud sync unavailable',
    };
    el.textContent = message || labels[state] || state;
    el.className = 's-hint cloud-status cloud-' + state;
  },

  buildPayload() {
    return {
      version: 1,
      settings: Storage.load('app_settings', {}),
      property_profiles: typeof PROFILES !== 'undefined' ? PROFILES : [],
      stock_holdings: typeof stockHoldings !== 'undefined' ? stockHoldings : [],
      stock_pnl_history: typeof stockPnlHistory !== 'undefined' ? stockPnlHistory : [],
    };
  },

  applyPayload(data) {
    if (!data || typeof data !== 'object') return false;
    if (Array.isArray(data.property_profiles)) {
      PROFILES.length = 0;
      data.property_profiles.forEach(p => PROFILES.push(p));
      Storage.save('property_profiles', PROFILES);
    }
    if (Array.isArray(data.stock_holdings)) {
      stockHoldings = data.stock_holdings;
      Storage.save('stock_holdings', stockHoldings);
    }
    if (Array.isArray(data.stock_pnl_history)) {
      stockPnlHistory = data.stock_pnl_history;
      Storage.save('stock_pnl_history', stockPnlHistory);
    }
    if (data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)) {
      Storage.save('app_settings', data.settings);
    }
    if (PROFILES.length === 0) {
      PROFILES.push({ name: 'Property 1', color: PALETTE[0], state: defaultState() });
      Storage.save('property_profiles', PROFILES);
    }
    activeProfile = 0;
    renderProfileBar();
    loadProfile(0);
    renderHoldings();
    updateStockCards();
    if (typeof updateStockCharts === 'function') updateStockCharts();
    return true;
  },

  async login(password) {
    const res = await fetch(`${CloudSync.apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed');
    }
    const { token } = await res.json();
    CloudSync.setToken(token);
    return token;
  },

  async pull() {
    if (!CloudSync.enabled || !CloudSync.token) return null;
    CloudSync._setStatus('syncing');
    try {
      const res = await fetch(`${CloudSync.apiUrl}/api/data`, {
        headers: { Authorization: `Bearer ${CloudSync.token}` },
      });
      if (res.status === 401) {
        CloudSync.setToken('');
        sessionStorage.removeItem('auth_ok');
        throw new Error('Session expired — log in again');
      }
      if (!res.ok) throw new Error('Failed to load cloud data');
      const data = await res.json();
      CloudSync.applyPayload(data);
      const when = data.updatedAt ? new Date(data.updatedAt).toLocaleString() : 'now';
      CloudSync._setStatus('synced', `Synced from cloud · ${when}`);
      return data;
    } catch (e) {
      CloudSync._setStatus('error', e.message || 'Sync failed');
      throw e;
    }
  },

  async push() {
    if (!CloudSync.enabled || !CloudSync.token) return;
    CloudSync._setStatus('syncing');
    try {
      const res = await fetch(`${CloudSync.apiUrl}/api/data`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${CloudSync.token}`,
        },
        body: JSON.stringify(CloudSync.buildPayload()),
      });
      if (res.status === 401) {
        CloudSync.setToken('');
        sessionStorage.removeItem('auth_ok');
        throw new Error('Session expired — log in again');
      }
      if (!res.ok) throw new Error('Failed to save to cloud');
      const out = await res.json();
      const when = out.updatedAt ? new Date(out.updatedAt).toLocaleString() : 'now';
      CloudSync._setStatus('synced', `Saved to cloud · ${when}`);
    } catch (e) {
      CloudSync._setStatus('error', e.message || 'Save failed');
      console.warn('CloudSync.push', e);
    }
  },

  schedulePush() {
    if (!CloudSync.enabled || !CloudSync.token) return;
    clearTimeout(CloudSync._pushTimer);
    CloudSync._pushTimer = setTimeout(() => CloudSync.push(), 1500);
  },

  async syncNow() {
    await CloudSync.push();
  },
};

if (CloudSync.enabled) {
  CloudSync._setStatus('idle', 'Cloud sync enabled');
} else {
  CloudSync._setStatus('offline', 'Local only — set API_URL in prod deploy');
}
