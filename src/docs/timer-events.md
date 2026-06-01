# Timer Events

The engine supports three types of timer values following the **ISO 8601** standard.

---

## Timer types

### Date — fire once at a specific moment

```
2026-12-31T23:59:59Z
```

The timer fires at exactly that UTC datetime.

### Duration — fire once after a delay

```
PT5M       → 5 minutes
PT2H       → 2 hours
P1D        → 1 day
P1DT6H     → 1 day and 6 hours
P1Y2M3DT4H5M6S  → full form
```

Format: `P[n]Y[n]M[n]DT[n]H[n]M[n]S`

### Cycle — fire repeatedly on a schedule

Two sub-formats are supported:

**ISO 8601 repeat with duration:**
```
R3/PT10M   → repeat 3 times, every 10 minutes
R/PT1H     → repeat indefinitely, every hour
```

**Cron expression:**
```
0 9 * * 1-5    → weekdays at 09:00
0 0 1 * *      → first day of every month
*/15 * * * *   → every 15 minutes
```

---

## Boundary timer events

A boundary timer is attached to a task and fires while that task is still running.

| Behaviour | `cancelActivity` setting |
|---|---|
| **Interrupting** (default) | `true` — cancels the host task when the timer fires |
| **Non-interrupting** | `false` — host task keeps running; a parallel branch is started |

For **cycle** + **non-interrupting**: the parallel branch is spawned on every cycle interval as long as the host task is active. The cycle job is automatically removed when the host task reaches a terminal state.

---

## Intermediate timer events

Pauses the flow for the configured duration or until a specific date, then continues. Useful for scheduled reminders or delays between steps.

---

## Start event timers

Starts a new process instance automatically at the configured time or on a recurring schedule.

---

## Common patterns

**Reminder after 3 days of inactivity:**
- Intermediate timer on the task path: `P3D`

**Daily escalation check:**
- Non-interrupting cycle boundary timer: `0 8 * * *` (every day at 08:00)

**Auto-cancel if not completed in 30 minutes:**
- Interrupting boundary timer: `PT30M`
