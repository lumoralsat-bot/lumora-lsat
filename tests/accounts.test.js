// Account security: migration, linking, recovery, deletion, promo, Stripe webhook signatures, client auth.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createMockSupabase, legacyHash } from './helpers/mockSupabase.js';
import { verifyLegacyPassword } from '../api/_lib/supabase.js';
import migrate from '../api/auth-migrate.js';
import deleteAccount from '../api/delete-account.js';
import redeemPromo from '../api/redeem-promo.js';
import { verifyStripeSignature } from '../api/webhook.js';
import { createAuth } from '../src/auth.js';

const SB = 'http://sb.test';
const realFetch = globalThis.fetch;
let mock;
function setup(opts = {}) {
  mock = createMockSupabase({ site: 'https://app.test', ...opts });
  globalThis.fetch = (url, init) => String(url).startsWith(SB) ? mock.fetch(url, init) : Promise.reject(new Error('unexpected network: ' + url));
  Object.assign(process.env, { SUPABASE_URL: SB, SUPABASE_ANON_KEY: mock.anonKey, SUPABASE_SERVICE_ROLE_KEY: mock.serviceKey, SITE_URL: 'https://app.test', PROMO_CODES: 'EARLYACCESS, Demo2026' });
  delete process.env.STRIPE_SECRET_KEY;
  return mock;
}
test.after(() => { globalThis.fetch = realFetch; });

const res = () => ({ statusCode: 200, body: null, headers: {}, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; }, setHeader(k, v) { this.headers[k] = v; } });
let ipN = 0;
const call = async (handler, body, token) => { const r = res(); await handler({ method: 'POST', headers: { 'x-forwarded-for': '10.0.0.' + (++ipN % 250), ...(token ? { authorization: 'Bearer ' + token } : {}) }, body }, r); return r; };
const memStore = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), _m: m }; };
const clientAuth = () => createAuth({ url: SB, anonKey: mock.anonKey, storage: memStore(), fetchImpl: mock.fetch });
const seedLegacy = (email, pw, extra = {}) => mock.state.rows.push({ id: mock.state.nextId++, email, name: 'Old User', password_hash: legacyHash(pw), auth_id: null, is_pro: false, stats: { xp: 50 }, ...extra });

// ── legacy password check ──
test('legacy hash check matches the old client scheme and is strict', () => {
  assert.ok(verifyLegacyPassword('hunter22', legacyHash('hunter22')));
  assert.ok(!verifyLegacyPassword('hunter23', legacyHash('hunter22')));
  assert.ok(verifyLegacyPassword('plainpw', 'plainpw'), 'very old plaintext rows');
  assert.ok(!verifyLegacyPassword('', ''));
});

