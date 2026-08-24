// Live Matchday refinements: keep Goal/Subs side-by-side, put Opponent Goal inside
// the Goal full-page picker, provide a light-green Formation shortcut under the score,
// and render specific timeline labels.
(() => {
  if (typeof state === "undefined") return;

  const style = document.createElement("style");
  style.textContent = `
    .md4-primary-actions{grid-template-columns:1fr 1fr!important}
    .md4-primary-actions #md4-goal,
    .md4-primary-actions #md4-subs{grid-column:auto!important}

    .matchday-formation-live{
      width:min(82%,360px)!important;
      min-height:74px!important;
      margin:auto auto 0!important;
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      border:1px solid rgba(22,163,74,.35)!important;
      border-radius:14px!important;
      background:rgba(220,252,231,.82)!important;
      color:#15803d!important;
      font-weight:950!important;
      font-size:1rem!important;
      box-shadow:0 4px 12px rgba(22,163,74,.08)!important;
    }

    .md4-opponent-goal-inline{
      width:100%!important;
      min-height:62px!important;
      margin:0 0 14px!important;
      border-radius:14px!important;
      border:1px solid rgba(220,38,38,.28)!important;
      background:rgba(254,226,226,.92)!important;
      color:#b91c1c!important;
      font-size:1.02rem!important;
      font-weight:950!important;
      align-items:center!important;
      justify-content:center!important;
      box-shadow:none!important;
    }

    @media(max-width:520px){
      .matchday-formation-live{min-height:68px!important;width:86%!important}
      .md4-opponent-goal-inline{min-height:58px!important}
    }
  `;
  document.head.appendChild(style);

  function safeName(id) {
    if (!id) return "";
    try {
      const value = typeof playerName === "function" ? playerName(id) : id;
      return value && value !== "undefined" ? String(value) : "";
    } catch (_) { return ""; }
  }

  function eventText(event) {
    if (!event) return "📝 Event";
    if (event.type === "Goal") {
      const scorer = safeName(event.playerId);
      const assist = safeName(event.assistPlayerId);
      return `⚽ ${scorer || "Goal"}${scorer ? " goal" : ""}${assist ? ` · assist ${assist}` : ""}`;
    }
    if (event.type === "Opponent Goal") {
      return `🔴 Opponent Goal · ${event.goalType || "Open Play"}`;
    }
    if (event.type === "Card") {
      const name = safeName(event.playerId);
      const icon = event.cardType === "Red" ? "🟥" : "🟨";
      return `${icon} ${name ? `${name} · ` : ""}${event.cardType || "Card"}`;
    }
    if (event.eventKind === "Penalty") {
      const name = safeName(event.playerId);
      return `🥅 Penalty awarded${name ? ` to ${name}` : ""}`;
    }
    const name = safeName(event.playerId);
    return `📝 ${name ? `${name} · ` : ""}${String(event.text || "Event").trim()}`;
  }

  function timelineItems() {
    const subs = (state.substitutions || []).map((sub, index) => ({
      kind:"sub", index, minute:Number(sub.minute || 0),
      text:`🔄 ${safeName(sub.off) || "Player"} off → ${safeName(sub.on) || "Player"} on`
    }));
    const events = (state.events || []).map((event, index) => ({
      kind:"event", index, minute:Number(event.minute || 0), text:eventText(event)
    }));
    return [...subs, ...events].sort((a,b) => a.minute - b.minute || a.kind.localeCompare(b.kind));
  }

  function refreshTimelineLabels() {
    const box = document.getElementById("md4-timeline");
    if (!box) return;
    const items = timelineItems();
    [...box.querySelectorAll(".md4-timeline-row")].forEach((row, index) => {
      const item = items[index];
      if (!item) return;
      const label = row.querySelector(".md4-timeline-text");
      if (label && label.textContent !== item.text) label.textContent = item.text;
      const edit = row.querySelector(".md4-edit");
      if (edit && edit.textContent !== "🔧") {
        edit.textContent = "🔧";
        edit.title = "Edit timeline item";
        edit.setAttribute("aria-label", "Edit timeline item");
      }
    });
  }

  function ensureFormationShortcut() {
    const resultPanel = document.querySelector(".matchday-result-panel");
    if (!resultPanel) return;
    let button = document.getElementById("matchday-formation-live");
    if (!button) {
      button = document.createElement("button");
      button.id = "matchday-formation-live";
      button.type = "button";
      button.className = "matchday-formation-live";
      button.textContent = "Formation";
      button.addEventListener("click", () => document.getElementById("open-formation")?.click());
      resultPanel.appendChild(button);
    }
  }

  function hideOpponentGoalOnLiveScreen(opponent) {
    if (!opponent) return;
    opponent.style.setProperty("display", "none", "important");
  }

  function showOpponentGoalInGoalPicker(opponent) {
    if (!opponent) return;
    opponent.style.setProperty("display", "flex", "important");
  }

  function putOpponentGoalInsideGoalFlow() {
    const opponent = document.querySelector(".matchday-opponent-goal");
    const goalButton = document.getElementById("md4-goal");
    if (!opponent || !goalButton) return;

    opponent.textContent = "Opponent Goal +";
    opponent.classList.add("md4-opponent-goal-inline");

    // It must never appear on the live scoreboard/action screen.
    const goalView = document.getElementById("md4-goal-view");
    if (!goalView || opponent.closest("#md4-goal-view") === null) hideOpponentGoalOnLiveScreen(opponent);

    if (goalButton.dataset.opponentInsideReady !== "true") {
      goalButton.dataset.opponentInsideReady = "true";
      goalButton.addEventListener("click", () => {
        setTimeout(() => {
          const body = document.querySelector("#md4-goal-view .md4-body");
          const grid = body?.querySelector(".md4-grid");
          if (!body || !grid) return;
          body.insertBefore(opponent, grid);
          showOpponentGoalInGoalPicker(opponent);
        }, 0);
      });
    }

    // When the Goal overlay is closed, immediately hide the button again so an
    // older scoreboard rule cannot make it visible back on the live screen.
    if (goalView && goalView.dataset.opponentCloseGuard !== "true") {
      goalView.dataset.opponentCloseGuard = "true";
      goalView.addEventListener("click", event => {
        if (event.target === goalView || event.target.closest(".md4-close")) {
          setTimeout(() => hideOpponentGoalOnLiveScreen(opponent), 0);
        }
      });
    }
  }

  function refresh() {
    ensureFormationShortcut();
    putOpponentGoalInsideGoalFlow();
    refreshTimelineLabels();
  }

  if (typeof renderLive === "function") {
    const previousRenderLive = renderLive;
    renderLive = function () {
      previousRenderLive();
      refresh();
    };
  }

  refresh();
  setTimeout(refresh, 0);
  setTimeout(refresh, 150);
})();
