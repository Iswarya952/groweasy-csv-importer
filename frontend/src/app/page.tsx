'use client';

import { useCallback, useState } from 'react';
import Papa from 'papaparse';
import FileUpload from '@/components/FileUpload';
import PreviewTable from '@/components/PreviewTable';
import ResultTable from '@/components/ResultTable';
import LoadingSpinner from '@/components/LoadingSpinner';
import DarkModeToggle from '@/components/DarkModeToggle';
import { confirmImport } from '@/lib/api';
import { AppStep, ImportResult } from '@/types';

interface LocalPreview {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
}

export default function Home() {
  const [step, setStep] = useState<AppStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<LocalPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = useCallback((selectedFile: File) => {
    setError(null);

    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a .csv file.');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File is too large. Max size is 10MB.');
      return;
    }

    // Parse client-side purely for the Step 2 preview - no AI here, per spec.
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Record<string, string>[];
        const headers = results.meta.fields || [];

        if (!rows.length || !headers.length) {
          setError('This CSV appears to be empty or has no readable headers.');
          return;
        }

        setFile(selectedFile);
        setPreview({ fileName: selectedFile.name, headers, rows });
        setStep('preview');
      },
      error: (err) => {
        setError(`Could not parse CSV: ${err.message}`);
      },
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!file) return;
    setStep('processing');
    setError(null);
    try {
      const data = await confirmImport(file);
      setResult(data);
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI import failed. Please try again.');
      setStep('preview');
    }
  }, [file]);

  const handleReset = useCallback(() => {
    setStep('upload');
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 md:py-14">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent-muted dark:text-accent">
            GrowEasy · Lead Ops
          </p>
          <h1 className="mt-1 font-display text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            CSV → CRM Importer
          </h1>
        </div>
        <DarkModeToggle />
      </header>

      <StepIndicator step={step} />

      {step === 'upload' && (
        <section className="mt-8">
          <FileUpload onFileSelected={handleFileSelected} error={error} />
        </section>
      )}

      {step === 'preview' && preview && (
        <section className="mt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                Preview — {preview.fileName}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {preview.rows.length} row{preview.rows.length === 1 ? '' : 's'} detected · no AI processing yet
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-panel transition-colors"
              >
                Choose a different file
              </button>
              <button
                onClick={handleConfirm}
                className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-ink hover:bg-accent-muted transition-colors shadow-glow"
              >
                Confirm import
              </button>
            </div>
          </div>
          {error && (
            <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}
          <PreviewTable headers={preview.headers} rows={preview.rows} />
        </section>
      )}

      {step === 'processing' && (
        <section className="mt-8">
          <LoadingSpinner label="Mapping columns into GrowEasy CRM fields via Gemini…" />
        </section>
      )}

      {step === 'result' && result && (
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Import complete
            </h2>
            <button
              onClick={handleReset}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-panel transition-colors"
            >
              Import another file
            </button>
          </div>
          <ResultTable
            imported={result.importedRecords}
            skipped={result.skippedRecords}
            totalImported={result.totalImported}
            totalSkipped={result.totalSkipped}
            totalRows={result.totalRows}
          />
        </section>
      )}
    </main>
  );
}

function StepIndicator({ step }: { step: AppStep }) {
  const steps: { key: AppStep; label: string }[] = [
    { key: 'upload', label: 'Upload' },
    { key: 'preview', label: 'Preview' },
    { key: 'processing', label: 'AI Mapping' },
    { key: 'result', label: 'Result' },
  ];
  const activeIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-mono transition-colors ${
              i <= activeIndex
                ? 'border-accent/40 bg-accent/10 text-accent-muted dark:text-accent'
                : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${i <= activeIndex ? 'bg-accent' : 'bg-slate-300 dark:bg-slate-700'}`}
            />
            {s.label}
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px w-6 ${i < activeIndex ? 'bg-accent/40' : 'bg-slate-200 dark:bg-slate-800'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
