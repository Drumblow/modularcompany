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

// Função para obter uma data no passado (ex: mês anterior)
const getPastDateFormatted = (monthsToSubtract = 1) => {
  const today = new Date();
  today.setMonth(today.getMonth() - monthsToSubtract);
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
    } catch (error) {
      console.log('❌ Falha ao autenticar como admin:', error.response ? error.response.data : error.message);
      return;
    }

    // Parte 2: Login como funcionário
    console.log('\n👤 Autenticando como funcionário...');
    try {
      const responseEmployee = await axios.post(`${BASE_URL}/mobile-auth`, EMPLOYEE_USER);
      employeeToken = responseEmployee.data.token;
      employeeUser = responseEmployee.data.user;
      console.log(`✅ Funcionário autenticado: ${employeeUser.name} (${employeeUser.role})`);
    } catch (error) {
      console.log('❌ Falha ao autenticar como funcionário:', error.response ? error.response.data : error.message);
      return;
    }

    // Verificar se admin e employee estão na mesma empresa
    if (adminUser.companyId !== employeeUser.companyId) {
      console.log('⚠️ Admin e funcionário não estão na mesma empresa!');
      return;
    } else {
      console.log('✅ Admin e funcionário estão na mesma empresa.');
    }

    const dataFormatada = getTodayFormatted();
    console.log(`📅 Data do teste: ${dataFormatada}`);

    console.log('\n🧹 Removendo registros existentes para evitar conflitos (como Admin)...');
    try {
      const existingRecordsResponse = await axios.get(
        `${BASE_URL}/mobile-time-entries`,
        { 
          headers: { Authorization: `Bearer ${adminToken}` }, // Usar adminToken para listar todos da empresa
          params: { 
            // Vamos listar todos da empresa para a data, sem filtrar por employeeUser.id ainda
            // Se filtrarmos por employeeUser.id, o admin só verá os do funcionário.
            // Para limpar geral, melhor não especificar userId aqui.
            startDate: dataFormatada,
            endDate: dataFormatada,
            companyId: adminUser.companyId // Garantir que estamos na empresa certa, se a API suportar
          }
        }
      );
      
      const existingRecords = existingRecordsResponse.data.timeEntries.filter(entry => entry.user.id === employeeUser.id);
      console.log(`Encontrados ${existingRecords.length} registros DO FUNCIONÁRIO ESPECÍFICO para a data ${dataFormatada} para limpeza.`);
      
      for (const record of existingRecords) {
        try {
          console.log(`  Attempting to delete record ID: ${record.id} belonging to user ${record.user.id} as ADMIN ${adminUser.id}`);
          await axios.delete(
            `${BASE_URL}/mobile-time-entries/${record.id}`, 
            { headers: { Authorization: `Bearer ${adminToken}` } } // Usar adminToken para deletar
          );
          console.log(`  ✅ Registro ${record.id} (do funcionário ${employeeUser.name}) removido pelo admin`);
        } catch (errorDelete) {
          console.log(`  ⚠️ Não foi possível remover o registro ${record.id} (do func.): ${errorDelete.message}. Status: ${errorDelete.response?.status}`);
          if(errorDelete.response?.data?.error === 'Este registro já está associado a um pagamento e não pode ser excluído'){
            console.log(`  INFO: Registro ${record.id} não pode ser excluído pois está associado a um pagamento.`);
          } else if (errorDelete.response?.status === 403 && adminUser.id === record.user.id) {
            console.log(` INFO: Admin não pode deletar seu próprio registro por esta rota (se aplicável), ou outra restrição 403.`);
          }
        }
      }
    } catch (errorList) {
      console.log('⚠️ Erro ao listar/remover registros existentes (como Admin):', errorList.message);
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

    // ADICIONAR CHAMADA AO NOVO TESTE ISPAID AQUI DENTRO, SE FIZER SENTIDO TER OS DADOS
    // OU CHAMAR SEPARADAMENTE ABAIXO

  } catch (error) {
    console.log('❌ ERRO: Falha ao executar o teste:', error.message);
    if (error.response) {
      console.log('Resposta:', error.response.data);
    }
  }
}

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

