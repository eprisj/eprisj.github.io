import convert from 'convert-units';

export const CAD_UNITS = ['m', 'cm', 'mm', 'ft'] as const;
export type CadUnit = typeof CAD_UNITS[number];

const PRECISION: Record<CadUnit, number> = { m: 3, cm: 1, mm: 0, ft: 3 };

export function fromMetres(value: number, unit: CadUnit): number {
  return convert(value).from('m').to(unit);
}

export function toMetres(value: number, unit: CadUnit): number {
  return convert(value).from(unit).to('m');
}

export function roundUnit(value: number, unit: CadUnit): number {
  const factor = 10 ** PRECISION[unit];
  return Math.round(value * factor) / factor;
}

export function unitStep(metres: number, unit: CadUnit): number {
  return roundUnit(fromMetres(metres, unit), unit);
}

export function formatLength(metres: number, unit: CadUnit): string {
  return `${roundUnit(fromMetres(metres, unit), unit)} ${unit}`;
}
