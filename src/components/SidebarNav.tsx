'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface SidebarNavProps {
  items: {
    title: string;
    href: string;
    icon?: React.ReactNode;
  }[];
  mobile?: boolean;
}

export function SidebarNav({ items, mobile }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn(
      'grid items-start gap-2',
      mobile ? 'flex flex-col' : 'hidden md:grid'
    )}>
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