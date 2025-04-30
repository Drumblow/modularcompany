// Teste de aprovação de horas por administrador na API Mobile
const axios = require('axios');

// Configuração da base URL para testes
const BASE_URL = process.env.TEST_API_BASE_URL || 'http://localhost:3000/api';

// Tempo de espera entre tentativas (em ms)
const RETRY_DELAY = 2000;

// Dados para teste
const ADMIN_USER = {
  email: 'admin_mobile_test@teste.com',
  password: 'senha123'
};

const EMPLOYEE_USER = {
  email: 'funcionario_mobile_test@teste.com',
  password: 'senha123'
};

// Função para dormir
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Função para obter a data atual formatada (YYYY-MM-DD)
const getTodayFormatted = () => {
  const today = new Date();
  return today.toISOString().split('T')[0]; // formato YYYY-MM-DD
};

// Função principal de teste
async function testarAprovacaoHorasAdmin() {
  console.log('🚀 Iniciando teste de aprovação de horas por administrador na API Mobile');
  
  let adminToken = null;
  let employeeToken = null;
  let adminUser = null;
  let employeeUser = null;
  let registro1 = null;
  let registro2 = null;

  try {
    // Parte 1: Login como admin
    console.log('\n👤 Autenticando como administrador...');
    try {
      const responseAdmin = await axios.post(`${BASE_URL}/mobile-auth`, ADMIN_USER);
      adminToken = responseAdmin.data.token;
      adminUser = responseAdmin.data.user;
      console.log(`✅ Admin autenticado: ${adminUser.name} (${adminUser.role})`);
      console.log(`📌 Admin companyId: ${adminUser.companyId}`);
    } catch (error) {
      console.log('❌ Falha ao autenticar como admin:', error.message);
      if (error.response) {
        console.log('Resposta:', error.response.data);
      }
      return;
    }

    // Parte 2: Login como funcionário
    console.log('\n👤 Autenticando como funcionário...');
    try {
      const responseEmployee = await axios.post(`${BASE_URL}/mobile-auth`, EMPLOYEE_USER);
      employeeToken = responseEmployee.data.token;
      employeeUser = responseEmployee.data.user;
      console.log(`✅ Funcionário autenticado: ${employeeUser.name} (${employeeUser.role})`);
      console.log(`📌 Funcionário companyId: ${employeeUser.companyId}`);
    } catch (error) {
      console.log('❌ Falha ao autenticar como funcionário:', error.message);
      if (error.response) {
        console.log('Resposta:', error.response.data);
      }
      return;
    }

    // Verificar se admin e employee estão na mesma empresa
    if (adminUser.companyId !== employeeUser.companyId) {
      console.log('⚠️ Admin e funcionário não estão na mesma empresa!');
      console.log(`Admin: companyId=${adminUser.companyId}`);
      console.log(`Funcionário: companyId=${employeeUser.companyId}`);
    } else {
      console.log('✅ Admin e funcionário estão na mesma empresa:', adminUser.companyId);
    }

    // Parte 3: Criar uma data única para este teste para evitar conflitos
    const dataFormatada = getTodayFormatted();
    console.log(`📅 Data do teste: ${dataFormatada}`);

    // Remover registros existentes para a data do teste
    console.log('\n🧹 Removendo registros existentes para evitar conflitos...');
    try {
      // Listar registros existentes
      const existingRecordsResponse = await axios.get(
        `${BASE_URL}/mobile-time-entries`,
        { 
          headers: { Authorization: `Bearer ${employeeToken}` },
          params: { 
            startDate: dataFormatada,
            endDate: dataFormatada
          }
        }
      );
      
      const existingRecords = existingRecordsResponse.data.timeEntries;
      console.log(`Encontrados ${existingRecords.length} registros existentes para a data ${dataFormatada}`);
      
      // Tentar remover cada registro
      for (const record of existingRecords) {
        try {
          await axios.delete(
            `${BASE_URL}/mobile-time-entries/${record.id}`, 
            { headers: { Authorization: `Bearer ${employeeToken}` } }
          );
          console.log(`  ✅ Registro ${record.id} removido`);
        } catch (error) {
          console.log(`  ⚠️ Não foi possível remover o registro ${record.id}: ${error.message}`);
        }
      }
    } catch (error) {
      console.log('⚠️ Erro ao listar/remover registros existentes:', error.message);
    }

    // Parte 4: Criar registros de horas como funcionário com uma diferença de 3 horas entre eles
    console.log('\n⏱️ Criando registros de horas como funcionário...');
    
    // Registro 1: Manhã (8h-9h30)
    try {
      const dadosRegistro1 = {
        date: dataFormatada,
        startTime: `${dataFormatada}T08:00:00`,
        endTime: `${dataFormatada}T09:30:00`,
        observation: `Registro 1 - manhã (teste admin) ${Date.now()}`,
        project: 'Projeto Teste Admin'
      };
      
      console.log('Enviando dados para criar registro 1:', dadosRegistro1);
      
      const response1 = await axios.post(
        `${BASE_URL}/mobile-time-entries`, 
        dadosRegistro1, 
        { headers: { Authorization: `Bearer ${employeeToken}` } }
      );
      
      registro1 = response1.data.timeEntry;
      console.log(`✅ Registro 1 criado com ID: ${registro1.id}`);
    } catch (error) {
      console.log('❌ Falha ao criar registro 1:', error.message);
      if (error.response && error.response.data) {
        console.log('Resposta:', error.response.data);
      }
    }
    
    // Registro 2: Tarde (13h-15h)
    try {
      const dadosRegistro2 = {
        date: dataFormatada,
        startTime: `${dataFormatada}T13:00:00`,
        endTime: `${dataFormatada}T15:00:00`,
        observation: `Registro 2 - tarde (teste admin) ${Date.now()}`,
        project: 'Projeto Teste Admin'
      };
      
      console.log('Enviando dados para criar registro 2:', dadosRegistro2);
      
      const response2 = await axios.post(
        `${BASE_URL}/mobile-time-entries`, 
        dadosRegistro2, 
        { headers: { Authorization: `Bearer ${employeeToken}` } }
      );
      
      registro2 = response2.data.timeEntry;
      console.log(`✅ Registro 2 criado com ID: ${registro2.id}`);
    } catch (error) {
      console.log('❌ Falha ao criar registro 2:', error.message);
      if (error.response && error.response.data) {
        console.log('Resposta:', error.response.data);
      }
    }

    // Aguardar um momento para os registros serem processados
    console.log('\n⏳ Aguardando 2 segundos para os registros serem processados...');
    await sleep(RETRY_DELAY);

    // Parte 5: Verificar se o admin consegue ver os registros do funcionário
    console.log('\n🔍 Verificando se admin visualiza registros do funcionário...');
    
    try {
      console.log(`Consultando registros para a data ${dataFormatada}`);
      
      const response = await axios.get(
        `${BASE_URL}/mobile-time-entries`,
        { 
          headers: { Authorization: `Bearer ${adminToken}` },
          params: { 
            startDate: dataFormatada,
            endDate: dataFormatada
          }
        }
      );
      
      console.log(`📊 Total de registros retornados: ${response.data.timeEntries.length}`);
      
      // Mostrar detalhes de todos os registros encontrados para diagnóstico
      console.log('📜 Lista completa de registros retornados:');
      response.data.timeEntries.forEach((entry, index) => {
        console.log(`  [${index + 1}] ID: ${entry.id}, Data: ${entry.date}, Horário: ${entry.startTime.substring(11, 16)}-${entry.endTime.substring(11, 16)}, Usuário: ${entry.user?.name || 'N/A'}, Obs: "${entry.observation?.substring(0, 30)}${entry.observation?.length > 30 ? '...' : ''}"`);
      });
      
      // Verificar se os IDs dos registros criados estão na lista retornada
      const registrosEncontrados = response.data.timeEntries.filter(
        entry => {
          let encontrado = false;
          
          if (registro1 && entry.id === registro1.id) {
            encontrado = true;
            console.log(`✅ Encontrado registro 1: ${entry.id}, observação: "${entry.observation}"`);
          } else if (registro2 && entry.id === registro2.id) {
            encontrado = true;
            console.log(`✅ Encontrado registro 2: ${entry.id}, observação: "${entry.observation}"`);
          }
          
          return encontrado;
        }
      );
      
      if (registrosEncontrados.length === 2 || (registro1 === null && registro2 !== null && registrosEncontrados.length === 1)) {
        console.log('✅ Admin consegue visualizar os registros do funcionário!');
      } else if (registrosEncontrados.length > 0) {
        console.log(`⚠️ Admin visualiza apenas ${registrosEncontrados.length} dos registros esperados`);
      } else {
        console.log('❌ ERRO: Admin não está visualizando os registros do funcionário');
        console.log('⚠️ PROBLEMA IDENTIFICADO: A API mobile não está permitindo que administradores vejam registros de seus funcionários');
      }

      console.log('\n📋 Detalhes do filtro aplicado na API:');
      console.log(response.data.appliedFilters);
      
    } catch (error) {
      console.log('❌ Falha ao obter registros como admin:', error.message);
      if (error.response) {
        console.log('Resposta:', error.response.data);
      }
    }

    // Parte 6: Testar aprovação de um registro
    if (registro1) {
      console.log('\n👍 Testando aprovação de registro...');
      
      try {
        // Verificar se o endpoint de aprovação existe
        const approveUrl = `${BASE_URL}/mobile-time-entries/${registro1.id}/approve`;
        const approveData = { approved: true };
        
        const approveResponse = await axios.put(
          approveUrl,
          approveData,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        
        console.log('✅ Aprovação de registro funcionou!');
        console.log('📄 Resposta:', approveResponse.data);
      } catch (error) {
        console.log('❌ ERRO: Falha ao aprovar registro', error.message);
        console.log('⚠️ PROBLEMA IDENTIFICADO: Endpoint /mobile-time-entries/{id}/approve pode não existir');
        
        if (error.response) {
          console.log('Status:', error.response.status);
          console.log('Resposta:', error.response.data);
        }
      }
    }

    // Parte 7: Testar rejeição de um registro
    if (registro2) {
      console.log('\n👎 Testando rejeição de registro...');
      
      try {
        // Verificar se o endpoint de aprovação existe
        const rejectUrl = `${BASE_URL}/mobile-time-entries/${registro2.id}/approve`;
        const rejectData = { 
          approved: false,
          rejectionReason: 'Registro rejeitado pelo teste automatizado'
        };
        
        const rejectResponse = await axios.put(
          rejectUrl,
          rejectData,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        
        console.log('✅ Rejeição de registro funcionou!');
        console.log('📄 Resposta:', rejectResponse.data);
      } catch (error) {
        console.log('❌ ERRO: Falha ao rejeitar registro', error.message);
        
        if (error.response) {
          console.log('Status:', error.response.status);
          console.log('Resposta:', error.response.data);
        }
      }
    }

    // Limpar registros criados
    console.log('\n🧹 Limpando registros de teste...');
    
    if (registro1) {
      try {
        await axios.delete(
          `${BASE_URL}/mobile-time-entries/${registro1.id}`, 
          { headers: { Authorization: `Bearer ${employeeToken}` } }
        );
        console.log(`✅ Registro 1 excluído`);
      } catch (error) {
        console.log(`⚠️ Não foi possível excluir o registro 1: ${error.message}`);
      }
    }
    
    if (registro2) {
      try {
        await axios.delete(
          `${BASE_URL}/mobile-time-entries/${registro2.id}`, 
          { headers: { Authorization: `Bearer ${employeeToken}` } }
        );
        console.log(`✅ Registro 2 excluído`);
      } catch (error) {
        console.log(`⚠️ Não foi possível excluir o registro 2: ${error.message}`);
      }
    }

    console.log('\n✅ Teste concluído!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

// Executar o teste
testarAprovacaoHorasAdmin().catch(console.error); 