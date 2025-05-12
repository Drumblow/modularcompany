// Importe 'node-fetch' se estiver usando uma versão do Node < 18
// const fetch = require('node-fetch'); 

const BASE_URL = 'http://localhost:3000/api'; // Ajuste se a porta ou URL for diferente
const MANAGER_EMAIL = 'cynthiacaldasadv@gmail.com';
const MANAGER_PASSWORD = 'internet';

async function runManagerDashboardTest() {
  let token = null;

  // 1. Fazer login como Manager
  console.log(`[TESTE] Tentando login como Manager: ${MANAGER_EMAIL}...`);
  try {
    const loginResponse = await fetch(`${BASE_URL}/mobile-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: MANAGER_EMAIL, password: MANAGER_PASSWORD }),
    });

    const responseBodyLogin = await loginResponse.text(); // Ler o corpo para depuração em caso de erro

    if (!loginResponse.ok) {
      throw new Error(`Erro no login (${loginResponse.status}): ${responseBodyLogin}`);
    }

    const loginData = JSON.parse(responseBodyLogin); // Parse apenas se ok
    token = loginData.token;
    console.log('[TESTE] Login de Manager bem-sucedido.');
    
    if (loginData.user?.role !== 'MANAGER') {
        console.warn(`[TESTE] ALERTA: O usuário ${MANAGER_EMAIL} logado tem role '${loginData.user?.role}', não 'MANAGER'. O endpoint pode retornar 403.`);
    }

  } catch (error) {
    console.error('[TESTE] Falha crítica no login:', error);
    return; // Interrompe o teste se o login falhar
  }

  // 2. Buscar o Resumo do Dashboard do Manager
  console.log('\n[TESTE] Buscando resumo do dashboard do manager...');
  try {
    const summaryResponse = await fetch(`${BASE_URL}/mobile-manager/dashboard-summary`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`[TESTE] Status da Resposta: ${summaryResponse.status}`);
    const responseBodySummary = await summaryResponse.text(); // Ler corpo para depuração

    if (!summaryResponse.ok) {
        console.error(`[TESTE] Erro ao buscar resumo (${summaryResponse.status}): ${responseBodySummary}`);
    } else {
        try {
            const summaryData = JSON.parse(responseBodySummary); // Tenta parsear como JSON
            console.log('[TESTE] Dados do resumo recebidos:');
            console.log(JSON.stringify(summaryData, null, 2));

            // Verificações básicas da estrutura da resposta
            if (summaryData.summary && summaryData.managerInfo) {
                console.log("\n[TESTE] Estrutura básica da resposta (summary, managerInfo) parece correta.");
                // Você pode adicionar mais verificações aqui, como verificar tipos de dados ou campos específicos
                if(typeof summaryData.summary.pendingApprovalCount !== 'number') console.warn("[TESTE] summary.pendingApprovalCount não é um número.");
                // ... mais verificações ...
            } else {
                console.warn("\n[TESTE] A estrutura da resposta JSON não contém 'summary' e/ou 'managerInfo'.");
            }
        } catch (jsonError) {
            console.error('[TESTE] Erro ao processar a resposta JSON:', jsonError);
            console.log('[TESTE] Corpo da resposta recebido (não JSON):', responseBodySummary);
        }
    }

  } catch (error) {
    console.error('[TESTE] Falha ao buscar resumo do dashboard:', error);
  }
}

// Executa o teste
runManagerDashboardTest(); 