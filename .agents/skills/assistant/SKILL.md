---
name: assistant
description: Use the `assistant` MCP server (tools mcp__assistant__list_entries, get_entry, create_entry, update_entry, update_entries, delete_entry, link_entries, unlink_entries, get_relations, entry_history, get_schema, define_schema, get_ontology, guide, get_entries, list_tags, agenda, create_entries, append_note, upsert_entry, create_links) to capture, find, edit and close the user's notes, ideas, worries and tasks. Use whenever the user asks what is pending, to capture or log something, to close, dismiss, retag, reschedule or delete entries, to clean up many entries at once, to say that one task blocks or depends on another, to see what changed in an entry, or to add structured custom fields such as priority or area.
---

# Using the assistant MCP

`assistant` stores entries: `idea`, `preocupacion`, `tarea`, `nota`. Only `tarea` has `status`, `status_reason`, `due_date` and `closed_at`. The server sends a short contract on connect and the `guide` tool returns the rules by topic (`markup`, `editing`, `tasks`, `listing`, `batch`, `relations`, `custom-fields`, `types`, `recipes`); this skill is the judgement on top of them. Besides entries it keeps relations between them, a history of changes and optional custom fields per category. Do not invent tools, arguments or statuses: unknown ones are rejected.

Statuses: `pendiente`, `en_curso`, `hecha`, `bloqueada`, `desestimada` (needs `reason`).

## Rules that prevent most mistakes

1. **`raw_text` is the source of truth.** To edit text: `get_entry`, change its `raw_text`, send it as `text`. Never rebuild text from `content`: inline tags and mentions are lost.
2. **Tags are not content.** `search` never finds a tag; use `tags` (all of them) or `any_tags` (at least one). Use `mention` for mentions.
3. **A label is a `#tag`**, not a lone `@kind:value`. An organization is `@org:name`, not `@name` (that is a person).
4. **`due` alone is not "pending".** It matches tasks of any status; combine it with `status`.
5. **Status and due only exist on tasks.** On an idea or nota, set `category: "tarea"` first (or in the same call).
6. **Edits are idempotent.** Repeating an `update_entry` is safe; `changed: false` means nothing was written. Do not verify by provoking an error.
7. **`id` is local to one database.** Use `uid` to refer to an entry across copies.
8. **`delete_entry` is permanent and asks nothing.** Confirm with the user before calling it, and show them the entry first.
9. **Look at the schema before setting custom fields, and at the user's ontology before inventing any.** `get_ontology` lists the facets (tags such as `prioridad-alta`), types and fields the user works with: use them, and when something is missing tell the user instead of creating it (see rule 13). Call `get_schema` for the category (and, for a typed entry, `get_schema {"type": ...}`): with no schema any field name is accepted, with one only its fields and values are. A category schema is strict (a missing required field fails the save); a type schema is progressive (it is reported as `missing`). Values are strings, numbers or booleans.
10. **Spend context on purpose.** Lists are large: pass `view: "compact"` (id, category, content, status, due_date, tags) unless you need `raw_text` or mentions (content is cut to 120 characters, `truncated: true` marks the cut ones; `get_entries` reads one whole), and `return: "minimal"` on writes when you do not need the entry back. Both need format `json` or `text`.
11. **There is no undo.** History is read-only (`entry_history`); do not promise a rollback. To restore a value, read its old value from the history and set it again.
12. **A placeholder is opaque text.** A token such as `RUT_k3f9x2` may stand for data hidden by another tool. Keep it exactly as written, never put `#` or `@` before it (it would become a tag or a mention), keep a `<sensible>` wrapper around it as it is, edit from the current `raw_text`, and never guess the value. If the user needs the original, it is revealed by the tool that made the placeholder, outside this server.
13. **Use the user's vocabulary, never your own.** Read `get_ontology` before capturing; a write's `warnings` show a tag outside its facet, a bare facet value (`alta` for `prioridad-alta`), a variant of an existing tag, or a type or field the ontology does not declare. Fix it with `update_entry` or ask the user; do not create tags, types or schemas the ontology lacks. The file is the user's (`ASSISTANT_ONTOLOGY` or `assistant/ontology.yaml` in the configuration directory); see `guide ontology`.

