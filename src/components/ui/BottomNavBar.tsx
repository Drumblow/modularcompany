'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  HomeIcon, 
  ClockIcon, 
  UserIcon, 
  BellIcon 
} from '@heroicons/react/24/outline';
import { 
  HomeIcon as HomeIconSolid, 
  ClockIcon as ClockIconSolid, 
  UserIcon as UserIconSolid, 
  BellIcon as BellIconSolid 
} from '@heroicons/react/24/solid';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
}

interface BottomNavBarProps {
  userRole: string;
}

export function BottomNavBar({ userRole }: BottomNavBarProps) {
  const pathname = usePathname();
  
  // Determinar os itens de navegação com base no papel do usuário
  const getNavItems = (): NavItem[] => {
    const baseItems: NavItem[] = [
      {
        href: `/dashboard/${userRole}`,
        label: 'Home',
        icon: <HomeIcon className="h-6 w-6" />,
        activeIcon: <HomeIconSolid className="h-6 w-6" />,
      },
    ];
    
    // Adicionar itens específicos para funcionários
    if (userRole === 'employee') {
      return [
        ...baseItems,
        {
          href: `/dashboard/${userRole}/time-entries`,
          label: 'Horas',
          icon: <ClockIcon className="h-6 w-6" />,
          activeIcon: <ClockIconSolid className="h-6 w-6" />,
        },
        {
          href: `/dashboard/${userRole}/notifications`,
          label: 'Notificações',
          icon: <BellIcon className="h-6 w-6" />,
          activeIcon: <BellIconSolid className="h-6 w-6" />,
        },
        {
          href: `/dashboard/${userRole}/profile`,
          label: 'Perfil',
          icon: <UserIcon className="h-6 w-6" />,
          activeIcon: <UserIconSolid className="h-6 w-6" />,
        },
      ];
    }
    
    // Adicionar itens específicos para gerentes
    if (userRole === 'manager') {
      return [
        ...baseItems,
        {
          href: `/dashboard/${userRole}/time-entries`,
          label: 'Horas',
          icon: <ClockIcon className="h-6 w-6" />,
          activeIcon: <ClockIconSolid className="h-6 w-6" />,
        },
        {
          href: `/dashboard/${userRole}/notifications`,
          label: 'Notificações',
          icon: <BellIcon className="h-6 w-6" />,
          activeIcon: <BellIconSolid className="h-6 w-6" />,
        },
        {
          href: `/dashboard/${userRole}/profile`,
          label: 'Perfil',
          icon: <UserIcon className="h-6 w-6" />,
          activeIcon: <UserIconSolid className="h-6 w-6" />,
        },
      ];
    }
    
    // Para admin e developer
    return [
      ...baseItems,
      {
        href: `/dashboard/${userRole}/notifications`,
        label: 'Notificações',
        icon: <BellIcon className="h-6 w-6" />,
        activeIcon: <BellIconSolid className="h-6 w-6" />,
      },
      {
        href: `/dashboard/${userRole}/profile`,
        label: 'Perfil',
        icon: <UserIcon className="h-6 w-6" />,
        activeIcon: <UserIconSolid className="h-6 w-6" />,
      },
    ];
  };
  
  const navItems = getNavItems();
  
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background z-40">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-16 pt-1 pb-0.5",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="flex items-center justify-center h-6">
                {isActive ? item.activeIcon : item.icon}
              </div>
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
} 