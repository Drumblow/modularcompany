'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';
import { devLog, devWarn, devError } from '@/lib/logger';

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const setupDemoUsers = async () => {
    setLoading(true);
    setError('');
    setMessage('Configurando usuários de demonstração...');
    
    try {
      const response = await fetch('/api/setup-demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao configurar usuários');
      }
      
      setMessage(`Configuração concluída! ${data.users.length} usuários foram configurados.`);
      setSuccess(true);
      setShowToast(true);
      
      // Redirecionar para a página de login após 2 segundos
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      devError('Erro na configuração:', err);
      setError(err.message || 'Ocorreu um erro durante a configuração');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Configuração do Sistema
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Configure o ambiente de demonstração com usuários de teste
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Inicializar Usuários de Demonstração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Clique no botão abaixo para criar usuários de teste com diferentes perfis:
            </p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>Desenvolvedor (dev@example.com)</li>
              <li>Administrador (admin@example.com)</li>
              <li>Gerente (manager@example.com)</li>
              <li>Funcionário (employee@example.com)</li>
            </ul>
            <p className="text-sm text-gray-600">
              A senha para todos os usuários é o nome do perfil seguido de "123456" 
              (ex: dev123456, admin123456)
            </p>
            
            {message && (
              <div className="rounded-md bg-blue-50 p-3">
                <p className="text-sm text-blue-700">{message}</p>
              </div>
            )}
            
            {error && (
              <div className="rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}
            
            <div className="pt-4">
              <Button
                onClick={setupDemoUsers}
                disabled={loading || success}
                className="w-full"
              >
                {loading ? 'Configurando...' : success ? 'Configurado!' : 'Inicializar Sistema'}
              </Button>
            </div>
            
            {success && (
              <div className="pt-2 text-center">
                <p className="text-sm text-gray-600">
                  Você será redirecionado para a página de login em instantes...
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 text-center">
          <Button
            variant="outline"
            onClick={() => router.push('/login')}
          >
            Voltar para Login
          </Button>
        </div>
      </div>
      
      <Toast
        message="Configuração concluída com sucesso!"
        type="success"
        open={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
} 