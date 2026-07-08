import { ImportResult, PreviewResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function postFile<T>(path: string, file: File): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);

  const targetUrl = `${API_URL}${path}`;
  console.log('[API] Sending POST request to:', targetUrl);

  const res = await fetch(targetUrl, {
    method: 'POST',
    body: formData,
  });

  let body: ApiEnvelope<T>;
  try {
    body = await res.json();
  } catch {
    throw new Error(`Server returned an unreadable response (status ${res.status})`);
  }

  if (!res.ok || !body.success || !body.data) {
    throw new Error(body.error || `Request failed with status ${res.status}`);
  }

  return body.data;
}

export function previewCsv(file: File): Promise<PreviewResponse> {
  return postFile<PreviewResponse>('/api/import/preview', file);
}

export function confirmImport(file: File): Promise<ImportResult> {
  return postFile<ImportResult>('/api/import/confirm', file);
}
