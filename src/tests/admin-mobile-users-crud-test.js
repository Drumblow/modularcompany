const axios = require('axios');

const BASE_URL = process.env.TEST_API_BASE_URL || 'http://localhost:3000/api';
const RETRY_DELAY = 2000; // ms

const ADMIN_CREDENTIALS = {
  email: process.env.ADMIN_TEST_EMAIL || 'admin_mobile_test@teste.com', // Use o mesmo admin dos outros testes ou um dedicado
  password: process.env.ADMIN_TEST_PASSWORD || 'senha123'
};

let adminToken = null;
let adminUser = null;
let createdUserId = null;
const testUserEmail = `testuser_${Date.now()}@modularcompany.test`;
const testUserPassword = 'password123';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function loginAdmin() {
  if (adminToken) return true;
  console.log('\n👤 Autenticando como administrador para testes de CRUD de usuário...');
  try {
    const response = await axios.post(`${BASE_URL}/mobile-auth`, ADMIN_CREDENTIALS);
    adminToken = response.data.token;
    adminUser = response.data.user;
    if (!adminUser.companyId) {
        console.error('❌ ERRO FATAL: Admin de teste não possui companyId. Verifique o usuário:', ADMIN_CREDENTIALS.email);
        return false;
    }
    console.log(`✅ Admin autenticado: ${adminUser.name} (Empresa: ${adminUser.companyId})`);
    return true;
  } catch (error) {
    console.error('❌ Falha ao autenticar como admin:', error.response ? error.response.data : error.message);
    return false;
  }
}

async function testCreateUser() {
  console.log('\n➕ Testando: Criar Novo Usuário (POST /mobile-admin/users)');
  if (!adminToken) {
    console.log('⚠️ Admin não autenticado. Pulando teste de criação.');
    return;
  }

  const newUserPayload = {
    name: "Usuário de Teste CRUD",
    email: testUserEmail,
    password: testUserPassword,
    role: "EMPLOYEE",
    hourlyRate: 25.50,
    phone: "1234567890",
    address: "Rua Teste, 123",
    city: "Testelândia",
    state: "TS",
    zipCode: "12345-000",
    birthDate: "1995-08-10T00:00:00Z"
  };

  try {
    const response = await axios.post(
      `${BASE_URL}/mobile-admin/users`,
      newUserPayload,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (response.status === 201 && response.data.user && response.data.user.id) {
      createdUserId = response.data.user.id;
      console.log(`✅ Usuário criado com sucesso: ID ${createdUserId}, Email: ${response.data.user.email}`);
      if (response.data.user.companyId !== adminUser.companyId) {
          console.error(`❌ ERRO DE CONSISTÊNCIA: Usuário criado na empresa ${response.data.user.companyId} mas admin é da ${adminUser.companyId}`);
      }
    } else {
      console.error('❌ Falha ao criar usuário, resposta inesperada:', response.data);
    }
  } catch (error) {
    console.error('❌ ERRO ao criar usuário:', error.response ? error.response.data : error.message);
  }
}

async function testGetUser() {
  console.log(`\nℹ️ Testando: Visualizar Usuário Criado (GET /mobile-admin/users/${createdUserId})`);
  if (!adminToken || !createdUserId) {
    console.log('⚠️ Admin não autenticado ou nenhum usuário criado. Pulando teste de visualização.');
    return;
  }

  try {
    const response = await axios.get(
      `${BASE_URL}/mobile-admin/users/${createdUserId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (response.status === 200 && response.data.user && response.data.user.email === testUserEmail) {
      console.log(`✅ Usuário ${response.data.user.name} visualizado com sucesso.`);
    } else {
      console.error('❌ Falha ao visualizar usuário ou dados incorretos:', response.data);
    }
  } catch (error) {
    console.error(`❌ ERRO ao visualizar usuário ${createdUserId}:`, error.response ? error.response.data : error.message);
  }
}

async function testUpdateUser() {
  console.log(`\n✏️ Testando: Atualizar Usuário (PUT /mobile-admin/users/${createdUserId})`);
  if (!adminToken || !createdUserId) {
    console.log('⚠️ Admin não autenticado ou nenhum usuário criado. Pulando teste de atualização.');
    return;
  }

  const updatedUserData = {
    name: "Usuário de Teste CRUD (Atualizado)",
    phone: "0987654321",
    role: "MANAGER", // Testando mudança de papel
    hourlyRate: null // Managers não devem ter hourlyRate
  };

  try {
    const response = await axios.put(
      `${BASE_URL}/mobile-admin/users/${createdUserId}`,
      updatedUserData,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (response.status === 200 && response.data.user && response.data.user.name === updatedUserData.name && response.data.user.role === "MANAGER") {
      console.log(`✅ Usuário ${response.data.user.name} atualizado com sucesso para ${response.data.user.role}.`);
    } else {
      console.error('❌ Falha ao atualizar usuário ou dados não refletem atualização:', response.data);
    }
  } catch (error) {
    console.error(`❌ ERRO ao atualizar usuário ${createdUserId}:`, error.response ? error.response.data : error.message);
  }
}

async function testDeleteUser() {
  console.log(`\n🗑️ Testando: Excluir Usuário (DELETE /mobile-admin/users/${createdUserId})`);
  if (!adminToken || !createdUserId) {
    console.log('⚠️ Admin não autenticado ou nenhum usuário criado. Pulando teste de exclusão.');
    return;
  }

  try {
    const response = await axios.delete(
      `${BASE_URL}/mobile-admin/users/${createdUserId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    if (response.status === 200 && response.data.message === 'Usuário excluído com sucesso.') {
      console.log(`✅ Usuário ${createdUserId} excluído com sucesso.`);
    } else {
      console.error('❌ Falha ao excluir usuário:', response.data);
    }
  } catch (error) {
    console.error(`❌ ERRO ao excluir usuário ${createdUserId}:`, error.response ? error.response.data : error.message);
  }

  // Tentativa de buscar o usuário excluído para confirmar
  console.log(`\nℹ️ Verificando se usuário ${createdUserId} foi realmente excluído...`);
  try {
    await axios.get(
      `${BASE_URL}/mobile-admin/users/${createdUserId}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.error(`❌ ERRO DE CONSISTÊNCIA: Usuário ${createdUserId} ainda foi encontrado após exclusão.`);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log(`✅ Verificação de exclusão bem-sucedida: Usuário ${createdUserId} não encontrado (404).`);
    } else {
      console.error(`❌ ERRO ao verificar exclusão do usuário ${createdUserId}:`, error.response ? error.response.data : error.message);
    }
  }
}


async function runUserCrudTests() {
  console.log('🚀 Iniciando testes CRUD de Usuários para API Mobile (Admin) 🚀');
  const loggedIn = await loginAdmin();
  if (!loggedIn) {
    console.log('🛑 Testes abortados devido à falha no login do admin.');
    return;
  }

  await testCreateUser();
  if (createdUserId) {
    await sleep(RETRY_DELAY); // Pequena pausa
    await testGetUser();
    await sleep(RETRY_DELAY);
    await testUpdateUser();
    await sleep(RETRY_DELAY);
    await testDeleteUser();
  } else {
    console.log('⚠️ Nenhum usuário foi criado, demais testes CRUD não podem prosseguir.');
  }

  console.log('\n🏁 Testes CRUD de Usuários concluídos! 🏁');
}

runUserCrudTests().catch(error => {
  console.error("💣 Erro fatal durante a execução dos testes CRUD de usuário:", error);
}); 