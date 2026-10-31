// Health check. Reports only whether configuration is present — never key lengths or values.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    ok: true,
    ai: !!(process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY),
    stripe: !!process.env.STRIPE_SECRET_KEY,
    accounts: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
