// Supabase Auth client (GoTrue REST) — no extra npm dependency.
// Passwords go straight to Supabase over HTTPS and are hashed there (bcrypt); this app never stores them.
// The session (short-lived access token + refresh token) lives in localStorage and is removed on sign-out.

const STORAGE_KEY = 'lumora_auth';

export function createAuth({ url, anonKey, storage = globalThis.localStorage, fetchImpl = (...a) => globalThis.fetch(...a), now = () => Date.now() }) {
  const base = (url || '').replace(/\/+$/, '');
  let refreshing = null;

  const read = () => { try { const s = JSON.parse(storage.getItem(STORAGE_KEY) || 'null'); return s && s.access_token ? s : null; } catch { return null; } };
  const write = (s) => { try { s ? storage.setItem(STORAGE_KEY, JSON.stringify(s)) : storage.removeItem(STORAGE_KEY); } catch {} };
  const toSession = (d) => d && d.access_token ? ({
    access_token: d.access_token, refresh_token: d.refresh_token,
    expires_at: d.expires_at ? d.expires_at * 1000 : now() + (d.expires_in || 3600) * 1000,
    user: d.user ? { id: d.user.id, email: (d.user.email || '').toLowerCase(), name: d.user.user_metadata?.name || '' } : null,
  }) : null;

  async function gotrue(path, { method = 'POST', body, token } = {}) {
    let r;
    try {
      r = await fetchImpl(base + '/auth/v1' + path, {
        method, headers: { apikey: anonKey, 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch { return { ok: false, status: 0, data: { error: 'network' } }; }
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  }

  function classify(res) {
    const code = res.data?.error_code || res.data?.code || res.data?.error || '';
    const msg = String(res.data?.msg || res.data?.error_description || res.data?.message || '');
    if (res.status === 0) return { error: 'network', message: 'Could not reach the server. Check your connection.' };
    if (res.status === 429) return { error: 'rate', message: 'Too many attempts. Please wait a minute and try again.' };
    if (/email_not_confirmed/i.test(code) || /not confirmed/i.test(msg)) return { error: 'unconfirmed', message: 'Please confirm your email first — check your inbox for the link.' };
    if (/user_already_exists|already registered/i.test(code + msg)) return { error: 'exists', message: 'An account with this email already exists. Try signing in.' };
    if (/weak_password/i.test(code) || /password/i.test(msg) && res.status === 422) return { error: 'weak', message: msg || 'Please choose a stronger password.' };
    if (res.status === 400) return { error: 'invalid', message: 'Incorrect email or password.' };
    return { error: 'unknown', message: 'Something went wrong. Please try again.' };
  }

  const auth = {
    configured: !!(base && anonKey),
    getSession: read,
    user: () => read()?.user || null,

    async signIn(email, password) {
      const res = await gotrue('/token?grant_type=password', { body: { email: String(email).trim().toLowerCase(), password } });
      if (!res.ok) return classify(res);
      const s = toSession(res.data); write(s); return { session: s };
    },

    async signUp(email, password, name, redirectTo) {
      const res = await gotrue('/signup' + (redirectTo ? '?redirect_to=' + encodeURIComponent(redirectTo) : ''), { body: { email: String(email).trim().toLowerCase(), password, data: { name } } });
      if (!res.ok) return classify(res);
      const s = toSession(res.data);
      if (s) { write(s); return { session: s }; }
      return { needsConfirmation: true };
    },

    async refresh() {
      if (refreshing) return refreshing;
      const cur = read(); if (!cur?.refresh_token) return null;
      refreshing = (async () => {
        const res = await gotrue('/token?grant_type=refresh_token', { body: { refresh_token: cur.refresh_token } });
        if (res.ok) { const s = toSession(res.data); write({ ...s, user: s.user || cur.user }); return read(); }
        if (res.status >= 400 && res.status < 500) write(null); // refresh token revoked/expired → signed out
        return null;
      })().finally(() => { refreshing = null; });
      return refreshing;
    },

    async accessToken() {
      const s = read(); if (!s) return null;
      if (s.expires_at - 60_000 > now()) return s.access_token;
      const r = await auth.refresh(); return r?.access_token || null;
    },

    /** Fetch with the user's token (Supabase REST or our /api). Retries once after refreshing on 401. */
    async authedFetch(fullUrl, init = {}) {
      const go = async (token) => fetchImpl(fullUrl, { ...init, headers: { ...(init.headers || {}), ...(fullUrl.startsWith(base) ? { apikey: anonKey } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) } });
      let token = await auth.accessToken();
      let r = await go(token);
      if (r.status === 401 && read()) { const s = await auth.refresh(); if (s) r = await go(s.access_token); }
      return r;
    },

    async updatePassword(password) {
      const token = await auth.accessToken();
      const res = await gotrue('/user', { method: 'PUT', body: { password }, token });
      return res.ok ? { ok: true } : classify(res);
    },

    async signOut() {
      const s = read(); write(null);
      if (s?.access_token) await gotrue('/logout', { token: s.access_token }).catch(() => {});
    },

    /** After clicking an email link (confirm / reset / invite) Supabase returns tokens in the URL hash. */
    async consumeUrlSession(loc = globalThis.location, hist = globalThis.history) {
      if (!loc?.hash || !loc.hash.includes('access_token=')) {
        const err = loc?.hash && new URLSearchParams(loc.hash.slice(1)).get('error_description');
        return err ? { error: err } : null;
      }
      const p = new URLSearchParams(loc.hash.slice(1));
      const access_token = p.get('access_token');
      const me = await gotrue('/user', { method: 'GET', token: access_token });
      try { hist?.replaceState?.({}, '', loc.pathname + loc.search); } catch {}
      if (!me.ok) return { error: 'This link has expired. Please request a new one.' };
      write(toSession({ access_token, refresh_token: p.get('refresh_token'), expires_in: +p.get('expires_in') || 3600, user: me.data }));
      return { type: p.get('type') || 'signup' };
    },
  };
  return auth;
}
