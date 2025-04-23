'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ArrowLeftIcon, 
  UserIcon, 
  CalendarIcon, 
  ClockIcon, 
  BanknotesIcon, 
  CreditCardIcon 
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  hourlyRate?: number;
}

interface TimeEntry {
  id: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  observation?: string;
  approved: boolean;
  project?: string;
}

export default function ManagerCreatePaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<TimeEntry[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('bank_transfer');
  const [reference, setReference] = useState<string>(`${format(new Date(), 'MMMM/yyyy', { locale: ptBR })}`);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadTimeEntries(selectedUser.id);
    } else {
      setTimeEntries([]);
      setSelectedEntries([]);
    }
  }, [selectedUser]);

  useEffect(() => {
    if (selectedEntries.length > 0 && selectedUser?.hourlyRate) {
      const totalHours = selectedEntries.reduce((acc, entry) => acc + entry.totalHours, 0);
      setPaymentAmount(totalHours * (selectedUser.hourlyRate || 0));
    } else {
      setPaymentAmount(0);
    }
  }, [selectedEntries, selectedUser]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/users?role=EMPLOYEE');
      
      if (!response.ok) {
        throw new Error('Falha ao carregar funcionários');
      }
      
      const data = await response.json();
      setUsers(data);
      setLoading(false);
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
      setError('Não foi possível carregar a lista de funcionários');
      setLoading(false);
    }
  };

  const loadTimeEntries = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Obter registros aprovados mas ainda não pagos
      const response = await fetch(`/api/time-entries?userId=${userId}&approved=true&unpaid=true`);
      
      if (!response.ok) {
        throw new Error('Falha ao carregar registros de horas');
      }
      
      const data = await response.json();
      setTimeEntries(data);
      setLoading(false);
    } catch (error: any) {
      console.error('Erro ao carregar registros de horas:', error);
      setError('Não foi possível carregar os registros de horas');
      setLoading(false);
    }
  };

  const handleUserChange = (userId: string) => {
    const user = users.find(u => u.id === userId) || null;
    setSelectedUser(user);
  };

  const handleToggleEntry = (entry: TimeEntry) => {
    if (selectedEntries.some(e => e.id === entry.id)) {
      setSelectedEntries(selectedEntries.filter(e => e.id !== entry.id));
    } else {
      setSelectedEntries([...selectedEntries, entry]);
    }
  };

  const handleSelectAllEntries = () => {
    if (selectedEntries.length === timeEntries.length) {
      setSelectedEntries([]);
    } else {
      setSelectedEntries([...timeEntries]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedUser || selectedEntries.length === 0 || paymentAmount <= 0) {
      alert('Por favor, preencha todos os campos necessários');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const payment = {
        userId: selectedUser.id,
        amount: paymentAmount,
        date: new Date().toISOString().split('T')[0],
        paymentMethod,
        reference,
        periodStart: selectedEntries.reduce((earliest, entry) => {
          const entryDate = new Date(entry.date);
          return earliest < entryDate ? earliest : entryDate;
        }, new Date()).toISOString().split('T')[0],
        periodEnd: selectedEntries.reduce((latest, entry) => {
          const entryDate = new Date(entry.date);
          return latest > entryDate ? latest : entryDate;
        }, new Date(0)).toISOString().split('T')[0],
        timeEntryIds: selectedEntries.map(e => e.id)
      };
      
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payment),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao criar pagamento');
      }
      
      router.push('/dashboard/manager/payments');
    } catch (error: any) {
      console.error('Erro ao criar pagamento:', error);
      setError(`Erro ao criar pagamento: ${error.message}`);
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
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

  const totalHours = selectedEntries.reduce((acc, entry) => acc + entry.totalHours, 0);

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Criar Novo Pagamento</h2>
        <p className="text-muted-foreground">
          Registre um novo pagamento para um funcionário
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex items-center gap-4 mt-2">
        <Button 
          variant="outline" 
          onClick={() => router.push('/dashboard/manager/payments')}
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex-1" />
        <Button variant="outline" onClick={() => router.push('/dashboard/manager/payments')}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={loading || !selectedUser || selectedEntries.length === 0 || paymentAmount <= 0}
        >
          {loading ? 'Processando...' : 'Criar Pagamento'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Pagamento</CardTitle>
              <CardDescription>Selecione o funcionário e defina os detalhes do pagamento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user">Funcionário</Label>
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-primary/10 p-2">
                    <UserIcon className="h-4 w-4 text-primary" />
                  </div>
                  <Select
                    value={selectedUser?.id || ''}
                    onValueChange={handleUserChange}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um funcionário" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedUser && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="reference">Referência</Label>
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-primary/10 p-2">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                      </div>
                      <Input
                        id="reference"
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="Ex: Julho/2023"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Método de Pagamento</Label>
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-primary/10 p-2">
                        <CreditCardIcon className="h-4 w-4 text-primary" />
                      </div>
                      <Select
                        value={paymentMethod}
                        onValueChange={setPaymentMethod}
                        disabled={loading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o método de pagamento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                          <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                          <SelectItem value="cash">Dinheiro</SelectItem>
                          <SelectItem value="check">Cheque</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {selectedUser && (
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Pagamento</CardTitle>
                <CardDescription>Detalhes do valor a ser pago</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Funcionário</Label>
                    <p className="text-sm font-medium">{selectedUser.name}</p>
                  </div>
                  <div className="space-y-1">
                    <Label>Taxa Horária</Label>
                    <p className="text-sm font-medium">{formatCurrency(selectedUser.hourlyRate || 0)}</p>
                  </div>
                  <div className="space-y-1">
                    <Label>Total de Horas</Label>
                    <p className="text-sm font-medium">{totalHours.toFixed(2)}h</p>
                  </div>
                  <div className="space-y-1">
                    <Label>Método de Pagamento</Label>
                    <p className="text-sm font-medium">{translatePaymentMethod(paymentMethod)}</p>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <Label className="text-lg">Valor Total</Label>
                    <div className="text-2xl font-bold">{formatCurrency(paymentAmount)}</div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button 
                  onClick={handleSubmit} 
                  disabled={loading || selectedEntries.length === 0 || paymentAmount <= 0}
                >
                  {loading ? 'Processando...' : 'Criar Pagamento'}
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>

        {selectedUser && (
          <Card>
            <CardHeader>
              <CardTitle>Registros de Horas</CardTitle>
              <CardDescription>Selecione os registros para incluir no pagamento</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                </div>
              ) : timeEntries.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Não há registros de horas aprovados disponíveis para pagamento.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      {timeEntries.length} registros disponíveis
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllEntries}
                    >
                      {selectedEntries.length === timeEntries.length
                        ? 'Desmarcar Todos'
                        : 'Selecionar Todos'}
                    </Button>
                  </div>
                  
                  <div className="border rounded-md">
                    <div className="grid grid-cols-[25px_1fr_100px_100px] gap-2 p-2 font-medium border-b">
                      <div></div>
                      <div>Data/Descrição</div>
                      <div className="text-right">Horas</div>
                      <div className="text-right">Valor</div>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {timeEntries.map((entry) => {
                        const isSelected = selectedEntries.some(e => e.id === entry.id);
                        const entryAmount = entry.totalHours * (selectedUser.hourlyRate || 0);
                        
                        return (
                          <div
                            key={entry.id}
                            className={`grid grid-cols-[25px_1fr_100px_100px] gap-2 p-2 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 ${isSelected ? 'bg-muted/50' : ''}`}
                            onClick={() => handleToggleEntry(entry)}
                          >
                            <div className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="h-4 w-4"
                              />
                            </div>
                            <div>
                              <div className="font-medium">{formatDate(entry.date)}</div>
                              <div className="text-sm text-muted-foreground truncate">
                                {entry.project || entry.observation || 'Sem descrição'}
                              </div>
                            </div>
                            <div className="text-right self-center">
                              {entry.totalHours.toFixed(2)}h
                            </div>
                            <div className="text-right self-center font-medium">
                              {formatCurrency(entryAmount)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 