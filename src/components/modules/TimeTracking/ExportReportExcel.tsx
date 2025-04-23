import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TimeEntry } from '@/hooks/useTimeEntries';
import { formatCurrency } from '@/lib/utils';

// Interface para os dados formatados do relatório
interface ExportReportExcelProps {
  title: string;
  companyName?: string;
  startDate: string;
  endDate: string;
  entries: TimeEntry[];
  users: { id: string; name: string; hourlyRate?: number }[];
  totalHours: number;
  totalCost: number;
  hoursByUser: Record<string, number>;
  costByUser: Record<string, number>;
}

export const exportReportToExcel = async ({
  title,
  companyName = 'Modular Company',
  startDate,
  endDate,
  entries,
  users,
  totalHours,
  totalCost,
  hoursByUser,
  costByUser,
}: ExportReportExcelProps) => {
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
  
  // Adicionar período do relatório
  summarySheet.mergeCells('A2:E2');
  const periodCell = summarySheet.getCell('A2');
  const formattedStartDate = format(new Date(startDate), 'dd/MM/yyyy', { locale: ptBR });
  const formattedEndDate = format(new Date(endDate), 'dd/MM/yyyy', { locale: ptBR });
  periodCell.value = `Período: ${formattedStartDate} até ${formattedEndDate}`;
  periodCell.style = { alignment: { horizontal: 'center' as const } };

  // Adicionar totais gerais
  summarySheet.mergeCells('A4:C4');
  summarySheet.getCell('A4').value = 'Resumo Geral';
  summarySheet.getCell('A4').style = { font: { bold: true, size: 12 } };

  summarySheet.getCell('A5').value = 'Total de Registros';
  summarySheet.getCell('B5').value = entries.length;
  
  summarySheet.getCell('A6').value = 'Total de Horas';
  summarySheet.getCell('B6').value = totalHours;
  summarySheet.getCell('B6').numFmt = '#,##0.00 "h"';
  
  summarySheet.getCell('A7').value = 'Custo Total';
  summarySheet.getCell('B7').value = totalCost;
  summarySheet.getCell('B7').numFmt = '"CAD $"#,##0.00';

  // Adicionar tabela de resumo por usuário
  summarySheet.mergeCells('A9:D9');
  summarySheet.getCell('A9').value = 'Horas por Funcionário';
  summarySheet.getCell('A9').style = { font: { bold: true, size: 12 } };

  // Cabeçalhos da tabela de usuários
  summarySheet.getCell('A10').value = 'ID';
  summarySheet.getCell('B10').value = 'Nome';
  summarySheet.getCell('C10').value = 'Horas';
  summarySheet.getCell('D10').value = 'Custo';
  
  ['A10', 'B10', 'C10', 'D10'].forEach(cell => {
    summarySheet.getCell(cell).style = headerStyle;
  });

  // Adicionar dados dos usuários
  let rowIndex = 11;
  Object.entries(hoursByUser).forEach(([userId, hours]) => {
    const user = users.find((u) => u.id === userId) || { 
      name: 'Usuário Desconhecido', 
      hourlyRate: 0 
    };
    const cost = costByUser[userId] || 0;
    
    summarySheet.getCell(`A${rowIndex}`).value = userId;
    summarySheet.getCell(`B${rowIndex}`).value = user.name;
    summarySheet.getCell(`C${rowIndex}`).value = hours;
    summarySheet.getCell(`C${rowIndex}`).numFmt = '#,##0.00 "h"';
    summarySheet.getCell(`D${rowIndex}`).value = cost;
    summarySheet.getCell(`D${rowIndex}`).numFmt = '"CAD $"#,##0.00';
    rowIndex++;
  });

  // Adicionar linha de total
  summarySheet.getCell(`A${rowIndex}`).value = 'TOTAL';
  summarySheet.getCell(`A${rowIndex}`).style = totalStyle;
  summarySheet.getCell(`C${rowIndex}`).value = totalHours;
  summarySheet.getCell(`C${rowIndex}`).style = totalStyle;
  summarySheet.getCell(`C${rowIndex}`).numFmt = '#,##0.00 "h"';
  summarySheet.getCell(`D${rowIndex}`).value = totalCost;
  summarySheet.getCell(`D${rowIndex}`).style = totalStyle;
  summarySheet.getCell(`D${rowIndex}`).numFmt = '"CAD $"#,##0.00';

  // Ajustar larguras das colunas
  summarySheet.columns = [
    { width: 20 }, // ID
    { width: 30 }, // Nome
    { width: 15 }, // Horas
    { width: 15 }, // Custo
  ];

  // Adicionar uma planilha para os detalhes
  const detailsSheet = workbook.addWorksheet('Registros Detalhados');

  // Título da planilha de detalhes
  detailsSheet.mergeCells('A1:G1');
  const detailsTitleCell = detailsSheet.getCell('A1');
  detailsTitleCell.value = 'Registros Detalhados de Horas';
  detailsTitleCell.style = titleStyle;

  // Cabeçalhos da tabela de detalhes
  detailsSheet.getCell('A3').value = 'Data';
  detailsSheet.getCell('B3').value = 'Funcionário';
  detailsSheet.getCell('C3').value = 'Horário';
  detailsSheet.getCell('D3').value = 'Horas';
  detailsSheet.getCell('E3').value = 'Observação';
  detailsSheet.getCell('F3').value = 'Status';
  detailsSheet.getCell('G3').value = 'Custo';
  
  ['A3', 'B3', 'C3', 'D3', 'E3', 'F3', 'G3'].forEach(cell => {
    detailsSheet.getCell(cell).style = headerStyle;
  });

  // Adicionar dados detalhados
  rowIndex = 4;
  entries
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .forEach(entry => {
      const user = users.find((u) => u.id === entry.userId) || { 
        name: entry.userName || 'Desconhecido',
        hourlyRate: 0
      };
      const cost = (user.hourlyRate || 0) * entry.totalHours;
      
      detailsSheet.getCell(`A${rowIndex}`).value = new Date(entry.date);
      detailsSheet.getCell(`A${rowIndex}`).numFmt = 'dd/mm/yyyy';
      detailsSheet.getCell(`B${rowIndex}`).value = user.name;
      detailsSheet.getCell(`C${rowIndex}`).value = `${entry.startTime} - ${entry.endTime}`;
      detailsSheet.getCell(`D${rowIndex}`).value = entry.totalHours;
      detailsSheet.getCell(`D${rowIndex}`).numFmt = '#,##0.00 "h"';
      detailsSheet.getCell(`E${rowIndex}`).value = entry.observation || '';
      
      // Status de aprovação
      let statusText = 'Pendente';
      if (entry.approved) statusText = 'Aprovado';
      if (entry.rejected) statusText = 'Rejeitado';
      detailsSheet.getCell(`F${rowIndex}`).value = statusText;
      
      // Custo
      detailsSheet.getCell(`G${rowIndex}`).value = cost;
      detailsSheet.getCell(`G${rowIndex}`).numFmt = '"CAD $"#,##0.00';
      
      rowIndex++;
    });

  // Ajustar larguras das colunas
  detailsSheet.columns = [
    { width: 15 }, // Data
    { width: 25 }, // Funcionário
    { width: 20 }, // Horário
    { width: 10 }, // Horas
    { width: 50 }, // Observação
    { width: 12 }, // Status
    { width: 15 }, // Custo
  ];

  // Gerar um arquivo binário
  const buffer = await workbook.xlsx.writeBuffer();
  
  // Criar um blob e fazer o download
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  const fileName = `Time_Report_${format(new Date(), 'yyyy-MM-dd', { locale: ptBR })}.xlsx`;
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
}; 