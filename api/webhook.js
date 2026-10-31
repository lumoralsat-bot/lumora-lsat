// Stripe webhook → updates Pro status using the server-only service_role key.
// Signature verification is REQUIRED (unsigned events are rejected), so nobody can fake a payment.
import crypto from 'node:crypto';
import { serviceFetch } from './_lib/supabase.js';

export const config = { api: { bodyParser: false } };
const TOLERANCE_S = 300;

function getRawBody(req) {
  return new Promise((resolve, reject) => { const chunks = []; req.on('data', c => chunks.push(c)); req.on('end', () => resolve(Buffer.concat(chunks))); req.on('error', reject); });
}

export function verifyStripeSignature(rawBody, header, secret, now = Math.floor(Date.now() / 1000)) {
  if (!header || !secret) return false;
  const parts = header.split(',').map(p => p.split('='));
  const t = parts.find(([k]) => k === 't')?.[1];
  const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || !sigs.length || Math.abs(now - Number(t)) > TOLERANCE_S) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody.toString('utf8')}`).digest();
  return sigs.some(s => { const b = Buffer.from(s, 'hex'); return b.length === expected.length && crypto.timingSafeEqual(b, expected); });
}

async function updateProfile({ authId, email, customerId }, fields) {
  // Prefer the account id from checkout; fall back to Stripe customer id, then the verified billing email.
  const filters = [authId && `auth_id=eq.${encodeURIComponent(authId)}`, customerId && `stripe_customer_id=eq.${encodeURIComponent(customerId)}`, email && `email=eq.${encodeURIComponent(email.toLowerCase())}`].filter(Boolean);
  for (const f of filters) {
    const r = await serviceFetch(`/rest/v1/users?${f}`, { method: 'PATCH', prefer: 'return=representation', body: fields });
    if (r.ok && Array.isArray(r.data) && r.data.length) return true;
  }
  return false;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) { console.error('[webhook] STRIPE_WEBHOOK_SECRET missing — rejecting'); return res.status(503).json({ error: 'Webhook not configured' }); }
  let raw; try { raw = await getRawBody(req); } catch { return res.status(400).json({ error: 'Could not read body' }); }
  if (!verifyStripeSignature(raw, req.headers['stripe-signature'], secret)) return res.status(400).json({ error: 'Invalid signature' });

  let event; try { event = JSON.parse(raw.toString('utf8')); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const customerEmail = async (customerId) => {
    if (!stripeKey || !customerId) return null;
    const r = await fetch(`https://api.stripe.com/v1/customers/${encodeURIComponent(customerId)}`, { headers: { Authorization: 'Bearer ' + stripeKey } });
    return r.ok ? (await r.json()).email || null : null;
  };

  try {
    let matched = null;
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object;
        matched = await updateProfile(
          { authId: s.client_reference_id, customerId: null, email: s.customer_email || s.customer_details?.email },
          { is_pro: true, stripe_customer_id: s.customer || null, stripe_subscription_id: s.subscription || null, subscription_status: 'active' });
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const active = ['active', 'trialing', 'past_due'].includes(sub.status); // past_due keeps access during Stripe's retry period
        matched = await updateProfile(
          { authId: sub.metadata?.auth_id, customerId: sub.customer, email: await customerEmail(sub.customer) },
          { is_pro: active, stripe_customer_id: sub.customer, stripe_subscription_id: sub.id, subscription_status: sub.status });
        break;
      }
      case 'customer.subscription.deleted':
      case 'customer.subscription.paused': {
        const sub = event.data.object;
        matched = await updateProfile(
          { authId: sub.metadata?.auth_id, customerId: sub.customer, email: await customerEmail(sub.customer) },
          { is_pro: false, subscription_status: event.type.endsWith('deleted') ? 'cancelled' : 'paused' });
        break;
      }
      default: break;
    }
    console.log('[webhook]', event.type, matched === null ? 'ignored' : matched ? 'applied' : 'no matching account');
  } catch {
    console.error('[webhook] handler error', { type: event.type });
    return res.status(500).json({ error: 'Handler error' });
  }
  return res.status(200).json({ received: true });
}
