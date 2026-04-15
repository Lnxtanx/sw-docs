# Workspace Tools Audit Report

**Date:** 2026-04-11  
**Scope:** SQL Editor agent file management tools  
**Files reviewed:**
- `backend-ai/src/tools/sql_editor/workspace_tools.py` (15 tools)
- `backend/routes/service/project-files.routes.js` (6 endpoints)
- `backend-ai/src/prompts/sql_editor/react_agent.txt` (prompt)

---

## 1. Tool Inventory

| # | Tool Name | CLI Equivalent | Status | Critical Issues |
|---|-----------|---------------|--------|----------------|
| 1 | `workspace_list_files` | `ls` / `tree` | ✅ Working | None |
| 2 | `workspace_read_file` | `cat` | ✅ Working | Filename match ambiguity |
| 3 | `workspace_search_files` | `grep -ri` | ✅ Working | 100-file cap, no concurrency limit |
| 4 | `workspace_create_file` | `touch` + write | ⚠️ Partial | **Does NOT return node_id** |
| 5 | `workspace_update_file` | `>` (overwrite) | ⚠️ Partial | No filename support, wasteful GET |
| 6 | `workspace_create_folder` | `mkdir` | ⚠️ Partial | **Does NOT return node_id** |
| 7 | `workspace_delete_node` | `trash` (soft) | ✅ Working | No filename support |
| 8 | `workspace_patch_file` | `sed 's/old/new/'` | ✅ Working | Basename-only filename match |
| 9 | `workspace_apply_diff` | `patch` / `git apply` | ✅ Working | Overlapping hunks not validated |
| 10 | `workspace_get_versions` | `git log -- file` | ✅ Working | 20-version cap undocumented |
| 11 | `workspace_revert_to_version` | `git checkout <ver>` | ✅ Working | No filename support |
| 12 | `workspace_apply_multi_file` | Transactional patch | ⚠️ Partial | Not truly atomic, no filename support |
| 13 | `workspace_save_checkpoint` | — | ❌ Broken | **Dead code — persists nothing** |
| 14 | `workspace_load_checkpoint` | — | ❌ Broken | **Dead code — returns static message** |
| 15 | `workspace_list_checkpoints` | — | ❌ Broken | **Always returns empty** |

---

## 2. Claude Code Tool Mapping

| Claude Code / CLI | Our Tool | Match Quality | Gap |
|-------------------|----------|---------------|-----|
| `ls` | `workspace_list_files` | ✅ Good | No glob filtering |
| `cat` | `workspace_read_file` | ✅ Good | Filename match is basename-only |
| `grep` | `workspace_search_files` | ✅ Good | 100-file cap, no glob patterns |
| `write` | `workspace_create_file` | ⚠️ | Missing node_id in return |
| `edit` (inline) | `workspace_patch_file` | ✅ Good | Basename match ambiguity |
| `apply_patch` | `workspace_apply_diff` | ✅ Good | No overlap validation |
| `rm` | `workspace_delete_node` | ⚠️ | Soft-delete only, no permanent delete |
| `mv` / rename | **MISSING** | ❌ | Backend PATCH can rename but no dedicated tool |
| `cp` | **MISSING** | ❌ | No tool or backend endpoint |
| `diff` | **MISSING** | ❌ | `db_diff_schema` is DB-vs-files, no file-vs-file |
| `glob` | **MISSING** | ❌ | No find-by-pattern tool |

---

## 3. Critical Bugs

### 3.1 `workspace_create_file` — Missing `node_id` in return (Line 408-415)

**Problem:** After creating a file, the tool returns `name`, `file_name`, `file_extension`, `version_number`, `message` — but NOT the `node_id`. The LLM cannot subsequently read, patch, or update that file without re-listing all files to find it.

**Impact:** Forces extra `workspace_list_files` call after every file creation → wasted tokens and time.

**Fix:** Add `"node_id": node.get("id")` to the return dict.

