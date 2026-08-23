// Current Match app users. Keep this as a small UI/data override so the core
// attendance code can stay unchanged.
(() => {
  try {
    const index = APP_USERS.findIndex(user => user?.name === "Ryan");
    if (index >= 0) APP_USERS.splice(index, 1);

    if (localStorage.getItem(USER_STORAGE_KEY) === "Ryan") {
      localStorage.removeItem(USER_STORAGE_KEY);
      currentUser = null;
    }

    if (typeof renderUserOptions === "function") renderUserOptions();
    if (typeof updateUserUi === "function") updateUserUi();
  } catch (error) {
    console.warn("Could not apply user cleanup", error);
  }
})();
