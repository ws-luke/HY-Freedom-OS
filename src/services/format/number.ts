export function clamp(
  value: number,
  min: number,
  max: number,
): number {
  return Math.min(
    max,
    Math.max(min, value),
  )
}

export function percentage(
  value: number,
  max: number,
): number {
  if (max <= 0) {
    return 0
  }

  return clamp(
    Math.round(
      (value / max) * 100,
    ),
    0,
    100,
  )
}

export function formatTradePrice(
  value: number | null | undefined,
  fractionDigits = 2,
): string {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return '—'
  }

  return value.toFixed(fractionDigits)
}
