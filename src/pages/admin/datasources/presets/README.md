# Datasource presets

Starter declarations offered in **Admin → Datasources → New**, one JSON file per API flavour.

Same idea as [`../../modeler/camunda/element-templates/`](../../modeler/camunda/element-templates/):
product knowledge about a third-party system, kept in git so a correction is reviewable and ships
with the release that learned it. Presets are **not** stored in the database — applying one copies
its values into the form, after which the datasource is independent of the preset.

Contract these fill in: [`docs/specs/datasources.spec.md`](../../../../../../docs/specs/datasources.spec.md).

## Adding or fixing one

1. Add `my-api.json` here, following the shape below.
2. Import it in [`index.ts`](./index.ts) and push it into `DATASOURCE_PRESETS`. Nothing else registers it.

```jsonc
{
  "id": "my-api",
  "name": "My API",
  "description": "One line, shown in the picker.",
  "docsUrl": "https://…",          // or null
  "verified": null,                 // see below
  "resourceSegment": "vehicles",    // see below; null if the API fixes its own segments
  "notes": ["Gotchas an author needs before trusting this."],
  "template": { /* baseUrl, auth, filterStyle, pagination, operations, healthCheck */ }
}
```

## `resourceSegment` keeps the paths honest

The path segment the template's operations use for the resource — `vehicles` in `/vehicles/{{key}}`.
The editor rewrites it to the datasource key, so declaring a `customers` datasource from the
PostgREST preset yields `/customers`, not the example table. It keeps tracking afterwards: renaming
the key on the General tab rewrites matching segments in Operations. A hand-edited path no longer
matching the key is left alone.

Use `null` when the segments are fixed by the API rather than naming a resource — NocoDB's
`/records` is literal, and the table is chosen in `baseUrl`.

## `verified` is the important field

`null` means *written from documentation, never run*. A date and version means someone pointed it at
a live instance and transcribed what came back.

That distinction is not cosmetic. The PostgREST preset began as documentation too, and a single live
run corrected **three** wrong assumptions — a paged read returns `206` not `200`, the row total is a
response header requiring `Prefer: count=exact`, and a missing row is `406/PGRST116` rather than
`404`. Any preset carrying `null` should be assumed wrong in at least one of those ways until the
Test panel says otherwise.

When you do verify one, put the date and the product version in `verified`, and fold anything
surprising into `notes`.

| Preset | `verified` |
|---|---|
| `postgrest` | ✅ 2026-07-30, PostgREST 12.2.12 (spec §14.1) |
| `nocodb` | ⚠️ never run — the only preset exercising `filterStyle: composed` and a body-path total |
| `fastapi` | ⚠️ never run, and unverifiable in general — FastAPI imposes no shape, so this is a convention |
| `custom` | — blank by design |
