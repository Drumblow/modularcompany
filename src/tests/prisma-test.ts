// Teste simples para verificar como o cliente Prisma está sendo importado
import { PrismaClient } from '@prisma/client';

console.log('Iniciando teste do Prisma Client');

// Criar uma instância do Prisma Client
const prisma = new PrismaClient();

// Verificar quais propriedades estão disponíveis
console.log('Propriedades disponíveis no cliente Prisma:');
console.log(Object.keys(prisma));

// Verificar se o modelo User está disponível
console.log('O modelo User está disponível?', 'user' in prisma);

// Encerrar o teste
console.log('Teste concluído'); 