import {
  ALLOWED_CRM_STATUS,
  ALLOWED_DATA_SOURCE,
  CrmRecord,
} from '../types/crm.types';

/** Loosely validates an ISO-ish date string using the same rule the spec requires: `new Date(x)` must not be Invalid Date. */
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

/**
 * Normalizes and validates a raw record object that the AI returned for a
 * single row. Coerces the record to always contain every CrmRecord key
 * (missing/invalid fields become empty strings), and enforces the
 * allowed-value + date-format + email/mobile rules from the spec.
 *
 * Returns `{ ok: true, record }` when the row should be imported, or
 * `{ ok: false, reason }` when it should be skipped.
 */
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
    mobile_without_country_code: safeString(raw.mobile_without_country_code).replace(
      /\D/g,
      ''
    ),
    company: safeString(raw.company),
    city: safeString(raw.city),
    state: safeString(raw.state),
    country: safeString(raw.country),
    lead_owner: safeString(raw.lead_owner),
    crm_status: '' as CrmRecord['crm_status'],
    crm_note: safeString(raw.crm_note),
    data_source: '' as CrmRecord['data_source'],
    possession_time: safeString(raw.possession_time),
    description: safeString(raw.description),
  };

  // Enforce enum whitelist - anything else gets dropped to blank rather than
  // rejecting the whole row, per spec ("if none match confidently, leave blank").
  if (ALLOWED_CRM_STATUS.includes(raw.crm_status as any)) {
    record.crm_status = raw.crm_status as CrmRecord['crm_status'];
  }
  if (ALLOWED_DATA_SOURCE.includes(raw.data_source as any)) {
    record.data_source = raw.data_source as CrmRecord['data_source'];
  }

  // Skip rule: must have a valid email OR a valid mobile number.
  const hasEmail = isValidEmail(record.email);
  const hasMobile = isValidMobile(record.mobile_without_country_code);

  if (!hasEmail && !hasMobile) {
    return { ok: false, reason: 'No valid email or mobile number found' };
  }

  // If created_at isn't a valid date, blank it out rather than skipping the
  // whole record (date is not one of the required-for-import fields).
  if (record.created_at && !isValidDate(record.created_at)) {
    record.created_at = '';
  }

  return { ok: true, record };
}

function safeString(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}
