# Screenshot Shot List — Data Explorer v1.2

Internal working file. **Not published** — `build-docs.js` and `generate-nav-tree.js` both skip
files and folders whose name starts with `_`, so nothing here reaches the built site.

Existing images in `public/images/data-explorer/` are all from the **v1.0** UI (April 2026) and
are staged for replacement.

## Conventions

- Target directory: `public/images/data-explorer/`
- One image per distinct surface. No image reused across more than two pages.
- Descriptive `alt` text required — it is the accessible name and the fallback.
- Prefer light theme unless the surface is dark-only.

---

## exporting-data.mdx — Exporting Data

| # | Filename | Insert after | What to capture |
|---|---|---|---|
| 1 | `export-popover.png` | Intro paragraph | Export popover open in the Data Explorer header, showing the three scope tabs (**View / Table / Database**) and the five format tiles |
| 2 | `export-formats.png` | "Export formats" table | Close-up of the five format tiles with icons and the selected state |
| 3 | `export-table-select.png` | "Choosing tables and schemas" | **Table** scope panel — searchable table list, checkboxes, selection count in the footer |

**Already correct, do not re-shoot:** `export.png` (currently used by this page) — replace it with shot 1.

---

## index.mdx — Data Explorer (Overview)

| # | Filename | Insert after | What to capture |
|---|---|---|---|
| 1 | `data-explorer-overview.png` | Intro | Full app, **Data Explorer** mode: table sidebar left, data grid right, header with connection selector and Export |
| 2 | `dashboard-mode.png` | "Three modes" | **Dashboard** mode with a generated dashboard of panels |
| 3 | `dashboard-ai-panel.png` | "Three modes" | Dashboard AI side panel open beside the dashboard |
| 4 | `voice-orb.png` | "Voice" | Floating voice orb over the grid, mid-session |
| 5 | `resona-ai-chat.png` | "Resona AI" | Resona AI chat mode with a plan, tool calls, and a chart artifact |

**Replace:** `data-explorer.png`, `resona-ai.png`

---

## exploring-data.mdx — Exploring Your Data

| # | Filename | Insert after | What to capture |
|---|---|---|---|
| 1 | `explorer-layout.png` | "Interface Layout" | Two-panel layout: sidebar + grid |
| 2 | `explorer-left-sidebar.png` | "Left Sidebar" | Schema selector, table search, table list with row counts and PK warnings |
| 3 | `explorer-filter-bar.png` | "Filtering Data" | Action bar with Filter open and active filter chips |
| 4 | `explorer-column-stats.png` | "Column Statistics Panel" | Stats slide-over: null %, distinct count, min/max, top values |

**Keep:** `left-sidebar.png`, `action-bar-filter-columns.png`, `columns-stats.png` (verify against v1.2 first)

---

## voice-agent.mdx — Voice Agent (page not yet written)

| # | Filename | Insert after | What to capture |
|---|---|---|---|
| 1 | `voice-orb-idle.png` | "The orb" | Idle orb, floating over the grid |
| 2 | `voice-orb-listening.png` | "The orb" | Listening state, waveform visible |
| 3 | `voice-session-panel.png` | "Controls" | Voice control bar expanded |
| 4 | `voice-across-modes.png` | "One session, every mode" | Same live session shown over Data Explorer and Dashboard modes |

---

## dashboard.mdx — Dashboard & Dashboard AI (page not yet written)

| # | Filename | Insert after | What to capture |
|---|---|---|---|
| 1 | `dashboard-grid.png` | "Dashboard layout" | Generated dashboard with mixed panels |
| 2 | `dashboard-generate-progress.png` | "Generating" | Generation progress indicator |
| 3 | `dashboard-panel-chart.png` | "Panel types" | Single panel expanded to full panel |
| 4 | `dashboard-empty-state.png` | "Empty state" | First-run dashboard empty state |

---

## agentic-workflows.mdx — How Resona AI Works (needs rewrite)

| # | Filename | Insert after | What to capture |
|---|---|---|---|
| 1 | `agent-planning.png` | "Phase 1 — Planning" | Plan with numbered steps, one running |
| 2 | `agent-tool-execution.png` | "Phase 2 — Tool Execution" | Tool calls expanded showing name, params, latency |
| 3 | `agent-synthesis.png` | "Phase 3 — Synthesis" | Final answer with a chart artifact |

**Replace:** `resona-ai.png`, `resona-ai-chat-expand-table.png`

---

## ai-artifacts.mdx — Charts & Analysis Results (needs rewrite)

| # | Filename | Insert after | What to capture |
|---|---|---|---|
| 1 | `artifact-chart-bar.png` | "Charts" | Bar chart artifact with toolbar |
| 2 | `artifact-chart-line.png` | "Charts" | Line/trend chart |
| 3 | `artifact-stat-block.png` | "Stat blocks" | Stat block artifact |
| 4 | `artifact-table.png` | "Data tables" | Table artifact, sortable, with export action |
| 5 | `artifact-expanded.png` | "Expand to full panel" | Artifact in full-panel overlay |
| 6 | `artifact-sql.png` | "View underlying SQL" | SQL viewer for an artifact |

**Remove:** `chat-tables-export.png`, `columns-stats.png` (used here as a stand-in for stat blocks — it is actually the *grid's* column-stats panel and is mislabelled)

---

## Obsolete images to delete

These are referenced by pages still awaiting rewrite and should be removed once those pages land:

| File | Reason |
|---|---|
| `resona-ai-@mention-table-overview.png` | Also mislabelled — used as a stand-in for "pin to dashboard" and "library" in `ai-workspace.mdx` |
| `resona-ai-@mention.png` | Verify against v1.2 mention picker |
| `project-resona-ai.png` | Verify against v1.2 projects panel |
| `artifact-history-dark-theme.png` | Only dark-theme shot in the set; re-shoot in light for consistency |