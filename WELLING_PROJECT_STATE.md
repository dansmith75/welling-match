# Welling United Red — Living Project State

**Purpose:** Permanent handover / continuity document for the Welling United Red OBDSFL 2026/27 technical project. Read this before making changes, especially when starting a new ChatGPT conversation.

**Last reviewed:** 24 August 2026

> This document describes the current architecture and decisions. GitHub code and the master Excel workbook remain the technical/data sources of truth. Update this document whenever a significant workflow, architecture or feature decision changes.

## 1. Project overview

Welling United Red uses two connected web applications:

1. **Welling Match** — mobile-first manager application for Attendance and live Matchday capture.
2. **Welling Dashboard** — team/player dashboard and GitHub-published football data layer.

The aim is a simple pitch-side workflow while retaining Excel as the editable long-term football record.

## 2. Repositories

- Matchday / Attendance: `dansmith75/welling-match`
- Dashboard / publishing: `dansmith75/welling-dashboard`

Do not confuse the newer Matchday application with earlier dashboard/attendance prototypes.

## 3. Authoritative data flow

Current intended workflow:

`Welling Match (phone) -> Supabase -> UPDATE-WELLING -> master Excel workbook -> JSON exports -> GitHub -> Dashboard + shared Match feeds`

Key principles:

- **Excel remains the football-data source of truth.**
- **Supabase is the central submission/recovery layer** for data captured on phones.
- **GitHub is the publishing layer** for generated JSON and the static sites.
- Once a Matchday submission reaches Supabase, the phone that ran it is not part of the long-term data chain.
- There is no normal manual CSV export/import step.

## 4. Welling Match — current Matchday v3 behaviour

### Shared squad / fixture data

`app-config.js` consumes Dashboard-published shared feeds, including:

- `data/players.json`
- `data/matches.json`

Active players and `displayName` come from the shared player feed.

### Attendance

Training statuses:

- Present
- Late
- Absent
- Injured

Match statuses:

- Present
- Late
- No Show
- Unavailable
- Injured
- Rotated

Rules / behaviour:

- Match squad is limited to 16 players marked Present or Late.
- Unavailable, Injured and Rotated players are moved to the bottom of the list.
- Submitted Attendance is stored centrally in Supabase.
- Recent submitted sessions can be reviewed in Welling Match.

### Matchday

- Matchday squad is automatically built from players marked Present or Late in Match Attendance.
- Starting XI is selected by tapping player cards; maximum 11. Fewer can be confirmed where necessary.
- A player changed to Late after kick-off can join the live Matchday squad, subject to the 16-player limit.
- On-pitch players are clustered by position group: goalkeeper, defence, midfield, attack.
- Match clock controls: Start, Pause / Half Time, Resume, Full Time.
- Pause / Half Time uses orange treatment; Full Time uses green treatment.
- Cancel Matchday is deliberately isolated at the bottom to reduce accidental use.
- Forgotten running matches have a safety stop at 180 minutes.

### Substitutions and minutes

- Substitution captures player off, player on and minute.
- Minutes played are recalculated from substitution history.
- Recorded substitutions/events use the spanner control for Edit / Delete / Cancel.

### Events

Supported Matchday events include:

- Goal
- Own goal
- Yellow card
- Red card
- Sin bin
- Free-text player event

Goal types:

- Open Play
- Penalty
- Free Kick
- Corner

Assist rules:

- Open Play, Free Kick and Corner may record an assist.
- Penalty does not record an assist.
- Own Goal is recorded without attributing the goal to a Welling player.

### Recovery / completion

- Live Matchday state is stored locally for immediate recovery.
- It is periodically backed up to Supabase.
- Completed Matchdays are stored centrally in Supabase `matchday_sessions`.

## 5. Supabase

Current Welling Match README identifies these tables:

- `attendance_sessions`
- `attendance_records`
- `matchday_sessions`
- `matchday_recovery`

`matchday_recovery` is created by `MATCHDAY-RESILIENCE.sql`.

The internal Supabase `source` value `welling_attendance_app` is intentionally retained as a stable data identifier even though it is no longer the user-facing branding.

Keep the real `supabase-config.js` when upgrading the Match application so the Supabase URL, publishable key and admin PIN are preserved.

## 6. Supabase -> Excel reconciliation

`UPDATE-WELLING` is responsible for bringing central submissions back into the master workbook.

Current design:

- `AttendanceRecords` is mirrored from Supabase, so corrected/deleted attendance sessions can be reflected on the next update.
- Completed Matchdays are imported once using Supabase session ID.
- Matchday audit data retains starters, substitutions, minutes, goals, assists, cards and notes.
- Existing Goals, Assists and Events workbook data is updated where applicable.

