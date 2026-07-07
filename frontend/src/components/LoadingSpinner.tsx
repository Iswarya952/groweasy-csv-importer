'use client';

export default function LoadingSpinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16">
      <svg width="220" height="90" viewBox="0 0 220 90" fill="none">
        {/* messy source columns */}
        {[14, 34, 54, 74].map((y, i) => (
          <rect key={`src-${i}`} x="0" y={y - 6} width="52" height="12" rx="3" className="fill-slate-300 dark:fill-slate-700" />
        ))}
        {/* clean CRM fields */}
        {[10, 30, 50, 70].map((y, i) => (
          <rect key={`dst-${i}`} x="168" y={y - 6} width="52" height="12" rx="3" className="fill-accent/30 stroke-accent" strokeWidth="1" />
        ))}
        {/* mapping lines */}
        {[
          [14, 10],
          [34, 30],
          [54, 70],
          [74, 50],
        ].map(([y1, y2], i) => (
          <path
            key={i}
            d={`M52 ${y1} C 100 ${y1}, 120 ${y2}, 168 ${y2}`}
            stroke="#3DDC97"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="mapping-pulse"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </svg>
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 rounded-full bg-accent animate-ping" />
        <p className="font-mono text-sm text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}
