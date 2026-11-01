# Relations, history and custom fields

## Relations

`link_entries {from_id, to_id, type, reason?}` relates two entries. Read it as "from_id <type> to_id".

| Type | Meaning |
| --- | --- |
| `blocks` | from_id blocks to_id |
| `depends_on` | from_id depends on to_id |
| `resolves` | from_id resolves to_id |
| `related_to` | loosely related |

- An entry cannot relate to itself, both entries must exist, and the same relation cannot be created twice (error "that relation already exists").
- For `blocks` and `depends_on` the direct reverse is refused (1 blocks 2, then 2 blocks 1). Longer cycles (1 blocks 2, 2 blocks 3, 3 blocks 1) are **not** detected: check `get_relations` before closing a loop.
- `unlink_entries {from_id, to_id, type}` removes one relation and is safe to repeat, so it never tells you whether one existed.
- `create_links {links:[{from_id|from_external_id, to_id|to_external_id, type, reason?}]}` creates 1 to 100 relations atomically (all or none; the error names the failing link as `link N`). One of id or external_id per end. A relation that already exists counts in `existing` instead of failing, so repeating the call is safe. The same rules apply: no self-relations, and the direct reverse of `blocks` and `depends_on` is refused.
- `get_relations {id, type?}` returns `relations` (starting at the entry) and `backlinks` (pointing to it), newest first. To list what blocks an entry, filter `type: "blocks"` and read `backlinks`.
- Relations do not change statuses: closing a blocker does not unblock anything by itself.

## History

`entry_history {id}` (or `external_id` instead of `id`) returns `changes`, newest first, one row per changed field: `field` (`content`, `raw_text`, `category`, `status`, `status_reason`, `due_date`, `custom_fields`), `old_value`, `new_value`, `changed_at`.

- One edit usually writes several rows (changing the text changes `content` and `raw_text`).
- A `custom_fields` row holds the whole set of fields as JSON before and after.
- Tags and mentions have no row of their own: they follow `raw_text`.
- Changes made by `update_entries` are not recorded, and neither is the creation of an entry.
- An empty `changes` list means the entry was never edited with `update_entry` or the `edit` command.
- There is no rollback tool: it restores field by field and not tags or mentions, so it could leave an entry inconsistent.

## Schemas and custom fields

A schema belongs to a category and lists its fields. Without one, any custom field name is accepted.

`get_schema {category}` returns `defined`, `version` and `fields`. `define_schema {category, fields}`:

- **replaces the whole definition** and raises the version, so call `get_schema` first and send every field you want to keep;
- takes per field: `name` (no quotes or backslashes, unique), `type` (`enum`, `text`, `number`, `date`), `required`, `description`, `values` (needed for `enum`), `min`, `max`;
- `text`: `max` is the longest length; `number`: `min` and `max` bound the value (0 means no limit); `date`: `YYYY-MM-DD`;
- does not rewrite entries, and is marked destructive because it overwrites the previous definition.

Setting values:

- `create_entry {raw_text, custom_fields: {...}}` at capture.
- `update_entry {id, set_fields: {...}, remove_fields: [...]}` afterwards. A name cannot be in both. They do not change `raw_text`.
- An entry is checked against the schema of its category only when its custom fields or its category change. A value outside the schema, an undefined field or a missing required field is an error and changes nothing; older entries stay valid until you touch their fields.
- `update_entries` has no custom field changes: use `update_entry` per entry.

Reading and filtering:

- Every entry shows `custom_fields` when it has any (the key is absent otherwise).
- `list_entries {fields: {"priority": "alta"}}` keeps entries whose fields hold all those values, compared for equality. Combine it with the other filters. A boolean also matches the number 1 or 0, so avoid mixing both in one field.
