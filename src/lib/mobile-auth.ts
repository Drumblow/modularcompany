import { jwtVerify, JWTPayload } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

export interface MobileAuthPayload extends JWTPayload {
  id: string;
  email: string;
  role: string;
  companyId?: string | null;
}

/**
 * Middleware para verificar a autenticação em endpoints de API móvel
 * 
 * @param req Requisição Next.js
 * @returns Um objeto contendo o payload do token ou nulo se a verificação falhar
 */
export async function verifyMobileAuth(req: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  try {
    // Obtém o token do cabeçalho Authorization
    const authHeader = req.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        auth: null,
        corsHeaders,
        response: NextResponse.json(
          { error: 'Token não fornecido' },
          { status: 401, headers: corsHeaders }
        )
      };
    }

    // Extrai o token do cabeçalho
    const token = authHeader.substring(7); // Remove "Bearer "
    
    // Verifica o token
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(token, secret);
    
    // Retorna o payload
    return {
      auth: payload as MobileAuthPayload,
      corsHeaders,
      response: null
    };
  } catch (error) {
    console.error('Erro na verificação do token móvel:', error);
    
    return {
      auth: null,
      corsHeaders,
      response: NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401, headers: corsHeaders }
      )
    };
  }
}

/**
 * Função auxiliar para criar uma resposta com cabeçalhos CORS
 */
export function createCorsResponse(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 