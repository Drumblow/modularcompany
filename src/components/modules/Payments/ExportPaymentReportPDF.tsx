'use client';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';

interface Payment {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  date: string;
  paymentMethod: string;
  status: string;
  reference?: string;
  description?: string;
  periodStart?: string;
  periodEnd?: string;
  totalHours: number;
  createdAt: string;
  createdByName?: string;
}

interface TimeEntry {
  id: string;
  date: string;
  totalHours: number;
  amount: number;
}

interface PaymentWithTimeEntries extends Payment {
  timeEntries: TimeEntry[];
}

interface ExportPaymentReportPDFProps {
  title: string;
  startDate?: string;
  endDate?: string;
  payments: Payment[];
  paymentsDetails?: PaymentWithTimeEntries[];
  users: { id: string; name: string; hourlyRate?: number }[];
  totalAmount: number;
  totalHours: number;
  companyName?: string;
}

// Função para traduzir o método de pagamento
const translatePaymentMethod = (method: string) => {
  const methods: Record<string, string> = {
    'bank_transfer': 'Transferência Bancária',
    'credit_card': 'Cartão de Crédito',
    'debit_card': 'Cartão de Débito',
    'cash': 'Dinheiro',
    'check': 'Cheque',
    'pix': 'PIX',
    'other': 'Outro'
  };
  return methods[method] || method;
};

// Função para traduzir o status do pagamento
const translateStatus = (status: string) => {
  const statusTranslations: Record<string, string> = {
    'pending': 'Pendente',
    'completed': 'Concluído',
    'cancelled': 'Cancelado'
  };
  return statusTranslations[status] || status;
};

