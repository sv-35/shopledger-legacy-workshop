# ShopLedger

## Stack and module map

- Node.js CommonJS app with Express 4 and body-parser, plus plain HTML, CSS, and browser JavaScript in `public/`.
- `server.js` serves the UI, mounts the API routers, and exposes the printable invoice.
- `routes/` holds products and coupons, orders, customer Khata, and reports.
- `lib/` holds inventory; pricing, coupons, and GST; orders and dates; the Khata ledger; invoice rendering and reports; and JSON storage.
- `config.js` holds shop, server, stock, GST, and coupon settings. `data/db.json` is the tracked working database.

## Commands

- Install existing runtime dependencies with `npm install --no-package-lock`.
- Start locally with `npm start` (default port 3000, override with `PORT`).
- Run tests with `node --test`. The package's `npm test` script is a placeholder.

## Workshop rules

1. Write characterization tests before changing behavior.
2. Change only the production module relevant to the chosen ticket.
3. Use in-memory data for automated tests. Never read from or write to `data/db.json` in tests. Use a disposable copy of the project for manual reproduction.
4. Add no dependencies.
