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

    // app.js can subsequently call updateUserUi() during startup/user changes,
    // which used to make Admin visible again for Dan. Keep the retired UI hidden
    // after every future update as well as immediately.
    const coreUpdateUserUi = updateUserUi;
    updateUserUi = function () {
      coreUpdateUserUi();
      retireAdminUi();
    };

    if (typeof renderUserOptions === "function") renderUserOptions();
    updateUserUi();

    window.addEventListener("load", retireAdminUi, { once: true });
  } catch (error) {
    console.warn("Could not apply user/admin cleanup", error);
  }
})();
