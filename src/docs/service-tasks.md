# Service Tasks

Service tasks execute automated work — HTTP calls, scripts, email sends, PDF generation, and more.

---

## Supported types

### REST HTTP (`io.camunda:http-json:1`)

Calls an external HTTP endpoint.

| Input | Description |
|---|---|
| `url` | Full URL (supports FEEL: `= "https://api.example.com/users/" + userId`) |
| `method` | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` |
| `headers` | Object of headers |
| `body` | Request body (object or FEEL expression) |
| `outputVariable` | Variable name to store the response body |

### External worker (`external`)

Registers a job that an external worker picks up via polling. The worker completes the job and returns output variables.

### Script task

Executes a JavaScript or FEEL snippet inline. Output is returned as process variables.

### Email send (`io.processlinker:email-send-smtp:v1`)

Sends an email via SMTP.

| Input | Description |
|---|---|
| `to` | Recipient(s) — plain address or FEEL expression |
| `cc` / `bcc` | Optional — same format as `to` |
| `subject` | Plain string or FEEL |
| `body` | HTML string or Handlebars template |
| `template` | Key of a saved Email Template (takes precedence over `body`) |
| `sender.from` | From address |
| `sender.name` | Display name |

**FEEL in `to`:** wrap in `=` to resolve from a variable:
```
= applicant.email
= mainEmail
```

### Report generation (`io.processlinker:report:v1`)

Generates a PDF from a saved Report template and uploads it to storage.

| Input | Description |
|---|---|
| `reportKey` | Key of the report definition (plain string or `= feelExpr`) |
| `inputs` | Data passed to the template — object or array for multi-page |
| `outputVariable` | Variable name for the `StoredFile` result (default: `generatedReport`) |
| `filename` | Optional — custom filename (supports FEEL) |

The output variable holds:
```json
{
  "key": "files/2026/05/...",
  "signedUrl": "https://...",
  "filename": "contract.pdf",
  "size": 123456,
  "mimeType": "application/pdf"
}
```

---

## Service config editing

If a task is in a FAILED or SCHEDULED state due to a misconfigured `serviceConfig`, you can edit it live from the Process Instance detail page → **Tasks** tab → gear icon (**Edit service config**) without redeploying the process definition.

---

## Retrying failed service tasks

Use the **Retry** button (refresh icon) on any FAILED task. The engine resets the task and process instance status to RUNNING and re-executes the task's strategy from scratch.