export function exportPaymentReportToPDF({
  title,
  startDate,
  endDate,
  payments,
  paymentsDetails,
  users,
  totalAmount,
  totalHours,
  companyName = 'Modular Company'
}: ExportPaymentReportPDFProps) {
  // Criar um novo documento PDF
  const doc = new jsPDF();
  
  // Adicionar título
  doc.setFontSize(18);
  doc.text(`${title} - ${companyName}`, 14, 20);
  
  // Adicionar informações do período
  doc.setFontSize(12);
  let yPosition = 30;
  
  if (startDate && endDate) {
    const formattedStartDate = format(new Date(startDate), 'dd/MM/yyyy', { locale: ptBR });
    const formattedEndDate = format(new Date(endDate), 'dd/MM/yyyy', { locale: ptBR });
    doc.text(`Período: ${formattedStartDate} a ${formattedEndDate}`, 14, yPosition);
    yPosition += 10;
  }
  
  // Adicionar informações gerais
  doc.text(`Total de Pagamentos: ${payments.length}`, 14, yPosition);
  yPosition += 5;
  doc.text(`Valor Total: ${formatCurrency(totalAmount)}`, 14, yPosition);
  yPosition += 5;
  doc.text(`Horas Totais: ${totalHours.toFixed(2)}h`, 14, yPosition);
  yPosition += 5;
  
  // Adicionar linha separadora
  doc.line(14, yPosition + 2, 196, yPosition + 2);
  yPosition += 10;
  
  // Título da seção de pagamentos por funcionário
  doc.setFontSize(14);
  doc.text('Resumo de Pagamentos por Funcionário', 14, yPosition);
  yPosition += 10;
  
  // Agrupar pagamentos por funcionário
  const paymentsByUser: Record<string, { total: number, count: number, hours: number }> = {};
  
  payments.forEach(payment => {
    if (!paymentsByUser[payment.userId]) {
      paymentsByUser[payment.userId] = { total: 0, count: 0, hours: 0 };
    }
    paymentsByUser[payment.userId].total += payment.amount;
    paymentsByUser[payment.userId].count += 1;
    paymentsByUser[payment.userId].hours += payment.totalHours;
  });
  
  // Tabela de pagamentos por funcionário
  const userTableData = Object.entries(paymentsByUser).map(([userId, data]) => {
    const user = users.find((u) => u.id === userId) || { name: 'Usuário Desconhecido' };
    const percentage = totalAmount > 0 ? (data.total / totalAmount) * 100 : 0;
    
    return [
      user.name,
      `${data.count}`,
      `${data.hours.toFixed(2)}h`,
      formatCurrency(data.total),
      `${percentage.toFixed(1)}%`
    ];
  });
  
  // Adicionar tabela de usuários e obter a posição Y final
  let userTableEndY = yPosition;
  
  autoTable(doc, {
    startY: yPosition,
    head: [['Funcionário', 'Pagamentos', 'Horas', 'Total', 'Percentual']],
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
  
  // Título da seção de pagamentos detalhados
  doc.setFontSize(14);
  doc.text('Detalhes dos Pagamentos', 14, userTableEndY + 15);
  
  // Tabela de pagamentos detalhados
  const detailsTableData = payments
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((payment) => {
      return [
        format(new Date(payment.date), 'dd/MM/yyyy', { locale: ptBR }),
        payment.userName,
        payment.reference || payment.description || '-',
        translatePaymentMethod(payment.paymentMethod),
        `${payment.totalHours.toFixed(2)}h`,
        formatCurrency(payment.amount),
        translateStatus(payment.status),
      ];
    });
  
  // Adicionar tabela de pagamentos detalhados
  let detailsTableEndY = userTableEndY + 20;
  
  autoTable(doc, {
    startY: userTableEndY + 20,
    head: [['Data', 'Funcionário', 'Referência', 'Método', 'Horas', 'Valor', 'Status']],
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
      1: { cellWidth: 35 }, // Funcionário
      2: { cellWidth: 35 }, // Referência
      3: { cellWidth: 25 }, // Método
      4: { cellWidth: 15 }, // Horas
      5: { cellWidth: 20 }, // Valor
      6: { cellWidth: 15 }  // Status
    },
    didDrawPage: (data) => {
      detailsTableEndY = data.cursor?.y ?? detailsTableEndY;
    }
  });
  
  // Se houver detalhes de pagamentos com lançamentos, adicionar seção
  if (paymentsDetails && paymentsDetails.length > 0) {
    // Adicionar uma nova página para os detalhes de lançamentos
    doc.addPage();
    
    // Título para a seção de lançamentos
    doc.setFontSize(16);
    doc.text('Detalhes de Lançamentos por Pagamento', 14, 20);
    
    let entriesYPosition = 30;
    
    // Para cada pagamento, mostrar seus lançamentos
    paymentsDetails.forEach((payment, index) => {
      // Verificar se existe espaço suficiente para o próximo bloco de detalhes, se não, criar nova página
      if (entriesYPosition > 240) {
        doc.addPage();
        entriesYPosition = 20;
      }
      
      // Título do pagamento
      doc.setFontSize(12);
      doc.text(`Pagamento #${index + 1}: ${payment.userName} - ${format(new Date(payment.date), 'dd/MM/yyyy', { locale: ptBR })}`, 14, entriesYPosition);
      doc.text(`Valor: ${formatCurrency(payment.amount)} | Referência: ${payment.reference || payment.description || '-'}`, 14, entriesYPosition + 6);
      
      // Tabela de lançamentos para este pagamento
      const entriesData = payment.timeEntries.map(entry => [
        format(new Date(entry.date), 'dd/MM/yyyy', { locale: ptBR }),
        `${entry.totalHours.toFixed(2)}h`,
        formatCurrency(entry.amount)
      ]);
      
      autoTable(doc, {
        startY: entriesYPosition + 10,
        head: [['Data', 'Horas', 'Valor']],
        body: entriesData,
        theme: 'striped',
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 8
        },
        didDrawPage: (data) => {
          entriesYPosition = data.cursor?.y ?? entriesYPosition;
        }
      });
      
      entriesYPosition += 20;
    });
  }
  
  // Adicionar rodapé
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Página ${i} de ${pageCount} - Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  // Salvar o PDF
  doc.save(`Pagamentos_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.pdf`);
} 