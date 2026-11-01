# Markup and editing

## From `raw_text` to `content`

- `[idea]`, `[preocupacion]`, `[tarea]`, `[nota]` set the category (default `nota`) and are removed from `content`.
- `#tag` becomes a lowercase tag and is removed: `Llamar #urgente` gives content `Llamar`.
- `@name` and `@kind:value` keep their value in `content`: `Llamar @laura` gives `Llamar laura`. Kinds: `person` (default), `file`, `url`, or any lowercase prefix such as `org`.
- **Trailing metadata block:** the tags and mentions at the end of the text, beginning with a tag, leave their mention values out of `content`. `Preferencia de formato #preferencia @user:preferencias` has content `Preferencia de formato`. Without the tag, `Usar tema oscuro @user:preferencias` keeps `preferencias` as a word of the content.
- `\#` and `\@` write a literal `#` or `@`.

## `update_entry`

- `text` is parsed like `create_entry`. With any markup it replaces text, category, tags and mentions.
- `text` with no markup keeps the category and the trailing block and appends them after the new text. Inline markup is not carried over: `Hablar con Pedro` on `Hablar con @laura sobre #release el lunes` drops `@laura` and `#release`. Send the inline markup again.
- `category`, `add_tags`, `remove_tags`, `add_mentions` and `remove_mentions` apply after `text`, removals before additions, and rewrite `raw_text`. Added tags and mentions go into the trailing block. A removed mention outside the block becomes its plain value. A mention added with no block and no added tag stays inline: add a tag with it.
- Removing the last tag of a block returns its mentions' values to `content`. Keep one tag or add a new one in the same call.
- `status`, `reason`, `due` and `clear_due` never change `raw_text`. `due` is `YYYY-MM-DD`, `hoy` or `mañana`; `clear_due: true` removes it. They cannot be combined, and on a non-task they are errors.
- Invalid arguments return an error result and change nothing.

## Placeholders for hidden data

Another tool may replace sensitive data with a placeholder such as `RUT_k3f9x2` before a note is captured. The server keeps the text it receives and cannot reveal the original. The parser reads `#`, `@` and `[category]` as markup, so only some shapes survive. Captured from `assistant capture` on the note `Pagar <x> hoy`:

| Written as `<x>` | Result |
| --- | --- |
| `RUT_k3f9x2`, `(RUT_k3f9x2)`, `RUT:k3f9x2`, `<RUT:k3f9x2>`, `[RUT:k3f9x2]` | kept in `content` unchanged |
| `#RUT_k3f9x2` | lost from `content`: it becomes the tag `rut_k3f9x2` |
| `@RUT_k3f9x2` | stored as the mention `person:RUT_k3f9x2` |
| `RUT[nota]k3f9x2` | the marker is removed: `content` has `RUT k3f9x2`; `[tarea]` also makes the note a task with status `pendiente` |
| `@fecha:k3f9x2` | error: `@fecha:` takes a date |
| `\#RUT_k3f9x2` | the backslash is dropped and `content` gains a `#` |
| `<sensible>RUT_k3f9x2</sensible>` | kept whole; the wrapper has no meaning to the server |
| `<sensible>a #b</sensible>` | data left inside the wrapper is parsed: tag `b`, `content` has `a ` |

What to do as an agent:
- Copy a placeholder verbatim when you rewrite a note; do not expand, shorten, lowercase or drop it.
- Do not add `#` or `@` to it, and do not wrap it in `[ ]`.
- Do not move data into or out of a `<sensible>` wrapper; text left inside is parsed.
- A plain placeholder is found by `search` (it is in `content`); a tag is not.
- Never try to infer the original value. Say that it must be revealed by the tool that created the placeholder.

## Common mistakes

| Mistake | What happens | Do this instead |
| --- | --- | --- |
| A `#` or `@` before a placeholder, `#RUT_k3f9x2` | It becomes a tag or a mention and leaves `content` | Keep it as written, `RUT_k3f9x2` |
| A label as a lone mention, `Usar tema oscuro @user:preferencias` | The value stays in `content` | Use `#preferencia`, or `#preferencia @user:preferencias` |
| An organization as `@duocuc` | Stored as a person | `@org:duocuc` |
| Rebuilding `text` from `content` | Inline tags and mentions are lost | Start from the current `raw_text` |
| Expecting inline markup to survive a text-only edit | Only the category and trailing block survive | Send the inline markup again |
| Removing the last tag of a block | Mention values return to `content` | Keep or add a tag in the same call |
| Searching a tag with `search` | No result | `tags`; `mention` for mentions |
| Expecting OR from `tags` | It requires every tag | `any_tags` for OR |
| `due` alone for "pending this week" | Done and dismissed tasks appear | Add `status` |
| `status` or `due` on an idea or nota | Error | Set `category: "tarea"` first or in the same call |
| Inventing statuses (`completada`) or arguments (`priority`) | Rejected | The five statuses and the advertised arguments |
| Treating an `id` as stable across databases | `id` is local | Use `uid` |
| Using `status` or `due` as `update_entries` filters | They are changes there | List first, then `update_entries` with `ids` |
