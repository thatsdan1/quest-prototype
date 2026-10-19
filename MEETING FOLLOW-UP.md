# Meeting follow-up — prototype v4 to v7

Scope: A320 lofting, Step 1 — hand layup. The demo remains offline with fictional jobs, people, step names, and timings.

## Feedback and what changed

| 9/28 feedback | Prototype v4 |
| --- | --- |
| Show names of steps instead of numbers | Routes are named steps. Leads choose Start and Stop by name; cards, TV, history, and CSV show "13 · 3rd debulk" instead of a bare number. |
| Overtime in hours; hide productive minutes | Overtime is entered in hours under More options. The shift budget lives in Process setup. |
| Revisit the lead input screen: it asks for more than leads provide today | New job mirrors one workbook block: Name(s), Job #, Hand, Part, Start, Goal (calculated), Stop, Comment. Cell, date, and shift come from where the lead clicked. The free-text assembly field is gone; Part is the route. |
| Jobs span multiple shifts; the employee can change | Next shift creates a new assignment linked to the previous one. History lists every operator. |
| Click each workstation and assign people to it | Every cell in the grid has New job, and every unit has Continue next shift. |
| Monday view of all 36 cells; hue shows health; top level is unit only, daily is the operator view | Weekly assemblies shades each cell by completed standard hours. Daily goals stays the operator view. |
| Employees with purples that week or over a time range | Supervisor review counts red, yellow, green, and purple shifts per operator over 1, 2, or 4 weeks and flags repeats. |
| Colour coding is familiar; stick to it | Finished shifts use the workbook's red, yellow, green, and purple bands. |
| Button to revert to the ideal state (ease of maintenance) | Process setup → Restore standard route reloads the standard route. Saving it creates a new revision and leaves existing records unchanged. |
| Really likes the CSV export | The CSV adds step names, hours earned, shift budget, colour, training, and goal rule. Negative gaps now export as numbers. |

## Workbook findings

Reference: `Production Board- QUEST 2026.xlsx`, inspected read-only. No workbook step names, timings, or employee names are bundled. The app ships fictional sample routes; Process setup can paste a real route into a local browser without uploading it.

| Evidence | Finding | Prototype decision |
| --- | --- | --- |
| `Production Board - New`, rows 5–12 of each cell | Each cell/shift block: Name, Job #, Hand, Part, Start, Goal, Stop, Comment | The New job form uses the same fields in the same order |
| `Production Board - New!E4:AS4` | 21 day/shift columns, third shift first (M3, M1, M2 … SU2) | Production-day order 3 → 1 → 2 |
| `Production Board - New!C5:C277` | 35 cell labels; one is A21 | 36 demo cells per the meeting; confirm the roster |
| `Data Sheet`, route columns K–AL | Named routes per part (Inner Bondment, Inner Skin, and IB/IS transition routes) with minutes per step and cumulative hours, including 0-minute reminder steps | Routes are named steps with standard minutes; 0-minute checkpoints are allowed |
| `Data Sheet!AP:AQ` | One lookup list from step name to cumulative hours, with every route on one axis | The engine keeps cumulative time per route |
| Goal formula, e.g. `Production Board - New!E10` | Goal = the step whose cumulative hours are nearest to Start + `BB3` (8 h); ties take the first match; overtime is not in the formula | The default goal rule reproduces this. Overtime is added to the budget. The v3 whole-step rule remains an option. |
| Row 12 of each block, e.g. `F12 = F11 − F9` | Hours = cumulative(Stop) − cumulative(Start) | Hours earned = standard time from start to stop |
| Conditional formatting on the hours cells | Purple ≥ `BD2` (8.05); green 7.5–8.05; yellow 6.5–7.5; red < 6.49 | Colour bands reproduced, measured against each shift's budget |
| Filled boards | Start is the step being started; Stop is the last step completed | The app counts the start step's own time toward the shift. The workbook's Stop − Start leaves it out, so its colours shift with whichever step a shift starts on. |
| Start, Stop, Part, and Hand entries | Start and Stop must match a route step name exactly (some names end in a space), so blank or mistyped entries show `#N/A`; Part and Hand are typed inconsistently (informal part names, lowercase hands) | Part, Hand, Start, and Stop are dropdowns |
| `Production Board - Display` | The TV sheet reads Start and Stop from the hidden `Production Board - Broken` sheet, and some cells reference the wrong day's columns; `F7` contains `#REF!` | The TV view reads the same records as the board. No display formulas are copied. |
| Weekend lookups, e.g. `AJ9` | Saturday and Sunday lookups stop at `$AQ$500`, so later steps cannot be found | One route lookup for every day |
| `Shift Data` | Name, day, shift, and hours per cell: the historical productivity table | Shift history and CSV carry these fields plus step names and colour |

