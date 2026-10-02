# QUEST production board — prototype v6

A working local prototype based on the site-visit sketches, the 9/28 client meeting, and a read-only review of ST's production-board workbook. All operators, jobs, step names, timings, and comments are fictional. Source attachments are not bundled.

## Get the project from GitHub

This repository is private. Team members need collaborator access to view or download it.

For a no-code review, choose **Code → Download ZIP**, extract the download, open the extracted repository folder, and double-click **QUEST Prototype.html**. Read **START HERE.txt** for the walkthrough. No installation or internet connection is needed after downloading.

For development, clone the repository with:

```sh
git clone https://github.com/thatsdan1/quest-prototype.git
cd quest-prototype
```

The complete standalone HTML is tracked alongside its editable source. The separate generated team ZIP and local hosting metadata are excluded from Git.

## Open the demo

For team review, start with **START HERE.txt**. It includes Mac/Windows instructions, a sample walkthrough, local-data behavior, and troubleshooting.

Double-click **QUEST Prototype.html** for the self-contained version. No internet connection, package installation, or build is needed.

For development, run from this directory:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Then visit http://127.0.0.1:4173. All fonts, icons, scripts, and styles use local assets or system fonts. The app makes no external network calls.

## New in v6: Operations owns the hours; the person and the unit are tracked separately

ST's October 1 answer: leads may enter hours for now, but hours per unit come from operations managers, everyone is paid for an 8-hour day (40 h a week; more is overtime), and standard step times come from the industrial-engineering time study. The board's job is to display the work, not to shorten ply times.

- **The job form keeps hours to one total.** Under Start there is one field, **Additional hours worked (overtime)**, and one **Waiting** box (hours, and what they were waiting for). The goal shows the math in one line: *8 h regular + 4 h additional − 2.5 h waiting = 9.5 h to build*, and is set from the hours to build. The comment field holds the reason for the extra time or the wait. There is no approval step and no per-person hours table.
- **Two grades.** **Person grade** = standard hours completed ÷ (total hours − waiting): 8 h done in an 11 h day with 3 h waiting for a forklift is 100%, so the operator still gets green or purple. **Process efficiency** = 1 − waiting ÷ total hours: the same day is 73%, so the process is flagged. Waiting counts toward the person's day but comes off the hours they had to build, so it never counts against them. Both grades show on job cards, Operator day, unit history, and Insights; the form shows them for the chosen stop before saving. Supervisor review (the per-person tab) has a person-grade column; station alerts use process efficiency. The colour bands still follow the workbook: on an 8 h build, purple at 8.05 h, green from 7.5 h, yellow from 6.5 h; with 4 h additional, purple at 12.05 h.
- **A person's day = the standard day + additional hours.** Operations sets the standard day at the top of Operator day (8 h by default; 5 × 8 = 40 h a week).
- **Regular hours fill themselves in.** A new job takes what the named people have left of the standard day after their other units and training that day, across all cells and shifts. Splitting someone's day across units sits behind *Split this person's day across units*. Two names share one plan; they are never added up to 16 h.
- **Training center and off-unit time.** Training isn't in the manpower plan, so the lead adds it on Operator day when it happens (Training center, Training on the floor, or Other). A trainer's time on the floor goes here too. It counts toward the person's day, not toward any unit or goal, so it never shows up as dead time.
- **Insights separates the person from the unit:**
  - *People · did the day add up* compares each person's day with building, waiting, training, and not-booked time, across all cells. **Show → Worked additional hours** lists every day someone worked more than 8 h, with the hours they had to build and the standard hours earned on their assignments, to check against time cards. It's a filter, not an alert.
  - *Units · where the time went* compares time-study hours earned with the hours to build and the waiting by reason, for the whole unit. Each assignment counts once, however many names are on it. A person can book a full day while their units still lose time; this table finds those units.
  - *Why units wait · 80/20* ranks waiting hours by reason, highlights the reasons that reach 80%, and opens the units behind each one.
