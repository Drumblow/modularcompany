'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';
import { UserRole } from '@/lib/utils';

// Interface para usuários
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  company?: {
    id: string;
    name: string;
  };
  hourlyRate?: number | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  birthDate?: string | null;
}

// Interface para empresas
interface Company {
  id: string;
  name: string;
}

export default function DeveloperUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
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
    role: UserRole.EMPLOYEE,
    companyId: '',
    hourlyRate: '0',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    birthDate: '',
  });

  // Carregar usuários da API
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao carregar usuários');
      }
      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      console.error('Erro ao carregar usuários:', err);
      setError(err.message || 'Ocorreu um erro ao carregar os usuários');
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar empresas da API
  const fetchCompanies = useCallback(async () => {
    try {
      const response = await fetch('/api/companies');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao carregar empresas');
      }
      const data = await response.json();
      setCompanies(data);
    } catch (err: any) {
      console.error('Erro ao carregar empresas:', err);
      setError(err.message || 'Ocorreu um erro ao carregar as empresas');
    }
  }, []);

  // Carregar dados ao montar o componente
  useEffect(() => {
    fetchUsers();
    fetchCompanies();
  }, [fetchUsers, fetchCompanies]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
      // Chamar a API para criar o usuário
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          companyId: formData.companyId,
          hourlyRate: parseFloat(formData.hourlyRate) || 0,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          zipCode: formData.zipCode || undefined,
          birthDate: formData.birthDate || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar usuário');
      }

      const data = await response.json();
      
      // Atualizar a lista de usuários
      await fetchUsers();
      
      // Resetar formulário
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: UserRole.EMPLOYEE,
        companyId: '',
        hourlyRate: '0',
        phone: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        birthDate: '',
      });
      
      setShowForm(false);
      setSuccessMessage('Usuário criado com sucesso!');
      setShowSuccessToast(true);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao criar o usuário');
    } finally {
      setLoading(false);
    }
  };

  // Função para excluir usuário
  const handleDeleteUser = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao excluir usuário');
      }

      // Atualizar a lista de usuários
      setUsers(prev => prev.filter(user => user.id !== id));
      
      setSuccessMessage('Usuário excluído com sucesso!');
      setShowSuccessToast(true);
    } catch (err: any) {
      console.error('Erro ao excluir usuário:', err);
      setError(err.message || 'Ocorreu um erro ao excluir o usuário');
    } finally {
      setLoading(false);
    }
  };

  // Função para mapear o papel do usuário para um texto legível
  const getRoleText = (role: string) => {
    switch (role) {
      case 'DEVELOPER':
        return 'Desenvolvedor';
      case 'ADMIN':
        return 'Administrador';
      case 'MANAGER':
        return 'Gerente';
      case 'EMPLOYEE':
        return 'Funcionário';
      default:
        return role;
    }
  };

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Gerenciar Usuários</h2>
        <p className="text-muted-foreground">
          Crie e gerencie usuários para todas as empresas
        </p>
      </div>

      <div className="flex justify-between">
        <h3 className="text-xl font-semibold">Usuários Cadastrados</h3>
        {!showForm ? (
          <Button onClick={() => setShowForm(true)}>
            Novo Usuário
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
            <CardTitle>Criar Novo Usuário</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Nome Completo
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
                  E-mail
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
                  Senha
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
                  Confirmar Senha
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
                <label htmlFor="role" className="text-sm font-medium">
                  Função
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="ADMIN">Administrador</option>
                  <option value="MANAGER">Gerente</option>
                  <option value="EMPLOYEE">Funcionário</option>
                  <option value="DEVELOPER">Desenvolvedor</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="companyId" className="text-sm font-medium">Empresa</label>
                <select
                  id="companyId"
                  name="companyId"
                  value={formData.companyId}
                  onChange={handleInputChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="">Selecione uma empresa</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <label htmlFor="hourlyRate" className="text-sm font-medium">
                    Taxa Horária ($)
                  </label>
                  <Input
                    id="hourlyRate"
                    name="hourlyRate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.hourlyRate}
                    onChange={handleInputChange}
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

              <Button type="submit" disabled={loading}>
                {loading ? 'Criando...' : 'Criar Usuário'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && users.length === 0 ? (
            <div className="flex justify-center py-6">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground">Nenhum usuário encontrado.</p>
          ) : (
            <div className="space-y-4">
              {users.map(user => (
                <div
                  key={user.id}
                  className="rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{user.name}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Empresa: {user.company?.name || 'Não associado'}
                      </p>
                      {user.role === UserRole.EMPLOYEE && user.hourlyRate !== null && (
                        <p className="text-xs text-muted-foreground">
                          Taxa horária: R$ {parseFloat(String(user.hourlyRate)).toFixed(2)}
                        </p>
                      )}
                      {user.phone && (
                        <p className="text-xs text-muted-foreground">
                          Telefone: {user.phone}
                        </p>
                      )}
                      {user.address && (
                        <p className="text-xs text-muted-foreground">
                          Endereço: {user.address}{user.city ? `, ${user.city}` : ''}{user.state ? ` - ${user.state}` : ''}{user.zipCode ? `, ${user.zipCode}` : ''}
                        </p>
                      )}
                      {user.birthDate && (
                        <p className="text-xs text-muted-foreground">
                          Data de Nascimento: {new Date(user.birthDate).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="inline-block rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        {getRoleText(user.role)}
                      </span>
                      <div className="mt-2 flex space-x-2">
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
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