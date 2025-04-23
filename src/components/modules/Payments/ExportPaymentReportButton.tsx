'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/DropdownMenu';
import { ChevronDown } from 'lucide-react';
import {
  Payment,
  TimeEntry,
  PaymentWithTimeEntries,
  exportPaymentReportToPDF,
  exportPaymentReportToExcel
} from '.';

interface ExportPaymentReportButtonProps {
  title: string;
  startDate?: string;
  endDate?: string;
  payments: Payment[];
  paymentsDetails?: PaymentWithTimeEntries[];
  users: { id: string; name: string; hourlyRate?: number }[];
  totalAmount: number;
  totalHours: number;
  onExportSuccess: (message: string) => void;
  onExportError: (message: string) => void;
  companyName?: string;
}

export function ExportPaymentReportButton({
  title,
  startDate,
  endDate,
  payments,
  paymentsDetails,
  users,
  totalAmount,
  totalHours,
  onExportSuccess,
  onExportError,
  companyName = 'Modular Company'
}: ExportPaymentReportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = () => {
    try {
      setIsExporting(true);
      
      exportPaymentReportToPDF({
        title,
        startDate,
        endDate,
        payments,
        paymentsDetails,
        users,
        totalAmount,
        totalHours,
        companyName
      });
      
      onExportSuccess('Relatório de pagamentos em PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar relatório em PDF:', error);
      onExportError('Erro ao exportar relatório em PDF. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      
      await exportPaymentReportToExcel({
        title,
        startDate,
        endDate,
        payments,
        paymentsDetails,
        users,
        totalAmount,
        totalHours,
        companyName
      });
      
      onExportSuccess('Relatório de pagamentos em Excel exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar relatório em Excel:', error);
      onExportError('Erro ao exportar relatório em Excel. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          {isExporting ? 'Exportando...' : 'Exportar Relatório'} 
          <ChevronDown className="ml-1 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportPDF}>
          Exportar como PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportExcel}>
          Exportar como Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 