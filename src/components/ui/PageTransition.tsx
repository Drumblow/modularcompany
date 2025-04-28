'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [displayedChildren, setDisplayedChildren] = useState(children);

  // Efeito para detectar mudanças de rota e iniciar animação
  useEffect(() => {
    // Se a rota mudou
    setIsPageTransitioning(true);
    
    // Atraso para permitir a animação de saída
    const timeout = setTimeout(() => {
      setDisplayedChildren(children);
      // Atraso pequeno para garantir que a animação de entrada inicie
      setTimeout(() => {
        setIsPageTransitioning(false);
      }, 50);
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [pathname, children]);

  return (
    <div
      className={cn(
        'transition-all duration-300 ease-in-out',
        isPageTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
      )}
    >
      {displayedChildren}
    </div>
  );
} 