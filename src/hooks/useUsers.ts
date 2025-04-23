import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export interface User {
  id: string;
  name: string;
  email: string;
  hourlyRate?: number;
  role: string;
  companyId?: string;
  companyName?: string;
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();

  const fetchUsers = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    setError(null);

    try {
      let url = '/api/users';
      if (session.user.role === "EMPLOYEE") {
        url += '?selfInfo=true';
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro de servidor' }));
        throw new Error(errorData.message || `Erro ${response.status}: Falha ao buscar usuários`);
      }

      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      console.error('Erro ao buscar usuários:', err);
      setError(err.message || 'Ocorreu um erro ao buscar os usuários');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchUsers();
    }
  }, [session, fetchUsers]);

  return {
    users,
    loading,
    error,
    fetchUsers
  };
} 