// ── seamless migration ──
test('legacy user: correct old password migrates once, erases old hash, keeps progress', async () => {
  setup(); seedLegacy('leg@x.com', 'oldpass1');
  const r = await call(migrate, { action: 'legacy_login', email: 'Leg@X.com', password: 'oldpass1' });
  assert.deepEqual(r.body, { migrated: true });
  const row = mock.state.rows[0];
  assert.ok(row.auth_id); assert.equal(row.password_hash, null); assert.ok(row.migrated_at); assert.equal(row.stats.xp, 50);
  const a = clientAuth();
  assert.ok((await a.signIn('leg@x.com', 'oldpass1')).session, 'can now sign in with Supabase Auth using the same password');
  const again = await call(migrate, { action: 'legacy_login', email: 'leg@x.com', password: 'oldpass1' });
  assert.deepEqual(again.body, { migrated: false }, 'second attempt is a no-op');
});
test('wrong password and unknown email get the identical generic answer (no account enumeration)', async () => {
  setup(); seedLegacy('leg@x.com', 'oldpass1');
  const wrong = await call(migrate, { action: 'legacy_login', email: 'leg@x.com', password: 'nope-nope' });
  const unknown = await call(migrate, { action: 'legacy_login', email: 'nobody@x.com', password: 'nope-nope' });
  assert.deepEqual(wrong.body, unknown.body); assert.equal(wrong.statusCode, unknown.statusCode);
  assert.equal(mock.state.authUsers.length, 0);
});
test('migration never overwrites a CONFIRMED login owned by someone who proved the inbox', async () => {
  setup(); seedLegacy('leg@x.com', 'oldpass1');
  mock.state.authUsers.push({ id: 'owner', email: 'leg@x.com', password: 'theirs123', email_confirmed_at: '2026-01-01' });
  const r = await call(migrate, { action: 'legacy_login', email: 'leg@x.com', password: 'oldpass1' });
  assert.equal(r.body.useReset, true);
  assert.equal(mock.state.authUsers[0].password, 'theirs123'); assert.equal(mock.state.rows[0].auth_id, null);
});
test('an UNCONFIRMED sign-up squatting a legacy email is taken over by the real legacy owner', async () => {
  setup(); seedLegacy('leg@x.com', 'oldpass1');
  mock.state.authUsers.push({ id: 'squat', email: 'leg@x.com', password: 'attacker1', email_confirmed_at: null });
  const r = await call(migrate, { action: 'legacy_login', email: 'leg@x.com', password: 'oldpass1' });
  assert.deepEqual(r.body, { migrated: true });
  assert.equal(mock.state.authUsers[0].password, 'oldpass1'); assert.equal(mock.state.rows[0].auth_id, 'squat');
});
test('migration attempts are rate limited per email', async () => {
  setup(); seedLegacy('rl@x.com', 'oldpass1');
  let last; for (let i = 0; i < 8; i++) last = await call(migrate, { action: 'legacy_login', email: 'rl@x.com', password: 'wrong-' + i });
  assert.equal(last.statusCode, 429);
});

// ── link & recover ──
test('link: requires a confirmed login; links only the row with the same verified email', async () => {
  setup(); seedLegacy('leg@x.com', 'oldpass1'); seedLegacy('other@x.com', 'zzzzzz1');
  mock.state.authUsers.push({ id: 'u1', email: 'leg@x.com', password: 'newpass12', email_confirmed_at: '2026-01-01' });
  const a = clientAuth(); const { session } = await a.signIn('leg@x.com', 'newpass12');
  const r = await call(migrate, { action: 'link' }, session.access_token);
  assert.deepEqual(r.body, { linked: true });
  assert.equal(mock.state.rows.find(x => x.email === 'leg@x.com').auth_id, 'u1');
  assert.equal(mock.state.rows.find(x => x.email === 'other@x.com').auth_id, null);
  assert.equal((await call(migrate, { action: 'link' })).statusCode, 401, 'no token, no link');
});
test('recover: same response for any email; unmigrated legacy accounts get an invite email', async () => {
  setup(); seedLegacy('leg@x.com', 'oldpass1');
  const a = await call(migrate, { action: 'recover', email: 'leg@x.com', redirectTo: 'https://app.test/' });
  const b = await call(migrate, { action: 'recover', email: 'ghost@x.com', redirectTo: 'https://evil.test/' });
  assert.deepEqual(a.body, b.body);
  assert.equal(mock.state.emails.length, 1); assert.equal(mock.state.emails[0].type, 'invite'); assert.equal(mock.state.emails[0].to, 'leg@x.com');
});

// ── deletion ──
test('delete-account: needs token + explicit confirmation; removes profile and login; other users untouched', async () => {
  setup({ confirmEmail: false });
  const a = clientAuth(); const { session } = await a.signUp('del@x.com', 'password1', 'Del');
  mock.state.rows.push({ id: 99, auth_id: session.user.id, email: 'del@x.com', name: 'Del' }); seedLegacy('keep@x.com', 'keep123');
  assert.equal((await call(deleteAccount, { confirm: 'DELETE' })).statusCode, 401);
  assert.equal((await call(deleteAccount, {}, session.access_token)).statusCode, 400);
  const r = await call(deleteAccount, { confirm: 'DELETE' }, session.access_token);
  assert.deepEqual(r.body, { ok: true });
  assert.equal(mock.state.rows.filter(x => x.email === 'del@x.com').length, 0);
  assert.equal(mock.state.authUsers.filter(x => x.email === 'del@x.com').length, 0);
  assert.equal(mock.state.rows.filter(x => x.email === 'keep@x.com').length, 1);
});

