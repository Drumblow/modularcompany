'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { TimeEntry } from '@/hooks/useTimeEntries';
import { Toast } from '@/components/ui/Toast';
import { LocalDate } from '@/components/ui/LocalDate';
import { ExportReportButton } from './ExportReportButton';
import { useSession } from 'next-auth/react';

interface TimeEntryReportProps {
  entries: TimeEntry[];
  users?: { id: string; name: string; hourlyRate?: number }[];
}

export function TimeEntryReport({ entries, users = [] }: TimeEntryReportProps) {
  const { data: session } = useSession();
  const [startDate, setStartDate] = useState<string>(
    format(startOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState<string>(
    format(endOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('approved');

  // Garantir que ao abrir a página, sempre comece com filtro de aprovados
  useEffect(() => {
    setStatusFilter('approved');
  }, []);

  // Obter o nome da empresa do primeiro registro, se disponível
  const companyName = entries.length > 0 && entries[0].companyName 
    ? entries[0].companyName 
    : 'Modular Company';

  // Obter o nome do funcionário selecionado, se aplicável
  const selectedUserName = selectedUserId !== 'all'
    ? users.find(user => user.id === selectedUserId)?.name || 'Desconhecido'
    : 'Todos os Funcionários';

  // Filtrar entradas pelo período selecionado, funcionário selecionado e status
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const entryDate = new Date(entry.date);
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      const dateFilter = entryDate >= start && entryDate <= end;
      
      // Aplicar filtro por usuário se não for "todos"
      const userFilter = selectedUserId === 'all' || entry.userId === selectedUserId;
      
      // Aplicar filtro de status
      let statusFilterResult = true;
      if (statusFilter === 'approved') {
        statusFilterResult = entry.approved === true;
      } else if (statusFilter === 'pending') {
        statusFilterResult = entry.approved === null && entry.rejected !== true;
      } else if (statusFilter === 'rejected') {
        statusFilterResult = entry.rejected === true;
      } else if (statusFilter === 'all') {
        statusFilterResult = true; // Mostrar todos independente do status
      }
      
      return dateFilter && userFilter && statusFilterResult;
    });
  }, [entries, startDate, endDate, selectedUserId, statusFilter]);

  // Calcular o total de horas por usuário
  const hoursByUser = filteredEntries.reduce<Record<string, number>>((acc, entry) => {
    const { userId, totalHours } = entry;
    acc[userId] = (acc[userId] || 0) + totalHours;
    return acc;
  }, {});

  // Calcular o custo por usuário (baseado na taxa horária)
  const costByUser = filteredEntries.reduce<Record<string, number>>((acc, entry) => {
    const { userId, totalHours } = entry;
    const user = users.find((u) => u.id === userId);
    const hourlyRate = user?.hourlyRate || 0;
    acc[userId] = (acc[userId] || 0) + totalHours * hourlyRate;
    return acc;
  }, {});

  // Calcular o total de horas por dia
  const hoursByDay = filteredEntries.reduce<Record<string, number>>((acc, entry) => {
    const { date, totalHours } = entry;
    acc[date] = (acc[date] || 0) + totalHours;
    return acc;
  }, {});

  // Calcular o total geral de horas e custo
  const totalHours = Object.values(hoursByUser).reduce((sum, hours) => sum + hours, 0);
  const totalCost = Object.values(costByUser).reduce((sum, cost) => sum + cost, 0);

  // Calcular contadores de status para exibição independente do filtro selecionado
  const approvedCount = useMemo(() => 
    entries.filter(entry => 
      entry.approved === true && 
      new Date(entry.date) >= parseISO(startDate) && 
      new Date(entry.date) <= parseISO(endDate) && 
      (selectedUserId === 'all' || entry.userId === selectedUserId)
    ).length, 
    [entries, startDate, endDate, selectedUserId]
  );

  const pendingCount = useMemo(() => 
    entries.filter(entry => 
      entry.approved === null && 
      entry.rejected !== true && 
      new Date(entry.date) >= parseISO(startDate) && 
      new Date(entry.date) <= parseISO(endDate) && 
      (selectedUserId === 'all' || entry.userId === selectedUserId)
    ).length, 
    [entries, startDate, endDate, selectedUserId]
  );

  const rejectedCount = useMemo(() => 
    entries.filter(entry => 
      entry.rejected === true && 
      new Date(entry.date) >= parseISO(startDate) && 
      new Date(entry.date) <= parseISO(endDate) && 
      (selectedUserId === 'all' || entry.userId === selectedUserId)
    ).length, 
    [entries, startDate, endDate, selectedUserId]
  );

  // Substituir a função exportReport anterior pelo ExportReportButton
  const handleExportSuccess = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
  };

  const handleExportError = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-6">Relatório de Horas</h2>
        
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
            <div className="flex space-x-2">
              <input
                type="date"
                className="form-input rounded-md shadow-sm w-full"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <input
                type="date"
                className="form-input rounded-md shadow-sm w-full"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Funcionário</label>
            <select
              className="form-select rounded-md shadow-sm w-full"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="all">Todos</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="form-select rounded-md shadow-sm w-full"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="approved">Aprovados</option>
              <option value="pending">Pendentes</option>
              <option value="rejected">Rejeitados</option>
              <option value="all">Todos</option>
            </select>
          </div>
        </div>
        
        {/* Status counters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div 
            className={`p-3 bg-green-100 rounded-lg flex items-center justify-between cursor-pointer ${statusFilter === 'approved' ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => setStatusFilter('approved')}
          >
            <span>Aprovados:</span>
            <span className="font-bold">{approvedCount}</span>
          </div>
          <div 
            className={`p-3 bg-yellow-100 rounded-lg flex items-center justify-between cursor-pointer ${statusFilter === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            <span>Pendentes:</span>
            <span className="font-bold">{pendingCount}</span>
          </div>
          <div 
            className={`p-3 bg-red-100 rounded-lg flex items-center justify-between cursor-pointer ${statusFilter === 'rejected' ? 'ring-2 ring-red-500' : ''}`}
            onClick={() => setStatusFilter('rejected')}
          >
            <span>Rejeitados:</span>
            <span className="font-bold">{rejectedCount}</span>
          </div>
        </div>

        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">
              {selectedUserId === 'all'
                ? 'Relatório de Horas Trabalhadas'
                : `Relatório de Horas - ${selectedUserName}`}
            </CardTitle>
            <ExportReportButton
              title={selectedUserId === 'all'
                ? 'Relatório de Horas Trabalhadas'
                : `Relatório de Horas - ${selectedUserName}`}
              startDate={startDate}
              endDate={endDate}
              entries={filteredEntries}
              users={users}
              totalHours={totalHours}
              totalCost={totalCost}
              hoursByUser={hoursByUser}
              costByUser={costByUser}
              onExportSuccess={handleExportSuccess}
              onExportError={handleExportError}
              companyName={companyName}
            />
          </CardHeader>
          <CardContent>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-lg border bg-card p-3">
                <div className="text-xs font-medium text-muted-foreground">Total de Registros</div>
                <div className="mt-1 text-2xl font-bold">{filteredEntries.length}</div>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <div className="text-xs font-medium text-muted-foreground">Horas Totais</div>
                <div className="mt-1 text-2xl font-bold">{totalHours.toFixed(2)}</div>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <div className="text-xs font-medium text-muted-foreground">Média Diária</div>
                <div className="mt-1 text-2xl font-bold">
                  {Object.keys(hoursByDay).length > 0
                    ? (totalHours / Object.keys(hoursByDay).length).toFixed(2)
                    : '0.00'}
                </div>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <div className="text-xs font-medium text-muted-foreground">Custo Total ($ CAD)</div>
                <div className="mt-1 text-2xl font-bold">{totalCost.toFixed(2)}</div>
              </div>
            </div>

            {Object.entries(hoursByUser).length > 0 && (
              <div className="mt-6">
                <h4 className="mb-3 text-sm font-medium">Horas por Funcionário</h4>
                <div className="space-y-2">
                  {Object.entries(hoursByUser).map(([userId, hours]) => {
                    const user = users.find((u) => u.id === userId);
                    const cost = costByUser[userId] || 0;
                    const percentage = totalHours > 0 ? (hours / totalHours) * 100 : 0;

                    return (
                      <div key={userId} className="flex flex-col space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{user?.name || 'Usuário Desconhecido'}</span>
                          <span className="font-medium">{hours.toFixed(2)} horas</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-primary/20">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-xs text-right text-muted-foreground">
                          Custo: $ CAD {cost.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredEntries.length > 0 && (
              <div className="mt-6">
                <h4 className="mb-3 text-sm font-medium">Registros Detalhados</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 text-left font-medium">Data</th>
                        <th className="py-2 text-left font-medium">Funcionário</th>
                        <th className="py-2 text-left font-medium">Horário</th>
                        <th className="py-2 text-right font-medium">Horas</th>
                        <th className="py-2 text-right font-medium">Custo</th>
                        <th className="py-2 text-center font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEntries
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 10) // Limitar a 10 registros para não sobrecarregar a visualização
                        .map((entry) => {
                          const user = users.find((u) => u.id === entry.userId) || { 
                            name: entry.userName || 'Desconhecido',
                            hourlyRate: 0
                          };
                          const cost = (user.hourlyRate || 0) * entry.totalHours;

                          // Determinar o status do registro
                          let statusLabel = "";
                          let statusClass = "";
                          
                          if (entry.approved === true) {
                            statusLabel = "Aprovado";
                            statusClass = "bg-green-100 text-green-800";
                          } else if (entry.rejected === true) {
                            statusLabel = "Rejeitado";
                            statusClass = "bg-red-100 text-red-800";
                          } else {
                            statusLabel = "Pendente";
                            statusClass = "bg-yellow-100 text-yellow-800";
                          }

                          return (
                            <tr key={entry.id} className="border-b hover:bg-muted/50">
                              <td className="py-2">
                                <LocalDate date={`${entry.date}T00:00:00`} formatString="dd/MM/yyyy" />
                              </td>
                              <td className="py-2">{user.name}</td>
                              <td className="py-2">
                                {entry.startTime} - {entry.endTime}
                              </td>
                              <td className="py-2 text-right">{entry.totalHours.toFixed(2)}</td>
                              <td className="py-2 text-right">$ CAD {cost.toFixed(2)}</td>
                              <td className="py-2 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                                  {statusLabel}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                    {filteredEntries.length > 10 && (
                      <tfoot>
                        <tr>
                          <td colSpan={5} className="py-2 text-center text-xs text-muted-foreground">
                            Mostrando 10 de {filteredEntries.length} registros. Exporte o relatório para visualizar todos.
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {filteredEntries.length === 0 && (
              <div className="mt-6 rounded-md bg-muted p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Não há registros de horas para o período selecionado.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Toast
        message={toastMessage}
        type="success"
        open={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
} 