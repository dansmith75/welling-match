// User-facing refresh control. Reloads the site using a unique URL so the latest
// GitHub Pages HTML/data is requested without users needing Ctrl+F5.
(() => {
  const header = document.querySelector('.app-header');
  if (!header || document.getElementById('hard-refresh-button')) return;

  const changeUser = document.getElementById('change-user');
  let host = document.getElementById('header-actions');

  if (!host) {
    host = document.createElement('div');
    host.id = 'header-actions';
    host.className = 'header-actions';
    header.appendChild(host);
  }

  // ui-polish moves the user button into the header. Keep both controls together
  // in one visible header cell so the refresh icon cannot disappear into the
  // deliberately hidden current-user-line or overlap the user button.
  if (changeUser && changeUser.parentElement !== host) host.appendChild(changeUser);

  const button = document.createElement('button');
  button.id = 'hard-refresh-button';
  button.type = 'button';
  button.className = 'hard-refresh-button';
  button.title = 'Refresh latest version';
  button.setAttribute('aria-label', 'Refresh latest version');
  button.innerHTML = '<span aria-hidden="true">↻</span>';

  const style = document.createElement('style');
  style.textContent = `
    .header-actions {
      justify-self:end;
      align-self:center;
      display:flex;
      align-items:center;
      justify-content:flex-end;
      gap:8px;
      min-width:0;
    }
    .header-actions .header-user-button {
      margin:0 !important;
    }
    .hard-refresh-button {
      position:static !important;
      flex:0 0 auto;
      width:38px;
      height:38px;
      border:1px solid rgba(255,255,255,.72);
      border-radius:50%;
      background:rgba(255,255,255,.14);
      color:#fff;
      display:grid;
      place-items:center;
      padding:0;
      margin:0;
      cursor:pointer;
      font:900 23px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      box-shadow:0 2px 8px rgba(0,0,0,.12);
      -webkit-tap-highlight-color:transparent;
    }
    .hard-refresh-button:hover { background:rgba(255,255,255,.22); }
    .hard-refresh-button:focus-visible { outline:3px solid #fff; outline-offset:2px; }
    .hard-refresh-button.refreshing span { animation:welling-refresh-spin .7s linear infinite; }
    @keyframes welling-refresh-spin { to { transform:rotate(360deg); } }
    @media(max-width:520px){
      .header-actions { gap:6px; }
      .hard-refresh-button { width:34px; height:34px; font-size:21px; }
    }
    @media(prefers-reduced-motion:reduce){ .hard-refresh-button.refreshing span { animation:none; } }
  `;
  document.head.appendChild(style);

  // Refresh icon first, user button second.
  host.insertBefore(button, changeUser && changeUser.parentElement === host ? changeUser : null);

  button.addEventListener('click', async () => {
    if (button.disabled) return;
    button.disabled = true;
    button.classList.add('refreshing');

    try {
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(name => caches.delete(name)));
      }
    } catch (_) {
      // Cache Storage is an enhancement only; continue with the cache-busting reload.
    }

    const url = new URL(window.location.href);
    url.searchParams.set('_refresh', Date.now().toString());
    window.location.replace(url.toString());
  });
})();