// Final shared Match squad UI refinements.
// Match selections save immediately, so Submit remains a Training-only action.
// Unavailable / Injured / Rotated players are grouped together at the bottom.
(() => {
  const coreRenderPlayers = renderPlayers;
  const exportButton = document.getElementById("export-json");

  function updateMatchActions() {
    if (!exportButton) return;
    exportButton.classList.toggle("hidden", isMatch());
  }

  function groupBottomStatuses() {
    if (!isMatch()) return;
    const list = document.getElementById("player-list");
    if (!list) return;

    list.querySelectorAll(".match-status-group-heading").forEach(el => el.remove());

    const cards = [...list.querySelectorAll(":scope > .player-card")];
    const groups = {
      Unavailable: [],
      Injured: [],
      Rotated: []
    };
    const normal = [];

    cards.forEach(card => {
      const selected = card.querySelector(".status-button.selected");
      const label = selected?.textContent?.trim();
      if (groups[label]) groups[label].push(card);
      else normal.push(card);
    });

    list.replaceChildren(...normal);

    ["Unavailable", "Injured", "Rotated"].forEach(status => {
      if (!groups[status].length) return;
      const heading = document.createElement("div");
      heading.className = "match-status-group-heading";
      heading.textContent = `${status} (${groups[status].length})`;
      list.appendChild(heading);
      groups[status].forEach(card => list.appendChild(card));
    });
  }

  renderPlayers = function () {
    coreRenderPlayers();
    groupBottomStatuses();
    updateMatchActions();
  };

  document.querySelectorAll('input[name="session-type"]').forEach(input => {
    input.addEventListener("change", () => {
      updateMatchActions();
      setTimeout(groupBottomStatuses, 0);
    });
  });

  const style = document.createElement("style");
  style.textContent = `
    .match-status-group-heading{
      grid-column:1/-1;
      margin:16px 0 2px;
      padding:8px 4px 4px;
      border-top:1px solid rgba(148,163,184,.25);
      color:#64748b;
      font-size:12px;
      font-weight:800;
      letter-spacing:.06em;
      text-transform:uppercase;
    }
  `;
  document.head.appendChild(style);

  updateMatchActions();
  setTimeout(groupBottomStatuses, 0);
})();
