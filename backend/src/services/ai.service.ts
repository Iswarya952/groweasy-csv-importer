import { callGemini } from './gemini.service';
import { chunkArray } from './csv.service';
import { sanitizeAiRecord } from '../utils/validators';
import {
  ALLOWED_CRM_STATUS,
  ALLOWED_DATA_SOURCE,
  CrmRecord,
  ImportResult,
  RawCsvRow,
  SkippedRecord,
} from '../types/crm.types';

const BATCH_SIZE = Number(process.env.AI_BATCH_SIZE || 100);

/**
 * Builds the system/task prompt sent to Gemini for one batch of raw rows.
 * This is the heart of the "intelligent field mapping" requirement: it must
 * work regardless of the source CSV's column names/layout (Facebook export,
 * Google Ads export, a messy hand-made spreadsheet, etc).
 */
function buildPrompt(rows: RawCsvRow[]): string {
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

/** Parses the model's JSON response defensively (strips markdown fences if the model added them anyway). */
function parseModelJson(text: string): unknown[] {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  }
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) {
    throw new Error('Model response was not a JSON array');
  }
  return parsed;
}

/**
 * Processes one batch: builds the prompt, calls Gemini, parses + sanitizes
 * each returned record, and reconciles counts against the input row count
 * (in case the model returns a different number of objects than requested).
 */
async function processBatch(
  rows: RawCsvRow[],
  startIndex: number
): Promise<{ imported: CrmRecord[]; skipped: SkippedRecord[] }> {
  const imported: CrmRecord[] = [];
  const skipped: SkippedRecord[] = [];

  let raw: unknown[];
  try {
    const text = await callGemini(buildPrompt(rows));
    raw = parseModelJson(text);
  } catch (err) {
    // Whole batch failed even after retries inside callGemini -> skip every
    // row in this batch rather than losing the request entirely.
    rows.forEach((row, i) => {
      skipped.push({
        row,
        reason: `AI extraction failed for this batch: ${
          err instanceof Error ? err.message : 'Unknown error'
        }`,
        rowIndex: startIndex + i,
      });
    });
    return { imported, skipped };
  }

  rows.forEach((row, i) => {
    const candidate = raw[i] as Partial<CrmRecord> | undefined;
    const result = sanitizeAiRecord(candidate);
    if (result.ok) {
      imported.push(result.record);
    } else {
      skipped.push({ row, reason: result.reason, rowIndex: startIndex + i });
    }
  });

  return { imported, skipped };
}

/**
 * Public entry point: takes every raw CSV row, splits into batches, sends
 * each batch to Gemini concurrently-safe (sequential to respect rate
 * limits), and merges the results into the final ImportResult.
 */
export async function extractCrmRecords(rows: RawCsvRow[]): Promise<ImportResult> {
  const batches = chunkArray(rows, BATCH_SIZE);
  const importedRecords: CrmRecord[] = [];
  const skippedRecords: SkippedRecord[] = [];

  for (let b = 0; b < batches.length; b++) {
    const startIndex = b * BATCH_SIZE;
    const { imported, skipped } = await processBatch(batches[b], startIndex);
    importedRecords.push(...imported);
    skippedRecords.push(...skipped);
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
