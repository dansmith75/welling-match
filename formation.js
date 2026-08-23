// Shared pre-match formation planner.
// Uses the Match squad (Selected/Late), saves centrally in Supabase, and feeds
// the resulting XI directly into Matchday starterIds.
(() => {
  const FORMATIONS = {
    "4-3-3": [
      ["gk", "GK", 50, 91],
      ["lb", "LB", 14, 72], ["lcb", "CB", 38, 76], ["rcb", "CB", 62, 76], ["rb", "RB", 86, 72],
      ["lcm", "CM", 24, 49], ["cm", "CM", 50, 54], ["rcm", "CM", 76, 49],
      ["lw", "LW", 19, 24], ["st", "ST", 50, 17], ["rw", "RW", 81, 24]
    ],
    "4-2-3-1": [
      ["gk", "GK", 50, 91],
      ["lb", "LB", 14, 72], ["lcb", "CB", 38, 76], ["rcb", "CB", 62, 76], ["rb", "RB", 86, 72],
      ["ldm", "DM", 35, 55], ["rdm", "DM", 65, 55],
      ["lam", "AM", 20, 34], ["cam", "AM", 50, 38], ["ram", "AM", 80, 34],
      ["st", "ST", 50, 16]
    ],
    "4-4-2": [
      ["gk", "GK", 50, 91],
      ["lb", "LB", 14, 72], ["lcb", "CB", 38, 76], ["rcb", "CB", 62, 76], ["rb", "RB", 86, 72],
      ["lm", "LM", 15, 47], ["lcm", "CM", 39, 51], ["rcm", "CM", 61, 51], ["rm", "RM", 85, 47],
      ["lst", "ST", 37, 20], ["rst", "ST", 63, 20]
    ],
    "4-1-4-1": [
      ["gk", "GK", 50, 91],
      ["lb", "LB", 14, 72], ["lcb", "CB", 38, 76], ["rcb", "CB", 62, 76], ["rb", "RB", 86, 72],
      ["dm", "DM", 50, 58],
      ["lm", "LM", 15, 39], ["lcm", "CM", 38, 44], ["rcm", "CM", 62, 44], ["rm", "RM", 85, 39],
      ["st", "ST", 50, 17]
    ],
    "3-5-2": [
      ["gk", "GK", 50, 91],
      ["lcb", "CB", 25, 73], ["cb", "CB", 50, 78], ["rcb", "CB", 75, 73],
      ["lwb", "LWB", 10, 48], ["lcm", "CM", 33, 51], ["cm", "CM", 50, 56], ["rcm", "CM", 67, 51], ["rwb", "RWB", 90, 48],
      ["lst", "ST", 38, 20], ["rst", "ST", 62, 20]
    ],
    "3-4-3": [
      ["gk", "GK", 50, 91],
      ["lcb", "CB", 25, 73], ["cb", "CB", 50, 78], ["rcb", "CB", 75, 73],
      ["lm", "LM", 13, 48], ["lcm", "CM", 39, 52], ["rcm", "CM", 61, 52], ["rm", "RM", 87, 48],
      ["lw", "LW", 20, 23], ["st", "ST", 50, 16], ["rw", "RW", 80, 23]
    ],
    "5-3-2": [
      ["gk", "GK", 50, 91],
      ["lwb", "LWB", 8, 65], ["lcb", "CB", 29, 73], ["cb", "CB", 50, 78], ["rcb", "CB", 71, 73], ["rwb", "RWB", 92, 65],
      ["lcm", "CM", 27, 47], ["cm", "CM", 50, 52], ["rcm", "CM", 73, 47],
      ["lst", "ST", 38, 20], ["rst", "ST", 62, 20]
    ]
  };

  let formation = "4-3-3";
  let lineup = {};
  let captainId = null;
  let fixtureId = null;
  let client = null;
  let channel = null;
  let saveTimer = null;
  let pickerSlot = null;
  let lastSnapshot = "";

  const el = {};

  function supabaseClient() {
    if (client) return client;
    if (typeof isSupabaseConfigured !== "function" || !isSupabaseConfigured()) return null;
    client = getSupabaseClient();
    return client;
  }

  function squadIds() {
    try { return attendanceSquadIds(); } catch { return []; }
  }

  function activeFixture() {
    try {
      if (state?.fixtureId) {
        const found = matchdayFixtures.find(item => item.id === state.fixtureId);
        if (found && !found.result && !found.postponed) return found;
      }
      const today = todayAsLocalDate();
      return [...matchdayFixtures]
        .filter(item => !item.result && !item.postponed && String(item.date || "") >= today)
        .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")))[0] ||
        [...matchdayFixtures].filter(item => !item.result && !item.postponed).sort((a,b) => String(a.date || "").localeCompare(String(b.date || "")))[0] || null;
    } catch { return null; }
  }

  function playerById(id) {
    return matchdayPlayers.find(item => item.id === id) || (typeof players !== "undefined" ? players.find(item => item.id === id) : null);
  }

  function playerLabel(id) {
    const p = playerById(id);
    return p?.displayName || id || "";
  }

  function shortName(id) {
    const name = playerLabel(id);
    return name.length > 11 ? `${name.slice(0, 10)}…` : name;
  }

  function assignedIds() {
    return Object.values(lineup).filter(Boolean);
  }

  function cleanLineupForFormation(nextFormation) {
    const slots = FORMATIONS[nextFormation] || FORMATIONS["4-3-3"];
    const oldIds = assignedIds();
    const next = {};

    // First preserve exact slot keys where possible.
    slots.forEach(([key]) => {
      if (lineup[key] && !Object.values(next).includes(lineup[key])) next[key] = lineup[key];
    });

    // Then preserve remaining players in order rather than throwing the XI away.
    const remaining = oldIds.filter(id => !Object.values(next).includes(id));
    slots.forEach(([key]) => {
      if (!next[key] && remaining.length) next[key] = remaining.shift();
    });
    lineup = next;
  }

  function syncToMatchday() {
    try {
      if (!fixtureId) return;
      state.fixtureId = fixtureId;
      state.squadIds = squadIds();
      const ids = assignedIds().filter(id => state.squadIds.includes(id)).slice(0, 11);
      state.starterIds = ids;
      saveState();
      if (state.status === "setup" && typeof renderStarters === "function") renderStarters();
    } catch (error) {
      console.warn("Formation → Matchday sync failed", error);
    }
  }

  function buildUi() {
    const launch = document.createElement("button");
    launch.id = "open-formation";
    launch.className = "matchday-launch hidden";
    launch.type = "button";
    launch.textContent = "Formation";
    md.open?.insertAdjacentElement("beforebegin", launch);
    el.launch = launch;

    const overlay = document.createElement("section");
    overlay.id = "formation-view";
    overlay.className = "formation-overlay hidden";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <div class="formation-card">
        <header class="formation-header">
          <div>
            <p class="eyebrow dark">Welling United Red</p>
            <h2>Formation</h2>
            <p id="formation-fixture" class="formation-fixture">Next fixture</p>
          </div>
          <button id="close-formation" class="small-button" type="button">Close</button>
        </header>

        <div class="formation-toolbar">
          <label>Formation
            <select id="formation-select" class="matchday-select">
              ${Object.keys(FORMATIONS).map(name => `<option value="${name}">${name}</option>`).join("")}
            </select>
          </label>
          <label>Captain
            <select id="formation-captain" class="matchday-select"><option value="">Not set</option></select>
          </label>
        </div>

        <p id="formation-save-state" class="formation-save-state">Shared live formation · changes save automatically</p>

        <div id="formation-pitch" class="formation-pitch" aria-label="Starting eleven formation"></div>

        <section class="formation-subs-section">
          <div class="formation-section-heading">
            <strong>Substitutes</strong>
            <span id="formation-count">0 / 11 selected</span>
          </div>
          <div id="formation-subs" class="formation-subs"></div>
        </section>

        <button id="formation-open-matchday" class="primary-button matchday-wide" type="button">Continue to Matchday</button>
      </div>

      <div id="formation-picker" class="formation-picker hidden" role="dialog" aria-modal="true">
        <div class="formation-picker-card">
          <div class="formation-picker-head">
            <strong id="formation-picker-title">Choose player</strong>
            <button id="formation-picker-close" class="small-button" type="button">Close</button>
          </div>
          <button id="formation-picker-clear" class="formation-player-option formation-clear-option" type="button">Clear position</button>
          <div id="formation-picker-list" class="formation-picker-list"></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    Object.assign(el, {
      view: overlay,
      close: document.getElementById("close-formation"),
      fixture: document.getElementById("formation-fixture"),
      select: document.getElementById("formation-select"),
      captain: document.getElementById("formation-captain"),
      saveState: document.getElementById("formation-save-state"),
      pitch: document.getElementById("formation-pitch"),
      subs: document.getElementById("formation-subs"),
      count: document.getElementById("formation-count"),
      matchday: document.getElementById("formation-open-matchday"),
      picker: document.getElementById("formation-picker"),
      pickerTitle: document.getElementById("formation-picker-title"),
      pickerList: document.getElementById("formation-picker-list"),
      pickerClose: document.getElementById("formation-picker-close"),
      pickerClear: document.getElementById("formation-picker-clear")
    });

    el.launch.addEventListener("click", openFormation);
    el.close.addEventListener("click", closeFormation);
    el.select.addEventListener("change", () => {
      cleanLineupForFormation(el.select.value);
      formation = el.select.value;
      if (captainId && !assignedIds().includes(captainId)) captainId = null;
      render();
      queueSave();
    });
    el.captain.addEventListener("change", () => {
      captainId = el.captain.value || null;
      queueSave();
    });
    el.matchday.addEventListener("click", () => {
      syncToMatchday();
      closeFormation();
      md.open?.click();
    });
    el.pickerClose.addEventListener("click", closePicker);
    el.picker.addEventListener("click", event => { if (event.target === el.picker) closePicker(); });
    el.pickerClear.addEventListener("click", () => {
      if (!pickerSlot) return;
      delete lineup[pickerSlot];
      if (captainId && !assignedIds().includes(captainId)) captainId = null;
      closePicker();
      render();
      queueSave();
    });

    document.querySelectorAll('input[name="session-type"]').forEach(input => {
      input.addEventListener("change", updateLaunch);
    });
    updateLaunch();
  }

  function updateLaunch() {
    const selected = document.querySelector('input[name="session-type"]:checked');
    el.launch?.classList.toggle("hidden", !(selected && selected.value === "Match"));
  }

  function renderPitch() {
    el.pitch.innerHTML = `
      <div class="pitch-halfway"></div>
      <div class="pitch-centre-circle"></div>
      <div class="pitch-box pitch-box-top"></div>
      <div class="pitch-box pitch-box-bottom"></div>
      <div class="pitch-goal pitch-goal-top"></div>
      <div class="pitch-goal pitch-goal-bottom"></div>
    `;

    const slots = FORMATIONS[formation] || FORMATIONS["4-3-3"];
    slots.forEach(([key, label, x, y]) => {
      const id = lineup[key] || "";
      const button = document.createElement("button");
      button.type = "button";
      button.className = `formation-slot${id ? " occupied" : ""}${id === captainId ? " captain" : ""}`;
      button.style.left = `${x}%`;
      button.style.top = `${y}%`;
      button.dataset.slot = key;
      button.innerHTML = `<span class="formation-position">${label}</span><span class="formation-player-name">${id ? shortName(id) : "+ Player"}</span>${id === captainId ? '<span class="formation-captain-badge">C</span>' : ''}`;
      button.addEventListener("click", () => openPicker(key, label));
      el.pitch.appendChild(button);
    });
  }

  function renderSubs() {
    const assigned = new Set(assignedIds());
    const ids = squadIds();
    const subs = ids.filter(id => !assigned.has(id));
    el.subs.innerHTML = "";
    if (!subs.length) {
      el.subs.innerHTML = `<span class="formation-empty">No substitutes</span>`;
    } else {
      subs.forEach(id => {
        const chip = document.createElement("span");
        chip.className = "formation-sub-chip";
        chip.textContent = playerLabel(id);
        el.subs.appendChild(chip);
      });
    }
    el.count.textContent = `${assigned.size} / 11 selected · ${subs.length} sub${subs.length === 1 ? "" : "s"}`;
  }

  function renderCaptain() {
    const ids = assignedIds();
    el.captain.innerHTML = `<option value="">Not set</option>`;
    ids.forEach(id => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = playerLabel(id);
      el.captain.appendChild(option);
    });
    if (captainId && ids.includes(captainId)) el.captain.value = captainId;
    else { captainId = null; el.captain.value = ""; }
  }

  function renderFixture() {
    const f = activeFixture();
    if (!f) {
      el.fixture.textContent = "No upcoming fixture found";
      return;
    }
    fixtureId = f.id;
    state.fixtureId = f.id;
    saveState();
    el.fixture.textContent = `${f.date} · ${f.opposition} · ${f.homeAway || f.venue || ""} · ${f.competition || ""}`;
  }

  function render() {
    el.select.value = formation;
    renderFixture();
    renderPitch();
    renderCaptain();
    renderSubs();
    syncToMatchday();
  }

  function openPicker(slotKey, label) {
    pickerSlot = slotKey;
    el.pickerTitle.textContent = `${label} · Choose player`;
    el.pickerList.innerHTML = "";
    const used = new Set(assignedIds());
    const current = lineup[slotKey];
    if (current) used.delete(current);
    const ids = squadIds().filter(id => !used.has(id));

    ids.forEach(id => {
      const p = playerById(id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `formation-player-option${current === id ? " selected" : ""}`;
      button.innerHTML = `<strong>${playerLabel(id)}</strong>${p?.position ? `<span>${p.position}</span>` : ""}`;
      button.addEventListener("click", () => {
        lineup[slotKey] = id;
        closePicker();
        render();
        queueSave();
      });
      el.pickerList.appendChild(button);
    });

    if (!ids.length) el.pickerList.innerHTML = `<p class="formation-empty">No available squad players.</p>`;
    el.picker.classList.remove("hidden");
  }

  function closePicker() {
    pickerSlot = null;
    el.picker.classList.add("hidden");
  }

  function rowPayload() {
    return {
      fixture_id: fixtureId,
      formation,
      lineup,
      captain_id: captainId,
      updated_by: typeof getCurrentUserName === "function" ? getCurrentUserName() : "Unknown",
      updated_at: new Date().toISOString()
    };
  }

  async function saveShared() {
    if (!fixtureId) return;
    const sb = supabaseClient();
    if (!sb) {
      el.saveState.textContent = "Formation saved on this device only · Supabase unavailable";
      syncToMatchday();
      return;
    }
    el.saveState.textContent = "Saving formation…";
    const payload = rowPayload();
    const { error } = await sb.from("match_formation_selection").upsert(payload, { onConflict: "fixture_id" });
    if (error) {
      console.error("Formation save failed", error);
      el.saveState.textContent = "Could not save formation · try again";
      return;
    }
    lastSnapshot = JSON.stringify({ formation, lineup, captainId });
    el.saveState.textContent = "Shared live formation · saved";
    syncToMatchday();
  }

  function queueSave() {
    clearTimeout(saveTimer);
    el.saveState.textContent = "Saving formation…";
    saveTimer = setTimeout(saveShared, 180);
  }

  async function loadShared(force = false) {
    const f = activeFixture();
    if (!f) return;
    fixtureId = f.id;
    const sb = supabaseClient();
    if (!sb) { render(); return; }
    const { data, error } = await sb
      .from("match_formation_selection")
      .select("formation,lineup,captain_id,updated_by,updated_at")
      .eq("fixture_id", fixtureId)
      .maybeSingle();
    if (error) {
      console.error("Formation load failed", error);
      el.saveState.textContent = "Could not load shared formation";
      render();
      return;
    }
    if (data) {
      const snapshot = JSON.stringify({ formation: data.formation, lineup: data.lineup || {}, captainId: data.captain_id || null });
      if (force || snapshot !== lastSnapshot) {
        formation = FORMATIONS[data.formation] ? data.formation : "4-3-3";
        lineup = data.lineup && typeof data.lineup === "object" ? data.lineup : {};
        captainId = data.captain_id || null;
        lastSnapshot = snapshot;
      }
    }
    render();
  }

  function stopRealtime() {
    if (channel && client) {
      try { client.removeChannel(channel); } catch {}
    }
    channel = null;
  }

  async function startRealtime() {
    stopRealtime();
    const f = activeFixture();
    if (!f) return;
    fixtureId = f.id;
    const sb = supabaseClient();
    if (!sb) return;
    channel = sb
      .channel(`formation-${fixtureId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "match_formation_selection", filter: `fixture_id=eq.${fixtureId}`
      }, () => loadShared(true))
      .subscribe();
  }

  async function openFormation() {
    const f = activeFixture();
    if (!f) return window.alert("No upcoming fixture found.");
    fixtureId = f.id;
    state.fixtureId = f.id;
    saveState();
    el.view.classList.remove("hidden");
    await loadShared(true);
    await startRealtime();
  }

  function closeFormation() {
    el.view.classList.add("hidden");
    closePicker();
    stopRealtime();
    syncToMatchday();
  }

  async function preloadForMatchday() {
    // Keep Matchday's starting XI centrally sourced even if this device never
    // explicitly opens the Formation screen first.
    try { await loadShared(true); } catch {}
  }

  buildUi();

  // matchday.js loads its JSON asynchronously; wait until fixtures exist, then
  // preload the shared formation into starterIds.
  let attempts = 0;
  const boot = setInterval(async () => {
    attempts += 1;
    if (matchdayFixtures.length || attempts > 50) {
      clearInterval(boot);
      renderFixture();
      await preloadForMatchday();
    }
  }, 100);

  // Refresh the shared plan when Match mode is selected, because the shared
  // squad may have changed on another device.
  document.querySelectorAll('input[name="session-type"]').forEach(input => {
    input.addEventListener("change", () => {
      if (input.checked && input.value === "Match") preloadForMatchday();
    });
  });
})();
