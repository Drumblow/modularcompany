'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { devLog, devWarn, devError } from '@/lib/logger';

interface TimeEntry {
  id: string;
  date: string;
  totalHours: number;
  amount: number;
}

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
  timeEntries: TimeEntry[];
  createdAt: string;
  createdById: string;
  createdByName: string;
}

export default function PaymentDetailsPage({ params }: { params: { id: string } }) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/payments/${params.id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Pagamento não encontrado');
          }
          throw new Error('Erro ao buscar detalhes do pagamento');
        }
        
        const data = await response.json();
        setPayment(data);
      } catch (err: any) {
        devError('Erro ao buscar pagamento:', err);
        setError(err.message || 'Erro ao carregar pagamento');
      } finally {
        setLoading(false);
      }
    };

    fetchPayment();
  }, [params.id]);

  const handleBack = () => {
    router.back();
  };

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja excluir este pagamento? Esta ação não poderá ser desfeita.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/payments/${params.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir pagamento');
      }

      router.push('/dashboard/admin/payments');
    } catch (err: any) {
      devError('Erro ao excluir pagamento:', err);
      setError(err.message || 'Erro ao excluir pagamento');
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/dashboard/admin/payments/${params.id}/edit`);
  };

  // Formatar valor em CAD
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(value);
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  // Traduzir método de pagamento
  const translatePaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      'bank_transfer': 'Transferência Bancária',
      'credit_card': 'Cartão de Crédito',
      'debit_card': 'Cartão de Débito',
      'cash': 'Dinheiro',
      'check': 'Cheque',
      'pix': 'PIX',
      'other': 'Outro'
    };
    return methods[method] || method;
  };

  // Traduzir status
  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'completed': 'Concluído',
      'pending': 'Pendente',
      'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
  };

  // Obter classe de cor com base no status
  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'cancelled':
        return 'text-red-600';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">Carregando detalhes do pagamento...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center text-red-500">
          <p>{error}</p>
          <Button onClick={handleBack} className="mt-4">Voltar</Button>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p>Pagamento não encontrado</p>
          <Button onClick={handleBack} className="mt-4">Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Detalhes do Pagamento"
        description={`Pagamento para ${payment.userName}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleBack}>Voltar</Button>
            <Button variant="outline" onClick={handleEdit}>Editar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="font-medium">Valor:</dt>
                <dd className="text-lg font-bold">{formatCurrency(payment.amount)}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="font-medium">Data:</dt>
                <dd>{formatDate(payment.date)}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="font-medium">Status:</dt>
                <dd className={getStatusColorClass(payment.status)}>
                  {translateStatus(payment.status)}
                </dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="font-medium">Método de Pagamento:</dt>
                <dd>{translatePaymentMethod(payment.paymentMethod)}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="font-medium">Referência:</dt>
                <dd>{payment.reference || '-'}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="font-medium">Descrição:</dt>
                <dd>{payment.description || '-'}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="font-medium">Período de Referência:</dt>
                <dd>{formatDate(payment.periodStart)} a {formatDate(payment.periodEnd)}</dd>
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

        <Card>
          <CardHeader>
            <CardTitle>Informações do Funcionário</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="font-medium">Nome:</dt>
                <dd>{payment.userName}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="font-medium">E-mail:</dt>
                <dd>{payment.userEmail}</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between">
                <dt className="font-medium">Taxa Horária:</dt>
                <dd>{payment.hourlyRate ? formatCurrency(payment.hourlyRate) : '-'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Registros de Horas Incluídos</CardTitle>
        </CardHeader>
        <CardContent>
          {payment.timeEntries.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Nenhum registro de horas associado a este pagamento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-2 text-left">Data</th>
                    <th className="py-2 px-2 text-right">Horas</th>
                    <th className="py-2 px-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {payment.timeEntries.map((entry) => (
                    <tr key={entry.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2">{formatDate(entry.date)}</td>
                      <td className="py-2 px-2 text-right">{entry.totalHours.toFixed(2)}h</td>
                      <td className="py-2 px-2 text-right">{formatCurrency(entry.amount)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className="py-2 px-2">Total</td>
                    <td className="py-2 px-2 text-right">{payment.totalHours.toFixed(2)}h</td>
                    <td className="py-2 px-2 text-right">{formatCurrency(payment.amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 