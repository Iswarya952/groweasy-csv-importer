import { parse } from 'csv-parse/sync';
import { RawCsvRow } from '../types/crm.types';

/**
 * Parses a CSV buffer into an array of row objects keyed by header name.
 * Deliberately does NOT assume fixed column names - whatever headers exist
 * in the file become the object keys, and downstream AI mapping figures out
 * what they mean.
 */
export function parseCsvBuffer(buffer: Buffer): RawCsvRow[] {
  const content = buffer.toString('utf-8').replace(/^\uFEFF/, ''); // strip BOM if present

  if (!content.trim()) {
    throw new Error('CSV file is empty');
  }

  let records: RawCsvRow[];
  try {
    records = parse(content, {
      columns: (header: string[]) => header.map((h) => h.trim()),
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      bom: true,
    });
  } catch (err) {
    throw new Error(
      `Failed to parse CSV: ${err instanceof Error ? err.message : 'Unknown parsing error'}`
    );
  }

  if (!records.length) {
    throw new Error('CSV file has headers but no data rows');
  }

  return records;
}

/** Splits an array into fixed-size chunks, preserving order. */
export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