In the workbook, purple marks a shift that earned 8.05 standard hours or more, which is output above the goal. The meeting described purples as quality issues. The app shows purple exactly as the workbook computes it and flags repeats for review without calling them good or bad. ST should confirm which reading it intends before operators are compared by name.

## Open decisions

1. What purple means, whether repeated purples or reds should be flagged, the threshold and window, and which comparisons the union permits.
2. The goal rule (nearest step, as today, or whole steps that fit) and the Start convention (first step worked, as in the app, or the step being started).
3. Approved routes for each part, including the transition routes; the shift budget; and how overtime, training, and not-worked shifts are credited.
4. The cell roster (35 with A21, or 36), overnight shift boundaries, and whether completed units stay on the floor grid. The demo shows them through the day they finish.
5. The approved internal data source, supervisor permissions, and hosting (SharePoint or local network).

Run and share instructions are in `START HERE.txt`. The team ZIP and standalone HTML are rebuilt from the same source; sending either does not send browser-local edits.


## October 1 follow-up implemented in v5

The lead-entered-hours approach was approved for this iteration. TV now offers a paged cell grid in addition to operator goals. Direct edit/removal with restoration makes mistaken entries recoverable. A stable unit identity survives job-number corrections and links shifts without replacing earlier operators.

A separate Operator day view shows multiple units per person. The Next unit action carries the same shift/operator into a new record and offers the remaining manually allocated shift budget. For example, 3 h allocated from a 6.5 h shift leaves 3.5 h. Targets use that assignment allocation plus overtime. Optional actual hands-on and waiting hours/reasons are retained in history and CSV; they are not inferred from a badge event or calculated standard hours. Blank observations stay unknown.

Pending validation: agreed split-shift colour rules, individual credit for shared work, delay categorisation, official standard times, break/shift boundaries, repeated visits to one unit in a shift, and any time-clock integration. Partial allocations are omitted from workbook colour comparisons rather than assigning unapproved bands. Supervisor access remains a screen without authentication.


## October 1 answer and site-visit notes → v6

ST's answer to "may leads enter hours?": yes, for now. Hours per unit come from operations managers; every person works an 8-hour day (40 h a week, overtime beyond); step times come from the industrial-engineering time study (an average of observed builds across experience levels). The board should display the work, not try to shorten ply times.

| Note | v6 |
| --- | --- |
| Floor screen should show completion by cell | TV display → Unit / cell grid (v5) |
| History of the unit, not just the operator | Unit history opens with whole-unit totals: time study earned, hours to build, waiting by reason |
| Continue the existing job instead of adding one | New job starts a new unit; Edit / Continue next shift / Next unit this shift work from an existing one (v4–v5; renamed 10/19) |
| Delete button for errors | Remove and Restore (v5) |
| Make sure each person has their required hours, automatically | Each person's day = standard day + additional hours entered by the lead; regular hours fill in from what is left, across cells |
| Dead time from unit to unit | Operator day shows time not booked to any unit or training; Insights lists it per person |
| Track the unit and the worker separately; avoid "ghost problems" | People and Units are separate tables. Each job carries its own hours, so one unit no longer absorbs a whole badge day |
| Stuck waiting on Quality bills 8 h to the operation | Waiting hours with a reason are their own field, taken off the hours to build |
| Insights should name the issues ("Tooling", "Waiting for forklift"), 80/20 | Why units wait · 80/20, with the units behind each reason |
| Two people in one cell should not mean 16 h of work; a trainer bounces between cells | Two names share one plan. A trainer's floor time is entered as training, not as a second plan |

Pending with ST stakeholders and Operations: clock-time entry for finer dead-time analysis (the model supports it, the form does not ask); and any AI "copilot" analysis, which must not receive proprietary data.

## Supervisor request: alert when stations are behind

