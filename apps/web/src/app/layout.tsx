import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono, Mona_Sans } from 'next/font/google';
import { AppProviders } from '@/providers/app-providers';
import '@/styles/globals.css';

// Mona Sans: one variable family for display, interface and dense data (weight and width axes).
const mona = Mona_Sans({ subsets: ['latin'], variable: '--font-mona', display: 'swap', axes: ['wdth'] });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap', weight: ['400', '500'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default: 'FixMyCity: One City. One Platform. Every Service.',
    template: '%s | FixMyCity',
  },
  description:
    'FixMyCity is a unified platform to report civic issues, track resolutions, view utility bills and read city updates. Built by team Kalvi Coder.',
  applicationName: 'FixMyCity',
  openGraph: {
    title: 'FixMyCity',
    description: 'One City. One Platform. Every Service.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a1020' },
    { media: '(prefers-color-scheme: light)', color: '#f4f4f1' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mona.variable} ${jetbrains.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only z-[100] rounded-control bg-accent px-4 py-2.5 font-semibold text-accent-fg focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
