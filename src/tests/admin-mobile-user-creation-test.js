const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuração da base URL para testes
const BASE_URL = process.env.TEST_API_BASE_URL || 'http://localhost:3000/api';

// Dados do Admin para autenticação (usar o email correto)
const ADMIN_USER = {
  email: process.env.TEST_ADMIN_EMAIL || 'admin_mobile_test@teste.com',
  password: process.env.TEST_ADMIN_PASSWORD || 'senha123',
};

// Dados do novo usuário a ser criado (com campos opcionais)
const NEW_USER_EMAIL = `new_mobile_user_${uuidv4()}@test.com`;
const BIRTH_DATE_ISO = new Date(1995, 5, 15).toISOString(); // Exemplo: 15 de Junho de 1995
const NEW_USER_DATA = {
  name: 'Mobile User Test Full',
  email: NEW_USER_EMAIL,
  password: 'password123',
  role: 'EMPLOYEE',
  hourlyRate: 30.5,
  phone: '11987654321',
  address: 'Rua Teste, 123',
  city: 'Cidade Teste',
  state: 'TS',
  zipCode: '12345-678',
  birthDate: BIRTH_DATE_ISO,
};

// Função para obter o token de autenticação
async function getAuthToken(userCredentials) {
  try {
    const response = await axios.post(`${BASE_URL}/mobile-auth`, userCredentials);
    return response.data.token;
  } catch (error) {
    console.error(`Erro ao autenticar ${userCredentials.email}:`, error.response?.data || error.message);
    throw new Error('Falha na autenticação');
  }
}

// Função principal do teste
async function testAdminMobileUserCreation() {
  console.log('🚀 Iniciando teste: Criação de usuário via Admin Mobile...');
  let adminToken;
  let createdUserId = null;

  try {
    // 1. Autenticar como Admin
    console.log(`🔑 Autenticando como Admin (${ADMIN_USER.email})...`);
    adminToken = await getAuthToken(ADMIN_USER);
    console.log('✅ Admin autenticado.');

    // 2. Tentar criar um novo usuário com todos os campos
    console.log(`👤 Criando novo usuário (${NEW_USER_DATA.email}) com dados completos...`);
    const createResponse = await axios.post(
      `${BASE_URL}/mobile-admin/users`,
      NEW_USER_DATA,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    // Verificar status 201 (Created)
    if (createResponse.status !== 201) {
      throw new Error(`Status inesperado ao criar usuário: ${createResponse.status}`);
    }
    console.log('✅ Usuário criado com sucesso (Status 201).');

    // Verificar dados retornados
    const createdUser = createResponse.data.user;
    createdUserId = createdUser.id; // Guardar ID para possível cleanup
    console.log('📋 Dados do usuário criado:', createdUser);

    if (!createdUser.id || 
        createdUser.name !== NEW_USER_DATA.name ||
        createdUser.email !== NEW_USER_DATA.email ||
        createdUser.role !== NEW_USER_DATA.role ||
        createdUser.hourlyRate !== NEW_USER_DATA.hourlyRate ||
        createdUser.phone !== NEW_USER_DATA.phone ||
        createdUser.address !== NEW_USER_DATA.address ||
        createdUser.city !== NEW_USER_DATA.city ||
        createdUser.state !== NEW_USER_DATA.state ||
        createdUser.zipCode !== NEW_USER_DATA.zipCode ||
        // Comparar apenas a parte da data (YYYY-MM-DD) para evitar problemas de timezone/ms
        (createdUser.birthDate && createdUser.birthDate.split('T')[0]) !== BIRTH_DATE_ISO.split('T')[0]
       ) {
      console.log('Esperado birthDate:', BIRTH_DATE_ISO.split('T')[0]);
      console.log('Recebido birthDate:', createdUser.birthDate ? createdUser.birthDate.split('T')[0] : null);
      throw new Error('Dados retornados do usuário criado não correspondem ao esperado.');
    }
    console.log('✅ Dados retornados verificados.');

    // 3. Tentar criar o mesmo usuário novamente (espera conflito 409)
    console.log(`👤 Tentando criar usuário com email duplicado (${NEW_USER_DATA.email})...`);
    try {
      await axios.post(
        `${BASE_URL}/mobile-admin/users`,
        NEW_USER_DATA, // Mesmo email
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      // Se chegou aqui, o teste falhou
      throw new Error('Criação com email duplicado deveria falhar, mas retornou sucesso.');
    } catch (error) {
      if (error.response && error.response.status === 409) {
        console.log('✅ Conflito de email detectado corretamente (Status 409).');
      } else {
        console.error('Erro inesperado ao tentar criar usuário duplicado:', error.response?.data || error.message);
        throw new Error('Falha ao verificar conflito de email.');
      }
    }

    // 4. (Opcional) Tentar autenticar como o novo usuário
    console.log(`🔑 Tentando autenticar como novo usuário (${NEW_USER_DATA.email})...`);
    const newUserToken = await getAuthToken({
      email: NEW_USER_DATA.email,
      password: NEW_USER_DATA.password,
    });
    if (!newUserToken) {
        throw new Error('Falha ao autenticar como o novo usuário criado.');
    }
    console.log('✅ Novo usuário autenticado com sucesso.');

    console.log('🎉 Teste concluído com sucesso!');

  } catch (error) {
    console.error('❌ Teste falhou:', error.message);
    // console.error('Detalhes do erro:', error);
    process.exit(1); // Termina com código de erro
  } finally {
    // Cleanup: Idealmente, deveríamos deletar o usuário criado.
    // Como não temos um endpoint DELETE /mobile-admin/users/[id] ainda,
    // vamos pular a exclusão por enquanto ou fazer manualmente/via script separado.
    if (createdUserId) {
      console.log(`🧹 Cleanup: Lembrar de remover o usuário com ID: ${createdUserId} e email: ${NEW_USER_EMAIL}`);
      // Exemplo (requer endpoint DELETE):
      /*
      try {
        await axios.delete(`${BASE_URL}/mobile-admin/users/${createdUserId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        console.log('✅ Usuário de teste removido.');
      } catch (delError) {
        console.error('⚠️ Falha ao remover usuário de teste:', delError.response?.data || delError.message);
      }
      */
    }
  }
}

// Executar o teste
testAdminMobileUserCreation(); 