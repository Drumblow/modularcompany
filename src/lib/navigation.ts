import { UserRole } from './utils';

// Itens de navegação para desenvolvedor
export const developerNavItems = [
  {
    title: 'Dashboard',
    href: '/dashboard/developer',
  },
  {
    title: 'Empresas',
    href: '/dashboard/developer/companies',
  },
  {
    title: 'Usuários',
    href: '/dashboard/developer/users',
  },
  {
    title: 'Controle Financeiro',
    href: '/dashboard/developer/finances',
  },
  {
    title: 'Módulos',
    href: '/dashboard/developer/modules',
  },
  {
    title: 'Pagamentos',
    href: '/dashboard/developer/payments',
  },
  {
    title: 'Perfil',
    href: '/dashboard/developer/profile',
  },
  {
    title: 'Configurações',
    href: '/dashboard/developer/settings',
  },
];

// Itens de navegação para administrador
export const adminNavItems = [
  {
    title: 'Dashboard',
    href: '/dashboard/admin',
  },
  {
    title: 'Usuários',
    href: '/dashboard/admin/users',
  },
  {
    title: 'Gestão de Horas',
    href: '/dashboard/admin/time-entries',
  },
  {
    title: 'Pagamentos',
    href: '/dashboard/admin/payments',
  },
  {
    title: 'Módulos',
    href: '/dashboard/admin/modules',
  },
  {
    title: 'Relatórios',
    href: '/dashboard/admin/reports',
  },
  {
    title: 'Empresa',
    href: '/dashboard/admin/company',
  },
  {
    title: 'Perfil',
    href: '/dashboard/admin/profile',
  },
];

// Itens de navegação para gerente
export const managerNavItems = [
  {
    title: 'Dashboard',
    href: '/dashboard/manager',
  },
  {
    title: 'Gestão de Horas',
    href: '/dashboard/manager/time-entries',
  },
  {
    title: 'Funcionários',
    href: '/dashboard/manager/employees',
  },
  {
    title: 'Pagamentos',
    href: '/dashboard/manager/payments',
  },
  {
    title: 'Relatórios',
    href: '/dashboard/manager/reports',
  },
  {
    title: 'Perfil',
    href: '/dashboard/manager/profile',
  },
];

// Itens de navegação para funcionário
export const employeeNavItems = [
  {
    title: 'Dashboard',
    href: '/dashboard/employee',
  },
  {
    title: 'Registro de Horas',
    href: '/dashboard/employee/time-entries',
  },
  {
    title: 'Pagamentos',
    href: '/dashboard/employee/payments',
  },
  {
    title: 'Relatórios',
    href: '/dashboard/employee/reports',
  },
  {
    title: 'Perfil',
    href: '/dashboard/employee/profile',
  },
];

// Função para obter os itens de navegação com base no papel do usuário
export function getNavItemsByRole(role: string) {
  switch (role) {
    case UserRole.DEVELOPER:
      return developerNavItems;
    case UserRole.ADMIN:
      return adminNavItems;
    case UserRole.MANAGER:
      return managerNavItems;
    case UserRole.EMPLOYEE:
      return employeeNavItems;
    default:
      return [];
  }
} 