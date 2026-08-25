// User-facing refresh control. Reloads the site using a unique URL so the latest
// GitHub Pages HTML/data is requested without users needing Ctrl+F5.
(() => {
  const header = document.querySelector('.app-header');
  const changeUser = document.getElementById('change-user');
  if (!header || !changeUser) return;

  let host = document.getElementById('header-actions');
  if (!host) {
    host = document.createElement('div');
    host.id = 'header-actions';
    host.className = 'header-actions';
  }

  let button = document.getElementById('hard-refresh-button');
  if (!button) {
    button = document.createElement('button');
    button.id = 'hard-refresh-button';
    button.type = 'button';
    button.className = 'hard-refresh-button';
    button.title = 'Refresh latest version';
    button.setAttribute('aria-label', 'Refresh latest version');
    button.innerHTML = '<span aria-hidden="true">↻</span>';
  }

  const style = document.createElement('style');
  style.id = 'hard-refresh-style';
  style.textContent = `
    .app-header {
      grid-template-columns:auto minmax(0,1fr) auto !important;
    }
    .header-actions {
      grid-column:3 !important;
      grid-row:1 !important;
      justify-self:end !important;
      align-self:center !important;
      display:flex !important;
      align-items:center !important;
      justify-content:flex-end !important;
      flex-wrap:nowrap !important;
      gap:8px !important;
      min-width:0;
      margin:0 !important;
    }
    .header-actions #change-user,
    .header-actions .header-user-button {
      position:static !important;
      grid-column:auto !important;
      grid-row:auto !important;
      justify-self:auto !important;
      align-self:center !important;
      flex:0 0 auto !important;
      margin:0 !important;
    }
    .hard-refresh-button {
      position:static !important;
      grid-column:auto !important;
      grid-row:auto !important;
      flex:0 0 auto !important;
      width:38px;
      height:38px;
      border:1px solid rgba(255,255,255,.72);
      border-radius:50%;
      background:rgba(255,255,255,.14);
      color:#fff;
      display:grid;
      place-items:center;
      padding:0;
      margin:0 !important;
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
      .header-actions { gap:6px !important; }
      .hard-refresh-button { width:34px; height:34px; font-size:21px; }
    }
    @media(prefers-reduced-motion:reduce){
      .hard-refresh-button.refreshing span { animation:none; }
    }
  `;
  document.head.querySelector('#hard-refresh-style')?.remove();
  document.head.appendChild(style);

  let arranging = false;
  function ensureTogether() {
    if (arranging) return;
    arranging = true;
    try {
      if (host.parentElement !== header) header.appendChild(host);
      if (changeUser.parentElement !== host) host.appendChild(changeUser);
      if (button.parentElement !== host) host.appendChild(button);
      if (host.firstElementChild !== changeUser) host.insertBefore(changeUser, host.firstElementChild);
      if (changeUser.nextElementSibling !== button) host.insertBefore(button, changeUser.nextElementSibling);
    } finally {
      arranging = false;
    }
  }

  ensureTogether();

  const observer = new MutationObserver(() => {
    if (!arranging) ensureTogether();
  });
  observer.observe(header, { childList:true, subtree:true });

  window.addEventListener('load', ensureTogether, { once:true });
  setTimeout(ensureTogether, 0);
  setTimeout(ensureTogether, 150);
  setTimeout(ensureTogether, 500);

  if (button.dataset.refreshReady !== 'true') {
    button.dataset.refreshReady = 'true';
    button.addEventListener('click', async () => {
      if (button.disabled) return;
      button.disabled = true;
      button.classList.add('refreshing');

      try {
        if ('caches' in window) {
          const names = await caches.keys();
          await Promise.all(names.map(name => caches.delete(name)));
        }
      } catch (_) {}

      const url = new URL(window.location.href);
      url.searchParams.set('_refresh', Date.now().toString());
      window.location.replace(url.toString());
    });
  }
})();

// Formation substitute colour coding. Uses each player's registered position and the
// same role colours as the live Matchday lineup.
(() => {
  const roleForPosition = position => {
    const p = String(position || '').toUpperCase();
    if (p === 'GK') return 'goalkeeper';
    if (['CB','LB','RB','LWB','RWB','DF','DEF'].includes(p)) return 'defence';
    if (['CDM','DM','CM','CAM','AM','LM','RM','MF','MID'].includes(p)) return 'midfield';
    if (['LW','RW','CF','ST','FW','FWD'].includes(p)) return 'attack';
    return 'other';
  };

  const allPlayers = () => {
    const combined = [];
    if (typeof matchdayPlayers !== 'undefined' && Array.isArray(matchdayPlayers)) combined.push(...matchdayPlayers);
    if (typeof players !== 'undefined' && Array.isArray(players)) combined.push(...players);
    return combined;
  };

  const colourSubs = () => {
    const chips = document.querySelectorAll('.formation-sub-chip');
    if (!chips.length) return;
    const roster = allPlayers();
    chips.forEach(chip => {
      chip.classList.remove('position-defence','position-midfield','position-attack','position-goalkeeper','position-other');
      const name = chip.textContent.trim();
      const p = roster.find(item => String(item.displayName || item.name || '').trim() === name);
      chip.classList.add(`position-${roleForPosition(p?.position)}`);
    });
  };

  const observer = new MutationObserver(colourSubs);
  observer.observe(document.body, { childList:true, subtree:true });
  window.addEventListener('load', colourSubs, { once:true });
  setTimeout(colourSubs, 0);
})();