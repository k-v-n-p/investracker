// ══ PRIVACY MODE (hide monetary amounts by default) ════════════════════
const Privacy = {
  get hidden() {
    return localStorage.getItem('privacy_hidden') !== '0';
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
