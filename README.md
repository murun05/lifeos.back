# LIFEOS

LIFEOS is a personal deadline tracker that runs entirely in the browser. It keeps return windows, warranties, food expiry dates, subscription renewals and errands in one place and counts down to each one, so you know what runs out before it does.

It is a single static page: HTML, CSS and vanilla JavaScript in one file, with no build step, no dependencies and no backend.

## Features

- First-visit intro that explains how the app works in four steps. It can be replayed any time from **How it works**.
- Sign in and create account screens. Accounts are stored in the browser (see [Known limitations](#known-limitations)).
- Six record types: purchase, belonging, food, subscription, document and errand.
- Reminders created automatically from dates:
  - return deadline, 7 days before
  - warranty end, 30 days before
  - food expiry, 3 days before
  - subscription renewal, the number of days you choose (default 3)
- **Overview** page with color-coded countdowns and the actions **Done**, **Snooze** (one day) and **Make errand**.
- Linked records. Saving a purchase can also create its belonging, its receipt document, its reminders and a return errand.
- **My Life** page with search, type filters, and archive and restore.
- **Plan** page with upcoming reminders (the next 60 days, plus anything up to 30 days overdue), errands, and the estimated yearly cost of subscriptions.
- Sample items for new accounts, with a one-click clear and undo.
- Prices in KRW, USD, EUR or JPY.
- Dark and light themes, remembered between visits.
- Responsive layout: sidebar on desktop, bottom navigation on mobile.

## Tech Stack

- HTML5
- CSS with custom properties for the dark and light themes
- Vanilla JavaScript (one script, no framework)
- `localStorage` for accounts and data
- Web Crypto API (PBKDF2) for password hashing
- Google Fonts: Bricolage Grotesque and Figtree

## Project Structure

```txt
index.html             The whole app: markup, styles and script
docs/                  Project documentation
docs/data-model.md     How records, links and reminders are stored
tests/                 Automated behavior tests
.github/workflows/     GitHub Actions: runs the tests on every push
package.json           Test script and the one dev dependency (jsdom)
README.md              This file
.gitignore             Files Git should not track
```

## Getting Started

### Prerequisites

- A modern browser (Chrome, Edge, Firefox or Safari)
- Optional: Python 3, to serve the page locally
- Optional: Node.js 18 or newer, to run the tests

### Run locally

1. Clone the repository:

```bash
git clone <repository-url>
cd lifeos
```

2. Open `index.html` in your browser, or serve the folder:

```bash
python3 -m http.server 8000
```

The app will be available at `http://localhost:8000`.

Browsers keep separate `localStorage` for each address, so data saved at `file://` is not visible at `http://localhost:8000`.

### Deploy with GitHub Pages

1. Push the repository to GitHub.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, then select the `main` branch and the `/ (root)` folder.
4. Save. The site is published at `https://<username>.github.io/<repository>/`.

## Testing

The tests run the page in a simulated browser ([jsdom](https://github.com/jsdom/jsdom)) and check behavior: the first-visit intro and its steps, sign up, sample items and clearing them with undo, the empty state, and the replay buttons. They do not check how the page looks.

Requires Node.js 18 or newer.

```bash
npm install
npm test
```

The same tests run automatically on GitHub for every push to `main` and every pull request (see `.github/workflows/test.yml`).

If you change wording in the app, such as a step title in the intro, update the matching line in `tests/app.test.js`.

## Data and Privacy

Everything is stored in the browser's `localStorage`. The page makes no network requests except loading the two fonts from Google Fonts. Clearing site data for the page deletes all accounts and records.

See [docs/data-model.md](docs/data-model.md) for the storage keys and record format.

## Known Limitations

- Accounts are front-end only. The password check runs in the browser, so this is not real authentication. Do not store sensitive information until a backend is added.
- Data does not sync between browsers or devices.
- Reminders appear inside the app only. There are no email or push notifications.
- Password hashing uses PBKDF2 when the Web Crypto API is available. It requires a secure context such as `https` or `localhost`. Otherwise the app falls back to a simple, non-cryptographic hash.
- Dates are shown in the browser's locale.

## License

No license has been chosen yet, so all rights are reserved by default.
