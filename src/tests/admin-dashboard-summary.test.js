const axios = require('axios');

// Usa a variável de ambiente se definida, senão localhost
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

// Credenciais do Admin
const ADMIN_EMAIL = 'fabiola@modularcompany.com';
const ADMIN_PASSWORD = 'fabiola123';

async function runAdminDashboardTest() {
  let adminToken = '';
  console.log('--- Iniciando Teste do Dashboard do Admin ---');

  // 1. Fazer login como admin
  try {
    console.log(`Fazendo login como ${ADMIN_EMAIL}...`);
    const loginResponse = await axios.post(`${BASE_URL}/mobile-auth`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    if (loginResponse.data && loginResponse.data.token) {
      adminToken = loginResponse.data.token;
      console.log('Login bem-sucedido. Token obtido.');
    } else {
      throw new Error('Token não encontrado na resposta de login.');
    }
  } catch (error) {
    console.error('ERRO: Falha ao fazer login como admin:', error.response?.data || error.message);
    process.exit(1); // Sair com erro
  }

  // 2. Buscar o resumo do dashboard do admin
  try {
    console.log('Buscando resumo do dashboard do admin...');
    const dashboardResponse = await axios.get(`${BASE_URL}/mobile-admin/dashboard-summary`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    // Verificar status 200
    if (dashboardResponse.status !== 200) {
      throw new Error(`Status inesperado: ${dashboardResponse.status}`);
    }
    console.log('Status da resposta: OK (200)');

    // Verificar estrutura principal
    if (!dashboardResponse.data || !dashboardResponse.data.dashboard) {
      throw new Error('Resposta não contém a propriedade \'dashboard\'.');
    }
    const { dashboard } = dashboardResponse.data;
    console.log('Estrutura principal (dashboard): OK');

    if (!dashboard.summary || !dashboard.user || !dashboard.company) {
      throw new Error('Objeto dashboard não contém summary, user ou company.');
    }
    console.log('Estrutura do dashboard (summary, user, company): OK');

    // Verificar campos e tipos do 'summary'
    const { summary } = dashboard;
    const summaryChecks = {
      pendingApprovalCount: 'number',
      totalUserCount: 'number',
      unreadNotificationCount: 'number',
      pendingPaymentCount: 'number',
      totalPaidAmountMonth: 'number',
      totalPendingPaymentAmount: 'number'
    };

    for (const [key, type] of Object.entries(summaryChecks)) {
      if (typeof summary[key] !== type) {
        throw new Error(`Campo summary.${key} não encontrado ou tipo inválido (esperado: ${type}, recebido: ${typeof summary[key]}).`);
      }
    }
    console.log('Campos e tipos do summary: OK');

    // Logar os dados do summary
    console.log('Dados do Resumo (Summary):', JSON.stringify(summary, null, 2));
    
    // Verificar tipos básicos do user e company (opcional, mas bom)
    if (typeof dashboard.user.id !== 'string' || typeof dashboard.user.name !== 'string' || typeof dashboard.user.role !== 'string') {
        throw new Error('Tipos inválidos nos dados do usuário.');
    }
    if (typeof dashboard.company.id !== 'string' || typeof dashboard.company.name !== 'string') {
        throw new Error('Tipos inválidos nos dados da empresa.');
    }
    console.log('Tipos básicos de user e company: OK');

    console.log('--- Teste do Dashboard do Admin concluído com Sucesso! ---');

  } catch (error) {
    console.error('ERRO: Falha ao buscar ou validar o resumo do dashboard do admin:', error.response?.data || error.message);
    process.exit(1); // Sair com erro
  }
}

// Executar a função de teste
runAdminDashboardTest(); 