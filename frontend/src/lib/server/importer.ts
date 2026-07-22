import { parse } from 'csv-parse/sync';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CrmRecord, ImportResult, SkippedRecord } from '@/types';

export const ALLOWED_CRM_STATUS = [
  'GOOD_LEAD_FOLLOW_UP',
  'DID_NOT_CONNECT',
  'BAD_LEAD',
  'SALE_DONE',
] as const;

export const ALLOWED_DATA_SOURCE = [
  'leads_on_demand',
  'meridian_tower',
  'eden_park',
  'varah_swamy',
  'sarjapur_plots',
] as const;

export function parseCsvBuffer(buffer: Buffer): Record<string, string>[] {
  const content = buffer.toString('utf-8').replace(/^\uFEFF/, '');
  if (!content.trim()) throw new Error('CSV file is empty');

  const records: Record<string, string>[] = parse(content, {
    columns: (header: string[]) => header.map((h) => h.trim()),
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true,
  });

  if (!records.length) throw new Error('CSV file has headers but no data rows');
  return records;
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function isValidDate(value: string): boolean {
  if (!value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

export function isValidEmail(value: string): boolean {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidMobile(value: string): boolean {
  if (!value) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 6;
}

export function sanitizeAiRecord(
  raw: Partial<CrmRecord> | null | undefined
): { ok: true; record: CrmRecord } | { ok: false; reason: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, reason: 'AI did not return a valid object for this row' };
  }

  const record: CrmRecord = {
    created_at: safeString(raw.created_at),
    name: safeString(raw.name),
    email: safeString(raw.email).toLowerCase(),
    country_code: safeString(raw.country_code),
    mobile_without_country_code: safeString(raw.mobile_without_country_code).replace(/\D/g, ''),
    company: safeString(raw.company),
    city: safeString(raw.city),
    state: safeString(raw.state),
    country: safeString(raw.country),
    lead_owner: safeString(raw.lead_owner),
    crm_status: '',
    crm_note: safeString(raw.crm_note),
    data_source: '',
    possession_time: safeString(raw.possession_time),
    description: safeString(raw.description),
  };

  if (ALLOWED_CRM_STATUS.includes(raw.crm_status as any)) {
    record.crm_status = raw.crm_status as CrmRecord['crm_status'];
  }
  if (ALLOWED_DATA_SOURCE.includes(raw.data_source as any)) {
    record.data_source = raw.data_source as CrmRecord['data_source'];
  }

  const hasEmail = isValidEmail(record.email);
  const hasMobile = isValidMobile(record.mobile_without_country_code);

  if (!hasEmail && !hasMobile) {
    return { ok: false, reason: 'No valid email or mobile number found' };
  }

  if (record.created_at && !isValidDate(record.created_at)) {
    record.created_at = '';
  }

  return { ok: true, record };
}

function safeString(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function buildPrompt(rows: Record<string, string>[]): string {
  return `You are a data-mapping engine for a real-estate CRM called GrowEasy.

TASK
You will receive an array of raw CSV rows (as JSON objects). Each object's keys
are whatever column headers happened to exist in the source file - they are
NOT standardized. Column names might be misspelled, abbreviated, in a
different language/casing, come from Facebook Lead Ads, Google Ads exports,
a real-estate CRM export, a manually typed spreadsheet, or any other layout.

For EACH input row, map its data into this exact target JSON schema:

{
  "created_at": string,                 // lead creation date/time, must parse with JS "new Date(x)". If unknown, use "".
  "name": string,                       // lead's full name
  "email": string,                      // PRIMARY email only (see rule below)
  "country_code": string,               // e.g. "+91" - infer from phone number or locale if not explicit
  "mobile_without_country_code": string,// digits only, no country code, no spaces/dashes
  "company": string,
  "city": string,
  "state": string,
  "country": string,
  "lead_owner": string,                 // sales rep / agent / assigned-to person, if present
  "crm_status": string,                 // MUST be exactly one of: ${ALLOWED_CRM_STATUS.join(', ')} - or "" if nothing matches confidently
  "crm_note": string,                   // see notes rule below
  "data_source": string,                // MUST be exactly one of: ${ALLOWED_DATA_SOURCE.join(', ')} - or "" if nothing matches confidently
  "possession_time": string,            // property possession timeline, if mentioned
  "description": string                 // any other relevant free-text description
}

MAPPING RULES (follow exactly):
1. Infer field meaning from column name AND from the actual data values/patterns (e.g. a column of "you@x.com" strings is email even if the header is "Contact").
2. crm_status: only ever output one of the allowed enum values above, or "". Never invent a new status. Map synonyms sensibly (e.g. "Closed Won" / "Sold" -> "SALE_DONE"; "Not interested" / "Junk" -> "BAD_LEAD"; "No answer" / "Unreachable" -> "DID_NOT_CONNECT"; "Interested" / "Callback requested" -> "GOOD_LEAD_FOLLOW_UP").
3. data_source: only ever output one of the allowed enum values above, or "" if you are not confident which project/source it refers to. Do not guess randomly.
4. created_at must be a value JavaScript's "new Date(...)" can parse (e.g. "2026-05-13 14:20:48" or an ISO string). If the source has separate date and time columns, combine them. If truly unknown, output "".
5. Multiple emails in one field: use the FIRST as "email"; append any additional emails into "crm_note" (comma separated, prefixed like "Other emails: ...").
6. Multiple mobile numbers in one field: use the FIRST as "mobile_without_country_code"; append any additional numbers into "crm_note" (prefixed like "Other numbers: ...").
7. Put any remarks, follow-up notes, extra comments, or miscellaneous useful text that doesn't fit another field into "crm_note". If you already added "Other emails"/"Other numbers" text there, append additional notes after a "; " separator.
8. Every string value must be a single line - replace any literal newlines inside a value with "\\n" so the record stays a single logical unit and CSV-safe.
9. If a row has genuinely nothing usable for ANY field, still return your best-effort object (do not omit the row) - downstream code decides whether to skip it based on missing email/mobile.
10. Never fabricate data that is not present or reasonably inferable in the source row.

OUTPUT FORMAT (critical):
Return ONLY a JSON array, with exactly ${rows.length} objects, in the SAME ORDER as the input rows, one output object per input row. No markdown fences, no commentary, no explanation - JSON array only.

INPUT ROWS:
${JSON.stringify(rows)}
`;
}

export async function processAiBatch(
  rows: Record<string, string>[],
  apiKey: string,
  modelName: string
): Promise<{ raw: unknown[] }> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  });

  const prompt = buildPrompt(rows);
  const result = await model.generateContent(prompt);
  const text = result.response.text();

  let cleaned = (text || '').trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  }
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) {
    throw new Error('Model response was not a JSON array');
  }
  return { raw: parsed };
}

