'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { TimeEntryList } from '@/components/modules/TimeTracking/TimeEntryList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { BanknotesIcon, ClockIcon, CalendarIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { devLog, devWarn, devError } from '@/lib/logger';

interface Payment {
  id: string;
  amount: number;
  date: string;
  status: string;
  totalHours: number;
}

export default function EmployeeDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [paymentStats, setPaymentStats] = useState({
    totalReceived: 0,
    pendingPayments: 0,
    totalHoursPaid: 0,
    lastPaymentDate: '-'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPaymentStats = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/payments');
        
        if (response.ok) {
          const payments = await response.json() as Payment[];
          
          // Calcular estatísticas
          const totalReceived = payments
            .filter((p: Payment) => p.status === 'completed')
            .reduce((sum: number, p: Payment) => sum + p.amount, 0);
            
          const pendingPayments = payments
            .filter((p: Payment) => p.status === 'pending' || p.status === 'awaiting_confirmation')
            .length;
            
          const totalHoursPaid = payments
            .filter((p: Payment) => p.status === 'completed')
            .reduce((sum: number, p: Payment) => sum + p.totalHours, 0);
            
          const sortedPayments = [...payments].sort((a: Payment, b: Payment) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          
          const lastPaymentDate = sortedPayments.length > 0 
            ? new Date(sortedPayments[0].date).toLocaleDateString('pt-BR') 
            : '-';
            
          setPaymentStats({
            totalReceived,
            pendingPayments,
            totalHoursPaid,
            lastPaymentDate
          });
        }
      } catch (error) {
        devError('Erro ao buscar estatísticas de pagamentos:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (session) {
      fetchPaymentStats();
    }
  }, [session]);

  return (
    <div className="flex flex-col space-y-4 p-3 sm:p-6 sm:space-y-6">
      <div className="flex flex-col space-y-1 sm:space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard do Funcionário</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Gerencie suas horas trabalhadas e visualize seus pagamentos.
        </p>
      </div>

      {/* Cards de estatísticas - 2 por linha em mobile, 4 por linha em desktop */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Total Recebido
            </CardTitle>
            <BanknotesIcon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">
              {loading ? '-' : `R$ ${paymentStats.totalReceived.toFixed(2)}`}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Pagamentos confirmados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Pagamentos Pendentes
            </CardTitle>
            <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">
              {loading ? '-' : paymentStats.pendingPayments}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Aguardando processamento
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Horas Pagas
            </CardTitle>
            <ClockIcon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">
              {loading ? '-' : `${paymentStats.totalHoursPaid.toFixed(1)}h`}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Total de horas já pagas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Último Pagamento
            </CardTitle>
            <CheckCircleIcon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">
              {loading ? '-' : paymentStats.lastPaymentDate}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Data do último pagamento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ações - empilhadas em mobile, lado a lado em desktop */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
        <h3 className="text-xl font-semibold">Seus Registros de Horas</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" size="full" className="sm:size-default" onClick={() => router.push('/dashboard/employee/payments')}>
            Ver Pagamentos
          </Button>
          <Button size="full" className="sm:size-default" onClick={() => router.push('/dashboard/employee/time-entries')}>
            Novo Registro
          </Button>
        </div>
      </div>

      <TimeEntryList />
    </div>
  );
} 