'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { PlusIcon, MagnifyingGlassIcon, BanknotesIcon, ClockIcon, UserGroupIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import { devLog, devWarn, devError } from '@/lib/logger';

interface Payment {
  id: string;
  amount: number;
  date: string;
  paymentMethod: string;
  status: string;
  userId: string;
  userName: string;
  reference?: string;
  totalHours: number;
}

export default function AdminPaymentListPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

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
      setLoading(false);
    } catch (error: any) {
      devError('Erro ao buscar pagamentos:', error);
      setError(error.message || 'Erro ao carregar pagamentos');
      setLoading(false);
    }
  };

  const handleDeletePayment = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Tem certeza que deseja excluir este pagamento? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const response = await fetch(`/api/payments/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Falha ao excluir o pagamento');
      }

      // Atualizar lista de pagamentos após exclusão
      setPayments(payments.filter(payment => payment.id !== id));
      alert('Pagamento excluído com sucesso');
    } catch (error: any) {
      devError('Erro ao excluir pagamento:', error);
      alert(`Erro ao excluir pagamento: ${error.message}`);
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
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Concluído</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredPayments = payments
    .filter(payment => {
      if (activeTab === 'all') return true;
      if (activeTab === 'completed') return payment.status === 'completed';
      if (activeTab === 'pending') return payment.status === 'pending';
      if (activeTab === 'cancelled') return payment.status === 'cancelled';
      return true;
    })
    .filter(payment => 
      payment.userName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (payment.reference || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      formatCurrency(payment.amount).includes(searchTerm)
    );

  // Cálculos para estatísticas
  const totalPayments = payments.length;
  const pendingPayments = payments.filter(p => p.status === 'pending').length;
  const completedPayments = payments.filter(p => p.status === 'completed').length;
  const totalAmount = payments.reduce((acc, payment) => acc + payment.amount, 0);
  const totalHours = payments.reduce((acc, payment) => acc + (payment.totalHours || 0), 0);

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Gestão de Pagamentos</h2>
        <p className="text-muted-foreground">
          Gerencie todos os pagamentos da empresa
        </p>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <Button onClick={() => router.push('/dashboard/admin/payments/create')}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Novo Pagamento
        </Button>
        <div className="flex-1"></div>
        <div className="relative max-w-sm">
          <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar pagamentos..."
            className="w-full pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pagamentos</CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPayments}</div>
            <p className="text-xs text-muted-foreground">
              {pendingPayments} pendentes
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <BanknotesIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {completedPayments} pagamentos concluídos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Pagas</CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Todos os períodos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Funcionários Pagos</CardTitle>
            <UserGroupIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(payments.map(p => p.userId)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Todos os períodos
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Pagamentos</CardTitle>
          <CardDescription>Lista de todos os pagamentos processados</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="completed">Concluídos</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelados</TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-red-500">{error}</div>
          ) : filteredPayments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">Nenhum pagamento encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-4 text-left font-medium">Data</th>
                    <th className="py-3 px-4 text-left font-medium">Funcionário</th>
                    <th className="py-3 px-4 text-left font-medium">Referência</th>
                    <th className="py-3 px-4 text-left font-medium">Método</th>
                    <th className="py-3 px-4 text-right font-medium">Valor</th>
                    <th className="py-3 px-4 text-center font-medium">Status</th>
                    <th className="py-3 px-4 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="border-b hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/dashboard/admin/payments/${payment.id}`)}>
                      <td className="py-3 px-4">{formatDate(payment.date)}</td>
                      <td className="py-3 px-4">{payment.userName}</td>
                      <td className="py-3 px-4 max-w-xs truncate">{payment.reference || 'Sem referência'}</td>
                      <td className="py-3 px-4">{translatePaymentMethod(payment.paymentMethod)}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatCurrency(payment.amount)}</td>
                      <td className="py-3 px-4 text-center">{getStatusBadge(payment.status)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/admin/payments/${payment.id}`);
                            }}
                          >
                            <EyeIcon className="h-4 w-4" />
                            <span className="sr-only">Ver</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/admin/payments/${payment.id}/edit`);
                            }}
                          >
                            <PencilIcon className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDeletePayment(payment.id, e)}
                          >
                            <TrashIcon className="h-4 w-4" />
                            <span className="sr-only">Excluir</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 