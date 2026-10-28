# Timer Events

The engine supports three types of timer values following the **ISO 8601** standard.

---

## Timer types

### Date: fire once at a specific moment

```
2026-12-31T23:59:59Z
```

The timer fires at exactly that UTC datetime.

### Duration: fire once after a delay

```
PT5M       → 5 minutes
PT2H       → 2 hours
P1D        → 1 day
P1DT6H     → 1 day and 6 hours
P2W        → 2 weeks
P1Y2M3DT4H5M6S  → full form
```

Format: `P[n]Y[n]M[n]DT[n]H[n]M[n]S` (or `P[n]W` for weeks). Months count as 30 days and years as 365 days.

### Cycle: fire repeatedly on a schedule

Two sub-formats are supported:

**ISO 8601 repeating interval:** `R[n]/[start/]duration`
```
R3/PT10M                        → 3 times, every 10 minutes
R3/P2D                          → 3 times, every 2 days
R/PT1H                          → every hour, no limit
R3/2026-11-02T09:00:00Z/P1D     → 3 times, daily, first one at the start date
```

- Without a start date, the first tick fires one interval after the timer starts (`R3/P2D` fires on day 2, 4 and 6).
- With a start date, the first tick fires at that date (immediately if it has passed), then every interval.
- Omitting the count (`R/...`) repeats until the timer is stopped.
- `R0`, a zero interval or an invalid start date fail when the timer is scheduled.

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
| **Interrupting** (default) | `true`: cancels the host task when the timer fires |
| **Non-interrupting** | `false`: host task keeps running; a parallel branch is started |

For **cycle** + **non-interrupting**: a parallel branch is spawned on every tick as long as the host task is active. The timer stops when the host task completes, fails or is cancelled.

- With a count (`R3/P2D`) the timer stops after the last tick, even if the host task is still running.
- An **interrupting** cycle timer fires only once, because the first tick cancels the host task.
- While the process instance is **paused**, a repeating-interval tick waits and fires on resume. A cron tick that falls during a pause is skipped.

---

## Intermediate timer events

Pauses the flow for the configured duration or until a specific date, then continues. Useful for scheduled reminders or delays between steps.

---

## Start event timers

Starts a new process instance automatically at the configured time or on a recurring schedule.

> A start timer with a repeating interval (`R3/...`) currently fires its **first tick only**. Use a cron expression for recurring starts.

---

## Common patterns

**Reminder after 3 days of inactivity:**
- Intermediate timer on the task path: `P3D`

**A limited series of reminders** (e.g. "Your quote is ready", then two reminders):
- Non-interrupting boundary timer on the task: `R3/P2D`
- On the timer's branch, increment a counter variable (e.g. `reminderCount`) in a script task, then use an exclusive gateway to pick the email for tick 1, 2 or 3
- After the third tick the timer stops; completing the task stops it earlier

**Daily escalation check:**
- Non-interrupting cycle boundary timer: `0 8 * * *` (every day at 08:00)

**Auto-cancel if not completed in 30 minutes:**
- Interrupting boundary timer: `PT30M`
