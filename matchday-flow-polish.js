// Small live Matchday presentation fixes: aligned scoreboard actions, spanner edit
// controls, and safe rendering for events that have no player label.
(() => {
  const style = document.createElement("style");
  style.textContent = `
    .matchday-score-panel{display:flex!important;flex-direction:column!important;min-height:100%!important}
    .matchday-time-panel .matchday-halftime-button,
    .matchday-time-panel #matchday-pause,
    .matchday-result-panel .matchday-opponent-goal{
      width:min(82%,360px)!important;
      min-height:74px!important;
      margin-left:auto!important;
      margin-right:auto!important;
      margin-top:auto!important;
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      box-sizing:border-box!important;
    }
    .md4-edit{
      width:48px!important;
      min-width:48px!important;
      height:48px!important;
      padding:0!important;
      display:grid!important;
      place-items:center!important;
      font-size:1.35rem!important;
      line-height:1!important;
    }
  `;
  document.head.appendChild(style);

  function polishTimeline() {
    const timeline = document.getElementById("md4-timeline");
    if (!timeline) return;

    timeline.querySelectorAll(".md4-edit").forEach(button => {
      if (button.textContent !== "🔧") button.textContent = "🔧";
      if (button.title !== "Edit timeline item") button.title = "Edit timeline item";
      if (button.getAttribute("aria-label") !== "Edit timeline item") {
        button.setAttribute("aria-label", "Edit timeline item");
      }
    });

    timeline.querySelectorAll(".md4-timeline-text").forEach(label => {
      const original = String(label.textContent || "");
      if (!/\bundefined\b/i.test(original)) return;
      const cleaned = original
        .replace(/\bundefined\b\s*[·-]?\s*/gi, "")
        .replace(/\s+·\s*$/g, "")
        .trim();
      label.textContent = cleaned || "📝 Event";
    });
  }

  function alignScoreboardActions() {
    const timePanel = document.querySelector(".matchday-time-panel");
    const resultPanel = document.querySelector(".matchday-result-panel");
    if (!timePanel || !resultPanel) return;
    if (timePanel.style.alignItems !== "center") timePanel.style.alignItems = "center";
    if (resultPanel.style.alignItems !== "center") resultPanel.style.alignItems = "center";
  }

  function polish() {
    alignScoreboardActions();
    polishTimeline();
  }

  polish();
  setTimeout(polish, 0);
  setTimeout(polish, 200);

  // Matchday re-renders sections as events are added. Observe structural changes only,
  // and debounce the cosmetic pass so our own text tweaks cannot trigger an endless loop.
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      polish();
    });
  });
  observer.observe(document.body, { childList:true, subtree:true });
})();