The dashboard repo currently contains reconciliation/authority tooling including:

- `attendance_excel_reconcile.py`
- `apply_matchday_authority.py`
- `backfill_legacy_matchday_records.py`
- `cleanup_stale_matchday_data.py`
- `create_workbook_snapshot.py`
- `ensure_matchday_export_columns.py`

Treat the current code as authoritative for exact implementation details.

## 7. Dashboard published data

The current `data` directory includes:

- `players.json`
- `matches.json`
- `goals.json`
- `assists.json`
- `events.json`
- `attendance.json`
- `minutes.json`
- `timeline.json`
- `bios.json`
- `league-table.json`
- `links.json`

This is broader than the older six-file exporter documentation. When documentation conflicts with the actual current repository/exporter, inspect the current code and generated `data` directory rather than assuming the older documentation is complete.

## 8. UPDATE-WELLING workflow

The updater is intended to be the normal one-click publishing/reconciliation route.

Historically documented core flow:

1. Pull latest repo changes.
2. Find the master workbook in OneDrive.
3. Reconcile central submissions where applicable.
4. Export JSON from Excel.
5. Validate generated data.
6. Show changes / summary.
7. Ask before publishing.
8. Commit generated `data/*` changes.
9. Push to GitHub.

Windows entry point: `UPDATE-WELLING.bat`.

Mac support also exists via `UPDATE-WELLING.command` and the Python updater.

**Important:** the older `UPDATE-WELLING-README.md` describes six JSON exports and may lag the current exporter. Use the live scripts/data directory to determine the current export set.

## 9. FA Full-Time / league data

FA Full-Time integration has been unreliable during development. Previous attempts encountered API/service errors and direct scraping restrictions. The project therefore has fallback behaviour around existing league-table data rather than making Matchday operation dependent on live FA access.

Do not make the core Matchday workflow dependent on FA Full-Time being reachable without explicitly revisiting this decision.

## 10. Key design decisions to preserve

- Mobile-first pitch-side operation.
- Multiple authorised managers should be able to run sessions from their own phones.
- Supabase centralises phone submissions and Matchday recovery.
- Excel remains the editable master football record.
- GitHub-published JSON is shared by Dashboard and Match application.
- Use player `displayName` in user-facing UI; do not expose database/player IDs where a display name should appear.
- Active squad should come from the shared player feed rather than hard-coded player lists.
- Matchday squad derives from Match Attendance rather than requiring duplicate squad entry.
- Preserve a robust recovery path for an interrupted/live Matchday.
- Avoid manual duplicate data entry wherever possible.

## 11. Current source-of-truth hierarchy

When sources disagree, use this order:

1. **Current master Excel workbook** for football records/data.
2. **Current GitHub code** for application behaviour and workflow implementation.
3. **Current generated Dashboard JSON** for what is actually published.
4. **This project-state document** for architecture, decisions and continuity.
5. Older READMEs / historical ChatGPT conversations only for background.

Do not infer current behaviour from an old conversation when the current repo can be inspected.

## 12. Working protocol for future ChatGPT conversations

At the start of a new Welling development chat:

1. Read `WELLING_PROJECT_STATE.md` first.
2. Inspect the relevant current GitHub files before proposing code changes.
3. Use the current workbook / project-source spreadsheets when the question depends on football data.
4. Do not fall back to the older Welling dashboard prototype/history unless specifically asked.
5. After a material architecture/workflow change, update this document.

Useful opening instruction for a new chat:

> Read `WELLING_PROJECT_STATE.md` in the `welling-match` repo and inspect the current repos before we continue the Welling United project.

## 13. Current position / next actions

As of 24 August 2026:

- Matchday v3, Attendance, Supabase submission/recovery and the Excel/Dashboard reconciliation architecture are established.
- Dashboard publishing includes attendance, minutes and timeline data in addition to players/matches/goals/assists/events.
- The immediate next development item should be recorded here whenever work begins, so a future chat can resume without reconstructing the previous conversation.

**NEXT ITEM:** To be set from the next Matchday/Dashboard task in the current conversation.

## 14. Change log

### 24 August 2026

- Created this permanent living handover document after the previous `Welling United Red Review` conversation reached its maximum length.
- Re-established the two-repository architecture and current Matchday v3 workflow from the live repositories.
- Added continuity protocol and source-of-truth hierarchy to prevent future chats reverting to obsolete project history.
