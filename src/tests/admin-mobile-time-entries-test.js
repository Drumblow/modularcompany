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

// Credenciais para manager (usando as credenciais reais agora)
const MANAGER_USER = {
  email: 'manager_mobile_test@teste.com',
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
        console.log('⚠️ PROBLEMA IDENTIFICADO: Endpoint /mobile-time-entries/{id}/approve pode não existir');
        
        if (error.response) {
          console.log('Status:', error.response.status);
          console.log('Resposta:', error.response.data);
        }
      }
    }

  } catch (error) {
    console.log('❌ ERRO: Falha ao executar o teste:', error.message);
    if (error.response) {
      console.log('Resposta:', error.response.data);
    }
  }
}

testarAprovacaoHorasAdmin();

// TESTE PARA A FUNCIONALIDADE includeOwnEntries
async function testManagerOwnTimeEntries(managerToken, managerUser) {
  console.log('\n🔍 Testando: Manager visualizando seus próprios registros de horas (GET /mobile-time-entries?includeOwnEntries=true)');
  if (!managerToken || !managerUser) {
    console.log('⚠️ Manager não autenticado. Pulando teste.');
    return;
  }

  const dataFormatada = getTodayFormatted();
  console.log(`📅 Data do teste para manager: ${dataFormatada}`);
  
  // Criar um registro de horas para o manager testar
  try {
    console.log('\n⏱️ Criando um registro de horas para o manager...');
    const dadosRegistroManager = {
      date: dataFormatada,
      startTime: `${dataFormatada}T10:00:00`,
      endTime: `${dataFormatada}T11:30:00`,
      observation: `Registro do manager (teste) ${Date.now()}`,
      project: 'Projeto Teste Manager'
    };
    
    console.log('Enviando dados para criar registro do manager:', dadosRegistroManager);
    
    const responseManagerEntry = await axios.post(
      `${BASE_URL}/mobile-time-entries`, 
      dadosRegistroManager, 
      { headers: { Authorization: `Bearer ${managerToken}` } }
    );
    
    const registroManager = responseManagerEntry.data.timeEntry;
    console.log(`✅ Registro do manager criado com ID: ${registroManager.id}`);
    
    // Aguardar um momento para o registro ser processado
    console.log('\n⏳ Aguardando 2 segundos para o registro ser processado...');
    await sleep(RETRY_DELAY);

    // Teste 1: Buscar apenas os próprios registros (Minhas Horas)
    console.log('\n🔍 Teste 1: Buscar apenas os próprios registros do manager');
    const ownEntriesResponse = await axios.get(
      `${BASE_URL}/mobile-time-entries?includeOwnEntries=true&userId=${managerUser.id}`,
      { headers: { Authorization: `Bearer ${managerToken}` } }
    );

    // Verificar se retornou registros e se todos pertencem ao manager
    const ownEntries = ownEntriesResponse.data.timeEntries || [];
    if (ownEntries.length > 0) {
      const allBelongToManager = ownEntries.every(entry => entry.user?.id === managerUser.id);
      if (allBelongToManager) {
        console.log(`✅ Manager conseguiu visualizar ${ownEntries.length} registro(s) próprio(s) com sucesso.`);
      } else {
        console.error('❌ Alguns registros retornados não pertencem ao manager.');
      }
    } else {
      console.log('ℹ️ Nenhum registro próprio encontrado para o manager.');
    }

    // Teste 2: Buscar todos os registros incluindo os próprios
    console.log('\n🔍 Teste 2: Buscar todos os registros incluindo os próprios');
    const allEntriesResponse = await axios.get(
      `${BASE_URL}/mobile-time-entries?includeOwnEntries=true`,
      { headers: { Authorization: `Bearer ${managerToken}` } }
    );

    // Verificar se retornou registros e se existem registros do manager
    const allEntries = allEntriesResponse.data.timeEntries || [];
    if (allEntries.length > 0) {
      const hasManagerEntries = allEntries.some(entry => entry.user?.id === managerUser.id);
      if (hasManagerEntries) {
        console.log(`✅ Manager conseguiu visualizar registros de equipe (${allEntries.length} total) incluindo os próprios.`);
      } else {
        console.log('ℹ️ Manager visualizou registros da equipe, mas não possui registros próprios.');
      }
    } else {
      console.log('ℹ️ Nenhum registro encontrado para a equipe do manager.');
    }

    // Teste 3: Tentativa de aprovação de registro próprio (deve falhar)
    console.log('\n🔍 Teste 3: Tentar aprovar o próprio registro (deve falhar)');
    if (registroManager && registroManager.id) {
      try {
        await axios.put(
          `${BASE_URL}/mobile-time-entries/${registroManager.id}/approve`,
          { approved: true },
          { headers: { Authorization: `Bearer ${managerToken}` } }
        );
        console.error('❌ Manager conseguiu aprovar seu próprio registro, o que não deveria ser permitido.');
      } catch (approvalError) {
        if (approvalError.response && approvalError.response.status === 403) {
          console.log('✅ Corretamente impedido de aprovar seu próprio registro de horas.');
          console.log('📄 Resposta:', approvalError.response.data);
        } else {
          console.error('❌ Erro inesperado ao tentar aprovar registro próprio:', 
            approvalError.response ? approvalError.response.data : approvalError.message);
        }
      }
    } else {
      console.log('ℹ️ Sem registros próprios para testar a restrição de auto-aprovação.');
    }

    // Limpeza - tentar excluir o registro criado
    console.log('\n🧹 Limpando registro de teste do manager...');
    try {
      await axios.delete(
        `${BASE_URL}/mobile-time-entries/${registroManager.id}`, 
        { headers: { Authorization: `Bearer ${managerToken}` } }
      );
      console.log(`✅ Registro do manager excluído`);
    } catch (error) {
      console.log(`⚠️ Não foi possível excluir o registro do manager: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ ERRO ao testar visualização de registros próprios:', 
      error.response ? error.response.data : error.message);
  }
}

// Função para teste do manager
async function testarFuncionalidadesManager() {
  console.log('\n🚀 Iniciando teste de visualização de horas próprias por Manager');
  
  try {
    // Login como manager (usando as credenciais reais do manager)
    console.log('\n👤 Autenticando como manager...');
    const responseManager = await axios.post(`${BASE_URL}/mobile-auth`, MANAGER_USER);
    const managerToken = responseManager.data.token;
    const managerUser = responseManager.data.user;
    
    console.log(`✅ Manager autenticado: ${managerUser.name} (${managerUser.role})`);
    console.log(`📌 Manager companyId: ${managerUser.companyId}`);
    
    // Agora chame a função de teste passando token e user como parâmetros
    await testManagerOwnTimeEntries(managerToken, managerUser);
    
    console.log('\n✅ Teste de manager concluído!');
  } catch (error) {
    console.log('❌ Falha ao autenticar como manager:', error.message);
    if (error.response) {
      console.log('Resposta:', error.response.data);
    }
  }
}

// Executar o teste do manager após o teste do admin
testarFuncionalidadesManager().catch(error => console.error('Erro no teste de Manager:', error));