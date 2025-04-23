'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';
import { UserRole } from '@/lib/utils';

export default function LoginPage() {
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
      // Primeiro, configurar os usuários de demonstração
      const setupResponse = await fetch('/api/setup-demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!setupResponse.ok) {
        const errorData = await setupResponse.json();
        console.error('Erro ao configurar usuários de demo:', errorData);
        // Continuar mesmo com erro, pois os usuários podem já existir
      }
      
      // Configurar email e senha conforme o papel
      let email, password;
      
      switch (role) {
        case UserRole.DEVELOPER:
          email = 'dev@example.com';
          password = 'dev123456';
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
      
      // Usando NextAuth para autenticação
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password
      });

      if (result?.error) {
        setError('Credenciais inválidas. Verifique se o banco de dados está configurado corretamente.');
        return;
      }
      
      console.log('Login rápido bem-sucedido, obtendo sessão...');
      
      // Adicionar um pequeno atraso para garantir que a sessão seja atualizada
      setTimeout(async () => {
        try {
          // Obter a sessão atual para confirmar o papel real do usuário
          const response = await fetch('/api/auth/session');
          const session = await response.json();
          
          console.log('Sessão obtida:', session);
          
          if (session && session.user && session.user.role) {
            const userRole = session.user.role;
            console.log('Papel do usuário:', userRole);
            
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
            console.error('Sessão inválida ou papel não encontrado:', session);
            router.push('/dashboard');
          }
        } catch (sessionErr) {
          console.error('Erro ao obter sessão:', sessionErr);
          router.push('/dashboard');
        }
      }, 500);
    } catch (err) {
      console.error('Erro de autenticação:', err);
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
      console.log('Login bem-sucedido, obtendo sessão...');
      
      // Adicionar um pequeno atraso para garantir que a sessão seja atualizada
      setTimeout(async () => {
        try {
          // Obter a sessão após o login
          const response = await fetch('/api/auth/session');
          const session = await response.json();
          
          console.log('Sessão obtida:', session);
          
          if (session && session.user && session.user.role) {
            const userRole = session.user.role;
            console.log('Papel do usuário:', userRole);
            
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
            console.error('Sessão inválida ou papel não encontrado:', session);
            router.push('/dashboard');
          }
        } catch (sessionErr) {
          console.error('Erro ao obter sessão:', sessionErr);
          router.push('/dashboard');
        }
      }, 500);
    } catch (err) {
      console.error('Erro de autenticação:', err);
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
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-3">
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
              <p className="text-center text-sm">
                Não tem uma conta?{' '}
                <Link href="/register" className="font-medium text-primary hover:underline">
                  Registre-se
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>

        {/* Seção de login rápido para teste */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Login Rápido (Ambiente de Teste)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Use os botões abaixo para acessar o sistema com diferentes perfis
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin(UserRole.DEVELOPER)}
                disabled={loading}
              >
                Desenvolvedor
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin(UserRole.ADMIN)}
                disabled={loading}
              >
                Administrador
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin(UserRole.MANAGER)}
                disabled={loading}
              >
                Gerente
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin(UserRole.EMPLOYEE)}
                disabled={loading}
              >
                Funcionário
              </Button>
            </div>
            <div className="mt-3 pt-3 border-t text-center">
              <p className="text-xs text-muted-foreground">
                Se o login rápido não funcionar, você precisa inicializar o banco de dados:
              </p>
              <Link href="/setup" className="text-xs font-medium text-primary hover:underline">
                Configurar Usuários de Demo
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Toast
        message="Registro concluído com sucesso! Agora você pode fazer login."
        type="success"
        open={showSuccessToast}
        onClose={() => setShowSuccessToast(false)}
      />
    </div>
  );
} 