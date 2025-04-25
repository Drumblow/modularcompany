'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { devLog, devWarn, devError } from '@/lib/logger';

interface LocalDateProps {
  date: string | Date;
  formatString?: string;
  className?: string;
}

export function LocalDate({ date, formatString = 'dd/MM/yyyy', className = '' }: LocalDateProps) {
  const [isClient, setIsClient] = useState(false);
  
  // Este efeito só será executado no cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

  // No servidor, retornamos uma string vazia ou um valor padrão
  if (!isClient) {
    return <span className={className}>-</span>;
  }

  // Garantir que temos um objeto Date
  const dateObj = date instanceof Date ? date : new Date(date);
  
  try {
    // Formatar a data usando o locale do Brasil
    const formattedDate = format(dateObj, formatString, { locale: ptBR });
    return <span className={className}>{formattedDate}</span>;
  } catch (error) {
    devError('Erro ao formatar data:', error);
    return <span className={className}>Data inválida</span>;
  }
}

interface LocalTimeProps {
  time: string;
  className?: string;
}

export function LocalTime({ time, className = '' }: LocalTimeProps) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // No servidor, retornamos uma string vazia ou um valor padrão
  if (!isClient) {
    return <span className={className}>-</span>;
  }

  // Verificar se time está definido e tem o formato correto
  if (!time || typeof time !== 'string') {
    return <span className={className}>-</span>;
  }

  return <span className={className}>{time}</span>;
} 