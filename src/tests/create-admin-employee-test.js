// Script para criar os usuários de teste (admin e funcionário) para os testes da API Mobile
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Dados dos usuários de teste
const ADMIN_USER = {
  email: 'admin_mobile_test@teste.com',
  password: 'senha123',
  name: 'Admin Mobile Teste',
  role: 'ADMIN'
};

const EMPLOYEE_USER = {
  email: 'funcionario_mobile_test@teste.com',
  password: 'senha123',
  name: 'Funcionário Mobile Teste',
  role: 'EMPLOYEE'
};

// Dados do usuário manager de teste
const MANAGER_USER = {
  email: 'manager_mobile_test@teste.com',
  password: 'senha123',
  name: 'Manager Mobile Teste',
  role: 'MANAGER'
};

async function createTestUsers() {
  try {
    console.log('🏢 Verificando se existe empresa para os testes...');
    
    // Verificar se existe alguma empresa
    let company = await prisma.company.findFirst();
    
    if (!company) {
      console.log('⚠️ Nenhuma empresa encontrada. Criando empresa de teste...');
      
      // Criar uma empresa de teste
      company = await prisma.company.create({
        data: {
          name: 'Empresa de Teste Mobile',
          plan: 'BASIC',
          active: true,
          owner: {
            create: {
              name: 'Desenvolvedor Teste',
              email: 'dev_teste@teste.com',
              password: await bcrypt.hash('senha123', 10),
              role: 'DEVELOPER'
            }
          }
        }
      });
      
      console.log(`✅ Empresa de teste criada: ${company.name} (ID: ${company.id})`);
    } else {
      console.log(`✅ Usando empresa existente: ${company.name} (ID: ${company.id})`);
    }
    
    // Criar ou atualizar Admin
    console.log('\n🔍 Verificando se o usuário admin de teste já existe...');
    let adminUser = await prisma.user.findUnique({
      where: { email: ADMIN_USER.email }
    });
    
    if (adminUser) {
      console.log('✅ Usuário admin já existe:', {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      });
      
      // Atualizar a senha para garantir que está correta
      const hashedPassword = await bcrypt.hash(ADMIN_USER.password, 10);
      
      adminUser = await prisma.user.update({
        where: { id: adminUser.id },
        data: { 
          password: hashedPassword,
          companyId: company.id // Garantir que está na empresa correta
        }
      });
      
      console.log('🔄 Senha do usuário admin atualizada');
    } else {
      console.log('🆕 Criando novo usuário admin...');
      
      // Hash da senha
      const hashedPassword = await bcrypt.hash(ADMIN_USER.password, 10);
      
      // Criar o usuário admin
      adminUser = await prisma.user.create({
        data: {
          email: ADMIN_USER.email,
          password: hashedPassword,
          name: ADMIN_USER.name,
          role: ADMIN_USER.role,
          companyId: company.id
        }
      });
      
      console.log('✅ Usuário admin criado com sucesso:', {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      });
    }
    
    // Criar ou atualizar Manager
    console.log('\n🔍 Verificando se o usuário manager de teste já existe...');
    let managerUser = await prisma.user.findUnique({
      where: { email: MANAGER_USER.email }
    });
    
    if (managerUser) {
      console.log('✅ Usuário manager já existe:', {
        id: managerUser.id,
        email: managerUser.email,
        role: managerUser.role
      });
      
      // Atualizar a senha para garantir que está correta
      const hashedPassword = await bcrypt.hash(MANAGER_USER.password, 10);
      
      managerUser = await prisma.user.update({
        where: { id: managerUser.id },
        data: { 
          password: hashedPassword,
          companyId: company.id // Garantir que está na empresa correta
        }
      });
      
      console.log('🔄 Senha do usuário manager atualizada');
    } else {
      console.log('🆕 Criando novo usuário manager...');
      
      // Hash da senha
      const hashedPassword = await bcrypt.hash(MANAGER_USER.password, 10);
      
      // Criar o usuário manager
      managerUser = await prisma.user.create({
        data: {
          email: MANAGER_USER.email,
          password: hashedPassword,
          name: MANAGER_USER.name,
          role: MANAGER_USER.role,
          companyId: company.id
        }
      });
      
      console.log('✅ Usuário manager criado com sucesso:', {
        id: managerUser.id,
        email: managerUser.email,
        role: managerUser.role
      });
    }
    
    // Criar ou atualizar Funcionário
    console.log('\n🔍 Verificando se o usuário funcionário de teste já existe...');
    let employeeUser = await prisma.user.findUnique({
      where: { email: EMPLOYEE_USER.email }
    });
    
    if (employeeUser) {
      console.log('✅ Usuário funcionário já existe:', {
        id: employeeUser.id,
        email: employeeUser.email,
        role: employeeUser.role
      });
      
      // Atualizar a senha para garantir que está correta
      const hashedPassword = await bcrypt.hash(EMPLOYEE_USER.password, 10);
      
      employeeUser = await prisma.user.update({
        where: { id: employeeUser.id },
        data: { 
          password: hashedPassword,
          companyId: company.id // Garantir que está na empresa correta
        }
      });
      
      console.log('🔄 Senha do usuário funcionário atualizada');
    } else {
      console.log('🆕 Criando novo usuário funcionário...');
      
      // Hash da senha
      const hashedPassword = await bcrypt.hash(EMPLOYEE_USER.password, 10);
      
      // Criar o usuário funcionário
      employeeUser = await prisma.user.create({
        data: {
          email: EMPLOYEE_USER.email,
          password: hashedPassword,
          name: EMPLOYEE_USER.name,
          role: EMPLOYEE_USER.role,
          companyId: company.id
        }
      });
      
      console.log('✅ Usuário funcionário criado com sucesso:', {
        id: employeeUser.id,
        email: employeeUser.email,
        role: employeeUser.role
      });
    }
    
    return {
      company,
      adminUser,
      managerUser,
      employeeUser
    };
  } catch (error) {
    console.error('❌ Erro ao criar usuários de teste:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script se for chamado diretamente
if (require.main === module) {
  createTestUsers()
    .then(result => {
      console.log('\n✨ Usuários de teste criados/atualizados com sucesso!');
      console.log('📝 Resumo:');
      console.log(`  Empresa: ${result.company.name} (ID: ${result.company.id})`);
      console.log(`  Admin: ${result.adminUser.name} (ID: ${result.adminUser.id})`);
      console.log(`  Manager: ${result.managerUser.name} (ID: ${result.managerUser.id})`);
      console.log(`  Funcionário: ${result.employeeUser.name} (ID: ${result.employeeUser.id})`);
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Erro ao executar script:', error);
      process.exit(1);
    });
}

module.exports = { createTestUsers }; 