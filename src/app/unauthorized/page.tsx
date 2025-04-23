'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function UnauthorizedPage() {
  const { data: session } = useSession();

  // Determinar para onde direcionar o usuário com base no papel
  const getRedirectPath = () => {
    if (!session) return '/login';
    
    switch (session.user.role) {
      case 'DEVELOPER':
        return '/dashboard/developer';
      case 'ADMIN':
        return '/dashboard/admin';
      case 'MANAGER':
        return '/dashboard/manager';
      case 'EMPLOYEE':
      default:
        return '/dashboard/employee';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-red-600">Acesso Não Autorizado</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="mb-6">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="mx-auto h-16 w-16 text-red-500" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-3V6a3 3 0 00-3-3H6a3 3 0 00-3 3v12a3 3 0 003 3h12a3 3 0 003-3V9a3 3 0 00-3-3h-3m-3 3V6m3 3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            </div>
            <p className="mb-4 text-gray-700">
              Você não tem permissão para acessar esta página. Este recurso exige privilégios mais elevados.
            </p>
            <p className="mb-6 text-sm text-gray-500">
              Se você acredita que deveria ter acesso, entre em contato com seu administrador.
            </p>
            <div className="flex justify-center space-x-4">
              <Button asChild variant="outline">
                <Link href={getRedirectPath()}>
                  Voltar para o Dashboard
                </Link>
              </Button>
              <Button asChild>
                <Link href="/">
                  Página Inicial
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 