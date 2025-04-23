'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { NotificationBell } from '@/components/ui/NotificationBell';

interface SidebarNavProps {
  items: {
    title: string;
    href: string;
    icon?: React.ReactNode;
  }[];
}

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="grid items-start gap-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
            pathname === item.href ? 'bg-accent text-accent-foreground' : 'transparent'
          )}
        >
          {item.icon && <span className="mr-2 h-4 w-4">{item.icon}</span>}
          <span>{item.title}</span>
        </Link>
      ))}
    </nav>
  );
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  sidebarNavItems: SidebarNavProps['items'];
}

export function DashboardLayout({
  children,
  sidebarNavItems,
}: DashboardLayoutProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  if (!session) {
    return null; // Não deveria acontecer devido ao RouteGuard, mas por segurança
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-bold">
              ModularCompany
            </Link>
          </div>
          <nav className="flex items-center gap-4">
            <div className="relative">
              <div className="flex items-center gap-4">
                <NotificationBell />
                <span className="text-sm font-medium">{session.user.name}</span>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  {session.user.role}
                </span>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  Sair
                </Button>
              </div>
            </div>
          </nav>
        </div>
      </header>
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10">
        <aside className="fixed top-14 z-30 -ml-2 hidden h-[calc(100vh-3.5rem)] w-full shrink-0 md:sticky md:block">
          <div className="relative overflow-hidden py-6 pr-6 lg:py-8">
            <SidebarNav items={sidebarNavItems} />
          </div>
        </aside>
        <main className="flex w-full flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  );
} 