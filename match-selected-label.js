// Match attendance wording only: keep stored/backend status as "Present"
// for compatibility, but show managers "Selected" in the Match UI.
(() => {
  const coreRenderPlayers = renderPlayers;
  const coreUpdateSummary = updateSummary;

  renderPlayers = function () {
    coreRenderPlayers();
    if (!isMatch()) return;

    document.querySelectorAll('.status-button').forEach((button) => {
      if (button.textContent.trim() === 'Present') {
        button.textContent = 'Selected';
        button.setAttribute('aria-label', 'Selected');
      }
    });
  };

  updateSummary = function () {
    coreUpdateSummary();
    if (!isMatch()) return;

    const summary = document.getElementById('summary-present');
    if (summary) {
      summary.textContent = summary.textContent.replace(/present/i, 'selected');
    }
  };

  // Update the Matchday help copy without changing the underlying attendance values.
  document.querySelectorAll('.matchday-help').forEach((element) => {
    element.textContent = element.textContent.replace(
      'Players marked Present or Late on the Match attendance screen are included automatically.',
      'Players marked Selected or Late on the Match attendance screen are included automatically.'
    );
  });

  // Re-render once so the current screen picks up the new wording immediately.
  try {
    renderPlayers();
    updateSummary();
  } catch (_) {
    // app.js will render normally during startup if data is not ready yet.
  }
})();
