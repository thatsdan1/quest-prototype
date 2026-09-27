# QUEST production board — prototype v2

A working local prototype based on the provided site-visit sketches and architecture add-ons. All operators, jobs, assemblies, process timings, and comments are fictional. Source attachments are not bundled.

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

1. **Architecture**: explain the four modules and proposed ST-approved hosting/storage boundary. Click a module to inspect its details and unresolved decisions.
2. **Process setup**: inspect sample step durations and the productive-time budget. These drive the goal engine, independently from board rendering.
3. **Production board → Add job**: enter a fictional job, name, part, and start step 2. With the default hand-layup configuration, 105 productive minutes gives goal 4; 60 overtime minutes extends that goal to 5.
4. Set the actual end to 4 and save. The board shows a gap of −1. Mark the shift finished to show the final below-target outcome.
5. **Shift history**: inspect the saved snapshot or export the selected records to CSV. History includes operators, gap, overtime, and the timing revision.
6. **TV display**: large tabular output shows start, goal, actual, and gap. Pages rotate every 20 seconds when needed; the next-page button advances manually. Escape exits TV mode.
7. Explore **Week view**, **Insights**, and process/work-cell/shift filters.

## What is implemented

- Supervisor input and day/week board.
- Automatic goals from sequential step timings, productive minutes, and overtime.
- Configurable processes; per-assignment timing snapshots.
- Actual vs target, completion estimates, and labeled status colors.
- TV display with screen-height-aware pagination.
- Device-local saved records, shift history, CSV export, and work-cell insights.
- Interactive architecture hypothesis and constraints.
- Optional browser-agent tools for reading the board or opening a form; they do not save changes.

## Prototype limits

- Timings and production data are samples. Step-based progress is not labor efficiency.
- The displayed shift lead is illustrative; there is no application authentication or role enforcement.
- Browser storage is local to the device, browser, and origin. It is not shared, enterprise-approved storage. File-based storage behavior varies by browser; the local HTTP version is recommended for repeatable demos.
- TV mode is a presentation mode, not a permission boundary. Another device will not receive updates without a shared backend.
- Old records retain their timing snapshots. Changing process configuration affects newly created assignments. Selecting a process again in an edit form deliberately loads its current timings.
- If no jobs exist today, the demo initially opens the latest date with saved assignments; the date control shows the actual selected date.
- SAP, ERP, MPP, SharePoint, Excel ingestion, and approved internal hosting are not connected. There are no public-internet runtime dependencies.
- TAC rules, overtime treatment beyond added productive minutes, parallel work, rework, operator comparisons, and final unit acceptance require stakeholder validation.
- History is a local prototype activity log, not a tamper-proof audit trail. Same-origin tabs use storage events; concurrent writers have no conflict resolution.

## Source and verification

- `dist/index.html` — accessible shell, navigation, and forms.
- `dist/styles.css` — supervisor, TV, weekly, architecture, and responsive layouts.
- `dist/app.js` — UI, process configuration, sample data, and workflow coordination.
- `dist/engine.js` — pure, independently testable goal/progress logic.
- `dist/storage.js` — replaceable local-storage adapter and history snapshots.
- `ARCHITECTURE.md` — flow diagram, formulas, boundaries, constraints, and open decisions.
- `tests/engine.test.cjs` — boundary tests for sequential goals, overtime, completion, snapshots, and storage failures.
- `scripts/bundle.cjs` — regenerates the self-contained HTML deliverable.

Run calculation/storage tests with `node --test tests/engine.test.cjs`. Regenerate the offline deliverable after changes with `node scripts/bundle.cjs`.

For the next iteration, bring the course rubric/deadline, a sanitized board or data export, approved process timing rules, actual shift/work-cell names, and ST's hosting/storage direction.
