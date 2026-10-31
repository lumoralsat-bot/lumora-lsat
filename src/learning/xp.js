// XP ledger with idempotency keys. Retrying, refreshing, or double-submitting can never duplicate a reward.
import { XP_POLICY } from './config.js';

export function awardXP(ledger = { keys: [], total: 0 }, key, amount, reason, now = Date.now()) {
  if (!key || !(amount > 0)) return { ledger, granted: 0 };
  if (ledger.keys.includes(key)) return { ledger, granted: 0 };
  const keys = [...ledger.keys, key];
  return { ledger: { keys: keys.length > 3000 ? keys.slice(-3000) : keys, total: (ledger.total || 0) + amount, last: { key, amount, reason, at: now } }, granted: amount };
}

export function xpForEvent(kind, extra = {}, policy = XP_POLICY) {
  if (kind === 'state_reached') return policy.state_reached[extra.state] || 0;
  return policy[kind] || 0;
}
