// Script simplificado para executar testes da API Mobile
const { exec } = require('child_process');
const axios = require('axios');

// Configuração
const PORTS = [3000, 3001];
let selectedPort = null;

// Função para verificar se o servidor está respondendo em uma porta específica
async function checkPort(port) {
  try {
    // Tentar fazer uma requisição simples
    const response = await axios.get(`http://localhost:${port}/api/mobile-auth`, { 
      timeout: 3000,
      validateStatus: () => true // Aceitar qualquer status HTTP
    });
    return true;
  } catch (error) {
    // Se recebemos qualquer resposta HTTP, o servidor está rodando
    if (error.response) {
      return true;
    }
    return false;
  }
}

// Função para verificar todas as portas disponíveis
async function detectServerPort() {
  console.log('🔍 Verificando portas disponíveis...');
  
  for (const port of PORTS) {
    const isActive = await checkPort(port);
    if (isActive) {
      console.log(`✅ Servidor detectado na porta ${port}`);
      return port;
    }
  }
  
  console.log('❌ Nenhum servidor detectado nas portas verificadas.');
  return null;
}

// Função principal
async function main() {
  try {
    console.log('🚀 Verificando conexão com o banco de dados e criando usuário de teste...');
    
    // Executar o script para criar o usuário de teste
    await new Promise((resolve, reject) => {
      exec('npm run test:create-user', (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Erro ao criar usuário de teste:', error);
          return reject(error);
        }
        console.log(stdout);
        resolve();
      });
    });
    
    console.log('✅ Usuário de teste criado ou atualizado com sucesso.');
    
    // Detectar a porta do servidor
    selectedPort = await detectServerPort();
    
    if (!selectedPort) {
      console.error('❌ Nenhum servidor disponível. Por favor, inicie o servidor com npm run dev');
      return process.exit(1);
    }
    
    console.log(`\n📱 Executando testes da API Mobile contra servidor na porta ${selectedPort}...`);
    
    // Modificar a variável de ambiente com a URL base para os testes
    process.env.TEST_API_BASE_URL = `http://localhost:${selectedPort}/api`;
    
    // Executar os testes
    require('./mobile-api.test');
  } catch (error) {
    console.error('❌ Erro ao executar o script:', error);
    process.exit(1);
  }
}

// Executar o script
main(); 