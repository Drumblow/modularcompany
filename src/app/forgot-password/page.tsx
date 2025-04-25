'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { devLog, devWarn, devError } from '@/lib/logger';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Aqui seria implementada a lógica real de recuperação de senha
      // Por enquanto, vamos apenas simular um envio bem-sucedido
      
      // Simulando um atraso de rede
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      setSubmitted(true);
    } catch (err) {
      devError('Erro ao enviar email de recuperação:', err);
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
            Recuperação de senha
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Esqueceu sua senha?</CardTitle>
            <CardDescription>
              {!submitted 
                ? 'Informe seu email para receber instruções de recuperação de senha'
                : 'Verifique seu email para instruções de recuperação de senha'}
            </CardDescription>
          </CardHeader>
          
          {!submitted ? (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Enviando...' : 'Enviar instruções'}
                </Button>
                <p className="text-center text-sm">
                  Lembrou sua senha?{' '}
                  <Link href="/login" className="font-medium text-primary hover:underline">
                    Voltar para o login
                  </Link>
                </p>
              </CardFooter>
            </form>
          ) : (
            <CardContent className="space-y-4">
              <div className="rounded-md bg-green-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">
                      Email enviado com sucesso!
                    </p>
                    <p className="mt-2 text-sm text-green-700">
                      Enviamos um email para {email} com instruções para recuperar sua senha.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <Link href="/login">
                  <Button variant="outline" className="mt-4">
                    Voltar para o login
                  </Button>
                </Link>
              </div>
            </CardContent>
          )}
        </Card>

        <div className="mt-4 text-center text-sm text-gray-600">
          <p>
            Nota: Este é um ambiente de demonstração.
          </p>
          <p className="mt-1">
            Nenhum email será realmente enviado.
          </p>
        </div>
      </div>
    </div>
  );
} 