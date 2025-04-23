'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  open: boolean;
  onClose: () => void;
  duration?: number;
}

interface ToastOptions {
  title?: string;
  description: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

// Global state para gerenciar toasts
type ToastState = {
  open: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number;
};

let toastState: ToastState = {
  open: false,
  message: '',
  type: 'info',
  duration: 3000,
};

let setToastState: (state: ToastState) => void = () => {};

// Função toast para ser exportada e usada em toda a aplicação
export const toast = (options: ToastOptions) => {
  const message = options.description;
  const type = options.type || 'info';
  const duration = options.duration || 3000;
  
  if (typeof setToastState === 'function') {
    setToastState({
      open: true,
      message,
      type,
      duration,
    });
  } else {
    console.warn('Toast não está inicializado ainda');
    // Fallback para alert se o toast não estiver pronto
    alert(`${type.toUpperCase()}: ${message}`);
  }
};

export function Toast({
  message,
  type = 'info',
  open,
  onClose,
  duration = 3000,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Aguardar a animação terminar
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [open, duration, onClose]);

  if (!open && !isVisible) return null;

  const typeClasses = {
    success: 'bg-green-100 border-green-500 text-green-800',
    error: 'bg-red-100 border-red-500 text-red-800',
    warning: 'bg-yellow-100 border-yellow-500 text-yellow-800',
    info: 'bg-blue-100 border-blue-500 text-blue-800',
  };

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 max-w-md rounded-md border-l-4 px-4 py-3 shadow-md transition-all duration-300',
        typeClasses[type],
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      )}
      role="alert"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">{message}</div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="ml-4 text-gray-400 hover:text-gray-600"
        >
          <span className="sr-only">Fechar</span>
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
} 