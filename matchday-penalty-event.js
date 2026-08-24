// Adds Penalty as a quick Matchday event. A penalty is recorded against the
// player it was awarded to, with an outcome (awarded/scored/missed) so it survives
// into the editable timeline and Excel Events.
(() => {
  if (typeof state === "undefined" || typeof md === "undefined") return;

  const actions = document.querySelector(".md4-event-actions");
  if (!actions || document.getElementById("md4-penalty-event")) return;

  const style = document.createElement("style");
  style.textContent = `
    .md4-event-actions{grid-template-columns:repeat(4,minmax(0,1fr))!important}
    .md-penalty-overlay{position:fixed;inset:0;z-index:12000;background:var(--bg,#f4f5f7);overflow:auto}
    .md-penalty-overlay.hidden{display:none}
    .md-penalty-page{width:min(100%,760px);margin:0 auto;padding:0 16px 28px}
    .md-penalty-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 -16px 16px;padding:16px;background:var(--primary,#c8102e);color:#fff}
    .md-penalty-head h2{margin:0;font-size:1.3rem}
    .md-penalty-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .md-penalty-player{min-height:58px;border:1px solid var(--border);border-radius:13px;background:#fff;font-weight:900;padding:10px}
    .md-penalty-minute{display:grid;gap:6px;margin:0 0 14px;font-weight:900}
    .md-penalty-minute input{width:100%;font-size:16px;border:1px solid var(--border);border-radius:11px;padding:12px;background:#fff}
    .md-penalty-outcome{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:0 0 16px}
    .md-penalty-outcome button{min-height:54px;border-radius:13px;border:1px solid var(--border);background:#fff;font-weight:900}
    .md-penalty-outcome button.selected{background:#111827;color:#fff;border-color:#111827}
    @media(max-width:520px){.md4-event-actions{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
  `;
  document.head.appendChild(style);

  const button = document.createElement("button");
  button.id = "md4-penalty-event";
  button.type = "button";
  button.className = "secondary-button";
  button.textContent = "🥅 Penalty";
  actions.appendChild(button);

  const overlay = document.createElement("div");
  overlay.className = "md-penalty-overlay hidden";
  overlay.innerHTML = `
    <div class="md-penalty-page">
      <div class="md-penalty-head">
        <h2>Penalty</h2>
        <button type="button" class="small-button" id="md-penalty-close">Close</button>
      </div>
      <div id="md-penalty-body"></div>
    </div>`;
  document.body.appendChild(overlay);

  const body = overlay.querySelector("#md-penalty-body");
  const currentMinute = () => Math.max(0, Math.floor(typeof matchMinute === "function" ? matchMinute() : 0));
  let outcome = "Awarded";

  function openPenalty() {
    const minute = currentMinute();
    outcome = "Awarded";
    body.innerHTML = `
      <p class="md4-score-summary">Penalty · ${minute}'</p>
      <label class="md-penalty-minute">Minute
        <input id="md-penalty-minute" type="number" min="0" step="1" value="${minute}">
      </label>
      <p class="matchday-help"><strong>Outcome</strong></p>
      <div class="md-penalty-outcome">
        <button type="button" data-outcome="Awarded" class="selected">Awarded</button>
        <button type="button" data-outcome="Missed">Missed</button>
      </div>
      <p class="matchday-help"><strong>Who was the penalty awarded to?</strong></p>
      <div class="md-penalty-grid" id="md-penalty-players"></div>`;

    body.querySelectorAll("[data-outcome]").forEach(outcomeButton => {
      outcomeButton.addEventListener("click", () => {
        outcome = outcomeButton.dataset.outcome || "Awarded";
        body.querySelectorAll("[data-outcome]").forEach(item => item.classList.toggle("selected", item === outcomeButton));
      });
    });

    const grid = body.querySelector("#md-penalty-players");
    const ids = state.lineupIds?.length ? state.lineupIds : state.squadIds;
    ids.forEach(id => {
      const playerButton = document.createElement("button");
      playerButton.type = "button";
      playerButton.className = "md-penalty-player";
      playerButton.textContent = typeof playerName === "function" ? playerName(id) : id;
      playerButton.addEventListener("click", () => savePenalty(id));
      grid.appendChild(playerButton);
    });
    overlay.classList.remove("hidden");
  }

  function savePenalty(playerId) {
    const fallback = currentMinute();
    const raw = Number(body.querySelector("#md-penalty-minute")?.value);
    const minute = Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : fallback;
    const missed = outcome === "Missed";
    state.events.push({
      type: "Note",
      playerId,
      minute,
      text: missed ? "Penalty missed" : "Penalty awarded",
      eventKind: "Penalty",
      penaltyOutcome: outcome,
      recordedAt: new Date().toISOString()
    });
    saveState();
    if (typeof renderLive === "function") renderLive();
    if (typeof saveRecovery === "function") saveRecovery("penalty-event");
    overlay.classList.add("hidden");
  }

  button.addEventListener("click", openPenalty);
  overlay.querySelector("#md-penalty-close").addEventListener("click", () => overlay.classList.add("hidden"));
})();
