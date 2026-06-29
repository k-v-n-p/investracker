// ══ LOGIN ══════════════════════════════════════════════════════════════
// Local-only fallback hash (SHA-256 of password). Used when APP_CONFIG.API_URL is unset.
const PASS_HASH='5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8';

async function _sha256(msg) {
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(msg));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function _unlockApp() {
  sessionStorage.setItem('auth_ok','1');
  document.getElementById('login-overlay').style.display='none';
  if (CloudSync.enabled && CloudSync.token) {
    try { await CloudSync.pull(); } catch (e) { console.warn('Cloud pull after login', e); }
  }
}

async function doLogin() {
  const pass=document.getElementById('login-pass').value;
  const err=document.getElementById('login-err');

  if (CloudSync.enabled) {
    try {
      await CloudSync.login(pass);
      await _unlockApp();
      document.getElementById('login-pass').value='';
      return;
    } catch (e) {
      err.textContent = e.message === 'Incorrect password' ? 'Incorrect password' : 'Could not reach cloud — try again';
      document.getElementById('login-pass').value='';
      document.getElementById('login-pass').focus();
      setTimeout(()=>{ err.textContent=''; }, 4000);
      return;
    }
  }

  const hash=await _sha256(pass);
  if (hash===PASS_HASH) {
    await _unlockApp();
  } else {
    err.textContent='Incorrect password';
    document.getElementById('login-pass').value='';
    document.getElementById('login-pass').focus();
    setTimeout(()=>{ err.textContent=''; },3000);
  }
}

async function _tryRestoreSession() {
  if (sessionStorage.getItem('auth_ok')!=='1') {
    setTimeout(()=>document.getElementById('login-pass').focus(),100);
    return;
  }
  if (CloudSync.enabled && !CloudSync.token) {
    sessionStorage.removeItem('auth_ok');
    setTimeout(()=>document.getElementById('login-pass').focus(),100);
    return;
  }
  document.getElementById('login-overlay').style.display='none';
}

_tryRestoreSession();
