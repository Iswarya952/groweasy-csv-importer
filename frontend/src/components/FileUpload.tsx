'use client';

import { useCallback, useRef, useState } from 'react';

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  error: string | null;
}

export default function FileUpload({ onFileSelected, error }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file.name.toLowerCase().endsWith('.csv')) {
        onFileSelected(file); // let parent surface the "not a csv" error consistently
        return;
      }
      onFileSelected(file);
    },
    [onFileSelected]
  );

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-8 py-16 text-center cursor-pointer transition-all duration-200
          ${
            isDragging
              ? 'border-accent bg-accent/5 scale-[1.01]'
              : 'border-slate-300 dark:border-slate-700 hover:border-accent/60 hover:bg-slate-50 dark:hover:bg-panel/40'
          }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 border border-accent/30">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3DDC97" strokeWidth="1.8">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">
            Drop any lead export here
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Facebook, Google Ads, Excel, or a hand-made sheet — any layout works. Click to browse.
          </p>
        </div>
        <span className="rounded-full border border-slate-300 dark:border-slate-700 px-4 py-1.5 text-xs font-mono text-slate-500 dark:text-slate-400">
          .csv only · max 10MB
        </span>
      </div>
      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}
