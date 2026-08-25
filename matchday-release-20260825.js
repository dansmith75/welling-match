// Matchday release 2026-08-25
// - Yellow/red card dots beside player names
// - Red card OR second yellow = dismissed
// - Dismissed players cannot be subbed off, brought back on, or selected into Formation
// - Assist selection saves the goal immediately
// - Opponent goal type selection returns straight to Matchday
// - Tightens the Match Time / Score spacing without changing control alignment
(() => {
  if (typeof state === "undefined") return;

  const style = document.createElement("style");
  style.id = "matchday-release-20260825-style";
  style.textContent = `
    .md-card-dot{
      display:inline-block;
      width:9px;
      height:9px;
      margin-left:7px;
      border-radius:50%;
      flex:0 0 9px;
      vertical-align:middle;
      box-shadow:0 0 0 1px rgba(15,23,42,.12);
    }
    .md-card-dot.yellow{background:#facc15}
    .md-card-dot.red{background:#dc2626}
    .md4-player .md-card-dot{margin-left:8px}
    .matchday-lineup-chip .md-card-dot,
    .formation-sub-chip .md-card-dot{margin-left:6px}
    .formation-slot .md-card-dot{position:absolute;right:5px;bottom:5px;margin:0}
    .formation-sub-chip.dismissed,
    .formation-player-option.dismissed{
      opacity:.48;
      cursor:not-allowed!important;
      filter:saturate(.7);
    }
    .formation-sub-chip.dismissed{
      text-decoration:line-through;
      text-decoration-thickness:2px;
    }
  `;
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
    if (yellows === 1) return "yellow";
    return "";
  }

  function dismissedIds() {
    const ids = new Set();
    for (const event of state.events || []) {
      const id = event?.playerId;
      if (!id || event?.type !== "Card") continue;
      if (disciplinaryStatus(id) === "red") ids.add(id);
    }
    return ids;
  }

  function allPlayerIds() {
    const ids = new Set();
    (typeof matchdayPlayers !== "undefined" ? matchdayPlayers : []).forEach(player => ids.add(player.id));
    (typeof players !== "undefined" ? players : []).forEach(player => ids.add(player.id));
    (state.squadIds || []).forEach(id => ids.add(id));
    return [...ids].filter(Boolean);
  }

  function playerIdFromText(text) {
    const clean = String(text || "")
      .replace(/[●•]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const namePart = clean.split(" · ")[0].trim();
    return allPlayerIds().find(id => {
      try { return String(typeof playerName === "function" ? playerName(id) : id).trim() === namePart; }
      catch (_) { return String(id) === namePart; }
    }) || "";
  }

  function ensureDot(node, id) {
    if (!node || !id) return;
    node.querySelector?.(".md-card-dot")?.remove();
    const status = disciplinaryStatus(id);
    if (!status) return;
    const dot = document.createElement("span");
    dot.className = `md-card-dot ${status}`;
    const label = status === "red" ? "Dismissed" : "Yellow card";
    dot.setAttribute("aria-label", label);
    dot.title = label;
    node.appendChild(dot);
  }

  function refreshCardDots() {
    document.querySelectorAll(".md4-player").forEach(button => {
      const id = button.dataset.playerId || playerIdFromText(button.textContent);
      if (id) button.dataset.playerId = id;
      ensureDot(button, id);
    });

    document.querySelectorAll(".matchday-lineup-chip").forEach(chip => {
      ensureDot(chip, playerIdFromText(chip.textContent));
    });

    document.querySelectorAll(".formation-sub-chip").forEach(chip => {
      ensureDot(chip, playerIdFromText(chip.textContent));
    });

    document.querySelectorAll(".formation-slot.occupied").forEach(slot => {
      const name = slot.querySelector(".formation-player-name")?.textContent || "";
      ensureDot(slot, playerIdFromText(name));
    });
  }

  function removeDismissedOptions(select) {
    if (!select) return;
    const dismissed = dismissedIds();
    [...select.options].forEach(option => {
      if (option.value && dismissed.has(option.value)) option.remove();
    });
  }

  function refreshSubAvailability() {
    const dismissed = dismissedIds();

    // Legacy/native controls: a sent-off player is no longer part of a substitution.
    removeDismissedOptions(document.getElementById("matchday-sub-off"));
    removeDismissedOptions(document.getElementById("matchday-sub-on"));

    const subView = document.getElementById("md4-sub-view");
    if (!subView) return;

    // Bulk substitutions: remove dismissed players from both sides of the swap.
    subView.querySelectorAll("select.md4-off, select.md-bulk-off, select.md4-on, select.md-bulk-on").forEach(removeDismissedOptions);

    const body = subView.querySelector(".md4-body");
    const choosingOn = /choose player coming on/i.test(body?.textContent || "");
    const choosingOff = /individual substitution|tap the player coming off/i.test(body?.textContent || "");
    if (choosingOn || choosingOff) {
      body.querySelectorAll(".md4-player").forEach(button => {
        const id = button.dataset.playerId || playerIdFromText(button.textContent);
        if (id) button.dataset.playerId = id;
        if (dismissed.has(id)) button.remove();
      });
    }
  }

  function refreshFormationEligibility() {
    const dismissed = dismissedIds();

    document.querySelectorAll(".formation-sub-chip").forEach(chip => {
      const id = playerIdFromText(chip.textContent);
      ensureDot(chip, id);
      const sentOff = dismissed.has(id);
      chip.classList.toggle("dismissed", sentOff);
      chip.setAttribute("aria-disabled", sentOff ? "true" : "false");
      chip.title = sentOff ? "Dismissed — cannot be selected" : "";
    });

    document.querySelectorAll("#formation-picker-list .formation-player-option").forEach(button => {
      const id = playerIdFromText(button.textContent);
      const sentOff = dismissed.has(id);
      button.classList.toggle("dismissed", sentOff);
      button.disabled = sentOff;
      button.setAttribute("aria-disabled", sentOff ? "true" : "false");
      if (sentOff) {
        ensureDot(button, id);
        button.title = "Dismissed — cannot be selected";
      }
    });
  }

  function tightenScoreboard() {
    const mobile = window.matchMedia("(max-width:520px)").matches;
    const mainHeight = mobile ? 125 : 140;
    const labelHeight = mobile ? 22 : 24;
    const actionHeight = mobile ? 54 : 58;

    document.querySelectorAll(".matchday-time-panel, .matchday-result-panel").forEach(panel => {
      panel.style.setProperty("grid-template-rows", `${labelHeight}px ${mainHeight}px ${actionHeight}px`, "important");
    });

    [document.getElementById("matchday-time-main"), document.getElementById("matchday-result-main")].forEach(main => {
      if (!main) return;
      main.style.setProperty("height", `${mainHeight}px`, "important");
      main.style.setProperty("min-height", `${mainHeight}px`, "important");
      main.style.setProperty("max-height", `${mainHeight}px`, "important");
    });
  }

  function refreshReleaseUi() {
    refreshCardDots();
    refreshSubAvailability();
    refreshFormationEligibility();
    tightenScoreboard();
  }

  // Existing goal flow selects an assist but leaves Save Goal to be pressed.
  // Treat choosing the assist (or No assist) as Save Goal.
  document.addEventListener("click", event => {
    const assist = event.target.closest("#md4-assists .md4-player");
    const noAssist = event.target.closest("#md4-no-assist");
    if (assist || noAssist) {
      setTimeout(() => document.getElementById("md4-save-goal")?.click(), 0);
      return;
    }

    // The opponent-goal chooser already records the event when a type is clicked.
    // Because the chooser is launched from inside the Goal screen, also close that
    // Goal screen so the manager returns immediately to live Matchday.
    if (event.target.closest("button[data-opponent-goal-type]")) {
      setTimeout(() => {
        document.querySelector(".opponent-goal-choice")?.classList.add("hidden");
        document.getElementById("md4-goal-view")?.classList.add("hidden");
      }, 0);
      return;
    }

    // Any route into the substitute or Formation flow may rebuild its controls.
    if (event.target.closest("#md4-subs, #md4-sub-view button, #matchday-add-sub")) {
      setTimeout(refreshReleaseUi, 0);
    }
    if (event.target.closest("#open-formation, .matchday-formation-live, .formation-slot, #formation-select")) {
      setTimeout(refreshFormationEligibility, 0);
      setTimeout(refreshFormationEligibility, 80);
    }
  });

  // Block a dismissed player at capture phase as a final guard, even if a stale
  // Formation picker was already open before the card event was recorded.
  document.addEventListener("click", event => {
    const option = event.target.closest("#formation-picker-list .formation-player-option");
    if (!option) return;
    const id = playerIdFromText(option.textContent);
    if (!dismissedIds().has(id)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  // Run after all existing render wrappers so the final DOM gets indicators,
  // dismissal rules and tighter geometry. No MutationObserver is used here.
  if (typeof renderLive === "function") {
    const previousRenderLive = renderLive;
    renderLive = function () {
      previousRenderLive();
      refreshReleaseUi();
    };
  }

  window.addEventListener("resize", () => requestAnimationFrame(tightenScoreboard));
  window.addEventListener("load", refreshReleaseUi, { once:true });
  refreshReleaseUi();
  setTimeout(refreshReleaseUi, 100);
})();
