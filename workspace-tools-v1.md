# SQL Editor Workspace Tools — v1 Documentation

## Overview

The Workspace Tools give the SQL Editor AI agent full Cursor/Claude Code-style file management capabilities over a user's PostgreSQL schema project. The agent can list, read, search, create, update, patch, diff, batch-edit, version-revert, move, and delete files and folders — all through a unified tool interface.

**Key design principle:** `project_id`, `user_id`, and `session_id` are **never** LLM parameters. They are auto-injected by the executor from `ExecutionContext` at call time. The LLM only provides tool-specific arguments like `node_id`, `content`, `old_text`, etc.

---

## 1. Workspace Tool Reference

### 1.1 workspace_list_files

| Attribute | Value |
|---|---|
| **Class** | `WorkspaceListFilesTool` |
| **Purpose** | List all files and folders in the current project as a tree with human-readable paths |
| **Parameters** | None (project_id auto-injected) |
| **Backend Endpoint** | `GET /api/service/project-files?project_id=...` |
| **Returns** | `{files: [...], count: N, summary: "icon-path lines"}` |

**Return data per file node:**
```python
{
    "id": "<uuid>",
    "name": "001_users.sql",
    "path": "migrations/001_users.sql",    # computed from parent chain
    "node_type": "file" | "folder",
    "file_extension": "sql",
    "parent_id": "<uuid>" | None,
}
```

**Summary format:** One line per node with emoji icons (📁/📄) and computed paths.

**When to use:** Only when the user explicitly asks for project structure. For simple edits, `workspace_search_files` is faster and more targeted.

---

### 1.2 workspace_read_file

| Attribute | Value |
|---|---|
| **Class** | `WorkspaceReadFileTool` |
| **Purpose** | Read the latest content of a project file |
| **Parameters** | `node_id` (string) — UUID or filename/path |
| **Backend Endpoint** | `GET /api/service/project-files/{resolved_uuid}` |
| **Returns** | `{id, name, file_extension, content, version_number}` |

**Resolution flow:** The `node_id` parameter goes through `_resolve_node_id()`:
- If it looks like a UUID → used directly
- If it looks like a filename → looked up in the project tree
- If ambiguous → error with list of matches

**Content cap:** 6,000 characters injected into LLM context (configured in `_TOOL_RESULT_CAPS`).

---

### 1.3 workspace_search_files

| Attribute | Value |
|---|---|
| **Class** | `WorkspaceSearchFilesTool` |
| **Purpose** | Grep-like search across all SQL files in the project |
| **Parameters** | `query` (string, required), `file_extension` (string, default "sql") |
| **Backend Endpoint** | `GET /api/service/project-files` (list) + `GET /api/service/project-files/{id}` (read each file) |
| **Returns** | `{matches: [...], match_count, files_searched, total_files, truncated, summary}` |

**How it works:**
1. Lists all project files via backend
2. Filters to files matching `file_extension`
3. Caps at **100 files** (warns if truncated); reads with max **10 concurrent** requests
4. Compiles regex pattern (falls back to escaped literal on regex error)
5. Searches line-by-line, caps at **100 matches** total
6. Returns matches with `{file, node_id, line, text[:200]}`

**Result cap:** 3,000 characters.

---

### 1.4 workspace_create_file

| Attribute | Value |
|---|---|
| **Class** | `WorkspaceCreateFileTool` |
| **Purpose** | Create a new file in the workspace |
| **Parameters** | `name` (string, required), `content` (string, default ""), `parent_id` (string, optional) |
| **Backend Endpoint** | `POST /api/service/project-files` |
| **Returns** | `{node_id, name, file_extension, version_number, message}` |

**Path-aware creation:** If `name` contains `/` (e.g., `"migrations/002_orders.sql"`), the backend:
1. Parses into folder path + filename
2. Creates missing parent folders automatically (or reuses existing)
3. Creates the file under the resolved parent

**Duplicate handling:** If a file with the same name exists under the same parent, it **updates** the existing file instead of creating a duplicate.

