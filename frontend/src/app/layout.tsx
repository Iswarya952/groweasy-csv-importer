import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GrowEasy · CSV → CRM Importer',
  description: 'AI-powered CSV importer that maps any lead export into GrowEasy CRM format.',
};

// Inline script prevents a flash of the wrong theme: it runs before React
// hydrates and applies the saved/preferred theme class synchronously.
const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('groweasy-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored || (prefersDark ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-white dark:bg-ink text-slate-900 dark:text-slate-100 font-body antialiased min-h-screen transition-colors duration-300">
        {children}
      </body>
    </html>
  );
}
