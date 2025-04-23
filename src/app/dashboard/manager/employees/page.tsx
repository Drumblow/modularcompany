'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';
import { UserRole } from '@/lib/utils';

// Interface para usuários/funcionários
interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId?: string | null;
  hourlyRate?: number;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  birthDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  managerId?: string | null;
}

export default function ManagerEmployeesPage() {
  const { data: session } = useSession();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    hourlyRate: 0,
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    birthDate: '',
  });

  // Função para buscar funcionários da API
  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Buscar apenas funcionários (role=EMPLOYEE) da empresa
      const response = await fetch('/api/users?role=EMPLOYEE');
      
      if (!response.ok) {
        if (response.status === 403) {
          console.log('Acesso negado à API. Usando lista local.');
          // Em caso de erro de permissão, exibir uma mensagem amigável e retornar uma lista vazia
          setEmployees([]);
          return;
        }
        
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao buscar funcionários');
      }
      
      const data = await response.json();
      
      // Filtrar apenas funcionários, mesmo que isso já deveria ter sido feito pela API
      const filteredEmployees = data.filter((user: Employee) => 
        user.role === UserRole.EMPLOYEE
      );
      
      setEmployees(filteredEmployees);
    } catch (err: any) {
      console.error('Erro ao buscar funcionários:', err);
      setError('Não foi possível carregar a lista de funcionários. Por favor, tente novamente mais tarde.');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // Buscar funcionários ao montar o componente
  useEffect(() => {
    if (session) {
      fetchEmployees();
    }
  }, [session]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'hourlyRate' ? parseFloat(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validação básica
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      // Chamar a API para criar o funcionário
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: UserRole.EMPLOYEE, // Gerente só pode criar funcionários
          companyId: session?.user?.companyId,
          hourlyRate: Number(formData.hourlyRate) || 0,
          managerId: session?.user?.id, // Associar o funcionário a este gerente
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          birthDate: formData.birthDate || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar funcionário');
      }

      const data = await response.json();
      
      // Adicionar o novo funcionário à lista
      setEmployees((prev: Employee[]) => [data.user, ...prev]);
      
      // Resetar formulário
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        hourlyRate: 0,
        phone: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        birthDate: '',
      });
      
      setShowForm(false);
      setSuccessMessage('Funcionário criado com sucesso!');
      setShowSuccessToast(true);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao criar o funcionário');
    } finally {
      setLoading(false);
    }
  };

  // Função para excluir um funcionário
  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('Tem certeza que deseja excluir este funcionário?')) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`/api/users/${employeeId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao excluir funcionário');
      }
      
      // Remover o funcionário da lista
      setEmployees(prev => prev.filter(employee => employee.id !== employeeId));
      setSuccessMessage('Funcionário excluído com sucesso!');
      setShowSuccessToast(true);
    } catch (err: any) {
      console.error('Erro ao excluir funcionário:', err);
      setError(err.message || 'Ocorreu um erro ao excluir o funcionário');
    } finally {
      setLoading(false);
    }
  };

  // Formata a data para exibição
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Gerenciar Funcionários</h2>
        <p className="text-muted-foreground">
          Crie e gerencie os funcionários da sua equipe
        </p>
      </div>

      <div className="flex justify-between">
        <h3 className="text-xl font-semibold">Funcionários da Equipe</h3>
        {!showForm ? (
          <Button onClick={() => setShowForm(true)}>
            Novo Funcionário
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setShowForm(false)}>
            Cancelar
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Criar Novo Funcionário</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Nome Completo *
                  </label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    E-mail *
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    Senha *
                  </label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirmar Senha *
                  </label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="hourlyRate" className="text-sm font-medium">
                    Taxa Horária (R$) *
                  </label>
                  <Input
                    id="hourlyRate"
                    name="hourlyRate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.hourlyRate}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium">
                    Telefone
                  </label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="birthDate" className="text-sm font-medium">
                    Data de Nascimento
                  </label>
                  <Input
                    id="birthDate"
                    name="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="address" className="text-sm font-medium">
                    Endereço
                  </label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="city" className="text-sm font-medium">
                    Cidade
                  </label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="state" className="text-sm font-medium">
                    Estado
                  </label>
                  <Input
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="zipCode" className="text-sm font-medium">
                    CEP
                  </label>
                  <Input
                    id="zipCode"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-3">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full md:w-auto">
                {loading ? 'Criando...' : 'Criar Funcionário'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de Funcionários</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && employees.length === 0 ? (
            <div className="flex justify-center py-6">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : employees.length === 0 ? (
            <p className="text-center text-muted-foreground">Nenhum funcionário encontrado.</p>
          ) : (
            <div className="space-y-4">
              {employees.map(employee => (
                <div
                  key={employee.id}
                  className="rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="font-medium">{employee.name}</h3>
                      <p className="text-sm text-muted-foreground">{employee.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Taxa horária: R$ {(employee.hourlyRate || 0).toFixed(2)}
                      </p>
                      {employee.phone && (
                        <p className="text-xs text-muted-foreground">Telefone: {employee.phone}</p>
                      )}
                      {employee.address && (
                        <p className="text-xs text-muted-foreground">
                          Endereço: {employee.address}, {employee.city} - {employee.state}, {employee.zipCode}
                        </p>
                      )}
                      {employee.birthDate && (
                        <p className="text-xs text-muted-foreground">
                          Data de Nascimento: {formatDate(employee.birthDate)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex space-x-2 justify-end">
                        <Button variant="outline" size="sm">
                          Editar
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDeleteEmployee(employee.id)}
                          disabled={loading}
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Toast 
        message={successMessage} 
        type="success" 
        open={showSuccessToast} 
        onClose={() => setShowSuccessToast(false)} 
      />
    </div>
  );
} 