---

### 3.2 `workspace_create_folder` — Missing `node_id` in return (Line 554-558)

**Problem:** Same as above — returns `name` and `message` but not the folder's `id`. LLM cannot use the folder as `parent_id` for subsequent file creation.

**Fix:** Add `"node_id": node.get("id")` to the return dict.

---

### 3.3 Checkpoint tools — Completely dead code (Lines 1319-1450)

**Problem:** `workspace_save_checkpoint` generates an ID but persists nothing to any database or file. `workspace_load_checkpoint` returns a static message. `workspace_list_checkpoints` always returns empty. The entire checkpoint system is a no-op.

**Impact:** If the LLM ever calls these (it shouldn't per current prompt), it gets misleading results.

**Fix:** Either implement properly (persist to DB) or remove all three tools.

---

## 4. Medium-Priority Issues

### 4.1 Filename resolution is duplicated and fragile

**Three tools** implement their own filename-to-node_id resolution:
- `workspace_read_file` (lines 185-217)
- `workspace_patch_file` (lines 757-782, `_resolve_node_id`)
- `workspace_apply_diff` (lines 855-875)

**All use basename-only matching:** `target = filename.strip().split("/")[-1].lower()`

**Problem:** If the project has two files named `schema.sql` in different folders (e.g., `migrations/schema.sql` and `queries/schema.sql`), this silently matches the first one found — potentially the wrong file.

**Fix:** Extract a shared `_resolve_node_id()` helper that:
1. Tries exact full-path match first
2. Falls back to basename match
3. Returns error with all matches if ambiguous

### 4.2 `workspace_search_files` — 100-file cap + 100-match cap

**Line 282:** `nodes_to_read = file_nodes[:100]`  
**Line 320-323:** Match cap at 100

**Problem:** In projects with >100 SQL files, searches silently skip files beyond the cap. No warning is emitted to the LLM.

**Fix:** Add `"truncated": len(file_nodes) > 100` to the return, and warn in summary.

### 4.3 `workspace_search_files` — No concurrency limit

**Line 298-302:** Reads up to 100 files in parallel with `asyncio.gather()`. Each has a 30s timeout. If all 100 timeout, the tool waits 30 seconds.

**Fix:** Add `asyncio.Semaphore(10)` to limit to 10 concurrent requests.

### 4.4 `workspace_update_file` — No filename support

Unlike `workspace_read_file`, `workspace_patch_file`, and `workspace_apply_diff`, this tool ONLY accepts UUID node_ids. Inconsistent.

**Fix:** Add filename resolution (reuse shared helper from 4.1).

### 4.5 `workspace_update_file` — Wasteful GET

**Line 460:** Fetches current file data just to get `final_name` when `name` is not provided. If `name` is not being changed, the GET is unnecessary.

**Fix:** Skip GET if `name` is not provided. Just PATCH the content directly.

### 4.6 `workspace_apply_diff` — No overlapping hunk validation

**Lines 913-917:** Changes applied in reverse position order. But if two `old_text` values overlap (one is substring of another, or they share boundary), the replacement corrupts positions.

**Fix:** Validate that all `old_text` ranges are non-overlapping before applying.

### 4.7 `workspace_apply_multi_file` — Not truly atomic

**Line 1141:** Claims to be "atomic" but applies changes sequentially with rollback on failure. If rollback itself fails, the system is left in a partially-applied state.

**Fix:** Rename to `workspace_batch_edit` (drop "atomic" claim) or implement proper two-phase commit.

### 4.8 `workspace_delete_node` — No filename support

Only accepts UUID. LLM must list files first to get node_id.

**Fix:** Add filename resolution.

### 4.9 `workspace_revert_to_version` — No filename support

Same issue.

---

## 5. Missing Tools / Backend Endpoints

### 5.1 Missing Backend Endpoints

| Endpoint | Purpose | Priority |
|----------|---------|----------|
| `PATCH /:nodeId` with `parent_id` | Move file between folders | Low |
| `POST /:nodeId/duplicate` | Copy/duplicate a file | Low |
| `POST /:nodeId/restore` | Restore soft-deleted file | Low |
| `DELETE /:nodeId/permanent` | Hard-delete (bypass trash) | Low |

### 5.2 Missing Tools

| Tool | Purpose | Priority |
|------|---------|----------|
| `workspace_rename_file` | Dedicated rename (uses existing PATCH) | Low |
| `workspace_move_file` | Move file between folders | Low |
| `workspace_diff_files` | Diff two files or file versions | Medium |
| `workspace_glob_files` | Find files by glob pattern (`**/*.sql`) | Medium |

---

## 6. Prompt Issues

### 6.1 Conflicting guidance

**Line 49:** "Do NOT call `workspace_list_files` unless the user explicitly asks for project structure."

**But:** `workspace_update_file`, `workspace_delete_node`, `workspace_revert_to_version`, and `workspace_apply_multi_file` all require UUID node_ids that can ONLY be obtained from `workspace_list_files` or `workspace_search_files`.

**Fix:** Either make all tools accept filenames (recommended) or change the prompt to allow `workspace_list_files` for finding node_ids.

### 6.2 `sql_get_constraints` hallucination

The AI called `sql_get_constraints` which doesn't exist. The correct name is `sql_get_constraint_report`. The tool list in the prompt should use the exact tool names.

**Fix:** Add `sql_get_constraint_report` to the prompt's tool list. (Already done in previous edit.)

### 6.3 `workspace_apply_diff` parameter description

Prompt says "list of old_text/new_text pairs" but the actual parameter is `changes` as an array of `{old_text, new_text}` objects. Close enough but could be clearer.

---

## 7. Backend Route Issues

### 7.1 PATCH route — `backend_client.patch` lacks error handling

`backend_client.patch` at line 73 of `backend_client.py` uses `resp.raise_for_status()` without the enhanced error parsing that `get` and `post` have. If PATCH returns a 4xx/5xx with a JSON error body, the LLM gets a generic `HTTPStatusError` instead of the actual error message.

**Affects:** `workspace_update_file`, `workspace_patch_file`, `workspace_apply_diff`, `workspace_revert_to_version`, `workspace_apply_multi_file`.

### 7.2 POST route — Content length limit

**Line 308:** 5 MB content limit. Fine for SQL files but worth documenting.

### 7.3 PATCH route — Version number race condition

**Line 324:** Uses `maybeSingle()` for version lookup. If two concurrent PATCH requests read the same version_number and both try to insert `nextVer + 1`, one will fail with a unique constraint violation (if one exists) or create duplicate version numbers.

---

## 8. Recommendations (Priority Order)

### P0 — Must Fix
1. **`workspace_create_file` return `node_id`** — 1 line fix, massive impact on efficiency
2. **`workspace_create_folder` return `node_id`** — Same
3. **Remove checkpoint tools** — Dead code, 3 tools → 0
4. **Shared `_resolve_node_id()` helper** — DRY up filename resolution, fix ambiguity

### P1 — Should Fix
5. **`workspace_search_files` concurrency limit** — Prevent 100 parallel requests
6. **`workspace_update_file` accept filenames** — Consistency with other tools
7. **`backend_client.patch` error handling** — Better error messages for failures
8. **`workspace_apply_diff` overlap validation** — Prevent corrupted edits

### P2 — Nice to Have
9. **`workspace_search_files` truncation warning**
10. **`workspace_apply_multi_file` rename (drop "atomic" claim)**
11. **`workspace_delete_node` accept filenames**
12. **`workspace_revert_to_version` accept filenames**
13. **`workspace_update_file` skip wasteful GET**

### P3 — Future
14. **`workspace_glob_files` tool**
15. **`workspace_diff_files` tool**
16. **Backend: move, copy, restore, permanent delete endpoints**