async function testPeriodAllParameter() {
  console.log('\n🗓️ Testando parâmetro period=all');
  let employeeToken = null;
  let employeeUser = null;
  const todayFormatted = getTodayFormatted();
  const pastDateFormatted = getPastDateFormatted();
  const entriesToCleanup = [];

  try {
    console.log('\n👤 Autenticando como funcionário para teste de período...');
    const responseEmployee = await axios.post(`${BASE_URL}/mobile-auth`, EMPLOYEE_USER);
    employeeToken = responseEmployee.data.token;
    employeeUser = responseEmployee.data.user;
    console.log(`✅ Funcionário autenticado para teste de período: ${employeeUser.name}`);

    // Criar registro no mês atual
    const entryTodayPayload = {
      date: todayFormatted,
      startTime: `${todayFormatted}T09:00:00`,
      endTime: `${todayFormatted}T10:00:00`,
      observation: `Registro period=all (hoje) ${Date.now()}`,
    };
    const entryTodayRes = await axios.post(`${BASE_URL}/mobile-time-entries`, entryTodayPayload, { headers: { Authorization: `Bearer ${employeeToken}` } });
    const entryToday = entryTodayRes.data.timeEntry;
    entriesToCleanup.push(entryToday.id);
    console.log(`✅ Registro criado para hoje: ${entryToday.id}`);

    // Criar registro no mês passado
    const entryPastPayload = {
      date: pastDateFormatted,
      startTime: `${pastDateFormatted}T09:00:00`,
      endTime: `${pastDateFormatted}T10:00:00`,
      observation: `Registro period=all (passado) ${Date.now()}`,
    };
    const entryPastRes = await axios.post(`${BASE_URL}/mobile-time-entries`, entryPastPayload, { headers: { Authorization: `Bearer ${employeeToken}` } });
    const entryPast = entryPastRes.data.timeEntry;
    entriesToCleanup.push(entryPast.id);
    console.log(`✅ Registro criado para mês passado: ${entryPast.id}`);

    await sleep(RETRY_DELAY); // Dar tempo para os registros serem processados

    // Teste 1: Buscar com period=all
    console.log('\n🔍 Testando GET /mobile-time-entries?period=all');
    const allEntriesRes = await axios.get(`${BASE_URL}/mobile-time-entries?period=all`, { headers: { Authorization: `Bearer ${employeeToken}` } });
    const allEntries = allEntriesRes.data.timeEntries || [];
    const foundTodayInAll = allEntries.some(e => e.id === entryToday.id);
    const foundPastInAll = allEntries.some(e => e.id === entryPast.id);

    if (foundTodayInAll && foundPastInAll) {
      console.log(`✅ period=all retornou os registros de hoje e do passado (Total: ${allEntries.length}).`);
    } else {
      console.error('❌ Falha no period=all. Não encontrou todos os registros esperados.');
      if (!foundTodayInAll) console.log('  - Registro de hoje não encontrado com period=all');
      if (!foundPastInAll) console.log('  - Registro do passado não encontrado com period=all');
    }
    console.log('  Filtros aplicados pela API:', allEntriesRes.data.appliedFilters);
    if(allEntriesRes.data.period.startDate !== null || allEntriesRes.data.period.endDate !== null){
        console.error('❌ ERRO: Com period=all, period.startDate e period.endDate deveriam ser null.');
    }

    // Teste 2: Buscar sem period (padrão mês atual)
    console.log('\n🔍 Testando GET /mobile-time-entries (padrão mês atual)');
    const currentMonthEntriesRes = await axios.get(`${BASE_URL}/mobile-time-entries`, { headers: { Authorization: `Bearer ${employeeToken}` } });
    const currentMonthEntries = currentMonthEntriesRes.data.timeEntries || [];
    const foundTodayInCurrent = currentMonthEntries.some(e => e.id === entryToday.id);
    const foundPastInCurrent = currentMonthEntries.some(e => e.id === entryPast.id);

    if (foundTodayInCurrent && !foundPastInCurrent) {
      console.log(`✅ Padrão de mês atual funcionou. Retornou ${currentMonthEntries.length} registro(s) (apenas o de hoje).`);
    } else {
      console.error('❌ Falha no padrão de mês atual.');
      if (!foundTodayInCurrent) console.log('  - Registro de hoje não encontrado no padrão mês atual.');
      if (foundPastInCurrent) console.log('  - Registro do passado FOI encontrado no padrão mês atual (não deveria).');
    }
    console.log('  Filtros aplicados pela API:', currentMonthEntriesRes.data.appliedFilters);
    if(currentMonthEntriesRes.data.period.startDate === null || currentMonthEntriesRes.data.period.endDate === null){
        console.error('❌ ERRO: Sem period=all, period.startDate e period.endDate NÃO deveriam ser null.');
    }

  } catch (error) {
    console.error('❌ ERRO no teste do parâmetro period=all:', error.response ? error.response.data : error.message);
  } finally {
    // Limpeza
    console.log('\n🧹 Limpando registros do teste period=all...');
    for (const entryId of entriesToCleanup) {
      try {
        await axios.delete(`${BASE_URL}/mobile-time-entries/${entryId}`, { headers: { Authorization: `Bearer ${employeeToken}` } });
        console.log(`  - Registro ${entryId} excluído.`);
      } catch (delError) {
        console.warn(`  - Falha ao excluir registro ${entryId}:`, delError.message);
      }
    }
  }
}

