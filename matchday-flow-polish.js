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
      button.textContent = "🔧";
      button.title = "Edit timeline item";
      button.setAttribute("aria-label", "Edit timeline item");
    });

    timeline.querySelectorAll(".md4-timeline-text").forEach(label => {
      // Older/test events can exist without playerId. Never show the literal
      // JavaScript fallback word "undefined" to the user.
      const cleaned = String(label.textContent || "")
        .replace(/\bundefined\b\s*[·-]?\s*/gi, "")
        .replace(/\s+·\s*$/g, "")
        .trim();
      if (cleaned !== label.textContent) label.textContent = cleaned || "📝 Event";
    });
  }

  function alignScoreboardActions() {
    const timePanel = document.querySelector(".matchday-time-panel");
    const resultPanel = document.querySelector(".matchday-result-panel");
    if (!timePanel || !resultPanel) return;
    timePanel.style.alignItems = "center";
    resultPanel.style.alignItems = "center";
  }

  function polish() {
    alignScoreboardActions();
    polishTimeline();
  }

  polish();
  setTimeout(polish, 0);
  setTimeout(polish, 200);

  const observer = new MutationObserver(polish);
  observer.observe(document.body, { childList:true, subtree:true, characterData:true });
})();
