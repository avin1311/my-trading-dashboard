/**
 * Data Validation Layer — run before render, fail → unavailable + log
 * Every derived number must pass these invariants or it renders as '—'
 */

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

// ==================== CROSS-FIELD INVARIANTS ====================

/** Invariant 1: marketCap ≈ price × sharesOutstanding */
export function checkMarketCap(marketCap: number | null, price: number, sharesOutstanding: number): ValidationResult {
  if (!marketCap || !price || !sharesOutstanding) return { valid: true }; // cannot check
  const expected = price * sharesOutstanding;
 const ratio = Math.abs(marketCap - expected) / expected;
  if (ratio > 0.01) {
    console.warn(`[validate] marketCap mismatch: shown=${marketCap}, expected=${expected} (${(ratio * 100).toFixed(1)}% off)`);
    return { valid: false, reason: `marketCap does not reconcile with price x shares` };
  }
  return { valid: true };
}

/** Invariant 2: pe ≈ price / epsTTM */
export function checkPE(pe: number | null, price: number, eps: number): ValidationResult {
  if (!pe || !price || !eps || eps <= 0) return { valid: true };
  const expected = price / eps;
  const ratio = Math.abs(pe - expected) / expected;
  if (ratio > 0.005) {
    console.warn(`[validate] P/E mismatch: shown=${pe}, expected=${expected.toFixed(2)} (stale price?)`);
    return { valid: false, reason: 'P/E does not match price / EPS' };
  }
  return { valid: true };
}

/** Invariant 3: pb ≈ price / bookValuePerShare */
export function checkPB(pb: number | null, price: number, bookValue: number): ValidationResult {
  if (!pb || !price || !bookValue || bookValue <= 0) return { valid: true };
  const expected = price / bookValue;
  const ratio = Math.abs(pb - expected) / expected;
  if (ratio > 0.005) {
    console.warn(`[validate] P/B mismatch: shown=${pb}, expected=${expected.toFixed(2)}`);
    return { valid: false, reason: 'P/B doesn\'t match price / book value' };
  }
  return { valid: true };
}

/** Invariant 4: roe ≈ epsTTM / bookValuePerShare */
export function checkROE(roe: number | null, eps: number, bookValue: number): ValidationResult {
  if (!roe || !eps || !bookValue || bookValue <= 0) return { valid: true };
  const expected = (eps / bookValue) * 100;
  if (Math.abs(roe - expected) > 1) {
    console.warn(`[validate] ROE mismatch: shown=${roe}%, expected=${expected.toFixed(1)}%`);
    return { valid: false, reason: 'ROE doesn\'t match EPS / BV' };
  }
  return { valid: true };
}

/** Invariant 5: roe ≈ (price/pe) / (price/pb) — cross-ratio check */
export function checkROECross(pe: number, pb: number, roe: number): ValidationResult {
  if (!pe || !pb || pe <= 0 || pb <= 0) return { valid: true };
  const expected = (1 / pe) / (1 / pb) * 100;
  if (Math.abs(roe - expected) > 1) {
    console.warn(`[validate] ROE cross-ratio mismatch: shown=${roe}%, derived=${expected.toFixed(1)}%`);
    return { valid: false, reason: 'ROE doesn\'t cross-check with P/E and P/B' };
  }
  return { valid: true };
}

/** Invariant 6: netProfit ≈ revenue × netMargin */
export function checkNetProfit(netProfit: number | null, revenue: number, netMargin: number): ValidationResult {
  if (!netProfit || !revenue || netMargin == null) return { valid: true };
  const expected = revenue * (netMargin / 100);
  const ratio = Math.abs(netProfit - expected) / Math.max(Math.abs(expected), 1);
  if (ratio > 0.01) {
    console.warn(`[validate] netProfit mismatch: shown=${netProfit}, expected=${expected.toFixed(0)} (${(ratio * 100).toFixed(1)}% off)`);
    return { valid: false, reason: 'Net profit doesn\'t match revenue × margin' };
  }
  return { valid: true };
}

/** Invariant 8: promoter + FII + DII + public = 100 */
export function checkOwnership(ownership: { promoter?: number | null; fii?: number | null; dii?: number | null; public?: number | null }): ValidationResult {
  const p = ownership.promoter || 0;
  const f = ownership.fii || 0;
  const d = ownership.dii || 0;
  const pub = ownership.public || 0;
  const total = p + f + d + pub;
  if (Math.abs(total - 100) > 0.1) {
    console.warn(`[validate] ownership sum=${total.toFixed(1)}% (promoter=${p}, FII=${f}, DII=${d}, public=${pub})`);
    return { valid: false, reason: `Ownership sums to ${total.toFixed(1)}%, not 100%` };
  }
  return { valid: true };
}

