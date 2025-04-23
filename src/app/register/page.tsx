'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { UserRole } from '@/lib/utils';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validação básica
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      // Criar usuário através da API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: UserRole.EMPLOYEE, // Por padrão, novos usuários são funcionários
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Ocorreu um erro no registro');
      }

      // Redirecionando para a página de login após o registro
      router.push('/login?registered=true');
    } catch (err: any) {
      if (err.message.includes('email') && err.message.includes('unique')) {
        setError('Este email já está em uso. Tente outro ou faça login.');
      } else {
        setError(err.message || 'Falha no registro. Tente novamente mais tarde.');
      }
    } finally {
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
            Crie sua conta para acessar o sistema
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Registro</CardTitle>
            <CardDescription>
              Preencha os campos abaixo para criar sua conta
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Nome Completo
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Seu Nome Completo"
                />
              </div>

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
                <label htmlFor="password" className="text-sm font-medium">
                  Senha
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirmar Senha
                </label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
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
                {loading ? 'Registrando...' : 'Registrar'}
              </Button>
              <p className="text-center text-sm">
                Já tem uma conta?{' '}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Faça login
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>

        <div className="mt-4 text-center text-sm text-gray-600">
          <p>
            Para fins de demonstração, você pode criar uma conta e
            será registrado automaticamente como funcionário.
          </p>
          <p className="mt-1">
            Administradores, gerentes e desenvolvedores precisam ser
            registrados por usuários com permissões adequadas.
          </p>
        </div>
      </div>
    </div>
  );
} 