**Special values:** `parent_id` of `""`, `"root"`, or `None` → project root.

---

### 1.5 workspace_update_file

| Attribute | Value |
|---|---|
| **Class** | `WorkspaceUpdateFileTool` |
| **Purpose** | Overwrite the entire content of an existing file (creates a new version) |
| **Parameters** | `node_id` (string, required), `content` (string, required) |
| **Backend Endpoint** | `PATCH /api/service/project-files/{resolved_uuid}` with `{"content": ...}` |
| **Returns** | `{success, node_id, version_number, message}` |

**Rule:** ALWAYS call `workspace_read_file` first. The AI must know current content before overwriting.

---

### 1.6 workspace_patch_file

| Attribute | Value |
|---|---|
| **Class** | `WorkspacePatchFileTool` |
| **Purpose** | Targeted text replacement — the **most used** editing tool |
| **Parameters** | `node_id` (string), `old_text` (string), `new_text` (string), `preview_only` (boolean, default false) |
| **Backend Endpoint** | Reads via `GET`, saves via `PATCH /api/service/project-files/{id}` |
| **Returns** | `{success, node_id, file_name, version_number, lines_changed, old_preview, new_preview, message}` |

**Validation:**
- `old_text` must appear **exactly once** in the file
- If 0 occurrences → error: "not found, read file first"
- If 2+ occurrences → error: "appears N times, provide more context"

**Preview mode:** `preview_only=true` returns proposed content without saving.

---

### 1.7 workspace_apply_diff

| Attribute | Value |
|---|---|
| **Class** | `WorkspaceApplyDiffTool` |
| **Purpose** | Apply multiple changes to ONE file atomically (multi-hunk edit) |
| **Parameters** | `node_id` (string), `changes` (array of `{old_text, new_text}`), `preview_only` (boolean) |
| **Backend Endpoint** | Reads via `GET`, saves via `PATCH` |
| **Returns** | `{success, node_id, file_name, version_number, changes_applied, changes: [{old_preview, new_preview}], message}` |

**Validation:**
- Each `old_text` must appear exactly once
- All ranges must be **non-overlapping**
- Changes applied in **reverse order** (so positions stay valid)

**Use case:** Adding multiple tables, columns, or sections to a single file in one operation.

---

### 1.8 workspace_batch_edit

| Attribute | Value |
|---|---|
| **Class** | `WorkspaceBatchEditTool` |
| **Purpose** | Edit multiple files in one call with **rollback on failure** |
| **Parameters** | `changes` (array of `{node_id, new_content}` or `{node_id, old_text, new_text}`), `preview_only` (boolean) |
| **Backend Endpoint** | Multiple `GET` + `PATCH` calls per file |
| **Returns** | `{success, files_applied, files: [{node_id, file_name, new_version}], message}` |

**Two-phase execution:**
1. **Phase 1 (Validate):** Resolve all node_ids, read all contents, validate old_text occurrences
2. **Phase 2 (Apply):** Apply changes sequentially; on any failure, roll back all already-applied changes by restoring original content

**Rollback handling:** If rollback itself fails, the error message includes which files couldn't be restored.

---

### 1.9 workspace_create_folder

| Attribute | Value |
|---|---|
| **Class** | `WorkspaceCreateFolderTool` |
| **Purpose** | Create a new folder for organizing SQL files |
| **Parameters** | `name` (string, required), `parent_id` (string, optional) |
| **Backend Endpoint** | `POST /api/service/project-files` with `{"is_folder": true}` |
| **Returns** | `{node_id, name, message}` |

---

### 1.10 workspace_delete_node

| Attribute | Value |
|---|---|
| **Class** | `WorkspaceDeleteNodeTool` |
| **Purpose** | Soft-delete (trash) a file or folder |
| **Parameters** | `node_id` (string) |
| **Backend Endpoint** | `DELETE /api/service/project-files/{resolved_uuid}` |
| **Returns** | `{success, message: "Node moved to trash"}` |

**Implementation:** Sets `trashed_at` timestamp on the `workspace_nodes` row. Files are not permanently destroyed. Only use when the user explicitly asks to delete.

