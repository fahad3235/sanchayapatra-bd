// sanchayapatra-bd — headless-Chrome smoke test via raw CDP (no puppeteer dependency).
// Usage: node tests/smoke.js
// Exits non-zero on any failed assertion; fails on page console errors.
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = 9351;
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');
let failures = 0;
let count = 0;
const pageErrors = [];
function check(name, cond, extra) {
  count++;
  console.log((cond ? 'ok - ' : 'FAIL - ') + name + (cond ? '' : ' :: ' + (extra || '')));
  if (!cond) failures++;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const CHROME_BIN = process.env.CHROME_BIN ||
    require('os').homedir() + '/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell';
  const chrome = spawn(CHROME_BIN, [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    '--remote-debugging-port=' + PORT, '--user-data-dir=/tmp/sanchay-smoke-' + process.pid,
    'about:blank',
  ], { stdio: 'ignore' });
  let targets = [];
  for (let i = 0; i < 50 && targets.length === 0; i++) {
    await wait(200);
    try {
      targets = JSON.parse(await new Promise((res, rej) => {
        http.get('http://127.0.0.1:' + PORT + '/json/list', (r) => {
          let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(d));
        }).on('error', rej);
      }));
    } catch (e) { /* retry */ }
  }
  if (!targets.length) { console.log('FAIL - chrome did not start'); process.exit(2); }
  const wsUrl = targets[0].webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  await new Promise((res) => { ws.onopen = res; });
  let seq = 0; const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') {
      pageErrors.push('exception: ' + JSON.stringify(msg.params.exceptionDetails).slice(0, 300));
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      pageErrors.push('console.error: ' + JSON.stringify(msg.params.args).slice(0, 300));
    }
  };
  function send(method, params) {
    return new Promise((res) => {
      const id = ++seq;
      pending.set(id, res);
      ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: FILE });
  await wait(1500);
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) return { error: JSON.stringify(r.result.exceptionDetails).slice(0, 300) };
    return r.result ? r.result.result.value : undefined;
  };
  const T = '৳';

  check('page title contains Sanchayapatra', (await ev('document.title'))?.includes('Sanchayapatra'));
  check('4 tabs render', (await ev(`document.querySelectorAll('.tab').length`)) === 4);
  check('calc tab visible by default', (await ev(`document.getElementById('tab-calc').hidden`)) === false);
  check('scheme select has 4 options', (await ev(`document.getElementById('schemeSel').options.length`)) === 4);
  check('5 presets render', (await ev(`document.querySelectorAll('.preset').length`)) === 5);

  // Default calc: Paribar ৳5,00,000 -> maturity ৳556,667.50, rate 11.93%, net ৳56,667.50.
  check('default maturity ' + T + '556,667.50', (await ev(`document.getElementById('resMaturity').textContent`)) === T + '556,667.50');
  check('default rate 11.93%', (await ev(`document.getElementById('resRate').textContent`)) === '11.93%');
  check('default net ' + T + '56,667.50', (await ev(`document.getElementById('resNet').textContent`)) === T + '56,667.50');
  check('default monthly payout ' + T + '944.46', (await ev(`document.getElementById('resPeriodic').textContent`)).includes(T + '944.46'));
  check('default tier label tier 1', (await ev(`document.getElementById('resTier').textContent`)).includes('Tier 1'));

  // Validation: zero amount shows inline error.
  await ev(`document.getElementById('amountInput').value='0'; document.getElementById('amountInput').dispatchEvent(new Event('input'));`);
  check('zero amount shows error', (await ev(`document.getElementById('calcError').hidden`)) === false);
  await ev(`document.getElementById('amountInput').value='500000'; document.getElementById('amountInput').dispatchEvent(new Event('input'));`);

  // Preset ৳10,00,000 -> Paribar tier 2 rate 11.80%, maturity ৳1,106,200.00.
  await ev(`document.querySelector('.preset[data-amount="1000000"]').click();`);
  check('preset 10L rate 11.80%', (await ev(`document.getElementById('resRate').textContent`)) === '11.80%');
  check('preset 10L maturity ' + T + '1,106,200.00', (await ev(`document.getElementById('resMaturity').textContent`)) === T + '1,106,200.00');
  await ev(`document.querySelector('.preset[data-amount="500000"]').click();`);

  // TDS override high: 5L paribar TDS 10% -> net ৳53,685.00.
  await ev(`document.getElementById('tdsSel').value='high'; document.getElementById('tdsSel').dispatchEvent(new Event('change'));`);
  check('TDS high net ' + T + '53,685.00', (await ev(`document.getElementById('resNet').textContent`)) === T + '53,685.00');
  await ev(`document.getElementById('tdsSel').value='auto'; document.getElementById('tdsSel').dispatchEvent(new Event('change'));`);

  // Compare tab: 4 rows, best pensioner, net ৳56,905.00.
  await ev(`document.getElementById('tabbtn-compare').click()`);
  check('compare has 4 rows', (await ev(`document.querySelectorAll('#cmpBody tr').length`)) === 4);
  check('compare best is Pensioner', (await ev(`document.querySelector('#cmpBody tr').textContent`)).includes('Pensioner'));
  check('compare best net ' + T + '56,905.00', (await ev(`document.querySelector('#cmpBody tr').textContent`)).includes(T + '56,905.00'));
  check('compare best shows BEST', (await ev(`document.querySelector('#cmpBody tr').textContent`)).includes('BEST'));

  // Encashment tab: 6 rows for Paribar; year 2 net ৳48,877.50; year 0 no profit.
  await ev(`document.getElementById('tabbtn-encash').click()`);
  check('encash has 6 rows', (await ev(`document.querySelectorAll('#encBody tr').length`)) === 6);
  check('encash year 2 net ' + T + '48,877.50', (await ev(`document.querySelectorAll('#encBody tr')[2].textContent`)).includes(T + '48,877.50'));
  check('encash year 0 total is principal', (await ev(`document.querySelectorAll('#encBody tr')[0].textContent`)).includes(T + '500,000.00'));

  // Rates tab: 4 rate cards; edit paribar tier1 to 12 -> calc reflects 12.00% / maturity ৳557,000.00.
  await ev(`document.getElementById('tabbtn-rates').click()`);
  check('rates tab has 4 cards', (await ev(`document.querySelectorAll('#rateRows .rate-card').length`)) === 4);
  check('rules tab has 4 cards', (await ev(`document.querySelectorAll('#rulesRows .rule-card').length`)) === 4);
  await ev(`document.getElementById('rate-paribar-tier1').value='12';`);
  await ev(`document.getElementById('saveRatesBtn').click()`);
  check('rates saved message', (await ev(`document.getElementById('ratesMsg').hidden`)) === false);
  await ev(`document.getElementById('tabbtn-calc').click()`);
  check('edited rate 12.00%', (await ev(`document.getElementById('resRate').textContent`)) === '12.00%');
  check('edited maturity ' + T + '557,000.00', (await ev(`document.getElementById('resMaturity').textContent`)) === T + '557,000.00');
  await ev(`document.getElementById('tabbtn-rates').click()`);
  await ev(`document.getElementById('resetRatesBtn').click()`);
  check('rate reset to 11.93', (await ev(`document.getElementById('rate-paribar-tier1').value`)) === '11.93');

  // Export / import round-trip + invalid import via test hooks.
  const payload = await ev(`window.__sanchay.exportPayload()`);
  check('export payload is sanchayapatra-bd v1', payload.includes('"app": "sanchayapatra-bd"') && payload.includes('"version": 1'), payload);
  await ev(`window.__sanchay.eraseAll()`);
  check('eraseAll resets paribar tier1', (await ev(`JSON.stringify(window.__sanchay.state.schemes[0])`)).includes('"tier1":11.93'));
  const imp = await ev(`JSON.stringify(window.__sanchay.importPayload(${JSON.stringify(payload)}))`);
  check('import valid payload ok', imp.includes('"ok":true'), imp);
  const badImp = await ev(`JSON.stringify(window.__sanchay.importPayload('{"app":"dua-bd","version":1}'))`);
  check('import wrong app rejected', badImp.includes('"ok":false'));
  check('invalid import leaves data intact', (await ev(`JSON.stringify(window.__sanchay.state.schemes)`)).includes('"tier1":11.93'));
  await ev(`window.__sanchay.eraseAll()`);

  // Language toggle: Bengali title + digits, persists after reload.
  await ev(`document.getElementById('langBtn').click()`);
  check('BN toggle: title in Bengali', (await ev(`document.getElementById('title').textContent`)) === 'সঞ্চয়পত্র বিডি');
  check('BN toggle: tab label in Bengali', (await ev(`document.getElementById('tabbtn-calc').textContent`)) === 'হিসাব');
  check('BN toggle: maturity in Bengali digits', (await ev(`document.getElementById('resMaturity').textContent`)) === T + '৫৫৬,৬৬৭.৫০');
  await send('Page.navigate', { url: FILE });
  await wait(1200);
  check('BN toggle persists after reload', (await ev(`window.__sanchay.state.lang`)) === 'bn');
  await ev(`document.getElementById('langBtn').click()`);
  check('back to EN', (await ev(`window.__sanchay.state.lang`)) === 'en');

  // Mobile 390px: no horizontal overflow on calc + compare + rates tabs.
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: FILE });
  await wait(1200);
  const overflow = await ev(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  check('390px no horizontal overflow (calc)', overflow <= 0, 'overflow=' + overflow);
  await ev(`document.getElementById('tabbtn-compare').click()`);
  const overflow2 = await ev(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  check('390px no horizontal overflow (compare)', overflow2 <= 0, 'overflow=' + overflow2);
  await ev(`document.getElementById('tabbtn-rates').click()`);
  const overflow3 = await ev(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  check('390px no horizontal overflow (rates)', overflow3 <= 0, 'overflow=' + overflow3);

  // Zero network requests: app is fully offline (only file:// loads).
  const reqs = await ev(`performance.getEntriesByType('resource').map(r => r.name).filter(n => !n.startsWith('file://')).length`);
  check('zero non-file network requests', reqs === 0, 'non-file=' + reqs);

  check('no console/page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

  chrome.kill();
  console.log('\n' + count + ' checks, ' + failures + ' failed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.log('FAIL - harness error: ' + e.message); try { chrome.kill(); } catch (_) {} process.exit(2); });
