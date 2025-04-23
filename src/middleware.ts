import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  // Ignorar requisições para API e _next
  if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  // Rotas públicas que não precisam de autenticação
  const publicPaths = ['/', '/login', '/register', '/forgot-password', '/setup'];
  if (publicPaths.some(path => pathname === path)) {
    return NextResponse.next();
  }

  // Verificar token de autenticação
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Se não houver token e a rota não for pública, redirecionar para login
  if (!token && !publicPaths.includes(pathname)) {
    const url = new URL('/login', req.url);
    url.searchParams.set('callbackUrl', encodeURI(pathname));
    return NextResponse.redirect(url);
  }
  
  // Se houver token, verificar redirecionamento baseado no papel
  if (token && pathname === '/dashboard') {
    let redirectUrl;
    
    switch (token.role) {
      case 'DEVELOPER':
        redirectUrl = '/dashboard/developer';
        break;
      case 'ADMIN':
        redirectUrl = '/dashboard/admin';
        break;
      case 'MANAGER':
        redirectUrl = '/dashboard/manager';
        break;
      case 'EMPLOYEE':
        redirectUrl = '/dashboard/employee';
        break;
      default:
        redirectUrl = '/dashboard/employee'; // Fallback para o papel de funcionário
    }
    
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  }
  
  // Verificar acesso baseado em papel para rotas protegidas
  if (token) {
    // Dashboard de desenvolvedor
    if (pathname.startsWith('/dashboard/developer') && token.role !== 'DEVELOPER') {
      return NextResponse.redirect(new URL(`/dashboard/${token.role.toLowerCase()}`, req.url));
    }
    
    // Dashboard de administrador
    if (pathname.startsWith('/dashboard/admin') && token.role !== 'ADMIN' && token.role !== 'DEVELOPER') {
      return NextResponse.redirect(new URL(`/dashboard/${token.role.toLowerCase()}`, req.url));
    }
    
    // Dashboard de gerente
    if (pathname.startsWith('/dashboard/manager') && 
        token.role !== 'MANAGER' && 
        token.role !== 'ADMIN' && 
        token.role !== 'DEVELOPER') {
      return NextResponse.redirect(new URL(`/dashboard/${token.role.toLowerCase()}`, req.url));
    }
  }
  
  return NextResponse.next();
}

// Configurar os caminhos onde o middleware será aplicado
export const config = {
  matcher: [
    /*
     * Correspondência de todas as rotas de solicitação:
     * - /api (rotas de API)
     * - /_next/static (arquivos estáticos)
     * - /_next/image (otimização de imagem)
     * - /dashboard (rotas de dashboard)
     * - / (home)
     * - /login (login)
     * - /register (registro)
     */
    '/((?!api|_next/static|_next/image).*)',
  ],
} 