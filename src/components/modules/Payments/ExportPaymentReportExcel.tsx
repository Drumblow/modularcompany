import ExcelJS from 'exceljs';
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

interface ExportPaymentReportExcelProps {
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

export const exportPaymentReportToExcel = async ({
  title,
  startDate,
  endDate,
  payments,
  paymentsDetails,
  users,
  totalAmount,
  totalHours,
  companyName = 'Modular Company'
}: ExportPaymentReportExcelProps) => {
  // Criar uma nova workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Modular Company System';
  workbook.lastModifiedBy = 'Automatic Report';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Adicionar uma planilha para o resumo
  const summarySheet = workbook.addWorksheet('Resumo');

  // Estilo para títulos
  const titleStyle = {
    font: { bold: true, size: 14, color: { argb: '1F4E79' } },
    alignment: { horizontal: 'center' as const }
  };

  // Estilo para cabeçalhos
  const headerStyle = {
    font: { bold: true, color: { argb: 'FFFFFF' } },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: '1F4E79' } },
    alignment: { horizontal: 'center' as const }
  };

  // Estilo para totais
  const totalStyle = {
    font: { bold: true },
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'D9E1F2' } }
  };

  // Adicionar título do relatório
  summarySheet.mergeCells('A1:E1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = `${title} - ${companyName}`;
  titleCell.style = titleStyle;
  
  // Adicionar período do relatório, se disponível
  if (startDate && endDate) {
    summarySheet.mergeCells('A2:E2');
    const periodCell = summarySheet.getCell('A2');
    const formattedStartDate = format(new Date(startDate), 'dd/MM/yyyy', { locale: ptBR });
    const formattedEndDate = format(new Date(endDate), 'dd/MM/yyyy', { locale: ptBR });
    periodCell.value = `Período: ${formattedStartDate} até ${formattedEndDate}`;
    periodCell.style = { alignment: { horizontal: 'center' as const } };
  }

  // Adicionar totais gerais
  summarySheet.mergeCells('A4:C4');
  summarySheet.getCell('A4').value = 'Resumo Geral';
  summarySheet.getCell('A4').style = { font: { bold: true, size: 12 } };

  summarySheet.getCell('A5').value = 'Total de Pagamentos';
  summarySheet.getCell('B5').value = payments.length;
  
  summarySheet.getCell('A6').value = 'Total de Horas';
  summarySheet.getCell('B6').value = totalHours;
  summarySheet.getCell('B6').numFmt = '#,##0.00 "h"';
  
  summarySheet.getCell('A7').value = 'Valor Total';
  summarySheet.getCell('B7').value = totalAmount;
  summarySheet.getCell('B7').numFmt = '"R$ "#,##0.00';

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

  // Adicionar tabela de resumo por usuário
  summarySheet.mergeCells('A9:E9');
  summarySheet.getCell('A9').value = 'Pagamentos por Funcionário';
  summarySheet.getCell('A9').style = { font: { bold: true, size: 12 } };

  // Cabeçalhos da tabela de usuários
  summarySheet.getCell('A10').value = 'Funcionário';
  summarySheet.getCell('B10').value = 'Pagamentos';
  summarySheet.getCell('C10').value = 'Horas';
  summarySheet.getCell('D10').value = 'Valor';
  summarySheet.getCell('E10').value = 'Percentual';
  
  ['A10', 'B10', 'C10', 'D10', 'E10'].forEach(cell => {
    summarySheet.getCell(cell).style = headerStyle;
  });

  // Adicionar dados dos usuários
  let rowIndex = 11;
  Object.entries(paymentsByUser).forEach(([userId, data]) => {
    const user = users.find((u) => u.id === userId) || { 
      name: 'Usuário Desconhecido'
    };
    const percentage = totalAmount > 0 ? (data.total / totalAmount) * 100 : 0;
    
    summarySheet.getCell(`A${rowIndex}`).value = user.name;
    summarySheet.getCell(`B${rowIndex}`).value = data.count;
    summarySheet.getCell(`C${rowIndex}`).value = data.hours;
    summarySheet.getCell(`C${rowIndex}`).numFmt = '#,##0.00 "h"';
    summarySheet.getCell(`D${rowIndex}`).value = data.total;
    summarySheet.getCell(`D${rowIndex}`).numFmt = '"R$ "#,##0.00';
    summarySheet.getCell(`E${rowIndex}`).value = percentage;
    summarySheet.getCell(`E${rowIndex}`).numFmt = '0.0"%"';
    rowIndex++;
  });

  // Adicionar linha de total
  summarySheet.getCell(`A${rowIndex}`).value = 'TOTAL';
  summarySheet.getCell(`A${rowIndex}`).style = totalStyle;
  summarySheet.getCell(`B${rowIndex}`).value = payments.length;
  summarySheet.getCell(`B${rowIndex}`).style = totalStyle;
  summarySheet.getCell(`C${rowIndex}`).value = totalHours;
  summarySheet.getCell(`C${rowIndex}`).style = totalStyle;
  summarySheet.getCell(`C${rowIndex}`).numFmt = '#,##0.00 "h"';
  summarySheet.getCell(`D${rowIndex}`).value = totalAmount;
  summarySheet.getCell(`D${rowIndex}`).style = totalStyle;
  summarySheet.getCell(`D${rowIndex}`).numFmt = '"R$ "#,##0.00';
  summarySheet.getCell(`E${rowIndex}`).value = 100;
  summarySheet.getCell(`E${rowIndex}`).style = totalStyle;
  summarySheet.getCell(`E${rowIndex}`).numFmt = '0.0"%"';

  // Ajustar larguras das colunas
  summarySheet.columns = [
    { width: 30 }, // Funcionário
    { width: 15 }, // Pagamentos
    { width: 15 }, // Horas
    { width: 15 }, // Valor
    { width: 15 }, // Percentual
  ];

  // Adicionar uma planilha para os detalhes de pagamentos
  const detailsSheet = workbook.addWorksheet('Detalhes dos Pagamentos');

  // Título da planilha de detalhes
  detailsSheet.mergeCells('A1:G1');
  const detailsTitleCell = detailsSheet.getCell('A1');
  detailsTitleCell.value = 'Detalhes dos Pagamentos';
  detailsTitleCell.style = titleStyle;

  // Cabeçalhos da tabela de detalhes
  detailsSheet.getCell('A3').value = 'Data';
  detailsSheet.getCell('B3').value = 'Funcionário';
  detailsSheet.getCell('C3').value = 'Referência';
  detailsSheet.getCell('D3').value = 'Método';
  detailsSheet.getCell('E3').value = 'Horas';
  detailsSheet.getCell('F3').value = 'Valor';
  detailsSheet.getCell('G3').value = 'Status';
  
  ['A3', 'B3', 'C3', 'D3', 'E3', 'F3', 'G3'].forEach(cell => {
    detailsSheet.getCell(cell).style = headerStyle;
  });

  // Adicionar dados detalhados
  rowIndex = 4;
  payments
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .forEach(payment => {
      detailsSheet.getCell(`A${rowIndex}`).value = new Date(payment.date);
      detailsSheet.getCell(`A${rowIndex}`).numFmt = 'dd/mm/yyyy';
      detailsSheet.getCell(`B${rowIndex}`).value = payment.userName;
      detailsSheet.getCell(`C${rowIndex}`).value = payment.reference || payment.description || '-';
      detailsSheet.getCell(`D${rowIndex}`).value = translatePaymentMethod(payment.paymentMethod);
      detailsSheet.getCell(`E${rowIndex}`).value = payment.totalHours;
      detailsSheet.getCell(`E${rowIndex}`).numFmt = '#,##0.00 "h"';
      detailsSheet.getCell(`F${rowIndex}`).value = payment.amount;
      detailsSheet.getCell(`F${rowIndex}`).numFmt = '"R$ "#,##0.00';
      detailsSheet.getCell(`G${rowIndex}`).value = translateStatus(payment.status);
      rowIndex++;
    });

  // Ajustar larguras das colunas
  detailsSheet.columns = [
    { width: 15 }, // Data
    { width: 30 }, // Funcionário
    { width: 30 }, // Referência
    { width: 20 }, // Método
    { width: 15 }, // Horas
    { width: 15 }, // Valor
    { width: 15 }, // Status
  ];

  // Se houver detalhes de pagamentos com lançamentos, adicionar planilha específica
  if (paymentsDetails && paymentsDetails.length > 0) {
    // Adicionar uma planilha para os lançamentos
    const entriesSheet = workbook.addWorksheet('Lançamentos por Pagamento');
    
    // Título
    entriesSheet.mergeCells('A1:C1');
    const entriesTitleCell = entriesSheet.getCell('A1');
    entriesTitleCell.value = 'Detalhes de Lançamentos por Pagamento';
    entriesTitleCell.style = titleStyle;
    
    rowIndex = 3;
    
    paymentsDetails.forEach(payment => {
      // Adicionar cabeçalho de pagamento
      entriesSheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
      entriesSheet.getCell(`A${rowIndex}`).value = `Pagamento: ${payment.userName} - ${format(new Date(payment.date), 'dd/MM/yyyy', { locale: ptBR })}`;
      entriesSheet.getCell(`A${rowIndex}`).style = { font: { bold: true } };
      rowIndex++;
      
      entriesSheet.mergeCells(`A${rowIndex}:C${rowIndex}`);
      entriesSheet.getCell(`A${rowIndex}`).value = `Valor: ${formatCurrency(payment.amount)} | Referência: ${payment.reference || payment.description || '-'}`;
      rowIndex++;
      
      // Cabeçalhos da tabela de lançamentos
      entriesSheet.getCell(`A${rowIndex}`).value = 'Data';
      entriesSheet.getCell(`B${rowIndex}`).value = 'Horas';
      entriesSheet.getCell(`C${rowIndex}`).value = 'Valor';
      
      [`A${rowIndex}`, `B${rowIndex}`, `C${rowIndex}`].forEach(cell => {
        entriesSheet.getCell(cell).style = headerStyle;
      });
      
      rowIndex++;
      
      // Adicionar lançamentos
      payment.timeEntries.forEach(entry => {
        entriesSheet.getCell(`A${rowIndex}`).value = new Date(entry.date);
        entriesSheet.getCell(`A${rowIndex}`).numFmt = 'dd/mm/yyyy';
        entriesSheet.getCell(`B${rowIndex}`).value = entry.totalHours;
        entriesSheet.getCell(`B${rowIndex}`).numFmt = '#,##0.00 "h"';
        entriesSheet.getCell(`C${rowIndex}`).value = entry.amount;
        entriesSheet.getCell(`C${rowIndex}`).numFmt = '"R$ "#,##0.00';
        rowIndex++;
      });
      
      // Linha em branco entre os pagamentos
      rowIndex += 2;
    });
    
    // Ajustar larguras das colunas
    entriesSheet.columns = [
      { width: 15 }, // Data
      { width: 15 }, // Horas
      { width: 20 }, // Valor
    ];
  }

  // Gerar um arquivo binário
  const buffer = await workbook.xlsx.writeBuffer();
  
  // Criar um blob e fazer o download
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  const fileName = `Pagamentos_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.xlsx`;
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
}; 