/**
 * GS1 Barcode Parser
 */

export interface GS1ParsedData {
  gtin?: string;
  batch_number?: string;
  production_date?: Date;
  packaging_date?: Date;
  best_before_date?: Date;
  expiry_date?: Date;
  serial_number?: string;
  weight?: { value: number; unit: string };
  sscc?: string;
  count?: number;
  contained_gtin?: string;
  company_internal?: Record<string, string>;
  raw_ais: Record<string, string>;
}

const AI_DEFS: [string, string, number][] = [
  ['00', 'sscc', 18],
  ['01', 'gtin', 14],
  ['02', 'contained_gtin', 14],
  ['10', 'batch', 0],
  ['11', 'prod_date', 6],
  ['13', 'pack_date', 6],
  ['15', 'best_before', 6],
  ['17', 'expiry_date', 6],
  ['21', 'serial', 0],
  ['30', 'var_count', 0],
  ['37', 'count', 0],
];

const WEIGHT_AI_PREFIXES = ['310', '320'];
const GS = String.fromCharCode(29);

function parseDate(val: string): Date | undefined {
  if (val.length !== 6) return undefined;
  const yy = parseInt(val.substring(0, 2), 10);
  const mm = parseInt(val.substring(2, 4), 10) - 1;
  const dd = parseInt(val.substring(4, 6), 10);
  const year = yy >= 50 ? 1900 + yy : 2000 + yy;
  return new Date(year, mm, dd || 1);
}

export function parseGS1Barcode(barcode: string): GS1ParsedData {
  const result: GS1ParsedData = { raw_ais: {} };
  let data = barcode.replace(/^]?[a-zA-Z]d?/, '');
  let pos = 0;
  while (pos < data.length) {
    let matched = false;
    for (const prefix of WEIGHT_AI_PREFIXES) {
      if (data.substring(pos, pos + 3) === prefix && pos + 4 <= data.length) {
        const decimals = parseInt(data[pos + 3], 10);
        const ai = data.substring(pos, pos + 4);
        const val = data.substring(pos + 4, pos + 10);
        result.raw_ais[ai] = val;
        const numericVal = parseInt(val, 10) / Math.pow(10, decimals);
        result.weight = { value: numericVal, unit: prefix === '310' ? 'kg' : 'lb' };
        pos += 10; matched = true; break;
      }
    }
    if (matched) continue;
    const twoDigit = data.substring(pos, pos + 2);
    const internalNum = parseInt(twoDigit, 10);
    if (internalNum >= 91 && internalNum <= 99) {
      pos += 2;
      const gsIdx = data.indexOf(GS, pos);
      const end = gsIdx === -1 ? data.length : gsIdx;
      const val = data.substring(pos, end);
      result.raw_ais[twoDigit] = val;
      if (!result.company_internal) result.company_internal = {};
      result.company_internal[twoDigit] = val;
      pos = gsIdx === -1 ? data.length : gsIdx + 1;
      continue;
    }

    let foundAI = false;
    for (const [aiPrefix, label, fixedLen] of AI_DEFS) {
      if (data.substring(pos, pos + aiPrefix.length) === aiPrefix) {
        pos += aiPrefix.length;
        let val: string;
        if (fixedLen > 0) {
          val = data.substring(pos, pos + fixedLen);
          pos += fixedLen;
        } else {
          const gsIdx = data.indexOf(GS, pos);
          const end = gsIdx === -1 ? data.length : gsIdx;
          val = data.substring(pos, end);
          pos = gsIdx === -1 ? data.length : gsIdx + 1;
        }
        result.raw_ais[aiPrefix] = val;
        switch (label) {
          case 'gtin': result.gtin = val; break;
          case 'contained_gtin': result.contained_gtin = val; break;
          case 'sscc': result.sscc = val; break;
          case 'batch': result.batch_number = val; break;
          case 'serial': result.serial_number = val; break;
          case 'prod_date': result.production_date = parseDate(val); break;
          case 'pack_date': result.packaging_date = parseDate(val); break;
          case 'best_before': result.best_before_date = parseDate(val); break;
          case 'expiry_date': result.expiry_date = parseDate(val); break;
          case 'var_count': result.count = parseInt(val, 10); break;
          case 'count': result.count = parseInt(val, 10); break;
        }
        foundAI = true; break;
      }
    }
    if (!foundAI) { pos++; }
  }
  return result;
}

export function validateGTIN(gtin: string): boolean {
  if (!/^d{8,14}$/.test(gtin)) return false;
  const padded = gtin.padStart(14, '0');
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const digit = parseInt(padded[i], 10);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(padded[13], 10);
}

export function generateGS1Barcode(data: { gtin?: string; batch?: string; serial?: string; expiry?: Date }): string {
  const GS_CHAR = String.fromCharCode(29);
  let barcode = '';
  if (data.gtin) barcode += '01' + data.gtin.padStart(14, '0');
  if (data.expiry) {
    const d = data.expiry;
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    barcode += '17' + yy + mm + dd;
  }
  if (data.batch) barcode += '10' + data.batch + GS_CHAR;
  if (data.serial) barcode += '21' + data.serial + GS_CHAR;
  return barcode;
}
