// Extend Recent Sessions so completed Matchday sessions appear alongside attendance submissions.
(() => {
  if (typeof getSupabaseClient !== "function" || typeof isSupabaseConfigured !== "function") return;

  const originalLoadSessionDetails = typeof loadSessionDetails === "function" ? loadSessionDetails : null;

  function formatDateTime(value) {
    try { return new Date(value).toLocaleString(); } catch { return String(value || ""); }
  }

  function matchdayScore(payload) {
    let ours = 0;
    let theirs = 0;
    (payload?.events || []).forEach(event => {
      if (event.type === "Goal") ours += 1;
      if (event.type === "Opponent Goal") theirs += 1;
    });
    return `${ours}-${theirs}`;
  }

  async function loadMatchdayDetails(session, targetElement) {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from("matchday_sessions")
        .select("payload, opposition, competition, match_date, submitted_by, created_at")
        .eq("id", session.id)
        .single();
      if (error) throw error;

      const payload = data?.payload || {};
      const title = document.createElement("h3");
      title.textContent = `${data.match_date || session.session_date} - Matchday - ${data.opposition || "Opponent"}`;

      const summary = document.createElement("p");
      summary.className = "detail-summary";
      summary.textContent = `${data.competition || "Match"} · ${matchdayScore(payload)} · ${(payload.playerStats || []).length} players · ${(payload.events || []).length} events`;

      const list = document.createElement("div");
      list.className = "record-list";
      (payload.playerStats || [])
        .slice()
        .sort((a,b) => String(a.displayName || "").localeCompare(String(b.displayName || "")))
        .forEach(player => {
          const row = document.createElement("div");
          row.className = "record-row";
          const name = document.createElement("span");
          name.className = "record-name";
          name.textContent = player.displayName || player.playerId || "Player";
          const status = document.createElement("span");
          status.className = "record-status";
          status.textContent = `${Number(player.minutesPlayed || 0)} min`;
          row.append(name, status);
          list.appendChild(row);
        });

      targetElement.innerHTML = "";
      targetElement.append(title, summary, list);
    } catch (error) {
      console.error(error);
      targetElement.innerHTML = '<p class="sessions-status error">Could not load Matchday details.</p>';
    }
  }

  window.loadRecentSessions = async function () {
    if (!isSupabaseConfigured()) {
      sessionsListElement.innerHTML = "";
      sessionDetailsElement.innerHTML = "";
      setSessionsStatus("Supabase is not configured, so recent sessions cannot be loaded.");
      return;
    }

    setSessionsStatus("Loading recent sessions...");
    sessionsListElement.innerHTML = "";
    sessionDetailsElement.innerHTML = "";
    expandedSessionId = null;

    try {
      const client = getSupabaseClient();
      const [attendanceResult, matchdayResult] = await Promise.all([
        client.from("attendance_sessions")
          .select("id, session_date, session_type, venue, submitted_by, submitted_at")
          .order("submitted_at", { ascending:false })
          .limit(10),
        client.from("matchday_sessions")
          .select("id, match_date, opposition, competition, submitted_by, created_at, payload")
          .order("created_at", { ascending:false })
          .limit(10)
      ]);

      if (attendanceResult.error) throw attendanceResult.error;
      if (matchdayResult.error) throw matchdayResult.error;

      const attendance = (attendanceResult.data || []).map(item => ({ ...item, source:"attendance" }));
      const matchdays = (matchdayResult.data || []).map(item => ({
        id:item.id,
        source:"matchday",
        session_date:item.match_date,
        session_type:"Matchday",
        venue:item.payload?.fixture?.venue || null,
        submitted_by:item.submitted_by,
        submitted_at:item.created_at,
        opposition:item.opposition,
        competition:item.competition,
        payload:item.payload
      }));

      const sessions = [...attendance, ...matchdays]
        .sort((a,b) => new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0))
        .slice(0, 12);

      if (!sessions.length) {
        setSessionsStatus("No submitted sessions found yet.");
        return;
      }

      setSessionsStatus("Tap a session to view the records.");

      sessions.forEach(session => {
        const sessionItem = document.createElement("div");
        sessionItem.className = "session-item";

        const button = document.createElement("button");
        button.className = "session-row";
        button.type = "button";
        button.dataset.sessionId = session.id;
        button.setAttribute("aria-expanded", "false");

        const title = document.createElement("span");
        title.className = "session-row-title";
        title.textContent = session.source === "matchday"
          ? `${session.session_date} - Matchday - ${session.opposition || "Opponent"}`
          : formatSessionTitle(session);

        const meta = document.createElement("span");
        meta.className = "session-row-meta";
        const submittedBy = session.submitted_by ? ` by ${session.submitted_by}` : "";
        meta.textContent = `Submitted${submittedBy} · ${formatDateTime(session.submitted_at)}`;

        const details = document.createElement("div");
        details.className = "session-details inline hidden";
        details.id = `session-details-${session.id}`;

        button.append(title, meta);
        button.addEventListener("click", async () => {
          if (expandedSessionId === session.id && !details.classList.contains("hidden")) {
            collapseExpandedSession();
            return;
          }
          collapseExpandedSession();
          expandedSessionId = session.id;
          button.classList.add("selected");
          button.setAttribute("aria-expanded", "true");
          details.classList.remove("hidden");
          details.innerHTML = '<p class="sessions-status">Loading...</p>';
          if (session.source === "matchday") await loadMatchdayDetails(session, details);
          else if (originalLoadSessionDetails) await originalLoadSessionDetails(session, details);
        });

        sessionItem.append(button, details);
        sessionsListElement.appendChild(sessionItem);
      });
    } catch (error) {
      console.error(error);
      setSessionsStatus("Could not load recent sessions. Check Supabase settings or policies.");
    }
  };
})();