## Common workflows

- Pending this week: `list_entries {"status":"open","due":"semana","view":"compact"}`. `status` takes one value, an array, or `open` (`pendiente`, `en_curso`, `bloqueada`); `due` accepts `vencida`, `hoy`, `semana`.
- Several notes at once: `create_entries {"entries":[{"raw_text":"[tarea] a"},{"raw_text":"[nota] b"}],"return":"minimal"}` is atomic. Add `external_id` to each record when the call may be retried: the same key updates instead of duplicating.
- Progress on an entry without resending its text: `append_note {"id":12,"text":"Enviado a Legal"}` adds a dated line before the trailing tags.
- Closing with evidence: `update_entry {"id":13,"status":"hecha","note":"push done; AVA still pending"}`; the note goes to `entry_history`, not to the entry.
- Start of day: `agenda {}` returns overdue, due today, in progress, blocked and changed today in one compact call; pass `date` for another day, `limit` (default 20 per group) and `content_max` to size it, and read `more` for the groups that had more.
- Things you analyze one at a time (components, systems): key each with `external_id` and create it with `upsert_entry {"external_id":"repo:payments-api","raw_text":"[nota] Payments API #componente"}`. Later send only what you learned: `upsert_entry {"external_id":"repo:payments-api","add_tags":["critico"],"set_fields":{"owner":"pagos"}}` adds to the tags and fields and keeps the text. `get_entry`, `update_entry`, `append_note`, `get_relations` and `entry_history` take `external_id` instead of `id` (exactly one of the two).
- Dependencies in one call: `create_links {"links":[{"from_external_id":"repo:payments-api","to_external_id":"db:payments","type":"depends_on"}]}` is atomic and safe to repeat; an existing relation counts in `existing`.
- Components of a kind (service, library) with required fields: `define_schema {"type":"servicio","fields":[{"name":"owner","type":"text","required":true}]}` once, then `upsert_entry {"external_id":"repo:payments-api","raw_text":"[nota] Payments API #componente","type":"servicio"}`. Saving never fails for a missing required field: read `missing` and `complete` in the result, and send the rest later with `set_fields`. A type with no schema is saved with a `warning`: when the user has an ontology, use a type it declares or ask the user; otherwise define it. See `guide types`.
- What is still incomplete: `list_entries {"type":"servicio","complete":false,"view":"compact"}` lists the typed entries that lack a required field, each with its `missing`. A field the type does not define, or a value that breaks its definition, still fails.
- What is left to analyze: `list_entries {"tags":["componente"],"fields":{"owner":{"exists":false}},"view":"compact"}`. `fields` also takes `{"in":["a","b"]}` and `{"contains":"text"}`.
- Several entries by id: `get_entries {"ids":[3,7],"view":"compact"}`; `missing` lists unknown ids.
- Before tagging: `get_ontology {"section":"facets"}` shows the tags the user uses (`prioridad-alta`, `pais-cl`). For a tag outside any facet, look the concept up, do not list everything: `list_tags {"prefix":"sev"}` or `{"search":"alta"}`; `min_count` and `limit` trim the rest. Reuse what you find: variants (`sev_alta`, `sev-alta`) split the filter, and a write's `warnings` name them.
- Leave out noise: `list_entries {"exclude_types":["app_cluster"],"exclude_tags":["repo"],"sort_by":"updated_at","view":"compact"}` lists the latest work without a bulk import. An empty array is an error; omit the argument instead.
- Done yesterday: `list_entries {"status":"hecha","date_field":"closed_at","since":"2026-10-15","until":"2026-10-15"}`. `closed_at` is when a task was closed; `updated_at` also moves with edits.
- Capture: `create_entry {"raw_text":"[tarea] Llamar a Laura #urgente @laura"}`. Category defaults to `nota`. `create_entry` has no `due`: when the user gives a deadline, use `upsert_entry` with `due` or follow with `update_entry {"id":12,"due":"2026-10-30"}`. No deadline given means no due date; never invent one. `@fecha:` is not a deadline (it sets `occurred_on`).
- Close: `update_entry {"id":12,"status":"hecha","return":"minimal"}`. Reopen with `"pendiente"`.
- Dismiss: `update_entry {"id":12,"status":"desestimada","reason":"Duplicada"}`.
- Retag: `update_entry {"id":12,"remove_tags":["borrador"],"add_tags":["publicado"]}`.
- Paging: while `has_more` is true, repeat the call with `offset` = `next_offset`.
- Task 3 blocks task 7: `link_entries {"from_id":3,"to_id":7,"type":"blocks","reason":"3 needs 7"}`. What blocks 7: `get_relations {"id":7,"type":"blocks"}` and read `backlinks`.
- What changed in an entry: `entry_history {"id":12}`, newest first, one row per changed field.
- Something the model lacks (follow-up on a third party, sensitive data, priority): `guide {"topic":"recipes"}` shows how to define it as a custom field.
- Set a custom field: `update_entry {"id":12,"set_fields":{"priority":"alta"}}`; remove with `remove_fields`; find with `list_entries {"fields":{"priority":"alta"}}`.

