import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SessionProvider } from '@/components/auth/SessionProvider';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Modular Company',
  description: 'Sistema modular para gestão de empresas',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <SessionProvider>
          {children}
          <Toaster richColors position="top-right" />
        </SessionProvider>
      </body>
    </html>
  );
} 