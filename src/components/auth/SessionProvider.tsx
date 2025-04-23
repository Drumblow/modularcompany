'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { ReactNode, useEffect } from 'react';
import { useSession } from 'next-auth/react';

// Componente para rastreamento de sessão
function SessionTracker() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session) {
      // Salvar informações da sessão no localStorage para diagnóstico
      localStorage.setItem('sessionInfo', JSON.stringify({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        companyId: session.user.companyId,
      }));
      console.log('[SessionTracker] Informações da sessão salvas no localStorage:', session);
    }
  }, [session]);

  return null;
}

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider>
      <SessionTracker />
      {children}
    </NextAuthSessionProvider>
  );
} 