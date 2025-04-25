'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { TimeEntryList } from '@/components/modules/TimeTracking/TimeEntryList';
import { TimeEntryReport } from '@/components/modules/TimeTracking/TimeEntryReport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { devLog, devWarn, devError } from '@/lib/logger';

// Definir interfaces para tipos de dados
interface User {
  id: string;
  name: string;
  hourlyRate?: number;
  [key: string]: any;
}

interface TimeEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  observation?: string;
  userId: string;
  userName: string;
  userEmail?: string;
  hourlyRate?: number;
  companyId?: string;
  companyName?: string;
  createdAt: string;
  updatedAt: string;
  approved?: boolean;
  rejected?: boolean;
  rejectionReason?: string;
  project?: string;
  [key: string]: any;
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeModules, setActiveModules] = useState({ count: 1, names: ['Controle de Horas'] });
  
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Buscar usuários
        const usersResponse = await fetch('/api/users');
        if (!usersResponse.ok) {
          throw new Error('Erro ao carregar usuários');
        }
        const usersData = await usersResponse.json();
        setUsers(usersData);
        
        // Buscar registros de horas
        const entriesResponse = await fetch('/api/time-entries');
        if (!entriesResponse.ok) {
          throw new Error('Erro ao carregar registros de horas');
        }
        const entriesData = await entriesResponse.json();
        setTimeEntries(entriesData);
        
        // No futuro, podemos implementar um endpoint para módulos ativos
        // Por enquanto, deixamos fixo com o módulo de horas
        
      } catch (err: any) {
        devError('Erro ao carregar dados:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    if (session) {
      fetchData();
    }
  }, [session]);
  
  // Calcular total de horas registradas
  const totalHours = timeEntries.reduce((acc, entry) => acc + entry.totalHours, 0);
  
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

      {loading ? (
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="h-20 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="h-20 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="h-20 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
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
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">
                Total de funcionários ativos
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
                {totalHours.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Horas totais registradas
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
              <div className="text-2xl font-bold">{activeModules.count}</div>
              <p className="text-xs text-muted-foreground">
                {activeModules.names.join(', ')}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        <TimeEntryList />
        <Card>
          <CardHeader>
            <CardTitle>Funcionários e Taxas Horárias</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-6 flex justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : users.length > 0 ? (
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{user.name}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        {(user.hourlyRate || 0).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                        /hora
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground">Nenhum funcionário encontrado.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <TimeEntryReport entries={timeEntries} users={users} />
    </div>
  );
} 