'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { PageHeader } from '@/components/layout/PageHeader';
import { 
  UserIcon, 
  CalendarIcon, 
  ClockIcon, 
  BanknotesIcon, 
  CreditCardIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

interface TimeEntry {
  id: string;
  date: string;
  totalHours: number;
  amount: number;
}

interface Payment {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  date: string;
  reference?: string;
  description?: string;
  paymentMethod: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  hourlyRate?: number;
  timeEntries: TimeEntry[];
  createdAt: string;
  createdById: string;
  createdByName: string;
}

export default function ManagerPaymentDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'DEVELOPER';

  useEffect(() => {
    if (params.id) {
      fetchPaymentDetails(params.id);
    }
  }, [params.id]);
  
  useEffect(() => {
    if (payment) {
      setPaymentStatus(payment.status);
    }
  }, [payment]);

  const fetchPaymentDetails = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/payments/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Pagamento não encontrado');
        }
        throw new Error('Erro ao carregar detalhes do pagamento');
      }
      
      const data = await response.json();
      setPayment(data);
      setLoading(false);
    } catch (error: any) {
      console.error('Erro ao buscar detalhes do pagamento:', error);
      setError(error.message || 'Erro ao carregar detalhes do pagamento');
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/dashboard/manager/payments');
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

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

  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'completed': 'Concluído',
      'pending': 'Pendente',
      'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Pendente</Badge>;
      case 'completed':
        return <Badge variant="success">Concluído</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
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

  const updatePaymentStatus = async () => {
    if (!payment || !isAdmin || paymentStatus === payment.status) return;
    
    try {
      setUpdatingStatus(true);
      
      const response = await fetch(`/api/payments/${payment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: paymentStatus
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar status do pagamento');
      }
      
      const updatedPayment = await response.json();
      setPayment(updatedPayment);
      
      const statusMessages = {
        completed: 'Pagamento marcado como concluído com sucesso!',
        cancelled: 'Pagamento cancelado com sucesso!',
        pending: 'Pagamento retornou ao status pendente!'
      };
      
      toast.success(statusMessages[paymentStatus as keyof typeof statusMessages] || 'Status atualizado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast.error(`Erro: ${error.message || 'Não foi possível atualizar o status'}`);
    } finally {
      setUpdatingStatus(false);
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
            {payment.status === 'pending' && isAdmin && (
              <Button 
                onClick={() => {
                  setPaymentStatus('completed');
                  setTimeout(() => updatePaymentStatus(), 100);
                }}
              >
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Marcar como Pago
              </Button>
            )}
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

      {isAdmin && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Atualizar Status</CardTitle>
            <CardDescription>Gerencie o status deste pagamento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status do Pagamento</label>
              <Select
                value={paymentStatus}
                onValueChange={setPaymentStatus}
                disabled={updatingStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={updatePaymentStatus}
              disabled={updatingStatus || paymentStatus === payment.status}
            >
              {updatingStatus ? 'Atualizando...' : 'Atualizar Status'}
              <PaperAirplaneIcon className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

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