// Small live Matchday presentation fixes: spanner edit controls and safe rendering
// for timeline events that have no player label. Scoreboard geometry is owned solely
// by matchday-live-controls.js.
(() => {
  const style = document.createElement("style");
  style.textContent = `
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

  function polish() {
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
