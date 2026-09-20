// Canonical storage is always kg / cm. These helpers convert for display + input only.

export const kgToLb = (kg) => kg * 2.20462
export const lbToKg = (lb) => lb / 2.20462
export const cmToIn = (cm) => cm / 2.54
export const inToCm = (inches) => inches * 2.54

export function displayWeight(kg, unit) {
  if (kg === null || kg === undefined || isNaN(kg)) return kg
  const v = unit === 'lb' ? kgToLb(kg) : kg
  return Math.round(v * 10) / 10
}

export function toCanonicalWeight(value, unit) {
  const v = parseFloat(value)
  if (!v) return null
  return unit === 'lb' ? lbToKg(v) : v
}

export function displayLength(cm, unit) {
  if (cm === null || cm === undefined || isNaN(cm)) return cm
  const v = unit === 'in' ? cmToIn(cm) : cm
  return Math.round(v * 10) / 10
}

export function toCanonicalLength(value, unit) {
  const v = parseFloat(value)
  if (!v) return null
  return unit === 'in' ? inToCm(v) : v
}
