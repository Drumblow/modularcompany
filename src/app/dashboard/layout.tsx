'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { getNavItemsByRole } from '@/lib/navigation';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageTransition } from '@/components/ui/PageTransition';
import { UserRoleType } from '@/lib/utils';

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  
  // Se a sessão ainda não foi carregada ou o usuário não tem um papel, renderizar os filhos diretamente
  // O componente de proteção de rota em cada subpágina cuidará do redirecionamento se necessário
  if (!session?.user?.role) {
    return children;
  }
  
  // Obter os itens de navegação com base no papel do usuário
  const navItems = getNavItemsByRole(session.user.role as UserRoleType);
  
  return (
    <DashboardLayout sidebarNavItems={navItems}>
      <PageTransition>
        {children}
      </PageTransition>
    </DashboardLayout>
  );
} 