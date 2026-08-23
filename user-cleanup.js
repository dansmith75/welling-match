// Current Match app users / retired admin UI.
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

    // Admin previously only exposed the manual Excel CSV export. That workflow
    // is retired now Supabase is reconciled automatically by UPDATE-WELLING.
    const retireAdminUi = () => {
      document.getElementById("admin-unlock")?.classList.add("hidden");
      document.getElementById("admin-tools")?.classList.add("hidden");
    };
    retireAdminUi();
    window.addEventListener("load", retireAdminUi, { once: true });
  } catch (error) {
    console.warn("Could not apply user/admin cleanup", error);
  }
})();