---

### 1.11 workspace_move_node

| Attribute | Value |
|---|---|
| **Class** | `WorkspaceMoveNodeTool` |
| **Purpose** | Move a file/folder to a different parent folder |
| **Parameters** | `node_id` (string), `parent_id` (string, optional — null for root) |
| **Backend Endpoint** | `PATCH /api/service/project-files/{id}` with `{"parent_id": ...}` |
| **Returns** | `{success, node_id, parent_id, message}` |

**Parent resolution:** If `parent_id` looks like a folder name (not UUID), searches the project tree for a matching folder node. Validates that parent exists and belongs to the same project. Prevents moving a node into itself.

---

### 1.12 workspace_get_versions

| Attribute | Value |
|---|---|
| **Class** | `WorkspaceGetVersionsTool` |
| **Purpose** | List all versions of a file |
| **Parameters** | `node_id` (string) |
| **Backend Endpoint** | `GET /api/service/project-files/{id}/versions` |
| **Returns** | `{node_id, file_name, versions: [{version_number, created_at, content_preview, content_length}], count, message}` |

**Note:** Since migration 020, content lives directly in the `files` table (not `file_versions`). Currently returns a single-version list. Caps at 20 versions.

---

### 1.13 workspace_revert_to_version

| Attribute | Value |
|---|---|
| **Class** | `WorkspaceRevertToVersionTool` |
| **Purpose** | Revert a file to a previous version (creates NEW version, history preserved) |
| **Parameters** | `node_id` (string), `version_number` (integer) |
| **Backend Endpoint** | `GET` versions + `PATCH` to write old content as new version |
| **Returns** | `{success, node_id, file_name, reverted_to, new_version, content_length, message}` |

---

## 2. Complete Flow: User Query to Tool Result

```
User: "Add an email column to the users table"
         │
         ▼
┌─────────────────────────────────────────────────┐
│  1. INTENT CLASSIFICATION (tool_intent.py)      │
│  ─────────────────────────────────────────────  │
│  _detect_intent_from_query() scans for keywords:│
│  - "add column" → "migration" intent            │
│  - "email" + "users" → might trigger "write"    │
│  Result: intent = "migration"                    │
│                                                  │
│  Maps to tool group via _LLM_INTENT_TO_GROUP     │
│  "migration" → migration tools + WORKSPACE_TOOLS │
│  (full _WORKSPACE_TOOLS set available)           │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  2. TOOL FILTERING                               │
│  ─────────────────────────────────────────────  │
│  _get_tools_for_intent(registry, "migration")    │
│  - Gets all tool schemas from ToolRegistry       │
│  - Filters to allowed set: migration tools       │
│    + _WORKSPACE_TOOLS + _ALWAYSON_TOOLS          │
│  - Converts to OpenAI function-calling format    │
│  - Sent as `tools` parameter to LLM              │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  3. LLM SELECTS & CALLS TOOLS                    │
│  ─────────────────────────────────────────────  │
│  LLM follows prompt instructions:                │
│  1. workspace_search_files(query="CREATE TABLE   │
│     users") → finds users.sql                    │
│  2. workspace_read_file(node_id="users.sql")     │
│  3. workspace_patch_file(node_id="users.sql",    │
│     old_text=")",                                │
│     new_text="    email text,\n)")               │
│                                                  │
│  Each call → ToolExecutor.execute()              │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  4. TOOL EXECUTION (executor.py)                 │
│  ─────────────────────────────────────────────  │
│  ToolExecutor wraps each call with:              │
│  - Dedup cache check (skip if identical args)    │
│  - 30-second timeout (asyncio.wait_for)          │
│  - Retry with exponential backoff:               │
│    0.5s → 1s → 2s (max 2 retries)               │
│  - Permanent failure detection (404, syntax      │
│    errors skip retry)                            │
│  - Context injection:                            │
│    user_id, project_id, session_id,              │
│    connection_id, schema_name                    │
│                                                  │
│  Calls registry.execute() → tool.execute()       │
│  → BackendClient HTTP call → Node.js backend     │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  5. RESULT FORMATTING (context_manager.py)       │
│  ─────────────────────────────────────────────  │
│  _format_tool_result_for_llm():                  │
│  - Applies per-tool character cap              │
│    (e.g., workspace_read_file: 6,000 chars)     │
│  - For content results: truncates middle if      │
│    over cap (keeps first/last halves)            │
│  - For non-content: JSON serializes + truncates  │
│                                                  │
│  _trim_context_if_needed():                      │
│  - Estimates total tokens (chars // 4 + overhead)│
│  - If > 64,000 tokens: summarizes old tool       │
│    results to one-liners, keeps last 4 intact    │
│  - Hard stop at 90,000 tokens                    │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│  6. LLM RECEIVES FORMATTED RESULT               │
│  ─────────────────────────────────────────────  │
│  Formatted result injected as tool message      │
│  LLM decides: done? → final answer to user      │
│  Or: needs more tools → calls next tool         │
│  Loop continues until MAX_ITERATIONS (15) or     │
│  LLM produces final answer                       │
└─────────────────────────────────────────────────┘
```

