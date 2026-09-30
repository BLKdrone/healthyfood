import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Plate Pal — Cute Portion Companion',
  description: 'A cute AI portion-control and healthy-eating companion with Magic Plate Camera and Doctor Rx tracking.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/plate-icon.svg',
    apple: '/plate-icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Plate Pal',
  },
};

export const viewport: Viewport = {
  themeColor: '#A7F3D0',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full font-sans bg-[#FFFDF9] text-[#292524]">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
