// Matchday v4 live flow: two primary actions under the timer, full-screen goal/sub flows,
// compact events, and one editable chronological timeline.
(() => {
  if (typeof state === "undefined" || typeof md === "undefined") return;

  const style = document.createElement("style");
  style.textContent = `
    .md4-primary-actions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0}
    .md4-primary-action{min-height:76px;border:0;border-radius:16px;font-size:1.18rem;font-weight:950;color:#fff;box-shadow:0 6px 16px rgba(17,24,39,.14)}
    .md4-goal{background:#15803d}.md4-subs{background:#2563eb}
    .md4-section{margin-top:18px;padding-top:16px;border-top:1px solid var(--border)}
    .md4-section h3{margin:0 0 10px}.md4-event-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .md4-event-actions button{min-height:52px}
    .md4-overlay{position:fixed;inset:0;z-index:11000;background:var(--bg,#f4f5f7);overflow:auto;padding:0}
    .md4-overlay.hidden{display:none}.md4-page{width:min(100%,760px);margin:0 auto;padding:0 16px 28px}
    .md4-page-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 -16px 16px;padding:16px;background:var(--primary,#c8102e);color:white}
    .md4-page-head h2{margin:0;font-size:1.3rem}.md4-page-head button{background:white;color:#111}
    .md4-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .md4-player{min-height:58px;border:1px solid var(--border);border-radius:13px;background:white;font-weight:900;padding:10px}
    .md4-player.selected{border-color:var(--primary);background:rgba(200,16,46,.08);color:var(--primary)}
    .md4-sub-bulk{width:100%;min-height:62px;margin-bottom:14px;border:0;border-radius:14px;background:#111827;color:#fff;font-weight:950;font-size:1.05rem}
    .md4-card{background:white;border:1px solid var(--border);border-radius:14px;padding:13px;margin:10px 0}
    .md4-card h3,.md4-card p{margin-top:0}.md4-field{display:grid;gap:6px;margin-top:12px;font-weight:900}.md4-field input,.md4-field select,.md4-field textarea{width:100%;font-size:16px;border:1px solid var(--border);border-radius:11px;padding:12px;background:white}
    .md4-type-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}.md4-type-row button{min-height:48px}.md4-type-row button.selected{background:var(--primary);color:white;border-color:var(--primary)}
    .md4-save{width:100%;min-height:54px;margin-top:14px;border:0;border-radius:13px;background:var(--primary);color:#fff;font-weight:950}
    .md4-timeline{display:grid;gap:8px}.md4-timeline-row{display:grid;grid-template-columns:48px 1fr auto;gap:9px;align-items:center;background:#f3f4f6;border-radius:11px;padding:10px}
    .md4-timeline-minute{font-weight:950;color:var(--muted)}.md4-timeline-text{font-weight:800;min-width:0}.md4-edit{border:1px solid var(--border);background:white;border-radius:9px;padding:8px 10px;font-weight:900}
    .md4-empty{color:var(--muted);font-size:.9rem}.md4-bulk-row{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end;margin:8px 0}.md4-bulk-row select{width:100%;font-size:16px;border:1px solid var(--border);border-radius:11px;padding:11px;background:white}
    .md4-score-summary{font-weight:900;margin:0 0 12px}.md4-back{margin-bottom:12px}
    @media(max-width:520px){.md4-grid{grid-template-columns:1fr 1fr}.md4-event-actions{grid-template-columns:1fr 1fr 1fr}.md4-bulk-row{grid-template-columns:1fr 1fr}.md4-bulk-row .md4-remove{grid-column:1/-1}.md4-primary-action{min-height:72px}}
  `;
  document.head.appendChild(style);

  const oldSubSection = md.subList?.closest(".matchday-live-section");
  const oldEventSection = md.goalPlayer?.closest(".matchday-live-section");
  const oldLineupSection = md.lineup?.closest(".matchday-live-section");
  if (oldSubSection) oldSubSection.classList.add("hidden");
  if (oldEventSection) oldEventSection.classList.add("hidden");
  if (oldLineupSection) oldLineupSection.classList.add("hidden");

  const host = document.createElement("div");
  host.id = "matchday-v4-flow";
  host.innerHTML = `
    <div class="md4-primary-actions">
      <button type="button" class="md4-primary-action md4-goal" id="md4-goal">⚽ Goal</button>
      <button type="button" class="md4-primary-action md4-subs" id="md4-subs">🔄 Subs</button>
    </div>
    <section class="md4-section"><h3>Events</h3><div class="md4-event-actions">
      <button type="button" class="secondary-button" data-md4-event="Yellow">🟨 Yellow</button>
      <button type="button" class="secondary-button" data-md4-event="Red">🟥 Red</button>
      <button type="button" class="secondary-button" data-md4-event="Note">📝 Event</button>
    </div></section>
    <section class="md4-section"><h3>Timeline</h3><div class="md4-timeline" id="md4-timeline"></div></section>`;
  const liveActions = md.pause?.closest(".matchday-live-actions");
  if (liveActions) liveActions.insertAdjacentElement("afterend", host);

  function overlay(id, title) {
    const node = document.createElement("div");
    node.id = id;
    node.className = "md4-overlay hidden";
    node.innerHTML = `<div class="md4-page"><div class="md4-page-head"><h2>${title}</h2><button type="button" class="small-button md4-close">Close</button></div><div class="md4-body"></div></div>`;
    document.body.appendChild(node);
    node.querySelector(".md4-close").addEventListener("click", () => node.classList.add("hidden"));
    return node;
  }

  const goalView = overlay("md4-goal-view", "Goal");
  const subView = overlay("md4-sub-view", "Substitutions");
  const eventView = overlay("md4-event-view", "Event");

  const currentMinute = () => Math.max(0, Math.floor(typeof matchMinute === "function" ? matchMinute() : 0));
  const stamp = () => new Date().toISOString();
  const buttonForPlayer = (id, click) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "md4-player"; b.textContent = playerName(id); b.addEventListener("click", click); return b;
  };

  // GOAL: scorer first, then details.
  function openGoal() {
    const body = goalView.querySelector(".md4-body");
    body.innerHTML = `<p class="md4-score-summary">${currentMinute()}' · Who scored?</p><div class="md4-grid"></div>`;
    const grid = body.querySelector(".md4-grid");
    (state.lineupIds.length ? state.lineupIds : state.squadIds).forEach(id => grid.appendChild(buttonForPlayer(id, () => goalDetails(id))));
    goalView.classList.remove("hidden");
  }

  function goalDetails(scorer) {
    const body = goalView.querySelector(".md4-body");
    const minute = currentMinute();
    body.innerHTML = `<button type="button" class="small-button md4-back">← Change scorer</button>
      <div class="md4-card"><h3>${playerName(scorer)}</h3><p>${minute}'</p>
      <div class="md4-type-row"><button type="button" class="secondary-button selected" data-type="Open Play">Open Play</button><button type="button" class="secondary-button" data-type="Penalty">Penalty</button></div>
      <label class="md4-field">Minute<input id="md4-goal-minute" type="number" min="0" step="1" value="${minute}"></label>
      <div id="md4-assist-wrap"><h3 style="margin-top:16px">Assist</h3><div class="md4-grid" id="md4-assists"></div><button type="button" class="secondary-button matchday-wide" id="md4-no-assist">No assist / unknown</button></div>
      <button type="button" class="md4-save" id="md4-save-goal">Save Goal</button></div>`;
    body.querySelector(".md4-back").addEventListener("click", openGoal);
    let goalType = "Open Play";
    let assistId = "";
    const assistGrid = body.querySelector("#md4-assists");
    state.squadIds.filter(id => id !== scorer).forEach(id => assistGrid.appendChild(buttonForPlayer(id, e => {
      assistId = id;
      assistGrid.querySelectorAll("button").forEach(x => x.classList.remove("selected"));
      e.currentTarget.classList.add("selected");
    })));
    body.querySelector("#md4-no-assist").addEventListener("click", () => { assistId = ""; assistGrid.querySelectorAll("button").forEach(x => x.classList.remove("selected")); });
    body.querySelectorAll("[data-type]").forEach(btn => btn.addEventListener("click", e => {
      goalType = e.currentTarget.dataset.type;
      body.querySelectorAll("[data-type]").forEach(x => x.classList.toggle("selected", x === e.currentTarget));
      body.querySelector("#md4-assist-wrap").classList.toggle("hidden", goalType !== "Open Play");
      if (goalType !== "Open Play") assistId = "";
    }));
    body.querySelector("#md4-save-goal").addEventListener("click", () => {
      const m = Math.max(0, Math.floor(Number(body.querySelector("#md4-goal-minute").value) || minute));
      const event = { type:"Goal", playerId:scorer, minute:m, goalType, recordedAt:stamp() };
      if (goalType === "Open Play" && assistId) event.assistPlayerId = assistId;
      state.events.push(event); saveState(); renderLive(); saveRecovery("goal-v4"); goalView.classList.add("hidden");
    });
  }

  // SUBS: bulk at top, then individual players currently on pitch.
  function openSubs() {
    const body = subView.querySelector(".md4-body");
    body.innerHTML = `<button type="button" class="md4-sub-bulk">Bulk substitutions</button><h3>Individual substitution</h3><p class="matchday-help">Tap the player coming off.</p><div class="md4-grid"></div>`;
    body.querySelector(".md4-sub-bulk").addEventListener("click", openBulk);
    const grid = body.querySelector(".md4-grid");
    state.lineupIds.forEach(id => grid.appendChild(buttonForPlayer(id, () => individualSub(id))));
    subView.classList.remove("hidden");
  }

  function individualSub(off) {
    const body = subView.querySelector(".md4-body");
    const minute = currentMinute();
    body.innerHTML = `<button type="button" class="small-button md4-back">← Player off</button><div class="md4-card"><h3>${playerName(off)} OFF</h3><p>Choose player coming on</p><div class="md4-grid"></div><label class="md4-field">Minute<input id="md4-sub-minute" type="number" min="0" value="${minute}"></label></div>`;
    body.querySelector(".md4-back").addEventListener("click", openSubs);
    const grid = body.querySelector(".md4-grid");
    state.squadIds.filter(id => !state.lineupIds.includes(id)).forEach(on => grid.appendChild(buttonForPlayer(on, () => commitIndividualSub(off,on,Number(body.querySelector("#md4-sub-minute").value)))));
  }

  function commitIndividualSub(off,on,minuteValue) {
    const minute = Math.max(0, Math.floor(Number(minuteValue) || currentMinute()));
    const second = Math.min(Math.max(0, minute * 60), Math.round(elapsedSeconds()));
    if (!closeInterval(off, second)) return alert("That substitution time is before the player's current spell.");
    openInterval(on, second);
    state.lineupIds = state.lineupIds.filter(id => id !== off); state.lineupIds.push(on);
    state.substitutions.push({ minute:Math.floor(second/60), second, off, on, recordedAt:stamp() });
    saveState(); renderLive(); saveRecovery("sub-v4"); subView.classList.add("hidden");
  }

  function selectOptions(ids, prompt) { return `<option value="">${prompt}</option>` + ids.map(id => `<option value="${id}">${playerName(id)}</option>`).join(""); }
  function addBulkRow(list) {
    const row = document.createElement("div"); row.className = "md4-bulk-row";
    row.innerHTML = `<label>OFF<select class="md4-off">${selectOptions(state.lineupIds,"Player off")}</select></label><label>ON<select class="md4-on">${selectOptions(state.squadIds.filter(id=>!state.lineupIds.includes(id)),"Player on")}</select></label><button type="button" class="small-button md4-remove">Remove</button>`;
    row.querySelector(".md4-remove").addEventListener("click",()=>row.remove()); list.appendChild(row);
  }
  function openBulk() {
    const body = subView.querySelector(".md4-body"); const minute=currentMinute();
    body.innerHTML = `<button type="button" class="small-button md4-back">← Subs</button><div class="md4-card"><h3>Bulk substitutions</h3><p>All changes use the same time.</p><div id="md4-bulk-list"></div><button type="button" class="secondary-button matchday-wide" id="md4-add-row">+ Add swap</button><label class="md4-field">Minute<input id="md4-bulk-minute" type="number" min="0" value="${minute}"></label><button type="button" class="md4-save" id="md4-save-bulk">Confirm Subs</button></div>`;
    body.querySelector(".md4-back").addEventListener("click",openSubs); const list=body.querySelector("#md4-bulk-list"); addBulkRow(list); addBulkRow(list); addBulkRow(list);
    body.querySelector("#md4-add-row").addEventListener("click",()=>addBulkRow(list)); body.querySelector("#md4-save-bulk").addEventListener("click",()=>commitBulk(list, Number(body.querySelector("#md4-bulk-minute").value)));
  }
  function commitBulk(list,minuteValue) {
    const pairs=[...list.querySelectorAll(".md4-bulk-row")].map(r=>({off:r.querySelector(".md4-off").value,on:r.querySelector(".md4-on").value})).filter(x=>x.off||x.on);
    if(!pairs.length||pairs.some(x=>!x.off||!x.on||x.off===x.on)) return alert("Complete each OFF / ON pair.");
    if(new Set(pairs.map(x=>x.off)).size!==pairs.length||new Set(pairs.map(x=>x.on)).size!==pairs.length) return alert("Each player can only be used once.");
    const minute=Math.max(0,Math.floor(Number(minuteValue)||currentMinute())); const second=Math.min(minute*60,Math.round(elapsedSeconds())); const proposed=[...state.lineupIds]; const at=stamp();
    for(const pair of pairs){ if(!proposed.includes(pair.off)||proposed.includes(pair.on)) return alert("One of those swaps is no longer valid."); const current=[...(state.intervals[pair.off]||[])].reverse().find(i=>i.end===null); if(!current||second<current.start) return alert(`Cannot take ${playerName(pair.off)} off at that time.`); current.end=second; openInterval(pair.on,second); proposed.splice(proposed.indexOf(pair.off),1,pair.on); state.substitutions.push({minute:Math.floor(second/60),second,off:pair.off,on:pair.on,recordedAt:at,bulk:true}); }
    state.lineupIds=proposed; saveState(); renderLive(); saveRecovery("bulk-sub-v4"); subView.classList.add("hidden");
  }

  // EVENTS.
  function openEvent(type) {
    const body=eventView.querySelector(".md4-body"); const minute=currentMinute();
    body.innerHTML=`<p class="md4-score-summary">${type === "Note" ? "Event" : type + " card"} · ${minute}'</p><p class="matchday-help">Choose player.</p><div class="md4-grid"></div>`;
    const grid=body.querySelector(".md4-grid"); state.squadIds.forEach(id=>grid.appendChild(buttonForPlayer(id,()=>eventDetails(type,id)))); eventView.classList.remove("hidden");
  }
  function eventDetails(type,pid){ const body=eventView.querySelector(".md4-body"); const minute=currentMinute(); body.innerHTML=`<button type="button" class="small-button md4-back">← Change player</button><div class="md4-card"><h3>${playerName(pid)}</h3>${type==="Note"?`<label class="md4-field">What happened?<textarea id="md4-event-text" rows="3"></textarea></label>`:""}<label class="md4-field">Minute<input id="md4-event-minute" type="number" min="0" value="${minute}"></label><button type="button" class="md4-save">Save Event</button></div>`; body.querySelector(".md4-back").addEventListener("click",()=>openEvent(type)); body.querySelector(".md4-save").addEventListener("click",()=>{ const m=Math.max(0,Math.floor(Number(body.querySelector("#md4-event-minute").value)||minute)); if(type==="Note"){ const text=body.querySelector("#md4-event-text").value.trim(); if(!text)return alert("Enter the event."); state.events.push({type:"Note",playerId:pid,minute:m,text,recordedAt:stamp()}); } else state.events.push({type:"Card",playerId:pid,minute:m,cardType:type,recordedAt:stamp()}); saveState(); renderLive(); saveRecovery("event-v4"); eventView.classList.add("hidden"); }); }

  // EDITABLE TIMELINE. Uses the stable editor functions, then refreshes this view.
  function timelineItems(){ const subs=(state.substitutions||[]).map((x,i)=>({kind:"sub",index:i,minute:Number(x.minute||0),text:`🔄 ${playerName(x.off)} off → ${playerName(x.on)} on`})); const events=(state.events||[]).map((x,i)=>({kind:"event",index:i,minute:Number(x.minute||0),text:x.type==="Goal"?`⚽ ${playerName(x.playerId)} goal${x.assistPlayerId?` · assist ${playerName(x.assistPlayerId)}`:""}`:x.type==="Card"?`${x.cardType==="Red"?"🟥":"🟨"} ${playerName(x.playerId)} · ${x.cardType}`:`📝 ${playerName(x.playerId)} · ${x.text||"Event"}`})); return [...subs,...events].sort((a,b)=>a.minute-b.minute||a.kind.localeCompare(b.kind)); }
  function renderTimeline(){ const box=document.getElementById("md4-timeline"); if(!box)return; const items=timelineItems(); box.innerHTML=""; if(!items.length){box.innerHTML='<div class="md4-empty">Nothing recorded yet.</div>';return;} items.forEach(item=>{ const row=document.createElement("div"); row.className="md4-timeline-row"; row.innerHTML=`<div class="md4-timeline-minute">${item.minute}'</div><div class="md4-timeline-text"></div><button type="button" class="md4-edit">Edit</button>`; row.querySelector(".md4-timeline-text").textContent=item.text; row.querySelector(".md4-edit").addEventListener("click",()=>{ if(item.kind==="sub") editSub(item.index); else editEvent(item.index); setTimeout(renderTimeline,50); }); box.appendChild(row); }); }

  document.getElementById("md4-goal").addEventListener("click",openGoal);
  document.getElementById("md4-subs").addEventListener("click",openSubs);
  host.querySelectorAll("[data-md4-event]").forEach(btn=>btn.addEventListener("click",()=>openEvent(btn.dataset.md4Event)));

  const coreRenderLive=renderLive;
  renderLive=function(){ coreRenderLive(); if(oldSubSection)oldSubSection.classList.add("hidden"); if(oldEventSection)oldEventSection.classList.add("hidden"); if(oldLineupSection)oldLineupSection.classList.add("hidden"); renderTimeline(); };
  renderTimeline();
})();
