'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { format, subMonths, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  EyeIcon, 
  ArrowPathIcon,
  DocumentArrowDownIcon,
  UserIcon,
  BanknotesIcon,
  ClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell,
  TableFooter,
  TableCaption
} from '@/components/ui/Table';
import { Search } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { devLog, devWarn, devError } from '@/lib/logger';

interface Payment {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  status: string;
  paymentMethod: string;
  date: string;
  createdAt: string;
  description?: string;
  reference?: string;
  totalHours: number;
  periodStart: string;
  periodEnd: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  hourlyRate?: number;
}

export default function ManagerPaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 2),
    to: new Date(),
  });
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');

  useEffect(() => {
    fetchUsers();
    fetchPayments();
  }, [refreshTrigger, dateRange, filterStatus, selectedUser]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users?role=EMPLOYEE');
      
      if (!response.ok) {
        throw new Error('Falha ao buscar funcionários');
      }
      
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      devError('Erro ao buscar funcionários:', err);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      
      // Construir a URL com os filtros
      let url = '/api/payments';
      const params = new URLSearchParams();
      
      if (dateRange?.from) {
        params.append('startDate', dateRange.from.toISOString().split('T')[0]);
      }
      
      if (dateRange?.to) {
        // Adicionar um dia para incluir o dia selecionado completamente
        const endDate = addDays(dateRange.to, 1);
        params.append('endDate', endDate.toISOString().split('T')[0]);
      }
      
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      
      if (selectedUser !== 'all') {
        params.append('userId', selectedUser);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Falha ao buscar pagamentos');
      }
      
      const data = await response.json();
      setPayments(data);
      setError(null);
    } catch (err: any) {
      devError('Erro ao buscar pagamentos:', err);
      setError(err.message || 'Não foi possível carregar os pagamentos. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCreatePayment = () => {
    router.push('/dashboard/manager/payments/create');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(value);
  };

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

  const filteredPayments = payments.filter(payment => 
    payment.userName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (payment.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (payment.reference || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    formatCurrency(payment.amount).includes(searchQuery) ||
    payment.userEmail?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Cálculos para estatísticas
  const totalPayments = filteredPayments.length;
  const pendingPayments = filteredPayments.filter(p => p.status === 'pending').length;
  const completedPayments = filteredPayments.filter(p => p.status === 'completed').length;
  const totalAmount = filteredPayments.reduce((acc, payment) => acc + payment.amount, 0);
  const totalHours = filteredPayments.reduce((acc, payment) => acc + (payment.totalHours || 0), 0);

  const exportToCSV = () => {
    if (filteredPayments.length === 0) return;
    
    // Criar cabeçalho
    const headers = [
      'ID', 'Funcionário', 'Email', 'Valor', 'Status', 
      'Método de Pagamento', 'Data', 'Descrição', 'Referência',
      'Horas Totais', 'Período Início', 'Período Fim'
    ];
    
    // Criar linhas
    const rows = filteredPayments.map(payment => [
      payment.id,
      payment.userName,
      payment.userEmail,
      payment.amount.toString(),
      payment.status,
      translatePaymentMethod(payment.paymentMethod),
      formatDate(payment.date),
      payment.description || '',
      payment.reference || '',
      payment.totalHours.toString(),
      formatDate(payment.periodStart),
      formatDate(payment.periodEnd)
    ]);
    
    // Combinar cabeçalho e linhas
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Criar link para download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pagamentos_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Histórico de Pagamentos</h1>
            <p className="text-muted-foreground">Gerencie e visualize todos os pagamentos dos funcionários.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <ArrowPathIcon className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button onClick={handleCreatePayment}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Criar Novo Pagamento
            </Button>
            <Button onClick={exportToCSV} disabled={filteredPayments.length === 0}>
              <DocumentArrowDownIcon className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Pagamentos</CardTitle>
              <UserIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPayments}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <BanknotesIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Horas Registradas</CardTitle>
              <ClockIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="text-2xl font-bold">{completedPayments}</div>
                <Badge variant="success">Concluídos</Badge>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <div className="text-2xl font-bold">{pendingPayments}</div>
                <Badge variant="warning">Pendentes</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros e Pesquisa</CardTitle>
          <CardDescription>Refine os resultados usando os filtros abaixo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Funcionário</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por funcionário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os funcionários</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Período</label>
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                placeholder="Selecione um período"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Pesquisa</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar por nome, referência..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Pagamentos</CardTitle>
          <CardDescription>{filteredPayments.length} pagamentos encontrados</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-36 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : error ? (
            <div className="flex h-36 items-center justify-center">
              <p className="text-center text-destructive">{error}</p>
            </div>
          ) : (
            <Table>
              <TableCaption>Lista de pagamentos {dateRange?.from && dateRange?.to ? `de ${formatDate(dateRange.from.toISOString())} até ${formatDate(dateRange.to.toISOString())}` : ''}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell className="h-24 text-center">
                      Nenhum pagamento encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="font-medium">{payment.userName}</div>
                        <div className="text-xs text-muted-foreground">{payment.userEmail}</div>
                      </TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>{translatePaymentMethod(payment.paymentMethod)}</TableCell>
                      <TableCell>{formatDate(payment.date)}</TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <span>{formatDate(payment.periodStart)}</span>
                          <span className="mx-1">até</span>
                          <span>{formatDate(payment.periodEnd)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{payment.totalHours?.toFixed(1)}h</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/manager/payments/${payment.id}`)}>
                          <EyeIcon className="mr-2 h-4 w-4" />
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-medium">Total</TableCell>
                  <TableCell className="font-medium text-right">{formatCurrency(totalAmount)}</TableCell>
                  <TableCell className="font-medium text-right">{totalHours.toFixed(1)}h</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4 mt-2">
          <div className="text-xs text-muted-foreground">
            Exibindo {filteredPayments.length} de {payments.length} pagamentos
          </div>
          <Button variant="outline" size="sm" onClick={() => setDateRange(undefined)}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            Limpar filtro de data
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 