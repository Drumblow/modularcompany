'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TimeEntry, useTimeEntries } from '@/hooks/useTimeEntries';
import { TimeEntryForm } from './TimeEntryForm';
import { LocalDate, LocalTime } from '@/components/ui/LocalDate';
import { useSession } from 'next-auth/react';
import { Alert } from '@/components/ui/Alert';
import { toast } from '@/components/ui/Toast';
import { devLog, devWarn, devError } from '@/lib/logger';

interface TimeEntryListProps {
  userId?: string;
  onSuccess?: () => void;
  startDate?: string;
  endDate?: string;
  isApprovalView?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  label?: string;
  limit?: number;
}

export const TimeEntryList: React.FC<TimeEntryListProps> = ({
  userId,
  onSuccess,
  startDate,
  endDate,
  isApprovalView = false,
  onApprove,
  onReject,
  label = 'Histórico de Horas',
  limit,
}) => {
  const { data: session } = useSession();
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const {
    entries,
    loading,
    error,
    fetchEntries,
    updateEntry,
    deleteEntry,
  } = useTimeEntries();

  useEffect(() => {
    devLog('TimeEntryList - Component mounted or userId changed', { userId, path: window.location.pathname });
    
    // Verificando se estamos na aba "Meus Registros"
    const isMyEntriesTab = window.location.pathname.includes('my-entries') || 
                          window.location.pathname.includes('Meus Registros') ||
                          document.querySelector('[data-state="active"][id*="my-entries"]') !== null;
    
    if (userId) {
      devLog(`TimeEntryList - Buscando entradas para userId específico: ${userId}`);
      // Se um userId foi explicitamente fornecido, usamos ele
      fetchEntries({ userId, startDate, endDate });
    } else if (isMyEntriesTab && session?.user?.id) {
      // Se estamos na aba "Meus Registros" e não tem userId, usamos o ID do usuário logado
      devLog('Auto-applying current user ID filter:', session.user.id);
      fetchEntries({ userId: session.user.id, startDate, endDate });
    } else {
      // Caso contrário, buscamos sem filtro de userId
      devLog('TimeEntryList - Buscando todas as entradas sem filtro de usuário');
      fetchEntries({ startDate, endDate });
    }
  }, [userId, startDate, endDate, fetchEntries, session?.user?.id]);
  
  // Filtrar entradas localmente para garantir que apenas as do usuário sejam exibidas
  // quando estamos na aba "Meus Registros"
  const filteredEntries = userId ? entries.filter(entry => entry.userId === userId) : entries;
  
  useEffect(() => {
    devLog('TimeEntryList - Entries updated:', filteredEntries);
  }, [filteredEntries]);

  // Gerenciar a edição de uma entrada
  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setIsEditing(true);
  };

  // Confirmar exclusão
  const confirmDelete = (entryId: string) => {
    setEntryToDelete(entryId);
    setDeleteDialogOpen(true);
  };

  // Cancelar exclusão
  const cancelDelete = () => {
    setEntryToDelete(null);
    setDeleteDialogOpen(false);
  };

  // Realizar exclusão
  const handleDelete = async (entryId: string) => {
    try {
      devLog(`Tentando excluir entrada: ${entryId}`);
      const success = await deleteEntry(entryId);
      if (success) {
        devLog(`Exclusão bem-sucedida para entrada: ${entryId}`);
        toast({
          description: "O registro de horas foi excluído com sucesso.",
          type: "success"
        });
        if (onSuccess) {
          onSuccess();
        }
      } else {
        devError(`Falha na exclusão da entrada: ${entryId}`);
        toast({
          description: "Não foi possível excluir o registro. Tente novamente.",
          type: "error"
        });
      }
    } catch (error) {
      devError("Erro ao excluir registro:", error);
      toast({
        description: "Ocorreu um erro ao excluir o registro.",
        type: "error"
      });
    } finally {
      setDeleteDialogOpen(false);
      setEntryToDelete(null);
    }
  };

  // Cancelar edição
  const handleCancelEdit = () => {
    setEditingEntry(null);
    setIsEditing(false);
  };

  // Sucesso na edição
  const handleEditSuccess = () => {
    setEditingEntry(null);
    setIsEditing(false);
    // Recarregar os dados atualizados
    fetchEntries({ userId, startDate, endDate });
  };

  // Log para verificar entradas carregadas
  useEffect(() => {
    devLog(`[TimeEntryList] Entradas carregadas (${entries.length}):`, entries);
    devLog(`[TimeEntryList] Parâmetros: userId=${userId}, startDate=${startDate}, endDate=${endDate}`);
    
    const sessionInfo = localStorage.getItem('sessionInfo');
    if (sessionInfo) {
      try {
        const session = JSON.parse(sessionInfo);
        devLog('[TimeEntryList] Informações da sessão:', session);
      } catch (e) {
        devError('[TimeEntryList] Erro ao analisar informações da sessão:', e);
      }
    } else {
      devLog('[TimeEntryList] Nenhuma informação de sessão encontrada no localStorage');
    }
  }, [entries, userId, startDate, endDate]);

  if (loading && filteredEntries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{label}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-6">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{label}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-500">Erro ao carregar registros: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (filteredEntries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{label}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">Nenhum registro encontrado.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {isEditing && editingEntry && (
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium">Editar Registro</h3>
            <Button variant="outline" size="sm" onClick={handleCancelEdit}>
              Cancelar
            </Button>
          </div>
          <TimeEntryForm
            mode="edit"
            entryId={editingEntry.id}
            initialData={{
              date: editingEntry.date,
              startTime: editingEntry.startTime,
              endTime: editingEntry.endTime,
              totalHours: editingEntry.totalHours,
              observation: editingEntry.observation || '',
            }}
            onSuccess={handleEditSuccess}
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{label}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">
                      <LocalDate date={`${entry.date}T00:00:00`} formatString="PPP" />
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      <LocalTime time={entry.startTime} /> - <LocalTime time={entry.endTime} /> ({entry.totalHours.toFixed(2)} horas)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{entry.userName}</p>
                    <div className="mt-2 flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(entry)}
                      >
                        Editar
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => confirmDelete(entry.id)}
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
                {entry.observation && (
                  <div className="mt-2 text-sm">
                    <p className="font-medium">Observação:</p>
                    <p className="text-muted-foreground">{entry.observation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal de confirmação de exclusão */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Confirmar exclusão</h3>
            <p className="mb-6 text-muted-foreground">
              Tem certeza que deseja excluir este registro de horas? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={cancelDelete}>Cancelar</Button>
              <Button variant="destructive" onClick={() => entryToDelete && handleDelete(entryToDelete)}>
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 