# Process Variables

Process variables are the shared data store that flows through a process instance. Every task can read and write variables; they persist for the lifetime of the instance.

---

## How variables flow

1. **Start event** — initial variables are passed when starting a process (`POST /bpmn/processes/:id/start` body).
2. **Task completion** — variables returned or mapped by a task are merged into the instance.
3. **Service tasks** — output mappings write results back as variables.
4. **FEEL expressions** — all variables are available by name in any expression.

---

## Variable types

Variables can hold any JSON-compatible value:

| Type | Example value |
|---|---|
| String | `"pending"` |
| Number | `42`, `3.14` |
| Boolean | `true` |
| Null | `null` |
| Object | `{ "city": "Asunción", "zip": "1234" }` |
| Array | `["A", "B", "C"]` |
| File reference | `{ "key": "files/2026/...", "signedUrl": "...", "filename": "doc.pdf" }` |

---

## Accessing variables in FEEL

Use the variable name directly:

```
= customerName
= order.total
= items[1].sku
```

---

## Special system variables

| Key | Set by | Description |
|---|---|---|
| `__emailSendSmtp` | Email task | Metadata from the last email send (messageId, accepted, etc.) |
| `__reportResult` | Report task | Metadata from the last generated report |

---

## Output variable mapping

Service tasks write results to a named variable. Configure the `outputVariable` input parameter in the task template. If not set, the default name is used (`generatedReport` for reports, etc.).

---

## Merging behaviour

Variables are **merged**, not replaced. If a task outputs `{ status: "approved" }` and the instance already has `customerName`, both survive. Only the keys present in the task output are updated.

---

## Editing variables at runtime

In the Process Instance detail page → **Tasks** tab, use the **Edit variables** button (slider icon) on any task to manually inject or correct variable values without restarting the process.
