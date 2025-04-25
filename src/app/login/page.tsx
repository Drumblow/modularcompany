'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';
import { UserRole } from '@/lib/utils';
import { devLog, devError } from '@/lib/logger';

// Componente separado que usa useSearchParams
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const registered = searchParams.get('registered');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(!!registered);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Função para login rápido como um papel específico
  const handleQuickLogin = async (role: string) => {
    setLoading(true);
    setError('');
    
    try {
      // Configurar email e senha conforme o papel
      let email, password;
      
      // Em produção, apenas permitir login rápido para desenvolvedor
      const isProd = process.env.NODE_ENV === 'production';
      
      if (isProd && role !== UserRole.DEVELOPER) {
        setError('Login rápido apenas disponível para desenvolvedor em produção');
        setLoading(false);
        return;
      }
      
      switch (role) {
        case UserRole.DEVELOPER:
          // Usar variáveis de ambiente em produção
          email = isProd 
            ? process.env.NEXT_PUBLIC_DEVELOPER_EMAIL || 'dev@example.com'
            : 'dev@example.com';
          password = 'dev123456'; // Manter a senha padrão para o exemplo
          break;
        case UserRole.ADMIN:
          email = 'admin@example.com';
          password = 'admin123456';
          break;
        case UserRole.MANAGER:
          email = 'manager@example.com';
          password = 'manager123456';
          break;
        case UserRole.EMPLOYEE:
          email = 'employee@example.com';
          password = 'employee123456';
          break;
        default:
          throw new Error('Papel inválido');
      }
      
      // Primeiro, configurar os usuários de demonstração (apenas em desenvolvimento)
      if (!isProd || role === UserRole.DEVELOPER) {
        try {
          // Obter um token de segurança da .env (deve ser configurado no servidor)
          // Em produção, este token deve ser complexo e armazenado como variável de ambiente
          const setupToken = process.env.NEXT_PUBLIC_SETUP_TOKEN || 'desenvolvimento-seguro';
          
          const setupResponse = await fetch('/api/setup-demo', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Setup-Security-Token': setupToken
            },
            body: JSON.stringify({
              requestedRole: role,
              clientInfo: {
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
              }
            })
          });
          
          if (!setupResponse.ok) {
            const errorData = await setupResponse.json();
            devError('Erro ao configurar usuários:', errorData);
            if (isProd) {
              setError('Erro ao configurar usuário do desenvolvedor. Contate o administrador do sistema.');
              setLoading(false);
              return;
            }
            // Em desenvolvimento, continue mesmo com erro
          }
        } catch (setupErr) {
          devError('Erro na configuração:', setupErr);
          // Continuar tentando login em desenvolvimento
          if (isProd) {
            setError('Erro na configuração inicial. Contate o administrador do sistema.');
            setLoading(false);
            return;
          }
        }
      }
      
      // Usando NextAuth para autenticação
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password
      });

      if (result?.error) {
        setError('Credenciais inválidas. Verifique se o banco de dados está configurado corretamente.');
        setLoading(false);
        return;
      }
      
      devLog('Login rápido bem-sucedido, obtendo sessão...');
      
      // Adicionar um pequeno atraso para garantir que a sessão seja atualizada
      setTimeout(async () => {
        try {
          // Obter a sessão atual para confirmar o papel real do usuário
          const response = await fetch('/api/auth/session');
          const session = await response.json();
          
          devLog('Sessão obtida:', session);
          
          if (session && session.user && session.user.role) {
            const userRole = session.user.role;
            devLog('Papel do usuário:', userRole);
            
            // Redirecionamento baseado no papel real do usuário
            switch (userRole) {
              case UserRole.DEVELOPER:
                router.push('/dashboard/developer');
                break;
              case UserRole.ADMIN:
                router.push('/dashboard/admin');
                break;
              case UserRole.MANAGER:
                router.push('/dashboard/manager');
                break;
              case UserRole.EMPLOYEE:
                router.push('/dashboard/employee');
                break;
              default:
                router.push('/dashboard');
            }
          } else {
            devError('Sessão inválida ou papel não encontrado:', session);
            router.push('/dashboard');
          }
        } catch (sessionErr) {
          devError('Erro ao obter sessão:', sessionErr);
          router.push('/dashboard');
        }
      }, 500);
    } catch (err) {
      devError('Erro de autenticação:', err);
      setError('Falha na autenticação. Verifique suas credenciais ou tente novamente mais tarde.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Usando NextAuth para autenticação real
      const result = await signIn('credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password
      });

      if (result?.error) {
        setError('Credenciais inválidas. Verifique seu email e senha.');
        return;
      }

      // Buscar a sessão atual para obter o papel do usuário
      // Isso garante que usamos o papel real do banco de dados
      devLog('Login bem-sucedido, obtendo sessão...');
      
      // Adicionar um pequeno atraso para garantir que a sessão seja atualizada
      setTimeout(async () => {
        try {
          // Obter a sessão após o login
          const response = await fetch('/api/auth/session');
          const session = await response.json();
          
          devLog('Sessão obtida:', session);
          
          if (session && session.user && session.user.role) {
            const userRole = session.user.role;
            devLog('Papel do usuário:', userRole);
            
            // Redirecionamento baseado no papel real do usuário
            switch (userRole) {
              case UserRole.DEVELOPER:
                router.push('/dashboard/developer');
                break;
              case UserRole.ADMIN:
                router.push('/dashboard/admin');
                break;
              case UserRole.MANAGER:
                router.push('/dashboard/manager');
                break;
              case UserRole.EMPLOYEE:
                router.push('/dashboard/employee');
                break;
              default:
                router.push('/dashboard');
            }
          } else {
            devError('Sessão inválida ou papel não encontrado:', session);
            router.push('/dashboard');
          }
        } catch (sessionErr) {
          devError('Erro ao obter sessão:', sessionErr);
          router.push('/dashboard');
        }
      }, 500);
    } catch (err) {
      devError('Erro de autenticação:', err);
      setError('Falha na autenticação. Verifique suas credenciais ou tente novamente mais tarde.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            ModularCompany
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Faça login para acessar o sistema
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Entre com suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="seu@email.com"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium">
                    Senha
                  </label>
                  <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                    Esqueceu a senha?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Sua senha"
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-500">{error}</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Não tem uma conta?{' '}
                  <Link href="/register" className="text-primary hover:underline">
                    Registre-se
                  </Link>
                </p>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Login rápido */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">{process.env.NODE_ENV === 'production' ? 'Login rápido para desenvolvedor' : 'Login rápido para teste'}</span>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            {/* Sempre mostrar o botão de desenvolvedor */}
            <button
              type="button"
              onClick={() => handleQuickLogin(UserRole.DEVELOPER)}
              disabled={loading}
              className="flex justify-center items-center px-4 py-2 border border-indigo-300 shadow-sm text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
            >
              Entrar como Desenvolvedor
            </button>
            
            {/* Mostrar apenas em desenvolvimento */}
            {process.env.NODE_ENV !== 'production' && (
              <>
                <button
                  type="button"
                  onClick={() => handleQuickLogin(UserRole.ADMIN)}
                  disabled={loading}
                  className="flex justify-center items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100"
                >
                  Entrar como Administrador
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin(UserRole.MANAGER)}
                  disabled={loading}
                  className="flex justify-center items-center px-4 py-2 border border-yellow-300 shadow-sm text-sm font-medium rounded-md text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
                >
                  Entrar como Gerente
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin(UserRole.EMPLOYEE)}
                  disabled={loading}
                  className="flex justify-center items-center px-4 py-2 border border-green-300 shadow-sm text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100"
                >
                  Entrar como Funcionário
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {showSuccessToast && (
        <Toast 
          message="Registro concluído com sucesso! Agora você pode fazer login."
          type="success"
          open={showSuccessToast}
          onClose={() => setShowSuccessToast(false)}
        />
      )}
    </div>
  );
}

// Componente principal envolvido com Suspense
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Carregando...</div>}>
      <LoginForm />
    </Suspense>
  );
} 