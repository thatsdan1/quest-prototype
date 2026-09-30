# QUEST production board — prototype v4

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

## Suggested demonstration

1. **Weekly assemblies** opens first. Pick a day to see the 36-cell grid, shaded by completed standard hours. Use **Assign job** on an empty cell or **Assign next shift** on a unit.
2. **Daily goals**: each card leads with its cell and shows Start, Goal, and Stop by step name. Finished shifts take the workbook colours: red, yellow, green, and purple.
3. **Add job**: the form mirrors one workbook block (Name(s), Job #, Hand, Part, Start, Goal, Stop, Comment); cell, date, and shift come from where you clicked. Start on "5 · Peel & prep skin" and the goal is "13 · 3rd debulk". Add 1 overtime hour under **More options** and it becomes "14 · Lay up ply level 6".
4. Set Stop to "13 · 3rd debulk" and save: the gap is −1 step. Update the job and tick **Shift finished**: the shift turns **Yellow · 8.0 h**, 8 standard hours against a 9-hour budget.
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
- Old records keep their route revision. Changing or importing a route affects new assignments. Saved job, part, and shift identity is locked in the update form. A handoff keeps the unit's route and takes the current default shift budget.
- If no jobs exist today, the demo initially opens the latest date with saved assignments; the date control shows the actual selected date.
- SAP, ERP, MPP, SharePoint, Excel ingestion, and approved internal hosting are not connected. There are no public-internet runtime dependencies.
- TAC rules, transition routes, parallel work, rework, operator comparisons, and final unit acceptance require stakeholder validation.
- History is a local prototype activity log, not a tamper-proof audit trail. Same-origin tabs use storage events; concurrent writers have no conflict resolution.

## Source and verification

- `dist/index.html` — accessible shell, navigation, and dialogs.
- `dist/styles.css` — supervisor, TV, weekly, review, architecture, and responsive layouts.
- `dist/app.js` — UI, sample routes and seed data, process configuration, and workflow coordination.
- `dist/engine.js` — pure goal rules, hours earned, colour bands, and completion.
- `dist/production.js` — assignment identity, shift order, handoff drafts, overtime conversion, assembly rollups, route paste parsing, and operator summaries.
- `dist/storage.js` — replaceable local-storage adapter, history snapshots, and CSV cell encoding.
- `ARCHITECTURE.md` — flow diagram, formulas, colour bands, boundaries, constraints, and open decisions.
- `MEETING FOLLOW-UP.md` — 9/28 feedback, workbook findings, and pending decisions.
- `tests/engine.test.cjs` — goal rules, workbook colour boundaries, overtime, completion, handoffs, route parsing, operator summaries, snapshots, CSV, and storage failures.
- `scripts/bundle.cjs` — regenerates the self-contained HTML deliverable and fails if an asset tag is missing.
- `scripts/package.py` — builds and verifies the team ZIP.

Run the tests with `node --test tests/engine.test.cjs`. Regenerate the offline deliverable after changes with `node scripts/bundle.cjs`, then `python3 scripts/package.py` for the team ZIP.

For the next iteration, confirm the meaning of purple, the goal rule and Start convention, the approved routes, the cell roster and shift boundaries, and ST's hosting/storage direction.
