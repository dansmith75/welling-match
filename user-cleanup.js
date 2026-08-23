// Current Match app users / retired admin UI.
(() => {
  try {
    const index = APP_USERS.findIndex(user => user?.name === "Ryan");
    if (index >= 0) APP_USERS.splice(index, 1);

    if (localStorage.getItem(USER_STORAGE_KEY) === "Ryan") {
      localStorage.removeItem(USER_STORAGE_KEY);
      currentUser = null;
    }

    const retireAdminUi = () => {
      if (adminUnlockButton) {
        adminUnlockButton.classList.add("hidden");
        adminUnlockButton.style.setProperty("display", "none", "important");
      }
      if (adminToolsElement) {
        adminToolsElement.classList.add("hidden");
        adminToolsElement.style.setProperty("display", "none", "important");
      }
    };

    const ensureFormationUi = () => {
      if (!document.querySelector('link[data-formation-css]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "formation.css";
        link.dataset.formationCss = "true";
        document.head.appendChild(link);
      }

      const formationButton = document.getElementById("open-formation");
      const selected = document.querySelector('input[name="session-type"]:checked');
      if (formationButton) {
        const show = selected && selected.value === "Match";
        formationButton.classList.toggle("hidden", !show);
        formationButton.style.setProperty("display", show ? "inline-flex" : "none", "important");
      }
    };

    // app.js can subsequently call updateUserUi() during startup/user changes,
    // which used to make Admin visible again for Dan. Keep the retired UI hidden
    // after every future update as well as immediately.
    const coreUpdateUserUi = updateUserUi;
    updateUserUi = function () {
      coreUpdateUserUi();
      retireAdminUi();
      ensureFormationUi();
    };

    if (typeof renderUserOptions === "function") renderUserOptions();
    updateUserUi();

    document.querySelectorAll('input[name="session-type"]').forEach(input => {
      input.addEventListener("change", () => setTimeout(ensureFormationUi, 0));
    });

    window.addEventListener("load", () => {
      retireAdminUi();
      // formation.js runs later in the page; give it a moment to create its button.
      setTimeout(ensureFormationUi, 0);
      setTimeout(ensureFormationUi, 250);
    }, { once: true });
  } catch (error) {
    console.warn("Could not apply user/admin cleanup", error);
  }
})();
