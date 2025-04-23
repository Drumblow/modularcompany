'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';
import { UserRole } from '@/lib/utils';
import { developerNavItems } from '@/lib/navigation';

// Interface para empresas
interface Company {
  id: string;
  name: string;
  plan: string;
  active: boolean;
  createdAt: string;
  adminName?: string;
  adminEmail?: string;
}

export default function DeveloperCompaniesPage() {
  const { data: session } = useSession();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  
  const [formData, setFormData] = useState({
    companyName: '',
    plan: 'BASIC',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
    adminPhone: '',
    adminAddress: '',
    adminCity: '',
    adminState: '',
    adminZipCode: '',
    adminBirthDate: '',
  });

  const [editFormData, setEditFormData] = useState({
    id: '',
    name: '',
    plan: 'BASIC',
  });

  // Carregar empresas da API
  const fetchCompanies = useCallback(async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, []);

  // Carregar empresas ao montar o componente
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

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
    if (formData.adminPassword !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      setLoading(false);
      return;
    }

    if (formData.adminPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      // Chamar a API para criar a empresa
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: formData.companyName,
          plan: formData.plan,
          adminName: formData.adminName,
          adminEmail: formData.adminEmail,
          adminPassword: formData.adminPassword,
          adminPhone: formData.adminPhone || undefined,
          adminAddress: formData.adminAddress || undefined,
          adminCity: formData.adminCity || undefined,
          adminState: formData.adminState || undefined,
          adminZipCode: formData.adminZipCode || undefined,
          adminBirthDate: formData.adminBirthDate || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar empresa');
      }

      // Buscar a lista atualizada de empresas
      await fetchCompanies();
      
      // Resetar formulário
      setFormData({
        companyName: '',
        plan: 'BASIC',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        confirmPassword: '',
        adminPhone: '',
        adminAddress: '',
        adminCity: '',
        adminState: '',
        adminZipCode: '',
        adminBirthDate: '',
      });
      
      setShowForm(false);
      setSuccessMessage('Empresa criada com sucesso!');
      setShowSuccessToast(true);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao criar a empresa');
    } finally {
      setLoading(false);
    }
  };

  // Função para ativar/desativar empresa
  const handleToggleActive = async (id: string, currentlyActive: boolean) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/companies/${id}`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar empresa');
      }

      // Atualizar a empresa na lista local
      setCompanies(prev => 
        prev.map(company => 
          company.id === id ? { ...company, active: !currentlyActive } : company
        )
      );

      setSuccessMessage(`Empresa ${currentlyActive ? 'desativada' : 'ativada'} com sucesso!`);
      setShowSuccessToast(true);
    } catch (err: any) {
      console.error('Erro ao atualizar empresa:', err);
      setError(err.message || 'Ocorreu um erro ao atualizar a empresa');
    } finally {
      setLoading(false);
    }
  };

  // Função para mapear o plano para um texto legível
  const getPlanText = (plan: string) => {
    switch (plan) {
      case 'BASIC':
        return 'Básico';
      case 'STANDARD':
        return 'Padrão';
      case 'PREMIUM':
        return 'Premium';
      default:
        return plan;
    }
  };

  // Função para excluir empresa
  const handleDeleteCompany = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita e excluirá todos os usuários associados.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/companies/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao excluir empresa');
      }

      // Remover a empresa da lista local
      setCompanies(prev => prev.filter(company => company.id !== id));
      
      setSuccessMessage('Empresa excluída com sucesso!');
      setShowSuccessToast(true);
    } catch (err: any) {
      console.error('Erro ao excluir empresa:', err);
      setError(err.message || 'Ocorreu um erro ao excluir a empresa');
    } finally {
      setLoading(false);
    }
  };

  // Função para abrir o formulário de edição
  const handleOpenEditForm = (company: Company) => {
    setSelectedCompany(company);
    setEditFormData({
      id: company.id,
      name: company.name,
      plan: company.plan,
    });
    setShowEditForm(true);
  };

  // Função para atualizar empresa
  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Chamar a API para atualizar a empresa
      const response = await fetch(`/api/companies/${editFormData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editFormData.name,
          plan: editFormData.plan,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao atualizar empresa');
      }

      // Buscar a lista atualizada de empresas
      await fetchCompanies();
      
      setShowEditForm(false);
      setSuccessMessage('Empresa atualizada com sucesso!');
      setShowSuccessToast(true);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao atualizar a empresa');
    } finally {
      setLoading(false);
    }
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Gerenciar Empresas</h2>
        <p className="text-muted-foreground">
          Crie e gerencie empresas e seus administradores
        </p>
      </div>

      <div className="flex justify-between">
        <h3 className="text-xl font-semibold">Empresas Cadastradas</h3>
        {!showForm && !showEditForm ? (
          <Button onClick={() => setShowForm(true)}>
            Nova Empresa
          </Button>
        ) : (
          <Button variant="outline" onClick={() => {
            setShowForm(false);
            setShowEditForm(false);
          }}>
            Cancelar
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Criar Nova Empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-medium">Informações da Empresa</h4>
                
                <div className="space-y-2">
                  <label htmlFor="companyName" className="text-sm font-medium">
                    Nome da Empresa
                  </label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="plan" className="text-sm font-medium">
                    Plano
                  </label>
                  <select
                    id="plan"
                    name="plan"
                    value={formData.plan}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="BASIC">Básico</option>
                    <option value="STANDARD">Padrão</option>
                    <option value="PREMIUM">Premium</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t space-y-4">
                <h4 className="font-medium">Usuário Administrador</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="adminName" className="text-sm font-medium">
                      Nome Completo
                    </label>
                    <Input
                      id="adminName"
                      name="adminName"
                      value={formData.adminName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="adminEmail" className="text-sm font-medium">
                      E-mail
                    </label>
                    <Input
                      id="adminEmail"
                      name="adminEmail"
                      type="email"
                      value={formData.adminEmail}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="adminPassword" className="text-sm font-medium">
                      Senha
                    </label>
                    <Input
                      id="adminPassword"
                      name="adminPassword"
                      type="password"
                      value={formData.adminPassword}
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
                    <label htmlFor="adminPhone" className="text-sm font-medium">
                      Telefone
                    </label>
                    <Input
                      id="adminPhone"
                      name="adminPhone"
                      type="tel"
                      value={formData.adminPhone}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="adminBirthDate" className="text-sm font-medium">
                      Data de Nascimento
                    </label>
                    <Input
                      id="adminBirthDate"
                      name="adminBirthDate"
                      type="date"
                      value={formData.adminBirthDate}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="adminAddress" className="text-sm font-medium">
                      Endereço
                    </label>
                    <Input
                      id="adminAddress"
                      name="adminAddress"
                      value={formData.adminAddress}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="adminCity" className="text-sm font-medium">
                      Cidade
                    </label>
                    <Input
                      id="adminCity"
                      name="adminCity"
                      value={formData.adminCity}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="adminState" className="text-sm font-medium">
                      Estado
                    </label>
                    <Input
                      id="adminState"
                      name="adminState"
                      value={formData.adminState}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="adminZipCode" className="text-sm font-medium">
                      CEP
                    </label>
                    <Input
                      id="adminZipCode"
                      name="adminZipCode"
                      value={formData.adminZipCode}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-3">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              <Button type="submit" disabled={loading} className="mt-4">
                {loading ? 'Criando...' : 'Criar Empresa e Administrador'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {showEditForm && selectedCompany && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Editar Empresa: {selectedCompany.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateCompany} className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-medium">Informações da Empresa</h4>
                
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Nome da Empresa
                  </label>
                  <Input
                    id="name"
                    name="name"
                    value={editFormData.name}
                    onChange={handleEditInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="plan" className="text-sm font-medium">
                    Plano
                  </label>
                  <select
                    id="plan"
                    name="plan"
                    value={editFormData.plan}
                    onChange={handleEditInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="BASIC">Básico</option>
                    <option value="STANDARD">Padrão</option>
                    <option value="PREMIUM">Premium</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-3">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}

              <Button type="submit" disabled={loading} className="mt-4">
                {loading ? 'Atualizando...' : 'Atualizar Empresa'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de Empresas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && companies.length === 0 ? (
            <div className="flex justify-center py-6">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : companies.length === 0 ? (
            <p className="text-center text-muted-foreground">Nenhuma empresa encontrada.</p>
          ) : (
            <div className="space-y-4">
              {companies.map(company => (
                <div
                  key={company.id}
                  className="rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{company.name}</h3>
                      <div className="flex space-x-2 mt-1">
                        <span className="inline-block rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          {getPlanText(company.plan)}
                        </span>
                        <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                          company.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {company.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Admin: {company.adminName} ({company.adminEmail})
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        Criada em: {new Date(company.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                      <div className="mt-2 flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenEditForm(company)}
                        >
                          Editar
                        </Button>
                        <Button 
                          variant={company.active ? "destructive" : "default"} 
                          size="sm"
                          onClick={() => handleToggleActive(company.id, company.active)}
                          disabled={loading}
                        >
                          {company.active ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteCompany(company.id)}
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