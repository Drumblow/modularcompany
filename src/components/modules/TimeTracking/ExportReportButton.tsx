'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/DropdownMenu';
import { TimeEntry } from '@/hooks/useTimeEntries';
import { ChevronDown } from 'lucide-react';
import { exportReportToPDF } from './ExportReportPDF';
import { exportReportToExcel } from './ExportReportExcel';
import { devLog, devWarn, devError } from '@/lib/logger';

interface ExportReportButtonProps {
  title: string;
  startDate: string;
  endDate: string;
  entries: TimeEntry[];
  users: { id: string; name: string; hourlyRate?: number }[];
  totalHours: number;
  totalCost: number;
  hoursByUser: Record<string, number>;
  costByUser: Record<string, number>;
  onExportSuccess: (message: string) => void;
  onExportError: (message: string) => void;
  companyName?: string;
}

export function ExportReportButton({
  title,
  startDate,
  endDate,
  entries,
  users,
  totalHours,
  totalCost,
  hoursByUser,
  costByUser,
  onExportSuccess,
  onExportError,
  companyName = 'Modular Company'
}: ExportReportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = () => {
    try {
      setIsExporting(true);
      
      exportReportToPDF({
        title,
        startDate,
        endDate,
        entries,
        users,
        totalHours,
        totalCost,
        hoursByUser,
        costByUser
      });
      
      onExportSuccess('Relatório em PDF exportado com sucesso!');
    } catch (error) {
      devError('Erro ao exportar relatório em PDF:', error);
      onExportError('Erro ao exportar relatório em PDF. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      
      // Usar nossa nova função de exportação para Excel
      await exportReportToExcel({
        title,
        companyName,
        startDate,
        endDate,
        entries,
        users,
        totalHours,
        totalCost,
        hoursByUser,
        costByUser
      });
      
      onExportSuccess('Relatório em Excel exportado com sucesso!');
    } catch (error) {
      devError('Erro ao exportar relatório em Excel:', error);
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