import { NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import prisma from '@/lib/prisma';
import { SignJWT } from 'jose';

export async function POST(req: Request) {
  try {
    // Configura cabeçalhos CORS para permitir requisições de qualquer origem
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Extrai as credenciais do corpo da requisição
    const body = await req.json();
    const { email, password } = body;

    // Validação básica
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Busca o usuário pelo email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Se não encontrar o usuário ou a senha estiver incorreta
    if (!user) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Verifica se a senha está correta
    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Cria token JWT usando jose (mais leve que jsonwebtoken)
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    
    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    // Log de sucesso
    console.log('Mobile auth - Login bem-sucedido:', {
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Retorna os dados do usuário e o token
    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId
      }
    }, { headers: corsHeaders });
    
  } catch (error) {
    // Log de erro
    console.error('Mobile auth - Erro no login:', error);
    
    // Retorna erro genérico
    return NextResponse.json(
      { error: 'Erro ao processar a solicitação' },
      { status: 500, headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }}
    );
  }
}

// Responde às solicitações de preflight OPTIONS para CORS
export async function OPTIONS(req: Request) {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 