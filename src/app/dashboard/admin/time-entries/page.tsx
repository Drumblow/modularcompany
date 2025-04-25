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
import { devLog, devWarn, devError } from '@/lib/logger';

export default function AdminTimeEntriesPage() {
  const { entries, loading, error, fetchEntries, approveEntry, rejectEntry } = useTimeEntries();
  const { users, loading: loadingUsers } = useUsers();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('approval');

  // Buscar entradas ao montar o componente
  useEffect(() => {
    devLog('[AdminTimeEntriesPage] Iniciando fetchEntries no useEffect');
    devLog('[AdminTimeEntriesPage] Sessão atual:', session);
    fetchEntries();
  }, [fetchEntries]);

  // Log detalhado das entradas
  useEffect(() => {
    devLog(`[AdminTimeEntriesPage] Entradas carregadas: ${entries.length}`);
    if (entries.length > 0) {
      devLog('[AdminTimeEntriesPage] Primeira entrada:', entries[0]);
      devLog('[AdminTimeEntriesPage] Todas as entradas:', entries);
    }
  }, [entries]);

  // Log de mudança de tab
  useEffect(() => {
    devLog(`[AdminTimeEntriesPage] Tab ativa alterada para: ${activeTab}`);
    if (activeTab === 'my-entries') {
      devLog(`[AdminTimeEntriesPage] Na tab "Meus Registros", userId: ${session?.user?.id}`);
      if (session) {
        fetchEntries({ userId: session.user.id });
      }
    } else if (activeTab === 'approval') {
      devLog(`[AdminTimeEntriesPage] Na tab "Aprovação", buscando todos os registros`);
      // Quando volta para a aba de aprovação, buscar todos os registros novamente
      fetchEntries();
    }
  }, [activeTab, session, fetchEntries]);

  // Função para aprovar entradas
  const handleApproveEntries = async (entryIds: string[]) => {
    try {
      // Administradores podem aprovar qualquer registro
      
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
    } catch (error: any) {
      setToastMessage(`Erro ao aprovar registros: ${error.message || 'Erro desconhecido'}`);
      setToastType('error');
      setShowToast(true);
      return Promise.reject(error);
    }
  };

  // Função para rejeitar entrada
  const handleRejectEntry = async (entryId: string, reason: string) => {
    try {
      // Administradores podem rejeitar qualquer registro
      
      await rejectEntry(entryId, reason);
      
      // Atualizar dados
      await fetchEntries();
      
      setToastMessage('Registro rejeitado com sucesso');
      setToastType('success');
      setShowToast(true);
      
      return Promise.resolve();
    } catch (error: any) {
      setToastMessage(`Erro ao rejeitar registro: ${error.message || 'Erro desconhecido'}`);
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
        <h2 className="text-3xl font-bold tracking-tight">Administração de Horas</h2>
        <p className="text-muted-foreground">
          Gerencie todos os registros de horas da empresa e registre suas próprias horas
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
          <div>
            <div className="mb-4 p-2 bg-yellow-50 rounded-md">
              <p className="text-sm text-yellow-700">
                Usuario atual: {session?.user?.name} (ID: {session?.user?.id})
              </p>
              <p className="text-sm text-yellow-700">
                Função: {session?.user?.role}, Empresa: {session?.user?.companyId}
              </p>
              <p className="text-sm text-yellow-700">
                Total de entradas: {entries.filter(entry => entry.userId === session?.user?.id).length}
              </p>
            </div>
            <TimeEntryList 
              userId={session?.user?.id} 
              onSuccess={() => fetchEntries({ userId: session?.user?.id })} 
              label="Minhas Horas Registradas"
            />
          </div>
        </TabsContent>
        
        <TabsContent value="approval" className="mt-6">
          <TimeEntryApproval 
            entries={entries} 
            onApprove={handleApproveEntries}
            onReject={handleRejectEntry}
            userRole={session?.user?.role}
            userCompanyId={session?.user?.companyId}
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