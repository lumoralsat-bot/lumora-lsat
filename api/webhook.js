export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function supabaseUpdate(email, fields) {
  const supaUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const supaKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  if (!supaUrl || !supaKey) { console.warn('Supabase not configured'); return false; }
  const res = await fetch(`${supaUrl}/rest/v1/users?email=eq.${encodeURIComponent(email)}`, {
    method: 'PATCH',
    headers: {
      'apikey': supaKey, 'Authorization': 'Bearer ' + supaKey,
      'Content-Type': 'application/json', 'Prefer': 'return=minimal',
    },
    body: JSON.stringify(fields),
  });
  console.log(`Supabase update for ${email}:`, res.status, JSON.stringify(fields));
  return res.ok;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let rawBody;
  try { rawBody = await getRawBody(req); }
  catch { return res.status(400).json({ error: 'Could not read body' }); }

  // Verify signature if secret is configured
  if (webhookSecret && sig) {
    try {
      const crypto = await import('crypto');
      const parts = sig.split(',').reduce((acc, part) => {
        const [k, v] = part.split('='); acc[k] = v; return acc;
      }, {});
      const payload = `${parts['t']}.${rawBody.toString()}`;
      const expected = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');
      if (expected !== parts['v1']) {
        console.error('Webhook signature mismatch');
        return res.status(400).json({ error: 'Invalid signature' });
      }
    } catch (err) {
      console.error('Signature error:', err.message);
      return res.status(400).json({ error: 'Signature error' });
    }
  }

  let event;
  try { event = JSON.parse(rawBody.toString()); }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  console.log('Webhook event:', event.type);
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object;
        const email = session.customer_email || session.customer_details?.email;
        const customerId = session.customer;
        console.log('Checkout completed:', email, 'customer:', customerId);
        if (email) {
          // Grant Pro and store stripe_customer_id for reliable future lookups
          await supabaseUpdate(email, {
            is_pro: true,
            stripe_customer_id: customerId || null,
            stripe_subscription_id: session.subscription || null,
            subscription_status: 'active',
          });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        if (sub.status === 'active' && stripeKey) {
          const custRes = await fetch(`https://api.stripe.com/v1/customers/${sub.customer}`,
            { headers: { 'Authorization': 'Bearer ' + stripeKey } });
          const customer = await custRes.json();
          if (customer.email) {
            await supabaseUpdate(customer.email, {
              is_pro: true,
              stripe_customer_id: sub.customer,
              stripe_subscription_id: sub.id,
              subscription_status: sub.status,
            });
          }
        }
        break;
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.paused': {
        const sub = event.data.object;
        if (stripeKey) {
          const custRes = await fetch(`https://api.stripe.com/v1/customers/${sub.customer}`,
            { headers: { 'Authorization': 'Bearer ' + stripeKey } });
          const customer = await custRes.json();
          if (customer.email) {
            await supabaseUpdate(customer.email, {
              is_pro: false,
              subscription_status: event.type === 'customer.subscription.deleted' ? 'cancelled' : 'paused',
            });
            console.log('Pro revoked for:', customer.email);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        console.log('Payment failed for invoice:', event.data.object.id,
          'customer:', event.data.object.customer);
        break;
      }

      default:
        console.log('Unhandled event:', event.type);
    }
  } catch (err) {
    console.error('Webhook handler error:', err.message);
    return res.status(500).json({ error: err.message });
  }

  return res.status(200).json({ received: true });
}