Station alerts list every station that is blocked, at risk, or (since the follow-up below) losing process efficiency to waiting on the selected day, with the reasons, the waiting reason, and the lead's comment. A bell shows the count; the weekly grid and TV outline the stations, and the TV shows a banner. Defaults reuse the workbook margins (0.5 h short = warning, 1.5 h = critical) and escalate repeated misses at one station. The supervisor can acknowledge an alert, and the rules are editable.

To confirm with the supervisor: whether "behind" should also mean behind pace during a shift (needs shift clock times and stops updated during the shift); the right margins and repeat count; whether some alerts should reach her off the floor (email, Teams, phone), which needs an approved channel; and who may acknowledge alerts.

## Follow-up answers: training, trainees, overtime

| Answer | Prototype |
| --- | --- |
| Operators also train in the training center. It isn't in the manpower plan, so it should be adjustable: the lead adds it when it happens | Operator day → *Training center and off-unit time*: person, hours, reason. It counts toward the person's day, not toward any unit or goal, and can be removed |
| Whether trainee time counts as build time: not a concern right now | Unchanged: trainee time counts toward the unit |
| No approval loop for overtime. The lead enters the extra hours when someone stays (4 extra → a 12 h goal) | *Additional hours worked* sits under Start in the job form. The person's day and goal grow to match; there is no approval form |
| The supervisor wants to check that people with overtime on their time cards did that much work, as a filter in Insights rather than an alert | Insights → People → *Show: Worked additional hours* lists each day over 8 h with the hours recorded and the standard hours earned on that person's assignments |

## Follow-up: one hours total; waiting is its own thing

| Answer | Prototype |
| --- | --- |
| The hours section had too many separate variables; wrap it into one total | The per-person hours table is gone. The form has one *Additional hours worked* field and one *Waiting* box; the goal shows *8 h regular + 4 h additional − 2.5 h waiting = 9.5 h to build* |
| Additional hours worked belongs up with the main fields, with a reason | It sits under Start; the comment holds the reason |
| Waiting (for a tool, for example) is its own thing and should not count against the operator | Waiting counts toward the person's day (they still worked 12 h) but comes off the hours to build, so the goal and colour are judged on 9.5 h. The unit and station still show the 2.5 h, and the reason feeds the 80/20 chart and a *Waiting* station alert |

## Follow-up: person grade vs. process efficiency

| Answer | Prototype |
| --- | --- |
| Colour bands: on an 8 h build, 8.05 h is purple, 7.5 h green, 6.5 h yellow; with 4 h overtime the bands move to 12.05 h | Unchanged: bands are relative to the hours to build |
| Person grade = completed tasks ÷ (total time − waiting). 8 h done, 11 h total, 3 h forklift wait still earns green or purple | Shown as *Person grade* on job cards, the form (for the chosen stop), Operator day, unit history, Insights → People, and Supervisor review |
| Process grade = 1 − waiting ÷ total time; 3 h waiting is about 72% | Shown as *Process* on the same views and on Insights → Units for whole units |
| Alerts should be about the process; the person can be a separate tab | Station alerts fire on Blocked, At risk, and process efficiency below 90% (warning) or 75% (critical); the person grade is shown in the alert for context only. Supervisor review is the per-person tab |

## 10/15 meeting → v7