/** Invariant 9: dayLow ≤ price ≤ dayHigh; 52wLow ≤ price ≤ 52wHigh */
export function checkPriceBounds(price: number, dayLow?: number, dayHigh?: number, low52w?: number, high52w?: number): ValidationResult {
  if (dayLow != null && dayHigh != null) {
    if (price < dayLow - 0.01 || price > dayHigh + 0.01) {
      console.warn(`[validate] price ${price} outside day range [${dayLow}, ${dayHigh}]`);
      return { valid: false, reason: 'Price outside day range' };
    }
  }
  if (low52w != null && high52w != null) {
    if (price < low52w - 0.01 || price > high52w + 0.01) {
      console.warn(`[validate] price ${price} outside 52w range [${low52w}, ${high52w}]`);
      return { valid: false, reason: 'Price outside 52-week range' };
    }
  }
  return { valid: true };
}

/** Invariant 10: |YTD − 6M| < 1pp when date diff < 7 days */
export function checkYTD6MConsistency(ytd: number | null, sixM: number | null): ValidationResult {
  if (ytd == null || sixM == null) return { valid: true };
  if (Math.abs(ytd - sixM) > 1) {
    console.warn(`[validate] YTD(${ytd}%) vs 6M(${sixM}%) differ by ${Math.abs(ytd - sixM).toFixed(1)}pp`);
    return { valid: false, reason: 'YTD and 6M returns inconsistent' };
  }
  return { valid: true };
}

// ==================== SINGLE-FIELD SANITY CHECKS ====================

/** Invariant 15: RSI clamped [0,100]; warn if >90 or <10 */
export function checkRSI(rsi: number | null): ValidationResult {
  if (rsi == null) return { valid: true };
  if (rsi < 0 || rsi > 100) {
    console.warn(`[validate] RSI=${rsi} outside [0,100] — computation broken`);
    return { valid: false, reason: `RSI ${rsi} is impossible (must be 0–100)` };
  }
  if (rsi > 90) {
    console.warn(`[validate] RSI=${rsi} — suspiciously high, check Wilder smoothing`);
  }
  if (rsi < 10) {
    console.warn(`[validate] RSI=${rsi} — suspiciously low, check data quality`);
  }
  return { valid: true };
}

/** Detect synthetic/fallback data: identical values across stocks */
export function checkNotSynthetic<T extends Record<string, any>>(
  current: T,
  symbol: string,
  field: keyof T,
  otherValues: Map<string, T>
): ValidationResult {
  const val = current[field];
  if (val == null || val === 0) return { valid: false, reason: 'Zero or null — likely fallback' };

  for (const [otherSym, otherData] of otherValues) {
    if (otherSym === symbol) continue;
    if (otherData[field] === val && typeof val === 'number' && val !== 0) {
      // Only flag if it's a suspiciously precise match
      if (Number.isInteger(val) || String(val).split('.')[1]?.length >= 2) {
        console.warn(`[validate] ${String(field)}=${val} is identical for ${symbol} and ${otherSym} — synthetic data?`);
        return { valid: false, reason: `Same ${String(field)} as ${otherSym} — likely not live data` };
      }
    }
  }
  return { valid: true };
}

/** Mark fabricated data — never render as live */
export function isFabricatedValue(value: number, symbol: string, field: string): boolean {
  // Round numbers like 80000.00 are fabricated
  if (value === 80000 || value === 80000.00) return true;
  // Exactly 0.00% change
  if (value === 0 && field.includes('change')) return true;
  return false;
}

// ==================== SAFE RENDER HELPER ====================

/**
 * Returns the value if valid, or null if it fails validation.
 * Use in render: {safeValue(val, check) ?? '—'}
 */
export function safeValue<T>(value: T, check: ValidationResult | null): T | null {
  if (check && !check.valid) return null;
  if (value == null || (typeof value === 'number' && isNaN(value))) return null;
  return value;
}

/**
 * Run a batch of validations and return the first failure reason, or null if all pass.
 */
export function validateAll(checks: ValidationResult[]): string | null {
  for (const c of checks) {
    if (!c.valid) return c.reason || 'Validation failed';
  }
  return null;
}
