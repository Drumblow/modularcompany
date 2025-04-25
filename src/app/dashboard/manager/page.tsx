'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CalendarDaysIcon, ClockIcon, UserGroupIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';
import { devLog, devWarn, devError } from '@/lib/logger';

export default function ManagerDashboardPage() {
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [totalHours, setTotalHours] = useState(0);
  const [pendingTimeEntries, setPendingTimeEntries] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Buscar estatísticas do dashboard
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/dashboard/manager/stats');
        
        if (response.ok) {
          const data = await response.json();
          setTotalEmployees(data.totalEmployees || 0);
          setTotalHours(data.totalHours || 0);
          setPendingTimeEntries(data.pendingTimeEntries || 0);
          setPendingPayments(data.pendingPayments || 0);
        }
      } catch (error) {
        devError('Erro ao buscar estatísticas do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral da gestão da empresa"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Funcionários
            </CardTitle>
            <UserGroupIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '-' : totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              Total de funcionários ativos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Horas Registradas
            </CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '-' : totalHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Mês atual
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Registros Pendentes
            </CardTitle>
            <CalendarDaysIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '-' : pendingTimeEntries}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando aprovação
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pagamentos Pendentes
            </CardTitle>
            <BanknotesIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '-' : pendingPayments}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando processamento
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 mt-6">
        <Link href="/dashboard/manager/employees">
          <Button variant="outline">
            Gerenciar Funcionários
          </Button>
        </Link>
        <Link href="/dashboard/manager/time-entries">
          <Button variant="outline">
            Registros de Horas
          </Button>
        </Link>
        <Link href="/dashboard/manager/reports">
          <Button variant="outline">
            Relatórios
          </Button>
        </Link>
        <Link href="/dashboard/manager/payments">
          <Button variant="outline">
            Pagamentos
          </Button>
        </Link>
        <Link href="/dashboard/manager/payments/create">
          <Button>
            Criar Novo Pagamento
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Registros de Horas Recentes</CardTitle>
            <CardDescription>
              Últimos registros que precisam de sua aprovação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4 text-muted-foreground">
              Carregando registros pendentes...
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Funcionários</CardTitle>
            <CardDescription>
              Lista de funcionários ativos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4 text-muted-foreground">
              Carregando lista de funcionários...
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 