// Half-time countdown and restart alert.
// This file does not own scoreboard/button geometry; matchday-live-controls.js remains authoritative.
(() => {
  if (typeof state === "undefined" || typeof md === "undefined") return;

  const HALF_TIME_MS = 15 * 60 * 1000;
  const WARNING_MS = 2 * 60 * 1000;
  const EXPIRED_OVERLAY_MS = 60 * 1000;
  const TICK_MS = 250;

  const style = document.createElement("style");
  style.id = "matchday-halftime-alert-style";
  style.textContent = `
    #matchday-halftime-countdown {
      margin-top:8px;
      font-weight:900;
      font-size:18px;
      line-height:1.05;
      color:#fff;
      text-align:center;
      letter-spacing:.02em;
    }
    #matchday-halftime-countdown.warning {
      color:#ffe36a;
      font-size:20px;
    }
    #matchday-halftime-countdown.expired {
      color:#fff;
      background:rgba(255,255,255,.16);
      border:1px solid rgba(255,255,255,.55);
      border-radius:9px;
      padding:6px 10px;
    }
    #matchday-halftime-flash {
      position:fixed;
      inset:0;
      z-index:2147483646;
      pointer-events:auto;
      display:none;
      align-items:center;
      justify-content:center;
      text-align:center;
      padding:24px;
      box-sizing:border-box;
      color:#fff;
      background:rgba(207,13,48,.92);
      font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      letter-spacing:.02em;
      text-transform:uppercase;
    }
    #matchday-halftime-flash.active {
      display:flex;
      animation:welling-halftime-flash .7s steps(1,end) infinite;
    }
    #matchday-halftime-flash .halftime-alert-card {
      width:min(92vw,720px);
      display:flex;
      flex-direction:column;
      align-items:center;
      gap:18px;
      text-shadow:0 2px 8px rgba(0,0,0,.25);
    }
    #matchday-halftime-flash .halftime-alert-title {
      display:block;
      font:900 clamp(34px,7vw,88px)/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    }
    #matchday-halftime-flash .halftime-alert-subtitle {
      display:block;
      font-size:clamp(16px,2.3vw,26px);
      line-height:1.15;
      letter-spacing:.01em;
    }
    #matchday-halftime-ack {
      min-width:min(86vw,340px);
      min-height:58px;
      padding:12px 20px;
      border:2px solid currentColor;
      border-radius:14px;
      background:#fff;
      color:#cf0d30;
      font-size:18px;
      font-weight:950;
      text-transform:none;
      box-shadow:0 8px 24px rgba(0,0,0,.18);
      cursor:pointer;
    }
    #matchday-halftime-flash .halftime-alert-fallback {
      font-size:13px;
      font-weight:800;
      text-transform:none;
      opacity:.9;
    }
    @keyframes welling-halftime-flash {
      0%,49% { background:rgba(207,13,48,.96); color:#fff; }
      50%,100% { background:rgba(255,255,255,.97); color:#cf0d30; }
    }
    @media(max-width:520px){
      #matchday-halftime-countdown { font-size:16px; }
      #matchday-halftime-countdown.warning { font-size:18px; }
    }
    @media(prefers-reduced-motion:reduce){
      #matchday-halftime-flash.active { animation:none; background:#fff; color:#cf0d30; }
    }
  `;
  document.head.querySelector("#matchday-halftime-alert-style")?.remove();
  document.head.appendChild(style);

  let countdown = document.getElementById("matchday-halftime-countdown");
  if (!countdown) {
    countdown = document.createElement("div");
    countdown.id = "matchday-halftime-countdown";
    countdown.className = "hidden";
    countdown.setAttribute("aria-live", "polite");
  }

  let flash = document.getElementById("matchday-halftime-flash");
  if (!flash) {
    flash = document.createElement("div");
    flash.id = "matchday-halftime-flash";
    flash.setAttribute("aria-hidden", "true");
    flash.innerHTML = `
      <div class="halftime-alert-card" role="alertdialog" aria-modal="true" aria-labelledby="matchday-halftime-alert-title">
        <span class="halftime-alert-title" id="matchday-halftime-alert-title">Half Time Over</span>
        <span class="halftime-alert-subtitle">Ready for the second half</span>
        <button type="button" id="matchday-halftime-ack">Back to Matchday</button>
        <span class="halftime-alert-fallback">This alert will close automatically after 60 seconds.</span>
      </div>`;
    document.body.appendChild(flash);
  }

  const ackButton = flash.querySelector("#matchday-halftime-ack");

  function save() {
    if (typeof saveState === "function") saveState();
  }

  function formatRemaining(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;
  }

  function attachCountdown() {
    const timeMain = document.getElementById("matchday-time-main");
    if (!timeMain) return false;
    if (countdown.parentElement !== timeMain) timeMain.appendChild(countdown);
    return true;
  }

  function hideExpiredOverlay({ persist = false } = {}) {
    flash.classList.remove("active");
    flash.setAttribute("aria-hidden", "true");
    if (persist && !state.halfTimeExpiredDismissed) {
      state.halfTimeExpiredDismissed = true;
      save();
    }
  }

  function clearHalfTimeState({ persist = true } = {}) {
    let changed = false;
    for (const key of [
      "halfTimeStartedAt",
      "halfTimeTwoMinuteAlerted",
      "halfTimeExpiredAlerted",
      "halfTimeExpiredAt",
      "halfTimeExpiredDismissed"
    ]) {
      if (state[key] !== undefined && state[key] !== null) {
        delete state[key];
        changed = true;
      }
    }
    countdown.classList.add("hidden");
    countdown.classList.remove("warning", "expired");
    hideExpiredOverlay();
    if (changed && persist) save();
  }

  function maybeVibrate(pattern) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (_) {}
  }

  function update() {
    attachCountdown();

    const firstHalf = Number(state.period || 1) === 1;
    const pausedFirstHalf = state.status === "paused" && firstHalf;

    // Any return to first-half play, second-half start, reset, or finish cancels the half-time alert state.
    if (!pausedFirstHalf) {
      if (state.halfTimeStartedAt) clearHalfTimeState();
      else {
        countdown.classList.add("hidden");
        hideExpiredOverlay();
      }
      return;
    }

    if (!state.halfTimeStartedAt) return;

    const started = Number(state.halfTimeStartedAt);
    if (!Number.isFinite(started)) {
      clearHalfTimeState();
      return;
    }

    const remaining = HALF_TIME_MS - (Date.now() - started);
    countdown.classList.remove("hidden", "warning", "expired");

    if (remaining > WARNING_MS) {
      countdown.textContent = `HALF TIME ${formatRemaining(remaining)}`;
    } else if (remaining > 0) {
      countdown.classList.add("warning");
      countdown.textContent = `⚠ ${formatRemaining(remaining)} TO SECOND HALF`;
      if (!state.halfTimeTwoMinuteAlerted) {
        state.halfTimeTwoMinuteAlerted = true;
        save();
        maybeVibrate([250,120,250]);
      }
    } else {
      countdown.classList.add("expired");
      countdown.textContent = "HALF TIME OVER";

      if (!state.halfTimeExpiredAt) {
        state.halfTimeExpiredAt = Date.now();
        save();
      }

      const expiredFor = Date.now() - Number(state.halfTimeExpiredAt || Date.now());
      const shouldShow = !state.halfTimeExpiredDismissed && expiredFor < EXPIRED_OVERLAY_MS;

      if (shouldShow) {
        flash.classList.add("active");
        flash.setAttribute("aria-hidden", "false");
      } else {
        hideExpiredOverlay({ persist: !state.halfTimeExpiredDismissed });
      }

      if (!state.halfTimeExpiredAlerted) {
        state.halfTimeExpiredAlerted = true;
        save();
        maybeVibrate([400,150,400,150,700]);
      }
    }
  }

  ackButton?.addEventListener("click", () => {
    hideExpiredOverlay({ persist: true });
  });

  // Start the 15-minute countdown at the exact press of Pause / Halftime.
  // The existing Matchday handler still performs the actual match pause.
  md.pause?.addEventListener("click", () => {
    if (state.status !== "running" || Number(state.period || 1) !== 1) return;
    state.halfTimeStartedAt = Date.now();
    delete state.halfTimeTwoMinuteAlerted;
    delete state.halfTimeExpiredAlerted;
    delete state.halfTimeExpiredAt;
    delete state.halfTimeExpiredDismissed;
    save();
    setTimeout(update, 0);
  }, true);

  // The consolidated control script changes state for Resume / Start Second Half.
  // Polling keeps this alert layer independent of its button geometry and cleans itself up immediately.
  const handle = setInterval(update, TICK_MS);
  window.addEventListener("beforeunload", () => clearInterval(handle), { once:true });
  window.addEventListener("load", update, { once:true });

  update();
  setTimeout(update, 0);
  setTimeout(update, 150);
})();