## Weekly goals

A weekly goal is a `tarea` of type `objetivo_semanal` with `week_start` (Monday) and `rank` (`principal` or `secundario`); its due date is the Sunday. Check `get_schema {"type":"objetivo_semanal"}` before the first one and define it if missing. Recipes and calls: `references/weekly-goals.md`. The rules are for the user's benefit, so they are advice, not limits:

- At most 3 open goals per week, one of them `principal`. A fourth: say the week is full, offer to swap or defer, create it only if the user insists.
- Before the user commits to a week, read the overdue, blocked and due-this-week tasks and give the counts. If they are high, suggest fewer or smaller goals.
- Link a goal only to the tasks the user picks.
- Close the week by asking, per open goal: carry over, move the date, or dismiss with a reason. Apply nothing before the answer.
- Say "left from last week", never failure, delay or debt, even when `agenda` says `overdue`.
- Change no status, date or link, and delete nothing, on your own initiative.
- If the user feels overloaded, offer a lighter week. Do not diagnose or give clinical advice.

## Changing many entries (`update_entries`)

`update_entries` filters are only `category`, `tags`, `any_tags`, `mention`, `search`, or explicit `ids` (1-500); filters win over `ids`. `status`, `reason`, `due`, `clear_due`, `add_tags`, `remove_tags`, `add_mentions` and `remove_mentions` are **changes**, never filters. The call is all-or-nothing and returns `{matched, changed, unchanged, errors, error_details}`.

Because status and due are not filters, select by listing first:

1. `list_entries {"status":"pendiente","due":"vencida"}` and read the `id`s.
2. Show the user what will change when it is more than a handful, then call `update_entries {"ids":[3,7,12],"status":"hecha"}`.
3. Check `matched` equals the number of ids you sent.

`{"tags":["sprint_10"],"add_tags":["v2"]}` is a valid filter-plus-change call; `{"status":"pendiente","status":"hecha"}` is not.

## Going deeper

- `references/queries.md`: ordering, calendar-day ranges and any-tag selection, each with the expected result.
- `references/relations-history-fields.md`: relation types and limits, how to read the history, and how to define and use schemas and custom fields.
- `references/weekly-goals.md`: the `objetivo_semanal` type, the recipes to set, link and close a week, and the wording rules.
- `references/markup-and-editing.md`: how markup becomes `content`, trailing metadata blocks, text-only edits, how a placeholder for hidden data survives the parser, and the full list of common mistakes.
