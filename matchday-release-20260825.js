// Matchday release 2026-08-25
// Shared discipline helpers plus release UI refinements.
(() => {
  if (typeof state === "undefined") return;

  const style = document.createElement("style");
  style.id = "matchday-release-20260825-style";
  style.textContent = `
    .md-card-dot{display:inline-block;width:9px;height:9px;margin-left:7px;border-radius:50%;flex:0 0 9px;vertical-align:middle;box-shadow:0 0 0 1px rgba(15,23,42,.12)}
    .md-card-dot.yellow{background:#facc15}.md-card-dot.red{background:#dc2626}
    .md4-player .md-card-dot{margin-left:8px}.matchday-lineup-chip .md-card-dot,.formation-sub-chip .md-card-dot{margin-left:6px}
    .formation-slot .md-card-dot{position:absolute;right:5px;bottom:5px;margin:0}
    .formation-sub-chip.dismissed,.formation-player-option.dismissed{opacity:.48;cursor:not-allowed!important;filter:saturate(.7)}
    .formation-sub-chip.dismissed{text-decoration:line-through;text-decoration-thickness:2px}
  `;
  document.head.querySelector("#matchday-release-20260825-style")?.remove();
  document.head.appendChild(style);

  function disciplinaryStatus(id) {
    if (!id) return "";
    let yellows = 0;
    for (const event of state.events || []) {
      if (event?.type !== "Card" || event.playerId !== id) continue;
      const type = String(event.cardType || "").toLowerCase();
      if (type === "red") return "red";
      if (type === "yellow") yellows += 1;
    }
    if (yellows >= 2) return "red";
    return yellows === 1 ? "yellow" : "";
  }

  function isDismissed(id) { return disciplinaryStatus(id) === "red"; }
  function eligibleIds(ids) { return (ids || []).filter(id => !isDismissed(id)); }

  window.matchdayDisciplinaryStatus = disciplinaryStatus;
  window.matchdayIsDismissed = isDismissed;
  window.matchdayEligibleIds = eligibleIds;

  function allPlayerIds() {
    const ids = new Set();
    (typeof matchdayPlayers !== "undefined" ? matchdayPlayers : []).forEach(p => ids.add(p.id));
    (typeof players !== "undefined" ? players : []).forEach(p => ids.add(p.id));
    (state.squadIds || []).forEach(id => ids.add(id));
    return [...ids].filter(Boolean);
  }

  function idForName(name) {
    const wanted = String(name || "").replace(/\s+/g," ").trim();
    if (!wanted) return "";
    return allPlayerIds().find(id => {
      try { return String(typeof playerName === "function" ? playerName(id) : id).replace(/\s+/g," ").trim() === wanted; }
      catch (_) { return String(id) === wanted; }
    }) || "";
  }

  function playerIdFromText(text) {
    const clean = String(text || "").replace(/\s+/g," ").trim();
    return idForName(clean.split(" · ")[0].trim());
  }

  function nodePlayerId(node) {
    if (!node) return "";
    if (node.dataset?.playerId) return node.dataset.playerId;
    // Formation picker keeps the full player name in <strong>; the position sits in a sibling span.
    const strongName = node.querySelector?.(":scope > strong")?.textContent;
    if (strongName) return idForName(strongName);
    // Formation pitch may display a shortened name, so prefer a previously attached id.
    const explicitName = node.querySelector?.(".formation-player-name")?.dataset?.fullName;
    if (explicitName) return idForName(explicitName);
    return playerIdFromText(node.textContent || "");
  }

  function ensureDot(node, id) {
    if (!node || !id) return;
    node.querySelector?.(":scope > .md-card-dot")?.remove();
    const status = disciplinaryStatus(id);
    if (!status) return;
    const dot = document.createElement("span");
    dot.className = `md-card-dot ${status}`;
    dot.title = status === "red" ? "Dismissed" : "Yellow card";
    dot.setAttribute("aria-label", dot.title);
    node.appendChild(dot);
  }

  function refreshCardDots() {
    document.querySelectorAll(".md4-player,.formation-sub-chip,#formation-picker-list .formation-player-option,#md-penalty-players button,#matchday-quick-goal .md-player-grid button").forEach(node => {
      const id = nodePlayerId(node);
      if (id) node.dataset.playerId = id;
      ensureDot(node,id);
    });
    document.querySelectorAll(".matchday-lineup-chip").forEach(node => {
      const id = nodePlayerId(node); if (id) node.dataset.playerId=id; ensureDot(node,id);
    });
  }

  function removeDismissedOptions(select) {
    if (!select) return;
    [...select.options].forEach(option => { if (option.value && isDismissed(option.value)) option.remove(); });
  }

  function refreshEligibilityUi() {
    // Every football-action selector except Event must exclude dismissed players.
    ["matchday-sub-off","matchday-sub-on","matchday-goal-player","matchday-goal-assist"].forEach(id => removeDismissedOptions(document.getElementById(id)));
    document.querySelectorAll("#md4-sub-view select.md4-off,#md4-sub-view select.md-bulk-off,#md4-sub-view select.md4-on,#md4-sub-view select.md-bulk-on,#matchday-bulk-subs select.md-bulk-off,#matchday-bulk-subs select.md-bulk-on").forEach(removeDismissedOptions);

    // Remove dismissed players from scorer, assist, penalty and substitution button grids.
    document.querySelectorAll("#md4-goal-view .md4-player,#md4-sub-view .md4-player,#matchday-quick-goal .md-player-grid button,#md-penalty-players button").forEach(button => {
      const id = nodePlayerId(button);
      if (id) button.dataset.playerId = id;
      if (id && isDismissed(id)) button.remove();
    });

    // Formation subs retain the player so the dismissal is visible, but cannot be selected.
    document.querySelectorAll(".formation-sub-chip").forEach(chip => {
      const id = nodePlayerId(chip);
      if (id) chip.dataset.playerId=id;
      const sentOff = isDismissed(id);
      chip.classList.toggle("dismissed",sentOff);
      chip.setAttribute("aria-disabled",sentOff?"true":"false");
      chip.title = sentOff ? "Dismissed — cannot be selected" : "";
      ensureDot(chip,id);
    });

    document.querySelectorAll("#formation-picker-list .formation-player-option").forEach(button => {
      const id = nodePlayerId(button);
      if (id) button.dataset.playerId=id;
      const sentOff = isDismissed(id);
      button.classList.toggle("dismissed",sentOff);
      button.disabled = sentOff;
      button.setAttribute("aria-disabled",sentOff?"true":"false");
      button.title = sentOff ? "Dismissed — cannot be selected" : "";
      ensureDot(button,id);
    });
  }

  function refreshReleaseUi() { refreshCardDots(); refreshEligibilityUi(); }

  document.addEventListener("click", event => {
    const assist = event.target.closest("#md4-assists .md4-player");
    const noAssist = event.target.closest("#md4-no-assist");
    if (assist || noAssist) { setTimeout(() => document.getElementById("md4-save-goal")?.click(),0); return; }

    if (event.target.closest("button[data-opponent-goal-type]")) {
      setTimeout(() => {
        document.querySelector(".opponent-goal-choice")?.classList.add("hidden");
        document.getElementById("md4-goal-view")?.classList.add("hidden");
      },0);
      return;
    }

    // These actions rebuild eligible-player lists synchronously. Re-filter immediately after them.
    if (event.target.closest("#md4-subs,#md4-sub-view button,#matchday-bulk-subs-button,#matchday-bulk-subs button,#open-formation,.matchday-formation-live,.formation-slot,#formation-select,#md4-goal,#matchday-quick-goal-button,#md4-penalty-event")) {
      setTimeout(refreshReleaseUi,0);
      setTimeout(refreshReleaseUi,50);
    }
  });

  // Event is deliberately not included: a dismissed player must remain selectable there to record what happened.
  document.addEventListener("click", event => {
    const target = event.target.closest("#formation-picker-list .formation-player-option,#md4-goal-view .md4-player,#md4-sub-view .md4-player,#matchday-quick-goal .md-player-grid button,#md-penalty-players button");
    if (!target) return;
    const id = nodePlayerId(target);
    if (!isDismissed(id)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  },true);

  if (typeof renderLive === "function") {
    const previousRenderLive = renderLive;
    renderLive = function(){ previousRenderLive(); refreshReleaseUi(); };
  }

  window.addEventListener("load",refreshReleaseUi,{once:true});
  refreshReleaseUi();
  setTimeout(refreshReleaseUi,100);
})();