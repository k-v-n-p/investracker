// ══ SETTINGS ═══════════════════════════════════════════════════════════
let _apiKeysDraft = [''];

function _loadApiKeysDraft() {
  const s=Storage.load('app_settings',{});
  const keys=Array.isArray(s.apiKeys) ? s.apiKeys.slice() : [s.apiKey, s.apiKey2].filter(Boolean);
  return keys.length ? keys : [''];
}

function openSettings() {
  _apiKeysDraft = _loadApiKeysDraft();
  renderApiKeyFields();
  document.getElementById('settings-panel').classList.add('open');
  document.getElementById('settings-overlay').classList.add('open');
}
function closeSettings() {
  document.getElementById('settings-panel').classList.remove('open');
  document.getElementById('settings-overlay').classList.remove('open');
}
function renderApiKeyFields() {
  const list=document.getElementById('settings-api-keys-list');
  list.innerHTML = _apiKeysDraft.map((k,i) => `
    <div class="s-key-row">
      <input type="text" value="${escHtml(k)}" placeholder="API key ${i+1}" oninput="_apiKeysDraft[${i}]=this.value" onblur="saveSettings()">
      <span id="s-key-status-${i}" class="s-label-status"></span>
      ${_apiKeysDraft.length>1 ? `<button class="s-key-remove" onclick="removeApiKeyField(${i})" title="Remove key">✕</button>` : ''}
    </div>`).join('');
  _renderKeyStatus();
}
function addApiKeyField() {
  _apiKeysDraft.push('');
  renderApiKeyFields();
}
function removeApiKeyField(i) {
  _apiKeysDraft.splice(i,1);
  if (!_apiKeysDraft.length) _apiKeysDraft=[''];
  saveSettings();
  renderApiKeyFields();
}
function saveSettings() {
  const s=Storage.load('app_settings',{});
  s.apiKeys = _apiKeysDraft.map(k=>k.trim()).filter(Boolean);
  delete s.apiKey;
  delete s.apiKey2;
  Storage.save('app_settings', s);
  _renderKeyStatus();
}
function _renderKeyStatus() {
  _apiKeysDraft.forEach((k,i) => {
    const el=document.getElementById('s-key-status-'+i);
    if (!el) return;
    if (!k.trim()) { el.textContent=''; return; }
    if (AV._lastRateLimited.has(i)) { el.style.color='#f87171'; el.textContent='◌ rate-limited'; }
    else if (i===AV._activeKeyIdx) { el.style.color='#10b981'; el.textContent='● active'; }
    else { el.style.color='#64748b'; el.textContent='standby'; }
  });
}
function exportData()  { Storage.export(); }
function importData()  { const i = document.createElement('input'); i.type='file'; i.accept='.json'; i.onchange=e=>Storage.import(e.target.files[0]); i.click(); }
function clearAVCache() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('av_') || k.startsWith('stock_prices_'));
  keys.forEach(k => localStorage.removeItem(k));
  stockPrices = {};
  alert(`Cleared ${keys.length} cached API entr${keys.length===1?'y':'ies'}.`);
}
