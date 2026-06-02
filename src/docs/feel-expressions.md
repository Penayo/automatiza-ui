# FEEL Expressions

**FEEL** (Friendly Enough Expression Language) is used throughout the process engine to evaluate conditions, map variables, and configure service tasks.

## Syntax basics

All FEEL expressions must start with `=`:

```
= myVariable
= order.total > 1000
= "Hello, " + customerName
```

A plain string **without** `=` is treated as a literal value and is **not** evaluated.

---

## Data types

| Type | Example |
|---|---|
| String | `= "hello"` |
| Number | `= 42`, `= 3.14` |
| Boolean | `= true`, `= false` |
| Null | `= null` |
| List | `= [1, 2, 3]` |
| Context (object) | `= { name: "Alice", age: 30 }` |

---

## Arithmetic

```
= price * quantity
= (subtotal + tax) - discount
= total / 12
```

---

## String operations

```
= "Hello, " + name
= string length(name)           → number of characters
= upper case(city)              → "ASUNCIÓN"
= lower case(email)             → "user@example.com"
= contains(description, "urgent")
= starts with(code, "PY")
= ends with(filename, ".pdf")
= substring(code, 1, 3)        → first 3 chars (1-based)
= substring before(path, "/")  → part before first /
= substring after(path, "/")   → part after first /
= string join(list, ", ")       → join list items
= split(fullName, " ")          → ["Gustavo", "Penayo"]
= trim(rawInput)
= replace(text, "foo", "bar")
= string(number)                → convert to string
```

---

## Comparisons

```
= age >= 18
= status = "ACTIVE"
= status != "CANCELLED"
= amount > 0 and amount < 10000
= category = "A" or category = "B"
= not(isPending)
```

---

## Conditionals (if / then / else)

```
= if amount > 1000 then "high" else "normal"
= if status = "VIP" then discount * 2 else discount
```

---

## List operations

```
= count(items)
= sum(items)
= min(scores)
= max(scores)
= mean(scores)
= append(items, newItem)
= flatten(nestedList)
= reverse(items)
= sublist(items, 2, 3)          → 3 items starting at position 2 (1-based)
= distinct values(items)
= list contains(items, "value")
= index of(items, "value")
= concatenate(list1, list2)
= some item in items satisfies item.price > 100
= every item in items satisfies item.inStock = true
= [x for x in items if x.active = true]
```

---

## Accessing nested properties

Use dot notation to access fields inside objects:

```
= customer.address.city
= order.items[1].name
```

---

## Date and time

```
= today()
= now()
= date("2026-01-31")
= date and time("2026-01-31T10:00:00")
= duration("P30D")
= date(now()) = date("2026-06-01")
= day of week(today())          → "Monday"
= month of year(today())        → 6
= day of year(today())          → 152
= week of year(today())         → 22
```

## Numeric functions

```
= floor(3.7)       → 3
= ceiling(3.2)     → 4
= abs(-5)          → 5
= decimal(3.14159, 2)  → 3.14
= modulo(10, 3)    → 1
= sqrt(16)         → 4
= number("42")     → 42
```

---

## Context construction

Build objects inline:

```
= { name: applicantName, age: applicantAge, status: "pending" }
```

---

## Common use cases in service tasks

**Resolve a dynamic email recipient:**
```
= applicant.email
```

**Compute a due date:**
```
= now() + duration("P7D")
```

**Conditional routing:**
```
= if loanAmount > 50000 then "manual-review" else "auto-approve"
```

**Build report inputs:**
```
= { clientName: fullName, contractDate: today(), amount: totalAmount }
```

---

## Variables in scope

Inside any expression the following are always available:

- All **process instance variables** (set at start or by previous tasks)
- `process` — the process instance object
- `task` — the current task object
- `variables` — map of all current variables
- `date` — dayjs helper for date formatting

---

## Debugging tips

- Check the **Audit Log** for `Evaluating FEEL expression` entries — they show the raw expression, transpiled JavaScript, and all variables in scope at evaluation time.
- A result of `null` usually means a variable name is misspelled or does not exist yet.
- If you see `X is not defined`, the expression is missing the `=` prefix and the engine tried to evaluate the value as a variable name.
