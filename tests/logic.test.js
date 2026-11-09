// sanchayapatra-bd — Node unit tests for js/logic.js. Usage: node tests/logic.test.js
const L = require('../js/logic.js');

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('ok - ' + name); }
  else { fail++; console.log('FAIL - ' + name + (extra !== undefined ? ' :: ' + extra : '')); }
}
function eq(a, b) { return a === b; }

// --- Paribar ৳5,00,000 (tier 1, 11.93%, TDS 5%) ---
const p = L.calcMaturity({ amountPaisa: 50000000, schemeId: 'paribar' });
check('paribar 5L ok', p.ok === true);
check('paribar 5L tier 1', p.tier === 1);
check('paribar 5L rate 11.93', p.rate === 11.93);
check('paribar 5L gross 59,650', p.grossPaisa === 5965000, p.grossPaisa);
check('paribar 5L TDS 5% = 2,982.50', p.tdsPaisa === 298250, p.tdsPaisa);
check('paribar 5L net 56,667.50', p.netPaisa === 5666750, p.netPaisa);
check('paribar 5L maturity 556,667.50', p.maturityPaisa === 55666750, p.maturityPaisa);
check('paribar 5L monthly net 944.46', p.periodicNetPaisa === 94446, p.periodicNetPaisa);
check('paribar 5L monthly gross 994.17', p.periodicGrossPaisa === 99417, p.periodicGrossPaisa);
check('paribar 5L 60 periods', p.periods === 60);
check('paribar 5L not over cap', p.overCap === false);

// --- 5-year BD ৳10,00,000 (tier 2, 11.80%, TDS 10%) ---
const f = L.calcMaturity({ amountPaisa: 100000000, schemeId: 'five-year' });
check('five-year 10L tier 2', f.tier === 2);
check('five-year 10L rate 11.80', f.rate === 11.80);
check('five-year 10L gross 118,000', f.grossPaisa === 11800000, f.grossPaisa);
check('five-year 10L TDS 10% = 11,800', f.tdsPaisa === 1180000, f.tdsPaisa);
check('five-year 10L net 106,200', f.netPaisa === 10620000, f.netPaisa);
check('five-year 10L maturity 1,106,200', f.maturityPaisa === 110620000, f.maturityPaisa);
check('five-year payout maturity', f.payout === 'maturity' && f.periods === 1);

// --- 3-monthly ৳7,50,000 (tier 1 boundary, 11.82%, TDS 10%) ---
const q = L.calcMaturity({ amountPaisa: 75000000, schemeId: 'three-month' });
check('three-month 7.5L tier 1 (boundary)', q.tier === 1);
check('three-month 7.5L gross 88,650', q.grossPaisa === 8865000, q.grossPaisa);
check('three-month 7.5L TDS 10% = 8,865', q.tdsPaisa === 886500, q.tdsPaisa);
check('three-month 7.5L net 79,785', q.netPaisa === 7978500, q.netPaisa);
check('three-month quarterly net 6,648.75', q.periodicNetPaisa === 664875, q.periodicNetPaisa);
check('three-month 12 periods', q.periods === 12);

// --- Tier / TDS boundaries ---
check('tier 750,000 = 1', L.tierFor(75000000) === 1);
check('tier 750,001 = 2', L.tierFor(75000001) === 2);
check('TDS 500,000 = 5%', L.tdsRateFor(50000000, 'auto') === 0.05);
check('TDS 500,001 = 10%', L.tdsRateFor(50000001, 'auto') === 0.10);
check('TDS override low', L.tdsRateFor(100000000, 'low') === 0.05);
check('TDS override high', L.tdsRateFor(10000000, 'high') === 0.10);
const pHigh = L.calcMaturity({ amountPaisa: 50000000, schemeId: 'paribar', tdsMode: 'high' });
check('TDS override high on 5L = 10%', pHigh.tdsPaisa === 596500, pHigh.tdsPaisa);

// --- Caps ---
const big = L.calcMaturity({ amountPaisa: 460000000, schemeId: 'paribar' });
check('paribar 46L over single cap', big.overCap === true);
check('paribar 46L not over combined cap', big.overCombinedCap === false);
const huge = L.calcMaturity({ amountPaisa: 500000000, schemeId: 'pensioner' });
check('pensioner 50L at combined cap boundary', huge.overCombinedCap === false && huge.ok === true);

