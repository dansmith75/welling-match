// Matchday pause / half-time behaviour with a stable scoreboard action row.
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
    timerControls.className = "matchday-panel-controls matchday-timer-controls";
  }

  const style = document.createElement("style");
  style.textContent = `
    /* One layout system only: each scoreboard half is label, centred content, action row. */
    .matchday-score-grid { align-items:stretch!important; }
    .matchday-time-panel,
    .matchday-result-panel {
      display:flex!important;
      flex-direction:column!important;
      align-items:stretch!important;
      min-height:390px!important;
      padding:14px 16px 18px!important;
      box-sizing:border-box!important;
      position:static!important;
    }
    .matchday-score-panel-label {
      flex:0 0 auto!important;
      align-self:center!important;
      margin-bottom:8px!important;
    }
    .matchday-panel-main {
      flex:1 1 auto!important;
      min-height:0!important;
      width:100%!important;
      display:flex!important;
      flex-direction:column!important;
      align-items:center!important;
      justify-content:center!important;
      box-sizing:border-box!important;
    }
    .matchday-time-panel #matchday-clock,
    .matchday-time-panel #matchday-clock-state,
    .matchday-result-panel #matchday-team-score {
      position:static!important;
      transform:none!important;
    }
    .matchday-time-panel #matchday-clock-state { margin-top:14px!important; }

    .matchday-panel-controls {
      flex:0 0 74px!important;
      height:74px!important;
      min-height:74px!important;
      width:100%!important;
      margin-top:18px!important;
      display:flex!important;
      align-items:stretch!important;
      justify-content:center!important;
      box-sizing:border-box!important;
      position:static!important;
      transform:none!important;
    }
    #matchday-timer-controls {
      width:min(82%,360px)!important;
      display:grid!important;
      grid-template-columns:minmax(0,1fr)!important;
      gap:10px!important;
      margin-left:auto!important;
      margin-right:auto!important;
    }
    #matchday-timer-controls.two-buttons {
      width:min(100%,520px)!important;
      grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
    }
    .matchday-time-panel #matchday-pause,
    .matchday-time-panel #matchday-start-second-half {
      width:100%!important;
      max-width:none!important;
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

    #matchday-result-controls .matchday-formation-live {
      width:min(82%,360px)!important;
      max-width:none!important;
      height:74px!important;
      min-height:74px!important;
      margin:0!important;
      position:static!important;
      transform:none!important;
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      box-sizing:border-box!important;
    }

    @media(max-width:520px){
      .matchday-time-panel,
      .matchday-result-panel {
        min-height:340px!important;
        padding:12px 10px 14px!important;
      }
      .matchday-panel-controls {
        flex-basis:68px!important;
        height:68px!important;
        min-height:68px!important;
        margin-top:14px!important;
      }
      #matchday-timer-controls { width:86%!important; }
      #matchday-timer-controls.two-buttons { width:100%!important; gap:8px!important; }
      .matchday-time-panel #matchday-pause,
      .matchday-time-panel #matchday-start-second-half,
      #matchday-result-controls .matchday-formation-live {
        height:68px!important;
        min-height:68px!important;
      }
    }
  `;
  document.head.appendChild(style);

  function ensureStableScoreboardStructure() {
    const timePanel = document.querySelector(".matchday-time-panel");
    const resultPanel = document.querySelector(".matchday-result-panel");
    const score = document.getElementById("matchday-team-score");
    const formation = document.getElementById("matchday-formation-live");
    if (!timePanel || !resultPanel || !md.pause || !score) return false;

    let timeMain = document.getElementById("matchday-time-main");
    if (!timeMain) {
      timeMain = document.createElement("div");
      timeMain.id = "matchday-time-main";
      timeMain.className = "matchday-panel-main";
    }
    if (timeMain.parentElement !== timePanel) {
      const label = timePanel.querySelector(".matchday-score-panel-label");
      label?.insertAdjacentElement("afterend", timeMain);
    }
    if (md.clock?.parentElement !== timeMain) timeMain.appendChild(md.clock);
    if (md.clockState?.parentElement !== timeMain) timeMain.appendChild(md.clockState);
    if (timerControls.parentElement !== timePanel) timePanel.appendChild(timerControls);
    if (md.pause.parentElement !== timerControls) timerControls.appendChild(md.pause);
    if (secondHalfButton.parentElement !== timerControls) timerControls.appendChild(secondHalfButton);

    let resultMain = document.getElementById("matchday-result-main");
    if (!resultMain) {
      resultMain = document.createElement("div");
      resultMain.id = "matchday-result-main";
      resultMain.className = "matchday-panel-main";
    }
    if (resultMain.parentElement !== resultPanel) {
      const label = resultPanel.querySelector(".matchday-score-panel-label");
      label?.insertAdjacentElement("afterend", resultMain);
    }
    if (score.parentElement !== resultMain) resultMain.appendChild(score);

    let resultControls = document.getElementById("matchday-result-controls");
    if (!resultControls) {
      resultControls = document.createElement("div");
      resultControls.id = "matchday-result-controls";
      resultControls.className = "matchday-panel-controls";
    }
    if (resultControls.parentElement !== resultPanel) resultPanel.appendChild(resultControls);
    if (formation && formation.parentElement !== resultControls) resultControls.appendChild(formation);

    return true;
  }

  function refreshHalfTimeControls() {
    if (!ensureStableScoreboardStructure()) return;

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
    state.pauseReason = null;
    state.pauseStartedAt = null;
    if (typeof saveState === "function") saveState();
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
    state.pauseReason = null;
    state.pauseStartedAt = null;
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