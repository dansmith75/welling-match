// Matchday half-time behaviour and scoreboard alignment.
(() => {
  if (typeof state === "undefined" || typeof md === "undefined") return;

  const style = document.createElement("style");
  style.textContent = `
    /* Give both halves of the scoreboard the same action row so buttons do not jump. */
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
    .matchday-time-panel #matchday-pause,
    .matchday-time-panel #matchday-resume,
    .matchday-result-panel .matchday-formation-live {
      grid-row:4!important;
      align-self:center!important;
      width:min(82%,360px)!important;
      min-height:74px!important;
      margin:0 auto!important;
      box-sizing:border-box!important;
    }
    .matchday-result-panel #matchday-team-score {
      grid-row:2 / span 2!important;
      align-self:center!important;
    }
    @media(max-width:520px){
      .matchday-time-panel,
      .matchday-result-panel{grid-template-rows:auto minmax(108px,auto) minmax(44px,auto) 68px!important}
      .matchday-time-panel #matchday-pause,
      .matchday-time-panel #matchday-resume,
      .matchday-result-panel .matchday-formation-live{min-height:68px!important}
    }
  `;
  document.head.appendChild(style);

  // Capture before the existing Resume handler. Only Half Time creates a new period;
  // an ordinary Pause Timer / Resume keeps the same clock position.
  md.resume?.addEventListener("click", () => {
    if (state.status !== "paused" || state.pauseReason !== "halftime") return;

    const playedAtSecondHalfKickoff = typeof elapsedSeconds === "function"
      ? elapsedSeconds()
      : Number(state.accumulatedSeconds || 0);

    state.period = 2;
    state.secondHalfStartElapsed = playedAtSecondHalfKickoff;
    state.halfTimePlayedSeconds = playedAtSecondHalfKickoff;
    state.secondHalfStartedAt = new Date().toISOString();
    if (typeof saveState === "function") saveState();
  }, true);

  // Keep older/in-progress state safe: period defaults to the first half until the
  // explicit Start Second Half action is used.
  if (!Number.isFinite(Number(state.period))) {
    state.period = 1;
    if (typeof saveState === "function") saveState();
  }
})();
