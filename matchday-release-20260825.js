// Matchday release 2026-08-25
// - Yellow/red card dots beside player names
// - Red-carded players cannot be selected to come back on as substitutes
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
  `;
  document.head.appendChild(style);

  function cardStatus(id) {
    if (!id) return "";
    let yellow = false;
    for (const event of state.events || []) {
      if (event?.type !== "Card" || event.playerId !== id) continue;
      if (String(event.cardType || "").toLowerCase() === "red") return "red";
      if (String(event.cardType || "").toLowerCase() === "yellow") yellow = true;
    }
    return yellow ? "yellow" : "";
  }

  function redCardIds() {
    return new Set((state.events || [])
      .filter(event => event?.type === "Card" && String(event.cardType || "").toLowerCase() === "red")
      .map(event => event.playerId)
      .filter(Boolean));
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
    const status = cardStatus(id);
    if (!status) return;
    const dot = document.createElement("span");
    dot.className = `md-card-dot ${status}`;
    dot.setAttribute("aria-label", status === "red" ? "Red card" : "Yellow card");
    dot.title = status === "red" ? "Red card" : "Yellow card";
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

  function removeRedOptions(select) {
    if (!select) return;
    const reds = redCardIds();
    [...select.options].forEach(option => {
      if (option.value && reds.has(option.value)) option.remove();
    });
  }

  function refreshSubAvailability() {
    const reds = redCardIds();

    // Legacy/native substitute-on control.
    removeRedOptions(document.getElementById("matchday-sub-on"));

    const subView = document.getElementById("md4-sub-view");
    if (!subView) return;

    // Bulk substitutions: red-carded players must never be available in ON selects.
    subView.querySelectorAll("select.md4-on, select.md-bulk-on").forEach(removeRedOptions);

    // Individual substitution flow: only remove players on the 'coming on' screen.
    const body = subView.querySelector(".md4-body");
    const choosingOn = /choose player coming on/i.test(body?.textContent || "");
    if (choosingOn) {
      body.querySelectorAll(".md4-player").forEach(button => {
        const id = button.dataset.playerId || playerIdFromText(button.textContent);
        if (id) button.dataset.playerId = id;
        if (reds.has(id)) button.remove();
      });
    }
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

    // Any route into the substitute flow may rebuild its buttons/selects.
    if (event.target.closest("#md4-subs, #md4-sub-view button, #matchday-add-sub")) {
      setTimeout(refreshReleaseUi, 0);
    }
  });

  // Run after all existing render wrappers so the final DOM gets the indicators
  // and tighter geometry. No MutationObserver is used here.
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
