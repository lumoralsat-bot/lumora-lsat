// Account migration from the old homemade login to Supabase Auth.
//
// actions:
//   legacy_login {email, password}  – first sign-in after the upgrade: verify the OLD password once on the server,
//                                     create the Supabase Auth login with the same password, link the profile,
//                                     and erase the old hash. The client then signs in normally.
//   link        (Bearer token)       – a confirmed Supabase login whose email matches an unlinked legacy profile
//                                     (e.g. they used "Forgot password") gets that profile linked.
//   recover     {email, redirectTo}  – "Forgot password" that also works for accounts not yet migrated.
//
// Privacy: responses never reveal whether an email has an account (same generic answer either way);
// nothing identifying is logged; old password hashes are deleted as soon as an account is migrated.
import { env, parseBody, clientIp, limited, serviceFetch, getAuthUser, verifyLegacyPassword, isEmail, sameOriginOnly } from './_lib/supabase.js';

const GENERIC = { migrated: false };

export default async function handler(req, res) {
  sameOriginOnly(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { url, service } = env();
  if (!url || !service) return res.status(503).json({ error: 'Account service is not configured.' });
  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: 'Invalid request' });
  const ip = clientIp(req);
  if (limited('ip:' + ip, 20, 10 * 60_000)) return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes.' });

  try {
    if (body.action === 'legacy_login') return await legacyLogin(body, res);
    if (body.action === 'link') return await link(req, res);
    if (body.action === 'recover') return await recover(body, res);
    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    console.warn('[auth-migrate] error', { action: body.action, status: e?.status || 500 });
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

async function findLegacyRow(email, select = 'id,name,password_hash,auth_id') {
  // After 003_cleanup the password_hash column no longer exists; callers that don't need it ask for less.
  const r = await serviceFetch(`/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=${select}&limit=1`);
  return r.ok && Array.isArray(r.data) ? r.data[0] || null : null;
}
async function findAuthUser(email) {
  const r = await serviceFetch('/rest/v1/rpc/lumora_auth_user_by_email', { method: 'POST', body: { p_email: email } });
  return r.ok && Array.isArray(r.data) ? r.data[0] || null : null;
}

async function legacyLogin(body, res) {
  const email = String(body.email || '').trim().toLowerCase();
  const password = body.password;
  if (!isEmail(email) || typeof password !== 'string' || password.length < 6 || password.length > 200) return res.status(200).json(GENERIC);
  if (limited('em:' + email, 6, 15 * 60_000)) return res.status(429).json({ error: 'Too many attempts. Please wait a few minutes.' });

  const row = await findLegacyRow(email);
  if (!row || row.auth_id || !row.password_hash || !verifyLegacyPassword(password, row.password_hash)) {
    return res.status(200).json(GENERIC);
  }

  let authId;
  const existing = await findAuthUser(email);
  if (existing) {
    // A Supabase login already exists for this email. If its email was CONFIRMED, someone proved they own the
    // inbox — never overwrite that password; the student should use "Forgot password" (which links the profile).
    if (existing.email_confirmed_at) return res.status(200).json({ migrated: false, useReset: true });
    // Unconfirmed sign-up (could be anyone): the legacy password holder takes it over.
    const u = await serviceFetch(`/auth/v1/admin/users/${existing.id}`, { method: 'PUT', body: { password, email_confirm: true } });
    if (!u.ok) throw Object.assign(new Error('admin_update_failed'), { status: u.status });
    authId = existing.id;
  } else {
    const c = await serviceFetch('/auth/v1/admin/users', { method: 'POST', body: { email, password, email_confirm: true, user_metadata: { name: row.name || '' } } });
    if (!c.ok || !c.data?.id) throw Object.assign(new Error('admin_create_failed'), { status: c.status });
    authId = c.data.id;
  }
  const p = await serviceFetch(`/rest/v1/users?id=eq.${encodeURIComponent(row.id)}&auth_id=is.null`, {
    method: 'PATCH', prefer: 'return=minimal',
    body: { auth_id: authId, password_hash: null, migrated_at: new Date().toISOString() },
  });
  if (!p.ok) throw Object.assign(new Error('link_failed'), { status: p.status });
  console.log('[auth-migrate] migrated');
  return res.status(200).json({ migrated: true });
}

async function link(req, res) {
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  if (!user.emailConfirmed) return res.status(200).json({ linked: false, reason: 'email_unconfirmed' });
  const row = await findLegacyRow(user.email, 'id,auth_id');
  if (!row || row.auth_id) return res.status(200).json({ linked: false });
  let p = await serviceFetch(`/rest/v1/users?id=eq.${encodeURIComponent(row.id)}&auth_id=is.null`, {
    method: 'PATCH', prefer: 'return=minimal',
    body: { auth_id: user.id, password_hash: null, migrated_at: new Date().toISOString() },
  });
  if (!p.ok && p.status === 400) { // password_hash column already dropped
    p = await serviceFetch(`/rest/v1/users?id=eq.${encodeURIComponent(row.id)}&auth_id=is.null`, { method: 'PATCH', prefer: 'return=minimal', body: { auth_id: user.id, migrated_at: new Date().toISOString() } });
  }
  if (!p.ok) throw Object.assign(new Error('link_failed'), { status: p.status });
  console.log('[auth-migrate] linked');
  return res.status(200).json({ linked: true });
}

async function recover(body, res) {
  const email = String(body.email || '').trim().toLowerCase();
  const done = () => res.status(200).json({ ok: true }); // always the same answer
  if (!isEmail(email)) return done();
  if (limited('rc:' + email, 3, 60 * 60_000)) return done();
  const redirectTo = safeRedirect(body.redirectTo);
  const existing = await findAuthUser(email);
  if (existing) {
    const { url, anon } = env();
    await fetch(url + '/auth/v1/recover' + (redirectTo ? '?redirect_to=' + encodeURIComponent(redirectTo) : ''), {
      method: 'POST', headers: { apikey: anon, 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
    }).catch(() => {});
    return done();
  }
  const row = await findLegacyRow(email, 'id,auth_id');
  if (row && !row.auth_id) {
    // Not migrated yet: send an invite email so they can set a password; the profile links on first sign-in.
    await serviceFetch('/auth/v1/invite' + (redirectTo ? '?redirect_to=' + encodeURIComponent(redirectTo) : ''), { method: 'POST', body: { email } });
  }
  return done();
}

function safeRedirect(u) {
  try {
    const url = new URL(String(u || ''));
    const allowed = (process.env.SITE_URL || '').replace(/\/+$/, '');
    if (allowed && url.origin === new URL(allowed).origin) return url.origin + '/';
    if (!allowed && (url.protocol === 'https:' || url.hostname === 'localhost')) return url.origin + '/';
  } catch {}
  return null;
}
