'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export interface TimeEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  observation?: string;
  userId: string;
  userName: string;
  userEmail?: string;
  hourlyRate?: number;
  companyId?: string;
  companyName?: string;
  createdAt: string;
  updatedAt: string;
  approved?: boolean;
  rejected?: boolean;
  rejectionReason?: string;
  project?: string;
}

export interface TimeEntryFormData {
  date: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  observation?: string;
}

export function useTimeEntries() {
  const { data: session } = useSession();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar todas as entradas
  const fetchEntries = useCallback(async (filters?: { userId?: string; startDate?: string; endDate?: string }) => {
    if (!session) return;

    setLoading(true);
    setError(null);

    try {
      let url = '/api/time-entries';
      
      // Adicionar filtros à URL
      const queryParams = new URLSearchParams();

      // Detecção da URL para determinar se estamos na tela de "Meus Registros"
      const isMyEntriesView = 
        typeof window !== 'undefined' && (
          window.location.pathname.includes('/my-entries') ||
          window.location.pathname.includes('/time-entries') && 
          window.location.hash.includes('Meus') ||
          document.querySelector('[data-state="active"][value="my-entries"]') !== null
        );
      
      console.log(`[useTimeEntries] Verificação de "Meus Registros":`, {
        pathname: typeof window !== 'undefined' ? window.location.pathname : 'N/A',
        hash: typeof window !== 'undefined' ? window.location.hash : 'N/A',
        tabElement: typeof document !== 'undefined' ? !!document.querySelector('[data-state="active"][value="my-entries"]') : 'N/A',
        isMyEntriesView
      });

      // Se estamos em modo "Meus registros" e não foi especificado userId,
      // explicitamente adicionar o userId da sessão atual
      if (filters?.userId) {
        queryParams.append('userId', filters.userId);
        console.log(`[useTimeEntries] Adicionado userId explícito ao filtro: ${filters.userId}`);
      } else if (isMyEntriesView) {
        queryParams.append('userId', session.user.id as string);
        console.log(`[useTimeEntries] Auto-adicionado userId da sessão atual ao filtro: ${session.user.id}`);
      }

      if (filters?.startDate) queryParams.append('startDate', filters.startDate);
      if (filters?.endDate) queryParams.append('endDate', filters.endDate);
      
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      console.log(`[useTimeEntries] Buscando entradas em: ${url}`);
      console.log(`[useTimeEntries] Usuário atual: ID=${session.user.id}, Role=${session.user.role}, CompanyID=${session.user.companyId}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const data = await response.json();
        console.error(`[useTimeEntries] Erro na resposta:`, data);
        throw new Error(data.message || 'Erro ao buscar registros de horas');
      }

      const data = await response.json();
      console.log(`[useTimeEntries] Buscou ${data.length} entradas:`, data);
      
      if (filters?.userId) {
        console.log(`[useTimeEntries] Filtrando por userId=${filters.userId}, entradas encontradas: ${data.filter((e: TimeEntry) => e.userId === filters.userId).length}/${data.length}`);
      }
      
      setEntries(data);
    } catch (err: any) {
      console.error('Erro ao buscar registros de horas:', err);
      setError(err.message || 'Ocorreu um erro ao buscar os registros');
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Buscar uma entrada específica
  const fetchEntry = useCallback(async (id: string) => {
    if (!session) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/time-entries/${id}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Erro ao buscar registro de horas');
      }

      const data = await response.json();
      return data;
    } catch (err: any) {
      console.error('Erro ao buscar registro de horas:', err);
      setError(err.message || 'Ocorreu um erro ao buscar o registro');
      return null;
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Criar uma nova entrada
  const createEntry = useCallback(async (formData: TimeEntryFormData) => {
    if (!session) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Verificar se é um conflito de horário
        if (response.status === 409) {
          const conflictsText = data.conflicts && data.conflicts.length > 0 
            ? `\nConflitos: ${data.conflicts.map(
                (c: any) => `${c.date} (${c.startTime} - ${c.endTime}${c.project ? ` - ${c.project}` : ''})`
              ).join(', ')}`
            : '';
          throw new Error(`${data.message}${conflictsText}`);
        }
        throw new Error(data.message || 'Erro ao criar registro de horas');
      }
      
      // Atualizar a lista de entradas
      setEntries(prev => [data, ...prev]);
      
      return data;
    } catch (err: any) {
      console.error('Erro ao criar registro de horas:', err);
      setError(err.message || 'Ocorreu um erro ao criar o registro');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Atualizar uma entrada existente
  const updateEntry = useCallback(async (id: string, formData: Partial<TimeEntryFormData>) => {
    if (!session) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/time-entries/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Verificar se é um conflito de horário
        if (response.status === 409) {
          const conflictsText = data.conflicts && data.conflicts.length > 0 
            ? `\nConflitos: ${data.conflicts.map(
                (c: any) => `${c.date} (${c.startTime} - ${c.endTime}${c.project ? ` - ${c.project}` : ''})`
              ).join(', ')}`
            : '';
          throw new Error(`${data.message}${conflictsText}`);
        }
        throw new Error(data.message || 'Erro ao atualizar registro de horas');
      }
      
      // Atualizar a lista de entradas
      setEntries(prev => 
        prev.map(entry => 
          entry.id === id ? { ...entry, ...data } : entry
        )
      );
      
      return data;
    } catch (err: any) {
      console.error('Erro ao atualizar registro de horas:', err);
      setError(err.message || 'Ocorreu um erro ao atualizar o registro');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Excluir uma entrada
  const deleteEntry = useCallback(async (id: string) => {
    if (!session) return false;

    setLoading(true);
    setError(null);

    try {
      console.log(`[useTimeEntries] Iniciando exclusão da entrada ${id}`);
      console.log(`[useTimeEntries] URL da requisição: /api/time-entries/${id}`);
      console.log(`[useTimeEntries] Método: DELETE`);
      console.log(`[useTimeEntries] Usuário da sessão:`, session.user);
      
      const response = await fetch(`/api/time-entries/${id}`, {
        method: 'DELETE',
      });

      console.log(`[useTimeEntries] Status da resposta: ${response.status}`);
      
      if (!response.ok) {
        const data = await response.json();
        console.error(`[useTimeEntries] Erro na resposta:`, data);
        throw new Error(data.message || 'Erro ao excluir registro de horas');
      }

      const responseText = await response.text();
      console.log(`[useTimeEntries] Resposta completa:`, responseText);
      
      // Atualizar a lista de entradas
      setEntries(prev => {
        const updatedEntries = prev.filter(entry => entry.id !== id);
        console.log(`[useTimeEntries] Entradas após exclusão: ${updatedEntries.length} (removido ${id})`);
        return updatedEntries;
      });
      
      console.log(`[useTimeEntries] Exclusão bem-sucedida para entrada ${id}`);
      return true;
    } catch (err: any) {
      console.error(`[useTimeEntries] Erro ao excluir registro de horas ${id}:`, err);
      setError(err.message || 'Ocorreu um erro ao excluir o registro');
      return false;
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Aprovar uma entrada
  const approveEntry = useCallback(async (id: string) => {
    if (!session) return false;

    setLoading(true);
    setError(null);

    try {
      console.log(`Tentando aprovar registro ${id}...`);
      
      const response = await fetch(`/api/time-entries/${id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approved: true, rejected: false }),
      });

      if (!response.ok) {
        // Extrair texto completo da resposta para debug
        const responseText = await response.text();
        console.error(`Erro na aprovação (${response.status}):`, responseText);
        
        // Tentar analisar como JSON se possível
        let errorData: { message: string; details?: string } = { message: `Erro ${response.status}` };
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          console.warn('Não foi possível analisar resposta como JSON');
        }
        
        // Construir mensagem de erro detalhada
        const errorMessage = errorData.message || `Erro ${response.status}: Falha ao aprovar registro`;
        const details = errorData.details ? ` (${errorData.details})` : '';
        throw new Error(`${errorMessage}${details}`);
      }

      // Tentar analisar a resposta como JSON
      const responseData = await response.text();
      let updatedEntry = null;
      
      try {
        updatedEntry = JSON.parse(responseData);
        console.log(`Registro ${id} aprovado com sucesso:`, updatedEntry);
      } catch (e) {
        console.warn('Resposta não é um JSON válido:', responseData);
      }
      
      // Se conseguimos um objeto válido da resposta, atualizamos a lista
      if (updatedEntry && updatedEntry.id) {
        setEntries(prev => 
          prev.map(entry => 
            entry.id === id ? { ...entry, ...updatedEntry } : entry
          )
        );
      } else {
        // Se não, pelo menos atualizamos o status na lista atual
        console.log(`Atualizando registro ${id} localmente (approved=true, rejected=false)`);
        setEntries(prev => 
          prev.map(entry => 
            entry.id === id ? { ...entry, approved: true, rejected: false } : entry
          )
        );
      }
      
      return true;
    } catch (err: any) {
      console.error('Erro ao aprovar registro de horas:', err);
      setError(err.message || 'Ocorreu um erro ao aprovar o registro');
      return false;
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Rejeitar uma entrada
  const rejectEntry = useCallback(async (id: string, rejectionReason: string) => {
    if (!session) return false;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/time-entries/${id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          approved: false, 
          rejected: true,
          rejectionReason
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro de servidor' }));
        throw new Error(errorData.message || `Erro ${response.status}: Falha ao rejeitar registro`);
      }

      // Tentar analisar a resposta como JSON
      const updatedEntry = await response.json().catch(() => null);
      
      // Se conseguimos um objeto válido da resposta, atualizamos a lista
      if (updatedEntry && updatedEntry.id) {
        setEntries(prev => 
          prev.map(entry => 
            entry.id === id ? { ...entry, ...updatedEntry } : entry
          )
        );
      } else {
        // Se não, pelo menos atualizamos o status na lista atual
        setEntries(prev => 
          prev.map(entry => 
            entry.id === id ? {
              ...entry,
              approved: false,
              rejected: true,
              rejectionReason
            } : entry
          )
        );
      }
      
      return true;
    } catch (err: any) {
      console.error('Erro ao rejeitar registro de horas:', err);
      setError(err.message || 'Ocorreu um erro ao rejeitar o registro');
      return false;
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Carregar entradas quando o componente montar
  useEffect(() => {
    if (session) {
      fetchEntries();
    }
  }, [session, fetchEntries]);

  return {
    entries,
    loading,
    error,
    fetchEntries,
    fetchEntry,
    createEntry,
    updateEntry,
    deleteEntry,
    approveEntry,
    rejectEntry,
  };
} 