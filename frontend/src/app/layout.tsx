import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SkyOps | AI-Powered Airport Operations & Disruption Management',
  description:
    'Real-time operations dashboard, conflict detection, gate allocations, and flight turnaround monitoring for commercial airport hubs.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-sky-800 selection:text-white">
        {children}
      </body>
    </html>
  );
}
