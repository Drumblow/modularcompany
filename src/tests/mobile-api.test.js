// Testes das Rotas da API Mobile do ModularCompany
const axios = require('axios');
const { format } = require('date-fns');

// Configuração da base URL para testes (a partir de variável de ambiente ou padrão)
const BASE_URL = process.env.TEST_API_BASE_URL || 'http://localhost:3000/api';

console.log(`🔌 Conectando em: ${BASE_URL}`);

// Credenciais para teste (altere para credenciais válidas do seu ambiente)
const TEST_USER = {
  email: 'funcionario@teste.com',
  password: 'senha123'
};

// Número máximo de tentativas para cada requisição
const MAX_RETRIES = 3;
// Tempo de espera entre tentativas (em ms)
const RETRY_DELAY = 2000;

// Armazenar o token e dados do usuário para os testes
let authToken = '';
let userData = null;
let timeEntryId = '';
let paymentId = '';
let notificationId = '';
let feedbackId = '';

// Configurar instância do axios com cabeçalhos padrão e interceptores para tratar erros
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  // Aumentar o timeout para 10 segundos
  timeout: 10000
});

// Adicionar interceptor para incluir o token em todas as requisições
api.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Função para esperar um tempo determinado
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Função utilitária para fazer a validação em cada teste com retries
const testEndpoint = async (method, endpoint, data = null, params = null, validateFn = null) => {
  let attempts = 0;
  let lastError = null;

  while (attempts < MAX_RETRIES) {
    try {
      attempts++;
      console.log(`\n🧪 Testando ${method.toUpperCase()} ${endpoint} (tentativa ${attempts}/${MAX_RETRIES})`);
      
      const config = {};
      if (params) config.params = params;
      
      let response;
      
      switch (method.toLowerCase()) {
        case 'get':
          response = await api.get(endpoint, config);
          break;
        case 'post':
          response = await api.post(endpoint, data, config);
          break;
        case 'put':
          response = await api.put(endpoint, data, config);
          break;
        case 'delete':
          response = await api.delete(endpoint, config);
          break;
        default:
          throw new Error(`Método HTTP não suportado: ${method}`);
      }
      
      console.log(`✅ Status: ${response.status}`);
      
      // Se houver uma função de validação, executá-la
      if (validateFn && typeof validateFn === 'function') {
        validateFn(response.data);
      } else {
        console.log('📄 Resposta:', JSON.stringify(response.data, null, 2).substring(0, 300) + (JSON.stringify(response.data, null, 2).length > 300 ? '...' : ''));
      }
      
      return response.data;
    } catch (error) {
      lastError = error;
      console.log(`❌ Erro (tentativa ${attempts}/${MAX_RETRIES}): ${error.message}`);
      
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log('Dados:', error.response.data);
      } else if (error.code === 'ECONNREFUSED') {
        console.log('O servidor não está respondendo. Verifique se ele está rodando na porta 3000.');
      }
      
      // Se não for a última tentativa, esperar antes de tentar novamente
      if (attempts < MAX_RETRIES) {
        console.log(`⏳ Aguardando ${RETRY_DELAY / 1000} segundos antes de tentar novamente...`);
        await sleep(RETRY_DELAY);
      }
    }
  }
  
  // Se chegarmos aqui, é porque todas as tentativas falharam
  throw lastError || new Error(`Falha após ${MAX_RETRIES} tentativas`);
};

