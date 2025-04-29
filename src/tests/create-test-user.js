// Script para criar o usuário de teste para os testes da API Mobile
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Dados do usuário de teste
const TEST_USER = {
  email: 'funcionario@teste.com',
  password: 'senha123',
  name: 'Funcionário Teste',
  role: 'EMPLOYEE'
};

async function createTestUser() {
  try {
    console.log('🔍 Verificando se o usuário de teste já existe...');
    
    // Tenta encontrar o usuário pelo email
    const existingUser = await prisma.user.findUnique({
      where: { email: TEST_USER.email }
    });
    
    if (existingUser) {
      console.log('✅ Usuário de teste já existe:', {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        role: existingUser.role
      });
      
      // Vamos atualizar a senha para garantir que está correta
      const hashedPassword = await bcrypt.hash(TEST_USER.password, 10);
      
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: { password: hashedPassword }
      });
      
      console.log('✅ Senha do usuário de teste atualizada com sucesso!');
      return updatedUser;
    }
    
    console.log('⚠️ Usuário de teste não encontrado. Criando novo usuário...');
    
    // Hash da senha
    const hashedPassword = await bcrypt.hash(TEST_USER.password, 10);
    
    // Verifica se existe alguma empresa
    const company = await prisma.company.findFirst();
    
    // Criar o usuário
    const newUser = await prisma.user.create({
      data: {
        email: TEST_USER.email,
        password: hashedPassword,
        name: TEST_USER.name,
        role: TEST_USER.role,
        companyId: company?.id // Associa à primeira empresa, se existir
      }
    });
    
    console.log('✅ Usuário de teste criado com sucesso:', {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      companyId: newUser.companyId
    });
    
    return newUser;
  } catch (error) {
    console.error('❌ Erro ao criar usuário de teste:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script se for chamado diretamente
if (require.main === module) {
  createTestUser()
    .then(() => {
      console.log('✨ Script concluído com sucesso!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Erro ao executar script:', error);
      process.exit(1);
    });
}

module.exports = { createTestUser }; 