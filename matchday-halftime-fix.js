// Matchday pause / half-time behaviour with compact, aligned scoreboard controls.
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
    .matchday-score-grid{align-items:stretch!important}
    .matchday-time-panel,.matchday-result-panel{
      display:grid!important;
      grid-template-rows:auto auto 58px!important;
      align-content:start!important;
      align-items:start!important;
      min-height:0!important;
      height:auto!important;
      padding:14px 16px 16px!important;
      box-sizing:border-box!important;
      position:static!important;
    }
    .matchday-score-panel-label{
      align-self:center!important;
      justify-self:center!important;
      margin:0 0 10px!important;
    }
    .matchday-panel-main{
      width:100%!important;
      min-height:190px!important;
      display:flex!important;
      flex-direction:column!important;
      align-items:center!important;
      justify-content:center!important;
      box-sizing:border-box!important;
      margin:0!important;
      padding:0!important;
    }
    .matchday-time-panel #matchday-clock,
    .matchday-time-panel #matchday-clock-state,
    .matchday-result-panel #matchday-team-score{
      position:static!important;
      transform:none!important;
    }
    .matchday-time-panel #matchday-clock-state{margin-top:8px!important}

    .matchday-panel-controls{
      width:100%!important;
      height:58px!important;
      min-height:58px!important;
      margin:0!important;
      padding:0!important;
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      align-self:start!important;
      box-sizing:border-box!important;
      position:static!important;
      transform:none!important;
    }
    #matchday-timer-controls{
      width:min(78%,340px)!important;
      display:grid!important;
      grid-template-columns:minmax(0,1fr)!important;
      gap:10px!important;
      justify-self:center!important;
    }
    #matchday-timer-controls.two-buttons{
      width:min(96%,500px)!important;
      grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;
    }
    .matchday-time-panel #matchday-pause,
    .matchday-time-panel #matchday-start-second-half,
    #matchday-result-controls .matchday-formation-live{
      height:58px!important;
      min-height:58px!important;
      max-height:58px!important;
      margin:0!important;
      padding:8px 12px!important;
      box-sizing:border-box!important;
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      line-height:1.1!important;
      white-space:normal!important;
    }
    .matchday-time-panel #matchday-pause,
    .matchday-time-panel #matchday-start-second-half{
      width:100%!important;
      max-width:none!important;
      min-width:0!important;
    }
    #matchday-result-controls .matchday-formation-live{
      width:min(78%,340px)!important;
      max-width:none!important;
      position:static!important;
      transform:none!important;
    }
    #matchday-resume{display:none!important}
    .matchday-time-panel #matchday-pause.hidden,
    .matchday-time-panel #matchday-start-second-half.hidden{display:none!important}

    @media(max-width:520px){
      .matchday-time-panel,.matchday-result-panel{
        grid-template-rows:auto auto 54px!important;
        padding:12px 10px 14px!important;
      }
      .matchday-panel-main{min-height:170px!important}
      .matchday-panel-controls{
        height:54px!important;
        min-height:54px!important;
      }
      #matchday-timer-controls{width:84%!important}
      #matchday-timer-controls.two-buttons{width:100%!important;gap:8px!important}
      .matchday-time-panel #matchday-pause,
      .matchday-time-panel #matchday-start-second-half,
      #matchday-result-controls .matchday-formation-live{
        height:54px!important;
        min-height:54px!important;
        max-height:54px!important;
      }
      #matchday-result-controls .matchday-formation-live{width:84%!important}
    }
  `;
  document.head.appendChild(style);

  function ensureStructure() {
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
      timePanel.querySelector(".matchday-score-panel-label")?.insertAdjacentElement("afterend", timeMain);
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
      resultPanel.querySelector(".matchday-score-panel-label")?.insertAdjacentElement("afterend", resultMain);
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

  function refreshControls() {
    if (!ensureStructure()) return;
    const paused = state.status === "paused";
    const active = state.status === "running" || paused;
    const firstHalf = Number(state.period || 1) === 1;
    const showSecondHalf = paused && firstHalf;

    md.pause.classList.toggle("hidden", !active);
    md.pause.textContent = paused ? "Resume" : "Pause / Halftime";
    if (md.resume) md.resume.classList.add("hidden");
    secondHalfButton.classList.toggle("hidden", !showSecondHalf);
    timerControls.classList.toggle("two-buttons", showSecondHalf);
    if (paused && md.clockState) md.clockState.textContent = firstHalf ? "Paused / Halftime" : "Paused";
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
    const played = typeof elapsedSeconds === "function" ? elapsedSeconds() : Number(state.accumulatedSeconds || 0);
    state.period = 2;
    state.secondHalfStartElapsed = played;
    state.halfTimePlayedSeconds = played;
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
    const previous = renderLive;
    renderLive = function () {
      previous();
      refreshControls();
    };
  }

  refreshControls();
  setTimeout(refreshControls, 0);
  setTimeout(refreshControls, 150);
})();