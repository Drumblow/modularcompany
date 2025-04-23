'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { ReactNode } from 'react';

interface RouteGuardProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export function RouteGuard({ children, allowedRoles }: RouteGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Se a autenticação estiver carregando, não faz nada
    if (status === 'loading') {
      return;
    }

    // Se não estiver autenticado, redireciona para o login
    if (!session) {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }

    // Se tiver roles específicas e o usuário não tiver permissão
    if (allowedRoles?.length && !allowedRoles.includes(session.user.role)) {
      router.push('/unauthorized');
      return;
    }
  }, [session, status, router, pathname, allowedRoles]);

  // Mostra uma tela de carregamento enquanto verifica a autenticação
  if (status === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Se estiver autenticado e tiver permissão, renderiza os filhos
  if (session && (!allowedRoles?.length || allowedRoles.includes(session.user.role))) {
    return <>{children}</>;
  }

  // Caso contrário, retorna null (não deve chegar aqui devido aos redirecionamentos)
  return null;
} 