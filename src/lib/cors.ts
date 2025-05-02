import { NextRequest, NextResponse } from 'next/server';

// Lista de origens permitidas. Adicione a URL do seu frontend em produção aqui.
const allowedOrigins = [
  'http://localhost:8081', // Frontend web local
  // 'https://seu-frontend-web.vercel.app' // Exemplo: Frontend web em produção
];

// Métodos HTTP permitidos
const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];

// Cabeçalhos permitidos
const allowedHeaders = ['Content-Type', 'Authorization'];

/**
 * Adiciona cabeçalhos CORS a uma resposta.
 * Verifica se a origem da requisição está na lista de permitidas.
 */
function addCorsHeaders(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get('origin');

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else if (!origin && process.env.NODE_ENV !== 'production') {
    // Permite requisições sem origem (ex: Postman, mobile apps) em desenvolvimento
    // Em produção, você pode querer restringir isso ou ter uma lógica diferente.
    // response.headers.set('Access-Control-Allow-Origin', '*'); // Use com cautela!
  }

  response.headers.set('Access-Control-Allow-Methods', allowedMethods.join(','));
  response.headers.set('Access-Control-Allow-Headers', allowedHeaders.join(','));
  response.headers.set('Access-Control-Allow-Credentials', 'true'); // Se você usar cookies/autenticação baseada em sessão

  return response;
}

/**
 * Lida com requisições OPTIONS (preflight).
 * Retorna uma resposta 204 No Content com os cabeçalhos CORS apropriados.
 */
export function handleCorsPreflight(request: NextRequest): NextResponse | null {
  if (request.method === 'OPTIONS') {
    // Cria uma resposta vazia para o preflight
    let response = new NextResponse(null, { status: 204 }); 
    // Adiciona os cabeçalhos CORS necessários
    response = addCorsHeaders(request, response);
    return response;
  }
  // Se não for OPTIONS, retorna null para continuar o processamento normal da rota
  return null;
}

/**
 * Aplica os cabeçalhos CORS a uma resposta normal (GET, POST, etc.).
 */
export function applyCorsHeaders(request: NextRequest, response: NextResponse): NextResponse {
  return addCorsHeaders(request, response);
} 