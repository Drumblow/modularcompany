'use client';

import { BellIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/hooks/useNotifications';
import { useEffect, useState, useCallback } from 'react';
import { NotificationsDropdown } from './NotificationsDropdown';

export function NotificationBell() {
  const { unreadCount, notifications, fetchNotifications } = useNotifications();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [localUnreadCount, setLocalUnreadCount] = useState(unreadCount);

  // Atualizar o contador local quando o unreadCount oficial mudar
  useEffect(() => {
    setLocalUnreadCount(unreadCount);
  }, [unreadCount]);

  // Atualizar notificações a cada 60 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications();
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Função para atualizar o contador após uma ação (marcar como lido, excluir, etc.)
  const handleNotificationUpdate = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Buscar notificações ao abrir o dropdown
  const toggleDropdown = () => {
    // Se estiver fechando o dropdown, não precisamos atualizar
    if (dropdownOpen) {
      setDropdownOpen(false);
      return;
    }
    
    // Se estiver abrindo, atualizar as notificações primeiro
    fetchNotifications();
    setDropdownOpen(true);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleDropdown}
        className="relative"
        aria-label="Notificações"
      >
        <BellIcon className="h-5 w-5" />
        {localUnreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {localUnreadCount > 9 ? '9+' : localUnreadCount}
          </span>
        )}
      </Button>

      {dropdownOpen && (
        <NotificationsDropdown
          notifications={notifications}
          onClose={() => setDropdownOpen(false)}
          onUpdate={handleNotificationUpdate}
        />
      )}
    </div>
  );
} 