'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { PageHeader } from '@/components/layout/PageHeader';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useUsers } from '@/hooks/useUsers';
import { TimeEntryApproval } from '@/components/modules/TimeTracking/TimeEntryApproval';
import { TimeEntryReport } from '@/components/modules/TimeTracking/TimeEntryReport';
import { TimeEntryForm } from '@/components/modules/TimeTracking/TimeEntryForm';
import { TimeEntryList } from '@/components/modules/TimeTracking/TimeEntryList';
import { Toast } from '@/components/ui/Toast';
import { useSession } from 'next-auth/react';
import { UserRole } from '@/lib/utils';

export default function ManagerTimeEntriesPage() {
  const { entries, loading, error, fetchEntries, approveEntry, rejectEntry } = useTimeEntries();
  const { users, loading: loadingUsers } = useUsers();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const { data: session } = useSession();
  const [filteredEntries, setFilteredEntries] = useState(entries);
  const [activeTab, setActiveTab] = useState('approval');

  // Buscar entradas ao montar o componente
  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Verificar permissões e filtrar entradas quando a lista mudar
  useEffect(() => {
    // Para managers, só mostrar entradas que eles possam aprovar
    if (session?.user?.role === UserRole.MANAGER) {
      // Filtrar entradas baseado na empresa do manager
      const managerCompanyId = session.user.companyId;
      
      // Se o manager não tiver empresa definida, mostrar apenas uma mensagem
      if (!managerCompanyId) {
        setFilteredEntries([]);
        setToastMessage('Seu usuário não está associado a uma empresa. Entre em contato com o administrador.');
        setToastType('error');
        setShowToast(true);
        return;
      }
      
      // Filtrar apenas entradas da mesma empresa
      const allowedEntries = entries.filter(entry => {
        return entry.companyId === managerCompanyId;
      });
      
      setFilteredEntries(allowedEntries);
    } else {
      // Para admin e developer, mostrar todas as entradas
      setFilteredEntries(entries);
    }
  }, [entries, session]);

  // Função para aprovar entradas
  const handleApproveEntries = async (entryIds: string[]) => {
    try {
      // Verificar se todas as entradas são da empresa do manager
      if (session?.user?.role === UserRole.MANAGER) {
        const managerCompanyId = session.user.companyId;
        
        // Verificar cada entrada antes de tentar aprovar
        for (const id of entryIds) {
          const entry = entries.find(e => e.id === id);
          if (!entry || entry.companyId !== managerCompanyId) {
            setToastMessage('Você não tem permissão para aprovar registros de outras empresas');
            setToastType('error');
            setShowToast(true);
            return Promise.reject(new Error('Permissão negada'));
          }
        }
      }
      
      // Aprovar cada entrada
      for (const id of entryIds) {
        await approveEntry(id);
      }
      
      // Atualizar dados
      await fetchEntries();
      
      setToastMessage(`${entryIds.length} registro(s) aprovado(s) com sucesso`);
      setToastType('success');
      setShowToast(true);
      
      return Promise.resolve();
    } catch (error) {
      setToastMessage('Erro ao aprovar registros');
      setToastType('error');
      setShowToast(true);
      return Promise.reject(error);
    }
  };

  // Função para rejeitar entrada
  const handleRejectEntry = async (entryId: string, reason: string) => {
    try {
      // Verificar se a entrada é da empresa do manager
      if (session?.user?.role === UserRole.MANAGER) {
        const managerCompanyId = session.user.companyId;
        const entry = entries.find(e => e.id === entryId);
        
        if (!entry || entry.companyId !== managerCompanyId) {
          setToastMessage('Você não tem permissão para rejeitar registros de outras empresas');
          setToastType('error');
          setShowToast(true);
          return Promise.reject(new Error('Permissão negada'));
        }
      }
      
      await rejectEntry(entryId, reason);
      
      // Atualizar dados
      await fetchEntries();
      
      setToastMessage('Registro rejeitado com sucesso');
      setToastType('success');
      setShowToast(true);
      
      return Promise.resolve();
    } catch (error) {
      setToastMessage('Erro ao rejeitar registro');
      setToastType('error');
      setShowToast(true);
      return Promise.reject(error);
    }
  };

  const handleFormSuccess = () => {
    // Recarregar os registros após salvar
    fetchEntries();
    setToastMessage('Registro salvo com sucesso!');
    setToastType('success');
    setShowToast(true);
  };

  if (loading || loadingUsers) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Gestão de Horas</h2>
        <p className="text-muted-foreground">
          Aprove registros de horas, visualize relatórios e registre suas próprias horas
        </p>
      </div>

      <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="register">Registrar</TabsTrigger>
          <TabsTrigger value="my-entries">Meus Registros</TabsTrigger>
          <TabsTrigger value="approval">Aprovação</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
        </TabsList>
        
        <TabsContent value="register" className="mt-6">
          <TimeEntryForm onSuccess={handleFormSuccess} />
        </TabsContent>
        
        <TabsContent value="my-entries" className="mt-6">
          <TimeEntryList userId={session?.user?.id} />
        </TabsContent>
        
        <TabsContent value="approval" className="mt-6">
          {session?.user?.role === UserRole.MANAGER && !session.user.companyId ? (
            <div className="bg-red-100 border border-red-300 p-4 rounded-md text-red-700 mb-4">
              <h3 className="font-bold mb-2">Atenção: Usuário sem empresa</h3>
              <p>Seu usuário manager não está associado a nenhuma empresa. Por isso, não pode aprovar registros.</p>
              <p>Entre em contato com um administrador para associar seu usuário a uma empresa.</p>
            </div>
          ) : null}
          
          <TimeEntryApproval 
            entries={filteredEntries} 
            onApprove={handleApproveEntries}
            onReject={handleRejectEntry}
          />
        </TabsContent>
        
        <TabsContent value="reports" className="mt-6">
          <TimeEntryReport 
            entries={entries}
            users={users}
          />
        </TabsContent>
      </Tabs>

      <Toast
        message={toastMessage}
        type={toastType}
        open={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
} 