'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';
import { UserRole, type UserRoleType } from '@/lib/utils';
import { devLog, devWarn, devError } from '@/lib/logger';

// Interface para usuários
interface User {
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
  company?: {
    id: string;
    name: string;
  };
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: UserRole.EMPLOYEE as UserRoleType,
    hourlyRate: 0,
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    birthDate: '',
  });

  // Função para buscar usuários da API
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/users');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao buscar usuários');
      }
      
      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      devError('Erro ao buscar usuários:', err);
      setError(err.message || 'Ocorreu um erro ao buscar os usuários');
    } finally {
      setLoading(false);
    }
  };

  // Buscar usuários ao montar o componente
  useEffect(() => {
    if (session) {
      fetchUsers();
    }
  }, [session]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'hourlyRate' ? parseFloat(value) : value
    }));
  };

  // Função para abrir o formulário de edição
  const handleEditUser = (user: User) => {
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      confirmPassword: '',
      role: user.role as UserRoleType,
      hourlyRate: user.hourlyRate || 0,
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      state: user.state || '',
      zipCode: user.zipCode || '',
      birthDate: user.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : '',
    });
    setIsEditMode(true);
    setEditingUserId(user.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Verifica se é edição ou criação
    if (isEditMode && editingUserId) {
      await handleUpdateUser();
    } else {
      await handleCreateUser();
    }
  };

  // Função para criar um novo usuário
  const handleCreateUser = async () => {
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
          companyId: session?.user?.companyId,
          hourlyRate: Number(formData.hourlyRate) || 0,
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
      devLog('Usuário criado com sucesso:', data);
      
      // Adicionar o novo usuário à lista
      // A API pode retornar o usuário diretamente ou dentro de um objeto { user: {...} }
      const userData = data.user || data;
      
      if (userData && userData.id) {
        // Adiciona no início da lista e força uma re-renderização
        setUsers(prevUsers => [userData, ...prevUsers]);
        
        // Resetar formulário
        resetForm();
        setSuccessMessage('Usuário criado com sucesso!');
        setShowSuccessToast(true);
        
        // Força uma atualização dos usuários do servidor após um breve delay
        setTimeout(() => {
          fetchUsers();
        }, 500);
      } else {
        devError('Dados de usuário inválidos recebidos da API:', data);
        setError('Resposta inválida do servidor ao criar usuário');
      }
    } catch (err: any) {
      devError('Erro ao criar usuário:', err);
      setError(err.message || 'Ocorreu um erro ao criar o usuário');
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar um usuário existente
  const handleUpdateUser = async () => {
    try {
      // Validar senhas apenas se alguma senha foi fornecida
      if (formData.password) {
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
      }

      // Preparar dados para atualização (omitir senha se vazia)
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        hourlyRate: Number(formData.hourlyRate) || 0,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zipCode: formData.zipCode || undefined,
        birthDate: formData.birthDate || undefined,
      };

      // Incluir senha apenas se foi fornecida
      if (formData.password) {
        updateData.password = formData.password;
      }

      // Chamar a API para atualizar o usuário
      const response = await fetch(`/api/users/${editingUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar usuário');
      }

      const data = await response.json();
      devLog('Usuário atualizado com sucesso:', data);
      
      // Atualizar o usuário na lista
      // A API pode retornar o usuário diretamente ou dentro de um objeto { user: {...} }
      const userData = data.user || data;
      
      if (userData && userData.id) {
        setUsers(prev => prev.map(user => {
          if (user.id === editingUserId) {
            return userData;
          }
          return user;
        }));
        
        // Resetar formulário
        resetForm();
        setSuccessMessage('Usuário atualizado com sucesso!');
        setShowSuccessToast(true);
        
        // Força uma atualização dos usuários do servidor após um breve delay
        setTimeout(() => {
          fetchUsers();
        }, 500);
      } else {
        devError('Dados de usuário inválidos recebidos da API:', data);
        setError('Resposta inválida do servidor ao atualizar usuário');
      }
    } catch (err: any) {
      devError('Erro ao atualizar usuário:', err);
      setError(err.message || 'Ocorreu um erro ao atualizar o usuário');
    } finally {
      setLoading(false);
    }
  };

  // Função para resetar o formulário
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: UserRole.EMPLOYEE as UserRoleType,
      hourlyRate: 0,
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      birthDate: '',
    });
    setShowForm(false);
    setIsEditMode(false);
    setEditingUserId(null);
  };

  // Função para excluir um usuário
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao excluir usuário');
      }
      
      // Remover o usuário da lista
      setUsers(prev => prev.filter(user => user.id !== userId));
      setSuccessMessage('Usuário excluído com sucesso!');
      setShowSuccessToast(true);
    } catch (err: any) {
      devError('Erro ao excluir usuário:', err);
      setError(err.message || 'Ocorreu um erro ao excluir o usuário');
    } finally {
      setLoading(false);
    }
  };

  // Função para mapear o papel do usuário para um texto legível
  const getRoleText = (role: string) => {
    switch (role) {
      case UserRole.DEVELOPER:
        return 'Desenvolvedor';
      case UserRole.ADMIN:
        return 'Administrador';
      case UserRole.MANAGER:
        return 'Gerente';
      case UserRole.EMPLOYEE:
        return 'Funcionário';
      default:
        return role;
    }
  };

  // Formata a data para exibição
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  // Determinar as opções de função disponíveis com base no usuário atual e no modo de edição
  const getRoleOptions = () => {
    // O usuário atual é o que está logado
    const currentUser = session?.user;
    
    // Se um admin está editando seu próprio perfil, permitir manter o papel admin
    const isEditingSelf = isEditMode && editingUserId === currentUser?.id;
    
    // Se for desenvolvedor, mostrar todas as opções
    if (currentUser?.role === UserRole.DEVELOPER) {
      return (
        <>
          <option value={UserRole.EMPLOYEE}>Funcionário</option>
          <option value={UserRole.MANAGER}>Gerente</option>
          <option value={UserRole.ADMIN}>Administrador</option>
          <option value={UserRole.DEVELOPER}>Desenvolvedor</option>
        </>
      );
    }
    
    // Se for admin editando a si mesmo, permitir manter admin
    if (currentUser?.role === UserRole.ADMIN && isEditingSelf) {
      return (
        <>
          <option value={UserRole.ADMIN}>Administrador</option>
        </>
      );
    }
    
    // Admin criando ou editando outros usuários
    if (currentUser?.role === UserRole.ADMIN) {
      return (
        <>
          <option value={UserRole.EMPLOYEE}>Funcionário</option>
          <option value={UserRole.MANAGER}>Gerente</option>
        </>
      );
    }
    
    // Para outros casos
    return (
      <>
        <option value={UserRole.EMPLOYEE}>Funcionário</option>
      </>
    );
  };

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Gerenciar Usuários</h2>
        <p className="text-muted-foreground">
          Crie e gerencie os usuários da sua empresa
        </p>
      </div>

      <div className="flex justify-between">
        <h3 className="text-xl font-semibold">Usuários da Empresa</h3>
        {!showForm ? (
          <Button onClick={() => setShowForm(true)}>
            Novo Usuário
          </Button>
        ) : (
          <Button variant="outline" onClick={resetForm}>
            Cancelar
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{isEditMode ? 'Editar Usuário' : 'Criar Novo Usuário'}</CardTitle>
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
                    {isEditMode ? 'Nova Senha (deixe em branco para manter atual)' : 'Senha *'}
                  </label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!isEditMode}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium">
                    {isEditMode ? 'Confirmar Nova Senha' : 'Confirmar Senha *'}
                  </label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required={!isEditMode}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="role" className="text-sm font-medium">
                    Função *
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {getRoleOptions()}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="hourlyRate" className="text-sm font-medium">
                    Taxa Horária ($) *
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
                {loading ? (isEditMode ? 'Atualizando...' : 'Criando...') : (isEditMode ? 'Atualizar Usuário' : 'Criar Usuário')}
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
              {users.filter(user => user && user.id).map(user => (
                <div
                  key={user.id}
                  className="rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="font-medium">{user.name}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      {user.hourlyRate !== null && user.hourlyRate !== undefined && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Taxa horária: R$ {(user.hourlyRate || 0).toFixed(2)}
                        </p>
                      )}
                      {user.phone && (
                        <p className="text-xs text-muted-foreground">Telefone: {user.phone}</p>
                      )}
                      {user.address && (
                        <p className="text-xs text-muted-foreground">
                          Endereço: {user.address}, {user.city} - {user.state}, {user.zipCode}
                        </p>
                      )}
                      {user.birthDate && (
                        <p className="text-xs text-muted-foreground">
                          Data de Nascimento: {formatDate(user.birthDate)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="inline-block rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        {getRoleText(user.role)}
                      </span>
                      <div className="mt-2 flex space-x-2 justify-end">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          Editar
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => handleDeleteUser(user.id)}
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