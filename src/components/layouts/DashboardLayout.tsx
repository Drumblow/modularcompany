'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { SidebarNav } from '../SidebarNav';
import dynamic from 'next/dynamic';

// Importação dinâmica do BottomNavBar
const BottomNavBar = dynamic(() => 
  import('@/components/BottomNavBar').then(mod => mod.default), 
  { ssr: false }
);

interface DashboardLayoutProps {
  children: React.ReactNode;
  sidebarNavItems: {
    title: string;
    href: string;
    icon?: React.ReactNode;
  }[];
}

export function DashboardLayout({
  children,
  sidebarNavItems,
}: DashboardLayoutProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  if (!session) {
    return null; // Não deveria acontecer devido ao RouteGuard, mas por segurança
  }

  // Extrair o papel do usuário da sessão
  const userRole = session.user.role.toLowerCase();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-14 items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <button 
              className="block md:hidden p-2" 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menu"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                {isMobileMenuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <path d="M3 12h18M3 6h18M3 18h18" />
                )}
              </svg>
            </button>
            <Link href="/" className="font-bold text-lg">
              ModularCompany
            </Link>
          </div>
          <nav className="flex items-center gap-2">
            <NotificationBell />
            <button 
              className="flex items-center gap-1 rounded-full p-1 text-sm hover:bg-accent"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <span className="hidden md:inline">{session.user.name}</span>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                {session.user.name?.charAt(0) || 'U'}
              </div>
            </button>
          </nav>
        </div>
      </header>
      
      {/* Menu móvel que aparece ao clicar no hambúrguer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-background md:hidden">
          <div className="container pt-16 pb-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{session.user.name}</p>
                <p className="text-xs text-muted-foreground">{session.user.email}</p>
                <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  {session.user.role}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="h-8">
                Sair
              </Button>
            </div>
            <div className="py-4">
              <SidebarNav items={sidebarNavItems} mobile={true} />
            </div>
          </div>
        </div>
      )}
      
      <div className="flex flex-1">
        {/* Barra lateral para desktop */}
        <div className="hidden border-r bg-background md:block md:w-64">
          <div className="flex h-full flex-col gap-2 p-4">
            <SidebarNav items={sidebarNavItems} />
            <div className="mt-auto pt-4">
              <Button 
                onClick={handleSignOut}
                variant="outline" 
                className="w-full justify-start"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="mr-2"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sair
              </Button>
            </div>
          </div>
        </div>
        
        {/* Conteúdo principal */}
        <main className="flex-1 overflow-y-auto">
          <div className="container py-6 md:py-10">
            {children}
          </div>
        </main>
      </div>
      
      {/* Barra de navegação inferior para mobile */}
      <BottomNavBar />
    </div>
  );
} 