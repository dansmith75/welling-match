// Single owner for live Matchday scoreboard controls.
//
// IMPORTANT: no other Matchday layer should set width, height, margin or placement for
// Pause/Resume, Start Second Half, Formation, or the two scoreboard panels. Older UI
// layers may still style colours/typography; this file owns geometry and behaviour.
(() => {
  if (typeof state === "undefined" || typeof md === "undefined") return;

  const desktop = { label: 24, main: 190, action: 58, panelPadX: 16, panelPadTop: 12, panelPadBottom: 14 };
  const mobile = { label: 22, main: 170, action: 54, panelPadX: 10, panelPadTop: 10, panelPadBottom: 12 };

  const important = (node, name, value) => node?.style?.setProperty(name, value, "important");

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
  }

  let resultControls = document.getElementById("matchday-result-controls");
  if (!resultControls) {
    resultControls = document.createElement("div");
    resultControls.id = "matchday-result-controls";
  }

  // Appearance that genuinely belongs to these controls. Geometry is applied inline
  // below with !important so late-loaded legacy styles cannot move the controls again.
  const style = document.createElement("style");
  style.id = "matchday-live-controls-style";
  style.textContent = `
    #matchday-timer-controls{
      display:grid;
      grid-template-columns:minmax(0,1fr);
      gap:10px;
    }
    #matchday-timer-controls.two-buttons{
      grid-template-columns:minmax(0,1fr) minmax(0,1fr);
    }
    #matchday-pause,
    #matchday-start-second-half,
    #matchday-formation-live{
      text-align:center;
      white-space:normal;
      line-height:1.1;
    }
    #matchday-start-second-half{
      border:1px solid rgba(255,255,255,.72);
      background:#fff;
      color:#172033;
      font-weight:900;
      border-radius:11px;
    }
    #matchday-resume{display:none!important}
    #matchday-pause.hidden,
    #matchday-start-second-half.hidden{display:none!important}
  `;
  document.head.appendChild(style);

  function dimensions() {
    return window.matchMedia("(max-width:520px)").matches ? mobile : desktop;
  }

  function ensureStructure() {
    const board = md.clock?.closest(".matchday-scoreboard");
    const grid = board?.querySelector(".matchday-score-grid");
    const timePanel = grid?.querySelector(".matchday-time-panel");
    const resultPanel = grid?.querySelector(".matchday-result-panel");
    const score = document.getElementById("matchday-team-score");
    const formation = document.getElementById("matchday-formation-live");

    if (!board || !grid || !timePanel || !resultPanel || !score || !md.pause) return null;

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

    if (resultControls.parentElement !== resultPanel) resultPanel.appendChild(resultControls);
    if (formation && formation.parentElement !== resultControls) resultControls.appendChild(formation);

    // Keep the old Resume element available to legacy code but completely out of layout.
    if (md.resume) {
      md.resume.classList.add("hidden");
      important(md.resume, "display", "none");
    }

    // Old speed-layer controls remain referenced by its timer, but must not keep stale
    // nodes in the hidden live-actions container.
    const legacyActions = document.querySelector(".matchday-live-actions");
    if (legacyActions) {
      [...legacyActions.querySelectorAll("button")].forEach(button => {
        if (button !== md.pause && button !== md.resume && button.textContent.trim() === "Pause Timer") button.remove();
      });
      legacyActions.parentElement?.querySelectorAll(":scope > .md-pause-warning").forEach(node => node.remove());
    }

    return { board, grid, timePanel, resultPanel, timeMain, resultMain, formation };
  }

  function applyPanelGeometry(panel, label, main, d) {
    important(panel, "display", "grid");
    important(panel, "grid-template-rows", `${d.label}px ${d.main}px ${d.action}px`);
    important(panel, "grid-template-columns", "minmax(0,1fr)");
    important(panel, "align-content", "start");
    important(panel, "align-items", "stretch");
    important(panel, "justify-items", "stretch");
    important(panel, "min-height", "0");
    important(panel, "height", "auto");
    important(panel, "padding", `${d.panelPadTop}px ${d.panelPadX}px ${d.panelPadBottom}px`);
    important(panel, "box-sizing", "border-box");
    important(panel, "position", "static");

    if (label) {
      important(label, "grid-row", "1");
      important(label, "align-self", "center");
      important(label, "justify-self", "center");
      important(label, "margin", "0");
    }

    important(main, "grid-row", "2");
    important(main, "width", "100%");
    important(main, "height", `${d.main}px`);
    important(main, "min-height", `${d.main}px`);
    important(main, "max-height", `${d.main}px`);
    important(main, "margin", "0");
    important(main, "padding", "0");
    important(main, "display", "flex");
    important(main, "flex-direction", "column");
    important(main, "align-items", "center");
    important(main, "justify-content", "center");
    important(main, "box-sizing", "border-box");
    important(main, "overflow", "visible");
  }

  function applyActionHost(host, d) {
    important(host, "grid-row", "3");
    important(host, "align-self", "start");
    important(host, "justify-self", "center");
    important(host, "height", `${d.action}px`);
    important(host, "min-height", `${d.action}px`);
    important(host, "max-height", `${d.action}px`);
    important(host, "margin", "0");
    important(host, "padding", "0");
    important(host, "box-sizing", "border-box");
    important(host, "position", "static");
    important(host, "transform", "none");
  }

  function applyButtonGeometry(button, d) {
    if (!button) return;
    important(button, "height", `${d.action}px`);
    important(button, "min-height", `${d.action}px`);
    important(button, "max-height", `${d.action}px`);
    important(button, "margin", "0");
    important(button, "padding", "8px 12px");
    important(button, "box-sizing", "border-box");
    important(button, "align-self", "stretch");
    important(button, "position", "static");
    important(button, "transform", "none");
    important(button, "display", "flex");
    important(button, "align-items", "center");
    important(button, "justify-content", "center");
  }

  function applyGeometry() {
    const nodes = ensureStructure();
    if (!nodes) return false;
    const d = dimensions();
    const { grid, timePanel, resultPanel, timeMain, resultMain, formation } = nodes;

    important(grid, "display", "grid");
    important(grid, "grid-template-columns", "minmax(0,1fr) minmax(0,1fr)");
    important(grid, "align-items", "start");

    applyPanelGeometry(timePanel, timePanel.querySelector(".matchday-score-panel-label"), timeMain, d);
    applyPanelGeometry(resultPanel, resultPanel.querySelector(".matchday-score-panel-label"), resultMain, d);

    important(md.clock, "position", "static");
    important(md.clock, "transform", "none");
    important(md.clock, "margin", "0");
    important(md.clockState, "position", "static");
    important(md.clockState, "transform", "none");
    important(md.clockState, "margin", "8px 0 0");

    const score = document.getElementById("matchday-team-score");
    important(score, "position", "static");
    important(score, "transform", "none");
    important(score, "margin", "0");

    applyActionHost(timerControls, d);
    applyActionHost(resultControls, d);

    const pausedFirstHalf = state.status === "paused" && Number(state.period || 1) === 1;
    timerControls.classList.toggle("two-buttons", pausedFirstHalf);
    important(timerControls, "display", "grid");
    important(timerControls, "grid-template-columns", pausedFirstHalf ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,1fr)");
    important(timerControls, "gap", pausedFirstHalf ? "10px" : "0");
    important(timerControls, "width", pausedFirstHalf ? "min(96%,500px)" : "min(78%,340px)");

    important(resultControls, "display", "flex");
    important(resultControls, "align-items", "stretch");
    important(resultControls, "justify-content", "center");
    important(resultControls, "width", "100%");

    applyButtonGeometry(md.pause, d);
    applyButtonGeometry(secondHalfButton, d);
    if (formation) {
      applyButtonGeometry(formation, d);
      important(formation, "width", "min(78%,340px)");
      important(formation, "max-width", "340px");
    }

    return true;
  }

  function refreshControls() {
    if (!applyGeometry()) return;

    const paused = state.status === "paused";
    const active = state.status === "running" || paused;
    const firstHalf = Number(state.period || 1) === 1;
    const showSecondHalf = paused && firstHalf;

    md.pause.textContent = paused ? "Resume" : "Pause / Halftime";
    md.pause.classList.toggle("hidden", !active);
    if (active) important(md.pause, "display", "flex");
    else important(md.pause, "display", "none");

    secondHalfButton.classList.toggle("hidden", !showSecondHalf);
    important(secondHalfButton, "display", showSecondHalf ? "flex" : "none");

    if (paused && md.clockState) md.clockState.textContent = firstHalf ? "Paused / Halftime" : "Paused";
  }

  // The original Pause button is deliberately reused as Resume while paused.
  // Capture phase prevents the core pause handler from seeing that Resume click.
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

    const played = typeof elapsedSeconds === "function"
      ? elapsedSeconds()
      : Number(state.accumulatedSeconds || 0);

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

  // Be the final render wrapper. Geometry is re-applied after all earlier Matchday
  // render wrappers have finished rebuilding/polishing their DOM.
  if (typeof renderLive === "function") {
    const previousRenderLive = renderLive;
    renderLive = function () {
      previousRenderLive();
      refreshControls();
    };
  }

  let scheduled = false;
  function scheduleRefresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      refreshControls();
    });
  }

  // Structural changes are observed; style/attribute changes are intentionally not,
  // so our own inline geometry cannot create an observer loop.
  const board = md.clock?.closest(".matchday-scoreboard");
  if (board) {
    new MutationObserver(scheduleRefresh).observe(board, { childList:true, subtree:true });
  }

  window.addEventListener("resize", scheduleRefresh);
  window.addEventListener("load", scheduleRefresh, { once:true });

  refreshControls();
  setTimeout(refreshControls, 0);
  setTimeout(refreshControls, 100);
  setTimeout(refreshControls, 400);
})();