- **Station alerts** (sidebar, and the bell in the top bar with a count): stations that need a supervisor's attention on the selected day. Alerts follow the **process**, not the person. A unit's latest assignment in a cell alerts when the lead reports it Blocked (critical) or At risk, or when its **process efficiency** (1 − waiting ÷ total hours) drops below 90% (warning) or 75% (critical). 3 h waiting in an 11 h day is 73%. Repeated process losses at one station (2 in a row by default) escalate to critical. The operator's person grade is shown in the alert for context only. Each alert lists the reasons, the waiting reason, and the lead's comment, with Unit history, Update job, and Acknowledge. Acknowledged alerts leave the bell and TV until that assignment changes. Alert cells are outlined on the weekly grid and TV, and the TV shows a banner of stations needing attention. The rules are editable on the page.
- **Unit history** opens with whole-unit totals: time study earned, hours to build against it, waiting by reason, and shifts below goal.
- **Operator day** draws each person's day as building, waiting, training / off-unit, and time not booked to any unit (the dead time between units).
- Process setup labels the route as time-study standards.
- Saved data moved to a new browser key (`quest-board-demo-v6`) so everyone starts from the new sample data. v5 edits stay in the browser under the old key.

Demo: click the bell. Today, Cell 04 is blocked (critical) and Cell 02 is at risk. Go back a day: Cell 05 waited 1.5 h on tooling (process 81%), critical because it keeps happening at that station. Acknowledge it, then open TV display: the banner lists the remaining stations. Next, open Operator day for yesterday. Harper Moss, a trainer, has 8 h of training on the floor; the training cells' goals are not doubled. Jordan Lee spent 2 h in the training center, shown in blue. On the board, Add job: set **Additional hours worked** to 4 (the goal covers 12 h), then **Hours waiting** 2.5 for *Tooling / fixture*: the goal line reads *8.0 h regular + 4.0 h additional − 2.5 h waiting = 9.5 h to build*. Stop at the goal, finish, and save: the shift is green, and the save message says the station waited. In Insights, choose **Show → Worked additional hours** to see Morgan Blake's 12 h day on Sep 29 next to the standard hours earned.

## Carried over from v5

- **TV display** has a Unit / cell grid and Operator goals layout, automatic pagination, pause/resume, next-page, and full-screen controls.
- **Edit / Remove / Next unit** are on each unit. Remove the entire unit or one assignment; **Removed jobs → Restore** recovers records, and conflicting identities or progress block restoration.
- **Next unit this shift** starts a new unit for the same people, cell, date, and shift with the hours they have left today.
- **Shift history / CSV** keep stable unit IDs, before/after corrections, additional hours, waiting hours and reasons, and hours to build.

Availability uses names, dates, the standard day, and the additional hours, waiting, and training time the lead entered. It does not use clock time or Kronos badge data. There is one assignment per unit/date/shift; revisiting a unit within the same shift means editing that record. Partial-shift plans are excluded from workbook colour comparisons until rating rules are agreed. Unit completion is not worker efficiency or quality acceptance.

## Suggested demonstration

