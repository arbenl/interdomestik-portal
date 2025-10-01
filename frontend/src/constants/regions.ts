export const REGIONS = [
  'PRISHTINA',
  'PRIZREN',
  'GJAKOVA',
  'PEJA',
  'FERIZAJ',
  'GJILAN',
  'MITROVICA',
] as const;

export type Region = (typeof REGIONS)[number];
