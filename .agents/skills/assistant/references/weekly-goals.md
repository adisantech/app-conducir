# Weekly goals

A weekly goal is a `tarea` of type `objetivo_semanal`. Every call below was run against a scratch database. The week runs Monday to Sunday: `week_start` is the Monday, the due date is the Sunday.

## Set up the type (once per database)

`get_schema {"type":"objetivo_semanal"}` returns `defined: false` when it does not exist. Then:

`define_schema {"type":"objetivo_semanal","fields":[{"name":"week_start","type":"date","required":true,"description":"Monday of the week"},{"name":"rank","type":"enum","required":true,"values":["principal","secundario"]}]}`

## Set a goal

One call, safe to repeat (`changed: false` the second time). Key it by week and position:

`upsert_entry {"external_id":"goal:2026-10-19:1","raw_text":"[tarea] Definir plan de custodia","type":"objetivo_semanal","due":"2026-10-25","set_fields":{"week_start":"2026-10-19","rank":"principal"},"return":"minimal"}`

- `create_entry` has no `due`: use `upsert_entry`, or `update_entry {"id":..,"due":".."}` afterwards.
- `@fecha:` in the text sets `occurred_on`, not the due date. Never use it for a deadline.
- A goal missing `week_start` or `rank` is saved and reported in `missing`; `list_entries {"type":"objetivo_semanal","complete":false,"view":"compact"}` finds them.

## Link the tasks that make it up

The goal depends on its tasks. Only link what the user chose:

`create_links {"links":[{"from_external_id":"goal:2026-10-19:1","to_id":4,"type":"depends_on"}]}`

Candidates are open tasks due inside the week, linked to no goal: `list_entries {"status":"open","due":"semana","view":"compact"}`, then `get_relations {"id":N,"type":"depends_on"}` on a task and read `backlinks`: a goal there means the task is already linked. The list also returns the goals themselves, since they are tasks: skip the rows whose `type` is `objetivo_semanal`.

## Count the week and check the load

- Open goals of a week: `list_entries {"type":"objetivo_semanal","fields":{"week_start":"2026-10-19"},"status":"open","view":"compact"}`. At most 3 and one `principal`: more than that, tell the user and ask.
- Load before committing: `list_entries {"status":"open","due":"vencida","view":"compact"}`, `list_entries {"status":"bloqueada","view":"compact"}` and the `semana` list above. Give the counts first; suggest fewer or smaller goals when they are high.

## Close the week

For each goal still open, ask the user; apply nothing before the answer.

- Done: `update_entry {"id":6,"status":"hecha","return":"minimal"}`.
- Carry over: `update_entry {"id":6,"due":"2026-11-01","set_fields":{"week_start":"2026-10-26"},"return":"minimal"}`, then `append_note {"id":6,"text":"Carried over from week 2026-10-19"}`. `update_entry` with `note` fails without a status change, so the line goes in `append_note`.
- Dismiss: `update_entry {"id":6,"status":"desestimada","reason":"Week too heavy"}`; the reason is required.

An open goal after its Sunday is listed by `agenda` under `overdue`. Close the week before that, and say "left from last week", not "overdue".

## Wording and care

- Neutral words: "left from last week", "does not fit this week". Never failure, delay, debt or behind.
- Suggest and ask; never change a status, a date or a link, or delete, without the user's yes.
- If the user says they are overloaded, or recent `preocupacion` entries are about workload, offer a lighter week: fewer goals, smaller goals, a free slot. Do not diagnose or name a condition and do not give clinical advice.
- Deadlines come from the user. No date given means no due date.
