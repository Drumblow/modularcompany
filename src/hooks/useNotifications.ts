import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  userId: string;
  relatedId?: string;
  relatedType?: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();

  // Buscar notificações do usuário
  const fetchNotifications = useCallback(async (unreadOnly = false, limit = 20) => {
    if (!session) return;

    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (unreadOnly) queryParams.append('unreadOnly', 'true');
      if (limit) queryParams.append('limit', limit.toString());
      
      const response = await fetch(`/api/notifications?${queryParams.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro de servidor' }));
        throw new Error(errorData.message || `Erro ${response.status}: Falha ao buscar notificações`);
      }

      const data = await response.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err: any) {
      console.error('Erro ao buscar notificações:', err);
      setError(err.message || 'Ocorreu um erro ao buscar as notificações');
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Marcar notificação como lida/não lida
  const markAsRead = useCallback(async (id: string, read = true) => {
    if (!session) return false;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ read }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro de servidor' }));
        throw new Error(errorData.message || `Erro ${response.status}: Falha ao atualizar notificação`);
      }

      const updatedNotification = await response.json();
      
      // Atualizar a lista de notificações
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id ? updatedNotification : notification
        )
      );

      // Atualizar contador de não lidas
      if (read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        setUnreadCount(prev => prev + 1);
      }

      // Buscar todas as notificações novamente para garantir que a lista esteja atualizada
      fetchNotifications();

      return true;
    } catch (err: any) {
      console.error('Erro ao atualizar notificação:', err);
      setError(err.message || 'Ocorreu um erro ao atualizar a notificação');
      return false;
    } finally {
      setLoading(false);
    }
  }, [session, fetchNotifications]);

  // Excluir notificação
  const deleteNotification = useCallback(async (id: string) => {
    if (!session) return false;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erro de servidor' }));
        throw new Error(errorData.message || `Erro ${response.status}: Falha ao excluir notificação`);
      }

      // Verificar se a notificação excluída era não lida
      const wasUnread = notifications.find(n => n.id === id)?.read === false;
      
      // Atualizar a lista de notificações
      setNotifications(prev => prev.filter(notification => notification.id !== id));

      // Atualizar contador de não lidas se necessário
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      // Buscar todas as notificações novamente para garantir que a lista esteja atualizada
      fetchNotifications();

      return true;
    } catch (err: any) {
      console.error('Erro ao excluir notificação:', err);
      setError(err.message || 'Ocorreu um erro ao excluir a notificação');
      return false;
    } finally {
      setLoading(false);
    }
  }, [session, notifications, fetchNotifications]);

  // Marcar todas as notificações como lidas
  const markAllAsRead = useCallback(async () => {
    if (!session) return false;

    setLoading(true);
    setError(null);

    try {
      // Selecionar todas as notificações não lidas
      const unreadNotifications = notifications.filter(n => !n.read);
      
      if (unreadNotifications.length === 0) {
        return true; // Nada a fazer
      }

      // Marcar cada notificação como lida
      const promises = unreadNotifications.map(notification => 
        fetch(`/api/notifications/${notification.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ read: true }),
        })
      );

      // Aguardar todas as requisições
      await Promise.all(promises);

      // Atualizar a lista de notificações
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );

      // Zerar contador de não lidas
      setUnreadCount(0);

      // Buscar todas as notificações novamente para garantir que a lista esteja atualizada
      fetchNotifications();

      return true;
    } catch (err: any) {
      console.error('Erro ao marcar todas como lidas:', err);
      setError(err.message || 'Ocorreu um erro ao marcar todas as notificações como lidas');
      return false;
    } finally {
      setLoading(false);
    }
  }, [session, notifications, fetchNotifications]);

  // Carregar notificações quando o componente montar
  useEffect(() => {
    if (session) {
      fetchNotifications();
    }
  }, [session, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    deleteNotification,
    markAllAsRead,
  };
} 