// sanchayapatra-bd — UI wiring (DOM). All math lives in js/logic.js.
(function () {
  'use strict';

  var L = window.SanchayLogic;
  var I18N = window.SanchayI18n;
  var LS_KEY = 'sanchayapatra-bd:v1';
  var TAKA = '৳';

  var state = {
    lang: 'en',
    schemeId: 'paribar',
    amount: 500000,
    tdsMode: 'auto',
    schemes: JSON.parse(JSON.stringify(L.DEFAULT_SCHEMES))
  };

  function $(id) { return document.getElementById(id); }

  function t(key) { return I18N.STR[state.lang][key]; }
  function schemeName(id) { return I18N.SCHEME_NAMES[state.lang][id]; }

  function loadState() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s.lang === 'en' || s.lang === 'bn') state.lang = s.lang;
      if (s.schemeId && L.getScheme(L.DEFAULT_SCHEMES, s.schemeId)) state.schemeId = s.schemeId;
      if (typeof s.amount === 'number' && s.amount > 0) state.amount = s.amount;
      if (['auto', 'low', 'high'].indexOf(s.tdsMode) !== -1) state.tdsMode = s.tdsMode;
      if (s.schemes && L.validateImport({ app: L.APP, version: L.VERSION, schemes: s.schemes }).ok) {
        state.schemes = s.schemes;
      }
    } catch (e) { /* corrupted storage: keep defaults */ }
  }

  function saveState() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        lang: state.lang, schemeId: state.schemeId, amount: state.amount,
        tdsMode: state.tdsMode, schemes: state.schemes
      }));
    } catch (e) { /* storage unavailable: app still works */ }
  }

  function fmt(paisa) {
    var s = TAKA + L.formatBDT(paisa);
    return state.lang === 'bn' ? L.toBnDigits(s) : s;
  }
  function fmtTaka(taka) {
    var s = TAKA + L.formatBDTLakh(taka);
    return state.lang === 'bn' ? L.toBnDigits(s) : s;
  }
  function fmtPct(r) {
    var s = (Math.round(r * 100) / 100).toFixed(2) + '%';
    return state.lang === 'bn' ? L.toBnDigits(s) : s;
  }
  function fmtNum(n) {
    var s = String(n);
    return state.lang === 'bn' ? L.toBnDigits(s) : s;
  }

  function applyI18n() {
    document.documentElement.lang = state.lang === 'bn' ? 'bn' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    $('langBtn').textContent = t('langBtn');
    $('title').textContent = t('title');
    // Scheme select options
    var sel = $('schemeSel');
    Array.prototype.forEach.call(sel.options, function (opt) {
      opt.textContent = schemeName(opt.value);
    });
    // TDS select options
    $('tdsSel').options[0].textContent = t('tdsAuto');
    $('tdsSel').options[1].textContent = t('tdsLow');
    $('tdsSel').options[2].textContent = t('tdsHigh');
    renderRatesTab();
    renderRulesTab();
    renderResults();
    renderCompare();
    renderEncash();
  }

  function switchTab(name) {
    ['calc', 'compare', 'encash', 'rates'].forEach(function (n) {
      $('tab-' + n).hidden = n !== name;
      $('tabbtn-' + n).classList.toggle('active', n === name);
      $('tabbtn-' + n).setAttribute('aria-selected', n === name ? 'true' : 'false');
    });
    if (name === 'compare') renderCompare();
    if (name === 'encash') renderEncash();
  }

  function readAmount() {
    var raw = $('amountInput').value.replace(/[,\s]/g, '');
    var n = parseFloat(raw);
    if (!isFinite(n)) return null;
    return Math.round(n * 100);
  }

  function renderResults() {
    var res = $('calcResult');
    var err = $('calcError');
    var amountPaisa = readAmount();
    if (amountPaisa === null || !L.validAmount(amountPaisa)) {
      res.hidden = true;
      err.hidden = false;
      err.textContent = t('errAmount');
      return;
    }
    err.hidden = true;
    var r = L.calcMaturity({
      amountPaisa: amountPaisa, schemeId: state.schemeId,
      tdsMode: state.tdsMode, schemes: state.schemes
    });
    if (!r.ok) { res.hidden = true; err.hidden = false; err.textContent = t('errAmount'); return; }
    state.amount = amountPaisa / 100; // state.amount is in taka
    saveState();
    res.hidden = false;
    $('resTitle').textContent = t('resTitle') + ' — ' + schemeName(r.schemeId);
    $('resRate').textContent = fmtPct(r.rate);
    $('resTier').textContent = t(r.tier === 1 ? 'tier1' : 'tier2');
    $('resGross').textContent = fmt(r.grossPaisa);
    $('resTds').textContent = '− ' + fmt(r.tdsPaisa) + ' (' + fmtPct(r.tdsRate * 100) + ')';
    $('resNet').textContent = fmt(r.netPaisa);
    $('resMaturity').textContent = fmt(r.maturityPaisa);
    var payoutLabel = r.payout === 'monthly' ? t('monthly')
      : r.payout === 'quarterly' ? t('quarterly') : t('atMaturity');
    $('resPeriodic').textContent = fmt(r.periodicNetPaisa) + ' ' + payoutLabel;
    $('resPeriodicGross').textContent = '(' + fmt(r.periodicGrossPaisa) + ' ' + t('grossProfit').toLowerCase() + ')';
    $('capWarn').hidden = !r.overCap;
    $('capWarn').textContent = t('capWarn');
    $('combinedWarn').hidden = !r.overCombinedCap;
    $('combinedWarn').textContent = t('combinedWarn');
    $('tdsNote').textContent = t('tdsNote');
  }

  function renderCompare() {
    var amountPaisa = readAmount();
    var body = $('cmpBody');
    body.innerHTML = '';
    if (amountPaisa === null || !L.validAmount(amountPaisa)) {
      $('cmpError').hidden = false;
      $('cmpError').textContent = t('errAmount');
      $('cmpTable').hidden = true;
      return;
    }
    $('cmpError').hidden = true;
    $('cmpTable').hidden = false;
    var c = L.compareAll({ amountPaisa: amountPaisa, tdsMode: state.tdsMode, schemes: state.schemes });
    if (!c.ok) return;
    c.rows.forEach(function (r, i) {
      var tr = document.createElement('tr');
      var payoutLabel = r.payout === 'monthly' ? t('monthly')
        : r.payout === 'quarterly' ? t('quarterly') : t('atMaturity');
      var name = schemeName(r.schemeId) + (i === 0 ? ' ★ ' + t('cmpBest') : '');
      var cells = [name, fmtPct(r.rate), fmt(r.grossPaisa), '− ' + fmt(r.tdsPaisa),
        fmt(r.netPaisa), fmt(r.maturityPaisa), fmt(r.periodicNetPaisa) + ' ' + payoutLabel];
      cells.forEach(function (cText, j) {
        var td = document.createElement(j === 0 ? 'th' : 'td');
        td.textContent = cText;
        if (j === 0) td.scope = 'row';
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
  }

  function renderEncash() {
    var amountPaisa = readAmount();
    var body = $('encBody');
    body.innerHTML = '';
    if (amountPaisa === null || !L.validAmount(amountPaisa)) {
      $('encError').hidden = false;
      $('encError').textContent = t('errAmount');
      $('encTable').hidden = true;
      return;
    }
    $('encError').hidden = true;
    $('encTable').hidden = false;
    var tbl = L.encashmentTable({
      amountPaisa: amountPaisa, schemeId: state.schemeId,
      tdsMode: state.tdsMode, schemes: state.schemes
    });
    if (!tbl.ok) return;
    $('encTitle').textContent = t('encTitle') + ' — ' + schemeName(state.schemeId);
    tbl.rows.forEach(function (row) {
      var tr = document.createElement('tr');
      var yearLabel = row.year === 0 ? '0 ' + t('encYearUnit')
        : row.year === tbl.rows.length - 1
          ? fmtNum(row.year) + ' ' + t('encYearUnit') + ' (' + t('encMaturity') + ')'
          : fmtNum(row.year) + ' ' + t('encYearUnit');
      [yearLabel, fmtPct(row.rate), fmt(row.grossPaisa), '− ' + fmt(row.tdsPaisa),
        fmt(row.netPaisa), fmt(row.totalPaisa)].forEach(function (cText, j) {
        var td = document.createElement(j === 0 ? 'th' : 'td');
        td.textContent = cText;
        if (j === 0) td.scope = 'row';
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
  }

  function renderRatesTab() {
    var wrap = $('rateRows');
    wrap.innerHTML = '';
    state.schemes.forEach(function (s) {
      var div = document.createElement('div');
      div.className = 'rate-card';
      var h = document.createElement('h3');
      h.textContent = schemeName(s.id);
      div.appendChild(h);
      [['tier1', 'ratesTier1'], ['tier2', 'ratesTier2']].forEach(function (pair) {
        var lab = document.createElement('label');
        lab.textContent = t(pair[1]);
        var inp = document.createElement('input');
        inp.type = 'number'; inp.step = '0.01'; inp.min = '0'; inp.max = '30';
        inp.id = 'rate-' + s.id + '-' + pair[0];
        inp.value = s[pair[0]];
        inp.setAttribute('inputmode', 'decimal');
        lab.appendChild(inp);
        div.appendChild(lab);
      });
      wrap.appendChild(div);
    });
  }

  function renderRulesTab() {
    var wrap = $('rulesRows');
    wrap.innerHTML = '';
    state.schemes.forEach(function (s) {
      var div = document.createElement('div');
      div.className = 'rule-card';
      var h = document.createElement('h3');
      h.textContent = schemeName(s.id);
      div.appendChild(h);
      var payoutKey = s.payout === 'monthly' ? 'ruleMonthly'
        : s.payout === 'quarterly' ? 'ruleQuarterly' : 'ruleMaturity';
      var rows = [
        [t('ruleTerm'), fmtNum(s.years) + ' ' + t('ruleYears')],
        [t('rulePayout'), t(payoutKey)],
        [t('ruleCapSingle'), fmtTaka(s.capSingle)],
        [t('ruleCapJoint'), s.capJoint ? fmtTaka(s.capJoint) : t('ruleCapNone')],
        [t('eligibility'), t('elig' + s.id.charAt(0).toUpperCase() + s.id.slice(1).replace(/-(\w)/g, function (_, c) { return c.toUpperCase(); }))]
      ];
      rows.forEach(function (pair) {
        var p = document.createElement('p');
        var b = document.createElement('strong');
        b.textContent = pair[0] + ': ';
        p.appendChild(b);
        p.appendChild(document.createTextNode(pair[1]));
        div.appendChild(p);
      });
      wrap.appendChild(div);
    });
    $('combinedCapNote').textContent = t('combinedCap');
  }

  function saveRatesFromInputs() {
    var next = JSON.parse(JSON.stringify(state.schemes));
    for (var i = 0; i < next.length; i++) {
      var s = next[i];
      var v1 = parseFloat($('rate-' + s.id + '-tier1').value);
      var v2 = parseFloat($('rate-' + s.id + '-tier2').value);
      if (!L.validRate(v1) || !L.validRate(v2)) return false;
      s.tier1 = v1; s.tier2 = v2;
    }
    state.schemes = next;
    saveState();
    return true;
  }

  function exportPayload() {
    return JSON.stringify({ app: L.APP, version: L.VERSION, schemes: state.schemes }, null, 2);
  }

  function importPayload(text) {
    var payload;
    try { payload = JSON.parse(text); } catch (e) { return { ok: false, error: 'json' }; }
    var v = L.validateImport(payload);
    if (!v.ok) return v;
    state.schemes = payload.schemes;
    saveState();
    renderRatesTab();
    renderResults();
    return { ok: true };
  }

  function eraseAll() {
    state.schemes = JSON.parse(JSON.stringify(L.DEFAULT_SCHEMES));
    try { localStorage.removeItem(LS_KEY); } catch (e) {}
    saveState();
    renderRatesTab();
    renderResults();
  }

  function init() {
    loadState();
    // Scheme select
    var sel = $('schemeSel');
    L.DEFAULT_SCHEMES.forEach(function (s) {
      var opt = document.createElement('option');
      opt.value = s.id;
      sel.appendChild(opt);
    });
    sel.value = state.schemeId;
    $('amountInput').value = String(state.amount);
    $('tdsSel').value = state.tdsMode;

    $('calcBtn').addEventListener('click', renderResults);
    $('amountInput').addEventListener('input', function () { renderResults(); renderCompare(); renderEncash(); });
    sel.addEventListener('change', function () { state.schemeId = sel.value; saveState(); renderResults(); renderEncash(); });
    $('tdsSel').addEventListener('change', function () { state.tdsMode = $('tdsSel').value; saveState(); renderResults(); renderCompare(); renderEncash(); });
    document.querySelectorAll('.preset').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $('amountInput').value = btn.getAttribute('data-amount');
        renderResults(); renderCompare(); renderEncash();
      });
    });
    ['calc', 'compare', 'encash', 'rates'].forEach(function (n) {
      $('tabbtn-' + n).addEventListener('click', function () { switchTab(n); });
    });
    $('langBtn').addEventListener('click', function () {
      state.lang = state.lang === 'en' ? 'bn' : 'en';
      saveState();
      applyI18n();
    });
    $('saveRatesBtn').addEventListener('click', function () {
      if (saveRatesFromInputs()) {
        $('ratesMsg').hidden = false;
        $('ratesMsg').textContent = t('ratesSaved');
        $('ratesErr').hidden = true;
        renderResults(); renderCompare(); renderEncash();
      } else {
        $('ratesErr').hidden = false;
        $('ratesErr').textContent = t('ratesErr');
        $('ratesMsg').hidden = true;
      }
    });
    $('resetRatesBtn').addEventListener('click', function () {
      state.schemes = JSON.parse(JSON.stringify(L.DEFAULT_SCHEMES));
      saveState();
      renderRatesTab();
      $('ratesMsg').hidden = false;
      $('ratesMsg').textContent = t('ratesResetDone');
      $('ratesErr').hidden = true;
      renderResults(); renderCompare(); renderEncash();
    });
    $('exportBtn').addEventListener('click', function () {
      var blob = new Blob([exportPayload()], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'sanchayapatra-bd-rates.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
    $('importFile').addEventListener('change', function () {
      var f = $('importFile').files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        var r = importPayload(String(reader.result));
        $('importMsg').hidden = false;
        $('importMsg').textContent = r.ok ? t('importOk') : t('importErr');
      };
      reader.readAsText(f);
      $('importFile').value = '';
    });
    $('eraseBtn').addEventListener('click', function () {
      eraseAll();
      $('eraseMsg').hidden = false;
      $('eraseMsg').textContent = t('eraseDone');
    });

    applyI18n();
    renderResults();
  }

  window.__sanchay = {
    state: state,
    exportPayload: exportPayload,
    importPayload: importPayload,
    eraseAll: eraseAll
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