export async function extractCrmRecords(rows: Record<string, string>[]): Promise<ImportResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured. Set it in environment variables.');
  }

  const batchSize = Number(process.env.AI_BATCH_SIZE || 50);
  const batches = chunkArray(rows, batchSize);
  const importedRecords: CrmRecord[] = [];
  const skippedRecords: SkippedRecord[] = [];

  for (let b = 0; b < batches.length; b++) {
    const startIndex = b * batchSize;
    const currentBatch = batches[b];

    let raw: unknown[];
    try {
      const res = await processAiBatch(currentBatch, apiKey, modelName);
      raw = res.raw;
    } catch (err) {
      currentBatch.forEach((row, i) => {
        skippedRecords.push({
          row,
          reason: `AI extraction failed for this batch: ${
            err instanceof Error ? err.message : 'Unknown error'
          }`,
          rowIndex: startIndex + i,
        });
      });
      continue;
    }

    currentBatch.forEach((row, i) => {
      const candidate = raw[i] as Partial<CrmRecord> | undefined;
      const result = sanitizeAiRecord(candidate);
      if (result.ok) {
        importedRecords.push(result.record);
      } else {
        skippedRecords.push({ row, reason: result.reason, rowIndex: startIndex + i });
      }
    });
  }

  return {
    importedRecords,
    skippedRecords,
    totalRows: rows.length,
    totalImported: importedRecords.length,
    totalSkipped: skippedRecords.length,
    batches: batches.length,
  };
}
