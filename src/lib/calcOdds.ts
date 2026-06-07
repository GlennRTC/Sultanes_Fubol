/**
 * calcOdds — shared parimutuel percentage calculator (WR-03).
 *
 * Extracted from BetModal (calcOddsInline) and PoolCard (calcOdds) to prevent
 * divergence: any change to rounding mode or edge-case handling only needs to
 * happen here.
 *
 * Returns a map of option_id → percentage (0–100, integer), or null for each
 * option when the pool total is zero (no bets placed yet — avoids division by
 * zero and signals "no data" to the UI via the `—` placeholder).
 */
export function calcOdds(
  options: { id: string }[],
  betTotals: Record<string, number>
): Record<string, number | null> {
  const poolTotal = options.reduce((sum, opt) => sum + (betTotals[opt.id] ?? 0), 0);
  if (poolTotal === 0) return Object.fromEntries(options.map((o) => [o.id, null]));
  return Object.fromEntries(
    options.map((o) => [o.id, Math.round(((betTotals[o.id] ?? 0) / poolTotal) * 100)])
  );
}
