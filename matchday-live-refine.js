// Live Matchday refinements: move Opponent Goal into the primary goal controls,
// add a Formation shortcut under the score, and render specific timeline labels.
(() => {
  if (typeof state === "undefined") return;

  const style = document.createElement("style");
  style.textContent = `
    .md4-primary-actions{
      grid-template-columns:1fr 1fr!important;
    }
    .md4-primary-actions .matchday-opponent-goal{
      position:static!important;
      width:100%!important;
      min-height:76px!important;
      margin:0!important;
      border-radius:16px!important;
      font-size:1.05rem!important;
      font-weight:950!important;
      background:rgba(255,255,255,.14)!important;
      border:1px solid rgba(255,255,255,.55)!important;
      color:#fff!important;
      box-shadow:0 6px 16px rgba(17,24,39,.10)!important;
    }
    .md4-primary-actions #md4-subs{
      grid-column:1 / -1;
    }
    .matchday-formation-live{
      width:min(82%,360px)!important;
      min-height:74px!important;
      margin:auto auto 0!important;
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      border:1px solid rgba(255,255,255,.55)!important;
      border-radius:14px!important;
      background:rgba(255,255,255,.14)!important;
      color:#fff!important;
      font-weight:950!important;
      font-size:1rem!important;
    }
    @media(max-width:520px){
      .md4-primary-actions .matchday-opponent-goal{min-height:72px!important;font-size:.98rem!important}
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
      const detail = event.goalType || "Open Play";
      return `🔴 Opponent Goal · ${detail}`;
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
    const text = String(event.text || "Event").trim();
    return `📝 ${name ? `${name} · ` : ""}${text}`;
  }

  function timelineItems() {
    const subs = (state.substitutions || []).map((sub, index) => ({
      kind: "sub",
      index,
      minute: Number(sub.minute || 0),
      text: `🔄 ${safeName(sub.off) || "Player"} off → ${safeName(sub.on) || "Player"} on`
    }));
    const events = (state.events || []).map((event, index) => ({
      kind: "event",
      index,
      minute: Number(event.minute || 0),
      text: eventText(event)
    }));
    return [...subs, ...events].sort((a,b) => a.minute - b.minute || a.kind.localeCompare(b.kind));
  }

  function refreshTimelineLabels() {
    const box = document.getElementById("md4-timeline");
    if (!box) return;
    const items = timelineItems();
    const rows = [...box.querySelectorAll(".md4-timeline-row")];
    rows.forEach((row, index) => {
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

  function arrangeLiveControls() {
    const primary = document.querySelector(".md4-primary-actions");
    const opponent = document.querySelector(".matchday-opponent-goal");
    if (primary && opponent && opponent.parentElement !== primary) {
      const subs = document.getElementById("md4-subs");
      primary.insertBefore(opponent, subs || null);
      opponent.textContent = "Opponent Goal +";
    }

    const resultPanel = document.querySelector(".matchday-result-panel");
    if (resultPanel && !document.getElementById("matchday-formation-live")) {
      const button = document.createElement("button");
      button.id = "matchday-formation-live";
      button.type = "button";
      button.className = "matchday-formation-live";
      button.textContent = "Formation";
      button.addEventListener("click", () => {
        const launch = document.getElementById("open-formation");
        if (launch) launch.click();
      });
      resultPanel.appendChild(button);
    }
  }

  function refresh() {
    arrangeLiveControls();
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
  setTimeout(refresh, 200);
})();
