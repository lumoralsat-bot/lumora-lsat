// Cancel a Stripe subscription for a user
// Marks subscription as cancelled at period end (user keeps access until then)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(500).json({ error: 'Stripe not configured' });

  const supaUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const supaKey = process.env.VITE_SUPABASE_ANON_KEY || '';

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const { email } = body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    // Strategy 1: Look up stripe_customer_id from Supabase first
    let customerId = null;
    if (supaUrl && supaKey) {
      try {
        const supaRes = await fetch(
          `${supaUrl}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=stripe_customer_id&limit=1`,
          { headers: { 'apikey': supaKey, 'Authorization': 'Bearer ' + supaKey } }
        );
        const supaData = await supaRes.json();
        if (supaData?.[0]?.stripe_customer_id) {
          customerId = supaData[0].stripe_customer_id;
          console.log('Found customer ID from Supabase:', customerId);
        }
      } catch (e) {
        console.warn('Supabase lookup failed:', e.message);
      }
    }

    // Strategy 2: Search Stripe by email if no customer ID in Supabase
    if (!customerId) {
      const custRes = await fetch(
        `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=5`,
        { headers: { 'Authorization': 'Bearer ' + stripeKey } }
      );
      const custData = await custRes.json();
      console.log('Stripe customer search results:', custData.data?.length || 0);
      if (custData.data?.length > 0) {
        // Pick the customer with an active subscription
        for (const cust of custData.data) {
          const subCheck = await fetch(
            `https://api.stripe.com/v1/subscriptions?customer=${cust.id}&status=active&limit=1`,
            { headers: { 'Authorization': 'Bearer ' + stripeKey } }
          );
          const subCheckData = await subCheck.json();
          if (subCheckData.data?.length > 0) {
            customerId = cust.id;
            break;
          }
        }
        // Fallback to first customer if none have active sub
        if (!customerId) customerId = custData.data[0].id;
      }
    }

    if (!customerId) {
      return res.status(404).json({
        error: 'No Stripe account found for this email. If you subscribed with a different email, contact support.'
      });
    }

    // Get active subscriptions for this customer
    const subRes = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=active&limit=1`,
      { headers: { 'Authorization': 'Bearer ' + stripeKey } }
    );
    const subData = await subRes.json();
    const subscription = subData.data?.[0];

    if (!subscription) {
      // Check for trialing subscriptions too
      const trialRes = await fetch(
        `https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=trialing&limit=1`,
        { headers: { 'Authorization': 'Bearer ' + stripeKey } }
      );
      const trialData = await trialRes.json();
      if (!trialData.data?.[0]) {
        return res.status(404).json({ error: 'No active subscription found for this account.' });
      }
    }

    const subToCancel = subData.data?.[0] || (await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=trialing&limit=1`,
      { headers: { 'Authorization': 'Bearer ' + stripeKey } }
    ).then(r => r.json()).then(d => d.data?.[0]));

    // Cancel at period end
    const cancelRes = await fetch(
      `https://api.stripe.com/v1/subscriptions/${subToCancel.id}`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + stripeKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'cancel_at_period_end=true',
      }
    );
    const cancelData = await cancelRes.json();

    if (!cancelRes.ok) {
      console.error('Stripe cancel error:', cancelData);
      return res.status(400).json({ error: cancelData.error?.message || 'Cancellation failed' });
    }

    const cancelDate = new Date(cancelData.current_period_end * 1000).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });

    console.log('Subscription cancelled at period end:', subToCancel.id, 'for', email, '— ends', cancelDate);
    return res.status(200).json({ ok: true, cancelAt: cancelDate });

  } catch (err) {
    console.error('Cancel error:', err.message, err.stack);
    return res.status(500).json({ error: 'Something went wrong: ' + err.message });
  }
}