async function testIsPaidField() {
  console.log('\n💰 Testando campo isPaid nos registros de horas');
  let adminToken = null, employeeToken = null;
  let adminUser = null, employeeUser = null;
  const entryIdsToPay = [];
  const entriesToCleanup = [];
  const todayFormatted = getTodayFormatted();

  try {
    // Autenticar Admin e Funcionário
    console.log('\n👤 Autenticando Admin e Funcionário para teste isPaid...');
    const resAdmin = await axios.post(`${BASE_URL}/mobile-auth`, ADMIN_USER);
    adminToken = resAdmin.data.token;
    adminUser = resAdmin.data.user;
    console.log(`✅ Admin autenticado: ${adminUser.name}`);

    const resEmployee = await axios.post(`${BASE_URL}/mobile-auth`, EMPLOYEE_USER);
    employeeToken = resEmployee.data.token;
    employeeUser = resEmployee.data.user;
    console.log(`✅ Funcionário autenticado: ${employeeUser.name}`);

    // Criar dois registros como funcionário
    console.log('\n⏱️ Funcionário criando registros...');
    const entry1Payload = { date: todayFormatted, startTime: `${todayFormatted}T13:00:00`, endTime: `${todayFormatted}T14:00:00`, observation: `Registro isPaid 1 ${Date.now()}` };
    const entry2Payload = { date: todayFormatted, startTime: `${todayFormatted}T15:00:00`, endTime: `${todayFormatted}T16:00:00`, observation: `Registro isPaid 2 ${Date.now()}` };
    const entry3Payload = { date: todayFormatted, startTime: `${todayFormatted}T17:00:00`, endTime: `${todayFormatted}T18:00:00`, observation: `Registro isPaid 3 (pendente) ${Date.now()}` };

    const resEntry1 = await axios.post(`${BASE_URL}/mobile-time-entries`, entry1Payload, { headers: { Authorization: `Bearer ${employeeToken}` } });
    const entry1 = resEntry1.data.timeEntry;
    entriesToCleanup.push(entry1.id);
    console.log(`  - Registro 1 criado: ${entry1.id}`);

    const resEntry2 = await axios.post(`${BASE_URL}/mobile-time-entries`, entry2Payload, { headers: { Authorization: `Bearer ${employeeToken}` } });
    const entry2 = resEntry2.data.timeEntry;
    entriesToCleanup.push(entry2.id);
    console.log(`  - Registro 2 criado: ${entry2.id}`);
    
    const resEntry3 = await axios.post(`${BASE_URL}/mobile-time-entries`, entry3Payload, { headers: { Authorization: `Bearer ${employeeToken}` } });
    const entry3 = resEntry3.data.timeEntry; // Pendente, não será aprovado
    entriesToCleanup.push(entry3.id);
    console.log(`  - Registro 3 (pendente) criado: ${entry3.id}`);

    await sleep(RETRY_DELAY);

    // Admin aprova os dois primeiros registros
    console.log('\n👍 Admin aprovando registros...');
    await axios.put(`${BASE_URL}/mobile-time-entries/${entry1.id}/approve`, { approved: true }, { headers: { Authorization: `Bearer ${adminToken}` } });
    console.log(`  - Registro ${entry1.id} aprovado.`);
    await axios.put(`${BASE_URL}/mobile-time-entries/${entry2.id}/approve`, { approved: true }, { headers: { Authorization: `Bearer ${adminToken}` } });
    console.log(`  - Registro ${entry2.id} aprovado.`);
    entryIdsToPay.push(entry1.id); // Apenas o entry1 será pago

    await sleep(RETRY_DELAY);

    // Admin cria um pagamento incluindo apenas o entry1
    console.log('\n💳 Admin criando pagamento para entry1...');
    const paymentPayload = {
      userId: employeeUser.id,
      amount: 50, // Valor simbólico
      date: todayFormatted,
      paymentMethod: "test_method",
      status: "completed",
      periodStart: todayFormatted,
      periodEnd: todayFormatted,
      timeEntryIds: [entry1.id]
    };
    
    let paymentId = null;
    try {
      const paymentRes = await axios.post(`${BASE_URL}/mobile-payments`, paymentPayload, { headers: { Authorization: `Bearer ${adminToken}` } });
      paymentId = paymentRes.data.payment?.id;
      if (paymentId) {
        console.log(`✅ Pagamento criado com ID: ${paymentId}, incluindo registro ${entry1.id}`);
      } else {
        console.error('❌ Falha ao criar pagamento, ID não retornado.', paymentRes.data);
      }
    } catch (paymentError) {
        console.error('❌ ERRO CRÍTICO ao criar pagamento:', paymentError.response ? paymentError.response.data : paymentError.message);
        // Não continuar se o pagamento falhar, pois o teste de isPaid ficará incorreto.
        throw paymentError; 
    }

    await sleep(RETRY_DELAY);

    // Buscar todos os registros do funcionário e verificar isPaid
    console.log('\n📊 Verificando campo isPaid nos registros do funcionário...');
    const timeEntriesRes = await axios.get(`${BASE_URL}/mobile-time-entries?userId=${employeeUser.id}&period=all`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const timeEntries = timeEntriesRes.data.timeEntries || [];

    const foundEntry1 = timeEntries.find(e => e.id === entry1.id);
    const foundEntry2 = timeEntries.find(e => e.id === entry2.id);
    const foundEntry3 = timeEntries.find(e => e.id === entry3.id);

    let success = true;
    if (foundEntry1 && foundEntry1.isPaid === true) {
      console.log(`✅ Registro ${entry1.id} (pago): isPaid = true.`);
    } else {
      console.error(`❌ Falha: Registro ${entry1.id} (pago) deveria ter isPaid = true, mas é ${foundEntry1?.isPaid}. Detalhes:`, foundEntry1);
      success = false;
    }

    if (foundEntry2 && foundEntry2.isPaid === false) {
      console.log(`✅ Registro ${entry2.id} (aprovado, não pago): isPaid = false.`);
    } else {
      console.error(`❌ Falha: Registro ${entry2.id} (aprovado, não pago) deveria ter isPaid = false, mas é ${foundEntry2?.isPaid}. Detalhes:`, foundEntry2);
      success = false;
    }
    
    if (foundEntry3 && foundEntry3.isPaid === false) {
      console.log(`✅ Registro ${entry3.id} (pendente, não pago): isPaid = false.`);
    } else {
      console.error(`❌ Falha: Registro ${entry3.id} (pendente, não pago) deveria ter isPaid = false, mas é ${foundEntry3?.isPaid}. Detalhes:`, foundEntry3);
      success = false;
    }

    if(success) console.log('🎉 Teste isPaid concluído com sucesso!');
    else console.error('❌ Teste isPaid falhou em uma ou mais verificações.');

  } catch (error) {
    console.error('❌ ERRO no teste do campo isPaid:', error.response ? error.response.data : error.message);
  } finally {
    // Limpeza
    console.log('\n🧹 Limpando registros do teste isPaid...');
    for (const entryId of entriesToCleanup) {
      try {
        await axios.delete(`${BASE_URL}/mobile-time-entries/${entryId}`, { headers: { Authorization: `Bearer ${employeeToken}` } });
        console.log(`  - Registro ${entryId} excluído.`);
      } catch (delError) {
        console.warn(`  - Falha ao excluir registro ${entryId}:`, delError.message);
      }
    }
    // TODO: Adicionar limpeza do pagamento criado, se necessário (ex: DELETE /mobile-payments/:paymentId)
  }
}

// Executar todos os testes
async function runAllTests() {
  await testarAprovacaoHorasAdmin().catch(error => console.error('💣 Erro no testarAprovacaoHorasAdmin:', error.response ? error.response.data : error.message));
  await testarFuncionalidadesManager().catch(error => console.error('💣 Erro no testarFuncionalidadesManager:', error.response ? error.response.data : error.message));
  await testPeriodAllParameter().catch(error => console.error('💣 Erro no testPeriodAllParameter:', error.response ? error.response.data : error.message));
  await testIsPaidField().catch(error => console.error('💣 Erro no testIsPaidField:', error.response ? error.response.data : error.message));
  console.log('\n🏁 Todos os testes de time-entries concluídos! 🏁');
}

runAllTests();