'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import { DatePicker } from '@/components/ui/DatePicker';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';

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
  hours: number;
  description: string;
  status: string;
}

export default function CreatePaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<TimeEntry[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('bank_transfer');
  const [reference, setReference] = useState<string>(`${format(new Date(), 'MMMM/yyyy', { locale: ptBR })}`);

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
      const totalHours = selectedEntries.reduce((acc, entry) => acc + entry.hours, 0);
      setPaymentAmount(totalHours * (selectedUser.hourlyRate || 0));
    } else {
      setPaymentAmount(0);
    }
  }, [selectedEntries, selectedUser]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      // Buscar todos os tipos de usuários incluindo administradores e gerentes
      const response = await fetch('/api/users');
      
      if (!response.ok) {
        throw new Error('Falha ao buscar usuários');
      }
      
      const data = await response.json();
      setUsers(data);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      setLoading(false);
    }
  };

  const loadTimeEntries = async (userId: string) => {
    try {
      setLoading(true);
      // Fazer requisição real à API
      const response = await fetch(`/api/time-entries?userId=${userId}&approved=true&status=approved&unpaid=true`);
      
      if (!response.ok) {
        throw new Error('Falha ao buscar registros de horas');
      }
      
      const data = await response.json();
      
      // Adaptar o formato da resposta para o formato esperado pelo componente
      const formattedEntries: TimeEntry[] = data.map((entry: any) => ({
        id: entry.id,
        userId: entry.userId,
        date: entry.date,
        hours: entry.totalHours,
        description: entry.observation || `Registro de horas - ${format(new Date(entry.date), 'dd/MM/yyyy', { locale: ptBR })}`,
        status: entry.approved ? 'approved' : 'pending'
      }));
      
      setTimeEntries(formattedEntries);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar registros de horas:', error);
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
      
      // Encontrar as datas de início e fim do período
      const dates = selectedEntries.map(entry => new Date(entry.date));
      const periodStart = dates.length > 0 
        ? format(new Date(Math.min(...dates.map(d => d.getTime()))), 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd');
      const periodEnd = dates.length > 0
        ? format(new Date(Math.max(...dates.map(d => d.getTime()))), 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd');
      
      const paymentData = {
        userId: selectedUser.id,
        amount: paymentAmount,
        paymentMethod: paymentMethod || 'bank_transfer',
        reference: reference || '',
        description: reference || `Pagamento para ${selectedUser.name}`,
        timeEntryIds: selectedEntries.map(e => e.id),
        date: format(new Date(), 'yyyy-MM-dd'),
        status: 'pending',
        periodStart,
        periodEnd
      };
      
      console.log('Enviando dados:', paymentData);
      
      // Enviar dados para a API
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Resposta da API:', errorData);
        throw new Error(errorData.message || 'Erro ao criar pagamento');
      }
      
      const result = await response.json();
      console.log('Pagamento criado:', result);
      
      setLoading(false);
      alert('Pagamento criado com sucesso!');
      router.push('/dashboard/admin/payments');
    } catch (error: any) {
      console.error('Erro ao criar pagamento:', error);
      setLoading(false);
      alert(`Erro ao criar pagamento: ${error.message || ''}`);
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

  const totalHours = selectedEntries.reduce((acc, entry) => acc + entry.hours, 0);

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Criar Novo Pagamento</h2>
        <p className="text-muted-foreground">
          Registre um novo pagamento para um funcionário
        </p>
      </div>

      <div className="flex items-center gap-4 mt-2">
        <Button 
          variant="outline" 
          onClick={() => router.push('/dashboard/admin/payments')}
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex-1" />
        <Button variant="outline" onClick={() => router.push('/dashboard/admin/payments')}>
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
              <CardDescription>Selecione o usuário e defina os detalhes do pagamento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user">Usuário</Label>
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
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedUser && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor do Pagamento</Label>
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-primary/10 p-2">
                        <BanknotesIcon className="h-4 w-4 text-primary" />
                      </div>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                        disabled={loading}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Taxa horária: {formatCurrency(selectedUser.hourlyRate || 0)}/hora
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="method">Método de Pagamento</Label>
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
                          <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                          <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                          <SelectItem value="cash">Dinheiro</SelectItem>
                          <SelectItem value="check">Cheque</SelectItem>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

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
                        disabled={loading}
                        placeholder="Ex: Janeiro/2023"
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {selectedUser && selectedEntries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Pagamento</CardTitle>
                <CardDescription>Detalhes calculados com base nas entradas selecionadas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Funcionário:</span>
                  <span className="font-medium">{selectedUser.name}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Total de Horas:</span>
                  <span className="font-medium">{totalHours.toFixed(2)}h</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Taxa Horária:</span>
                  <span className="font-medium">{formatCurrency(selectedUser.hourlyRate || 0)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Método:</span>
                  <span className="font-medium">{translatePaymentMethod(paymentMethod)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Referência:</span>
                  <span className="font-medium">{reference}</span>
                </div>
                <div className="flex justify-between py-1 border-t mt-2 pt-2">
                  <span className="font-medium">Valor Total:</span>
                  <span className="font-bold text-xl">{formatCurrency(paymentAmount)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Registros de Horas</CardTitle>
                  <CardDescription>Selecione os registros a incluir no pagamento</CardDescription>
                </div>
                
                {timeEntries.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllEntries}
                  >
                    {selectedEntries.length === timeEntries.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden flex flex-col">
              {loading ? (
                <div className="flex justify-center items-center flex-1">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                </div>
              ) : !selectedUser ? (
                <div className="flex flex-col items-center justify-center py-8 text-center flex-1">
                  <div className="rounded-full bg-muted p-3 mb-3">
                    <UserIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-1">Nenhum funcionário selecionado</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Selecione um funcionário para ver seus registros de horas
                  </p>
                </div>
              ) : timeEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center flex-1">
                  <div className="rounded-full bg-muted p-3 mb-3">
                    <ClockIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-1">Nenhum registro de horas</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Não há registros de horas aprovados para este funcionário
                  </p>
                </div>
              ) : (
                <div className="overflow-y-auto pr-2 flex-1 -mr-2">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b">
                        <th className="py-3 px-2 text-center font-medium w-10">#</th>
                        <th className="py-3 px-4 text-left font-medium">Data</th>
                        <th className="py-3 px-4 text-left font-medium">Descrição</th>
                        <th className="py-3 px-4 text-right font-medium">Horas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeEntries.map((entry) => (
                        <tr 
                          key={entry.id} 
                          className={`border-b hover:bg-muted/50 cursor-pointer ${
                            selectedEntries.some(e => e.id === entry.id) ? 'bg-primary/10' : ''
                          }`}
                          onClick={() => handleToggleEntry(entry)}
                        >
                          <td className="py-3 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={selectedEntries.some(e => e.id === entry.id)}
                              onChange={() => {}}
                              className="h-4 w-4"
                            />
                          </td>
                          <td className="py-3 px-4">{formatDate(entry.date)}</td>
                          <td className="py-3 px-4">{entry.description}</td>
                          <td className="py-3 px-4 text-right font-medium">{entry.hours.toFixed(2)}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="border-t mt-auto pt-4 flex justify-between items-center text-sm text-muted-foreground">
                <span>{timeEntries.length} registros disponíveis</span>
                <span>{selectedEntries.length} selecionados ({totalHours.toFixed(2)}h)</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 