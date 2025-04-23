import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Constantes para substituir os enums do Prisma
export const UserRole = {
  DEVELOPER: 'DEVELOPER',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

export const PlanType = {
  BASIC: 'BASIC',
  STANDARD: 'STANDARD',
  PREMIUM: 'PREMIUM',
} as const;

export type PlanTypeType = typeof PlanType[keyof typeof PlanType]; 

/**
 * Formata uma data para o formato brasileiro (DD/MM/YYYY)
 * @param date Data a ser formatada
 * @returns String formatada no padrão DD/MM/YYYY
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
}

/**
 * Formata um valor monetário para o formato canadense ($ X,XXX.XX)
 * @param value Valor a ser formatado
 * @returns String formatada no padrão $ X,XXX.XX
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(value);
} 