---

## 3. How `_resolve_node_id()` Works

Location: `C:\schema-weaver\backend-ai\src\tools\sql_editor\workspace_tools.py`

This function resolves a string reference (passed by the LLM) to an actual UUID node ID. Every workspace tool that accepts a `node_id` parameter uses it.

### Resolution algorithm:

```
Input: node_id string
│
├─ Step 1: UUID check
│  └─ Try uuid.UUID(node_id)
│     ├─ Success → return (node_id, None)  [fast path]
│     └─ Fail → continue to filename lookup
│
├─ Step 2: Parse the reference
│  └─ target_basename = last segment after "/"
│     target_fullpath = full string, lowercased
│     Example: "migrations/002_orders.sql"
│       → basename = "002_orders.sql"
│       → fullpath = "migrations/002_orders.sql"
│
├─ Step 3: Fetch project tree
│  └─ GET /api/service/project-files?project_id=...
│     Build path_map via _build_paths() — walks parent chain
│     for every node to compute human-readable paths
│
├─ Step 4: Search for matches
│  └─ Iterate all file nodes:
│     ├─ Exact full-path match → add to exact_matches
│     └─ Basename match → add to basename_matches
│
├─ Step 5: Resolve
│  ├─ exact_matches:
│  │  ├─ 1 match → return (id, None)
│  │  └─ 2+ matches → error: "Ambiguous path: matches X, Y"
│  ├─ basename_matches (fallback):
│  │  ├─ 1 match → return (id, None)
│  │  └─ 2+ matches → error: "Ambiguous filename: matches X, Y. Use full path"
│  └─ No matches → error: "File not found. Available: file1, file2, ..."
│
└─ Step 6: Network error
   └─ return (None, "Failed to resolve file: <error>")
```

### Key behaviors:

- **Fast path:** UUID format bypasses all network calls
- **Preferred match:** Exact full path > basename
- **Ambiguity handling:** Returns helpful error listing all matches
- **Not-found handling:** Lists up to 10 available files as suggestions
- **Used by:** workspace_read_file, workspace_update_file, workspace_patch_file, workspace_apply_diff, workspace_delete_node, workspace_move_node, workspace_get_versions, workspace_revert_to_version, workspace_batch_edit

---

## 4. Tool Result Formatting for LLM Context

Location: `C:\schema-weaver\backend-ai\src\agents\sql_editor\context_manager.py`

### Per-tool size caps (`_TOOL_RESULT_CAPS`):

| Tool | Cap |
|---|---|
| `workspace_read_file` | 6,000 chars |
| `workspace_search_files` | 3,000 chars |
| `workspace_list_files` | 2,000 chars |
| `sql_get_schema` | 4,000 chars |
| `sql_list_tables` | 2,000 chars |
| `db_pull_schema` | 8,000 chars |
| `db_diff_schema` | 6,000 chars |
| `db_migration_history` | 2,000 chars |
| **Default** | 4,000 chars |

