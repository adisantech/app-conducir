# Query patterns for `list_entries`

Sorts and ranges never select a category or status: add those filters yourself. Filters combine with AND.

## Ordering

Old pending work, oldest first:

```json
{"status":"pendiente","sort_by":"created_at","order":"asc"}
```

Tasks untouched longest (a missing update time counts as the capture time):

```json
{"category":"tarea","sort_by":"updated_at","order":"asc"}
```

Approaching deadlines, undated tasks last:

```json
{"status":"pendiente","sort_by":"due_date"}
```

`order` requires `sort_by`. Defaults: descending for timestamps, ascending for due dates. IDs break ties in the chosen direction. An explicit sort overrides the order of a `due` window but never its filter. Pages are stable only while the data does not change between calls.

## Calendar-day ranges

`date_field` (`created_at`, `updated_at` or `due_date`) is independent of `sort_by` and needs `since` or `until`, written `YYYY-MM-DD`. Both ends are inclusive full days in the server's local zone, DST included.

```json
{"status":"pendiente","date_field":"due_date","since":"2026-10-13","until":"2026-10-15","sort_by":"due_date"}
```

Pending tasks due October 13 and 15 match; one due October 16 and undated ones do not. Untouched tasks through October 13:

```json
{"category":"tarea","date_field":"updated_at","until":"2026-10-13","sort_by":"updated_at","order":"asc"}
```

A field without a bound, a bound without a field, an invalid date or reversed bounds are errors, never silently ignored.

## Any-tag selection

```json
{"status":"pendiente","tags":["urgente"],"any_tags":["casa","trabajo"]}
```

Every result has `urgente` and at least one of `casa` or `trabajo`. `tags` needs all its values; `any_tags` needs one; the two groups combine with AND. An empty `any_tags` adds no restriction, but an empty or invalid member is an error.

## Custom field conditions

`fields` takes the custom fields to test, and all conditions must match. A plain value compares for equality: `{"priority":"alta"}`. An object with exactly one operator tests more:

- `{"owner":{"exists":false}}` keeps the entries that lack `owner`, including entries with no custom fields at all; `true` keeps those that have it.
- `{"estado":{"in":["activo","en_migracion"]}}` keeps any of 1 to 20 values.
- `{"stack":{"contains":"kafka"}}` keeps text fields that hold the substring, ignoring ASCII case; a field that is not text never matches.

Combine it with `tags`: `{"tags":["componente"],"fields":{"owner":{"exists":false}}}` lists the components still without an owner. An unknown operator, two operators in one object or a value of the wrong type is an error naming the field.

## Due windows

`due` is `vencida` (before today), `hoy` (today or earlier) or `semana` (through Sunday of the current Monday-to-Sunday week). It matches tasks of any status, so pair it with `status`. Without `sort_by`, results are ordered by due date, then ID.
