// Run against a Chrome started with --remote-debugging-port=9224.
// A fresh browser context blocks all third-party HTTP requests before testing.
import assert from 'node:assert/strict';
const base = process.argv[2] || 'http://127.0.0.1:8765/';
const info = await fetch('http://127.0.0.1:9224/json/version').then(r => r.json());
async function connect(url) {
  const socket = new WebSocket(url); const pending = new Map(); let id = 0;
  const listeners = [];
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) { const task = pending.get(message.id); if (!task) return; pending.delete(message.id); message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result); }
    else for (const callback of listeners) callback(message);
  };
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  return { socket, listeners, send(method, params = {}) { const n = ++id; return new Promise((resolve, reject) => { pending.set(n, { resolve, reject }); socket.send(JSON.stringify({ id: n, method, params })); }); } };
}
const browser = await connect(info.webSocketDebuggerUrl);
const { browserContextId } = await browser.send('Target.createBrowserContext');
const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank', browserContextId });
const pages = await fetch('http://127.0.0.1:9224/json').then(r => r.json());
const page = await connect(pages.find(p => p.id === targetId).webSocketDebuggerUrl);
const external = [], errors = [], requests = [];
page.listeners.push(message => {
  if (message.method === 'Fetch.requestPaused') {
    const { requestId, request } = message.params;
    const blocked = /^https?:/.test(request.url) && new URL(request.url).origin !== new URL(base).origin;
    requests.push(request.url);
    if (blocked) external.push(request.url);
    page.send(blocked ? 'Fetch.failRequest' : 'Fetch.continueRequest', blocked ? { requestId, errorReason: 'BlockedByClient' } : { requestId }).catch(() => {});
  }
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.exception?.description);
  if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type)) console.log('browser:', message.params.args.map(a => a.value || a.description).join(' ').slice(0, 1000));
});
async function evaluate(expression) {
  const result = await page.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function waitFor(expression, seconds = 150) {
  for (let i = 0; i < seconds; i++) { const result = await evaluate(expression); if (result) return result; await new Promise(r => setTimeout(r, 1000)); }
  throw new Error('Timed out: ' + expression);
}
try {
  await page.send('Runtime.enable'); await page.send('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await page.send('Page.navigate', { url: base });
  await waitFor(`document.querySelector('#imageInput') && document.readyState === 'complete'`);
  const pickerRoutes = await evaluate(`(() => {
    const inputs = [imageInput, cameraInput]; const clicked = [];
    const original = inputs.map(input => input.click);
    inputs.forEach(input => input.click = () => clicked.push(input.id));
    choosePhotoButton.click(); takePhotoButton.click();
    inputs.forEach((input, i) => input.click = original[i]);
    return { clicked, albumCapture: imageInput.hasAttribute('capture'), cameraCapture: cameraInput.getAttribute('capture'), fits: document.documentElement.scrollWidth === innerWidth };
  })()`);
  assert.deepEqual(pickerRoutes, { clicked: ['imageInput', 'cameraInput'], albumCapture: false, cameraCapture: 'environment', fits: true });
  console.log('Upload pickers', pickerRoutes);
  await evaluate(`(async () => {
    const c = document.createElement('canvas'); c.width = 900; c.height = 400;
    const ctx = c.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0,0,900,400); ctx.fillStyle = 'black'; ctx.font = '48px Arial';
    ['apple','window','happy'].forEach((word,i) => ctx.fillText(word,60,90+i*100));
    const blob = await new Promise(r => c.toBlob(r)); const dt = new DataTransfer(); dt.items.add(new File([blob], 'words.png', { type: 'image/png' }));
    imageInput.files = dt.files; imageInput.dispatchEvent(new Event('change'));
  })()`);
  const ocr = await waitFor(`!ocrProgress.classList.contains('visible') && ({engine:ocrEngineStatus.textContent, words:wordEditor.value, status:uploadStatus.textContent})`);
  console.log('OCR', ocr); for (const word of ['apple','window','happy']) assert.ok(ocr.words.includes(word));
  assert.ok(ocr.engine.includes('PaddleOCR'));
  await evaluate(`voiceModeSelect.value='kokoro-female'; startButton.click()`);
  const tts = await waitFor(`/自然音色/.test(listenState.textContent) && /正在播放|再听/.test(listenState.textContent) ? listenState.textContent : uploadStatus.textContent.includes('自动切换') ? 'fallback' : false`);
  assert.notEqual(tts, 'fallback'); console.log('TTS', tts);
  await evaluate('clearSessionButton.click()');
  assert.equal(await evaluate('sessionCount.textContent'), '0 / 0');
  assert.deepEqual(external, []); assert.deepEqual(errors, []);
  console.log(JSON.stringify({ success: true, base, external, requests: [...new Set(requests)].filter(u => /^https?:/.test(u)), errors }, null, 2));
} finally {
  page.socket.close(); await browser.send('Target.disposeBrowserContext', { browserContextId }); browser.socket.close();
}
