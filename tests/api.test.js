// Tests for the server-side AI proxy (api/claude.js) with a stubbed upstream.
import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/claude.js';

function mockRes() {
  const r = { statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; }, setHeader() {} };
  return r;
}
const req = (body, ip = '1.1.1.' + Math.floor(Math.random() * 250)) => ({ method: 'POST', headers: { 'x-forwarded-for': ip }, body });
const realFetch = globalThis.fetch;

test('503 when no key is configured (never falls back to the client)', async () => {
  delete process.env.ANTHROPIC_API_KEY; delete process.env.VITE_ANTHROPIC_API_KEY;
  const res = mockRes(); await handler(req({ system: 's', userMsg: 'u' }), res);
  assert.equal(res.statusCode, 503);
});
test('rejects bad input and non-POST', async () => {
  process.env.ANTHROPIC_API_KEY = 'sk-test-secret';
  let res = mockRes(); await handler({ method: 'GET', headers: {} }, res); assert.equal(res.statusCode, 405);
  res = mockRes(); await handler(req({ system: 1, userMsg: 'u' }), res); assert.equal(res.statusCode, 400);
  res = mockRes(); await handler(req('{not json'), res); assert.equal(res.statusCode, 400);
  res = mockRes(); await handler(req({ system: 's', userMsg: 'x'.repeat(30000) }), res); assert.equal(res.statusCode, 413);
});
test('success returns text only; key is sent upstream but never returned; max_tokens capped', async () => {
  process.env.ANTHROPIC_API_KEY = 'sk-test-secret';
  let sent;
  globalThis.fetch = async (url, opts) => { sent = { url, opts }; return { ok: true, status: 200, json: async () => ({ content: [{ text: '{"a":1}' }], usage: { output_tokens: 5 } }) }; };
  const res = mockRes(); await handler(req({ system: 's', userMsg: 'u', maxTokens: 99999 }), res);
  globalThis.fetch = realFetch;
  assert.equal(res.statusCode, 200); assert.deepEqual(res.body, { text: '{"a":1}' });
  assert.equal(sent.opts.headers['x-api-key'], 'sk-test-secret');
  assert.ok(!JSON.stringify(res.body).includes('sk-test'));
  assert.equal(JSON.parse(sent.opts.body).max_tokens, 2000);
});
test('upstream error and network failure map to clean 5xx', async () => {
  process.env.ANTHROPIC_API_KEY = 'k';
  globalThis.fetch = async () => ({ ok: false, status: 529, json: async () => ({ error: { message: 'Overloaded' } }) });
  let res = mockRes(); await handler(req({ system: 's', userMsg: 'u' }), res); assert.equal(res.statusCode, 502);
  globalThis.fetch = async () => { const e = new Error('aborted'); e.name = 'AbortError'; throw e; };
  res = mockRes(); await handler(req({ system: 's', userMsg: 'u' }), res); assert.equal(res.statusCode, 504);
  globalThis.fetch = realFetch;
});
test('rate limit per client', async () => {
  process.env.ANTHROPIC_API_KEY = 'k';
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ content: [{ text: 'x' }] }) });
  let last; for (let i = 0; i < 31; i++) { last = mockRes(); await handler(req({ system: 's', userMsg: 'u' }, '9.9.9.9'), last); }
  globalThis.fetch = realFetch;
  assert.equal(last.statusCode, 429);
});
