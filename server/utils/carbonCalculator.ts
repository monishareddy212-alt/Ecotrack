const DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

export interface ParsedDecimal {
  digits: bigint;
  scale: number;
}

export function parsePositiveDecimalString(
  rawValue: unknown,
  maxScale = 3
): string | null {
  if (typeof rawValue !== 'string' && typeof rawValue !== 'number') {
    return null;
  }

  const normalized = String(rawValue).trim();
  if (!DECIMAL_PATTERN.test(normalized)) {
    return null;
  }

  const parsed = parseDecimalToBigInt(normalized);
  if (parsed.digits <= 0n || parsed.scale > maxScale) {
    return null;
  }

  return formatScaledBigInt(parsed.digits, parsed.scale, parsed.scale);
}

export function parseDecimalToBigInt(value: string): ParsedDecimal {
  const trimmed = value.trim();
  if (!DECIMAL_PATTERN.test(trimmed)) {
    throw new Error(`Invalid decimal string: ${value}`);
  }

  const [wholePart, fracPart = ''] = trimmed.split('.');
  const combined = `${wholePart}${fracPart}`;
  return {
    digits: BigInt(combined),
    scale: fracPart.length,
  };
}

export function formatScaledBigInt(
  digits: bigint,
  currentScale: number,
  targetScale: number
): string {
  let scaledDigits = digits;

  if (currentScale > targetScale) {
    const diff = currentScale - targetScale;
    const divisor = 10n ** BigInt(diff);
    const quotient = scaledDigits / divisor;
    const remainder = scaledDigits % divisor;
    const half = divisor / 2n;
    scaledDigits = remainder >= half ? quotient + 1n : quotient;
  } else if (currentScale < targetScale) {
    scaledDigits = scaledDigits * 10n ** BigInt(targetScale - currentScale);
  }

  if (targetScale === 0) {
    return scaledDigits.toString();
  }

  const factor = 10n ** BigInt(targetScale);
  const whole = scaledDigits / factor;
  const fraction = (scaledDigits % factor).toString().padStart(targetScale, '0');
  return `${whole.toString()}.${fraction}`;
}

/**
 * Computes exact decimal-safe Carbon Emissions (kg CO2e) = Quantity * Emission Factor
 * using BigInt fixed-point arithmetic and half-up rounding to 6 decimal places (NUMERIC(18,6)).
 */
export function calculateCarbonEmissions(
  quantityStr: string,
  factorStr: string,
  targetScale = 6
): string {
  const quantity = parseDecimalToBigInt(quantityStr);
  const factor = parseDecimalToBigInt(factorStr);

  if (quantity.digits <= 0n) {
    throw new Error('Activity quantity must be greater than zero.');
  }
  if (factor.digits < 0n) {
    throw new Error('Emission factor cannot be negative.');
  }

  const product = quantity.digits * factor.digits;
  const combinedScale = quantity.scale + factor.scale;
  return formatScaledBigInt(product, combinedScale, targetScale);
}
