// Matchday speed layer: bulk substitutions, quick goals, pause safeguards and
// real-world timestamps. Loaded after matchday.js so the stable core remains intact.
(() => {
  if (typeof state === "undefined" || typeof md === "undefined") return;

  let pausedSince = null;
  let lastPauseToneAt = 0;

  const style = document.createElement("style");
  style.textContent = `
    .md-speed-row{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.md-speed-row button{flex:1;min-width:130px}
    .md-speed-primary{background:#0f766e!important;color:#fff!important;border-color:#0f766e!important}
    .md-speed-overlay{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.58);display:flex;align-items:flex-end;justify-content:center;padding:12px}
    .md-speed-overlay.hidden{display:none}.md-speed-sheet{width:min(720px,100%);max-height:88vh;overflow:auto;background:var(--card,#fff);color:var(--text,#111);border-radius:18px;padding:16px;box-shadow:0 18px 50px rgba(0,0,0,.3)}
    .md-speed-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}.md-speed-head h3{margin:0}.md-speed-close{min-width:auto!important}
    .md-player-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.md-player-grid button{min-height:48px}
    .md-swap-row{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end;margin:8px 0}.md-swap-row label{font-size:12px;font-weight:700}.md-swap-row select{width:100%;margin-top:4px}
    .md-pause-warning{display:none;margin:10px 0 0;padding:10px 12px;border-radius:12px;font-weight:800;text-align:center}.md-pause-warning.active{display:block;background:rgba(220,38,38,.14);border:1px solid rgba(220,38,38,.45);color:#dc2626}.md-pause-warning.halftime{display:block;background:rgba(37,99,235,.12);border:1px solid rgba(37,99,235,.35);color:inherit}
    @media(max-width:520px){.md-player-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.md-swap-row{grid-template-columns:1fr 1fr}.md-swap-row .md-remove-swap{grid-column:1/-1}}
  `;
  document.head.appendChild(style);

  function nowIso() { return new Date().toISOString(); }
  function currentMinute() { return Math.max(0, Math.floor(typeof matchMinute === "function" ? matchMinute() : 0)); }

  function ensureTimestampOnLast(kind, beforeLength) {
    setTimeout(() => {
      const list = kind === "sub" ? state.substitutions : state.events;
      if (!Array.isArray(list) || list.length <= beforeLength) return;
      const item = list[list.length - 1];
      if (!item.recordedAt) item.recordedAt = nowIso();
      saveState();
    }, 0);
  }

  // Standard existing controls also gain a wall-clock audit timestamp.
  md.addSub?.addEventListener("click", () => ensureTimestampOnLast("sub", state.substitutions.length), true);
  md.addGoal?.addEventListener("click", () => ensureTimestampOnLast("event", state.events.length), true);
  md.addEvent?.addEventListener("click", () => ensureTimestampOnLast("event", state.events.length), true);

  function makeOverlay(id, title) {
    const overlay = document.createElement("div");
    overlay.id = id;
    overlay.className = "md-speed-overlay hidden";
    overlay.innerHTML = `<div class="md-speed-sheet"><div class="md-speed-head"><h3>${title}</h3><button type="button" class="small-button md-speed-close">Close</button></div><div class="md-speed-body"></div></div>`;
    document.body.appendChild(overlay);
    overlay.querySelector(".md-speed-close").addEventListener("click", () => overlay.classList.add("hidden"));
    overlay.addEventListener("click", event => { if (event.target === overlay) overlay.classList.add("hidden"); });
    return overlay;
  }

  // ---------- Quick Goal ----------
  const goalOverlay = makeOverlay("matchday-quick-goal", "Quick Goal");
  const goalBody = goalOverlay.querySelector(".md-speed-body");
  let quickScorer = null;

  function recordQuickGoal(assistId = "", goalType = "Open Play") {
    if (!quickScorer) return;
    const event = { type: "Goal", playerId: quickScorer, minute: currentMinute(), goalType, recordedAt: nowIso() };
    if (goalType === "Open Play" && assistId) event.assistPlayerId = assistId;
    state.events.push(event);
    saveState();
    renderLive();
    saveRecovery("quick-goal");
    goalOverlay.classList.add("hidden");
    quickScorer = null;
  }

  function renderQuickGoalScorers() {
    quickScorer = null;
    goalBody.innerHTML = `<p class="matchday-help">Current minute: <strong>${currentMinute()}'</strong>. Tap the scorer.</p><div class="md-player-grid"></div>`;
    const grid = goalBody.querySelector(".md-player-grid");
    state.squadIds.forEach(id => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "secondary-button";
      button.textContent = playerName(id);
      button.addEventListener("click", () => { quickScorer = id; renderQuickGoalAssist(); });
      grid.appendChild(button);
    });
  }

  function renderQuickGoalAssist() {
    goalBody.innerHTML = `<p><strong>${playerName(quickScorer)}</strong> scored at <strong>${currentMinute()}'</strong>.</p><p class="matchday-help">Tap the assist. Open Play is assumed.</p><div class="md-player-grid" id="md-assist-grid"></div><div class="md-speed-row"><button type="button" class="secondary-button" id="md-no-assist">No assist</button><button type="button" class="secondary-button" id="md-penalty-goal">Penalty</button><button type="button" class="small-button" id="md-change-scorer">Change scorer</button></div>`;
    const grid = goalBody.querySelector("#md-assist-grid");
    state.squadIds.filter(id => id !== quickScorer).forEach(id => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "secondary-button";
      button.textContent = playerName(id);
      button.addEventListener("click", () => recordQuickGoal(id));
      grid.appendChild(button);
    });
    goalBody.querySelector("#md-no-assist").addEventListener("click", () => recordQuickGoal(""));
    goalBody.querySelector("#md-penalty-goal").addEventListener("click", () => recordQuickGoal("", "Penalty"));
    goalBody.querySelector("#md-change-scorer").addEventListener("click", renderQuickGoalScorers);
  }

  const goalCard = md.goalPlayer?.closest(".matchday-event-card");
  if (goalCard) {
    const row = document.createElement("div");
    row.className = "md-speed-row";
    row.innerHTML = `<button type="button" class="secondary-button md-speed-primary" id="matchday-quick-goal-button">⚡ Quick Goal</button><button type="button" class="small-button" id="matchday-more-goal-button">More options</button>`;
    goalCard.insertBefore(row, goalCard.querySelector(".matchday-event-grid"));
    const form = goalCard.querySelector(".matchday-event-grid");
    md.addGoal.classList.add("hidden");
    form.classList.add("hidden");
    row.querySelector("#matchday-quick-goal-button").addEventListener("click", () => { renderQuickGoalScorers(); goalOverlay.classList.remove("hidden"); });
    row.querySelector("#matchday-more-goal-button").addEventListener("click", event => {
      form.classList.toggle("hidden");
      md.addGoal.classList.toggle("hidden");
      event.currentTarget.textContent = form.classList.contains("hidden") ? "More options" : "Hide options";
    });
  }

  // ---------- Bulk Subs ----------
  const subOverlay = makeOverlay("matchday-bulk-subs", "Bulk Subs");
  const subBody = subOverlay.querySelector(".md-speed-body");

  function optionHtml(ids, label) {
    return `<option value="">${label}</option>` + ids.map(id => `<option value="${id}">${playerName(id)}</option>`).join("");
  }

  function addSwapRow(container) {
    const row = document.createElement("div");
    row.className = "md-swap-row";
    row.innerHTML = `<label>OFF<select class="matchday-select md-bulk-off">${optionHtml(state.lineupIds,"Player off")}</select></label><label>ON<select class="matchday-select md-bulk-on">${optionHtml(state.squadIds.filter(id => !state.lineupIds.includes(id)),"Player on")}</select></label><button type="button" class="small-button md-remove-swap">Remove</button>`;
    row.querySelector(".md-remove-swap").addEventListener("click", () => row.remove());
    container.appendChild(row);
  }

  function openBulkSubs() {
    const minute = currentMinute();
    subBody.innerHTML = `<p class="matchday-help">All swaps will be recorded together at <strong>${minute}'</strong> using the exact same timestamp.</p><div id="md-swap-list"></div><div class="md-speed-row"><button type="button" class="secondary-button" id="md-add-swap">+ Add swap</button><button type="button" class="primary-button md-speed-primary" id="md-confirm-swaps">Confirm Subs</button></div>`;
    const list = subBody.querySelector("#md-swap-list");
    addSwapRow(list); addSwapRow(list); addSwapRow(list);
    subBody.querySelector("#md-add-swap").addEventListener("click", () => addSwapRow(list));
    subBody.querySelector("#md-confirm-swaps").addEventListener("click", () => confirmBulkSubs(list));
    subOverlay.classList.remove("hidden");
  }

  function confirmBulkSubs(list) {
    const rows = [...list.querySelectorAll(".md-swap-row")].map(row => ({ off: row.querySelector(".md-bulk-off").value, on: row.querySelector(".md-bulk-on").value })).filter(pair => pair.off || pair.on);
    if (!rows.length) return window.alert("Choose at least one swap.");
    if (rows.some(pair => !pair.off || !pair.on || pair.off === pair.on)) return window.alert("Each row needs a different player OFF and ON.");
    if (new Set(rows.map(x => x.off)).size !== rows.length || new Set(rows.map(x => x.on)).size !== rows.length) return window.alert("A player can only be used once in this bulk change.");

    const second = Math.round(elapsedSeconds());
    const minute = Math.floor(second / 60);
    const stamp = nowIso();
    const proposedLineup = [...state.lineupIds];
    for (const pair of rows) {
      if (!proposedLineup.includes(pair.off) || proposedLineup.includes(pair.on)) return window.alert("One of those swaps is no longer valid. Close and reopen Bulk Subs.");
      const current = [...(state.intervals[pair.off] || [])].reverse().find(i => i.end === null);
      if (!current || second < current.start) return window.alert(`Cannot take ${playerName(pair.off)} off at this time.`);
      current.end = second;
      openInterval(pair.on, second);
      proposedLineup.splice(proposedLineup.indexOf(pair.off), 1, pair.on);
      state.substitutions.push({ minute, second, off: pair.off, on: pair.on, recordedAt: stamp, bulk: true });
    }
    state.lineupIds = proposedLineup;
    saveState();
    renderLive();
    saveRecovery("bulk-substitution");
    subOverlay.classList.add("hidden");
  }

  const subSection = md.subList?.closest(".matchday-live-section");
  if (subSection) {
    const row = document.createElement("div");
    row.className = "md-speed-row";
    row.innerHTML = `<button type="button" class="secondary-button md-speed-primary" id="matchday-bulk-subs-button">⚡ Bulk Subs</button>`;
    subSection.insertBefore(row, subSection.querySelector(".matchday-sub-grid"));
    row.querySelector("#matchday-bulk-subs-button").addEventListener("click", openBulkSubs);
  }

  // ---------- Explicit Half Time + accidental-pause safeguard ----------
  const liveActions = md.pause?.closest(".matchday-live-actions");
  let pauseTimerButton = null;
  let warning = null;
  if (liveActions) {
    md.pause.textContent = "Half Time";
    pauseTimerButton = document.createElement("button");
    pauseTimerButton.type = "button";
    pauseTimerButton.className = "secondary-button";
    pauseTimerButton.textContent = "Pause Timer";
    liveActions.insertBefore(pauseTimerButton, md.resume);
    warning = document.createElement("div");
    warning.className = "md-pause-warning";
    liveActions.insertAdjacentElement("afterend", warning);

    md.pause.addEventListener("click", () => { state.pauseReason = "halftime"; state.pauseStartedAt = nowIso(); saveState(); }, true);
    pauseTimerButton.addEventListener("click", () => {
      if (state.status !== "running") return;
      state.pauseReason = "pause";
      state.pauseStartedAt = nowIso();
      saveState();
      pauseMatch();
    });
    md.resume.addEventListener("click", () => {
      state.pauseReason = null;
      state.pauseStartedAt = null;
      saveState();
    }, true);
  }

  function tone() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; gain.gain.value = 0.07;
      osc.start(); osc.stop(ctx.currentTime + 0.22);
      setTimeout(() => ctx.close().catch(() => {}), 400);
    } catch (_) {}
  }

  setInterval(() => {
    if (!warning || !pauseTimerButton) return;
    pauseTimerButton.classList.toggle("hidden", state.status !== "running");
    if (state.status !== "paused") {
      pausedSince = null; lastPauseToneAt = 0; warning.className = "md-pause-warning"; warning.textContent = ""; md.resume.textContent = "Resume"; return;
    }

    const start = state.pauseStartedAt ? Date.parse(state.pauseStartedAt) : (pausedSince ||= Date.now());
    const seconds = Math.max(0, Math.floor((Date.now() - start) / 1000));
    const mins = Math.floor(seconds / 60); const secs = String(seconds % 60).padStart(2,"0");

    if (state.pauseReason === "halftime") {
      warning.className = "md-pause-warning halftime";
      warning.textContent = `Half Time · clock stopped ${mins}:${secs}`;
      md.resume.textContent = "Start Second Half";
      return;
    }

    md.resume.textContent = "Resume";
    if (seconds >= 90) {
      warning.className = "md-pause-warning active";
      warning.textContent = `TIMER PAUSED · ${mins}:${secs} · Resume if play has restarted`;
    } else {
      warning.className = "md-pause-warning";
      warning.textContent = "";
    }
    if (seconds >= 120 && seconds - lastPauseToneAt >= 120) { lastPauseToneAt = seconds; tone(); }
  }, 1000);
})();
