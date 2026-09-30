# 9/28 meeting follow-up — prototype v4

Scope: A320 lofting, Step 1 — hand layup. The demo remains offline with fictional jobs, people, step names, and timings.

## Feedback and what changed

| 9/28 feedback | Prototype v4 |
| --- | --- |
| Show names of steps instead of numbers | Routes are named steps. Leads choose Start and Stop by name; cards, TV, history, and CSV show "13 · 3rd debulk" instead of a bare number. |
| Overtime in hours; hide productive minutes | Overtime is entered in hours under More options. The shift budget lives in Process setup. |
| Revisit the lead input screen: it asks for more than leads provide today | Add job mirrors one workbook block: Name(s), Job #, Hand, Part, Start, Goal (calculated), Stop, Comment. Cell, date, and shift come from where the lead clicked. The free-text assembly field is gone; Part is the route. |
| Jobs span multiple shifts; the employee can change | Next shift creates a new assignment linked to the previous one. History lists every operator. |
| Click each workstation and assign people to it | Every cell in the 36-cell grid has Assign job, and every unit has Assign next shift. |
| Monday view of all 36 cells; hue shows health; top level is unit only, daily is the operator view | Weekly assemblies shades each cell by completed standard hours. Daily goals stays the operator view. |
| Employees with purples that week or over a time range | Supervisor review counts red, yellow, green, and purple shifts per operator over 1, 2, or 4 weeks and flags repeats. |
| Colour coding is familiar; stick to it | Finished shifts use the workbook's red, yellow, green, and purple bands. |
| Button to revert to the ideal state (ease of maintenance) | Process setup → Restore standard route reloads the standard route. Saving it creates a new revision and leaves existing records unchanged. |
| Really likes the CSV export | The CSV adds step names, hours earned, shift budget, colour, training, and goal rule. Negative gaps now export as numbers. |

## Workbook findings

Reference: `Production Board- QUEST 2026.xlsx`, inspected read-only. No workbook step names, timings, or employee names are bundled. The app ships fictional sample routes; Process setup can paste a real route into a local browser without uploading it.

| Evidence | Finding | Prototype decision |
| --- | --- | --- |
| `Production Board - New`, rows 5–12 of each cell | Each cell/shift block: Name, Job #, Hand, Part, Start, Goal, Stop, Comment | The Add job form uses the same fields in the same order |
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