### Formatting rules by data type:

**1. File content results** (`"content"` key present):
- Serializes metadata (id, name, version) as JSON header
- Appends raw content (SQL text) after header
- If over cap: keeps **first half** and **last half** with middle omission note
- This ensures the LLM sees both the beginning (schema definitions) and end (closures) of files

**2. Schema results** (`"columns"` key present):
- Keeps full column metadata: `name`, `type`, `nullable`, `is_pk`, `is_fk`
- Drops verbose constraint details, indexes, triggers
- Serializes as indented JSON, truncates if over cap

**3. Row results** (`"rows"` key present):
- Reduces to first 10 rows (from potentially 25+)
- Adds note: `"showing 10 of N rows (full data in memory)"`
- Full data retained in WorkingMemory for artifact building

**4. General dict/list results:**
- JSON serialized with 2-space indent
- Truncated at cap with `...(truncated)` suffix

### Context compression (`_trim_context_if_needed`):

When estimated tokens exceed **64,000**:
- System message: kept intact
- Last 4 tool exchanges: kept intact (recent context matters most)
- Older tool results: compressed to structured one-liners via `_summarize_tool_exchange()`
- User/assistant messages: never removed

**Summary examples:**
- `workspace_read_file` → `[file] schema.sql (45 lines)`
- `sql_get_schema` → `[schema] users: id:uuid, name:text, email:text...(+3) PK=id`
- `sql_list_tables` → `[tables] 12 tables: users, orders, products...(+4)`

**Hard stop:** At **90,000** tokens, the loop is forcibly broken.

---

## 5. Tool Groups and Intent Mappings

Location: `C:\schema-weaver\backend-ai\src\agents\sql_editor\tool_intent.py`

### All workspace tools set:

```python
_WORKSPACE_TOOLS = frozenset({
    "workspace_list_files",
    "workspace_read_file",
    "workspace_search_files",
    "workspace_create_file",
    "workspace_update_file",
    "workspace_patch_file",
    "workspace_apply_diff",
    "workspace_batch_edit",
    "workspace_move_node",
    "workspace_create_folder",
    "workspace_delete_node",
    "workspace_get_versions",
    "workspace_revert_to_version",
})

_MINIMAL_WORKSPACE_TOOLS = frozenset({
    "workspace_search_files",
    "workspace_list_files",
    "workspace_read_file",
    "workspace_create_file",
    "workspace_update_file",
    "workspace_patch_file",
    "workspace_create_folder",
})
```

### Intent → tool group mapping:

| Intent | Keyword triggers | Workspace tools available |
|---|---|---|
| **chat** | hello, hi, thanks, who are you | `workspace_list_files` (read-only only) |
| **plan** | "make a plan", "design the database" | `_MINIMAL_WORKSPACE_TOOLS` + `ask_clarification` |
| **query** | select, join, find, show me, query | `workspace_read_file`, `workspace_search_files`, `workspace_list_files` |
| **write** | write, create, generate, build | `workspace_search_files`, `workspace_read_file`, `workspace_create_file`, `workspace_patch_file`, `workspace_apply_diff`, `workspace_update_file`, `workspace_batch_edit`, `workspace_move_node` |
| **debug** | error, fix, broken, failing | `workspace_search_files`, `workspace_read_file`, `workspace_patch_file`, `workspace_apply_diff` |
| **optimize** | optimize, slow, performance, index | `workspace_search_files`, `workspace_read_file`, `workspace_patch_file`, `workspace_apply_diff` |
| **refactor** | refactor, rewrite, clean up, format | `workspace_search_files`, `workspace_read_file`, `workspace_patch_file`, `workspace_apply_diff`, `workspace_batch_edit` |
| **migration** | migration, alter table, create table, add column | Full `_WORKSPACE_TOOLS` (all 12) |
| **workspace** | workspace, file, save, list files, my files | Full `_WORKSPACE_TOOLS` + `terminal_run_sw`, `db_get_project_connection` |
| **research** | search, latest, 2026, tutorial | None (web_search, web_fetch only) |

