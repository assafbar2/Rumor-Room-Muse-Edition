import type { Metadata, Viewport } from 'next';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/bodoni-moda/latin-400.css';
import '@fontsource/bodoni-moda/latin-400-italic.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rumor Room — A game of beautiful lies',
  description:
    'Ten fictional scandals. Four research turns. One claim that doesn’t hold up. Follow the receipts in this free deduction game.',
  applicationName: 'Rumor Room',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#101c17' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
