'use client';

import { useRef, useEffect, useState } from 'react';
import { Notification } from '@/hooks/useNotifications';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNotifications } from '@/hooks/useNotifications';
import { CheckIcon, Trash2Icon, XIcon, BellOffIcon, EyeIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface NotificationsDropdownProps {
  notifications: Notification[];
  onClose: () => void;
  onUpdate?: () => void;
}

export function NotificationsDropdown({ notifications, onClose, onUpdate }: NotificationsDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { markAsRead, deleteNotification, markAllAsRead, fetchNotifications } = useNotifications();
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const [processingAll, setProcessingAll] = useState(false);
  const [localNotifications, setLocalNotifications] = useState<Notification[]>(notifications);
  const router = useRouter();
  const { data: session } = useSession();

  // Atualizar notificações locais quando as props mudarem
  useEffect(() => {
    setLocalNotifications(notifications);
  }, [notifications]);

  // Fechar dropdown ao clicar fora dele
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Renderizar ícone baseado no tipo da notificação
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckIcon className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <EyeIcon className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XIcon className="h-4 w-4 text-red-500" />;
      default:
        return <BellOffIcon className="h-4 w-4 text-blue-500" />;
    }
  };

  // Função para navegar para a página relevante baseada no tipo de notificação
  const handleNavigateToRelated = (notification: Notification) => {
    // Marcar como lida antes de navegar
    handleMarkAsRead(notification.id);
    
    // Obter o papel do usuário para direcionar corretamente
    const userRole = session?.user?.role?.toLowerCase() || 'employee';
    
    // Navegar baseado no tipo de notificação
    if (notification.relatedType === 'timeEntry') {
      router.push(`/dashboard/${userRole}/time-entries`);
      onClose();
    } else if (notification.relatedType === 'payment') {
      router.push(`/dashboard/employee/payments/${notification.relatedId}`);
      onClose();
    } else if (notification.title.toLowerCase().includes('registro de horas')) {
      router.push(`/dashboard/${userRole}/time-entries`);
      onClose();
    } else if (notification.title.toLowerCase().includes('pagamento')) {
      router.push('/dashboard/employee/payments');
      onClose();
    } else {
      // Caso não tenha um destino específico, apenas marcar como lida
      handleMarkAsRead(notification.id);
    }
  };

  // Função para marcar uma notificação como lida/não lida com feedback visual e atualização em tempo real
  const handleMarkAsRead = async (id: string, read = true) => {
    setProcessingIds(prev => [...prev, id]);
    
    // Atualizar UI imediatamente antes da API responder
    setLocalNotifications(prev => 
      prev.map(n => n.id === id ? {...n, read} : n)
    );
    
    await markAsRead(id, read);
    setProcessingIds(prev => prev.filter(item => item !== id));
    
    // Recarregar notificações após a ação
    await fetchNotifications();
    
    // Notificar o componente pai sobre a mudança
    if (onUpdate) onUpdate();
  };

  // Função para excluir uma notificação com feedback visual e atualização em tempo real
  const handleDeleteNotification = async (id: string) => {
    setProcessingIds(prev => [...prev, id]);
    
    // Atualizar UI imediatamente antes da API responder
    setLocalNotifications(prev => 
      prev.filter(n => n.id !== id)
    );
    
    await deleteNotification(id);
    setProcessingIds(prev => prev.filter(item => item !== id));
    
    // Recarregar notificações após a ação
    await fetchNotifications();
    
    // Notificar o componente pai sobre a mudança
    if (onUpdate) onUpdate();
  };

  // Função para marcar todas como lidas com feedback visual
  const handleMarkAllAsRead = async () => {
    setProcessingAll(true);
    
    // Atualizar UI imediatamente antes da API responder
    setLocalNotifications(prev => 
      prev.map(n => ({...n, read: true}))
    );
    
    await markAllAsRead();
    setProcessingAll(false);
    
    // Recarregar notificações após a ação
    await fetchNotifications();
    
    // Notificar o componente pai sobre a mudança
    if (onUpdate) onUpdate();
  };

  return (
    <div 
      ref={dropdownRef} 
      className="absolute right-0 top-10 z-50 w-80 rounded-md border bg-card p-2 shadow-lg"
    >
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="font-semibold">Notificações</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleMarkAllAsRead}
          disabled={processingAll || localNotifications.filter(n => !n.read).length === 0}
        >
          {processingAll ? 'Processando...' : 'Marcar todas como lidas'}
        </Button>
      </div>

      <div className="max-h-80 overflow-y-auto py-2">
        {localNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <BellOffIcon className="mb-2 h-6 w-6" />
            <p>Você não tem notificações</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {localNotifications.map((notification) => (
              <li 
                key={notification.id} 
                className={`relative rounded-md p-3 transition-colors hover:bg-muted/50 ${
                  !notification.read ? 'bg-muted/20' : ''
                } ${processingIds.includes(notification.id) ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div 
                    className="flex-1 cursor-pointer" 
                    onClick={() => handleNavigateToRelated(notification)}
                  >
                    <h4 className="text-sm font-medium">{notification.title}</h4>
                    <p className="text-xs text-muted-foreground">{notification.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {format(new Date(notification.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {!notification.read ? (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }}
                        title="Marcar como lida"
                        disabled={processingIds.includes(notification.id)}
                      >
                        <CheckIcon className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id, false);
                        }}
                        title="Marcar como não lida"
                        disabled={processingIds.includes(notification.id)}
                      >
                        <EyeIcon className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-6 w-6 text-red-500 hover:bg-red-100 hover:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNotification(notification.id);
                      }}
                      title="Excluir"
                      disabled={processingIds.includes(notification.id)}
                    >
                      <Trash2Icon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 