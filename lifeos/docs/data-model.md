# Data model

LIFEOS has no backend. Everything lives in the browser's `localStorage`, as JSON.

## Storage keys

| Key                  | Contents                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `lifeos-users`       | Accounts, keyed by email: `{ name, salt, hash }`                                              |
| `lifeos-session`     | Email of the signed-in user                                                                   |
| `lifeos-v1:<email>`  | That user's data (see below)                                                                  |
| `lifeos-theme`       | `"dark"` or `"light"`                                                                         |
| `lifeos-intro`       | Set to `"1"` once the intro has been finished or skipped                                      |
| `lifeos-v1`          | Older, pre-account data. It is copied to the first account that is created, then left in place |

## User data

Each user's data is one object with three lists:

```js
{
  r: [], // records
  l: [], // links between records
  m: [], // reminders
  hs: 1  // optional: the "sample items" banner was dismissed with "Keep them"
}
```

### Records (`r`)

```js
{ id, type, title, f: { /* fields for the type */ }, arch: 0, done: 0, sample: 1 }
```

- `type` is one of `purchase`, `belonging`, `food`, `subscription`, `document`, `errand`.
- `arch` is `1` when the record is archived.
- `done` is `1` for a completed errand.
- `sample` is `1` on the starter items created for a new account. **Clear sample items** removes every record with this flag, along with its links and reminders.

Fields by type (`f`):

| Type         | Fields                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------- |
| purchase     | `title`, `merchant`, `priceM`, `currency`, `date`, `returnBy`, `warrantyEnd`, `receipt`        |
| belonging    | `title`, `category`, `location`, `serial`                                                     |
| food         | `title`, `qty`, `location`, `expires`, `opened`                                               |
| subscription | `title`, `costM`, `currency`, `cycle` (`monthly` or `yearly`), `renewal`, `remind`            |
| document     | `title`, `docType` (`receipt`, `warranty`, `manual` or `other`), `note`                       |
| errand       | `title`, `location`, `due`                                                                    |

An errand can also hold `snooze` in `f`: a date until which it is hidden from the Overview. For the other types, snoozing is stored on the reminder (see below).

Dates are stored as `YYYY-MM-DD` strings.

### Money

Prices are stored as whole numbers in the currency's smallest unit (`priceM`, `costM`). KRW and JPY have no decimals, so `129000` means ₩129,000. USD and EUR use two decimals, so `299` means $2.99. Supported currencies are KRW, USD, EUR and JPY.

### Links (`l`)

```js
{ a: "<record id>", b: "<record id>", rel: "receipt for" }
```

`rel` is a short label read from `a` to `b`: `bought in`, `receipt for`, `linked to` or `created for`.

### Reminders (`m`)

```js
{ id, rec: "<record id>", kind: "return", date: "2026-12-04", done: 0, snooze: "" }
```

Reminders are created and kept in step with the record's dates.

| Kind       | Source field  | Shown on the Overview                 |
| ---------- | ------------- | ------------------------------------- |
| `return`   | `returnBy`    | from 7 days before                    |
| `warranty` | `warrantyEnd` | from 30 days before                   |
| `expiry`   | `expires`     | from 3 days before                    |
| `renewal`  | `renewal`     | from `remind` days before (default 3) |

Errands appear on the Overview when their due date is 3 days away or less. Reminders and errands stay listed while they are overdue. A snoozed reminder has its `snooze` date set to tomorrow and is hidden until then.

Marking a `renewal` reminder as done moves the subscription's `renewal` date forward by one month or one year (its `cycle`) and creates the next reminder.

## Accounts

`hash` is a PBKDF2 (SHA-256, 100,000 iterations) hash of the password with a per-account `salt`, when the Web Crypto API is available. Without it, a simple non-cryptographic hash is used instead. Either way the check happens in the browser, so this is a convenience for separating local profiles, not a security boundary.
