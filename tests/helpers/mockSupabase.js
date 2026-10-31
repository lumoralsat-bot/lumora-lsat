// In-memory stand-in for Supabase Auth (GoTrue) + PostgREST, used ONLY by tests.
// It mimics the behaviour that matters for the security upgrade: tokens, email confirmation,
// admin API, and the same row/column rules as supabase/migrations/002_lockdown_rls.sql.
// (The real SQL policies are tested separately against Postgres: supabase/tests/rls_test.sql.)
import crypto from 'node:crypto';

const READABLE = ['id', 'auth_id', 'email', 'name', 'avatar_color', 'avatar_emoji', 'diagnostic_done', 'diagnostic', 'history', 'notes', 'study_plan', 'learn_progress', 'earned_badges', 'stats', 'onboarding_done', 'is_pro', 'subscription_status', 'created_at'];
const INSERTABLE = ['auth_id', 'email', 'name', 'avatar_color', 'avatar_emoji', 'diagnostic_done', 'diagnostic', 'history', 'notes', 'study_plan', 'learn_progress', 'earned_badges', 'stats', 'onboarding_done'];
const UPDATABLE = INSERTABLE.filter(c => c !== 'auth_id' && c !== 'email');

export function createMockSupabase({ anonKey = 'anon-key', serviceKey = 'service-key', confirmEmail = true, site = 'http://localhost' } = {}) {
  const st = { authUsers: [], tokens: new Map(), refresh: new Map(), rows: [], emails: [], nextId: 1, confirmEmail, site };
  const uuid = () => crypto.randomUUID();
  const session = (u) => {
    const access_token = 'at_' + crypto.randomBytes(12).toString('hex'); const refresh_token = 'rt_' + crypto.randomBytes(12).toString('hex');
    st.tokens.set(access_token, { uid: u.id, exp: Date.now() + 3600_000 }); st.refresh.set(refresh_token, u.id);
    return { access_token, refresh_token, expires_in: 3600, token_type: 'bearer', user: pubUser(u) };
  };
  const pubUser = (u) => ({ id: u.id, email: u.email, email_confirmed_at: u.email_confirmed_at, user_metadata: u.user_metadata || {} });
  const byEmail = (e) => st.authUsers.find(u => u.email === String(e || '').toLowerCase());
  const json = (status, body) => ({ status, body });
  const role = (h) => {
    const bearer = (h.authorization || '').replace(/^Bearer\s+/i, '');
    if (bearer === serviceKey || (!bearer && h.apikey === serviceKey)) return { role: 'service' };
    const t = st.tokens.get(bearer);
    if (t && t.exp > Date.now()) { const u = st.authUsers.find(x => x.id === t.uid); if (u && t.viaEmail) u.email_confirmed_at ||= new Date().toISOString(); if (u) return { role: 'authenticated', uid: u.id, email: u.email }; }
    if (bearer && bearer !== anonKey) return { role: 'invalid' };
    return { role: 'anon' };
  };
  const filt = (q) => {
    const fs = [];
    for (const [k, v] of q.entries()) {
      if (['select', 'limit', 'redirect_to', 'grant_type'].includes(k)) continue;
      if (v.startsWith('eq.')) fs.push(r => String(r[k]) === decodeURIComponent(v.slice(3)));
      else if (v === 'is.null') fs.push(r => r[k] == null);
    }
    return (r) => fs.every(f => f(r));
  };
  const project = (r, sel) => sel === '*' ? { ...r } : Object.fromEntries(sel.split(',').map(c => [c, r[c] ?? null]));
  const denied = () => json(401, { code: '42501', message: 'permission denied for table users' });
  // Visiting a Supabase email link verifies the address; the mock folds "send" and "verify" together.
  const sendEmail = (u, type) => { const s = session(u); st.tokens.get(s.access_token).viaEmail = true; st.emails.push({ to: u.email, type, link: `${st.site}/#access_token=${s.access_token}&refresh_token=${s.refresh_token}&expires_in=3600&type=${type}` }); };

  function handle(method, rawUrl, headers = {}, bodyText = '') {
    const h = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
    if (h.apikey !== anonKey && h.apikey !== serviceKey) return json(401, { message: 'No API key found in request' });
    const url = new URL(rawUrl, 'http://x'); const path = url.pathname.replace(/^.*?(\/auth\/v1|\/rest\/v1)/, '$1'); const q = url.searchParams;
    let body = {}; try { body = bodyText ? JSON.parse(bodyText) : {}; } catch { return json(400, { message: 'bad json' }); }
    const who = role(h);

    // ── GoTrue ──
    if (path === '/auth/v1/signup' && method === 'POST') {
      const email = String(body.email || '').toLowerCase();
      if (!body.password || body.password.length < 6) return json(422, { error_code: 'weak_password', msg: 'Password should be at least 6 characters.' });
      const ex = byEmail(email);
      if (ex && ex.email_confirmed_at) return json(422, { error_code: 'user_already_exists', msg: 'User already registered' });
      const u = ex || { id: uuid(), email, email_confirmed_at: null }; u.password = body.password; u.user_metadata = body.data || {};
      if (!ex) st.authUsers.push(u);
      if (st.confirmEmail) { sendEmail(u, 'signup'); return json(200, pubUser(u)); }
      u.email_confirmed_at = new Date().toISOString(); return json(200, session(u));
    }
    if (path === '/auth/v1/token' && method === 'POST') {
      if (q.get('grant_type') === 'password') {
        const u = byEmail(body.email);
        if (!u || u.password !== body.password) return json(400, { error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
        if (!u.email_confirmed_at) return json(400, { error_code: 'email_not_confirmed', msg: 'Email not confirmed' });
        return json(200, session(u));
      }
      if (q.get('grant_type') === 'refresh_token') {
        const uid = st.refresh.get(body.refresh_token); st.refresh.delete(body.refresh_token);
        const u = st.authUsers.find(x => x.id === uid); if (!u) return json(400, { error_code: 'refresh_token_not_found' });
        return json(200, session(u));
      }
    }
    if (path === '/auth/v1/user') {
      if (who.role !== 'authenticated') return json(401, { msg: 'invalid JWT' });
      const u = st.authUsers.find(x => x.id === who.uid);
      if (method === 'GET') return json(200, pubUser(u));
      if (method === 'PUT') { if (body.password) { if (body.password.length < 6) return json(422, { error_code: 'weak_password' }); u.password = body.password; u.email_confirmed_at ||= new Date().toISOString(); } return json(200, pubUser(u)); }
    }
    if (path === '/auth/v1/logout' && method === 'POST') { const t = (h.authorization || '').replace(/^Bearer\s+/i, ''); st.tokens.delete(t); return json(204, null); }
    if (path === '/auth/v1/recover' && method === 'POST') { const u = byEmail(body.email); if (u) sendEmail(u, 'recovery'); return json(200, {}); }
    if (path.startsWith('/auth/v1/admin/') || path === '/auth/v1/invite') {
      if (who.role !== 'service') return json(403, { msg: 'User not allowed' });
      if (path === '/auth/v1/invite') { const email = String(body.email).toLowerCase(); if (byEmail(email)) return json(422, { msg: 'exists' }); const u = { id: uuid(), email, email_confirmed_at: null, password: null }; st.authUsers.push(u); sendEmail(u, 'invite'); return json(200, pubUser(u)); }
      if (path === '/auth/v1/admin/users' && method === 'POST') { const email = String(body.email).toLowerCase(); if (byEmail(email)) return json(422, { msg: 'exists' }); const u = { id: uuid(), email, password: body.password, email_confirmed_at: body.email_confirm ? new Date().toISOString() : null, user_metadata: body.user_metadata || {} }; st.authUsers.push(u); return json(200, pubUser(u)); }
      const m = /^\/auth\/v1\/admin\/users\/([^/]+)$/.exec(path);
      if (m) {
        const u = st.authUsers.find(x => x.id === m[1]); if (!u) return json(404, { msg: 'not found' });
        if (method === 'PUT') { if (body.password) u.password = body.password; if (body.email_confirm) u.email_confirmed_at ||= new Date().toISOString(); return json(200, pubUser(u)); }
        if (method === 'DELETE') { st.authUsers = st.authUsers.filter(x => x.id !== u.id); st.rows = st.rows.filter(r => r.auth_id !== u.id); for (const [k, v] of st.tokens) if (v.uid === u.id) st.tokens.delete(k); return json(200, {}); }
      }
    }

    // ── PostgREST ──
    if (path === '/rest/v1/rpc/lumora_auth_user_by_email') {
      if (who.role !== 'service') return json(401, { message: 'permission denied for function lumora_auth_user_by_email' });
      const u = byEmail(body.p_email); return json(200, u ? [{ id: u.id, email_confirmed_at: u.email_confirmed_at }] : []);
    }
    if (path === '/rest/v1/users') {
      if (who.role === 'anon' || who.role === 'invalid') return denied();
      const svc = who.role === 'service';
      const sel = q.get('select') || '*';
      const returnsRows = method === 'GET' || (h.prefer || '').includes('representation');
      if (!svc && returnsRows && (sel === '*' || sel.split(',').some(c => !READABLE.includes(c)))) return denied();
      const visible = (r) => svc || r.auth_id === who.uid;
      const f = filt(q);
      if (method === 'GET') return json(200, st.rows.filter(r => visible(r) && f(r)).slice(0, +q.get('limit') || 1e9).map(r => project(r, sel)));
      if (method === 'POST') {
        if (!svc) {
          if (Object.keys(body).some(c => !INSERTABLE.includes(c))) return denied();
          if (body.auth_id !== who.uid || String(body.email).toLowerCase() !== who.email) return json(403, { code: '42501', message: 'new row violates row-level security policy for table "users"' });
        }
        if (st.rows.some(r => r.email === body.email || (body.auth_id && r.auth_id === body.auth_id))) return json(409, { code: '23505', message: 'duplicate key' });
        const row = { id: st.nextId++, is_pro: false, subscription_status: null, password_hash: null, ...body };
        st.rows.push(row); return json(201, (h.prefer || '').includes('representation') ? [project(row, sel)] : null);
      }
      if (method === 'PATCH') {
        if (!svc && Object.keys(body).some(c => !UPDATABLE.includes(c))) return denied();
        const hit = st.rows.filter(r => visible(r) && f(r)); hit.forEach(r => Object.assign(r, body));
        return json(200, (h.prefer || '').includes('representation') ? hit.map(r => project(r, '*')) : null);
      }
      if (method === 'DELETE') { if (!svc) return denied(); const before = st.rows.length; st.rows = st.rows.filter(r => !f(r)); return json(200, { deleted: before - st.rows.length }); }
    }
    return json(404, { message: 'mock: no route ' + method + ' ' + path });
  }

  const fetchImpl = async (input, init = {}) => {
    const r = handle(init.method || 'GET', String(input), init.headers || {}, init.body || '');
    const text = r.body == null ? '' : JSON.stringify(r.body);
    return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => (text ? JSON.parse(text) : null), text: async () => text };
  };
  return { state: st, handle, fetch: fetchImpl, anonKey, serviceKey };
}

export function legacyHash(password) {
  return crypto.createHash('sha256').update('lumora_v1_' + password.length + password).digest('hex');
}
