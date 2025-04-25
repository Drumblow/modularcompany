'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EyeIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { toast } from '@/components/ui/Toast';
import { devLog, devWarn, devError } from '@/lib/logger';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell,
  TableCaption
} from '@/components/ui/Table';

interface Payment {
  id: string;
  amount: number;
  date: string;
  status: string;
  paymentMethod: string;
  reference?: string;
  description?: string;
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  createdAt: string;
  creatorId?: string;
  createdByName: string;
}

export default function EmployeePaymentsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/payments');
      
      if (!response.ok) {
        throw new Error('Falha ao buscar pagamentos');
      }
      
      const data = await response.json();
      setPayments(data);
      setError(null);
    } catch (err: any) {
      devError('Erro ao buscar pagamentos:', err);
      setError(err.message || 'Não foi possível carregar os pagamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async (paymentId: string) => {
    try {
      setProcessingId(paymentId);
      
      const response = await fetch(`/api/payments/${paymentId}`, {
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
        const error = await response.json();
        throw new Error(error.message || 'Erro ao confirmar pagamento');
      }
      
      // Atualizar a lista de pagamentos
      setPayments(prev => 
        prev.map(payment => 
          payment.id === paymentId 
            ? { ...payment, status: 'completed' } 
            : payment
        )
      );
      
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
      setProcessingId(null);
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

  const filteredPayments = payments.filter(payment => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return payment.status === 'pending' || payment.status === 'awaiting_confirmation';
    if (activeTab === 'completed') return payment.status === 'completed';
    if (activeTab === 'cancelled') return payment.status === 'cancelled';
    return true;
  });

  // Estatísticas
  const totalAmount = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);
    
  const totalHours = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.totalHours, 0);
    
  const pendingAmount = payments
    .filter(p => p.status === 'pending' || p.status === 'awaiting_confirmation')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Meus Pagamentos</h2>
        <p className="text-muted-foreground">
          Visualize e confirme seus pagamentos recebidos
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Recebido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading ? '-' : formatCurrency(totalAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de horas: {totalHours.toFixed(1)}h
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pagamentos Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {loading ? '-' : formatCurrency(pendingAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {payments.filter(p => p.status === 'pending' || p.status === 'awaiting_confirmation').length} pagamento(s) aguardando
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Último Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length > 0 ? (
              <div>
                <div className="text-2xl font-bold">
                  {loading ? '-' : formatCurrency(
                    [...payments]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.amount || 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {loading ? '-' : formatDate(
                    [...payments]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date || new Date().toISOString()
                  )}
                </p>
              </div>
            ) : (
              <div className="text-muted-foreground">Nenhum pagamento</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Pagamentos</CardTitle>
          <CardDescription>
            Consulte todos os seus pagamentos e confirme os pagamentos pendentes
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="completed">Concluídos</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelados</TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="flex h-36 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : error ? (
            <div className="flex h-36 items-center justify-center">
              <p className="text-center text-destructive">{error}</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="flex h-36 items-center justify-center">
              <p className="text-center text-muted-foreground">Nenhum pagamento encontrado.</p>
            </div>
          ) : (
            <Table>
              <TableCaption>Lista de todos os seus pagamentos</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.date)}</TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>{payment.reference || '-'}</TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <span>{formatDate(payment.periodStart)}</span>
                        <span className="mx-1">até</span>
                        <span>{formatDate(payment.periodEnd)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{translatePaymentMethod(payment.paymentMethod)}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => router.push(`/dashboard/employee/payments/${payment.id}`)}
                      >
                        <EyeIcon className="mr-2 h-4 w-4" />
                        Detalhes
                      </Button>
                      
                      {(payment.status === 'pending' || payment.status === 'awaiting_confirmation') && (
                        <Button 
                          variant="outline"
                          size="sm"
                          className="bg-green-50 text-green-700 hover:bg-green-100"
                          onClick={() => handleConfirmPayment(payment.id)}
                          disabled={processingId === payment.id}
                        >
                          <CheckCircleIcon className="mr-2 h-4 w-4" />
                          {processingId === payment.id ? 'Confirmando...' : 'Confirmar'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 