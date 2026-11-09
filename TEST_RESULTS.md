# TEST RESULTS — sanchayapatra-bd (run #280, 2026-11-09 10:00 slot)

## Unit tests — `node tests/logic.test.js`
**64/64 passed, 0 failed** (run 2026-11-09 ~10:05 +06).

Hand-computed figures verified:
- Paribar ৳5,00,000 (tier 1, 11.93%, TDS 5%): gross ৳59,650.00, TDS ৳2,982.50,
  net ৳56,667.50, maturity ৳556,667.50, monthly net ৳944.46 / gross ৳994.17.
- 5-Year Bangladesh ৳10,00,000 (tier 2, 11.80%, TDS 10%): gross ৳118,000,
  TDS ৳11,800, net ৳106,200, maturity ৳1,106,200.00, payout at maturity.
- 3-Month Profit ৳7,50,000 (tier-1 boundary, 11.82%, TDS 10%): gross ৳88,650,
  TDS ৳8,865, net ৳79,785, quarterly net ৳6,648.75.
- Tier boundary: ৳7,50,000 → tier 1; ৳7,50,001 → tier 2.
- TDS boundary: ৳5,00,000 → 5%; ৳5,00,001 → 10%; manual low/high overrides work.
- Caps: Paribar ৳46,00,000 flagged over single cap; ৳50,00,000 at combined cap.
- Validation: amounts 0 / below ৳1,000 / above ৳50,00,000, unknown scheme,
  bad TDS mode all rejected.
- Encashment (Paribar ৳5,00,000): 6 rows (0–5 yrs); year 0 = principal only;
  year 2 = 10.29% → net ৳48,877.50, total ৳548,877.50; year 5 = maturity net.
  3-Month Profit: 4 rows (0–3 yrs); year 1 = 10.65%.
- Compare ৳5,00,000: best is Pensioner (net ৳56,905.00), then Paribar,
  sorted descending.
- Formatting: `formatBDT(110620000)` = "1,106,200.00";
  `formatBDTLakh(5000000)` = "50,00,000"; Bengali digits 123 → ১২৩.
- Import validation: valid ok; wrong app / wrong version / bad rate /
  missing scheme all rejected.

## Headless-Chrome smoke tests — `node tests/smoke.js`
**42/42 checks passed, 0 failed** (run 2026-11-09 ~10:07 +06, raw CDP,
headless_shell-1187, file://).

Verified in the real browser: title; 4 tabs; scheme select (4 options);
5 presets; default calc (Paribar ৳5,00,000 → maturity ৳556,667.50, 11.93%,
net ৳56,667.50, monthly ৳944.46, Tier 1 label); zero-amount inline error;
preset ৳10,00,000 → tier 2, 11.80%, maturity ৳1,106,200.00; TDS override
high → net ৳53,685.00; compare table (4 rows, Pensioner BEST, net
৳56,905.00); encashment table (6 rows, year 2 net ৳48,877.50, year 0 =
principal); rates tab (4 rate cards + 4 rule cards); rate edit
(Paribar tier 1 → 12% → maturity ৳557,000.00) and reset to 11.93;
export/import round-trip and wrong-app rejection; EN↔বাংলা toggle
(সঞ্চয়পত্র বিডি, maturity ৳৫৫৬,৬৬৭.৫০) with persistence across reload;
390px no horizontal overflow on calc/compare/rates tabs; zero non-file
network requests; zero console/page errors.

## Fixes during testing
- One real bug found by the smoke test and fixed: `state.amount` was
  stored in taka but reloaded as paisa, so the amount input showed 5000
  instead of 500000 on first load (maturity showed ৳5,566.67). Fixed by
  keeping `state.amount` in taka consistently; smoke re-run 42/42 green.
- One test-only fix: the export-payload check looked for compact JSON
  (`"app":"…"`) while the payload is pretty-printed (`"app": "…"`).