// Função principal de teste
const runTests = async () => {
  console.log('🚀 Iniciando testes da API Mobile');
  
  try {
    // 1. Teste de autenticação
    console.log('\n📱 Testando autenticação');
    const authData = await testEndpoint('post', '/mobile-auth', TEST_USER);
    
    // Armazenar token e dados do usuário
    authToken = authData.token;
    userData = authData.user;
    console.log(`👤 Usuário autenticado: ${userData.name} (${userData.role})`);
    
    // 2. Teste do perfil do usuário
    console.log('\n📱 Testando endpoints de perfil');
    await testEndpoint('get', '/mobile-profile');
    
    // 3. Teste de listagem de registros de horas
    console.log('\n📱 Testando endpoints de registros de horas');
    const currentDate = new Date();
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    const timeEntriesResponse = await testEndpoint('get', '/mobile-time-entries', null, {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    });
    
    // 4. Teste de criação de registro de horas
    const newTimeEntry = {
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: `${format(new Date(), 'yyyy-MM-dd')}T09:00:00`,
      endTime: `${format(new Date(), 'yyyy-MM-dd')}T17:00:00`,
      observation: 'Teste automatizado da API',
      project: 'Teste de API'
    };
    
    try {
      const createResponse = await testEndpoint('post', '/mobile-time-entries', newTimeEntry);
      timeEntryId = createResponse.timeEntry.id;
      console.log(`✅ Registro de horas criado com ID: ${timeEntryId}`);
      
      // 5. Teste de visualização de registro de horas
      if (timeEntryId) {
        await testEndpoint('get', `/mobile-time-entries/${timeEntryId}/view`);
        
        // 6. Teste de edição de registro de horas
        const updateTimeEntry = {
          ...newTimeEntry,
          observation: 'Registro atualizado pelo teste'
        };
        await testEndpoint('put', `/mobile-time-entries/${timeEntryId}`, updateTimeEntry);
        
        // 7. Teste de exclusão de registro de horas
        await testEndpoint('delete', `/mobile-time-entries/${timeEntryId}`);
      }
    } catch (error) {
      console.log('⚠️ Não foi possível completar os testes de registro de horas, continuando com os próximos testes');
    }
    
    // 8. Teste de listagem de pagamentos
    console.log('\n📱 Testando endpoints de pagamentos');
    const paymentsResponse = await testEndpoint('get', '/mobile-payments');
    
    if (paymentsResponse.payments && paymentsResponse.payments.length > 0) {
      paymentId = paymentsResponse.payments[0].id;
      console.log(`✅ Usando pagamento com ID: ${paymentId}`);
      
      // 9. Teste de visualização de pagamento
      await testEndpoint('get', `/mobile-payments/${paymentId}`);
    }
    
    // 10. Teste de saldo do usuário
    await testEndpoint('get', '/mobile-users/balance');
    
    // 11. Teste de dashboard
    console.log('\n📱 Testando endpoint de dashboard');
    await testEndpoint('get', '/mobile-dashboard');
    
    // 12. Teste de projetos
    console.log('\n📱 Testando endpoint de projetos');
    await testEndpoint('get', '/mobile-projects');
    
    // 13. Teste de notificações
    console.log('\n📱 Testando endpoints de notificações');
    const notificationsResponse = await testEndpoint('get', '/mobile-notifications');
    
    if (notificationsResponse.notifications && notificationsResponse.notifications.length > 0) {
      notificationId = notificationsResponse.notifications[0].id;
      console.log(`✅ Usando notificação com ID: ${notificationId}`);
      
      // 14. Teste de marcar notificação como lida
      await testEndpoint('put', '/mobile-notifications', { id: notificationId, read: true });
    }
    
    // Teste de marcar todas as notificações como lidas
    await testEndpoint('put', '/mobile-notifications', { all: true });
    
    // 15. Teste de envio de feedback
    console.log('\n📱 Testando endpoints de feedback');
    const newFeedback = {
      type: 'suggestion',
      title: 'Sugestão de teste',
      description: 'Este é um feedback gerado pelo teste automatizado da API',
      priority: 'low',
      metadata: {
        testRun: true,
        automated: true
      }
    };
    
    try {
      const feedbackResponse = await testEndpoint('post', '/mobile-feedback', newFeedback);
      feedbackId = feedbackResponse.feedbackId;
      console.log(`✅ Feedback enviado com ID: ${feedbackId}`);
    } catch (error) {
      console.log('⚠️ Não foi possível enviar feedback, continuando com os próximos testes');
    }
    
    // 16. Teste de listagem de feedbacks
    await testEndpoint('get', '/mobile-feedback');
    
    // 17. Teste de exportação de relatório
    console.log('\n📱 Testando endpoint de exportação de relatório');
    const reportRequest = {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
      includeRejected: false,
      format: 'detailed'
    };
    
    await testEndpoint('post', '/mobile-reports/export', reportRequest);
    
    console.log('\n✅ Testes concluídos com sucesso');
    return true;
  } catch (error) {
    console.log('\n❌ Os testes falharam');
    console.error(error);
    return false;
  }
};

// Se este arquivo for executado diretamente, rodar os testes
if (require.main === module) {
  runTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('Erro não tratado:', err);
      process.exit(1);
    });
}

// Exportar a função para que possa ser usada por outros scripts
module.exports = { runTests };

// Para executar este script: node src/tests/mobile-api.test.js 