### Always-available tools:
```python
_ALWAYSON_TOOLS = frozenset({"ask_clarification"})
```

### Intent re-check:
Intent is re-detected every `_INTENT_RECHECK_INTERVAL` (3) iterations to handle mid-conversation topic changes.

---

## 6. Backend Storage Model

Location: `C:\schema-weaver\backend\routes\service\project-files.routes.js`

### Database schema:

**`workspace_nodes` table** — the tree structure:
```
id              UUID (primary key)
project_id      UUID (foreign key)
parent_id       UUID (nullable — null = project root)
name            TEXT
node_type       TEXT ('file' | 'folder')
sort_order      INTEGER
trashed_at      TIMESTAMP (nullable — soft delete)
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

**`files` table** — file content and metadata (since migration 020):
```
id              UUID (primary key)
node_id         UUID (foreign key → workspace_nodes.id)
file_extension  TEXT (e.g., "sql", "md")
content         TEXT (the actual SQL/file content)
version_number  INTEGER (auto-incremented on each update)
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### Key design decisions:

1. **Content moved to `files` table** (migration 020): Previously stored in `file_versions`. Now content lives directly in `files` for simpler reads.

2. **Soft delete:** `trashed_at` column on `workspace_nodes` — all queries filter `WHERE trashed_at IS NULL`.

3. **Version tracking:** `version_number` increments on each content update. The PATCH endpoint calls `update_file_content` RPC or manually increments.

4. **Atomic file creation:** `create_file_with_version` PostgreSQL function creates both `workspace_nodes` and `files` rows atomically.

5. **Path-aware creation:** The POST endpoint parses `/`-separated names, auto-creates parent folders, and reuses existing folders with matching names under the same parent.

### API endpoints:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/service/project-files?project_id=...` | List tree (no content) |
| `GET` | `/api/service/project-files/{nodeId}` | Read file with content |
| `POST` | `/api/service/project-files` | Create file or folder |
| `PATCH` | `/api/service/project-files/{nodeId}` | Update content, name, or parent |
| `DELETE` | `/api/service/project-files/{nodeId}` | Soft-delete (set trashed_at) |
| `GET` | `/api/service/project-files/{nodeId}/versions` | List file versions |

### Authentication:

All routes use service auth (`X-Service-Key` header + `X-User-Id` header). The Python backend calls via `BackendClient` which provides:
- `X-Service-Key`: from `settings.ai_service_key`
- `X-User-Id`: from `ctx.user_id`

The Node.js backend uses the Supabase `service_role` client, bypassing RLS.

---

## 7. File Organization Conventions the AI Follows

Defined in `C:\schema-weaver\backend-ai\src\prompts\sql_editor\react_agent.txt`:

### Core rules:

1. **Observe existing conventions first.** The AI checks existing file naming, folder structure, and SQL style before creating anything new.

2. **Common project patterns:**
   - One file per domain: `auth.sql`, `billing.sql`, `users.sql`
   - One big schema: `schema.sql`
   - Numbered migrations: `migrations/001_init.sql`, `migrations/002_orders.sql`

3. **`.sw/` folder conventions:**
   - Auto-created when the AI saves files there (no manual folder creation needed)
   - `.sw/PLAN.md` — design documents
   - `.sw/ANALYSIS.md` — audit results
   - `.sw/REPORT.md` — analysis reports
   - **Never** put schema files inside `.sw/`

4. **Search before create:** Always `workspace_search_files` to check if a table/file already exists before creating a new one.

5. **Read before write:** Always `workspace_read_file` before `workspace_update_file` or `workspace_patch_file`.

### Tool selection hierarchy (from prompt):

| Scenario | Recommended tool(s) |
|---|---|
| Simple edit (most requests) | `search_files` → `read_file` → `patch_file` (2-3 tools) |
| Create new table | `search_files` (check exists) → `read_file` + `patch_file` OR `create_file` |
| Multi-change to one file (3+) | `read_file` → `apply_diff` (all changes at once) |
| Complex multi-file (new feature) | `search_files` → read each → edit each → confirm |

