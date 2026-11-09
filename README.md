# Sanchayapatra BD — সঞ্চয়পত্র বিডি

A free, fully offline bilingual (English / বাংলা) calculator for Bangladesh
National Savings Certificates (Sanchayapatra): maturity profit, tax deducted
at source (TDS), monthly/quarterly payouts, and what you get back if you
encash early. No accounts, no servers, no network requests.

## Problem

Sanchayapatra is the highest-return government savings option for millions of
Bangladeshis — pensioners, homemakers, and small savers — but the returns are
hard to work out by hand: four schemes, two rate tiers by investment size,
different payout rhythms (monthly, quarterly, at maturity), a 5%/10% tax
deducted at source that depends on total holdings, and lower rates if you
encash before maturity. Bank counters and Facebook posts quote different
numbers. This app does the arithmetic once, transparently, and lets you edit
the rates when the government revises them every January and July.

## Features

- **Profit calculator** — pick one of the four schemes, enter an amount, and
  see the maturity profit rate, gross profit, TDS, net profit, periodic
  payout, and the total you get back at maturity.
- **Two rate tiers** — investments up to ৳7,50,000 earn the first-tier rate;
  above that the second-tier rate (whole-amount tier, per the July 2026
  notification).
- **TDS handling** — 5% when total Sanchayapatra holdings are ৳5 lakh or
  less, 10% above; auto mode keys off the entered amount, with a manual
  override and an on-screen explanation.
- **Compare all schemes** — one table ranks all four schemes by net profit
  for the same amount, with the best marked.
- **Early-encashment table** — year-by-year profit rate and payout if you
  cash out early (year 0 returns principal only — no profit).
- **Editable rates** — every profit rate is editable and persisted in the
  browser, with a one-tap reset to the Jul–Dec 2026 defaults; export/import
  rates as JSON (invalid files are rejected without touching your data).
- **Limits & eligibility** — per-scheme single/joint purchase caps, terms,
  payout rhythms, and who can buy; the ৳50 lakh combined cap per person is
  flagged.
- **Full EN/বাংলা UI toggle** with Bengali digits in Bangla mode, persisted
  across reloads; mobile-responsive at 390px; zero network requests.

## The four schemes (defaults: Jul–Dec 2026)

| Scheme | Term | Payout | Tier 1 (≤ ৳7.5L) | Tier 2 (> ৳7.5L) |
| --- | --- | --- | --- | --- |
| Paribar (Family) Sanchayapatra | 5 years | Monthly | 11.93% | 11.80% |
| Pensioner Sanchayapatra | 5 years | Monthly | 11.98% | 11.80% |
| 3-Month Profit Sanchayapatra | 3 years | Quarterly | 11.82% | 11.77% |
| 5-Year Bangladesh Sanchayapatra | 5 years | At maturity | 11.83% | 11.80% |

Rates are **total** profit over the term (simple, not compounded). Early
encashment pays the completed-year rate only, e.g. Paribar tier 1 after
2 years pays 10.29%.

## Worked example (hand-verified)

Paribar, ৳5,00,000, tier 1 (11.93%), TDS 5%:

- Gross profit: 500,000 × 11.93% = ৳59,650.00
- TDS: 59,650 × 5% = ৳2,982.50
- Net profit: ৳56,667.50 — monthly ৳944.46
- You get back at maturity: ৳556,667.50

## Sources

- Profit rates: finance ministry notification for **July–December 2026**,
  as reported by The Daily Star ("Govt keeps national savings rates
  unchanged for Jul–Dec") and Dhaka Tribune's savings-certificate guide.
- TDS 5%/10% rule (threshold ৳5 lakh of total holdings) and the ৳50 lakh
  combined per-person cap are the widely reported National Savings
  Directorate rules.
- **Conflict noted:** a UNB wire from early 2026 reported a proposed cut
  (Family 10.54%) that does not match the July 2026 notification figures
  used here; the Daily Star / Dhaka Tribune July–December 2026 figures are
  the newer, corroborated set. Rates are reviewed every January and July —
  verify at a bank or the National Savings Directorate before investing,
  and edit the rates in the app if they change.

## Stack

Vanilla HTML/CSS/JS. No build step, no dependencies, no frameworks, no
network requests. All Sanchayapatra math lives in `js/logic.js` as pure
functions (no DOM), shared by the app and the Node unit tests. Scheme data
lives in `js/data.js`; i18n strings in `js/i18n.js`; UI wiring in
`js/app.js`.

## Prerequisites

Any modern browser (Chrome, Firefox, Safari, Edge). Nothing to install.

## Install

No install. Open `index.html` directly, or serve the folder:

```bash
cd sanchayapatra-bd
python3 -m http.server 8000
# open http://localhost:8000
```

## Development commands

```bash
node tests/logic.test.js   # 64 unit tests (pure math)
node tests/smoke.js        # 42 headless-Chrome checks (raw CDP, no puppeteer)
```

The smoke test needs the Playwright headless shell at
`~/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell`
(or set `CHROME_BIN`).

## Testing

- `tests/logic.test.js` — 64/64 pass: hand-computed maturity/TDS/periodic
  figures for all four schemes, tier and TDS boundary values (৳7,50,000 /
  ৳7,50,001 and ৳5,00,000 / ৳5,00,001), encashment rows, compare ordering,
  formatting (including lakh-style grouping), and import validation.
- `tests/smoke.js` — 42/42 pass in headless Chrome: default calculation,
  validation error, presets, TDS override, compare and encashment tables,
  rate editing + reset, export/import round-trip and rejection, EN↔বাংলা
  toggle with persistence, 390px no-overflow on three tabs, zero non-file
  network requests, zero console/page errors.

## Deployment

Static site — any static host works (GitHub Pages, Netlify). No server, no
environment variables, no secrets.

## Limitations

- An **estimator, not investment advice**. Rates change every January and
  July; the app ships Jul–Dec 2026 defaults and expects you to verify and
  edit them.
- TDS auto mode uses the entered amount as a proxy for your total holdings;
  if your total holdings differ, pick 5% or 10% manually.
- Eligibility wording is a summary (e.g. Paribar senior-citizen age is
  reported as both 50+ and 65+ in different sources) — confirm at the
  issuing office.
- Wage Earner Welfare Bond, US Dollar Premium/Investment Bonds, and Post
  Office savings are not covered (different products, different rules).
- Data lives in the browser's localStorage; clearing browser data erases
  custom rates (export a backup from the Rates tab).

## Status

Complete MVP — calculator, compare, encashment, editable rates, bilingual
UI, tests green. No live data: all rates are labelled defaults to verify.
