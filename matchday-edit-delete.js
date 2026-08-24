// Route the new v4 timeline spanner through the existing Matchday correction dialog
// so every timeline item offers both Edit and Delete.
(() => {
  if (typeof state === "undefined") return;

  function timelineItems() {
    const subs = (state.substitutions || []).map((sub, index) => ({
      kind: "sub",
      index,
      minute: Number(sub.minute || 0),
      title: `${sub.minute || 0}' · ${typeof playerName === "function" ? playerName(sub.off) : sub.off} off → ${typeof playerName === "function" ? playerName(sub.on) : sub.on} on`
    }));
    const events = (state.events || []).map((event, index) => ({
      kind: "event",
      index,
      minute: Number(event.minute || 0),
      title: `${event.minute || 0}' · ${event.type === "Opponent Goal" ? "Opponent Goal" : event.type || "Event"}`
    }));
    return [...subs, ...events].sort((a, b) => a.minute - b.minute || a.kind.localeCompare(b.kind));
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("#md4-timeline .md4-edit");
    if (!button) return;

    const row = button.closest(".md4-timeline-row");
    const rows = [...document.querySelectorAll("#md4-timeline .md4-timeline-row")];
    const rowIndex = rows.indexOf(row);
    const item = timelineItems()[rowIndex];
    if (!item || typeof openCorrection !== "function") return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (item.kind === "sub") {
      openCorrection(item.title, () => editSub(item.index), () => deleteSub(item.index));
    } else {
      openCorrection(item.title, () => editEvent(item.index), () => deleteEvent(item.index));
    }
  }, true);
})();