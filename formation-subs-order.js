// Keep formation substitutes grouped by their existing colour/position class,
// while retaining one continuous wrapping row (no separate sections/headings).
(() => {
  const ORDER = {
    'position-goalkeeper': 0,
    'position-defence': 1,
    'position-midfield': 2,
    'position-attack': 3,
    'position-other': 4
  };

  function positionGroup(player) {
    const raw = String(player?.positionGroup || player?.position || player?.primaryPosition || '').toLowerCase();
    if (/goal|keeper|\bgk\b/.test(raw)) return 'position-goalkeeper';
    if (/def|back|\bcb\b|\blb\b|\brb\b|\blwb\b|\brwb\b/.test(raw)) return 'position-defence';
    if (/mid|\bcm\b|\bdm\b|\bam\b|\blm\b|\brm\b/.test(raw)) return 'position-midfield';
    if (/att|forw|wing|strik|\bst\b|\blw\b|\brw\b/.test(raw)) return 'position-attack';
    return 'position-other';
  }

  function playersList() {
    const list = [];
    if (typeof matchdayPlayers !== 'undefined' && Array.isArray(matchdayPlayers)) list.push(...matchdayPlayers);
    if (typeof players !== 'undefined' && Array.isArray(players)) list.push(...players);
    return list;
  }

  function groupSubs() {
    const host = document.getElementById('formation-subs');
    if (!host) return;
    const chips = [...host.querySelectorAll('.formation-sub-chip')];
    if (chips.length < 2) return;

    const allPlayers = playersList();
    chips.forEach((chip, originalIndex) => {
      const name = chip.textContent.trim();
      const player = allPlayers.find(p => String(p?.displayName || p?.name || p?.id || '').trim() === name);
      const existing = [...chip.classList].find(c => c.startsWith('position-'));
      const group = existing || positionGroup(player);
      chip.classList.add(group);
      chip.dataset.groupOrder = String(ORDER[group] ?? 4);
      chip.dataset.originalOrder = String(originalIndex);
    });

    chips.sort((a, b) =>
      Number(a.dataset.groupOrder) - Number(b.dataset.groupOrder) ||
      Number(a.dataset.originalOrder) - Number(b.dataset.originalOrder)
    );
    chips.forEach(chip => host.appendChild(chip));
  }

  function watch() {
    const host = document.getElementById('formation-subs');
    if (!host) return false;
    let busy = false;
    const observer = new MutationObserver(() => {
      if (busy) return;
      busy = true;
      groupSubs();
      busy = false;
    });
    observer.observe(host, { childList: true });
    groupSubs();
    return true;
  }

  if (!watch()) {
    const bodyObserver = new MutationObserver(() => {
      if (watch()) bodyObserver.disconnect();
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });
  }
})();