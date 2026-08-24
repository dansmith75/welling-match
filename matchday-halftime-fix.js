// Matchday pause / half-time behaviour and scoreboard alignment.
(() => {
  if (typeof state === "undefined" || typeof md === "undefined") return;

  // The main timer control is always the existing Pause button. While paused it
  // changes to Resume. A separate Start Second Half action appears alongside it
  // only when the first half is paused.
  let secondHalfButton = document.getElementById("matchday-start-second-half");
  if (!secondHalfButton && md.pause) {
    secondHalfButton = document.createElement("button");
    secondHalfButton.id = "matchday-start-second-half";
    secondHalfButton.type = "button";
    secondHalfButton.className = "secondary-button hidden";
    secondHalfButton.textContent = "Start Second Half";
    md.pause.insertAdjacentElement("afterend", secondHalfButton);
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
    .matchday-time-panel .matchday-live-actions {
      grid-row:4!important;
      width:min(82%,360px)!important;
      margin:0 auto!important;
      display:grid!important;
      grid-template-columns:1fr!important;
      gap:8px!important;
      align-self:center!important;
    }
    .matchday-time-panel .matchday-live-actions:has(#matchday-start-second-half:not(.hidden)) {
      grid-template-columns:1fr 1fr!important;
      width:min(96%,520px)!important;
    }
    .matchday-time-panel #matchday-pause,
    .matchday-time-panel #matchday-start-second-half,
    .matchday-result-panel .matchday-formation-live {
      min-height:74px!important;
      height:74px!important;
      margin:0!important;
      box-sizing:border-box!important;
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      text-align:center!important;
    }
    .matchday-time-panel #matchday-pause.hidden,
    .matchday-time-panel #matchday-start-second-half.hidden,
    .matchday-time-panel #matchday-resume { display:none!important; }
    .matchday-result-panel .matchday-formation-live {
      grid-row:4!important;
      align-self:center!important;
      width:min(82%,360px)!important;
      margin:0 auto!important;
    }
    .matchday-result-panel #matchday-team-score {
      grid-row:2 / span 2!important;
      align-self:center!important;
    }
    @media(max-width:520px){
      .matchday-time-panel,
      .matchday-result-panel{grid-template-rows:auto minmax(108px,auto) minmax(44px,auto) 68px!important}
      .matchday-time-panel #matchday-pause,
      .matchday-time-panel #matchday-start-second-half,
      .matchday-result-panel .matchday-formation-live{
        min-height:68px!important;
        height:68px!important;
      }
      .matchday-time-panel .matchday-live-actions:has(#matchday-start-second-half:not(.hidden)) {
        width:100%!important;
      }
    }
  `;
  document.head.appendChild(style);

  function refreshHalfTimeControls() {
    if (!md.pause || !secondHalfButton) return;

    const paused = state.status === "paused";
    const active = state.status === "running" || paused;
    const firstHalf = Number(state.period || 1) === 1;

    // Keep one main control in the same physical position throughout.
    md.pause.classList.toggle("hidden", !active);
    md.pause.textContent = paused ? "Resume" : "Pause / Halftime";

    // The legacy Resume button is retained in the DOM for compatibility with the
    // core Matchday code, but is never shown to the user.
    if (md.resume) md.resume.classList.add("hidden");

    secondHalfButton.classList.toggle("hidden", !(paused && firstHalf));

    if (paused && md.clockState) {
      md.clockState.textContent = firstHalf ? "Paused / Halftime" : "Paused";
    }
  }

  // When the same main button is clicked while paused, turn it into the Resume
  // action. Capture phase prevents the original pause handler from also firing.
  md.pause?.addEventListener("click", event => {
    if (state.status !== "paused") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (typeof resumeMatch === "function") resumeMatch();
  }, true);

  secondHalfButton?.addEventListener("click", () => {
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
})();
