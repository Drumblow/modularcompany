'use client';

import { useSession } from 'next-auth/react';
import { TimeEntryList } from '@/components/modules/TimeTracking/TimeEntryList';
import { TimeEntryReport } from '@/components/modules/TimeTracking/TimeEntryReport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

// Dados de exemplo para demonstração
const mockTimeEntries = [
  {
    id: '1',
    date: '2025-02-28',
    startTime: '08:00',
    endTime: '15:00',
    totalHours: 7,
    observation: 'Trabalhei no projeto X',
    userId: 'user-1',
    userName: 'João Silva',
    createdAt: '2025-02-28T15:00:00Z',
    updatedAt: '2025-02-28T15:00:00Z',
  },
  {
    id: '2',
    date: '2025-02-27',
    startTime: '09:00',
    endTime: '18:00',
    totalHours: 9,
    observation: 'Reunião com cliente',
    userId: 'user-1',
    userName: 'João Silva',
    createdAt: '2025-02-27T18:00:00Z',
    updatedAt: '2025-02-27T18:00:00Z',
  },
  {
    id: '3',
    date: '2025-02-28',
    startTime: '08:30',
    endTime: '17:30',
    totalHours: 9,
    observation: 'Desenvolvimento de features',
    userId: 'user-2',
    userName: 'Maria Oliveira',
    createdAt: '2025-02-28T17:30:00Z',
    updatedAt: '2025-02-28T17:30:00Z',
  },
];

// Dados de exemplo de usuários
const mockUsers = [
  {
    id: 'user-1',
    name: 'João Silva',
    hourlyRate: 50,
  },
  {
    id: 'user-2',
    name: 'Maria Oliveira',
    hourlyRate: 60,
  },
];

export default function AdminDashboard() {
  const { data: session } = useSession();
  
  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard do Administrador</h2>
        <p className="text-muted-foreground">
          Gerencie sua empresa, funcionários e módulos.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <Link href="/dashboard/admin/users">
          <Button>Gerenciar Usuários</Button>
        </Link>
        <Link href="/dashboard/admin/time-entries">
          <Button>Gestão de Horas</Button>
        </Link>
        <Link href="/dashboard/admin/payments">
          <Button>Pagamentos</Button>
        </Link>
        <Link href="/dashboard/admin/reports">
          <Button>Relatórios</Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Funcionários</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockUsers.length}</div>
            <p className="text-xs text-muted-foreground">
              +2 desde o último mês
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Registradas</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockTimeEntries.reduce((acc, entry) => acc + entry.totalHours, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              +20% desde a semana passada
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Módulos Ativos</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">
              Controle de Horas
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        <TimeEntryList />
        <Card>
          <CardHeader>
            <CardTitle>Funcionários e Taxas Horárias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="font-medium">{user.name}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">
                      {user.hourlyRate.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                      /hora
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <TimeEntryReport entries={mockTimeEntries} users={mockUsers} />
    </div>
  );
} 