import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Fabric File Manager',
    template: '%s | Fabric File Manager',
  },
  description:
    'Securely upload and manage files in Microsoft Fabric Lakehouse. Professional file management powered by OneLake.',
  keywords: ['Microsoft Fabric', 'OneLake', 'Lakehouse', 'File Management', 'Azure'],
  authors: [{ name: 'Fabric File Manager' }],
  robots: 'noindex, nofollow', // Internal enterprise tool
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-slate-50 text-slate-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
