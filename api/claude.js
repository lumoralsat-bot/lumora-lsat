// Server-side proxy for Anthropic calls.
// The API key lives ONLY in server env (ANTHROPIC_API_KEY). The browser never sees it.
// Legacy fallback: VITE_ANTHROPIC_API_KEY is also read here (server-side) so existing
// Vercel deployments keep working, but you should rename it to ANTHROPIC_API_KEY —
// any VITE_* variable can be inlined into the client bundle by Vite.

export const config = { maxDuration: 60 };

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const MAX_TOKENS_CAP = 2000;
const MAX_TEXT = 24000; // chars per field
const TIMEOUT_MS = 55000;

// Best-effort, per-instance rate limit (serverless instances do not share memory).
// Real cost control needs auth + a shared store; see docs/AUDIT_AND_PLAN.md (R-3).
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip) || { start: now, n: 0 };
  if (now - rec.start > WINDOW_MS) { rec.start = now; rec.n = 0; }
  rec.n += 1;
  hits.set(ip, rec);
  if (hits.size > 5000) hits.clear();
  return rec.n > MAX_PER_WINDOW;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: 'AI is not configured on the server (ANTHROPIC_API_KEY missing).', code: 'not_configured' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (rateLimited(ip)) return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.', code: 'rate_limited' });

  let body = req.body;
  try { if (typeof body === 'string') body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  const { system, userMsg } = body || {};
  const maxTokens = Math.min(MAX_TOKENS_CAP, Math.max(50, parseInt(body?.maxTokens, 10) || 1200));
  if (typeof system !== 'string' || typeof userMsg !== 'string' || !userMsg.trim()) {
    return res.status(400).json({ error: 'system and userMsg must be strings' });
  }
  if (system.length > MAX_TEXT || userMsg.length > MAX_TEXT) return res.status(413).json({ error: 'Request too large' });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: userMsg }] }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      // Safe metadata only — never log prompts, keys, or student content.
      console.warn('[claude-proxy] upstream error', { status: r.status, ms: Date.now() - started });
      return res.status(502).json({ error: data?.error?.message || ('AI provider error ' + r.status), code: 'upstream_error' });
    }
    const text = (data.content || []).map(c => c.text || '').join('').trim();
    if (!text) return res.status(502).json({ error: 'Empty response from AI provider', code: 'empty' });
    console.log('[claude-proxy] ok', { ms: Date.now() - started, out: data.usage?.output_tokens });
    return res.status(200).json({ text });
  } catch (e) {
    const timedOut = e?.name === 'AbortError';
    console.warn('[claude-proxy] failure', { timedOut, ms: Date.now() - started });
    return res.status(timedOut ? 504 : 502).json({ error: timedOut ? 'The AI provider timed out.' : 'Could not reach the AI provider.', code: timedOut ? 'timeout' : 'network' });
  } finally {
    clearTimeout(timer);
  }
}