1. **Weekly assemblies** opens first. Pick a day to see the 36-cell grid, shaded by completed standard hours. Use **Assign job** on an empty cell or **Assign next shift** on a unit.
2. **Daily goals**: each card leads with its cell and shows Start, Goal, and Stop by step name. Finished shifts take the workbook colours: red, yellow, green, and purple.
3. **Add job**: the form mirrors one workbook block (Name(s), Job #, Hand, Part, Start, Goal, Stop, Comment); cell, date, and shift come from where you clicked. Start on "5 · Peel & prep skin" and the goal is "13 · 3rd debulk". Set **Additional hours worked** to 1 and it becomes "14 · Lay up ply level 6".
4. Set Stop to "13 · 3rd debulk" and save: the gap is −1 step. Update the job and tick **Assignment finished**: the shift turns **Yellow · 8.0 h**, 8 standard hours against a 9-hour budget.
5. **Next shift** on the same card carries Start forward as "14 · Lay up ply level 6". **History** shows both operators.
6. **Supervisor review** counts colours per operator over 1, 2, or 4 weeks, flags repeated purples or reds, and lists every purple shift.
7. **Process setup** holds the named route, shift budget, goal rule, and colour bands. Paste a route from a spreadsheet, or use **Restore standard route**.
8. **Shift history → Export CSV**, **TV display** (Escape exits), **Insights**, and **Architecture**.

## What is implemented

- Named routes: Start and Stop are chosen by step name, and cards, TV, history, and CSV show names.
- Goals from the workbook's nearest-step rule (default) or the v3 whole-step rule, plus overtime in hours.
- Workbook colour bands for finished shifts; training shifts and reported blockers are not coloured.
- Supervisor review of colours by operator, with review flags and drill-down to job history.
- Entry form shaped like the workbook block; click a cell to assign; next-shift handoffs with per-job history.
- Separate weekly assembly grid (36 sample cells, three shifts) and daily operator goals.
- Route editor with spreadsheet paste import and restore; saved revisions keep names and timings for older records.
- TV display with screen-height-aware pagination.
- Device-local saved records, shift history, CSV export, and work-cell insights.
- Interactive architecture hypothesis and constraints.
- Optional browser-agent tools for reading the board or opening a form; they do not save changes.

## Workbook reference

The supplied workbook was inspected read-only to match its fields, shift order, goal formula, and colour rules. It is not bundled or connected, and none of its step names, timings, or employee names are in this repository. Paste a route into Process setup to try real standard work in your own browser. See **MEETING FOLLOW-UP.md** for the workbook findings and open decisions.

## Prototype limits

- Routes, timings, and production data are samples. Completion by standard hours is not labor efficiency or quality acceptance.
- Purple is shown exactly as the workbook computes it. Whether it means strong output or a quality concern is not decided, and flags are prompts for review.
- The displayed shift lead is illustrative; there is no application authentication or role enforcement, including on Supervisor review.
- Browser storage is local to the device, browser, and origin. It is not shared, enterprise-approved storage. File-based storage behavior varies by browser; the local HTTP version is recommended for repeatable demos.
- TV mode is a presentation mode, not a permission boundary. Another device will not receive updates without a shared backend.
- Old records keep their route revision. Changing or importing a route affects new assignments. The saved process is locked to preserve its route. Job number, operator, cell, date, and shift can be corrected; before/after snapshots remain. Renaming a job updates its linked assignments while keeping a stable unit ID. Overlapping recorded progress is rejected. A handoff keeps the unit's route and takes the current default shift budget.
- If no jobs exist today, the demo initially opens the latest date with saved assignments; the date control shows the actual selected date.
- SAP, ERP, MPP, SharePoint, Excel ingestion, and approved internal hosting are not connected. There are no public-internet runtime dependencies.
- TAC rules, transition routes, parallel work, rework, operator comparisons, and final unit acceptance require stakeholder validation.
- Station alerts fire on lead-reported status and finished shifts. Alerting on pace during a shift would need shift clock times and stops updated during the shift. Alerts are on-screen only: no sound, email, or phone notification.
- Hours are lead-entered, not badge or clock data. Everyone named on a job shares its hours; there is no per-person split. A trainer's floor time is entered as training, not as a second name on the job.
- History is a local prototype activity log, not a tamper-proof audit trail. Same-origin tabs use storage events; concurrent writers have no conflict resolution.

## Source and verification

- `dist/index.html` — accessible shell, navigation, and dialogs.
- `dist/styles.css` — supervisor, TV, weekly, review, architecture, and responsive layouts.
- `dist/app.js` — UI, sample routes and seed data, process configuration, and workflow coordination.
- `dist/workflow.js` — hours section of the job form, Operator day with the standard day and training time, person/unit insights, corrections, recoverable removal, and TV cell layout.
- `dist/tracking.js` — pure worker-time accounting: hours to build (worked − waiting), each person's day (standard + additional), training / off-unit time, person-days for additional-hour checks, availability, unit flow against the time study, and the waiting Pareto.
- `dist/engine.js` — pure goal rules, hours earned, colour bands, and completion.
- `dist/production.js` — station alert rules, assignment identity, shift order, handoff drafts, overtime conversion, assembly rollups, route paste parsing, and operator summaries.
- `dist/storage.js` — replaceable local-storage adapter, history snapshots, and CSV cell encoding.
- `ARCHITECTURE.md` — flow diagram, formulas, colour bands, boundaries, constraints, and open decisions.
- `MEETING FOLLOW-UP.md` — 9/28 feedback, workbook findings, and pending decisions.
- `tests/engine.test.cjs` — goal rules, workbook colour boundaries, overtime, completion, handoffs, route parsing, operator summaries, snapshots, CSV, storage failures, additional hours, waiting, training time, unit flow, and the Pareto.
- `scripts/bundle.cjs` — regenerates the self-contained HTML deliverable and fails if an asset tag is missing.
- `scripts/package.py` — builds and verifies the team ZIP.

Run the tests with `node --test tests/engine.test.cjs`. Regenerate the offline deliverable after changes with `node scripts/bundle.cjs`, then `python3 scripts/package.py` for the team ZIP.

For the next iteration, confirm the meaning of purple, the goal rule and Start convention, the approved routes, the cell roster and shift boundaries, ST's hosting/storage direction, and, with ST stakeholders and Operations, how two-person and trainer assignments are planned.