// --- Validation errors ---
check('amount 0 rejected', L.calcMaturity({ amountPaisa: 0, schemeId: 'paribar' }).ok === false);
check('amount 999 rejected (below min)', L.calcMaturity({ amountPaisa: 99900, schemeId: 'paribar' }).ok === false);
check('amount above max rejected', L.calcMaturity({ amountPaisa: 500000001, schemeId: 'paribar' }).ok === false);
check('unknown scheme rejected', L.calcMaturity({ amountPaisa: 50000000, schemeId: 'nope' }).ok === false);
check('bad tdsMode rejected', L.calcMaturity({ amountPaisa: 50000000, schemeId: 'paribar', tdsMode: 'x' }).ok === false);

// --- Encashment table: Paribar ৳5,00,000 ---
const e = L.encashmentTable({ amountPaisa: 50000000, schemeId: 'paribar' });
check('encash ok', e.ok === true);
check('encash 6 rows (0..5)', e.rows.length === 6, e.rows.length);
check('encash year 0: no profit', e.rows[0].grossPaisa === 0 && e.rows[0].totalPaisa === 50000000);
check('encash year 2: 10.29% gross 51,450', e.rows[2].grossPaisa === 5145000, e.rows[2].grossPaisa);
check('encash year 2: net 48,877.50', e.rows[2].netPaisa === 4887750, e.rows[2].netPaisa);
check('encash year 2: total 548,877.50', e.rows[2].totalPaisa === 54887750, e.rows[2].totalPaisa);
check('encash year 5 = maturity net', e.rows[5].netPaisa === 5666750, e.rows[5].netPaisa);
const e3 = L.encashmentTable({ amountPaisa: 50000000, schemeId: 'three-month' });
check('encash three-month 4 rows (0..3)', e3.rows.length === 4);
check('encash three-month year 1: 10.65%', e3.rows[1].rate === 10.65);

// --- Compare: ৳5,00,000 best is pensioner ---
const c = L.compareAll({ amountPaisa: 50000000 });
check('compare ok', c.ok === true);
check('compare 4 rows', c.rows.length === 4);
check('compare best is pensioner', c.rows[0].schemeId === 'pensioner', c.rows[0].schemeId);
check('compare best net 56,905', c.rows[0].netPaisa === 5690500, c.rows[0].netPaisa);
check('compare second is paribar', c.rows[1].schemeId === 'paribar');
check('compare sorted desc', c.rows[0].netPaisa >= c.rows[1].netPaisa && c.rows[2].netPaisa >= c.rows[3].netPaisa);

// --- Formatting ---
check('formatBDT 110,620,000 paisa', L.formatBDT(110620000) === '1,106,200.00', L.formatBDT(110620000));
check('formatBDT zero', L.formatBDT(0) === '0.00');
check('formatBDTLakh 50,00,000', L.formatBDTLakh(5000000) === '50,00,000', L.formatBDTLakh(5000000));
check('formatBDTLakh 7,50,000', L.formatBDTLakh(750000) === '7,50,000', L.formatBDTLakh(750000));
check('toBnDigits 123', L.toBnDigits('123') === '১২৩', L.toBnDigits('123'));

// --- Import validation ---
check('import valid ok', L.validateImport({ app: 'sanchayapatra-bd', version: 1, schemes: L.DEFAULT_SCHEMES }).ok === true);
check('import wrong app rejected', L.validateImport({ app: 'dua-bd', version: 1 }).ok === false);
check('import wrong version rejected', L.validateImport({ app: 'sanchayapatra-bd', version: 99 }).ok === false);
check('import bad rate rejected', L.validateImport({ app: 'sanchayapatra-bd', version: 1,
  schemes: JSON.parse(JSON.stringify(L.DEFAULT_SCHEMES).replace('"tier1":11.93', '"tier1":99')) }).ok === false);
check('import missing scheme rejected', L.validateImport({ app: 'sanchayapatra-bd', version: 1,
  schemes: L.DEFAULT_SCHEMES.slice(0, 3) }).ok === false);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