| 10/15 discussion | Prototype v7 |
| --- | --- |
| Show exact percentages for each operator, or colour categories? Decided: colour, so no individual is embarrassed by a number; the competition should motivate, not shame | **Floor display → Individual results on the floor: Colour only** (default). Board cards and the TV show the finished shift's workbook colour, with no person grade, hours earned against hours to build, step gap, or "% of planned work". Unit completion and process efficiency stay; they describe the unit and the process. Operator day, Station alerts, Insights, and Supervisor review keep exact numbers. One setting turns numbers back on |
| Individual goal completion **and** overall production-line health | TV line-health bar: active / idle / open cells, average completion, stations needing attention by name, and the count of finished shifts in each colour, without names |
| A timeline or progress bar showing where each station is in the assembly process, like a Gantt chart; an extra view next to the colour-gradient chart, nice to have | **Weekly assemblies → Timeline** and **TV → Line timeline**: one bar per cell over its route by standard hours. Dark = complete before the day, light = completed that day, purple tick = that day's shift goal, plus the last step and standard hours left. The gradient grid stays the default |
| TV today: 36 cells in groups of six, long cycle. Preference: more cells at once, active and inactive cells with colour and information; 30 cells now, all 36 later | Rows of six; **all cells in use on one screen** by default (30 fit a 1080p TV with no scrolling), or 18 / 12 / 6 per screen; rotation 10–60 s. **Cells in use** defaults to 30, up to 36. Active (worked today), idle (unit in the cell, nothing recorded today; greyed), and open (empty; dashed) cells are distinct. Text scales with the tile |
| After the project, ST IT places the HTML in a shared folder for TVs and shop-floor PCs. Our plan: a server with communication between components, all files in a private GitHub repository, handed to ST for security rules | **`server/server.js`**: Node 18+, no dependencies, no internet access. It serves the app and one shared board. Lead PCs save; TVs update live. Stale saves are refused rather than overwriting, and saves are atomic with a previous copy and two weeks of daily backups. A TV opens with `/?display=tv`. The standalone HTML still runs offline on one device |
| Connect to SAP through API keys so data fills in automatically, with no double entry from Excel | Not built; Phase 2 (below). The server is where an SAP connector and its keys would live, never the browser |
| ST IT helps implement; ST's own team owns maintenance, with contractors for major changes | Plain HTML/CSS/JS with no build step or packages; `npm test` runs 50 tests; the README lists every file's job |
| Prototype for about a year, then Solumina for digitized paperwork and clock-in/out | Phase 2 (below). CSV export and the JSON board file give a migration path |

### Why a shared folder alone won't feed the TV

Opened as a file, the app saves to that browser's storage. If ST IT copies the HTML into a shared folder and each TV and PC opens it there, every screen keeps its own separate data: a lead's entries on one PC never reach a TV. The TV needs a shared data source. That can be the board server in this repository, or another source that ST IT approves.

### Input for the ST IT meeting

- **What runs:** one Node.js 18+ process (`npm start`), no packages, no outbound connections. It serves static files and three endpoints: `GET/PUT /api/state`, `GET /api/events` (live updates), and `GET /api/health`. The response headers block loading anything from outside the server.
- **Where:** any Windows or Linux machine, VM, or container on the plant network. Settings: `HOST` (default 127.0.0.1, this machine only; `0.0.0.0` for the network), `PORT` (4173), `QUEST_DATA_DIR` (board file and backups).
- **Data:** one JSON board file, a previous copy, and 14 daily backups, all in the data folder. No proprietary data is in the repository; real routes are pasted in on site.
- **For IT to decide:** who may edit and who may only view (there is no login today; options include network rules, a reverse proxy with Windows sign-in, and view-only TV accounts); TLS; GCC High / ITAR / FedRAMP applicability; backup and retention; moving the repository from the private GitHub repo into ST's source control; who restarts the service.

### Phase 2: technical input for the recommendations document

1. **SAP connector, read-only first.** A scheduled server-side job pulls production orders and routing standard times through SAP's API (OData or BAPI, IT's choice), so leads stop retyping job numbers and routes from Excel. API keys stay in server settings. Writing confirmations back to SAP would come later, if ever.
2. **Record-level storage.** Replace the single board file with a database that IT supports (SQL Server or PostgreSQL), saving one record at a time with an append-only audit log. Two leads could then edit different cells at once without a whole-board conflict.
3. **Sign-in.** Single sign-on (for example Entra ID) for leads and supervisors, with view-only floor TVs, and the exact-number pages limited to supervisors.
4. **Clock data, then pace alerts.** With real clock-in/out times, mid-shift pace alerts and measured idle time between units become possible. Today both would be guesses.
5. **Solumina, after about a year.** Map unit / job, operations and steps, standard times, and clock events to Solumina's model, and migrate the history through the CSV export or the board file. Solumina's digitized paperwork and clock tracking would replace lead-entered hours. The board could remain the floor display, reading from Solumina.

### Still open after 10/15

- TV layout: cells per screen and rotation speed, pending the floor lead's input (the settings are ready for either answer).
- Whether supervisors also see colour only, or keep exact numbers (v7: they keep numbers).
- Hosting and ownership of the board server, for the ST IT meeting next week.
- The prototype review with ST leadership next week (tentatively 9:00–9:50).
- End-of-October site visit: proposal to test the board server on the floor with one TV and one lead PC. A second ST tester may join the prototype testing.
