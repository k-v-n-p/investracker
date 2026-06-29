// ══ INIT ═══════════════════════════════════════════════════════════════
async function boot() {
  syncMax();
  if (CloudSync.enabled && CloudSync.token) {
    try { await CloudSync.pull(); } catch (e) { console.warn('Cloud pull on boot', e); }
  } else {
    const _sp=Storage.load('property_profiles',null);
    if (_sp?.length) { PROFILES.length=0; _sp.forEach(p=>PROFILES.push(p)); }
  }
  renderProfileBar();
  loadProfile(activeProfile);
  renderHoldings();
  updateStockCards();
}

boot();
