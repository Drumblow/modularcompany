'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Toast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { TimeEntry } from '@/hooks/useTimeEntries';
import { LocalDate, LocalTime } from '@/components/ui/LocalDate';
import { ExportReportButton } from './ExportReportButton';

interface TimeEntryApprovalProps {
  entries: TimeEntry[];
  onApprove: (entryIds: string[]) => Promise<void>;
  onReject: (entryId: string, reason: string) => Promise<void>;
  userRole?: string;
  userCompanyId?: string | null;
}

export function TimeEntryApproval({ 
  entries, 
  onApprove, 
  onReject, 
  userRole, 
  userCompanyId 
}: TimeEntryApprovalProps) {
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [openRejectDialog, setOpenRejectDialog] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [filter, setFilter] = useState('pending'); // 'pending', 'approved', 'rejected'

  // Filtrar entradas com base no status
  const filteredEntries = entries.filter(entry => {
    if (filter === 'pending') return !entry.approved && !entry.rejected;
    if (filter === 'approved') return entry.approved;
    if (filter === 'rejected') return entry.rejected;
    return true;
  });

  // Limpar a seleção quando mudamos de filtro ou quando as entradas mudam
  useEffect(() => {
    setSelectedEntries([]);
  }, [filter, entries]);

  const handleToggleSelect = (entryId: string) => {
    setSelectedEntries(prev => {
      const isSelected = prev.includes(entryId);
      if (isSelected) {
        return prev.filter(id => id !== entryId);
      } else {
        return [...prev, entryId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedEntries.length === filteredEntries.length) {
      setSelectedEntries([]);
    } else {
      setSelectedEntries(filteredEntries.map(entry => entry.id));
    }
  };

  const handleApproveSelected = async () => {
    if (selectedEntries.length === 0) {
      setToastMessage('Selecione pelo menos um registro para aprovar');
      setToastType('error');
      setShowToast(true);
      return;
    }

    setProcessing(true);
    try {
      await onApprove(selectedEntries);
      setToastMessage(`${selectedEntries.length} registro(s) aprovado(s) com sucesso`);
      setToastType('success');
      setShowToast(true);
      setSelectedEntries([]);
    } catch (error) {
      setToastMessage('Erro ao aprovar registros');
      setToastType('error');
      setShowToast(true);
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectEntry = async () => {
    if (!openRejectDialog) return;
    
    setProcessing(true);
    try {
      await onReject(openRejectDialog, rejectReason);
      setToastMessage('Registro rejeitado com sucesso');
      setToastType('success');
      setShowToast(true);
      setOpenRejectDialog(null);
      setRejectReason('');
    } catch (error) {
      setToastMessage('Erro ao rejeitar registro');
      setToastType('error');
      setShowToast(true);
    } finally {
      setProcessing(false);
    }
  };

  const pendingCount = entries.filter(e => !e.approved && !e.rejected).length;
  const approvedCount = entries.filter(e => e.approved).length;
  const rejectedCount = entries.filter(e => e.rejected).length;

  // Função para exibir o modal de rejeição
  const openRejectModal = (entryId: string) => {
    setOpenRejectDialog(entryId);
    setRejectReason('');
  };

  // Função para fechar o modal de rejeição
  const closeRejectModal = () => {
    setOpenRejectDialog(null);
    setRejectReason('');
  };

  // Função para verificar se o usuário pode aprovar um registro específico
  const canApproveEntry = (entry: TimeEntry) => {
    // Administradores e desenvolvedores podem aprovar qualquer registro
    if (userRole === 'ADMIN' || userRole === 'DEVELOPER') return true;
    
    // Managers só podem aprovar registros de sua própria empresa
    if (userRole === 'MANAGER') {
      return entry.companyId === userCompanyId;
    }
    
    // Outros usuários não podem aprovar
    return false;
  };

  // Dados para exportação
  const hoursByUser = filteredEntries.reduce<Record<string, number>>((acc, entry) => {
    const { userId, totalHours } = entry;
    acc[userId] = (acc[userId] || 0) + totalHours;
    return acc;
  }, {});

  const costByUser = filteredEntries.reduce<Record<string, number>>((acc, entry) => {
    const { userId, totalHours } = entry;
    const hourlyRate = 0; // Idealmente, isso viria do objeto user
    acc[userId] = (acc[userId] || 0) + totalHours * hourlyRate;
    return acc;
  }, {});

  const totalHours = Object.values(hoursByUser).reduce((sum, hours) => sum + hours, 0);
  const totalCost = Object.values(costByUser).reduce((sum, cost) => sum + cost, 0);

  const handleExportSuccess = (message: string) => {
    setToastMessage(message);
    setToastType('success');
    setShowToast(true);
  };

  const handleExportError = (message: string) => {
    setToastMessage(message);
    setToastType('error');
    setShowToast(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Aprovação de Horas</span>
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                variant={filter === 'pending' ? 'default' : 'outline'}
                onClick={() => setFilter('pending')}
              >
                Pendentes ({pendingCount})
              </Button>
              <Button 
                size="sm" 
                variant={filter === 'approved' ? 'default' : 'outline'}
                onClick={() => setFilter('approved')}
              >
                Aprovados ({approvedCount})
              </Button>
              <Button 
                size="sm" 
                variant={filter === 'rejected' ? 'default' : 'outline'}
                onClick={() => setFilter('rejected')}
              >
                Rejeitados ({rejectedCount})
              </Button>
              <ExportReportButton
                title={`Relatório de Horas - ${filter === 'pending' ? 'Pendentes' : filter === 'approved' ? 'Aprovadas' : 'Rejeitadas'}`}
                startDate={new Date().toISOString().split('T')[0]}
                endDate={new Date().toISOString().split('T')[0]}
                entries={filteredEntries}
                users={[]}
                totalHours={totalHours}
                totalCost={totalCost}
                hoursByUser={hoursByUser}
                costByUser={costByUser}
                onExportSuccess={handleExportSuccess}
                onExportError={handleExportError}
              />
            </div>
          </CardTitle>
          <CardDescription>
            Revise e aprove os registros de horas dos funcionários
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEntries.length > 0 ? (
            <div className="space-y-4">
              {filter === 'pending' && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="select-all" 
                      checked={selectedEntries.length > 0 && selectedEntries.length === filteredEntries.length}
                      onCheckedChange={() => handleSelectAll()}
                    />
                    <label htmlFor="select-all" className="text-sm font-medium">
                      Selecionar todos
                    </label>
                  </div>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleApproveSelected}
                    disabled={processing || selectedEntries.length === 0}
                  >
                    {processing ? 'Processando...' : 'Aprovar Selecionados'}
                  </Button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {filter === 'pending' && (
                        <th className="w-10 py-3 text-left">
                          <span className="sr-only">Selecionar</span>
                        </th>
                      )}
                      <th className="py-3 text-left font-medium">Data</th>
                      <th className="py-3 text-left font-medium">Funcionário</th>
                      {userRole === 'MANAGER' && (
                        <th className="py-3 text-left font-medium">Empresa</th>
                      )}
                      <th className="py-3 text-left font-medium">Projeto</th>
                      <th className="py-3 text-left font-medium">Horário</th>
                      <th className="py-3 text-right font-medium">Horas</th>
                      {filter === 'rejected' && (
                        <th className="py-3 text-left font-medium">Motivo da Rejeição</th>
                      )}
                      {filter === 'pending' && (
                        <th className="py-3 text-center font-medium">Ações</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry) => {
                      const canApprove = canApproveEntry(entry);
                      return (
                        <tr key={entry.id} className={`border-b hover:bg-muted/50 ${!canApprove && filter === 'pending' ? 'bg-red-50' : ''}`}>
                          {filter === 'pending' && (
                            <td className="py-3">
                              <Checkbox 
                                checked={selectedEntries.includes(entry.id)}
                                onCheckedChange={() => canApprove && handleToggleSelect(entry.id)}
                                disabled={!canApprove}
                              />
                            </td>
                          )}
                          <td className="py-3">
                            <LocalDate date={`${entry.date}T00:00:00`} formatString="dd/MM/yyyy" />
                          </td>
                          <td className="py-3">{entry.userName}</td>
                          {userRole === 'MANAGER' && (
                            <td className="py-3">
                              <span className={`${entry.companyId === userCompanyId ? 'text-green-600' : 'text-red-600'}`}>
                                {entry.companyName || 'Não especificada'}
                              </span>
                            </td>
                          )}
                          <td className="py-3">{entry.project || 'Não especificado'}</td>
                          <td className="py-3">
                            <LocalTime time={entry.startTime} /> - <LocalTime time={entry.endTime} />
                          </td>
                          <td className="py-3 text-right">{entry.totalHours.toFixed(2)}</td>
                          {filter === 'rejected' && (
                            <td className="py-3 text-left text-red-500">
                              {entry.rejectionReason || 'Não especificado'}
                            </td>
                          )}
                          {filter === 'pending' && (
                            <td className="py-3 text-center">
                              <div className="flex justify-center space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={async () => {
                                    setProcessing(true);
                                    try {
                                      await onApprove([entry.id]);
                                      setToastMessage('Registro aprovado com sucesso');
                                      setToastType('success');
                                      setShowToast(true);
                                    } catch (error) {
                                      setToastMessage('Erro ao aprovar registro');
                                      setToastType('error');
                                      setShowToast(true);
                                    } finally {
                                      setProcessing(false);
                                    }
                                  }}
                                  disabled={processing || !canApprove}
                                  title={!canApprove ? 'Você não tem permissão para aprovar este registro' : ''}
                                >
                                  {processing ? 'Processando...' : 'Aprovar'}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => openRejectModal(entry.id)}
                                  disabled={processing || !canApprove}
                                  title={!canApprove ? 'Você não tem permissão para rejeitar este registro' : ''}
                                >
                                  Rejeitar
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">
                {filter === 'pending'
                  ? 'Não há registros pendentes de aprovação'
                  : filter === 'approved'
                  ? 'Não há registros aprovados'
                  : 'Não há registros rejeitados'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de rejeição */}
      {openRejectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-4 text-lg font-medium">Motivo da Rejeição</h3>
            <div className="mb-4">
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Informe o motivo da rejeição"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={closeRejectModal}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectEntry}
                disabled={!rejectReason.trim() || processing}
              >
                {processing ? 'Processando...' : 'Rejeitar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de notificação */}
      <Toast
        message={toastMessage}
        type={toastType}
        open={showToast}
        onClose={() => setShowToast(false)}
      />
    </>
  );
} 