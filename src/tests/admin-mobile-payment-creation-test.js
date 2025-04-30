// Teste de criação de pagamento por administrador na API Mobile
const axios = require('axios');

// Configuração da base URL para testes
const BASE_URL = process.env.TEST_API_BASE_URL || 'http://localhost:3000/api';

// Tempo de espera entre etapas (em ms)
const STEP_DELAY = 1500;

// Dados para teste (usar os mesmos usuários dos outros testes para consistência)
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

// Função para obter a data formatada (YYYY-MM-DD)
const getDateFormatted = (date = new Date()) => {
  return date.toISOString().split('T')[0];
};

// Função principal de teste
async function testarCriacaoPagamentoAdmin() {
  console.log('\n🚀 Iniciando teste de CRIAÇÃO DE PAGAMENTO por administrador na API Mobile');
  
  let adminToken = null;
  let employeeToken = null;
  let adminUser = null;
  let employeeUser = null;
  const createdEntryIds = [];
  let paymentId = null;

  try {
    // Parte 1: Autenticação
    console.log('\n🔑 Autenticando usuários...');
    try {
      const responseAdmin = await axios.post(`${BASE_URL}/mobile-auth`, ADMIN_USER);
      adminToken = responseAdmin.data.token;
      adminUser = responseAdmin.data.user;
      console.log(`✅ Admin autenticado: ${adminUser.name} (${adminUser.role})`);

      const responseEmployee = await axios.post(`${BASE_URL}/mobile-auth`, EMPLOYEE_USER);
      employeeToken = responseEmployee.data.token;
      employeeUser = responseEmployee.data.user;
      console.log(`✅ Funcionário autenticado: ${employeeUser.name} (${employeeUser.role})`);
      
      if (adminUser.companyId !== employeeUser.companyId) {
        throw new Error('Admin e Funcionário não pertencem à mesma empresa!');
      }
      console.log(`✅ Usuários na mesma empresa: ${adminUser.companyId}`);
      
    } catch (error) {
      console.error('❌ Falha na autenticação:', error.message);
      return; // Abortar teste se autenticação falhar
    }
    await sleep(STEP_DELAY);

    // Parte 2: Criar Registros de Horas (como funcionário)
    console.log('\n⏱️  Criando registros de horas para pagamento (como funcionário)...');
    const todayStr = getDateFormatted();
    const entryData = [
      { date: todayStr, startTime: `${todayStr}T09:00:00`, endTime: `${todayStr}T11:00:00`, observation: 'Pagamento Teste 1' },
      { date: todayStr, startTime: `${todayStr}T14:00:00`, endTime: `${todayStr}T16:30:00`, observation: 'Pagamento Teste 2' }
    ];

    for (const data of entryData) {
      try {
        const response = await axios.post(
          `${BASE_URL}/mobile-time-entries`,
          data,
          { headers: { Authorization: `Bearer ${employeeToken}` } }
        );
        const entryId = response.data.timeEntry.id;
        createdEntryIds.push(entryId);
        console.log(`  ✅ Registro criado: ${entryId} (${data.observation})`);
      } catch (error) {
        console.warn(`  ⚠️ Falha ao criar registro (${data.observation}):`, error.response?.data || error.message);
        // Continuar mesmo se um falhar, para tentar pagar o outro
      }
    }
    if (createdEntryIds.length === 0) {
        console.error('❌ Nenhum registro de horas criado. Abortando teste de pagamento.');
        return;
    }
    await sleep(STEP_DELAY);
    
    // Parte 3: Aprovar Registros de Horas (como admin)
    console.log('\n👍 Aprovando registros de horas (como admin)...');
    let approvedEntryIds = [];
    for (const entryId of createdEntryIds) {
      try {
        await axios.put(
          `${BASE_URL}/mobile-time-entries/${entryId}/approve`,
          { approved: true },
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        approvedEntryIds.push(entryId);
        console.log(`  ✅ Registro aprovado: ${entryId}`);
      } catch (error) {
        console.warn(`  ⚠️ Falha ao aprovar registro ${entryId}:`, error.response?.data || error.message);
      }
    }
    if (approvedEntryIds.length === 0) {
      console.error('❌ Nenhum registro de horas aprovado. Abortando teste de pagamento.');
      return;
    }
    await sleep(STEP_DELAY);

    // Parte 4: Listar Usuários (como admin)
    console.log('\n👥 Listando usuários da empresa (como admin)...');
    try {
      const response = await axios.get(`${BASE_URL}/mobile-admin/users`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      const users = response.data.users;
      const foundEmployee = users.find(u => u.id === employeeUser.id);
      if (foundEmployee) {
        console.log(`  ✅ Funcionário de teste (${employeeUser.name}) encontrado na lista.`);
      } else {
        console.error(`  ❌ Funcionário de teste (${employeeUser.name}) NÃO encontrado na lista!`);
        // Não abortar, mas logar o erro
      }
    } catch (error) {
      console.error('  ❌ Falha ao listar usuários:', error.response?.data || error.message);
    }
    await sleep(STEP_DELAY);

    // Parte 5: Listar Horas Aprovadas e Não Pagas (como admin)
    console.log(`\n⏳ Buscando horas aprovadas e não pagas para ${employeeUser.name} (como admin)...`);
    let entriesToPay = [];
    try {
      const response = await axios.get(`${BASE_URL}/mobile-time-entries`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        params: {
          userId: employeeUser.id,
          approved: true,
          unpaid: true // O filtro crucial!
        }
      });
      entriesToPay = response.data.timeEntries;
      console.log(`  📊 Encontrados ${entriesToPay.length} registros aprovados e não pagos.`);
      // Verificar se os IDs que aprovamos estão aqui
      approvedEntryIds.forEach(id => {
          if (entriesToPay.some(entry => entry.id === id)) {
              console.log(`    ✅ Registro ${id} está na lista de não pagos.`);
          } else {
              console.warn(`    ⚠️ Registro ${id} (aprovado) não encontrado na lista de não pagos!`);
          }
      });
      
      if (entriesToPay.length === 0) {
        console.error('  ❌ Nenhum registro não pago encontrado. Abortando criação de pagamento.');
        return;
      }
      
    } catch (error) {
      console.error('  ❌ Falha ao buscar registros não pagos:', error.response?.data || error.message);
      return;
    }
    await sleep(STEP_DELAY);

    // Parte 6: Criar Pagamento (como admin)
    console.log('\n💰 Criando pagamento (como admin)...');
    const paymentData = {
      userId: employeeUser.id,
      amount: 123.45, // Valor de exemplo, pode ser calculado se tiver hourlyRate
      date: todayStr,
      paymentMethod: 'pix',
      reference: `Teste Pagamento Mobile ${Date.now()}`,
      description: 'Pagamento criado via teste automatizado mobile',
      status: 'pending',
      periodStart: todayStr,
      periodEnd: todayStr,
      timeEntryIds: entriesToPay.map(entry => entry.id) // Pagar todos encontrados
    };

    try {
      const response = await axios.post(
        `${BASE_URL}/mobile-payments`,
        paymentData,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      paymentId = response.data.payment.id;
      console.log(`✅ Pagamento criado com sucesso! ID: ${paymentId}`);
      console.log('  📄 Detalhes:', JSON.stringify(response.data.payment, null, 2));
    } catch (error) {
      console.error('❌ Falha ao criar pagamento:', error.response?.data || error.message);
      if (error.response?.status === 409) {
        console.warn('  ⚠️ Conflito detectado (409) - talvez registros já pagos?');
      }
      // Não retornar, tentar limpar
    }
    await sleep(STEP_DELAY); // Adicionar espera após criar pagamento

    // Parte 6.5: Confirmar Pagamento (como funcionário)
    if (paymentId) {
      console.log('\n✅ Confirmando recebimento do pagamento (como funcionário)...');
      try {
        const confirmResponse = await axios.put(
          `${BASE_URL}/mobile-payments/${paymentId}/confirm`, 
          {}, // Corpo vazio
          { headers: { Authorization: `Bearer ${employeeToken}` } } // Usar token do FUNCIONÁRIO
        );
        
        if (confirmResponse.status === 200 && confirmResponse.data.payment?.status === 'completed') {
          console.log(`  ✅ Pagamento ${paymentId} confirmado com sucesso! Novo status: ${confirmResponse.data.payment.status}`);
          console.log(`  ⏱️ Confirmado em: ${confirmResponse.data.payment.confirmedAt}`);
        } else {
           console.error('  ❌ Falha na confirmação do pagamento. Resposta inesperada:', confirmResponse.data);
        }
        
      } catch (error) {
        console.error('  ❌ Erro ao confirmar pagamento:', error.response?.data || error.message);
        if (error.response?.status === 403) {
          console.error('  ⚠️ Falha de permissão (403) - Verifique se o token do funcionário está correto.');
        }
      }
    }

    await sleep(STEP_DELAY);

    // Parte 6.7: Listar Pagamentos Pendentes (como admin)
    if (adminToken) {
      console.log('\n📊 Listando pagamentos PENDENTES da empresa (como admin)...');
      try {
        const response = await axios.get(`${BASE_URL}/mobile-admin/payments`, {
          headers: { Authorization: `Bearer ${adminToken}` },
          params: { status: 'pending,awaiting_confirmation' } // Buscar pendentes e aguardando
        });
        const pendingPayments = response.data.payments;
        console.log(`  ✅ Encontrados ${pendingPayments.length} pagamentos pendentes/aguardando.`);
        // Verificar se o pagamento recém-criado NÃO está aqui (já foi confirmado)
        if (paymentId && pendingPayments.some(p => p.id === paymentId)) {
          console.error(`  ❌ ERRO: Pagamento ${paymentId} (confirmado) ainda aparece como pendente!`);
        } else if (paymentId) {
          console.log(`  ✅ Pagamento ${paymentId} (confirmado) não está na lista de pendentes.`);
        }
        // Logar alguns detalhes se houver
        pendingPayments.slice(0, 2).forEach(p => console.log(`    - ID: ${p.id}, Status: ${p.status}, Valor: ${p.amount}, Para: ${p.user.name}`));

      } catch (error) {
        console.error('  ❌ Falha ao listar pagamentos pendentes:', error.response?.data || error.message);
      }
    }
    
    await sleep(STEP_DELAY);

    // Parte 6.8: Listar Pagamentos Concluídos (como admin)
    if (adminToken && paymentId) { // Apenas se um pagamento foi criado e confirmado
      console.log('\n🧾 Listando pagamentos CONCLUÍDOS da empresa (como admin)...');
      try {
        const response = await axios.get(`${BASE_URL}/mobile-admin/payments`, {
          headers: { Authorization: `Bearer ${adminToken}` },
          params: { status: 'completed' } // Buscar concluídos
        });
        const completedPayments = response.data.payments;
        console.log(`  ✅ Encontrados ${completedPayments.length} pagamentos concluídos.`);
        // Verificar se o pagamento confirmado está na lista
        const foundConfirmed = completedPayments.find(p => p.id === paymentId);
        if (foundConfirmed) {
          console.log(`  ✅ Pagamento ${paymentId} (confirmado) encontrado na lista de concluídos.`);
          console.log(`    - Status: ${foundConfirmed.status}, Confirmado em: ${foundConfirmed.confirmedAt}`);
        } else {
          console.error(`  ❌ ERRO: Pagamento ${paymentId} (confirmado) NÃO encontrado na lista de concluídos!`);
        }
        // Logar alguns detalhes se houver mais
        completedPayments.filter(p => p.id !== paymentId).slice(0, 2).forEach(p => console.log(`    - Outro: ID: ${p.id}, Status: ${p.status}, Valor: ${p.amount}, Para: ${p.user.name}`));

      } catch (error) {
        console.error('  ❌ Falha ao listar pagamentos concluídos:', error.response?.data || error.message);
      }
    }

  } catch (error) {
    console.error('❌ Erro GERAL no teste:', error);
  } finally {
    // Parte 7: Limpeza
    console.log('\n🧹 Limpando dados de teste...');
    // Nota: Não é trivial deletar pagamentos. A limpeza focará nos registros de horas.
    // Registros associados a pagamentos ou aprovados podem não ser deletáveis.
    for (const entryId of createdEntryIds) {
      try {
        await axios.delete(
          `${BASE_URL}/mobile-time-entries/${entryId}`,
          // Tentar deletar como funcionário, pode falhar se aprovado/pago
          { headers: { Authorization: `Bearer ${employeeToken}` } }
        );
        console.log(`  🗑️ Registro de horas ${entryId} deletado (ou tentativa).`);
      } catch (error) {
        // Ajustar log de erro de limpeza para ser mais informativo
        const errorMsg = error.response?.data?.error || error.message;
        const errorStatus = error.response?.status;
        console.warn(`  ⚠️ Falha ao deletar registro ${entryId} (Status ${errorStatus || 'N/A'}): ${errorMsg}`);
      }
    }
    
    // Poderíamos tentar deletar o pagamento se criado, mas não há endpoint DELETE /mobile-payments/[id]
    if(paymentId) {
        console.log(`  ℹ️ Pagamento ${paymentId} criado e possivelmente confirmado. Limpeza manual pode ser necessária.`);
    }

    console.log('\n✅ Teste de criação e confirmação de pagamento concluído!');
  }
}

// Executar o teste
testarCriacaoPagamentoAdmin().catch(console.error); 