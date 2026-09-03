export default function handler(req, res) {
  return res.status(200).json({ 
    ok: true, 
    message: 'Vercel functions are working',
    method: req.method,
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    stripeKeyLength: process.env.STRIPE_SECRET_KEY?.length || 0,
  });
}
