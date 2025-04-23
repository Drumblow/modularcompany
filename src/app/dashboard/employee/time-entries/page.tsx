'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { PageHeader } from '@/components/layout/PageHeader';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { useUsers } from '@/hooks/useUsers';
import { TimeEntryForm } from '@/components/modules/TimeTracking/TimeEntryForm';
import { TimeEntryList } from '@/components/modules/TimeTracking/TimeEntryList';
import { Toast } from '@/components/ui/Toast';
import { TimeEntryReport } from '@/components/modules/TimeTracking/TimeEntryReport';

export default function EmployeeTimeEntriesPage() {
  const { entries, loading, error, fetchEntries, createEntry, updateEntry, deleteEntry } = useTimeEntries();
  const { users, loading: loadingUsers } = useUsers();
  const [activeTab, setActiveTab] = useState('register');
  const [showToast, setShowToast] = useState(false);
  
  // Buscar entradas ao montar o componente
  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleFormSuccess = () => {
    // Recarregar os registros após salvar
    fetchEntries();
    // Mudar para a aba de lista após o registro
    setActiveTab('list');
    // Exibir toast de sucesso
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
        <h2 className="text-3xl font-bold tracking-tight">Registro de Horas</h2>
        <p className="text-muted-foreground">
          Registre e gerencie suas horas de trabalho
        </p>
      </div>

      <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="register">Registrar Horas</TabsTrigger>
          <TabsTrigger value="list">Meus Registros ({entries.length})</TabsTrigger>
          <TabsTrigger value="report">Relatório</TabsTrigger>
        </TabsList>
        
        <TabsContent value="register" className="mt-6">
          <TimeEntryForm onSuccess={handleFormSuccess} />
        </TabsContent>
        
        <TabsContent value="list" className="mt-6">
          <TimeEntryList />
        </TabsContent>
        
        <TabsContent value="report" className="mt-6">
          <TimeEntryReport 
            entries={entries}
            users={users}
          />
        </TabsContent>
      </Tabs>
      
      <Toast
        message="Registro salvo com sucesso!"
        type="success"
        open={showToast}
        onClose={() => setShowToast(false)}
        duration={3000}
      />
    </div>
  );
} 