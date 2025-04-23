export { ExportPaymentReportButton } from './ExportPaymentReportButton';

// Funções de exportação
export { exportPaymentReportToPDF } from './ExportPaymentReportPDF';
export { exportPaymentReportToExcel } from './ExportPaymentReportExcel';

// Interfaces comuns
export interface Payment {
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

export interface TimeEntry {
  id: string;
  date: string;
  totalHours: number;
  amount: number;
}

export interface PaymentWithTimeEntries extends Payment {
  timeEntries: TimeEntry[];
} 