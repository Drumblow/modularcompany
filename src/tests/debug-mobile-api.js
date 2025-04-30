// Script simplificado para depurar as APIs mobile
const axios = require('axios');

// Configuração da base URL para testes
const BASE_URL = process.env.TEST_API_BASE_URL || 'http://localhost:3000/api';

// Dados para teste
const ADMIN_USER = {
  email: 'admin_mobile_test@teste.com',
  password: 'senha123'
};

const EMPLOYEE_USER = {
  email: 'funcionario_mobile_test@teste.com',
  password: 'senha123'
};

// Função para obter a data atual formatada (YYYY-MM-DD)
const getTodayFormatted = () => {
  const today = new Date();
  return today.toISOString().split('T')[0]; // formato YYYY-MM-DD
};

async function debugMobileAPI() {
  console.log('🔍 Depurando API Mobile para Admin');
  
  try {
    // Parte 1: Login como admin
    console.log('\n🔑 Autenticando como administrador...');
    const adminAuthResponse = await axios.post(`${BASE_URL}/mobile-auth`, ADMIN_USER);
    const adminToken = adminAuthResponse.data.token;
    const adminUser = adminAuthResponse.data.user;
    
    console.log(`✅ Admin autenticado: ${adminUser.name} (${adminUser.role})`);
    console.log(`📌 Admin companyId: ${adminUser.companyId}`);
    
    // Login como funcionário
    console.log('\n🔑 Autenticando como funcionário...');
    const employeeAuthResponse = await axios.post(`${BASE_URL}/mobile-auth`, EMPLOYEE_USER);
    const employeeToken = employeeAuthResponse.data.token;
    const employeeUser = employeeAuthResponse.data.user;
    
    console.log(`✅ Funcionário autenticado: ${employeeUser.name} (${employeeUser.role})`);
    console.log(`📌 Funcionário companyId: ${employeeUser.companyId}`);
    
    if (adminUser.companyId !== employeeUser.companyId) {
      console.log('⚠️ Admin e funcionário não estão na mesma empresa!');
    } else {
      console.log('✅ Admin e funcionário estão na mesma empresa:', adminUser.companyId);
    }
    
    // Parte 2: Obter todos os usuários da empresa (usando admin)
    console.log('\n👥 Buscando usuários da empresa...');
    
    try {
      const usersResponse = await axios.get(
        `${BASE_URL}/users`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      
      const usersInCompany = usersResponse.data.users.filter(
        user => user.companyId === adminUser.companyId
      );
      
      console.log(`✅ Encontrados ${usersInCompany.length} usuários na empresa:`);
      usersInCompany.forEach(user => {
        console.log(`  - ${user.name} (${user.id}) - ${user.role}`);
      });
    } catch (error) {
      console.log('❌ Erro ao buscar usuários:', error.message);
    }
    
    // Parte 3: Criar registro de horas como funcionário
    console.log('\n⏱️ Criando registro de horas como funcionário...');
    
    const dataFormatada = getTodayFormatted();
    console.log(`📅 Data do teste: ${dataFormatada}`);
    
    let newEntryId = null;
    
    try {
      const newEntryData = {
        date: dataFormatada,
        startTime: `${dataFormatada}T10:00:00`,
        endTime: `${dataFormatada}T11:30:00`,
        observation: `Teste de depuração ${Date.now()}`,
        project: 'Projeto Depuração API'
      };
      
      const createResponse = await axios.post(
        `${BASE_URL}/mobile-time-entries`,
        newEntryData,
        { headers: { Authorization: `Bearer ${employeeToken}` } }
      );
      
      newEntryId = createResponse.data.timeEntry.id;
      console.log(`✅ Registro criado com ID: ${newEntryId}`);
    } catch (error) {
      console.log('❌ Erro ao criar registro:', error.message);
      if (error.response && error.response.data) {
        console.log('Resposta:', error.response.data);
      }
    }
    
    // Parte 4: Verificar entradas do próprio funcionário
    console.log('\n👀 Verificando se o funcionário vê seu próprio registro...');
    
    try {
      const employeeViewResponse = await axios.get(
        `${BASE_URL}/mobile-time-entries`,
        { 
          headers: { Authorization: `Bearer ${employeeToken}` },
          params: { 
            startDate: dataFormatada,
            endDate: dataFormatada
          }
        }
      );
      
      const employeeEntries = employeeViewResponse.data.timeEntries;
      console.log(`✅ Funcionário vê ${employeeEntries.length} registros`);
      
      if (employeeEntries.length > 0) {
        console.log('📋 IDs dos registros vistos pelo funcionário:');
        employeeEntries.forEach(entry => {
          const isNewEntry = newEntryId && entry.id === newEntryId;
          console.log(`  - ${entry.id}${isNewEntry ? ' (registro recém-criado)' : ''}`);
        });
      }
    } catch (error) {
      console.log('❌ Erro na consulta do funcionário:', error.message);
    }
    
    // Parte 5: Verificar como Admin - Tentativa 1 (padrão)
    console.log('\n👀 Verificando se o admin vê os registros (tentativa 1 - padrão)...');
    
    try {
      const adminViewResponse = await axios.get(
        `${BASE_URL}/mobile-time-entries`,
        { 
          headers: { Authorization: `Bearer ${adminToken}` },
          params: { 
            startDate: dataFormatada,
            endDate: dataFormatada
          }
        }
      );
      
      const adminEntries = adminViewResponse.data.timeEntries;
      console.log(`Admin vê ${adminEntries.length} registros`);
      
      const foundNewEntry = adminEntries.some(entry => newEntryId && entry.id === newEntryId);
      
      if (foundNewEntry) {
        console.log('✅ Admin consegue ver o registro recém-criado!');
      } else {
        console.log('❌ Admin NÃO consegue ver o registro recém-criado');
      }
      
      if (adminEntries.length > 0) {
        console.log('📋 IDs dos registros vistos pelo admin:');
        adminEntries.forEach(entry => {
          console.log(`  - ${entry.id} (Usuario: ${entry.user?.name || 'N/A'})`);
        });
      }
      
      console.log('📊 Estatísticas retornadas para o admin:');
      console.log(adminViewResponse.data.stats);
      
    } catch (error) {
      console.log('❌ Erro na consulta do admin:', error.message);
      if (error.response && error.response.data) {
        console.log('Resposta:', error.response.data);
      }
    }
    
    // Parte 6: Verificar como Admin - Tentativa 2 (com userId explícito)
    console.log('\n👀 Verificando se o admin vê os registros (tentativa 2 - com userId)...');
    
    try {
      const adminViewResponse = await axios.get(
        `${BASE_URL}/mobile-time-entries`,
        { 
          headers: { Authorization: `Bearer ${adminToken}` },
          params: { 
            startDate: dataFormatada,
            endDate: dataFormatada,
            userId: employeeUser.id
          }
        }
      );
      
      const adminEntries = adminViewResponse.data.timeEntries;
      console.log(`Admin vê ${adminEntries.length} registros do funcionário específico`);
      
      const foundNewEntry = adminEntries.some(entry => newEntryId && entry.id === newEntryId);
      
      if (foundNewEntry) {
        console.log('✅ Admin consegue ver o registro recém-criado com userId explícito!');
      } else {
        console.log('❌ Admin NÃO consegue ver o registro recém-criado mesmo com userId explícito');
      }
      
    } catch (error) {
      console.log('❌ Erro na consulta do admin com userId:', error.message);
      if (error.response && error.response.data) {
        console.log('Resposta:', error.response.data);
      }
    }
    
    // Parte 7: Cleanup - Remover o registro criado
    if (newEntryId) {
      console.log('\n🧹 Removendo registro de teste...');
      
      try {
        await axios.delete(
          `${BASE_URL}/mobile-time-entries/${newEntryId}`,
          { headers: { Authorization: `Bearer ${employeeToken}` } }
        );
        console.log('✅ Registro removido com sucesso');
      } catch (error) {
        console.log('❌ Erro ao remover registro:', error.message);
      }
    }
    
    console.log('\n✅ Depuração concluída!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar o teste
debugMobileAPI().catch(console.error); 