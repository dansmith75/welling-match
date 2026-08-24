// Matchday pause / half-time behaviour and scoreboard alignment.
(() => {
  if (typeof state === "undefined" || typeof md === "undefined") return;

  let secondHalfButton = document.getElementById("matchday-start-second-half");
  if (!secondHalfButton) {
    secondHalfButton = document.createElement("button");
    secondHalfButton.id = "matchday-start-second-half";
    secondHalfButton.type = "button";
    secondHalfButton.className = "secondary-button hidden";
    secondHalfButton.textContent = "Start Second Half";
  }

  let timerControls = document.getElementById("matchday-timer-controls");
  if (!timerControls) {
    timerControls = document.createElement("div");
    timerControls.id = "matchday-timer-controls";
    timerControls.className = "matchday-timer-controls";
  }

  const style = document.createElement("style");
  style.textContent = `
    .matchday-time-panel,
    .matchday-result-panel {
      display:grid!important;
      grid-template-rows:auto minmax(118px,auto) minmax(48px,auto) 74px!important;
      align-items:center!important;
    }
    .matchday-time-panel .matchday-score-panel-label,
    .matchday-result-panel .matchday-score-panel-label { grid-row:1!important; }
    .matchday-time-panel #matchday-clock { grid-row:2!important; }
    .matchday-time-panel #matchday-clock-state { grid-row:3!important; }

    .matchday-time-panel #matchday-timer-controls {
      grid-row:4!important;
      align-self:center!important;
      justify-self:center!important;
      width:min(82%,360px)!important;
      height:74px!important;
      margin:0!important;
      display:grid!important;
      grid-template-columns:minmax(0,1fr)!important;
      gap:10px!important;
      box-sizing:border-box!important;
    }
    .matchday-time-panel #matchday-timer-controls.two-buttons {
      width:min(96%,520px)!important;
      grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
    }
    .matchday-time-panel #matchday-pause,
    .matchday-time-panel #matchday-start-second-half {
      width:100%!important;
      min-width:0!important;
      height:74px!important;
      min-height:74px!important;
      margin:0!important;
      padding:10px 12px!important;
      box-sizing:border-box!important;
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      text-align:center!important;
      white-space:normal!important;
      line-height:1.15!important;
    }
    #matchday-resume { display:none!important; }
    .matchday-time-panel #matchday-pause.hidden,
    .matchday-time-panel #matchday-start-second-half.hidden { display:none!important; }

    .matchday-result-panel .matchday-formation-live {
      grid-row:4!important;
      align-self:center!important;
      width:min(82%,360px)!important;
      min-height:74px!important;
      height:74px!important;
      margin:0 auto!important;
      box-sizing:border-box!important;
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
    }
    .matchday-result-panel #matchday-team-score {
      grid-row:2 / span 2!important;
      align-self:center!important;
    }

    @media(max-width:520px){
      .matchday-time-panel,
      .matchday-result-panel{grid-template-rows:auto minmax(108px,auto) minmax(44px,auto) 68px!important}
      .matchday-time-panel #matchday-timer-controls{height:68px!important;width:86%!important}
      .matchday-time-panel #matchday-timer-controls.two-buttons{width:100%!important;gap:8px!important}
      .matchday-time-panel #matchday-pause,
      .matchday-time-panel #matchday-start-second-half,
      .matchday-result-panel .matchday-formation-live{min-height:68px!important;height:68px!important}
    }
  `;
  document.head.appendChild(style);

  function ensureTimerControlsInPanel() {
    const timePanel = document.querySelector(".matchday-time-panel");
    if (!timePanel || !md.pause) return false;

    if (timerControls.parentElement !== timePanel) timePanel.appendChild(timerControls);
    if (md.pause.parentElement !== timerControls) timerControls.appendChild(md.pause);
    if (secondHalfButton.parentElement !== timerControls) timerControls.appendChild(secondHalfButton);
    return true;
  }

  function refreshHalfTimeControls() {
    if (!ensureTimerControlsInPanel()) return;

    const paused = state.status === "paused";
    const active = state.status === "running" || paused;
    const firstHalf = Number(state.period || 1) === 1;
    const showSecondHalf = paused && firstHalf;

    md.pause.classList.toggle("hidden", !active);
    md.pause.textContent = paused ? "Resume" : "Pause / Halftime";
    if (md.resume) md.resume.classList.add("hidden");

    secondHalfButton.classList.toggle("hidden", !showSecondHalf);
    timerControls.classList.toggle("two-buttons", showSecondHalf);

    if (paused && md.clockState) {
      md.clockState.textContent = firstHalf ? "Paused / Halftime" : "Paused";
    }
  }

  md.pause?.addEventListener("click", event => {
    if (state.status !== "paused") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (typeof resumeMatch === "function") resumeMatch();
  }, true);

  secondHalfButton.addEventListener("click", () => {
    if (state.status !== "paused" || Number(state.period || 1) !== 1) return;

    const playedAtSecondHalfKickoff = typeof elapsedSeconds === "function"
      ? elapsedSeconds()
      : Number(state.accumulatedSeconds || 0);

    state.period = 2;
    state.secondHalfStartElapsed = playedAtSecondHalfKickoff;
    state.halfTimePlayedSeconds = playedAtSecondHalfKickoff;
    state.secondHalfStartedAt = new Date().toISOString();
    state.status = "running";
    state.lastResumeEpoch = Date.now();

    if (typeof saveState === "function") saveState();
    if (typeof renderLive === "function") renderLive();
    if (typeof startTicker === "function") startTicker();
    if (typeof startAutosave === "function") startAutosave();
    if (typeof saveRecovery === "function") saveRecovery("second-half-kickoff");
  });

  if (!Number.isFinite(Number(state.period))) {
    state.period = 1;
    if (typeof saveState === "function") saveState();
  }

  if (typeof renderLive === "function") {
    const previousRenderLive = renderLive;
    renderLive = function () {
      previousRenderLive();
      refreshHalfTimeControls();
    };
  }

  refreshHalfTimeControls();
  setTimeout(refreshHalfTimeControls, 0);
  setTimeout(refreshHalfTimeControls, 150);
})();