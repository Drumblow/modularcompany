'use client';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TimeEntry } from '@/hooks/useTimeEntries';
import { formatCurrency } from '@/lib/utils';

interface ExportReportPDFProps {
  title: string;
  startDate: string;
  endDate: string;
  entries: TimeEntry[];
  users: { id: string; name: string; hourlyRate?: number }[];
  totalHours: number;
  totalCost: number;
  hoursByUser: Record<string, number>;
  costByUser: Record<string, number>;
}

export function exportReportToPDF({
  title,
  startDate,
  endDate,
  entries,
  users,
  totalHours,
  totalCost,
  hoursByUser,
  costByUser,
}: ExportReportPDFProps) {
  // Criar um novo documento PDF
  const doc = new jsPDF();
  
  // Adicionar título
  doc.setFontSize(18);
  doc.text(title, 14, 20);
  
  // Adicionar informações do período
  doc.setFontSize(12);
  const formattedStartDate = format(new Date(startDate), 'dd/MM/yyyy', { locale: ptBR });
  const formattedEndDate = format(new Date(endDate), 'dd/MM/yyyy', { locale: ptBR });
  doc.text(`Período: ${formattedStartDate} a ${formattedEndDate}`, 14, 30);
  
  // Adicionar informações gerais
  doc.text(`Total de Registros: ${entries.length}`, 14, 40);
  doc.text(`Horas Totais: ${totalHours.toFixed(2)}h`, 14, 45);
  doc.text(`Custo Total: ${formatCurrency(totalCost)}`, 14, 50);
  
  // Adicionar linha separadora
  doc.line(14, 55, 196, 55);
  
  // Título da seção de horas por funcionário
  doc.setFontSize(14);
  doc.text('Horas por Funcionário', 14, 65);
  
  // Tabela de horas por funcionário
  const userTableData = Object.entries(hoursByUser).map(([userId, hours]) => {
    const user = users.find((u) => u.id === userId) || { name: 'Usuário Desconhecido', hourlyRate: 0 };
    const cost = costByUser[userId] || 0;
    const percentage = totalHours > 0 ? (hours / totalHours) * 100 : 0;
    
    return [
      user.name,
      `${hours.toFixed(2)}h`,
      `${percentage.toFixed(1)}%`,
      formatCurrency(cost)
    ];
  });
  
  // Adicionar tabela de usuários e obter a posição Y final
  let userTableEndY = 70;
  
  autoTable(doc, {
    startY: 70,
    head: [['Funcionário', 'Horas Trabalhadas', 'Percentual', 'Custo (CAD)']],
    body: userTableData,
    theme: 'striped',
    headStyles: {
      fillColor: [220, 220, 220],
      textColor: [0, 0, 0],
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 10
    },
    didDrawPage: (data) => {
      userTableEndY = data.cursor?.y ?? userTableEndY;
    }
  });
  
  // Título da seção de registros detalhados
  doc.setFontSize(14);
  doc.text('Registros Detalhados', 14, userTableEndY + 15);
  
  // Tabela de registros detalhados
  const detailsTableData = entries
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((entry) => {
      const user = users.find((u) => u.id === entry.userId) || { 
        name: entry.userName || 'Desconhecido',
        hourlyRate: 0
      };
      const cost = (user.hourlyRate || 0) * entry.totalHours;
      
      return [
        format(new Date(entry.date), 'dd/MM/yyyy', { locale: ptBR }),
        user.name,
        `${entry.startTime} - ${entry.endTime}`,
        `${entry.totalHours.toFixed(2)}h`,
        formatCurrency(cost),
        entry.observation || ''
      ];
    });
  
  // Adicionar tabela de registros detalhados
  autoTable(doc, {
    startY: userTableEndY + 20,
    head: [['Data', 'Funcionário', 'Horário', 'Horas', 'Custo', 'Observação']],
    body: detailsTableData,
    theme: 'striped',
    headStyles: {
      fillColor: [220, 220, 220],
      textColor: [0, 0, 0],
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: 20 }, // Data
      1: { cellWidth: 30 }, // Funcionário
      2: { cellWidth: 25 }, // Horário
      3: { cellWidth: 15 }, // Horas
      4: { cellWidth: 20 }, // Custo
      5: { cellWidth: 'auto' }  // Observação
    }
  });
  
  // Adicionar rodapé
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Page ${i} of ${pageCount} - Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  // Salvar o PDF
  doc.save(`Time_Report_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.pdf`);
} 