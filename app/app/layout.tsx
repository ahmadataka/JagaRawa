import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RawaGuard | Peat Fire Intelligence',
  description: 'A human-in-the-loop peat-fire decision-support prototype for Kalimantan.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
