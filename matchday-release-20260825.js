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

  // Authoritative helpers used by Formation / Goals / Subs / Penalties before they render.
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

  function playerIdFromText(text) {
    const name = String(text || "").replace(/\s+/g," ").trim().split(" · ")[0].trim();
    return allPlayerIds().find(id => {
      try { return String(typeof playerName === "function" ? playerName(id) : id).trim() === name; }
      catch (_) { return String(id) === name; }
    }) || "";
  }

  function nodePlayerId(node) {
    return node?.dataset?.playerId || playerIdFromText(node?.textContent || "");
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
    document.querySelectorAll(".md4-player,.formation-sub-chip,#formation-picker-list .formation-player-option").forEach(node => {
      const id = nodePlayerId(node);
      if (id) node.dataset.playerId = id;
      ensureDot(node,id);
    });
    document.querySelectorAll(".matchday-lineup-chip").forEach(node => ensureDot(node,nodePlayerId(node)));
    document.querySelectorAll(".formation-slot.occupied").forEach(slot => {
      const id = slot.dataset.playerId || playerIdFromText(slot.querySelector(".formation-player-name")?.textContent || "");
      if (id) slot.dataset.playerId = id;
      ensureDot(slot,id);
    });
  }

  function removeDismissedOptions(select) {
    if (!select) return;
    [...select.options].forEach(option => { if (option.value && isDismissed(option.value)) option.remove(); });
  }

  function refreshEligibilityUi() {
    // Native/legacy selects. Event-player controls deliberately remain untouched.
    ["matchday-sub-off","matchday-sub-on","matchday-goal-player","matchday-goal-assist"].forEach(id => removeDismissedOptions(document.getElementById(id)));

    // Any current sub-select, including bulk rows created after initial render.
    document.querySelectorAll("#md4-sub-view select.md4-off,#md4-sub-view select.md-bulk-off,#md4-sub-view select.md4-on,#md4-sub-view select.md-bulk-on,#matchday-bulk-subs select.md-bulk-off,#matchday-bulk-subs select.md-bulk-on").forEach(removeDismissedOptions);

    // Player buttons are filtered by their real data-player-id. Event screen is the only exception.
    document.querySelectorAll("#md4-goal-view .md4-player,#md4-sub-view .md4-player,#matchday-quick-goal .md-player-grid button,#md-penalty-players button").forEach(button => {
      const id = nodePlayerId(button);
      if (id) button.dataset.playerId = id;
      if (id && isDismissed(id)) button.remove();
    });

    document.querySelectorAll(".formation-sub-chip").forEach(chip => {
      const id = nodePlayerId(chip);
      const sentOff = isDismissed(id);
      chip.classList.toggle("dismissed",sentOff);
      chip.setAttribute("aria-disabled",sentOff?"true":"false");
      chip.title = sentOff ? "Dismissed — cannot be selected" : "";
      ensureDot(chip,id);
    });

    document.querySelectorAll("#formation-picker-list .formation-player-option").forEach(button => {
      const id = nodePlayerId(button);
      const sentOff = isDismissed(id);
      button.classList.toggle("dismissed",sentOff);
      button.disabled = sentOff;
      button.setAttribute("aria-disabled",sentOff?"true":"false");
      button.title = sentOff ? "Dismissed — cannot be selected" : "";
      ensureDot(button,id);
    });
  }

  function refreshReleaseUi() {
    refreshCardDots();
    refreshEligibilityUi();
  }

  document.addEventListener("click", event => {
    const assist = event.target.closest("#md4-assists .md4-player");
    const noAssist = event.target.closest("#md4-no-assist");
    if (assist || noAssist) {
      setTimeout(() => document.getElementById("md4-save-goal")?.click(),0);
      return;
    }
    if (event.target.closest("button[data-opponent-goal-type]")) {
      setTimeout(() => {
        document.querySelector(".opponent-goal-choice")?.classList.add("hidden");
        document.getElementById("md4-goal-view")?.classList.add("hidden");
      },0);
      return;
    }
    if (event.target.closest("#md4-subs,#md4-sub-view button,#matchday-bulk-subs-button,#matchday-bulk-subs button,#open-formation,.matchday-formation-live,.formation-slot,#formation-select,#md4-goal,#matchday-quick-goal-button,#md4-penalty-event")) {
      setTimeout(refreshReleaseUi,0);
      setTimeout(refreshReleaseUi,60);
    }
  });

  // Last-line guards against stale screens already open when dismissal occurs.
  document.addEventListener("click", event => {
    const formationOption = event.target.closest("#formation-picker-list .formation-player-option");
    const playerButton = event.target.closest("#md4-goal-view .md4-player,#md4-sub-view .md4-player,#matchday-quick-goal .md-player-grid button,#md-penalty-players button");
    const target = formationOption || playerButton;
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