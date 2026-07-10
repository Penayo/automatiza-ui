# Task Listeners

Task listeners run logic automatically at specific points in a user task's lifecycle — without adding extra nodes to your diagram. They are configured directly on the user task through the Properties Panel.

---

## How to add a listener

1. **Click on a User Task** in the designer to select it.
2. In the **Properties Panel** on the right, scroll down and open the **Listeners** section.
3. Click **+ Add** next to "Task Listeners."
4. Choose the **Event type** that should trigger the listener.
5. Choose the **Listener type** (Script, HTTP, or a delegate connector).
6. Fill in the listener's inputs.

---

## Event types

| Event | When it fires |
|---|---|
| `create` | The task is created and appears in the task list |
| `assignment` | A user claims or is assigned to the task |
| `complete` | The task is submitted — variables are already merged |
| `delete` | The task is cancelled or the process is terminated |

---

## Listener types

### Script

Runs a FEEL expression inline and stores the result in a variable.

**Fields to fill:**
- **Expression** — a FEEL expression (start with `=`). Example: `= if totalAmount > 10000 then "high" else "normal"`
- **Result variable** — the variable name where the result is saved. Example: `taskPriority`

The result variable is available in all subsequent tasks and gateways.

---

### REST HTTP (`io.camunda:http-json:1`)

Calls an HTTP endpoint when the event fires.

**Inputs to configure:**
- **URL** — the endpoint to call. Supports FEEL: `= "https://api.internal/notify/" + taskId`
- **Method** — `GET`, `POST`, `PUT`, `PATCH`, or `DELETE`
- **Body** — a FEEL object with the payload. Example: `= { taskId: taskId, assignee: assignee }`
- **Output variable** — variable name to store the response (optional)

---

### Email send (`io.processlinker:email-send-smtp:v1`)

Sends an email at the specified lifecycle moment.

**Inputs to configure:**
- **To** — recipient address or FEEL: `= applicant.email`
- **Subject** — plain text or FEEL: `= "Action required: " + taskName`
- **Template** — key of a saved Email Template (takes precedence over Body)
- **Body** — HTML string (used if no template is set)

---

## Common configurations

### Notify the assignee when the task is assigned

Use the `assignment` event so the email goes out only after a real assignee is set (the `assignee` variable is not available at `create`).

**Listener:** Email send  
**Event:** `assignment`

| Input | Value |
|---|---|
| To | `= assignee` |
| Subject | `= "You have been assigned: " + taskName` |
| Template | `task-assigned` (or write a body inline) |

---

### Set a default priority on task creation

**Listener:** Script  
**Event:** `create`

| Input | Value |
|---|---|
| Expression | `= if totalAmount > 50000 then "urgent" else if totalAmount > 10000 then "high" else "normal"` |
| Result variable | `taskPriority` |

`taskPriority` becomes a process variable immediately and can drive gateways downstream.

---

### Push completion data to an external system

**Listener:** REST HTTP  
**Event:** `complete`

| Input | Value |
|---|---|
| URL | `= "https://audit.internal/events"` |
| Method | `POST` |
| Body | `= { taskId: taskId, completedBy: assignee, outcome: approvalDecision }` |
| Output variable | `auditResult` |

---

### Alert a supervisor when a task is cancelled

**Listener:** Email send  
**Event:** `delete`

| Input | Value |
|---|---|
| To | `= supervisorEmail` |
| Subject | `= "Task cancelled: " + taskName` |
| Body | `= "The task was cancelled before completion."` |

---

## Stacking multiple listeners

You can add more than one listener to the same event. They execute in the order listed in the panel.

**Example — on `create`:**
1. Script listener → sets `taskPriority`
2. Email listener → notifies the manager (can now use `taskPriority` in the template because it runs after step 1)

Use the drag handles in the Listeners list to reorder them.

---

## Available variables inside a listener

All process variables are available by name. The following are also always set:

| Variable | Value |
|---|---|
| `taskId` | Internal task ID |
| `taskName` | Name of the task from the BPMN definition |
| `processInstanceId` | ID of the owning process instance |
| `assignee` | Set only on `assignment` and `complete` events |
| `now()` | Current date/time (FEEL built-in) |

---

## Tips

- Use `create` to send notifications about the task existing. Use `assignment` when the email must address the assignee — the `assignee` variable is only set from that event onward.
- Keep Script listeners short. For complex logic, add a Service Task upstream in the process instead.
- Listener failures mark the task as FAILED. Validate HTTP endpoints and email configs before deploying.
