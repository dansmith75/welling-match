// Current Match app users. Keep this as a small UI/data override so the core
// attendance code can stay unchanged.
(() => {
  try {
    const index = APP_USERS.findIndex(user => user?.name === "Ryan");
    if (index >= 0) APP_USERS.splice(index, 1);

    // If this device had Ryan saved from an older version, force user selection
    // rather than silently continuing as a removed user.
    if (localStorage.getItem(USER_STORAGE_KEY) === "Ryan") {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch (error) {
    console.warn("Could not apply user cleanup", error);
  }
})();
