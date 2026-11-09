// sanchayapatra-bd — pure Sanchayapatra math (no DOM). Node-testable.
// Profit is SIMPLE: total profit over the term = principal x maturity rate.
// Encashment rates are total-profit % of principal after N completed years.
// TDS (tax deducted at source) is charged on the PROFIT only.
(function (root) {
  'use strict';

  var D = (typeof require !== 'undefined')
    ? require('./data.js')
    : root.SanchayData;

  function isFiniteNumber(x) { return typeof x === 'number' && isFinite(x); }
  function roundPaisa(x) { return Math.round(x); }

  function getScheme(schemes, id) {
    var list = Array.isArray(schemes) ? schemes : D.DEFAULT_SCHEMES;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function validAmount(paisa) {
    return isFiniteNumber(paisa) && paisa >= D.MIN_AMOUNT_PAISA &&
      paisa <= D.MAX_AMOUNT_PAISA && Math.floor(paisa) === paisa;
  }

  function validRate(r) { return isFiniteNumber(r) && r >= 0 && r <= 30; }

  function validateScheme(s) {
    if (!s || typeof s.id !== 'string') return false;
    if (!isFiniteNumber(s.years) || s.years < 1 || s.years > 10) return false;
    if (['monthly', 'quarterly', 'maturity'].indexOf(s.payout) === -1) return false;
    if (!validRate(s.tier1) || !validRate(s.tier2)) return false;
    if (!Array.isArray(s.encash1) || !Array.isArray(s.encash2)) return false;
    if (s.encash1.length !== s.years + 1 || s.encash2.length !== s.years + 1) return false;
    for (var i = 0; i <= s.years; i++) {
      if (!validRate(s.encash1[i]) || !validRate(s.encash2[i])) return false;
    }
    return true;
  }

  // Tier 1 at or below ৳7,50,000; tier 2 above. Whole-amount tier (per the
  // July 2026 notification as reported: two tiers by investment size).
  function tierFor(amountPaisa) {
    return amountPaisa <= D.TIER_THRESHOLD_PAISA ? 1 : 2;
  }

  // TDS on profit: 5% when total holdings are at or below ৳5,00,000, else 10%.
  // `mode` is 'auto' | 'low' | 'high'. Auto keys off the entered amount as a
  // proxy for total holdings (the UI explains this and lets the user override).
  function tdsRateFor(amountPaisa, mode) {
    if (mode === 'low') return D.TDS_LOW;
    if (mode === 'high') return D.TDS_HIGH;
    return amountPaisa <= D.TDS_THRESHOLD_PAISA ? D.TDS_LOW : D.TDS_HIGH;
  }

  function maturityRate(scheme, amountPaisa) {
    return tierFor(amountPaisa) === 1 ? scheme.tier1 : scheme.tier2;
  }

  // Full-term calculation. Returns paisa amounts.
  function calcMaturity(opts) {
    opts = opts || {};
    var amountPaisa = opts.amountPaisa;
    var schemes = opts.schemes || D.DEFAULT_SCHEMES;
    var scheme = getScheme(schemes, opts.schemeId);
    if (!validAmount(amountPaisa)) return { ok: false, error: 'amount' };
    if (!scheme || !validateScheme(scheme)) return { ok: false, error: 'scheme' };
    var tdsMode = opts.tdsMode || 'auto';
    if (['auto', 'low', 'high'].indexOf(tdsMode) === -1) return { ok: false, error: 'tdsMode' };

    var rate = maturityRate(scheme, amountPaisa);
    var tdsRate = tdsRateFor(amountPaisa, tdsMode);
    var grossPaisa = roundPaisa(amountPaisa * rate / 100);
    var tdsPaisa = roundPaisa(grossPaisa * tdsRate);
    var netPaisa = grossPaisa - tdsPaisa;
    var maturityPaisa = amountPaisa + netPaisa;
    var periods = scheme.payout === 'monthly' ? scheme.years * 12
      : scheme.payout === 'quarterly' ? scheme.years * 4 : 1;
    var periodicGross = roundPaisa(grossPaisa / periods);
    var periodicNet = roundPaisa(netPaisa / periods);
    return {
      ok: true,
      schemeId: scheme.id,
      amountPaisa: amountPaisa,
      years: scheme.years,
      payout: scheme.payout,
      tier: tierFor(amountPaisa),
      rate: rate,
      tdsRate: tdsRate,
      grossPaisa: grossPaisa,
      tdsPaisa: tdsPaisa,
      netPaisa: netPaisa,
      maturityPaisa: maturityPaisa,
      periodicGrossPaisa: periodicGross,
      periodicNetPaisa: periodicNet,
      periods: periods,
      overCap: amountPaisa > scheme.capSingle * 100,
      overCombinedCap: amountPaisa > D.COMBINED_CAP_PAISA
    };
  }

  // Year-by-year early-encashment table for one scheme + amount.
  // Row 0 = encashed before 1 year: no profit, principal back.
  function encashmentTable(opts) {
    opts = opts || {};
    var amountPaisa = opts.amountPaisa;
    var schemes = opts.schemes || D.DEFAULT_SCHEMES;
    var scheme = getScheme(schemes, opts.schemeId);
    if (!validAmount(amountPaisa)) return { ok: false, error: 'amount' };
    if (!scheme || !validateScheme(scheme)) return { ok: false, error: 'scheme' };
    var tdsRate = tdsRateFor(amountPaisa, opts.tdsMode || 'auto');
    var tier = tierFor(amountPaisa);
    var table = tier === 1 ? scheme.encash1 : scheme.encash2;
    var rows = [];
    for (var y = 0; y <= scheme.years; y++) {
      var rate = table[y];
      var gross = roundPaisa(amountPaisa * rate / 100);
      var tds = roundPaisa(gross * tdsRate);
      var net = gross - tds;
      rows.push({
        year: y, rate: rate, grossPaisa: gross, tdsPaisa: tds,
        netPaisa: net, totalPaisa: amountPaisa + net
      });
    }
    return { ok: true, schemeId: scheme.id, tier: tier, tdsRate: tdsRate, rows: rows };
  }

  // All schemes for one amount, best net profit first.
  function compareAll(opts) {
    opts = opts || {};
    var schemes = opts.schemes || D.DEFAULT_SCHEMES;
    var rows = [];
    for (var i = 0; i < schemes.length; i++) {
      var r = calcMaturity({
        amountPaisa: opts.amountPaisa, schemeId: schemes[i].id,
        tdsMode: opts.tdsMode, schemes: schemes
      });
      if (!r.ok) return { ok: false, error: r.error };
      rows.push(r);
    }
    rows.sort(function (a, b) { return b.netPaisa - a.netPaisa; });
    return { ok: true, rows: rows };
  }

  // --- formatting ---
  var BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  function toBnDigits(s) {
    return String(s).replace(/[0-9]/g, function (d) { return BN_DIGITS[+d]; });
  }

  // "1,106,200.00" from integer paisa.
  function formatBDT(paisa) {
    var neg = paisa < 0;
    var abs = Math.abs(Math.round(paisa));
    var whole = Math.floor(abs / 100);
    var frac = abs % 100;
    var ws = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + ws + '.' + (frac < 10 ? '0' : '') + frac;
  }

  // "1,00,000" — Bangladeshi grouping (lakh/crore style) from integer taka.
  function formatBDTLakh(taka) {
    var s = String(Math.floor(Math.abs(taka)));
    if (s.length <= 3) return s;
    var last3 = s.slice(-3);
    var rest = s.slice(0, -3);
    var parts = [];
    while (rest.length > 2) { parts.unshift(rest.slice(-2)); rest = rest.slice(0, -2); }
    if (rest) parts.unshift(rest);
    return parts.join(',') + ',' + last3;
  }

  function validateImport(payload) {
    if (!payload || typeof payload !== 'object') return { ok: false, error: 'not-object' };
    if (payload.app !== D.APP || payload.version !== D.VERSION) return { ok: false, error: 'app-version' };
    if (payload.schemes) {
      if (!Array.isArray(payload.schemes) || payload.schemes.length === 0) return { ok: false, error: 'schemes' };
      var ids = {};
      for (var i = 0; i < payload.schemes.length; i++) {
        if (!validateScheme(payload.schemes[i])) return { ok: false, error: 'scheme' };
        if (ids[payload.schemes[i].id]) return { ok: false, error: 'scheme-dup' };
        ids[payload.schemes[i].id] = true;
      }
      for (var j = 0; j < D.DEFAULT_SCHEMES.length; j++) {
        if (!ids[D.DEFAULT_SCHEMES[j].id]) return { ok: false, error: 'scheme-missing' };
      }
    }
    return { ok: true };
  }

  var api = {
    APP: D.APP, VERSION: D.VERSION,
    TIER_THRESHOLD_PAISA: D.TIER_THRESHOLD_PAISA,
    TDS_THRESHOLD_PAISA: D.TDS_THRESHOLD_PAISA,
    TDS_LOW: D.TDS_LOW, TDS_HIGH: D.TDS_HIGH,
    COMBINED_CAP_PAISA: D.COMBINED_CAP_PAISA,
    MIN_AMOUNT_PAISA: D.MIN_AMOUNT_PAISA,
    MAX_AMOUNT_PAISA: D.MAX_AMOUNT_PAISA,
    DEFAULT_SCHEMES: D.DEFAULT_SCHEMES,
    getScheme: getScheme,
    tierFor: tierFor,
    tdsRateFor: tdsRateFor,
    maturityRate: maturityRate,
    calcMaturity: calcMaturity,
    encashmentTable: encashmentTable,
    compareAll: compareAll,
    formatBDT: formatBDT,
    formatBDTLakh: formatBDTLakh,
    toBnDigits: toBnDigits,
    validAmount: validAmount,
    validRate: validRate,
    validateScheme: validateScheme,
    validateImport: validateImport
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.SanchayLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
