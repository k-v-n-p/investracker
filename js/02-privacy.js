// ══ PRIVACY MODE (amounts shown by default) ════════════════════════════
const _EYE_OPEN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const _EYE_OFF  = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.8 21.8 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.77 21.77 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

const Privacy = {
  get hidden() {
    return localStorage.getItem('privacy_hidden') === '1';
  },

  toggle() {
    localStorage.setItem('privacy_hidden', this.hidden ? '0' : '1');
    this._syncBtn();
    this.refreshAll();
  },

  mask(formatted) {
    return this.hidden ? '••••' : formatted;
  },

  _syncBtn() {
    const btn = document.getElementById('privacy-btn');
    if (!btn) return;
    btn.classList.toggle('active', !this.hidden);
    btn.title = this.hidden ? 'Show amounts' : 'Hide amounts';
    btn.innerHTML = this.hidden ? _EYE_OFF : _EYE_OPEN;
  },

  refreshAll() {
    if (typeof refreshHeaderTitles === 'function') refreshHeaderTitles();
    if (typeof update === 'function') update();
    if (typeof renderStockDash === 'function') renderStockDash();
    if (typeof loanChart !== 'undefined') loanChart.update('none');
    if (typeof retChart !== 'undefined') retChart.update('none');
    if (typeof updateCompareTab === 'function') updateCompareTab();
    else if (typeof compareChart !== 'undefined') compareChart.update('none');
    if (typeof perfChart !== 'undefined') perfChart.update('none');
    if (typeof allocChart !== 'undefined') allocChart.update('none');
  },

  init() {
    this._syncBtn();
    if (typeof refreshHeaderTitles === 'function') refreshHeaderTitles();
  },
};
