// Shared Match squad selector.
// Training remains the normal local attendance workflow. Match selections are
// stored immediately in Supabase so managers see the same squad on every device.
// Backend status stays "Present" for a normal Selected player so Matchday / Excel
// reconciliation remains compatible.
(() => {
  const coreRenderPlayers = renderPlayers;
  const coreUpdateSummary = updateSummary;
  const coreSetPlayerStatus = setPlayerStatus;
  const coreClearSession = clearSession;

  const ALL_MATCH_STATUSES = ["Present", "Late", "No Show", "Unavailable", "Injured", "Rotated"];
  const BOTTOM_STATUSES = new Set(["Unavailable", "Injured", "Rotated"]);
  const SQUAD_STATUSES = new Set(["Present", "Late"]);

  let sharedFixture = null;
  let sharedClient = null;
  let realtimeChannel = null;
  let refreshTimer = null;
  let loadingShared = false;
  let lastSharedSnapshot = "";

  function matchStatus(playerId) {
    const status = getPlayerStatusForCurrentSession(playerId);
    return ALL_MATCH_STATUSES.includes(status) ? status : "";
  }

  function formatFixtureDate(value) {
    if (!value) return "";
    const parts = String(value).slice(0, 10).split("-");
    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : value;
  }

  async function resolveSharedFixture() {
    try {
      const url = window.WELLING_APP_CONFIG?.dashboardMatchesUrl || "matches.json";
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`Fixtures ${response.status}`);
      const matches = await response.json();
      const today = todayAsLocalDate();
      const unplayed = (Array.isArray(matches) ? matches : [])
        .filter(match => !match.postponed && !match.result)
        .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
      sharedFixture = unplayed.find(match => String(match.date || "") >= today) || unplayed[0] || null;
      renderSharedFixtureBanner();
      return sharedFixture;
    } catch (error) {
      console.error("Could not resolve shared Match fixture", error);
      sharedFixture = null;
      renderSharedFixtureBanner();
      return null;
    }
  }

  function ensureSharedClient() {
    if (sharedClient) return sharedClient;
    if (!isSupabaseConfigured()) return null;
    sharedClient = getSupabaseClient();
    return sharedClient;
  }

  function renderSharedFixtureBanner(message = "") {
    let banner = document.getElementById("shared-squad-fixture");
    if (!banner) {
      banner = document.createElement("section");
      banner.id = "shared-squad-fixture";
      banner.className = "shared-squad-fixture hidden";
      document.querySelector(".summary-bar")?.insertAdjacentElement("afterend", banner);
    }

    if (!isMatch()) {
      banner.classList.add("hidden");
      return;
    }

    banner.classList.remove("hidden");
    if (message) {
      banner.innerHTML = `<strong>Match squad</strong><span>${message}</span>`;
      return;
    }
    if (!sharedFixture) {
      banner.innerHTML = `<strong>Match squad</strong><span>No upcoming fixture found</span>`;
      return;
    }

    banner.innerHTML = `
      <strong>${sharedFixture.opposition || "Next Match"}</strong>
      <span>${formatFixtureDate(sharedFixture.date)} · ${sharedFixture.homeAway || sharedFixture.venue || ""} · ${sharedFixture.competition || ""}</span>
      <small>Shared live squad · changes save automatically</small>
    `;
  }

  async function loadSharedSquad(force = false) {
    if (!isMatch() || loadingShared) return;
    if (!sharedFixture) await resolveSharedFixture();
    if (!sharedFixture) return;
    const client = ensureSharedClient();
    if (!client) {
      renderSharedFixtureBanner("Supabase is not configured");
      return;
    }

    loadingShared = true;
    try {
      const { data, error } = await client
        .from("match_squad_selection")
        .select("player_id, display_name, status, updated_by, updated_at")
        .eq("fixture_id", sharedFixture.id)
        .order("display_name", { ascending: true });
      if (error) throw error;

      const snapshot = JSON.stringify(data || []);
      if (!force && snapshot === lastSharedSnapshot) return;
      lastSharedSnapshot = snapshot;

      attendance = {};
      (data || []).forEach(row => {
        if (ALL_MATCH_STATUSES.includes(row.status)) attendance[row.player_id] = row.status;
      });
      renderPlayers();
      updateSummary();
      renderSharedFixtureBanner();
    } catch (error) {
      console.error("Shared squad load failed", error);
      renderSharedFixtureBanner("Could not load shared squad — check connection");
    } finally {
      loadingShared = false;
    }
  }

  async function saveSharedStatus(playerId, status) {
    if (!sharedFixture) await resolveSharedFixture();
    if (!sharedFixture) throw new Error("No upcoming fixture available");
    const client = ensureSharedClient();
    if (!client) throw new Error("Supabase is not configured");

    const player = players.find(item => item.id === playerId);
    if (!player) throw new Error("Player not found");

    if (!status) {
      const { error } = await client
        .from("match_squad_selection")
        .delete()
        .eq("fixture_id", sharedFixture.id)
        .eq("player_id", playerId);
      if (error) throw error;
      return;
    }

    const { error } = await client
      .from("match_squad_selection")
      .upsert({
        fixture_id: sharedFixture.id,
        player_id: playerId,
        display_name: player.displayName,
        status,
        updated_by: getCurrentUserName(),
        updated_at: new Date().toISOString()
      }, { onConflict: "fixture_id,player_id" });
    if (error) throw error;
  }

  function selectedCount() {
    return players.filter(player => SQUAD_STATUSES.has(matchStatus(player.id))).length;
  }

  async function setSharedPlayerStatus(playerId, requestedStatus) {
    const current = matchStatus(playerId);
    let next = current;

    if (requestedStatus === "Present") {
      if (current === "Present" || current === "Late" || current === "No Show") {
        next = "";
      } else {
        if (selectedCount() >= 16) {
          window.alert("Match squad is limited to 16 selected players.");
          return;
        }
        next = "Present";
      }
    } else if (requestedStatus === "Late" || requestedStatus === "No Show") {
      if (!["Present", "Late", "No Show"].includes(current)) return;
      next = current === requestedStatus ? "Present" : requestedStatus;
    } else if (BOTTOM_STATUSES.has(requestedStatus)) {
      next = current === requestedStatus ? "" : requestedStatus;
    }

    const before = current;
    if (next) attendance[playerId] = next;
    else delete attendance[playerId];
    renderPlayers();
    updateSummary();

    try {
      await saveSharedStatus(playerId, next);
      lastSharedSnapshot = "";
    } catch (error) {
      console.error("Shared squad save failed", error);
      if (before) attendance[playerId] = before;
      else delete attendance[playerId];
      renderPlayers();
      updateSummary();
      window.alert("Could not save that squad change. Please check your connection and try again.");
    }
  }

  setPlayerStatus = function (playerId, status) {
    if (!isMatch()) return coreSetPlayerStatus(playerId, status);
    return setSharedPlayerStatus(playerId, status);
  };

  function addStatusButton(grid, player, status, label, current) {
    const button = document.createElement("button");
    button.className = `status-button status-${status.toLowerCase().replace(/\s+/g, "-")}`;
    button.type = "button";
    button.textContent = label || status;
    if (current === status) button.classList.add("selected");
    button.addEventListener("click", () => setPlayerStatus(player.id, status));
    grid.appendChild(button);
  }

  renderPlayers = function () {
    if (!isMatch()) return coreRenderPlayers();

    playerListElement.innerHTML = "";
    const orderedPlayers = players
      .map((player, index) => ({ player, index }))
      .sort((a, b) => {
        const aBottom = BOTTOM_STATUSES.has(matchStatus(a.player.id)) ? 1 : 0;
        const bBottom = BOTTOM_STATUSES.has(matchStatus(b.player.id)) ? 1 : 0;
        return aBottom - bBottom || a.index - b.index;
      })
      .map(item => item.player);

    orderedPlayers.forEach(player => {
      const current = matchStatus(player.id);
      const bottom = BOTTOM_STATUSES.has(current);
      const selectedFamily = ["Present", "Late", "No Show"].includes(current);

      const card = document.createElement("article");
      card.className = `player-card${selectedFamily ? " shared-selected-player" : ""}${bottom ? " shared-bottom-player" : ""}`;

      const name = document.createElement("div");
      name.className = "player-name";
      name.textContent = player.displayName;

      const buttonGrid = document.createElement("div");
      buttonGrid.className = "status-buttons shared-squad-buttons";

      if (bottom) {
        buttonGrid.style.setProperty("--button-count", 1);
        buttonGrid.classList.add("button-count-1");
        addStatusButton(buttonGrid, player, current, current, current);
      } else if (selectedFamily) {
        buttonGrid.style.setProperty("--button-count", 3);
        buttonGrid.classList.add("button-count-3");
        addStatusButton(buttonGrid, player, "Present", "Selected", current);
        addStatusButton(buttonGrid, player, "Late", "Late", current);
        addStatusButton(buttonGrid, player, "No Show", "No Show", current);
      } else {
        buttonGrid.style.setProperty("--button-count", 4);
        buttonGrid.classList.add("button-count-4");
        addStatusButton(buttonGrid, player, "Present", "Selected", current);
        addStatusButton(buttonGrid, player, "Injured", "Injured", current);
        addStatusButton(buttonGrid, player, "Unavailable", "Unavailable", current);
        addStatusButton(buttonGrid, player, "Rotated", "Rotated", current);
      }

      card.appendChild(name);
      card.appendChild(buttonGrid);
      playerListElement.appendChild(card);
    });
  };

  updateSummary = function () {
    if (!isMatch()) return coreUpdateSummary();
    const count = selectedCount();
    summaryTotalElement.textContent = `${players.length} players`;
    summaryPresentElement.textContent = `${count} selected`;
    summaryMissingElement.textContent = `${players.length - count} not selected`;
    renderSharedFixtureBanner();
  };

  clearSession = function () {
    if (!isMatch()) return coreClearSession();
    window.alert("Match selections are shared. Toggle a player's current status to clear it.");
  };

  function stopSharedSync() {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
    if (realtimeChannel && sharedClient) {
      try { sharedClient.removeChannel(realtimeChannel); } catch (_) {}
      realtimeChannel = null;
    }
  }

  async function startSharedSync() {
    stopSharedSync();
    if (!isMatch()) {
      renderSharedFixtureBanner();
      return;
    }
    await resolveSharedFixture();
    await loadSharedSquad(true);
    const client = ensureSharedClient();
    if (client && sharedFixture) {
      try {
        realtimeChannel = client
          .channel(`match-squad-${sharedFixture.id}`)
          .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "match_squad_selection",
            filter: `fixture_id=eq.${sharedFixture.id}`
          }, () => loadSharedSquad(true))
          .subscribe();
      } catch (error) {
        console.warn("Realtime squad sync unavailable; polling will continue", error);
      }
    }
    refreshTimer = setInterval(() => loadSharedSquad(false), 5000);
  }

  sessionTypeElements.forEach(element => {
    element.addEventListener("change", () => {
      if (element.checked && element.value === "Match") startSharedSync();
      if (element.checked && element.value === "Training") {
        stopSharedSync();
        renderSharedFixtureBanner();
      }
    });
  });

  document.querySelectorAll(".matchday-help").forEach(element => {
    element.textContent = element.textContent.replace(
      "Players marked Present or Late on the Match attendance screen are included automatically.",
      "Players marked Selected or Late on the Match attendance screen are included automatically."
    );
  });

  const style = document.createElement("style");
  style.textContent = `
    .shared-squad-fixture{margin:0 0 14px;padding:13px 16px;border:1px solid rgba(59,130,246,.28);border-radius:14px;background:rgba(37,99,235,.08);display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
    .shared-squad-fixture.hidden{display:none}
    .shared-squad-fixture strong{font-size:16px}.shared-squad-fixture span{color:var(--muted,#64748b)}.shared-squad-fixture small{margin-left:auto;color:var(--muted,#64748b)}
    .shared-squad-buttons.button-count-1{grid-template-columns:1fr}
    .shared-squad-buttons.button-count-3{grid-template-columns:repeat(3,minmax(0,1fr))}
    .shared-squad-buttons.button-count-4{grid-template-columns:repeat(4,minmax(0,1fr))}
    @media(max-width:640px){
      .shared-squad-fixture{align-items:flex-start;flex-direction:column;gap:4px}.shared-squad-fixture small{margin-left:0}
      .shared-squad-buttons.button-count-3{grid-template-columns:repeat(3,minmax(0,1fr))}
      .shared-squad-buttons.button-count-4{grid-template-columns:repeat(2,minmax(0,1fr))}
    }
  `;
  document.head.appendChild(style);

  let bootAttempts = 0;
  const boot = setInterval(() => {
    bootAttempts += 1;
    if (players.length || bootAttempts > 40) {
      clearInterval(boot);
      if (isMatch()) startSharedSync();
      else renderSharedFixtureBanner();
    }
  }, 100);
})();