---

## 8. Error Handling and Retry Logic

### ToolExecutor retry (executor.py):

```python
max_retries: 2
timeout: 30 seconds
backoff: 0.5s → 1.0s → 2.0s
```

**Retriable errors:** Transient issues (connection blips, lock timeouts, server errors).

**Non-retriable errors** (immediate fail, no retry):
- PostgreSQL: "column does not exist", "table does not exist", "relation does not exist", "syntax error", "permission denied"
- HTTP: "404 not found", "403 forbidden", "400 bad request", "401 unauthorized"

### Dedup cache:

Within a single agent run, identical `(tool_name, args)` calls return cached results with 0ms latency. Cache is cleared between runs.

### Per-tool validation errors:

| Tool | Validation | Error message |
|---|---|---|
| `workspace_read_file` | No project open | "No project is currently open" |
| `workspace_read_file` | Empty node_id | "node_id is required. Use workspace_search_files..." |
| `workspace_read_file` | Node not found | "File 'X' not found. Available: ..." |
| `workspace_read_file` | Node is folder | "'X' is a folder, not a file" |
| `workspace_patch_file` | old_text not found | "old_text not found in X. Call workspace_read_file first" |
| `workspace_patch_file` | old_text multiple | "old_text appears N times in X. Must appear exactly once" |
| `workspace_apply_diff` | Overlapping ranges | "changes[N] overlaps with changes[M]" |
| `workspace_batch_edit` | Any change fails | Rollback all applied changes, report failure |
| `workspace_create_file` | No project | "No project is currently open" |
| `workspace_delete_node` | No project | "No project is currently open" |

### Batch edit rollback:

```python
try:
    for state in file_states:
        apply_change(state)
except Exception:
    for rb in rollback_stack:
        restore_original(rb)  # May itself fail
```

If rollback has errors, they are appended to the error message: "Batch edit failed: <original>. Rollback had errors: <rollback errors>"

---

## 9. Token Caps and Context Management

Location: `C:\schema-weaver\backend-ai\src\agents\sql_editor\config.py`

### Token budget:

| Parameter | Value | Purpose |
|---|---|---|
| `MAX_ITERATIONS` | 15 | Hard cap on ReAct loop iterations |
| `_COMPRESS_THRESHOLD_TOKENS` | 64,000 | Start summarizing old tool results |
| `_HARD_STOP_TOKENS` | 90,000 | Force-break the loop |
| `_MAX_ITERATION_TOKENS` | 50,000 | Per-iteration budget guard |
| `_INTENT_RECHECK_INTERVAL` | 3 | Re-detect intent every N iterations |

### Token estimation:

```python
tokens ≈ len(content) // 4 + (4 tokens per message overhead)
```

For tool calls, includes `tool_calls[].function.arguments` length.

### Compression strategy:

```
Total estimated tokens < 64,000 → No compression
64,000 ≤ tokens < 90,000 → Summarize old tool results, keep last 4
tokens ≥ 90,000 → Hard stop
```

Old tool results compressed to structured one-liners that preserve key metadata (table names, column names, types, row counts) while reducing verbose output to ~100-200 characters.

---

## 10. Common User Scenarios and Expected Tool Flows

### Scenario 1: "Add email column to users table"

```
1. workspace_search_files(query="CREATE TABLE users")
   → finds users.sql at node_id=abc-123
2. workspace_read_file(node_id="users.sql")
   → reads current content
3. workspace_patch_file(
     node_id="users.sql",
     old_text="    name text,\n)",
     new_text="    name text,\n    email text,\n)"
   )
   → patches file, creates new version
Result: "Added email column to users table in users.sql."
```

### Scenario 2: "Create a new orders table"

```
1. workspace_search_files(query="CREATE TABLE orders")
   → no matches
2. workspace_list_files()
   → sees project uses migrations/ folder with numbered files
3. workspace_create_file(
     name="migrations/003_orders.sql",
     content="CREATE TABLE orders (\n    id uuid PRIMARY KEY,\n    ...);\n"
   )
   → creates file (auto-creates migrations/ folder if needed)
Result: "Created migrations/003_orders.sql with orders table."
```

