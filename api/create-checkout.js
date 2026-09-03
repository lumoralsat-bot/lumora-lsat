// Vercel serverless function — creates a Stripe Checkout session

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify function is running
  console.log('create-checkout invoked, method:', req.method);
  console.log('body type:', typeof req.body, 'keys:', req.body ? Object.keys(req.body) : 'null');

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    console.error('STRIPE_SECRET_KEY missing from env');
    return res.status(500).json({ error: 'Stripe secret key not configured' });
  }
  console.log('Stripe key present, length:', stripeKey.length);

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const { priceId, email, successUrl, cancelUrl } = body;

  console.log('Parsed:', { priceId: priceId?.slice(0,20), email, hasSuccess: !!successUrl, hasCancel: !!cancelUrl });

  if (!priceId || !email || !successUrl || !cancelUrl) {
    return res.status(400).json({
      error: 'Missing fields',
      missing: { priceId: !priceId, email: !email, successUrl: !successUrl, cancelUrl: !cancelUrl }
    });
  }

  try {
    const params = new URLSearchParams();
    params.append('mode', 'subscription');
    params.append('customer_email', email);
    params.append('success_url', successUrl);
    params.append('cancel_url', cancelUrl);
    params.append('allow_promotion_codes', 'true');
    params.append('line_items[0][price]', priceId);
    params.append('line_items[0][quantity]', '1');

    console.log('Calling Stripe API...');
    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + stripeKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2023-10-16',
      },
      body: params.toString(),
    });

    const text = await stripeRes.text();
    console.log('Stripe status:', stripeRes.status, 'body length:', text.length);

    if (!text) {
      return res.status(500).json({ error: 'Empty response from Stripe' });
    }

    let session;
    try {
      session = JSON.parse(text);
    } catch (e) {
      console.error('JSON parse error:', e.message, 'text:', text.slice(0, 200));
      return res.status(500).json({ error: 'Invalid JSON from Stripe' });
    }

    if (!stripeRes.ok) {
      console.error('Stripe error response:', session);
      return res.status(400).json({ error: session.error?.message || 'Stripe error' });
    }

    if (!session.url) {
      console.error('No url in session:', JSON.stringify(session).slice(0, 300));
      return res.status(500).json({ error: 'Stripe returned no checkout URL' });
    }

    console.log('Success! Session id:', session.id);
    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('Unexpected error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