// ── promo ──
test('promo codes are checked on the server and grant Pro only to the caller', async () => {
  setup({ confirmEmail: false });
  const a = clientAuth(); const { session } = await a.signUp('p@x.com', 'password1', 'P');
  mock.state.rows.push({ id: 7, auth_id: session.user.id, email: 'p@x.com', is_pro: false }); seedLegacy('q@x.com', 'qqqqqq1');
  assert.equal((await call(redeemPromo, { code: 'EARLYACCESS' })).statusCode, 401);
  assert.equal((await call(redeemPromo, { code: 'WRONG' }, session.access_token)).body.ok, false);
  assert.equal((await call(redeemPromo, { code: ' demo2026 ' }, session.access_token)).body.ok, true);
  assert.equal(mock.state.rows.find(x => x.id === 7).is_pro, true);
  assert.equal(mock.state.rows.find(x => x.email === 'q@x.com').is_pro, false);
});

// ── row rules (mirrors the SQL; the SQL itself is tested on Postgres) ──
test('a signed-in browser cannot read others, read hashes, or grant itself Pro', async () => {
  setup({ confirmEmail: false });
  const a = clientAuth(); const { session } = await a.signUp('me@x.com', 'password1', 'Me');
  mock.state.rows.push({ id: 1, auth_id: session.user.id, email: 'me@x.com', is_pro: false }); seedLegacy('you@x.com', 'yyyyyy1');
  const get = (q) => a.authedFetch(SB + '/rest/v1/users?' + q).then(r => r.json().then(b => ({ s: r.status, b })));
  assert.equal((await get('select=id,email')).b.length, 1);
  assert.equal((await get('select=email,password_hash')).s, 401);
  const patch = await a.authedFetch(SB + '/rest/v1/users?auth_id=eq.' + session.user.id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_pro: true }) });
  assert.equal(patch.status, 401); assert.equal(mock.state.rows[0].is_pro, false);
});

// ── client auth library ──
test('client auth: refreshes an expired token automatically and signs out cleanly', async () => {
  setup({ confirmEmail: false });
  let t = Date.now();
  const store = memStore();
  const a = createAuth({ url: SB, anonKey: mock.anonKey, storage: store, fetchImpl: mock.fetch, now: () => t });
  await a.signUp('r@x.com', 'password1', 'R');
  const first = a.getSession().access_token;
  t += 2 * 3600_000; // past expiry
  const tok = await a.accessToken();
  assert.ok(tok && tok !== first);
  await a.signOut();
  assert.equal(a.getSession(), null); assert.equal(store._m.size, 0, 'nothing left in storage after sign-out');
});
test('client auth: signup with confirmation returns needsConfirmation and stores no session', async () => {
  setup({ confirmEmail: true });
  const a = clientAuth();
  assert.deepEqual(await a.signUp('c@x.com', 'password1', 'C'), { needsConfirmation: true });
  assert.equal(a.getSession(), null);
  assert.equal((await a.signIn('c@x.com', 'password1')).error, 'unconfirmed');
});

// ── Stripe webhook signatures ──
test('webhook signature: valid accepted; forged, stale, or missing rejected', () => {
  const secret = 'whsec_test'; const body = Buffer.from('{"type":"checkout.session.completed"}');
  const t = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
  assert.ok(verifyStripeSignature(body, `t=${t},v1=${sig}`, secret));
  assert.ok(!verifyStripeSignature(body, `t=${t},v1=${'0'.repeat(64)}`, secret));
  assert.ok(!verifyStripeSignature(body, `t=${t - 3600},v1=${sig}`, secret), 'replay outside tolerance');
  assert.ok(!verifyStripeSignature(body, undefined, secret));
  assert.ok(!verifyStripeSignature(body, `t=${t},v1=${sig}`, ''), 'no secret configured → reject');
});
