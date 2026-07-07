/**
 * Canonical GrowEasy CRM record shape.
 * This is the target format that every CSV row must be mapped into,
 * regardless of the source CSV's original column names/layout.
 */
export interface CrmRecord {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: CrmStatus | '';
  crm_note: string;
  data_source: DataSource | '';
  possession_time: string;
  description: string;
}

export const ALLOWED_CRM_STATUS = [
  'GOOD_LEAD_FOLLOW_UP',
  'DID_NOT_CONNECT',
  'BAD_LEAD',
  'SALE_DONE',
] as const;
export type CrmStatus = (typeof ALLOWED_CRM_STATUS)[number];

export const ALLOWED_DATA_SOURCE = [
  'leads_on_demand',
  'meridian_tower',
  'eden_park',
  'varah_swamy',
  'sarjapur_plots',
] as const;
export type DataSource = (typeof ALLOWED_DATA_SOURCE)[number];

/** A raw row straight out of Papa/csv-parse, before any AI mapping. */
export type RawCsvRow = Record<string, string>;

/** One "skipped" entry returned to the client, with the reason. */
export interface SkippedRecord {
  row: RawCsvRow;
  reason: string;
  rowIndex: number;
}

export interface ImportResult {
  importedRecords: CrmRecord[];
  skippedRecords: SkippedRecord[];
  totalRows: number;
  totalImported: number;
  totalSkipped: number;
  batches: number;
}