### Scenario 3: "Show me my project structure"

```
1. workspace_list_files()
   → returns full tree with paths
Result: Tree display with file/folder icons
```

### Scenario 4: "Where is the users table defined?"

```
1. workspace_search_files(query="CREATE TABLE users")
   → returns match at users.sql line 1
2. workspace_read_file(node_id="users.sql")
   → reads full file content
Result: "The users table is defined in users.sql. It has columns: id, name, ..."
```

### Scenario 5: "Rename city column to location in addresses.sql"

```
1. workspace_read_file(node_id="addresses.sql")
   → finds "    city text," at line 5
2. workspace_patch_file(
     node_id="addresses.sql",
     old_text="    city text,",
     new_text="    location text,"
   )
Result: "Renamed city to location in addresses.sql."
```

### Scenario 6: "Undo my last change to schema.sql"

```
1. workspace_get_versions(node_id="schema.sql")
   → lists versions: v1, v2, v3
2. workspace_revert_to_version(
     node_id="schema.sql",
     version_number=2
   )
   → reverts to v2, creates new v4
Result: "Reverted schema.sql to v2 (now v4)."
```

### Scenario 7: "Refactor naming across all files"

```
1. workspace_search_files(query="usr_")
   → finds matches in auth.sql, billing.sql, users.sql
2. workspace_batch_edit(changes=[
     {node_id: "auth.sql", old_text: "usr_id", new_text: "user_id"},
     {node_id: "billing.sql", old_text: "usr_id", new_text: "user_id"},
     {node_id: "users.sql", old_text: "usr_id", new_text: "user_id"},
   ])
   → validates all, applies atomically with rollback on failure
Result: "Updated 3 files. Renamed usr_id to user_id."
```

### Scenario 8: "Delete the test_queries.sql file"

```
1. workspace_delete_node(node_id="test_queries.sql")
   → soft-deletes the file
Result: "Moved test_queries.sql to trash."
```

### Scenario 9: "Move auth.sql into the migrations folder"

```
1. workspace_move_node(node_id="auth.sql", parent_id="migrations")
   → resolves "migrations" to folder UUID, moves file
Result: "Moved auth.sql to migrations/."
```

### Scenario 10: "Make multiple changes to schema.sql"

```
1. workspace_read_file(node_id="schema.sql")
2. workspace_apply_diff(
     node_id="schema.sql",
     changes=[
       {old_text: "-- end", new_text: "CREATE TABLE roles (...);\n-- end"},
       {old_text: "name text", new_text: "name text NOT NULL"},
       {old_text: "age integer", new_text: "age integer CHECK (age > 0)"},
     ]
   )
   → validates all 3 changes, applies atomically
Result: "Applied 3 changes to schema.sql (v5)."
```

---

## Appendix: File Locations

| File | Path |
|---|---|
| Workspace tools (all 13 classes) | `C:\schema-weaver\backend-ai\src\tools\sql_editor\workspace_tools.py` |
| Tool registry (registration) | `C:\schema-weaver\backend-ai\src\tools\sql_editor\registry.py` |
| Intent classification | `C:\schema-weaver\backend-ai\src\agents\sql_editor\tool_intent.py` |
| AI prompt | `C:\schema-weaver\backend-ai\src\prompts\sql_editor\react_agent.txt` |
| Context management | `C:\schema-weaver\backend-ai\src\agents\sql_editor\context_manager.py` |
| Backend routes | `C:\schema-weaver\backend\routes\service\project-files.routes.js` |
| Tool executor | `C:\schema-weaver\backend-ai\src\tools\executor.py` |
| Config (caps, limits) | `C:\schema-weaver\backend-ai\src\agents\sql_editor\config.py` |
| Base tool class | `C:\schema-weaver\backend-ai\src\tools\base.py` |
| Backend HTTP client | `C:\schema-weaver\backend-ai\src\core\backend_client.py` |
