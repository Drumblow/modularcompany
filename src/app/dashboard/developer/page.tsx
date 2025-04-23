'use client';

import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

// Dados de exemplo para demonstração
const mockCompanies = [
  {
    id: 'company-1',
    name: 'Empresa A',
    plan: 'PREMIUM',
    active: true,
    moduleCount: 3,
    userCount: 25,
  },
  {
    id: 'company-2',
    name: 'Empresa B',
    plan: 'STANDARD',
    active: true,
    moduleCount: 2,
    userCount: 12,
  },
  {
    id: 'company-3',
    name: 'Empresa C',
    plan: 'BASIC',
    active: false,
    moduleCount: 1,
    userCount: 5,
  },
];

export default function DeveloperDashboard() {
  const { data: session } = useSession();
  
  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard do Desenvolvedor</h2>
        <p className="text-muted-foreground">
          Gerencie suas empresas, módulos e pagamentos.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M3 21h18" />
              <path d="M3 7h18" />
              <path d="M3 14h18" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockCompanies.length}</div>
            <p className="text-xs text-muted-foreground">
              {mockCompanies.filter(c => c.active).length} ativas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockCompanies.reduce((acc, company) => acc + company.userCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Em todas as empresas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(5000).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              +12% desde o mês passado
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Empresas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockCompanies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <h3 className="font-medium">{company.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          company.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {company.active ? 'Ativo' : 'Inativo'}
                      </span>
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        {company.plan}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-sm font-medium">{company.userCount} usuários</p>
                      <p className="text-sm text-muted-foreground">
                        {company.moduleCount} módulos
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/developer/companies/${company.id}`}>
                        Gerenciar
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button asChild>
          <Link href="/dashboard/developer/companies/new">
            Adicionar Nova Empresa
          </Link>
        </Button>
      </div>
    </div>
  );
} 