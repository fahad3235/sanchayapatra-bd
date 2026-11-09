// sanchayapatra-bd — scheme data (no DOM). Node-testable via logic.js.
// Money is integer paisa everywhere (1 taka = 100 paisa).
//
// RATE BASIS — Jul–Dec 2026 rates as reported by The Daily Star
// ("Govt keeps national savings rates unchanged for Jul-Dec", finance
// ministry notification) and Dhaka Tribune's scheme guide, both reporting
// the July 2026 notification. Two tiers: investments up to Tk 7,50,000 earn
// the first-tier rate; above that the second-tier rate. Rates are reviewed
// every January and July, so they WILL change — every rate is editable in
// the app (Rates tab) and the app labels these as defaults to verify.
// Encashment rates below are TOTAL profit percentages of principal for the
// completed years shown (simple, not compounded, not annualised).
// NOTE: a UNB wire from early 2026 reported a proposed cut (Family 10.54%)
// that does not match the July 2026 notification figures used here; the
// Daily Star / Dhaka Tribune July–December 2026 figures are the newer,
// corroborated set. Verify at a bank or the National Savings Directorate
// before investing.
(function (root) {
  'use strict';

  var APP = 'sanchayapatra-bd';
  var VERSION = 1;

  var TIER_THRESHOLD_PAISA = 75000000; // ৳7,50,000 — tier 1 at or below
  var TDS_THRESHOLD_PAISA = 50000000;  // ৳5,00,000 total holdings — 5% TDS at or below, else 10%
  var TDS_LOW = 0.05;
  var TDS_HIGH = 0.10;
  var COMBINED_CAP_PAISA = 500000000; // ৳50,00,000 combined cap per person (all schemes)
  var MIN_AMOUNT_PAISA = 100000;      // ৳1,000 minimum sensible amount
  var MAX_AMOUNT_PAISA = 500000000;   // ৳50,00,000 sanity cap (combined cap)

  // payout: 'monthly' | 'quarterly' | 'maturity'
  // encash: total-profit % of principal after each completed year (index = years).
  var DEFAULT_SCHEMES = [
    {
      id: 'paribar',
      years: 5,
      payout: 'monthly',
      tier1: 11.93, tier2: 11.80,
      encash1: [0, 9.81, 10.29, 10.80, 11.35, 11.93],
      encash2: [0, 9.72, 10.19, 10.70, 11.23, 11.80],
      capSingle: 4500000, capJoint: 9000000
    },
    {
      id: 'pensioner',
      years: 5,
      payout: 'monthly',
      tier1: 11.98, tier2: 11.80,
      encash1: [0, 9.84, 10.32, 10.84, 11.39, 11.98],
      encash2: [0, 9.72, 10.19, 10.84, 11.39, 11.98],
      capSingle: 5000000, capJoint: null
    },
    {
      id: 'three-month',
      years: 3,
      payout: 'quarterly',
      tier1: 11.82, tier2: 11.77,
      encash1: [0, 10.65, 11.22, 11.82],
      encash2: [0, 10.60, 11.16, 11.77],
      capSingle: 3000000, capJoint: 6000000
    },
    {
      id: 'five-year',
      years: 5,
      payout: 'maturity',
      tier1: 11.83, tier2: 11.80,
      encash1: [0, 9.74, 10.21, 10.72, 11.26, 11.83],
      encash2: [0, 9.72, 10.19, 10.70, 11.23, 11.80],
      capSingle: 3000000, capJoint: 6000000
    }
  ];

  var api = {
    APP: APP, VERSION: VERSION,
    TIER_THRESHOLD_PAISA: TIER_THRESHOLD_PAISA,
    TDS_THRESHOLD_PAISA: TDS_THRESHOLD_PAISA,
    TDS_LOW: TDS_LOW, TDS_HIGH: TDS_HIGH,
    COMBINED_CAP_PAISA: COMBINED_CAP_PAISA,
    MIN_AMOUNT_PAISA: MIN_AMOUNT_PAISA,
    MAX_AMOUNT_PAISA: MAX_AMOUNT_PAISA,
    DEFAULT_SCHEMES: DEFAULT_SCHEMES
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SanchayData = api;
})(typeof window !== 'undefined' ? window : globalThis);
