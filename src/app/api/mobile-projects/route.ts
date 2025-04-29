import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyMobileAuth, createCorsResponse } from '@/lib/mobile-auth';

export async function GET(req: NextRequest) {
  // Verificar autenticação
  const { auth, response } = await verifyMobileAuth(req);
  
  // Se a verificação falhou, retorne a resposta de erro
  if (!auth || response) {
    return response;
  }
  
  try {
    // Obter a companyId e role do usuário
    const user = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { companyId: true, role: true }
    });
    
    if (!user) {
      return createCorsResponse({ error: 'Usuário não encontrado' }, 404);
    }
    
    // Buscar projetos únicos da time entries do usuário
    const userTimeEntries = await prisma.timeEntry.findMany({
      where: { userId: auth.id },
      select: { project: true }
    });
    
    // Extrair nomes de projetos únicos das time entries do usuário
    const userProjects = userTimeEntries
      .filter(entry => entry.project && entry.project.trim() !== '')
      .map(entry => entry.project as string);
    
    // Buscar projetos únicos da time entries da empresa do usuário (exceto os do próprio usuário)
    const companyTimeEntries = await prisma.timeEntry.findMany({
      where: {
        user: {
          companyId: user.companyId
        },
        userId: {
          not: auth.id
        }
      },
      select: { project: true }
    });
    
    // Extrair nomes de projetos únicos das time entries da empresa
    const companyProjects = companyTimeEntries
      .filter(entry => entry.project && entry.project.trim() !== '')
      .map(entry => entry.project as string);
    
    // Combinar projetos do usuário e da empresa sem duplicatas
    // Usar um objeto para garantir unicidade em vez de Set
    const uniqueProjectsObj: { [key: string]: boolean } = {};
    
    // Adicionar projetos do usuário
    userProjects.forEach(project => {
      uniqueProjectsObj[project] = true;
    });
    
    // Adicionar projetos da empresa
    companyProjects.forEach(project => {
      uniqueProjectsObj[project] = true;
    });
    
    // Converter o objeto em um array de nomes de projetos
    const allUniqueProjects = Object.keys(uniqueProjectsObj);
    
    // Ordenar projetos alfabeticamente
    allUniqueProjects.sort();
    
    console.log('Mobile - Projetos listados:', allUniqueProjects);
    
    return createCorsResponse({
      // Como não existe tabela project, retornamos apenas os projetos informais extraídos das time entries
      projects: {
        // Lista de projetos informais (extraídos de time entries)
        informal: allUniqueProjects.map(name => ({
          name,
          type: 'informal',
          clientName: null,
          description: null
        })),
        // Lista de projetos oficiais (vazia já que não temos tabela project)
        official: []
      }
    });
    
  } catch (error) {
    console.error('Erro ao listar projetos:', error);
    return createCorsResponse({ error: 'Erro ao listar projetos' }, 500);
  }
}

// Responde às solicitações de preflight OPTIONS para CORS
export async function OPTIONS(req: Request) {
  return createCorsResponse({});
} 