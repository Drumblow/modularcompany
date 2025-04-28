'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/Toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeftIcon, CheckCircleIcon, DocumentTextIcon, ClockIcon, CurrencyDollarIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { devLog, devWarn, devError } from '@/lib/logger';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableFooter
} from '@/components/ui/Table';

interface Payment {
  id: string;
  amount: number;
  date: string;
  description?: string;
  reference?: string;
  paymentMethod: string;
  status: string;
  userId: string;
  userName: string;
  userEmail: string;
  hourlyRate?: number;
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  timeEntries: {
    id: string;
    date: string;
    totalHours: number;
    amount: number;
  }[];
  createdAt: string;
  createdByName: string;
  receiptUrl?: string;
  confirmedAt?: string;
}

const paymentMethods: Record<string, string> = {
  'bank_transfer': 'Transferência Bancária',
  'credit_card': 'Cartão de Crédito',
  'debit_card': 'Cartão de Débito',
  'cash': 'Dinheiro',
  'check': 'Cheque',
  'pix': 'PIX',
  'other': 'Outro'
};

export default function EmployeePaymentDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetchPaymentDetails();
  }, []);

  const fetchPaymentDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/payments/${params.id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao carregar detalhes do pagamento');
      }
      
      const data = await response.json();
      setPayment(data);
    } catch (error: any) {
      devError('Erro ao buscar detalhes do pagamento:', error);
      toast({
        title: "Erro",
        description: error.message || 'Não foi possível carregar os detalhes do pagamento'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!payment) return;
    
    try {
      setConfirming(true);
      
      const response = await fetch(`/api/payments/${payment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'completed',
          confirmedAt: new Date().toISOString()
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao confirmar pagamento');
      }
      
      const updatedPayment = await response.json();
      setPayment(updatedPayment);
      
      toast({
        title: "Sucesso",
        description: "Pagamento confirmado com sucesso!"
      });
    } catch (error: any) {
      devError('Erro ao confirmar pagamento:', error);
      toast({
        title: "Erro",
        description: error.message || 'Erro ao confirmar pagamento'
      });
    } finally {
      setConfirming(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pendente</Badge>;
      case 'awaiting_confirmation':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Aguardando Confirmação</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Concluído</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="flex h-[calc(100vh-12rem)] flex-col items-center justify-center gap-2">
        <p className="text-lg text-muted-foreground">Pagamento não encontrado</p>
        <Button variant="outline" onClick={() => router.push('/dashboard/employee/payments')}>
          Voltar para Pagamentos
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Detalhes do Pagamento</h2>
          <p className="text-muted-foreground">
            Detalhes completos do pagamento e registros de horas
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/employee/payments')}>
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          
          {(payment.status === 'pending' || payment.status === 'awaiting_confirmation') && (
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleConfirmPayment}
              disabled={confirming}
            >
              <CheckCircleIcon className="mr-2 h-4 w-4" />
              {confirming ? 'Confirmando...' : 'Confirmar Recebimento'}
            </Button>
          )}
        </div>
      </div>
      
      {/* Cards de estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <CurrencyDollarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(payment.amount)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <DocumentTextIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getStatusBadge(payment.status)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Horas</CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payment.totalHours.toFixed(2)}h</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Período</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {formatDate(payment.periodStart)} até {formatDate(payment.periodEnd)}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabela de registros de horas */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de Horas</CardTitle>
          <CardDescription>
            Todos os registros de horas incluídos neste pagamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payment.timeEntries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payment.timeEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.date)}</TableCell>
                    <TableCell>{entry.totalHours.toFixed(2)}h</TableCell>
                    <TableCell className="text-right">{formatCurrency(entry.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-medium">Total</TableCell>
                  <TableCell className="font-medium">{payment.totalHours.toFixed(2)}h</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(payment.amount)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              Nenhum registro de horas encontrado
            </p>
          )}
        </CardContent>
      </Card>
      
      {/* Informações de Pagamento */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="font-medium">Data do Pagamento:</dt>
                <dd>{formatDate(payment.date)}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="font-medium">Método de Pagamento:</dt>
                <dd>{paymentMethods[payment.paymentMethod] || payment.paymentMethod}</dd>
              </div>
              {payment.reference && (
                <div className="flex flex-col sm:flex-row sm:justify-between">
                  <dt className="font-medium">Referência:</dt>
                  <dd>{payment.reference}</dd>
                </div>
              )}
              {payment.description && (
                <div className="flex flex-col sm:flex-row sm:justify-between">
                  <dt className="font-medium">Descrição:</dt>
                  <dd>{payment.description}</dd>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="font-medium">Status:</dt>
                <dd>{getStatusBadge(payment.status)}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="font-medium">Confirmado em:</dt>
                <dd>{payment.confirmedAt ? formatDate(payment.confirmedAt) : 'Não confirmado'}</dd>
              </div>
              {payment.receiptUrl && (
                <div className="flex flex-col sm:flex-row sm:justify-between">
                  <dt className="font-medium">Comprovante:</dt>
                  <dd>
                    <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer" 
                      className="text-blue-600 hover:underline">
                      Visualizar Comprovante
                    </a>
                  </dd>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="font-medium">Período:</dt>
                <dd>{formatDate(payment.periodStart)} até {formatDate(payment.periodEnd)}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="font-medium">Total de Horas:</dt>
                <dd>{payment.totalHours.toFixed(2)}h</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="font-medium">Criado em:</dt>
                <dd>{formatDate(payment.createdAt)}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="font-medium">Criado por:</dt>
                <dd>{payment.createdByName}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 