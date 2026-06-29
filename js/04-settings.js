// ══ SETTINGS ═══════════════════════════════════════════════════════════
function openSettings() {
  const s=Storage.load('app_settings',{});
  document.getElementById('settings-api-key').value   = s.apiKey  || '';
  document.getElementById('settings-api-key-2').value = s.apiKey2 || '';
  _renderKeyStatus();
  document.getElementById('settings-panel').classList.add('open');
  document.getElementById('settings-overlay').classList.add('open');
}
function closeSettings() {
  document.getElementById('settings-panel').classList.remove('open');
  document.getElementById('settings-overlay').classList.remove('open');
}
function saveSettings() {
  const s=Storage.load('app_settings',{});
  s.apiKey  = document.getElementById('settings-api-key').value.trim();
  s.apiKey2 = document.getElementById('settings-api-key-2').value.trim();
  Storage.save('app_settings', s);
  _renderKeyStatus();
}
function _renderKeyStatus() {
  const s=Storage.load('app_settings',{});
  const active=AV._activeKey;
  const k1El=document.getElementById('s-key1-status');
  const k2El=document.getElementById('s-key2-status');
  if (k1El) {
    if (!s.apiKey) { k1El.textContent=''; }
    else if (active===1) { k1El.style.color='#10b981'; k1El.textContent='● active'; }
    else if (active===2) { k1El.style.color='#f87171'; k1El.textContent='◌ rate-limited'; }
    else { k1El.style.color='#64748b'; k1El.textContent='set'; }
  }
  if (k2El) {
    if (!s.apiKey2) { k2El.textContent=''; }
    else if (active===2) { k2El.style.color='#10b981'; k2El.textContent='● active'; }
    else { k2El.style.color='#64748b'; k2El.textContent='standby'; }
  }
}
function exportData()  { Storage.export(); }
function importData()  { const i = document.createElement('input'); i.type='file'; i.accept='.json'; i.onchange=e=>Storage.import(e.target.files[0]); i.click(); }
function clearAVCache() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('av_') || k.startsWith('stock_prices_'));
  keys.forEach(k => localStorage.removeItem(k));
  stockPrices = {};
  alert(`Cleared ${keys.length} cached API entr${keys.length===1?'y':'ies'}.`);
}
